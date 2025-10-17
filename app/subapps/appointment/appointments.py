from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
from ..login_verification.auth import get_current_user

router = APIRouter(prefix="/appointments", tags=["appointments"])

# Import doctors_db from doctor_auth to use registered doctors
from ..doctor.doctor_auth import doctors_db as registered_doctors_db

# In-memory storage
appointments_db = {}

# Static doctors for demo (will be replaced by registered doctors)
static_doctors_db = {
    "dr_sharma": {
        "id": "dr_sharma",
        "name": "Dr. Raj Sharma",
        "specialty": "General Physician",
        "experience": "15 years",
        "rating": 4.8,
        "available_slots": [],
        "is_available": True
    },
    "dr_patel": {
        "id": "dr_patel",
        "name": "Dr. Priya Patel",
        "specialty": "Cardiologist",
        "experience": "12 years",
        "rating": 4.9,
        "available_slots": [],
        "is_available": True
    },
    "dr_kumar": {
        "id": "dr_kumar",
        "name": "Dr. Arun Kumar",
        "specialty": "Pediatrician",
        "experience": "10 years",
        "rating": 4.7,
        "available_slots": [],
        "is_available": True
    },
    "dr_singh": {
        "id": "dr_singh",
        "name": "Dr. Meera Singh",
        "specialty": "Orthopedic",
        "experience": "18 years",
        "rating": 4.6,
        "available_slots": [],
        "is_available": True
    }
}

def get_all_doctors():
    """Get combined list of static and registered doctors"""
    all_doctors = {}
    
    # Add static doctors
    all_doctors.update(static_doctors_db)
    
    # Add registered doctors
    for email, doctor in registered_doctors_db.items():
        doctor_id = f"doc_{email.replace('@', '_').replace('.', '_')}"
        all_doctors[doctor_id] = {
            "id": doctor_id,
            "email": email,
            "name": doctor.get("full_name", "Dr. Unknown"),
            "specialty": doctor.get("specialization", "General"),
            "experience": f"{doctor.get('years_of_experience', 0)} years",
            "rating": doctor.get("rating", 4.5),
            "license_number": doctor.get("license_number", ""),
            "is_available": doctor.get("is_available", True),
            "weekly_schedule": doctor.get("weekly_schedule", {}),
            "max_patients_per_day": doctor.get("max_patients_per_day", 20),
            "available_slots": []
        }
    
    return all_doctors

# Pydantic models
class AppointmentCreate(BaseModel):
    doctor_id: str
    appointment_date: str
    appointment_time: str
    reason: str
    symptoms: Optional[str] = None
    appointment_type: str = "in-person"  # in-person, video, phone

class AppointmentUpdate(BaseModel):
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    reason: Optional[str] = None
    status: Optional[str] = None

class AppointmentResponse(BaseModel):
    appointment_id: str
    doctor_name: str
    doctor_specialty: str
    appointment_date: str
    appointment_time: str
    reason: str
    status: str
    appointment_type: str
    confirmation_code: str

# Helper functions
def generate_confirmation_code():
    """Generate a unique confirmation code"""
    return f"MD{uuid.uuid4().hex[:8].upper()}"

def generate_available_slots(doctor_id: str):
    """Generate available appointment slots for the next 7 days"""
    slots = []
    base_date = datetime.now()
    
    for days_ahead in range(1, 8):
        date = base_date + timedelta(days=days_ahead)
        
        # Skip weekends
        if date.weekday() in [5, 6]:
            continue
        
        # Generate time slots (9 AM to 5 PM)
        for hour in range(9, 17):
            for minute in [0, 30]:
                slot_time = f"{hour:02d}:{minute:02d}"
                slots.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "time": slot_time,
                    "available": True
                })
    
    return slots

# API Routes
@router.get("/doctors")
async def get_doctors(available_only: bool = False):
    """Get list of available doctors"""
    doctors_db = get_all_doctors()
    doctors_list = []
    
    for doctor_id, doctor_info in doctors_db.items():
        # Filter by availability if requested
        if available_only and not doctor_info.get("is_available", True):
            continue
            
        doctor_data = doctor_info.copy()
        # Generate available slots if not present
        if not doctor_data["available_slots"]:
            doctor_data["available_slots"] = generate_available_slots(doctor_id)[:10]  # Show next 10 slots
        doctors_list.append(doctor_data)
    
    return {"doctors": doctors_list}

@router.get("/doctors/{doctor_id}/slots")
async def get_doctor_slots(doctor_id: str):
    """Get available appointment slots for a specific doctor"""
    doctors_db = get_all_doctors()
    
    if doctor_id not in doctors_db:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Check if doctor is available
    if not doctors_db[doctor_id].get("is_available", True):
        raise HTTPException(status_code=400, detail="Doctor is currently unavailable")
    
    slots = generate_available_slots(doctor_id)
    
    return {
        "doctor": doctors_db[doctor_id]["name"],
        "specialty": doctors_db[doctor_id]["specialty"],
        "available_slots": slots
    }

@router.post("/book")
async def book_appointment(
    appointment: AppointmentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Book a new appointment"""
    email = current_user["email"]
    doctors_db = get_all_doctors()
    
    # Validate doctor
    if appointment.doctor_id not in doctors_db:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Check if doctor is available
    if not doctors_db[appointment.doctor_id].get("is_available", True):
        raise HTTPException(status_code=400, detail="Doctor is currently unavailable for appointments")
    
    # Generate appointment ID and confirmation code
    appointment_id = str(uuid.uuid4())
    confirmation_code = generate_confirmation_code()
    
    # Create appointment record
    appointment_data = {
        "appointment_id": appointment_id,
        "patient_email": email,
        "patient_name": current_user["full_name"],
        "doctor_id": appointment.doctor_id,
        "doctor_name": doctors_db[appointment.doctor_id]["name"],
        "doctor_specialty": doctors_db[appointment.doctor_id]["specialty"],
        "appointment_date": appointment.appointment_date,
        "appointment_time": appointment.appointment_time,
        "reason": appointment.reason,
        "symptoms": appointment.symptoms,
        "appointment_type": appointment.appointment_type,
        "status": "confirmed",
        "confirmation_code": confirmation_code,
        "created_at": datetime.utcnow().isoformat()
    }
    
    # Store appointment
    if email not in appointments_db:
        appointments_db[email] = []
    appointments_db[email].append(appointment_data)
    
    return AppointmentResponse(
        appointment_id=appointment_id,
        doctor_name=appointment_data["doctor_name"],
        doctor_specialty=appointment_data["doctor_specialty"],
        appointment_date=appointment_data["appointment_date"],
        appointment_time=appointment_data["appointment_time"],
        reason=appointment_data["reason"],
        status=appointment_data["status"],
        appointment_type=appointment_data["appointment_type"],
        confirmation_code=confirmation_code
    )

@router.get("/my-appointments")
async def get_my_appointments(current_user: dict = Depends(get_current_user)):
    """Get user's appointments"""
    email = current_user["email"]
    
    user_appointments = appointments_db.get(email, [])
    
    # Sort by date and time
    user_appointments.sort(
        key=lambda x: (x["appointment_date"], x["appointment_time"]),
        reverse=True
    )
    
    return {"appointments": user_appointments}

@router.get("/appointment/{appointment_id}")
async def get_appointment_details(
    appointment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific appointment details"""
    email = current_user["email"]
    
    user_appointments = appointments_db.get(email, [])
    
    for apt in user_appointments:
        if apt["appointment_id"] == appointment_id:
            return apt
    
    raise HTTPException(status_code=404, detail="Appointment not found")

@router.put("/appointment/{appointment_id}")
async def update_appointment(
    appointment_id: str,
    update_data: AppointmentUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an appointment"""
    email = current_user["email"]
    
    user_appointments = appointments_db.get(email, [])
    
    for apt in user_appointments:
        if apt["appointment_id"] == appointment_id:
            # Update fields if provided
            if update_data.appointment_date:
                apt["appointment_date"] = update_data.appointment_date
            if update_data.appointment_time:
                apt["appointment_time"] = update_data.appointment_time
            if update_data.reason:
                apt["reason"] = update_data.reason
            if update_data.status:
                apt["status"] = update_data.status
            
            apt["updated_at"] = datetime.utcnow().isoformat()
            
            return {
                "message": "Appointment updated successfully",
                "appointment": apt
            }
    
    raise HTTPException(status_code=404, detail="Appointment not found")

@router.delete("/appointment/{appointment_id}")
async def cancel_appointment(
    appointment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cancel an appointment"""
    email = current_user["email"]
    
    user_appointments = appointments_db.get(email, [])
    
    for i, apt in enumerate(user_appointments):
        if apt["appointment_id"] == appointment_id:
            apt["status"] = "cancelled"
            apt["cancelled_at"] = datetime.utcnow().isoformat()
            
            return {
                "message": "Appointment cancelled successfully",
                "appointment_id": appointment_id
            }
    
    raise HTTPException(status_code=404, detail="Appointment not found")

# app/subapps/__init__.py
"""Subapps initialization"""
