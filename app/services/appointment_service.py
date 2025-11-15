from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import random
import string

from repositories.appointment import AppointmentRepository
from repositories.doctor import DoctorRepository
from core.exceptions import NotFoundError, ValidationError


class AppointmentService:
    def __init__(self, db: Session):
        self.db = db
        self.appointment_repo = AppointmentRepository(db)
        self.doctor_repo = DoctorRepository(db)

    @staticmethod
    def generate_confirmation_code() -> str:
        """Generate unique confirmation code"""
        return "".join(
            random.choices(string.ascii_uppercase + string.digits, k=8)
        )

    def create_appointment(
        self,
        patient_id: str,
        doctor_id: str,
        appointment_date: str,
        appointment_time: str,
        **kwargs
    ):
        """Create a new appointment"""
        # Verify doctor exists
        doctor = self.doctor_repo.get(doctor_id)
        if not doctor:
            raise NotFoundError("Doctor not found")

        if not doctor.is_available:
            raise ValidationError("Doctor is not available")

        # Check for conflicting appointments
        existing = self.appointment_repo.get_by_date(
            doctor_id, appointment_date
        )
        for apt in existing:
            if apt.appointment_time == appointment_time:
                raise ValidationError("Time slot already booked")

        # Create appointment
        appointment_data = {
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "appointment_date": appointment_date,
            "appointment_time": appointment_time,
            "confirmation_code": self.generate_confirmation_code(),
            "status": "scheduled",
            **kwargs,
        }

        appointment = self.appointment_repo.create(appointment_data)

        # Increment doctor's consultation count
        self.doctor_repo.increment_consultations(doctor_id)

        return appointment

    def get_patient_appointments(
        self, patient_id: str, skip: int = 0, limit: int = 100
    ):
        """Get all appointments for a patient"""
        return self.appointment_repo.get_by_patient(patient_id, skip, limit)

    def get_doctor_appointments(
        self, doctor_id: str, skip: int = 0, limit: int = 100
    ):
        """Get all appointments for a doctor"""
        return self.appointment_repo.get_by_doctor(doctor_id, skip, limit)

    def update_appointment(self, appointment_id: str, update_data: dict):
        """Update appointment"""
        appointment = self.appointment_repo.get(appointment_id)
        if not appointment:
            raise NotFoundError("Appointment not found")

        return self.appointment_repo.update(appointment_id, update_data)

    def cancel_appointment(
        self, appointment_id: str, cancellation_reason: str = None
    ):
        """Cancel an appointment"""
        update_data = {
            "status": "cancelled",
            "cancelled_at": datetime.utcnow(),
            "cancellation_reason": cancellation_reason,
        }
        return self.update_appointment(appointment_id, update_data)

    def complete_appointment(
        self,
        appointment_id: str,
        doctor_notes: str = None,
        diagnosis: str = None,
        prescription: str = None,
        follow_up_date: str = None,
        follow_up_required: str = "no",
    ):
        """Mark appointment as completed with details"""
        update_data = {
            "status": "completed",
            "doctor_notes": doctor_notes,
            "diagnosis": diagnosis,
            "prescription": prescription,
            "follow_up_date": follow_up_date,
            "follow_up_required": follow_up_required,
        }
        return self.update_appointment(appointment_id, update_data)

    def confirm_appointment(self, appointment_id: str):
        """Confirm an appointment"""
        return self.appointment_repo.update_status(appointment_id, "confirmed")
