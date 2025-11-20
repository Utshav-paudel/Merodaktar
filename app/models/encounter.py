from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from config.database import Base


class Encounter(Base):
    """Medical encounter - each AI consultation creates an encounter"""
    __tablename__ = "encounters"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    
    # Encounter metadata
    encounter_number = Column(Integer)  # Auto-incrementing per patient (Encounter 1, 2, 3...)
    encounter_date = Column(DateTime, default=datetime.utcnow)
    encounter_type = Column(String, default="ai_consultation")  # ai_consultation, appointment, emergency
    
    # Clinical data
    chief_complaint = Column(Text)
    symptoms = Column(JSON, default=list)
    vital_signs = Column(JSON)  # Optional: {"bp": "120/80", "temp": "98.6"}
    assessment = Column(Text)  # AI-generated or doctor's assessment
    
    # Patient information (snapshot at time of encounter)
    patient_summary = Column(JSON)  # {"name": "...", "age": "...", "gender": "...", ...}
    ai_preliminary_report = Column(Text)  # AI generated preliminary assessment
    doctor_notes = Column(Text)  # Doctor's notes after consultation
    
    # Related records
    report_id = Column(String, ForeignKey("reports.id"), nullable=True)
    consultation_id = Column(String, ForeignKey("consultations.id"), nullable=True)
    appointment_id = Column(String, ForeignKey("appointments.id"), nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = relationship("User", back_populates="encounters")
    report = relationship("Report", foreign_keys=[report_id])
    consultation = relationship("Consultation", foreign_keys=[consultation_id])

    def __repr__(self):
        return f"<Encounter {self.encounter_number} - Patient: {self.patient_id}>"
