# app/subapps/doctor/doctor_dashboard.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from .doctor_auth import get_current_doctor
from ..appointment.appointments import appointments_db

router = APIRouter(prefix="/doctor/dashboard", tags=["doctor_dashboard"])

# Pydantic models
class AppointmentInfo(BaseModel):
    appointment_id: str
    patient_name: str
    patient_email: str
    appointment_date: str
    appointment_time: str
    reason: str
    symptoms: Optional[str] = None
    status: str
    appointment_type: str

class DashboardStats(BaseModel):
    total_appointments: int
    today_appointments: int
    pending_appointments: int
    completed_appointments: int
    total_patients: int

class PatientNote(BaseModel):
    note: str
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    follow_up_date: Optional[str] = None

# API Routes
@router.get("/stats")
async def get_dashboard_stats(current_doctor: dict = Depends(get_current_doctor)):
    """Get doctor dashboard statistics"""
    doctor_email = current_doctor["email"]
    doctor_name = current_doctor["full_name"]
    
    # Get all appointments for this doctor
    all_doctor_appointments = []
    for patient_email, patient_appointments in appointments_db.items():
        for apt in patient_appointments:
            if apt.get("doctor_name") == doctor_name or apt.get("doctor_id") == doctor_email:
                all_doctor_appointments.append(apt)
    
    # Calculate stats
    today = datetime.now().date()
    today_appointments = sum(
        1 for apt in all_doctor_appointments 
        if apt.get("appointment_date") and datetime.fromisoformat(apt["appointment_date"]).date() == today
    )
    
    pending = sum(1 for apt in all_doctor_appointments if apt.get("status") == "confirmed")
    completed = sum(1 for apt in all_doctor_appointments if apt.get("status") == "completed")
    
    # Unique patients
    unique_patients = len(set(apt.get("patient_email") for apt in all_doctor_appointments))
    
    return DashboardStats(
        total_appointments=len(all_doctor_appointments),
        today_appointments=today_appointments,
        pending_appointments=pending,
        completed_appointments=completed,
        total_patients=unique_patients
    )

@router.get("/appointments")
async def get_doctor_appointments(
    current_doctor: dict = Depends(get_current_doctor),
    status: Optional[str] = None
):
    """Get all appointments for the doctor"""
    doctor_email = current_doctor["email"]
    doctor_name = current_doctor["full_name"]
    
    # Get all appointments for this doctor
    doctor_appointments = []
    for patient_email, patient_appointments in appointments_db.items():
        for apt in patient_appointments:
            if apt.get("doctor_name") == doctor_name or apt.get("doctor_id") == doctor_email:
                if status is None or apt.get("status") == status:
                    doctor_appointments.append(apt)
    
    # Sort by date and time
    doctor_appointments.sort(
        key=lambda x: (x.get("appointment_date", ""), x.get("appointment_time", "")),
        reverse=False
    )
    
    return {"appointments": doctor_appointments}

@router.get("/appointments/today")
async def get_today_appointments(current_doctor: dict = Depends(get_current_doctor)):
    """Get today's appointments"""
    doctor_email = current_doctor["email"]
    doctor_name = current_doctor["full_name"]
    today = datetime.now().date()
    
    today_appointments = []
    for patient_email, patient_appointments in appointments_db.items():
        for apt in patient_appointments:
            if (apt.get("doctor_name") == doctor_name or apt.get("doctor_id") == doctor_email):
                apt_date_str = apt.get("appointment_date")
                if apt_date_str:
                    try:
                        apt_date = datetime.fromisoformat(apt_date_str).date()
                        if apt_date == today:
                            today_appointments.append(apt)
                    except:
                        pass
    
    today_appointments.sort(key=lambda x: x.get("appointment_time", ""))
    
    return {"appointments": today_appointments}

@router.put("/appointments/{appointment_id}/notes")
async def add_appointment_notes(
    appointment_id: str,
    notes: PatientNote,
    current_doctor: dict = Depends(get_current_doctor)
):
    """Add medical notes to an appointment"""
    doctor_name = current_doctor["full_name"]
    
    # Find and update the appointment
    for patient_email, patient_appointments in appointments_db.items():
        for apt in patient_appointments:
            if apt.get("appointment_id") == appointment_id:
                if apt.get("doctor_name") != doctor_name and apt.get("doctor_id") != current_doctor["email"]:
                    raise HTTPException(status_code=403, detail="Not authorized to update this appointment")
                
                apt["doctor_notes"] = notes.note
                apt["diagnosis"] = notes.diagnosis
                apt["prescription"] = notes.prescription
                apt["follow_up_date"] = notes.follow_up_date
                apt["updated_at"] = datetime.utcnow().isoformat()
                apt["updated_by"] = doctor_name
                
                return {
                    "message": "Notes added successfully",
                    "appointment_id": appointment_id
                }
    
    raise HTTPException(status_code=404, detail="Appointment not found")

@router.put("/appointments/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: str,
    status: str,
    current_doctor: dict = Depends(get_current_doctor)
):
    """Update appointment status"""
    doctor_name = current_doctor["full_name"]
    
    valid_statuses = ["confirmed", "completed", "cancelled", "no-show"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # Find and update the appointment
    for patient_email, patient_appointments in appointments_db.items():
        for apt in patient_appointments:
            if apt.get("appointment_id") == appointment_id:
                if apt.get("doctor_name") != doctor_name and apt.get("doctor_id") != current_doctor["email"]:
                    raise HTTPException(status_code=403, detail="Not authorized to update this appointment")
                
                apt["status"] = status
                apt["updated_at"] = datetime.utcnow().isoformat()
                
                return {
                    "message": f"Appointment status updated to {status}",
                    "appointment_id": appointment_id
                }
    
    raise HTTPException(status_code=404, detail="Appointment not found")

@router.get("/patients")
async def get_doctor_patients(current_doctor: dict = Depends(get_current_doctor)):
    """Get list of all patients who have appointments with this doctor"""
    doctor_email = current_doctor["email"]
    doctor_name = current_doctor["full_name"]
    
    patients = {}
    for patient_email, patient_appointments in appointments_db.items():
        for apt in patient_appointments:
            if apt.get("doctor_name") == doctor_name or apt.get("doctor_id") == doctor_email:
                if patient_email not in patients:
                    patients[patient_email] = {
                        "email": patient_email,
                        "name": apt.get("patient_name", "Unknown"),
                        "total_appointments": 0,
                        "last_visit": None
                    }
                patients[patient_email]["total_appointments"] += 1
                apt_date = apt.get("appointment_date")
                if apt_date:
                    if patients[patient_email]["last_visit"] is None or apt_date > patients[patient_email]["last_visit"]:
                        patients[patient_email]["last_visit"] = apt_date
    
    return {"patients": list(patients.values())}
