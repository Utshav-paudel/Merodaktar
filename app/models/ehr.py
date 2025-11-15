from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from config.database import Base


class EHR(Base):
    __tablename__ = "electronic_health_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(
        String,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    # Medical history
    blood_type = Column(String)
    height = Column(String)  # in cm
    weight = Column(String)  # in kg

    # Medical records (JSON arrays)
    chronic_conditions = Column(
        JSON, default=list
    )  # [{"condition": "Diabetes", "since": "2020"}]
    allergies = Column(
        JSON, default=list
    )  # [{"allergen": "Penicillin", "severity": "high"}]
    medications = Column(
        JSON, default=list
    )  # [{"name": "Metformin", "dosage": "500mg", "frequency": "twice daily"}]
    immunizations = Column(
        JSON, default=list
    )  # [{"vaccine": "COVID-19", "date": "2023-01-15"}]

    # Vital signs history
    vital_signs = Column(
        JSON, default=list
    )  # [{"date": "2023-01-01", "bp": "120/80", "pulse": 72, "temp": 98.6}]

    # Lab results
    lab_results = Column(
        JSON, default=list
    )  # [{"test": "Blood Sugar", "result": "95 mg/dL", "date": "2023-01-01"}]

    # Medical history notes
    family_history = Column(JSON, default=list)
    surgical_history = Column(JSON, default=list)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    patient = relationship("User", back_populates="ehr")

    def __repr__(self):
        return f"<EHR(patient_id={self.patient_id})>"
