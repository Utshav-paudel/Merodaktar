from typing import Optional, List
from sqlalchemy.orm import Session
from models.doctor import Doctor
from .base import BaseRepository


class DoctorRepository(BaseRepository[Doctor]):
    def __init__(self, db: Session):
        super().__init__(Doctor, db)

    def get_by_email(self, email: str) -> Optional[Doctor]:
        """Get doctor by email"""
        return self.db.query(Doctor).filter(Doctor.email == email).first()

    def get_by_specialization(
        self, specialization: str, skip: int = 0, limit: int = 100
    ) -> List[Doctor]:
        """Get doctors by specialization"""
        return (
            self.db.query(Doctor)
            .filter(
                Doctor.specialization == specialization,
                Doctor.is_verified,
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_available_doctors(
        self, skip: int = 0, limit: int = 100
    ) -> List[Doctor]:
        """Get available doctors"""
        return (
            self.db.query(Doctor)
            .filter(Doctor.is_available, Doctor.is_verified)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def increment_consultations(self, doctor_id: str) -> Optional[Doctor]:
        """Increment total consultations"""
        doctor = self.get(doctor_id)
        if doctor:
            doctor.total_consultations += 1
            self.db.commit()
            self.db.refresh(doctor)
        return doctor
