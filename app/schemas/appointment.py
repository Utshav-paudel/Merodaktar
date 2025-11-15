from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AppointmentBase(BaseModel):
    appointment_date: str
    appointment_time: str
    reason: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    doctor_id: str
    symptoms: Optional[str] = None
    appointment_type: str = "in-person"


class AppointmentUpdate(BaseModel):
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    status: Optional[str] = None
    doctor_notes: Optional[str] = None
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    follow_up_date: Optional[str] = None
    follow_up_required: Optional[str] = None


class AppointmentResponse(AppointmentBase):
    id: str
    patient_id: str
    doctor_id: str
    status: str
    appointment_type: str
    confirmation_code: Optional[str] = None
    doctor_notes: Optional[str] = None
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    follow_up_date: Optional[str] = None
    created_at: datetime
    # Populated fields
    patient_name: Optional[str] = None
    patient_email: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_specialization: Optional[str] = None

    class Config:
        from_attributes = True
