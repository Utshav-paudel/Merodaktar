"""
End-to-end test for patient appointment booking workflow
"""
import pytest
from fastapi import status


@pytest.mark.e2e
@pytest.mark.slow
class TestAppointmentBookingWorkflow:
    """Test complete appointment booking workflow"""
    
    def test_complete_booking_flow(
        self, client, test_user_data, test_doctor_user
    ):
        """Test complete patient registration to appointment booking flow"""
        
        # Step 1: Register new patient
        register_response = client.post(
            "/api/v1/auth/register",
            json=test_user_data
        )
        assert register_response.status_code == status.HTTP_201_CREATED
        patient = register_response.json()
        
        # Step 2: Login
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": test_user_data["email"],
                "password": test_user_data["password"]
            }
        )
        assert login_response.status_code == status.HTTP_200_OK
        token = login_response.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}
        
        # Step 3: Search for doctors
        doctors_response = client.get("/api/v1/doctors")
        assert doctors_response.status_code == status.HTTP_200_OK
        doctors = doctors_response.json()
        
        # Step 4: View doctor profile
        if len(doctors) > 0:
            doctor_id = doctors[0]["id"]
            doctor_response = client.get(f"/api/v1/doctors/{doctor_id}")
            assert doctor_response.status_code == status.HTTP_200_OK
        
        # Step 5: Book appointment
        appointment_data = {
            "patient_id": patient["id"],
            "doctor_id": test_doctor_user["doctor"].id,
            "appointment_date": "2025-11-25",
            "appointment_time": "10:00",
            "appointment_type": "in-person",
            "reason": "Regular checkup"
        }
        
        appointment_response = client.post(
            "/api/v1/appointments",
            json=appointment_data,
            headers=auth_headers
        )
        assert appointment_response.status_code == status.HTTP_201_CREATED
        appointment = appointment_response.json()
        assert appointment["status"] == "scheduled"
        assert "confirmation_code" in appointment
        
        # Step 6: View patient appointments
        my_appointments = client.get(
            f"/api/v1/appointments/patient/{patient['id']}",
            headers=auth_headers
        )
        assert my_appointments.status_code == status.HTTP_200_OK
        appointments_list = my_appointments.json()
        assert len(appointments_list) > 0
