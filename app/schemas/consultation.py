from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class MessageCreate(BaseModel):
    message: str
    sender: str = "user"


class MessageResponse(BaseModel):
    id: str
    sender: str
    message: str
    timestamp: datetime

    class Config:
        from_attributes = True


class ConsultationCreate(BaseModel):
    language: str = "en"


class ConsultationUpdate(BaseModel):
    symptoms: Optional[List[str]] = None
    urgency_level: Optional[str] = None
    emergency_flag: Optional[bool] = None
    recommended_specialization: Optional[str] = None
    preliminary_diagnosis: Optional[str] = None


class ConsultationResponse(BaseModel):
    id: str
    session_id: str
    patient_id: str
    consultation_date: datetime
    language: str
    conversation_title: Optional[str] = None
    symptoms: Optional[List[str]] = None
    urgency_level: Optional[str] = None
    emergency_flag: bool
    is_active: bool
    total_messages: int

    class Config:
        from_attributes = True
