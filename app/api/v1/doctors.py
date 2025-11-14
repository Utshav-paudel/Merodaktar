from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from sqlalchemy.orm import Session

from config.database import get_db
from core.security import get_current_doctor
from models.doctor import Doctor
from schemas.doctor import DoctorResponse, DoctorUpdate
from repositories.doctor import DoctorRepository
from core.exceptions import NotFoundError

router = APIRouter()


@router.get("/", response_model=List[DoctorResponse])
async def get_all_doctors(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    specialization: Optional[str] = None,
    available_only: bool = False,
    db: Session = Depends(get_db),
):
    """Get all doctors with optional filters"""
    doctor_repo = DoctorRepository(db)

    if specialization:
        doctors = doctor_repo.get_by_specialization(
            specialization, skip, limit
        )
    elif available_only:
        doctors = doctor_repo.get_available_doctors(skip, limit)
    else:
        doctors = doctor_repo.get_all(skip, limit)

    return doctors


@router.get("/me", response_model=DoctorResponse)
async def get_current_doctor_profile(
    current_doctor: Doctor = Depends(get_current_doctor),
):
    """Get current doctor profile"""
    return current_doctor


@router.get("/{doctor_id}", response_model=DoctorResponse)
async def get_doctor_by_id(doctor_id: str, db: Session = Depends(get_db)):
    """Get doctor by ID"""
    doctor_repo = DoctorRepository(db)
    doctor = doctor_repo.get(doctor_id)

    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found"
        )

    return doctor


@router.put("/me", response_model=DoctorResponse)
async def update_doctor_profile(
    doctor_update: DoctorUpdate,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    """Update current doctor profile"""
    doctor_repo = DoctorRepository(db)

    update_data = doctor_update.model_dump(exclude_unset=True)
    updated_doctor = doctor_repo.update(current_doctor.id, update_data)

    if not updated_doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found"
        )

    return updated_doctor


@router.patch("/me/availability")
async def toggle_availability(
    is_available: bool,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    """Toggle doctor availability"""
    doctor_repo = DoctorRepository(db)
    updated_doctor = doctor_repo.update(
        current_doctor.id, {"is_available": is_available}
    )

    return {
        "message": f"Availability set to {'available' if is_available else 'unavailable'}",
        "is_available": updated_doctor.is_available,
    }


@router.get("/specializations/list")
async def get_specializations(db: Session = Depends(get_db)):
    """Get list of unique specializations"""
    # This would typically come from a separate specializations table
    # For now, return common specializations
    specializations = [
        "General Physician",
        "Cardiologist",
        "Dermatologist",
        "Pediatrician",
        "Gynecologist",
        "Orthopedic",
        "Psychiatrist",
        "Neurologist",
        "Ophthalmologist",
        "ENT Specialist",
        "Dentist",
        "Urologist",
    ]
    return {"specializations": specializations}
