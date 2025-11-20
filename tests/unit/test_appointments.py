"""
Unit tests for appointment endpoints
"""
import pytest
from fastapi import status
from datetime import datetime, timedelta


@pytest.mark.unit
@pytest.mark.appointment
class TestAppointmentEndpoints:
    """Test appointment API endpoints"""
    
    def test_create_appointment_success(
        self, client, patient_auth_headers, test_appointment_data
    ):
        """Test successful appointment creation"""
        response = client.post(
            "/api/v1/appointments",
            json=test_appointment_data,
            headers=patient_auth_headers
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["patient_id"] == test_appointment_data["patient_id"]
        assert data["doctor_id"] == test_appointment_data["doctor_id"]
        assert data["status"] == "scheduled"
        assert "id" in data
        assert "confirmation_code" in data
    
    def test_create_appointment_unauthorized(self, client, test_appointment_data):
        """Test appointment creation without authentication"""
        response = client.post("/api/v1/appointments", json=test_appointment_data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_patient_appointments(
        self, client, patient_auth_headers, test_patient_user
    ):
        """Test getting patient appointments"""
        response = client.get(
            f"/api/v1/appointments/patient/{test_patient_user.id}",
            headers=patient_auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_doctor_appointments(
        self, client, doctor_auth_headers, test_doctor_user
    ):
        """Test getting doctor appointments"""
        response = client.get(
            f"/api/v1/appointments/doctor/{test_doctor_user['doctor'].id}",
            headers=doctor_auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
    
    def test_update_appointment_status(
        self, client, doctor_auth_headers, test_db_session
    ):
        """Test updating appointment status"""
        from app.models.appointment import Appointment
        
        # Create an appointment first
        appointment = Appointment(
            patient_id="test_patient",
            doctor_id="test_doctor",
            appointment_date="2025-11-25",
            appointment_time="10:00",
            status="scheduled"
        )
        test_db_session.add(appointment)
        test_db_session.commit()
        
        # Update status
        response = client.patch(
            f"/api/v1/appointments/{appointment.id}",
            json={"status": "confirmed"},
            headers=doctor_auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "confirmed"
    
    def test_cancel_appointment(
        self, client, patient_auth_headers, test_db_session
    ):
        """Test cancelling an appointment"""
        from app.models.appointment import Appointment
        
        # Create an appointment
        appointment = Appointment(
            patient_id="test_patient",
            doctor_id="test_doctor",
            appointment_date="2025-11-25",
            appointment_time="10:00",
            status="scheduled"
        )
        test_db_session.add(appointment)
        test_db_session.commit()
        
        # Cancel appointment
        response = client.patch(
            f"/api/v1/appointments/{appointment.id}",
            json={
                "status": "cancelled",
                "cancellation_reason": "Patient unavailable"
            },
            headers=patient_auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "cancelled"
        assert data["cancellation_reason"] == "Patient unavailable"
