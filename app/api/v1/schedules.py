from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
import uuid

from config.database import get_db
from core.security import get_current_doctor
from models.doctor import Doctor
from models.schedule import TimeSlot
from schemas.schedule import (
    DoctorScheduleCreate,
    DoctorScheduleUpdate,
    DoctorScheduleResponse,
    TimeSlotResponse,
    TimeSlotCreate,
    BulkScheduleCreate
)
from repositories.schedule import ScheduleRepository, TimeSlotRepository
from core.exceptions import NotFoundError

router = APIRouter()


# Doctor Schedule Management Endpoints
@router.get("/my-schedule", response_model=List[DoctorScheduleResponse])
async def get_my_schedule(
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    """Get current doctor's weekly schedule"""
    schedule_repo = ScheduleRepository(db)
    schedules = schedule_repo.get_by_doctor(current_doctor.id)
    return schedules


@router.post("/my-schedule", response_model=DoctorScheduleResponse)
async def create_schedule(
    schedule_data: DoctorScheduleCreate,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    """Create a new schedule entry"""
    schedule_repo = ScheduleRepository(db)
    
    # Check if schedule already exists for this day
    existing = schedule_repo.get_by_day(current_doctor.id, schedule_data.day_of_week)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Schedule already exists for day {schedule_data.day_of_week}"
        )
    
    schedule_dict = schedule_data.model_dump()
    schedule_dict['doctor_id'] = current_doctor.id
    
    # Map slot_duration_minutes to slot_duration for database
    if 'slot_duration_minutes' in schedule_dict:
        schedule_dict['slot_duration'] = schedule_dict.pop('slot_duration_minutes')
    
    schedule = schedule_repo.create(schedule_dict)
    return schedule


@router.post("/my-schedule/bulk", response_model=List[DoctorScheduleResponse])
async def create_bulk_schedule(
    bulk_data: BulkScheduleCreate,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    """Create multiple schedule entries at once"""
    schedule_repo = ScheduleRepository(db)
    
    # Delete existing schedules
    schedule_repo.delete_by_doctor(current_doctor.id)
    
    # Create new schedules
    created_schedules = []
    for schedule_data in bulk_data.schedules:
        schedule_dict = schedule_data.model_dump()
        schedule_dict['doctor_id'] = current_doctor.id
        schedule = schedule_repo.create(schedule_dict)
        created_schedules.append(schedule)
    
    return created_schedules


@router.put("/my-schedule/{schedule_id}", response_model=DoctorScheduleResponse)
async def update_schedule(
    schedule_id: str,
    schedule_update: DoctorScheduleUpdate,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    """Update a schedule entry"""
    schedule_repo = ScheduleRepository(db)
    
    schedule = schedule_repo.get(schedule_id)
    if not schedule or schedule.doctor_id != current_doctor.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    
    update_data = schedule_update.model_dump(exclude_unset=True)
    updated_schedule = schedule_repo.update(schedule_id, update_data)
    
    return updated_schedule


@router.delete("/my-schedule/{schedule_id}")
async def delete_schedule(
    schedule_id: str,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    """Delete a schedule entry"""
    schedule_repo = ScheduleRepository(db)
    
    schedule = schedule_repo.get(schedule_id)
    if not schedule or schedule.doctor_id != current_doctor.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    
    schedule_repo.delete(schedule_id)
    return {"message": "Schedule deleted successfully"}


# Time Slot Endpoints
@router.get("/doctor/{doctor_id}/slots", response_model=List[TimeSlotResponse])
async def get_doctor_slots(
    doctor_id: str,
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db),
):
    """Get available time slots for a doctor in a date range"""
    slot_repo = TimeSlotRepository(db)
    schedule_repo = ScheduleRepository(db)
    
    # Get doctor's schedules
    schedules = schedule_repo.get_by_doctor(doctor_id)
    if not schedules:
        return []
    
    # Generate slots from schedules
    all_slots = []
    current_date = start_date
    while current_date <= end_date:
        day_of_week = current_date.weekday()  # 0=Monday, 6=Sunday as per model
        
        day_schedule = schedule_repo.get_by_day(doctor_id, day_of_week)
        if day_schedule:
            # Generate slots for this day using the schedule object
            slots = slot_repo.generate_slots_from_schedule(
                day_schedule,  # Pass the schedule object
                str(current_date)  # Pass the date as string
            )
            all_slots.extend(slots)
        
        current_date += timedelta(days=1)
    
    # Check which slots are already booked by querying existing appointments
    # For each generated slot, check if there's a matching booked slot in the database
    result_slots = []
    for slot in all_slots:
        existing_slot = slot_repo.db.query(TimeSlot).filter(
            TimeSlot.doctor_id == doctor_id,
            TimeSlot.date == slot.date,
            TimeSlot.time == slot.time,
            TimeSlot.is_booked == True
        ).first()
        
        # Convert to dict for response with all required fields
        slot_dict = {
            "id": existing_slot.id if existing_slot else str(uuid.uuid4()),
            "doctor_id": slot.doctor_id,
            "date": slot.date,
            "time": slot.time,
            "duration": slot.duration,
            "is_booked": existing_slot is not None,
            "appointment_id": existing_slot.appointment_id if existing_slot else None,
            "created_at": existing_slot.created_at if existing_slot else datetime.utcnow()
        }
        result_slots.append(slot_dict)
    
    return result_slots


@router.post("/doctor/{doctor_id}/slots/generate")
async def generate_slots(
    doctor_id: str,
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    """Generate time slots for doctor based on schedule (doctor only)"""
    if current_doctor.id != doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only generate slots for yourself"
        )
    
    slot_repo = TimeSlotRepository(db)
    schedule_repo = ScheduleRepository(db)
    
    schedules = schedule_repo.get_by_doctor(doctor_id)
    if not schedules:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No schedule found. Please create your schedule first."
        )
    
    # Delete existing slots in date range
    slot_repo.delete_by_doctor_and_date_range(doctor_id, start_date, end_date)
    
    # Generate new slots
    slots_created = 0
    current_date = start_date
    while current_date <= end_date:
        day_of_week = (current_date.weekday() + 1) % 7
        
        day_schedule = schedule_repo.get_by_day(doctor_id, day_of_week)
        if day_schedule:
            slots = slot_repo.generate_slots_from_schedule(
                day_schedule,  # Pass the schedule object
                str(current_date)  # Pass the date as string
            )
            slots_created += len(slots)
        
        current_date += timedelta(days=1)
    
    return {
        "message": f"Generated {slots_created} time slots",
        "slots_created": slots_created,
        "start_date": start_date,
        "end_date": end_date
    }
