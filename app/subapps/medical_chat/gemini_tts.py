# app/subapps/medical_chat/gemini_tts.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
import google.generativeai as genai
from google.generativeai import types
import base64

load_dotenv()

router = APIRouter(prefix="/medical/gemini", tags=["gemini_tts"])

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Pydantic models
class TTSRequest(BaseModel):
    text: str
    voice_name: str = "Kore"  # Default voice
    speaker_name: Optional[str] = None
    style_prompt: Optional[str] = None

class TTSResponse(BaseModel):
    audio_base64: str
    sample_rate: int = 24000
    channels: int = 1

# Voice options available in Gemini 2.5
AVAILABLE_VOICES = [
    "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda",
    "Orus", "Aoede", "Callirrhoe", "Autonoe", "Enceladus", "Iapetus",
    "Umbriel", "Algieba", "Despina", "Erinome", "Algenib", "Rasalgethi",
    "Laomedeia", "Schedar", "Alnilam", "Achird", "Gacrux", "Pulcherrima",
    "Sadachbia", "Zubenelgenubi", "Vindemiatrix", "Sadaltager", "Sulafat"
]

@router.post("/text-to-speech", response_model=TTSResponse)
async def generate_speech(request: TTSRequest):
    """
    Generate speech from text using Gemini 2.5 TTS
    """
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Gemini API key not configured. Please set GEMINI_API_KEY in .env file"
        )
    
    if request.voice_name not in AVAILABLE_VOICES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid voice name. Choose from: {', '.join(AVAILABLE_VOICES)}"
        )
    
    try:
        # Prepare the prompt
        prompt = request.text
        if request.style_prompt:
            prompt = f"{request.style_prompt}: {request.text}"
        
        # Configure the generation
        model = genai.GenerativeModel("gemini-2.0-flash-exp")
        
        # Generate audio
        response = model.generate_content(
            contents=prompt,
            generation_config=types.GenerationConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name=request.voice_name
                        )
                    )
                )
            )
        )
        
        # Extract audio data
        audio_data = response.candidates[0].content.parts[0].inline_data.data
        
        # Convert to base64 for transmission
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        
        return TTSResponse(
            audio_base64=audio_base64,
            sample_rate=24000,
            channels=1
        )
        
    except Exception as e:
        print(f"Gemini TTS Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate speech: {str(e)}"
        )

@router.get("/voices")
async def get_available_voices():
    """Get list of available voices"""
    return {
        "voices": [
            {"name": voice, "description": f"{voice} voice"}
            for voice in AVAILABLE_VOICES
        ],
        "default": "Kore",
        "total": len(AVAILABLE_VOICES)
    }

@router.post("/chat-with-voice")
async def chat_with_voice(
    message: str,
    voice_name: str = "Kore",
    style: str = "friendly and professional"
):
    """
    Generate a medical response and convert it to speech
    This is a placeholder - integrate with your actual medical chat logic
    """
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Gemini API key not configured"
        )
    
    try:
        # First, generate a text response (you can integrate with your medical chat here)
        model = genai.GenerativeModel("gemini-2.0-flash-exp")
        
        text_response = model.generate_content(
            f"As a medical assistant, respond to this query in a {style} manner: {message}"
        )
        
        response_text = text_response.text
        
        # Then convert to speech
        audio_response = model.generate_content(
            contents=f"Say in a {style} tone: {response_text}",
            generation_config=types.GenerationConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name=voice_name
                        )
                    )
                )
            )
        )
        
        audio_data = audio_response.candidates[0].content.parts[0].inline_data.data
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        
        return {
            "text_response": response_text,
            "audio_base64": audio_base64,
            "voice_used": voice_name
        }
        
    except Exception as e:
        print(f"Chat with voice error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process request: {str(e)}"
        )
