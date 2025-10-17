# app/subapps/patient/ehr.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from ..login_verification.auth import get_current_user

router = APIRouter(prefix="/patient/ehr", tags=["patient_ehr"])

# In-memory EHR storage
patient_ehr_db = {}

# Pydantic models
class VitalSigns(BaseModel):
    temperature: Optional[float] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    oxygen_saturation: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    bmi: Optional[float] = None

class LabResult(BaseModel):
    test_name: str
    result_value: str
    unit: str
    reference_range: str
    date: str
    status: str = "normal"  # normal, abnormal, critical

class Medication(BaseModel):
    name: str
    dosage: str
    frequency: str
    start_date: str
    end_date: Optional[str] = None
    prescribed_by: str
    status: str = "active"  # active, completed, discontinued

class Allergy(BaseModel):
    allergen: str
    reaction: str
    severity: str  # mild, moderate, severe
    date_identified: str

class Immunization(BaseModel):
    vaccine_name: str
    date_administered: str
    administered_by: str
    next_due_date: Optional[str] = None

class MedicalHistory(BaseModel):
    condition: str
    diagnosed_date: str
    status: str  # active, resolved, chronic
    notes: Optional[str] = None

class EHRRecord(BaseModel):
    patient_email: str
    vital_signs: List[VitalSigns] = []
    lab_results: List[LabResult] = []
    medications: List[Medication] = []
    allergies: List[Allergy] = []
    immunizations: List[Immunization] = []
    medical_history: List[MedicalHistory] = []
    last_updated: str

# Helper functions
def get_or_create_ehr(email: str) -> dict:
    """Get or create EHR for patient"""
    if email not in patient_ehr_db:
        patient_ehr_db[email] = {
            "patient_email": email,
            "vital_signs": [],
            "lab_results": [],
            "medications": [],
            "allergies": [],
            "immunizations": [],
            "medical_history": [],
            "created_at": datetime.utcnow().isoformat(),
            "last_updated": datetime.utcnow().isoformat()
        }
    return patient_ehr_db[email]

# API Routes
@router.get("/")
async def get_patient_ehr(current_user: dict = Depends(get_current_user)):
    """Get complete EHR for current patient"""
    email = current_user["email"]
    ehr = get_or_create_ehr(email)
    return ehr

@router.post("/vital-signs")
async def add_vital_signs(
    vitals: VitalSigns,
    current_user: dict = Depends(get_current_user)
):
    """Add vital signs to EHR"""
    email = current_user["email"]
    ehr = get_or_create_ehr(email)
    
    # Calculate BMI if height and weight are provided
    if vitals.weight and vitals.height:
        height_m = vitals.height / 100  # Convert cm to m
        vitals.bmi = round(vitals.weight / (height_m ** 2), 2)
    
    vital_record = vitals.dict()
    vital_record["recorded_at"] = datetime.utcnow().isoformat()
    
    ehr["vital_signs"].append(vital_record)
    ehr["last_updated"] = datetime.utcnow().isoformat()
    
    return {"message": "Vital signs added successfully", "record": vital_record}

@router.post("/lab-results")
async def add_lab_result(
    lab_result: LabResult,
    current_user: dict = Depends(get_current_user)
):
    """Add lab result to EHR"""
    email = current_user["email"]
    ehr = get_or_create_ehr(email)
    
    result_record = lab_result.dict()
    result_record["id"] = len(ehr["lab_results"]) + 1
    
    ehr["lab_results"].append(result_record)
    ehr["last_updated"] = datetime.utcnow().isoformat()
    
    return {"message": "Lab result added successfully", "record": result_record}

@router.post("/medications")
async def add_medication(
    medication: Medication,
    current_user: dict = Depends(get_current_user)
):
    """Add medication to EHR"""
    email = current_user["email"]
    ehr = get_or_create_ehr(email)
    
    med_record = medication.dict()
    med_record["id"] = len(ehr["medications"]) + 1
    
    ehr["medications"].append(med_record)
    ehr["last_updated"] = datetime.utcnow().isoformat()
    
    return {"message": "Medication added successfully", "record": med_record}

@router.post("/allergies")
async def add_allergy(
    allergy: Allergy,
    current_user: dict = Depends(get_current_user)
):
    """Add allergy to EHR"""
    email = current_user["email"]
    ehr = get_or_create_ehr(email)
    
    allergy_record = allergy.dict()
    allergy_record["id"] = len(ehr["allergies"]) + 1
    
    ehr["allergies"].append(allergy_record)
    ehr["last_updated"] = datetime.utcnow().isoformat()
    
    return {"message": "Allergy added successfully", "record": allergy_record}

@router.post("/immunizations")
async def add_immunization(
    immunization: Immunization,
    current_user: dict = Depends(get_current_user)
):
    """Add immunization to EHR"""
    email = current_user["email"]
    ehr = get_or_create_ehr(email)
    
    imm_record = immunization.dict()
    imm_record["id"] = len(ehr["immunizations"]) + 1
    
    ehr["immunizations"].append(imm_record)
    ehr["last_updated"] = datetime.utcnow().isoformat()
    
    return {"message": "Immunization added successfully", "record": imm_record}

@router.post("/medical-history")
async def add_medical_history(
    history: MedicalHistory,
    current_user: dict = Depends(get_current_user)
):
    """Add medical history to EHR"""
    email = current_user["email"]
    ehr = get_or_create_ehr(email)
    
    history_record = history.dict()
    history_record["id"] = len(ehr["medical_history"]) + 1
    
    ehr["medical_history"].append(history_record)
    ehr["last_updated"] = datetime.utcnow().isoformat()
    
    return {"message": "Medical history added successfully", "record": history_record}

@router.get("/summary")
async def get_ehr_summary(current_user: dict = Depends(get_current_user)):
    """Get summarized EHR data for visualization"""
    email = current_user["email"]
    ehr = get_or_create_ehr(email)
    
    # Get latest vital signs
    latest_vitals = ehr["vital_signs"][-1] if ehr["vital_signs"] else None
    
    # Active medications count
    active_meds = sum(1 for med in ehr["medications"] if med.get("status") == "active")
    
    # Chronic conditions count
    chronic_conditions = sum(
        1 for hist in ehr["medical_history"] 
        if hist.get("status") == "chronic"
    )
    
    return {
        "latest_vitals": latest_vitals,
        "active_medications_count": active_meds,
        "allergies_count": len(ehr["allergies"]),
        "chronic_conditions_count": chronic_conditions,
        "total_lab_results": len(ehr["lab_results"]),
        "immunizations_count": len(ehr["immunizations"])
    }

@router.get("/vitals-trend")
async def get_vitals_trend(
    current_user: dict = Depends(get_current_user),
    days: int = 30
):
    """Get vital signs trend for visualization"""
    email = current_user["email"]
    ehr = get_or_create_ehr(email)
    
    # Get vitals from last N days
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    trend_data = {
        "dates": [],
        "blood_pressure": [],
        "heart_rate": [],
        "weight": [],
        "bmi": []
    }
    
    for vital in ehr["vital_signs"]:
        recorded_date = vital.get("recorded_at")
        if recorded_date:
            try:
                if datetime.fromisoformat(recorded_date) >= cutoff_date:
                    trend_data["dates"].append(recorded_date)
                    trend_data["blood_pressure"].append({
                        "systolic": vital.get("blood_pressure_systolic"),
                        "diastolic": vital.get("blood_pressure_diastolic")
                    })
                    trend_data["heart_rate"].append(vital.get("heart_rate"))
                    trend_data["weight"].append(vital.get("weight"))
                    trend_data["bmi"].append(vital.get("bmi"))
            except:
                pass
    
    return trend_data
