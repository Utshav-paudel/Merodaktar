from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from sqlalchemy.orm import Session

from config.database import get_db
from schemas.doctor import DoctorResponse
from repositories.doctor import DoctorRepository
from core.exceptions import NotFoundError

router = APIRouter()


@router.get("/doctors/pending", response_model=List[DoctorResponse])
async def get_pending_doctors(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    db: Session = Depends(get_db),
):
    """Get all doctors pending verification"""
    doctor_repo = DoctorRepository(db)
    # Get all doctors where is_verified = False
    doctors = doctor_repo.get_all(skip=skip, limit=limit)
    pending = [d for d in doctors if not d.is_verified]
    return pending


@router.post("/doctors/{doctor_id}/verify")
async def verify_doctor(
    doctor_id: str,
    db: Session = Depends(get_db),
):
    """Verify a doctor account"""
    doctor_repo = DoctorRepository(db)
    doctor = doctor_repo.get(doctor_id)
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    if doctor.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Doctor is already verified"
        )
    
    # Update doctor verification status
    updated_doctor = doctor_repo.update(doctor_id, {"is_verified": True})
    
    return {
        "message": "Doctor verified successfully",
        "doctor_id": doctor_id,
        "doctor_name": updated_doctor.full_name,
        "is_verified": updated_doctor.is_verified
    }


@router.post("/doctors/{doctor_id}/unverify")
async def unverify_doctor(
    doctor_id: str,
    db: Session = Depends(get_db),
):
    """Revoke doctor verification"""
    doctor_repo = DoctorRepository(db)
    doctor = doctor_repo.get(doctor_id)
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    # Update doctor verification status
    updated_doctor = doctor_repo.update(doctor_id, {"is_verified": False})
    
    return {
        "message": "Doctor verification revoked",
        "doctor_id": doctor_id,
        "doctor_name": updated_doctor.full_name,
        "is_verified": updated_doctor.is_verified
    }


@router.get("/doctors/all", response_model=List[DoctorResponse])
async def get_all_doctors_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    db: Session = Depends(get_db),
):
    """Get all doctors (admin view with verification status)"""
    doctor_repo = DoctorRepository(db)
    doctors = doctor_repo.get_all(skip, limit)
    return doctors
