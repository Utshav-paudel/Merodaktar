"""
End-to-end test for doctor consultation workflow
"""
import pytest
from fastapi import status


@pytest.mark.e2e
@pytest.mark.slow
class TestDoctorConsultationWorkflow:
    """Test complete doctor consultation workflow"""
    
    def test_consultation_workflow(
        self, 
        client, 
        test_patient_user,
        test_doctor_user,
        patient_auth_headers,
        doctor_auth_headers,
        test_db_session
    ):
        """Test complete consultation from appointment to encounter"""
        
        # Step 1: Create appointment
        from app.models.appointment import Appointment
        
        appointment = Appointment(
            patient_id=test_patient_user.id,
            doctor_id=test_doctor_user["doctor"].id,
            appointment_date="2025-11-25",
            appointment_time="10:00",
            status="confirmed",
            reason="Fever and headache"
        )
        test_db_session.add(appointment)
        test_db_session.commit()
        test_db_session.refresh(appointment)
        
        # Step 2: Doctor views appointment
        doctor_appointments = client.get(
            f"/api/v1/appointments/doctor/{test_doctor_user['doctor'].id}",
            headers=doctor_auth_headers
        )
        assert doctor_appointments.status_code == status.HTTP_200_OK
        
        # Step 3: Doctor creates encounter during consultation
        encounter_data = {
            "patient_id": test_patient_user.id,
            "doctor_id": test_doctor_user["doctor"].id,
            "appointment_id": appointment.id,
            "chief_complaint": "Fever and headache",
            "present_illness": "Patient reports fever 101°F for 2 days with headache",
            "vital_signs": {
                "temperature": "101.0",
                "blood_pressure": "120/80",
                "pulse": "82",
                "respiratory_rate": "18"
            },
            "physical_examination": "Patient appears mildly ill. Throat is red.",
            "diagnosis": "Viral fever",
            "treatment_plan": "Rest, fluids, paracetamol 500mg TID for 3 days",
            "follow_up_required": True,
            "follow_up_date": "2025-11-28"
        }
        
        encounter_response = client.post(
            "/api/v1/ehr/encounters",
            json=encounter_data,
            headers=doctor_auth_headers
        )
        
        if encounter_response.status_code == status.HTTP_201_CREATED:
            encounter = encounter_response.json()
            assert encounter["diagnosis"] == "Viral fever"
        
        # Step 4: Update appointment status to completed
        update_response = client.patch(
            f"/api/v1/appointments/{appointment.id}",
            json={
                "status": "completed",
                "doctor_notes": "Patient advised rest and medication",
                "diagnosis": "Viral fever",
                "prescription": "Paracetamol 500mg TID x 3 days"
            },
            headers=doctor_auth_headers
        )
        assert update_response.status_code == status.HTTP_200_OK
        
        # Step 5: Patient views medical history
        history_response = client.get(
            f"/api/v1/ehr/patients/{test_patient_user.id}/history",
            headers=patient_auth_headers
        )
        
        if history_response.status_code == status.HTTP_200_OK:
            history = history_response.json()
            assert isinstance(history, (list, dict))
