from fastapi import APIRouter, UploadFile, File, HTTPException
from google import genai
import os
from dotenv import load_dotenv
import tempfile
from pydub import AudioSegment 

router = APIRouter(prefix="/api/speech", tags=["speech"])

# Initialize Gemini
load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

SUPPORTED_FORMATS = [".wav", ".mp3", ".m4a", ".ogg", ".flac"]

@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    # Validate file extension
    ext = os.path.splitext(audio.filename)[1].lower()
    if ext not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type {ext}. Supported: {', '.join(SUPPORTED_FORMATS)}"
        )

    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_in:
            content = await audio.read()
            temp_in.write(content)
            temp_in.flush()
            input_path = temp_in.name

        # Convert to WAV if not already
        if ext != ".wav":
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_wav:
                AudioSegment.from_file(input_path).export(temp_wav.name, format="wav")
                converted_path = temp_wav.name
        else:
            converted_path = input_path

        try:
            # Upload to Gemini
            myfile = client.files.upload(file=converted_path)

            # Transcribe using Gemini model
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    "Transcribe the audio. It may contain both English and Nepali. Use Nepali script for Nepali speech.",
                    myfile
                ]
            )

            return {"transcription": response.text}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")
        finally:
            # Cleanup temp files
            if os.path.exists(input_path):
                os.unlink(input_path)
            if converted_path != input_path and os.path.exists(converted_path):
                os.unlink(converted_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File processing error: {str(e)}")
