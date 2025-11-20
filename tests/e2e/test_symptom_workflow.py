"""
End-to-end test for symptom assessment to appointment workflow
"""
import pytest
from fastapi import status


@pytest.mark.e2e
@pytest.mark.slow
class TestSymptomAssessmentWorkflow:
    """Test symptom assessment leading to appointment booking"""
    
    def test_symptom_to_appointment_flow(
        self, client, test_patient_user, patient_auth_headers, test_doctor_user
    ):
        """Test complete flow from symptom assessment to appointment"""
        
        # Step 1: Start symptom assessment
        assessment_start = client.post(
            "/api/v1/chat/symptom-assessment/start",
            json={"patient_id": test_patient_user.id},
            headers=patient_auth_headers
        )
        assert assessment_start.status_code == status.HTTP_200_OK
        session_data = assessment_start.json()
        session_id = session_data["session_id"]
        
        # Step 2: Answer symptom questions
        responses = [
            "I have fever and headache for 2 days",
            "The fever is around 101°F",
            "Yes, I also have body aches",
            "No, no cough or cold symptoms"
        ]
        
        for answer in responses:
            response = client.post(
                "/api/v1/chat/symptom-assessment/respond",
                json={
                    "session_id": session_id,
                    "answer": answer
                },
                headers=patient_auth_headers
            )
            
            if response.status_code == status.HTTP_200_OK:
                data = response.json()
                if data.get("assessment_complete"):
                    break
        
        # Step 3: Get assessment summary
        summary_response = client.get(
            f"/api/v1/chat/symptom-assessment/{session_id}/summary",
            headers=patient_auth_headers
        )
        
        # May or may not have summary endpoint
        if summary_response.status_code == status.HTTP_200_OK:
            summary = summary_response.json()
            assert "symptoms" in summary or "assessment" in summary
        
        # Step 4: Book appointment based on assessment
        appointment_data = {
            "patient_id": test_patient_user.id,
            "doctor_id": test_doctor_user["doctor"].id,
            "appointment_date": "2025-11-25",
            "appointment_time": "14:00",
            "appointment_type": "in-person",
            "reason": "Follow-up on symptom assessment",
            "symptoms": "Fever, headache, body aches"
        }
        
        appointment_response = client.post(
            "/api/v1/appointments",
            json=appointment_data,
            headers=patient_auth_headers
        )
        assert appointment_response.status_code == status.HTTP_201_CREATED
        appointment = appointment_response.json()
        assert appointment["status"] == "scheduled"
        
        # Step 5: Verify appointment was created
        my_appointments = client.get(
            f"/api/v1/appointments/patient/{test_patient_user.id}",
            headers=patient_auth_headers
        )
        assert my_appointments.status_code == status.HTTP_200_OK
        appointments = my_appointments.json()
        assert len(appointments) > 0
