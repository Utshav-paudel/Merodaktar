from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, List
from datetime import datetime


class DoctorBase(BaseModel):
    email: EmailStr
    full_name: str
    specialization: str


class DoctorCreate(DoctorBase):
    password: str = Field(..., min_length=8)
    phone: Optional[str] = None
    license_number: str
    nmc_number: Optional[str] = None
    years_of_experience: Optional[int] = 0
    education: Optional[str] = None
    bio: Optional[str] = None


class DoctorLogin(BaseModel):
    email: EmailStr
    password: str


class DoctorUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    education: Optional[str] = None
    bio: Optional[str] = None
    consultation_fee: Optional[int] = None
    is_available: Optional[bool] = None
    weekly_schedule: Optional[Dict[str, List[str]]] = None


class DoctorResponse(DoctorBase):
    id: str
    phone: Optional[str] = None
    license_number: str
    years_of_experience: int
    education: Optional[str] = None
    bio: Optional[str] = None
    consultation_fee: int
    is_available: bool
    is_verified: bool
    rating: int
    total_consultations: int
    weekly_schedule: Optional[Dict[str, List[str]]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DoctorTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    doctor: DoctorResponse
