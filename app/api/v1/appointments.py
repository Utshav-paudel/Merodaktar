from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from sqlalchemy.orm import Session

from config.database import get_db
from core.security import get_current_user, get_current_doctor, get_current_user_or_doctor
from models.user import User
from models.doctor import Doctor
from schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate,
)
from services.appointment_service import AppointmentService
from api.dependencies import get_appointment_service
from core.exceptions import NotFoundError, ValidationError

router = APIRouter()


@router.post(
    "/",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_appointment(
    appointment_data: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    appointment_service: AppointmentService = Depends(get_appointment_service),
):
    """Create a new appointment - supports slot-based or manual booking"""
    try:
        appointment = appointment_service.create_appointment(
            patient_id=current_user.id,
            doctor_id=appointment_data.doctor_id,
            appointment_date=appointment_data.appointment_date,
            appointment_time=appointment_data.appointment_time,
            slot_id=appointment_data.slot_id,
            encounter_id=appointment_data.encounter_id,  # Link encounter
            reason=appointment_data.reason,
            symptoms=appointment_data.symptoms,
            appointment_type=appointment_data.appointment_type,
        )
        return appointment

    except (NotFoundError, ValidationError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e.detail)
        )


@router.get("/my-appointments", response_model=List[AppointmentResponse])
async def get_my_appointments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    appointment_service: AppointmentService = Depends(get_appointment_service),
):
    """Get current user's appointments"""
    appointments = appointment_service.get_patient_appointments(
        current_user.id, skip, limit
    )

    if status_filter:
        appointments = [
            apt for apt in appointments if apt.status == status_filter
        ]

    return appointments


@router.get("/doctor/appointments", response_model=List[AppointmentResponse])
async def get_doctor_appointments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    status_filter: Optional[str] = None,
    current_doctor: Doctor = Depends(get_current_doctor),
    appointment_service: AppointmentService = Depends(get_appointment_service),
    db: Session = Depends(get_db),
):
    """Get current doctor's appointments with patient information"""
    from repositories.user import UserRepository
    
    appointments = appointment_service.get_doctor_appointments(
        current_doctor.id, skip, limit
    )

    if status_filter:
        appointments = [
            apt for apt in appointments if apt.status == status_filter
        ]
    
    # Enrich appointments with patient information
    user_repo = UserRepository(db)
    enriched_appointments = []
    
    for apt in appointments:
        apt_dict = apt.__dict__.copy()
        
        # Get patient information
        patient = user_repo.get(apt.patient_id)
        if patient:
            apt_dict['patient_name'] = patient.full_name
            apt_dict['patient_email'] = patient.email
        else:
            apt_dict['patient_name'] = 'Unknown Patient'
            apt_dict['patient_email'] = ''
        
        # Add doctor name
        apt_dict['doctor_name'] = current_doctor.full_name
        
        enriched_appointments.append(AppointmentResponse(**apt_dict))

    return enriched_appointments


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: str,
    current_user: User = Depends(get_current_user),
    appointment_service: AppointmentService = Depends(get_appointment_service),
    db: Session = Depends(get_db),
):
    """Get appointment by ID"""
    from repositories.appointment import AppointmentRepository

    appointment_repo = AppointmentRepository(db)
    appointment = appointment_repo.get(appointment_id)

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )

    # Verify user has access to this appointment
    if appointment.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )

    return appointment


@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: str,
    update_data: AppointmentUpdate,
    current_user = Depends(get_current_user_or_doctor),
    appointment_service: AppointmentService = Depends(get_appointment_service),
    db: Session = Depends(get_db),
):
    """Update appointment (Patient or Doctor)"""
    from repositories.appointment import AppointmentRepository

    appointment_repo = AppointmentRepository(db)
    appointment = appointment_repo.get(appointment_id)

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )

    # Allow both patient and doctor to update
    user_role = getattr(current_user, 'role', None)
    if user_role == 'doctor':
        if appointment.doctor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
            )
    elif user_role == 'patient':
        if appointment.patient_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )

    update_dict = update_data.model_dump(exclude_unset=True)
    updated_appointment = appointment_service.update_appointment(
        appointment_id, update_dict
    )

    return updated_appointment


@router.post("/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: str,
    cancellation_reason: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    appointment_service: AppointmentService = Depends(get_appointment_service),
    db: Session = Depends(get_db),
):
    """Cancel an appointment"""
    from repositories.appointment import AppointmentRepository

    appointment_repo = AppointmentRepository(db)
    appointment = appointment_repo.get(appointment_id)

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )

    if appointment.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )

    appointment_service.cancel_appointment(appointment_id, cancellation_reason)

    return {"message": "Appointment cancelled successfully"}


@router.post("/{appointment_id}/complete")
async def complete_appointment(
    appointment_id: str,
    doctor_notes: Optional[str] = None,
    diagnosis: Optional[str] = None,
    prescription: Optional[str] = None,
    follow_up_date: Optional[str] = None,
    follow_up_required: str = "no",
    current_doctor: Doctor = Depends(get_current_doctor),
    appointment_service: AppointmentService = Depends(get_appointment_service),
    db: Session = Depends(get_db),
):
    """Complete an appointment (Doctor only)"""
    from repositories.appointment import AppointmentRepository

    appointment_repo = AppointmentRepository(db)
    appointment = appointment_repo.get(appointment_id)

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )

    if appointment.doctor_id != current_doctor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )

    appointment_service.complete_appointment(
        appointment_id,
        doctor_notes,
        diagnosis,
        prescription,
        follow_up_date,
        follow_up_required,
    )

    return {"message": "Appointment completed successfully"}


@router.post("/{appointment_id}/confirm")
async def confirm_appointment(
    appointment_id: str,
    current_doctor: Doctor = Depends(get_current_doctor),
    appointment_service: AppointmentService = Depends(get_appointment_service),
    db: Session = Depends(get_db),
):
    """Confirm an appointment (Doctor only)"""
    from repositories.appointment import AppointmentRepository

    appointment_repo = AppointmentRepository(db)
    appointment = appointment_repo.get(appointment_id)

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )

    if appointment.doctor_id != current_doctor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )

    appointment_service.confirm_appointment(appointment_id)

    return {"message": "Appointment confirmed successfully"}


@router.delete("/{appointment_id}")
async def delete_appointment(
    appointment_id: str,
    current_user = Depends(get_current_user_or_doctor),
    appointment_service: AppointmentService = Depends(get_appointment_service),
    db: Session = Depends(get_db),
):
    """Delete an appointment (Patient or Doctor)"""
    from repositories.appointment import AppointmentRepository

    appointment_repo = AppointmentRepository(db)
    appointment = appointment_repo.get(appointment_id)

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )

    # Allow both patient and doctor to delete
    user_role = getattr(current_user, 'role', None)
    if user_role == 'doctor':
        if appointment.doctor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
            )
    elif user_role == 'patient':
        if appointment.patient_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )

    # If this appointment has a linked time slot, unbook it first
    if appointment.slot_id:
        from repositories.schedule import TimeSlotRepository
        slot_repo = TimeSlotRepository(db)
        slot_repo.unbook_slot(appointment.slot_id)
    
    # Also check if any time slot is directly referencing this appointment
    # (in case slot_id is not set on appointment but appointment_id is set on slot)
    from repositories.schedule import TimeSlotRepository
    slot_repo = TimeSlotRepository(db)
    linked_slot = slot_repo.get_by_appointment(appointment_id)
    if linked_slot:
        slot_repo.unbook_slot(linked_slot.id)

    # Delete the appointment
    appointment_repo.delete(appointment_id)

    return {"message": "Appointment deleted successfully"}
