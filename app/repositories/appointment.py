from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from models.appointment import Appointment
from .base import BaseRepository


class AppointmentRepository(BaseRepository[Appointment]):
    def __init__(self, db: Session):
        super().__init__(Appointment, db)

    def get_by_patient(
        self, patient_id: str, skip: int = 0, limit: int = 100
    ) -> List[Appointment]:
        """Get appointments for a patient"""
        return (
            self.db.query(Appointment)
            .filter(Appointment.patient_id == patient_id)
            .order_by(Appointment.appointment_date.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_doctor(
        self, doctor_id: str, skip: int = 0, limit: int = 100
    ) -> List[Appointment]:
        """Get appointments for a doctor"""
        return (
            self.db.query(Appointment)
            .filter(Appointment.doctor_id == doctor_id)
            .order_by(Appointment.appointment_date.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_date(self, doctor_id: str, date: str) -> List[Appointment]:
        """Get appointments for a doctor on a specific date"""
        return (
            self.db.query(Appointment)
            .filter(
                and_(
                    Appointment.doctor_id == doctor_id,
                    Appointment.appointment_date == date,
                    or_(
                        Appointment.status == "scheduled",
                        Appointment.status == "confirmed",
                    ),
                )
            )
            .all()
        )

    def get_by_confirmation_code(self, code: str) -> Optional[Appointment]:
        """Get appointment by confirmation code"""
        return (
            self.db.query(Appointment)
            .filter(Appointment.confirmation_code == code)
            .first()
        )

    def update_status(
        self, appointment_id: str, status: str
    ) -> Optional[Appointment]:
        """Update appointment status"""
        return self.update(appointment_id, {"status": status})
