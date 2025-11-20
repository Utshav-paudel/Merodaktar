from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from config.database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    doctor_id = Column(
        String, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False
    )
    
    # Time slot reference (optional - for new booking flow)
    slot_id = Column(String, ForeignKey("time_slots.id", ondelete="SET NULL"), nullable=True)
    
    # Encounter reference (optional - link to symptom assessment/previous encounter)
    encounter_id = Column(String, ForeignKey("encounters.id", ondelete="SET NULL"), nullable=True)

    appointment_date = Column(String, nullable=False)
    appointment_time = Column(String, nullable=False)
    appointment_type = Column(
        String, default="in-person"
    )  # in-person, video, phone

    reason = Column(Text)
    symptoms = Column(Text)
    status = Column(
        String, default="scheduled"
    )  # scheduled, confirmed, completed, cancelled, no-show

    confirmation_code = Column(String, unique=True, index=True)

    # Post-appointment data
    doctor_notes = Column(Text)
    diagnosis = Column(Text)
    prescription = Column(Text)
    follow_up_date = Column(String)
    follow_up_required = Column(String)  # yes, no

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    cancelled_at = Column(DateTime)
    cancellation_reason = Column(Text)

    # Relationships
    patient = relationship("User", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")

    def __repr__(self):
        return f"<Appointment(id={self.id}, date={self.appointment_date}, status={self.status})>"
