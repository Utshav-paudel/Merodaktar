"""
Unit tests for doctor endpoints
"""
import pytest
from fastapi import status


@pytest.mark.unit
class TestDoctorEndpoints:
    """Test doctor API endpoints"""
    
    def test_get_all_doctors(self, client):
        """Test getting all doctors"""
        response = client.get("/api/v1/doctors")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_doctor_by_id(self, client, test_doctor_user):
        """Test getting doctor by ID"""
        doctor_id = test_doctor_user["doctor"].id
        response = client.get(f"/api/v1/doctors/{doctor_id}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == doctor_id
        assert data["specialization"] == test_doctor_user["doctor"].specialization
    
    def test_get_doctor_nonexistent(self, client):
        """Test getting nonexistent doctor"""
        response = client.get("/api/v1/doctors/nonexistent_id")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_search_doctors_by_specialization(self, client, test_doctor_user):
        """Test searching doctors by specialization"""
        response = client.get(
            "/api/v1/doctors",
            params={"specialization": "General Physician"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "General Physician" in [d["specialization"] for d in data]
    
    def test_update_doctor_profile(
        self, client, doctor_auth_headers, test_doctor_user
    ):
        """Test updating doctor profile"""
        doctor_id = test_doctor_user["doctor"].id
        update_data = {
            "bio": "Updated bio for testing",
            "consultation_fee": 1500.00
        }
        
        response = client.patch(
            f"/api/v1/doctors/{doctor_id}",
            json=update_data,
            headers=doctor_auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["bio"] == update_data["bio"]
        assert data["consultation_fee"] == update_data["consultation_fee"]
    
    def test_update_doctor_availability(
        self, client, doctor_auth_headers, test_doctor_user
    ):
        """Test updating doctor availability"""
        doctor_id = test_doctor_user["doctor"].id
        
        response = client.patch(
            f"/api/v1/doctors/{doctor_id}",
            json={"is_available": False},
            headers=doctor_auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["is_available"] is False
