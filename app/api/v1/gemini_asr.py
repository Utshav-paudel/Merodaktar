from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from google import genai
from google.genai.errors import ServerError
import os
import tempfile
import logging
import traceback
import time
from config.settings import get_settings
from core.security import get_current_user
from models.user import User

router = APIRouter()

settings = get_settings()

# Logger
logger = logging.getLogger(__name__)

client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Gemini natively supports these audio formats
SUPPORTED_FORMATS = {
    ".wav": "audio/wav",
    ".mp3": "audio/mp3",
    ".m4a": "audio/mp4",
    ".aiff": "audio/aiff",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".webm": "audio/webm",
}


def _safe_unlink(path: str, retries: int = 3, delay: float = 0.2):
    """Safely delete a file with retries for Windows file locks"""
    for attempt in range(retries):
        try:
            if os.path.exists(path):
                os.unlink(path)
                logger.debug("Cleaned up: %s", path)
            return
        except PermissionError as e:
            logger.warning("PermissionError deleting %s (attempt %d/%d): %s", path, attempt + 1, retries, e)
            time.sleep(delay)
        except Exception as e:
            logger.exception("Error deleting %s: %s", path, e)
            return
    logger.warning("Failed to delete %s after %d attempts; leaving for OS cleanup", path, retries)


def _call_gemini_with_retry(uploaded_file, max_retries: int = 3, initial_delay: float = 4.0):
    """
    Call Gemini API with exponential backoff retry logic for 503 errors and file not ready errors.
    
    Args:
        uploaded_file: The uploaded file object from Gemini File API
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay in seconds (will be doubled on each retry)
    
    Returns:
        The API response
        
    Raises:
        HTTPException: If all retries fail
    """
    delay = initial_delay
    last_error = None
    
    for attempt in range(max_retries):
        try:
            logger.info("Requesting transcription from Gemini (attempt %d/%d)...", attempt + 1, max_retries)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    "Transcribe the audio. It may contain both English and Nepali. Use Nepali script for Nepali speech.",
                    uploaded_file,
                ],
            )
            logger.info("Transcription completed successfully on attempt %d", attempt + 1)
            return response
            
        except ServerError as e:
            last_error = e
            error_dict = getattr(e, 'error', {})
            
            # Get status code from the error dict, not from the exception attribute
            status_code = error_dict.get('code') if isinstance(error_dict, dict) else None
            
            logger.warning(
                "ServerError caught: status_code=%s, error_code=%s, error=%s",
                getattr(e, 'status_code', None),
                getattr(e, 'error_code', None),
                str(e)
            )
            
            # Check if it's a 503 (service overloaded) error
            if status_code == 503 or 'overloaded' in str(e).lower() or 'UNAVAILABLE' in str(e):
                if attempt < max_retries - 1:
                    logger.warning(
                        "Gemini API overloaded (503), retrying in %.1f seconds (attempt %d/%d)",
                        delay, attempt + 1, max_retries
                    )
                    time.sleep(delay)
                    delay *= 2  # Exponential backoff
                    continue
                else:
                    logger.error("Gemini API still overloaded after %d attempts", max_retries)
                    raise HTTPException(
                        status_code=503,
                        detail="The transcription service is temporarily overloaded. Please try again in a few moments."
                    )
            else:
                # For non-503 errors, don't retry
                logger.error("Gemini API error (non-503): %s", str(e))
                raise HTTPException(
                    status_code=status_code or 500,
                    detail=f"Transcription service error: {error_dict.get('message', str(e))}"
                )
        
        except Exception as e:
            last_error = e
            error_str = str(e)
            
            # Check if it's a "file not active" error
            if "FAILED_PRECONDITION" in error_str and "not in an ACTIVE state" in error_str:
                if attempt < max_retries - 1:
                    logger.warning(
                        "File not ready yet, retrying in %.1f seconds (attempt %d/%d)",
                        delay, attempt + 1, max_retries
                    )
                    time.sleep(delay)
                    delay *= 2
                    continue
                else:
                    logger.error("File still not ready after %d attempts", max_retries)
                    raise HTTPException(
                        status_code=500,
                        detail="The uploaded file is taking too long to process. Please try again."
                    )
            
            # For other unexpected errors, don't retry
            logger.error("Unexpected error during Gemini API call: %s", error_str)
            logger.error("Full traceback:\n%s", traceback.format_exc())
            raise HTTPException(
                status_code=500,
                detail=f"Unexpected transcription error: {error_str}"
            )
    
    # This should never be reached, but just in case
    raise HTTPException(
        status_code=503,
        detail="The transcription service is temporarily unavailable. Please try again later."
    )


def _wait_for_file_ready(uploaded_file, max_wait: int = 30, check_interval: float = 1.0):
    """
    Poll the file status until it's ACTIVE or timeout.
    If status checks fail consistently, assumes file might be ready after reasonable wait.
    
    Args:
        uploaded_file: The uploaded file object from Gemini File API
        max_wait: Maximum seconds to wait
        check_interval: Seconds between status checks
    
    Returns:
        tuple: (is_confirmed_ready: bool, waited_time: float)
    """
    elapsed = 0
    consecutive_errors = 0
    max_consecutive_errors = 5
    
    while elapsed < max_wait:
        try:
            file_info = client.files.get(name=uploaded_file.name)
            state = getattr(file_info, 'state', None)
            
            # Reset error counter on successful check
            consecutive_errors = 0
            
            logger.info("File state: %s (waited %.1fs)", state, elapsed)
            
            if state == 'ACTIVE':
                logger.info("File is now ACTIVE and ready")
                return True, elapsed
            elif state == 'FAILED':
                raise HTTPException(
                    status_code=500,
                    detail="File processing failed on Gemini's servers"
                )
            
            time.sleep(check_interval)
            elapsed += check_interval
            
        except HTTPException:
            raise
        except Exception as e:
            consecutive_errors += 1
            error_str = str(e)
            logger.warning(
                "Error checking file status (attempt %d/%d): %s",
                consecutive_errors, max_consecutive_errors, error_str
            )
            
            # If Gemini's status API is having issues, fall back after multiple failures
            if consecutive_errors >= max_consecutive_errors:
                logger.warning(
                    "File status API failing consistently after %.1fs. "
                    "Will attempt transcription anyway (Gemini API issue, not client issue).",
                    elapsed
                )
                return False, elapsed  # Not confirmed, but try anyway
            
            time.sleep(check_interval)
            elapsed += check_interval
    
    # Timeout reached
    logger.warning("File status check timed out after %ds", max_wait)
    return False, elapsed


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...), 
    current_user: User = Depends(get_current_user)
):
    """
    Transcribe audio file using Gemini API with File API upload.
    Supports: WAV, MP3, M4A, AIFF, AAC, OGG, FLAC, WEBM
    
    Includes automatic retry logic and fallback strategy for Gemini API issues.
    """
    logger.info("Received file: %s content_type: %s", audio.filename, audio.content_type)

    # Validate file extension
    ext = os.path.splitext(audio.filename)[1].lower()
    logger.debug("File extension: %s", ext)
    
    if ext not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type {ext}. Supported: {', '.join(SUPPORTED_FORMATS.keys())}"
        )

    temp_path = None
    uploaded_file = None
    
    try:
        # Read uploaded file
        content = await audio.read()
        size = len(content)
        logger.info("Read %d bytes from upload", size)

        # Check for empty file
        if size == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes)")

        # Save to temporary file (required for File API)
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
            temp_path = temp_file.name
            temp_file.write(content)
            logger.info("Saved audio to temporary file: %s", temp_path)

        # Upload file to Gemini File API
        logger.info("Uploading file to Gemini File API...")
        uploaded_file = client.files.upload(file=temp_path)
        logger.info("File uploaded successfully: %s", uploaded_file.name)

        # Wait for file to be processed with status polling
        logger.info("Waiting for file to be processed...")
        is_confirmed_ready, wait_time = _wait_for_file_ready(
            uploaded_file, 
            max_wait=30, 
            check_interval=1.0
        )
        
        if not is_confirmed_ready:
            # File status API had issues, but we'll try transcription anyway
            logger.warning(
                "Proceeding with transcription despite file status uncertainty "
                "(waited %.1fs)", wait_time
            )
            # Add a bit more buffer time for WebM files
            if ext == '.webm':
                additional_wait = max(0, 8.0 - wait_time)
                if additional_wait > 0:
                    logger.info("Adding %.1fs buffer for WebM processing", additional_wait)
                    time.sleep(additional_wait)

        # Request transcription with retry logic
        prompt = "Generate a transcript of the speech."
        response = _call_gemini_with_retry(
            uploaded_file, 
            max_retries=5,  # Increased retries due to API instability
            initial_delay=2.0
        )

        transcription = getattr(response, 'text', None) or str(response)
        logger.info("Transcription completed successfully")
        logger.debug("Transcription result: %s", transcription[:200])

        return {"transcription": transcription}
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
        
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error("Full traceback:\n%s", traceback.format_exc())
        raise HTTPException(
            status_code=500, 
            detail=f"Transcription error: {str(e)}"
        )
    
    finally:
        # Clean up uploaded file from Gemini
        if uploaded_file:
            try:
                client.files.delete(name=uploaded_file.name)
                logger.info("Deleted uploaded file from Gemini: %s", uploaded_file.name)
            except Exception as e:
                logger.warning("Failed to delete Gemini file %s: %s", uploaded_file.name, e)
        
        # Clean up temporary file
        if temp_path:
            _safe_unlink(temp_path)