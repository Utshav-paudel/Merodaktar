"""
Integration tests for EHR (Electronic Health Records)
"""
import pytest
from fastapi import status


@pytest.mark.integration
@pytest.mark.ehr
class TestEHRIntegration:
    """Test EHR integration"""
    
    def test_create_encounter(
        self, client, doctor_auth_headers, test_patient_user, test_doctor_user
    ):
        """Test creating medical encounter"""
        encounter_data = {
            "patient_id": test_patient_user.id,
            "doctor_id": test_doctor_user["doctor"].id,
            "chief_complaint": "Fever and headache",
            "present_illness": "Patient reports fever for 2 days",
            "vital_signs": {
                "temperature": "101.5",
                "blood_pressure": "120/80",
                "pulse": "80"
            }
        }
        
        response = client.post(
            "/api/v1/ehr/encounters",
            json=encounter_data,
            headers=doctor_auth_headers
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["patient_id"] == test_patient_user.id
        assert "id" in data
    
    def test_get_patient_encounters(
        self, client, patient_auth_headers, test_patient_user
    ):
        """Test getting patient encounters"""
        response = client.get(
            f"/api/v1/ehr/patients/{test_patient_user.id}/encounters",
            headers=patient_auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
    
    def test_update_encounter(
        self, client, doctor_auth_headers, test_db_session
    ):
        """Test updating encounter"""
        from app.models.encounter import Encounter
        
        # Create encounter
        encounter = Encounter(
            patient_id="test_patient",
            doctor_id="test_doctor",
            chief_complaint="Test complaint"
        )
        test_db_session.add(encounter)
        test_db_session.commit()
        
        # Update encounter
        update_data = {
            "diagnosis": "Common cold",
            "treatment_plan": "Rest and fluids"
        }
        
        response = client.patch(
            f"/api/v1/ehr/encounters/{encounter.id}",
            json=update_data,
            headers=doctor_auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["diagnosis"] == update_data["diagnosis"]
    
    def test_get_medical_history(
        self, client, patient_auth_headers, test_patient_user
    ):
        """Test getting patient medical history"""
        response = client.get(
            f"/api/v1/ehr/patients/{test_patient_user.id}/history",
            headers=patient_auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "encounters" in data or isinstance(data, list)
