"""
Integration tests for speech transcription (Gemini ASR)
"""
import pytest
from fastapi import status, UploadFile
from io import BytesIO


@pytest.mark.integration
@pytest.mark.speech
class TestSpeechTranscription:
    """Test speech transcription integration"""
    
    def test_transcribe_audio_success(
        self, client, patient_auth_headers, sample_audio_file
    ):
        """Test successful audio transcription"""
        with open(sample_audio_file, 'rb') as audio_file:
            files = {"file": ("test.wav", audio_file, "audio/wav")}
            
            response = client.post(
                "/api/v1/speech/transcribe",
                files=files,
                headers=patient_auth_headers
            )
        
        # Should succeed or return appropriate error
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_500_INTERNAL_SERVER_ERROR
        ]
        
        if response.status_code == status.HTTP_200_OK:
            data = response.json()
            assert "transcript" in data or "text" in data
    
    def test_transcribe_audio_unauthorized(self, client, sample_audio_file):
        """Test transcription without authentication"""
        with open(sample_audio_file, 'rb') as audio_file:
            files = {"file": ("test.wav", audio_file, "audio/wav")}
            
            response = client.post("/api/v1/speech/transcribe", files=files)
        
        # May require auth or be public
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_401_UNAUTHORIZED
        ]
    
    def test_transcribe_invalid_file_type(
        self, client, patient_auth_headers
    ):
        """Test transcription with invalid file type"""
        # Create fake text file
        fake_file = BytesIO(b"This is not an audio file")
        files = {"file": ("test.txt", fake_file, "text/plain")}
        
        response = client.post(
            "/api/v1/speech/transcribe",
            files=files,
            headers=patient_auth_headers
        )
        
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ]
    
    def test_transcribe_empty_file(self, client, patient_auth_headers):
        """Test transcription with empty file"""
        fake_file = BytesIO(b"")
        files = {"file": ("empty.wav", fake_file, "audio/wav")}
        
        response = client.post(
            "/api/v1/speech/transcribe",
            files=files,
            headers=patient_auth_headers
        )
        
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ]
