from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text, Integer, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from config.database import Base


class Report(Base):
    """Medical report generated from symptom interview"""
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    
    # Report metadata
    report_number = Column(Integer)  # Auto-incrementing per patient
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Interview data
    chief_complaint = Column(Text)
    symptoms = Column(JSON, default=list)  # [{"symptom": "fever", "severity": "moderate", "duration": "3 days"}]
    questions_asked = Column(JSON, default=list)  # [{"question": "...", "answer": "..."}]
    patient_context = Column(Text)  # Store patient context for personalized AI questions
    
    # Assessment
    preliminary_assessment = Column(Text)  # AI-generated summary
    severity_level = Column(String)  # mild, moderate, severe, emergency
    recommended_specialization = Column(String)
    
    # Status
    status = Column(String, default="draft")  # draft, completed, used_for_appointment
    is_used_for_appointment = Column(Boolean, default=False)
    appointment_id = Column(String, ForeignKey("appointments.id"), nullable=True)
    
    # Relationships
    patient = relationship("User", back_populates="reports")
    appointment = relationship("Appointment", foreign_keys=[appointment_id])

    def __repr__(self):
        return f"<Report {self.id} - Patient: {self.patient_id}>"
