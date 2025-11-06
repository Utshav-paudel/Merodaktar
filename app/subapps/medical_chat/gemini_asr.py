from fastapi import APIRouter, UploadFile, File, HTTPException
from google import genai
import os
from dotenv import load_dotenv
import tempfile
from pydub import AudioSegment
import traceback

router = APIRouter(prefix="/speech", tags=["speech"])

# Initialize Gemini
load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

SUPPORTED_FORMATS = [".wav", ".mp3", ".m4a", ".ogg", ".flac", ".webm"]

@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    print(f"Received file: {audio.filename}, content_type: {audio.content_type}")
    
    # Validate file extension
    ext = os.path.splitext(audio.filename)[1].lower()
    print(f"File extension: {ext}")
    
    if ext not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type {ext}. Supported: {', '.join(SUPPORTED_FORMATS)}"
        )

    input_path = None
    converted_path = None
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_in:
            content = await audio.read()
            print(f"Read {len(content)} bytes from upload")
            temp_in.write(content)
            temp_in.flush()
            input_path = temp_in.name
            print(f"Saved to temp file: {input_path}")

        # Convert to WAV if not already
        if ext != ".wav":
            print(f"Converting {ext} to WAV...")
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_wav:
                audio_segment = AudioSegment.from_file(input_path, format=ext[1:])  # Remove the dot
                audio_segment.export(temp_wav.name, format="wav")
                converted_path = temp_wav.name
                print(f"Converted to: {converted_path}")
        else:
            converted_path = input_path
            print("Already WAV format, no conversion needed")

        # Upload to Gemini
        print("Uploading to Gemini...")
        myfile = client.files.upload(file=converted_path)
        print(f"Uploaded file to Gemini: {myfile.name}")

        # Transcribe using Gemini model
        print("Requesting transcription from Gemini...")
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=[
                "Transcribe the audio. It may contain both English and Nepali. Use Nepali script for Nepali speech.",
                myfile
            ]
        )
        
        transcription = response.text
        print(f"Transcription result: {transcription}")
        
        return {"transcription": transcription}
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        print(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
        
    finally:
        # Cleanup temp files
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
            print(f"Cleaned up: {input_path}")
        if converted_path and converted_path != input_path and os.path.exists(converted_path):
            os.unlink(converted_path)
            print(f"Cleaned up: {converted_path}")