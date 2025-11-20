"""
Integration tests for MedGemma AI service
"""
import pytest
from app.services.medgemma_service import MedGemmaService


@pytest.mark.integration
@pytest.mark.medgemma
@pytest.mark.slow
class TestMedGemmaIntegration:
    """Test MedGemma AI integration"""
    
    @pytest.mark.asyncio
    async def test_generate_response(self, mock_openai_client):
        """Test generating AI response"""
        service = MedGemmaService()
        
        response = await service.generate_response(
            messages=[
                {"role": "user", "content": "What are symptoms of fever?"}
            ]
        )
        
        assert response is not None
        assert "response" in response or "content" in response
    
    @pytest.mark.asyncio
    async def test_generate_symptom_question(self, mock_openai_client):
        """Test generating symptom interview question"""
        service = MedGemmaService()
        
        context = {
            "symptoms": ["fever", "headache"],
            "duration": "2 days"
        }
        
        response = await service.generate_symptom_question(context)
        
        assert response is not None
        assert "question" in response or isinstance(response, str)
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms(self, mock_openai_client):
        """Test analyzing symptoms"""
        service = MedGemmaService()
        
        symptoms = [
            {"symptom": "fever", "severity": "high", "duration": "2 days"},
            {"symptom": "headache", "severity": "moderate", "duration": "2 days"}
        ]
        
        response = await service.analyze_symptoms(symptoms)
        
        assert response is not None
        assert isinstance(response, (dict, str))
