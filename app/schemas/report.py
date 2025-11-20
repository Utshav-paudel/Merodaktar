from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime


class ReportBase(BaseModel):
    """Base report schema"""
    chief_complaint: str
    symptoms: List[Dict] = []  # [{"symptom": "fever", "severity": "moderate"}]
    

class ReportCreate(ReportBase):
    """Schema for creating a report"""
    preliminary_assessment: Optional[str] = None
    severity_level: Optional[str] = "moderate"
    recommended_specialization: Optional[str] = None


class ReportUpdate(BaseModel):
    """Schema for updating a report"""
    chief_complaint: Optional[str] = None
    symptoms: Optional[List[Dict]] = None
    preliminary_assessment: Optional[str] = None
    severity_level: Optional[str] = None
    recommended_specialization: Optional[str] = None
    status: Optional[str] = None


class ReportResponse(ReportBase):
    """Schema for report response"""
    id: str
    patient_id: str
    report_number: int
    questions_asked: List[Dict] = []
    preliminary_assessment: Optional[str] = None
    severity_level: Optional[str] = None
    recommended_specialization: Optional[str] = None
    status: str
    is_used_for_appointment: bool
    appointment_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SymptomInterviewStart(BaseModel):
    """Schema for starting symptom interview"""
    chief_complaint: str


class SymptomInterviewAnswer(BaseModel):
    """Schema for answering interview question"""
    session_id: str
    answer: str


class SymptomInterviewResponse(BaseModel):
    """Schema for interview response"""
    session_id: str
    question: str
    question_number: int
    total_questions: int = 20
    is_complete: bool = False
    report_id: Optional[str] = None
