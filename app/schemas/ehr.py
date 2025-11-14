from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime


class EHRCreate(BaseModel):
    blood_type: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None


class EHRUpdate(BaseModel):
    blood_type: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    chronic_conditions: Optional[List[Dict]] = None
    allergies: Optional[List[Dict]] = None
    medications: Optional[List[Dict]] = None
    immunizations: Optional[List[Dict]] = None
    vital_signs: Optional[List[Dict]] = None
    lab_results: Optional[List[Dict]] = None


class EHRResponse(BaseModel):
    id: str
    patient_id: str
    blood_type: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    chronic_conditions: List[Dict] = []
    allergies: List[Dict] = []
    medications: List[Dict] = []
    immunizations: List[Dict] = []
    vital_signs: List[Dict] = []
    lab_results: List[Dict] = []
    created_at: datetime
    last_updated: datetime

    class Config:
        from_attributes = True
