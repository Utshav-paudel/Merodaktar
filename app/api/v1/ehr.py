from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List

from config.database import get_db
from core.security import get_current_user, get_current_doctor, get_current_user_or_doctor
from models.user import User
from models.doctor import Doctor
from schemas.ehr import EHRCreate, EHRResponse, EHRUpdate
from schemas.encounter import EncounterCreate, EncounterUpdate, EncounterResponse
from services.ehr_service import EHRService
from api.dependencies import get_ehr_service
from repositories.encounter import EncounterRepository
from core.exceptions import NotFoundError

router = APIRouter()


@router.get("/me", response_model=EHRResponse)
async def get_my_ehr(
    current_user: User = Depends(get_current_user),
    ehr_service: EHRService = Depends(get_ehr_service),
):
    """Get current user's EHR"""
    try:
        ehr = ehr_service.get_patient_ehr(current_user.id)
        return ehr
    except NotFoundError:
        # Auto-create if doesn't exist
        ehr = ehr_service.get_or_create_ehr(current_user.id)
        return ehr


@router.post("/me", response_model=EHRResponse)
async def create_or_update_my_ehr(
    ehr_data: EHRCreate,
    current_user: User = Depends(get_current_user),
    ehr_service: EHRService = Depends(get_ehr_service),
):
    """Create or update current user's EHR (for medical history)"""
    try:
        # Try to get existing EHR
        ehr = ehr_service.get_patient_ehr(current_user.id)
        # Merge data if exists
        update_data = ehr_data.model_dump(exclude_unset=True)
        
        # Merge chronic_conditions, medications, allergies, immunizations
        for field in ['chronic_conditions', 'medications', 'allergies', 'immunizations']:
            if field in update_data and update_data[field]:
                existing = getattr(ehr, field, []) or []
                update_data[field] = existing + update_data[field]
        
        ehr = ehr_service.update_ehr(current_user.id, update_data)
        return ehr
    except NotFoundError:
        # Create new EHR if doesn't exist
        ehr_dict = ehr_data.model_dump()
        ehr_dict["patient_id"] = current_user.id
        ehr = ehr_service.ehr_repo.create(ehr_dict)
        return ehr


@router.put("/me", response_model=EHRResponse)
async def update_my_ehr(
    ehr_update: EHRUpdate,
    current_user: User = Depends(get_current_user),
    ehr_service: EHRService = Depends(get_ehr_service),
):
    """Update current user's EHR"""
    update_data = ehr_update.model_dump(exclude_unset=True)
    ehr = ehr_service.update_ehr(current_user.id, update_data)
    return ehr


@router.post("/me/vital-signs", response_model=EHRResponse)
async def add_vital_signs(
    vital_data: dict,
    current_user: User = Depends(get_current_user),
    ehr_service: EHRService = Depends(get_ehr_service),
):
    """Add vital signs record"""
    ehr = ehr_service.add_vital_signs(current_user.id, vital_data)
    return ehr


@router.post("/me/lab-result", response_model=EHRResponse)
async def add_lab_result(
    lab_data: dict,
    current_user: User = Depends(get_current_user),
    ehr_service: EHRService = Depends(get_ehr_service),
):
    """Add lab result"""
    ehr = ehr_service.add_lab_result(current_user.id, lab_data)
    return ehr


@router.post("/me/medication", response_model=EHRResponse)
async def add_medication(
    medication: dict,
    current_user: User = Depends(get_current_user),
    ehr_service: EHRService = Depends(get_ehr_service),
):
    """Add medication"""
    ehr = ehr_service.add_medication(current_user.id, medication)
    return ehr


@router.post("/me/allergy", response_model=EHRResponse)
async def add_allergy(
    allergy: dict,
    current_user: User = Depends(get_current_user),
    ehr_service: EHRService = Depends(get_ehr_service),
):
    """Add allergy"""
    ehr = ehr_service.add_allergy(current_user.id, allergy)
    return ehr


@router.post("/me/immunization", response_model=EHRResponse)
async def add_immunization(
    immunization: dict,
    current_user: User = Depends(get_current_user),
    ehr_service: EHRService = Depends(get_ehr_service),
):
    """Add immunization"""
    ehr = ehr_service.add_immunization(current_user.id, immunization)
    return ehr


# Encounter Management Endpoints
@router.get("/me/encounters", response_model=List[EncounterResponse])
async def get_my_encounters(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all encounters for current patient"""
    encounter_repo = EncounterRepository(db)
    encounters = encounter_repo.get_by_patient(current_user.id, skip, limit)
    return encounters


@router.get("/me/encounters/{encounter_id}", response_model=EncounterResponse)
async def get_encounter(
    encounter_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific encounter"""
    encounter_repo = EncounterRepository(db)
    encounter = encounter_repo.get(encounter_id)

    if not encounter or encounter.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found",
        )

    return encounter


@router.post("/patients/{patient_id}/encounters", response_model=EncounterResponse)
async def create_encounter(
    patient_id: str,
    encounter_data: EncounterCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create an encounter (doctors only)"""
    # Verify user is a doctor
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can create encounters",
        )

    encounter_repo = EncounterRepository(db)
    encounter_dict = encounter_data.model_dump()
    encounter_dict["patient_id"] = patient_id
    encounter_dict["provider_id"] = current_user.id

    encounter = encounter_repo.create(encounter_dict)
    return encounter


@router.put("/encounters/{encounter_id}", response_model=EncounterResponse)
async def update_encounter(
    encounter_id: str,
    encounter_update: EncounterUpdate,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    """Update an encounter (doctors only)"""
    encounter_repo = EncounterRepository(db)
    encounter = encounter_repo.get(encounter_id)

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found",
        )

    update_data = encounter_update.model_dump(exclude_unset=True)
    
    # Update the encounter with doctor's notes
    updated_encounter = encounter_repo.update(encounter_id, update_data)

    return updated_encounter


@router.get("/encounters/{encounter_id}/full", response_model=dict)
async def get_encounter_with_ehr(
    encounter_id: str,
    current_user = Depends(get_current_user_or_doctor),
    db: Session = Depends(get_db),
):
    """Get encounter with full patient EHR context (for doctors and patients)"""
    from repositories.ehr import EHRRepository
    
    encounter_repo = EncounterRepository(db)
    ehr_repo = EHRRepository(db)
    
    encounter = encounter_repo.get(encounter_id)
    
    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found",
        )
    
    # Verify access - doctor can view any encounter, patient only their own
    user_role = getattr(current_user, 'role', None)
    if user_role == "doctor":
        # Doctors can view all encounters (they need access to patient history)
        pass
    elif user_role == "patient":
        # Patients can only view their own encounters
        if encounter.patient_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    # Get full patient EHR
    ehr = ehr_repo.get_by_patient(encounter.patient_id)
    
    # Get patient details from User table
    from repositories.user import UserRepository
    user_repo = UserRepository(db)
    patient = user_repo.get(encounter.patient_id)
    
    # Convert SQLAlchemy model to Pydantic schema
    encounter_data = EncounterResponse.model_validate(encounter)
    
    # Calculate age from date of birth if available
    age = "Not provided"
    if patient and patient.date_of_birth:
        from datetime import datetime, date
        today = datetime.now()
        
        # Handle both datetime and string date_of_birth
        if isinstance(patient.date_of_birth, str):
            try:
                birth_date = datetime.strptime(patient.date_of_birth, '%Y-%m-%d').date()
            except ValueError:
                birth_date = None
        elif isinstance(patient.date_of_birth, datetime):
            birth_date = patient.date_of_birth.date()
        else:
            birth_date = patient.date_of_birth
        
        if birth_date:
            age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    
    # Build comprehensive response with patient info
    response = {
        "encounter": encounter_data.model_dump(),
        "patient_info": {
            "name": patient.full_name if patient and patient.full_name else "Not provided",
            "email": patient.email if patient and patient.email else "Not provided",
            "phone": patient.phone if patient and patient.phone else "Not provided",
            "age": age,
            "gender": patient.gender if patient and patient.gender else "Not provided",
            "date_of_birth": str(patient.date_of_birth) if patient and patient.date_of_birth else "Not provided",
            "address": patient.address if patient and patient.address else "Not provided",
        } if patient else None,
        "patient_ehr": {
            "blood_type": ehr.blood_type if ehr and ehr.blood_type else "Not provided",
            "height": ehr.height if ehr and ehr.height else "Not provided",
            "weight": ehr.weight if ehr and ehr.weight else "Not provided",
            "vital_signs": ehr.vital_signs[-5:] if ehr and ehr.vital_signs else [],  # Last 5 records
            "medications": ehr.medications if ehr and ehr.medications else [],
            "allergies": ehr.allergies if ehr and ehr.allergies else [],
            "chronic_conditions": ehr.chronic_conditions if ehr and ehr.chronic_conditions else [],
            "immunizations": ehr.immunizations if ehr and ehr.immunizations else [],
        } if ehr else None
    }
    
    return response


@router.get("/patients/{patient_id}/encounters", response_model=List[EncounterResponse])
async def get_patient_encounters_by_doctor(
    patient_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    """Get all encounters for a specific patient (doctors only)"""
    encounter_repo = EncounterRepository(db)
    encounters = encounter_repo.get_by_patient(patient_id, skip, limit)
    return encounters
