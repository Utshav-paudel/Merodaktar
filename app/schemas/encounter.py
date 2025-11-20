from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime


class EncounterBase(BaseModel):
    """Base encounter schema"""
    chief_complaint: str
    symptoms: List[Dict] = []
    encounter_type: str = "ai_consultation"


class EncounterCreate(EncounterBase):
    """Schema for creating an encounter"""
    assessment: Optional[str] = None
    vital_signs: Optional[Dict] = None
    report_id: Optional[str] = None
    consultation_id: Optional[str] = None
    appointment_id: Optional[str] = None


class EncounterUpdate(BaseModel):
    """Schema for updating an encounter"""
    chief_complaint: Optional[str] = None
    symptoms: Optional[List[Dict]] = None
    encounter_type: Optional[str] = None
    assessment: Optional[str] = None
    vital_signs: Optional[Dict] = None
    doctor_notes: Optional[str] = None


class EncounterResponse(EncounterBase):
    """Schema for encounter response"""
    id: str
    patient_id: str
    encounter_number: int
    encounter_date: datetime
    assessment: Optional[str] = None
    vital_signs: Optional[Dict] = None
    patient_summary: Optional[Dict] = None
    ai_preliminary_report: Optional[str] = None
    doctor_notes: Optional[str] = None
    report_id: Optional[str] = None
    consultation_id: Optional[str] = None
    appointment_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EncounterFromReport(BaseModel):
    """Schema for creating encounter from report"""
    report_id: str
