from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AppointmentBase(BaseModel):
    appointment_date: Optional[str] = None  # Optional when using slot_id
    appointment_time: Optional[str] = None  # Optional when using slot_id
    reason: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    doctor_id: str
    slot_id: Optional[str] = None  # Optional: use slot-based booking or manual date/time
    encounter_id: Optional[str] = None  # Link to existing encounter/report
    symptoms: Optional[str] = None
    appointment_type: str = "in-person"


class AppointmentUpdate(BaseModel):
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    status: Optional[str] = None
    encounter_id: Optional[str] = None  # Link encounter after appointment
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
    encounter_id: Optional[str] = None  # Linked encounter
    confirmation_code: Optional[str] = None
    doctor_notes: Optional[str] = None
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    follow_up_date: Optional[str] = None
    created_at: datetime
    # Additional fields for display
    patient_name: Optional[str] = None
    patient_email: Optional[str] = None
    doctor_name: Optional[str] = None

    class Config:
        from_attributes = True
