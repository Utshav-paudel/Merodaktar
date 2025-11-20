from sqlalchemy import Column, String, Time, Integer, Boolean, ForeignKey, Date, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, time
import uuid
from config.database import Base


class DoctorSchedule(Base):
    """Doctor's weekly availability schedule"""
    __tablename__ = "doctor_schedules"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    doctor_id = Column(
        String, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False
    )
    
    # Schedule details
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = Column(String, nullable=False)  # "09:00"
    end_time = Column(String, nullable=False)  # "17:00"
    slot_duration = Column(Integer, default=30)  # Duration in minutes
    
    # Status
    is_available = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    doctor = relationship("Doctor", back_populates="schedules")

    def __repr__(self):
        return f"<DoctorSchedule {self.doctor_id} - Day: {self.day_of_week}>"


class TimeSlot(Base):
    """Individual time slots generated from doctor schedules"""
    __tablename__ = "time_slots"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    doctor_id = Column(
        String, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False
    )
    
    # Slot details
    date = Column(String, nullable=False)  # "2025-11-17"
    time = Column(String, nullable=False)  # "09:00"
    duration = Column(Integer, default=30)  # Duration in minutes
    
    # Booking status
    is_booked = Column(Boolean, default=False)
    appointment_id = Column(String, ForeignKey("appointments.id"), nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    doctor = relationship("Doctor", back_populates="time_slots")
    appointment = relationship("Appointment", foreign_keys=[appointment_id])

    def __repr__(self):
        return f"<TimeSlot {self.date} {self.time} - Booked: {self.is_booked}>"
