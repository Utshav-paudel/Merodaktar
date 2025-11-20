from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from config.database import Base


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    phone = Column(String)
    specialization = Column(String, nullable=False)
    license_number = Column(String, unique=True)
    nmc_number = Column(String)
    years_of_experience = Column(Integer, default=0)
    education = Column(Text)
    bio = Column(Text)
    profile_image = Column(String)
    consultation_fee = Column(Integer, default=500)
    is_available = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    weekly_schedule = Column(
        JSON
    )  # {"monday": ["09:00-12:00", "14:00-17:00"], ...}
    rating = Column(Integer, default=0)
    total_consultations = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    appointments = relationship(
        "Appointment", back_populates="doctor", cascade="all, delete-orphan"
    )
    schedules = relationship(
        "DoctorSchedule", back_populates="doctor", cascade="all, delete-orphan"
    )
    time_slots = relationship(
        "TimeSlot", back_populates="doctor", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Doctor(id={self.id}, name={self.full_name}, specialization={self.specialization})>"
