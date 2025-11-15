from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from config.database import get_db
from core.security import get_current_user
from models.user import User
from schemas.ehr import EHRCreate, EHRResponse, EHRUpdate
from services.ehr_service import EHRService
from api.dependencies import get_ehr_service
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
