from pydantic import BaseModel, Field, field_serializer, model_validator
from typing import Optional, List, Any
from datetime import datetime


class DoctorScheduleBase(BaseModel):
    """Base schedule schema"""
    day_of_week: int = Field(..., ge=0, le=6, description="0=Sunday, 6=Saturday")
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="Format: HH:MM")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="Format: HH:MM")
    slot_duration_minutes: int = Field(30, ge=15, le=120, description="Duration in minutes")


class DoctorScheduleCreate(DoctorScheduleBase):
    """Schema for creating a schedule"""
    is_available: bool = True


class DoctorScheduleUpdate(BaseModel):
    """Schema for updating a schedule"""
    start_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    end_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    slot_duration_minutes: Optional[int] = Field(None, ge=15, le=120)
    is_available: Optional[bool] = None


class DoctorScheduleResponse(BaseModel):
    """Schema for schedule response"""
    id: str
    doctor_id: str
    day_of_week: int
    start_time: str
    end_time: str
    slot_duration_minutes: int
    is_available: bool
    created_at: datetime
    updated_at: datetime

    @model_validator(mode='before')
    @classmethod
    def map_slot_duration(cls, data: Any) -> Any:
        """Map slot_duration from DB to slot_duration_minutes for API"""
        if isinstance(data, dict):
            if 'slot_duration' in data and 'slot_duration_minutes' not in data:
                data['slot_duration_minutes'] = data['slot_duration']
        else:
            # Handle SQLAlchemy model
            if hasattr(data, 'slot_duration'):
                return {
                    'id': data.id,
                    'doctor_id': data.doctor_id,
                    'day_of_week': data.day_of_week,
                    'start_time': data.start_time,
                    'end_time': data.end_time,
                    'slot_duration_minutes': data.slot_duration,
                    'is_available': data.is_available,
                    'created_at': data.created_at,
                    'updated_at': data.updated_at
                }
        return data

    class Config:
        from_attributes = True


class TimeSlotBase(BaseModel):
    """Base time slot schema"""
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Format: YYYY-MM-DD")
    time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="Format: HH:MM")
    duration: int = 30


class TimeSlotCreate(TimeSlotBase):
    """Schema for creating a time slot"""
    doctor_id: str


class TimeSlotResponse(TimeSlotBase):
    """Schema for time slot response"""
    id: str
    doctor_id: str
    is_booked: bool
    appointment_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AvailableSlotsRequest(BaseModel):
    """Schema for requesting available slots"""
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")


class GenerateSlotsRequest(BaseModel):
    """Schema for generating time slots"""
    start_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    end_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")


class BulkScheduleCreate(BaseModel):
    """Schema for creating multiple schedules at once"""
    schedules: List[DoctorScheduleCreate]
