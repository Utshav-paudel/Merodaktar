"""
Integration tests for chat and symptom assessment
"""
import pytest
from fastapi import status


@pytest.mark.integration
@pytest.mark.chat
class TestChatIntegration:
    """Test chat and symptom assessment integration"""
    
    def test_start_symptom_assessment(
        self, client, patient_auth_headers, test_patient_user
    ):
        """Test starting symptom assessment"""
        response = client.post(
            "/api/v1/chat/symptom-assessment/start",
            json={"patient_id": test_patient_user.id},
            headers=patient_auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "session_id" in data
        assert "question" in data
    
    def test_send_symptom_response(
        self, client, patient_auth_headers, test_patient_user
    ):
        """Test sending symptom response"""
        # Start assessment first
        start_response = client.post(
            "/api/v1/chat/symptom-assessment/start",
            json={"patient_id": test_patient_user.id},
            headers=patient_auth_headers
        )
        session_id = start_response.json()["session_id"]
        
        # Send response
        response = client.post(
            "/api/v1/chat/symptom-assessment/respond",
            json={
                "session_id": session_id,
                "answer": "I have a headache and fever for 2 days"
            },
            headers=patient_auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "next_question" in data or "assessment_complete" in data
    
    def test_get_chat_history(
        self, client, patient_auth_headers, test_patient_user
    ):
        """Test getting chat history"""
        response = client.get(
            f"/api/v1/chat/history/{test_patient_user.id}",
            headers=patient_auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
    
    def test_medical_query(
        self, client, patient_auth_headers, mock_medgemma_service
    ):
        """Test general medical query"""
        response = client.post(
            "/api/v1/chat/query",
            json={
                "question": "What are the symptoms of common cold?",
                "context": []
            },
            headers=patient_auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "response" in data
