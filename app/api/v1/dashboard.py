from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from config.database import get_db
from core.security import get_current_user, get_current_doctor
from models.user import User
from models.doctor import Doctor
from models.appointment import Appointment
from models.consultation import Consultation

router = APIRouter()


@router.get("/patient/stats")
async def get_patient_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get patient dashboard statistics"""

    # Total appointments
    total_appointments = (
        db.query(func.count(Appointment.id))
        .filter(Appointment.patient_id == current_user.id)
        .scalar()
    )

    # Upcoming appointments
    upcoming = (
        db.query(func.count(Appointment.id))
        .filter(
            Appointment.patient_id == current_user.id,
            Appointment.status.in_(["scheduled", "confirmed"]),
        )
        .scalar()
    )

    # Completed appointments
    completed = (
        db.query(func.count(Appointment.id))
        .filter(
            Appointment.patient_id == current_user.id,
            Appointment.status == "completed",
        )
        .scalar()
    )

    # Total consultations
    total_consultations = (
        db.query(func.count(Consultation.id))
        .filter(Consultation.patient_id == current_user.id)
        .scalar()
    )

    # Recent appointments
    recent_appointments = (
        db.query(Appointment)
        .filter(Appointment.patient_id == current_user.id)
        .order_by(Appointment.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "total_appointments": total_appointments,
        "upcoming_appointments": upcoming,
        "completed_appointments": completed,
        "total_consultations": total_consultations,
        "recent_appointments": [
            {
                "id": apt.id,
                "doctor_id": apt.doctor_id,
                "date": apt.appointment_date,
                "time": apt.appointment_time,
                "status": apt.status,
            }
            for apt in recent_appointments
        ],
    }


@router.get("/doctor/stats")
async def get_doctor_dashboard_stats(
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    """Get doctor dashboard statistics"""

    # Total appointments
    total_appointments = (
        db.query(func.count(Appointment.id))
        .filter(Appointment.doctor_id == current_doctor.id)
        .scalar()
    )

    # Today's appointments
    today = datetime.now().strftime("%Y-%m-%d")
    today_appointments = (
        db.query(func.count(Appointment.id))
        .filter(
            Appointment.doctor_id == current_doctor.id,
            Appointment.appointment_date == today,
        )
        .scalar()
    )

    # Pending appointments
    pending = (
        db.query(func.count(Appointment.id))
        .filter(
            Appointment.doctor_id == current_doctor.id,
            Appointment.status == "scheduled",
        )
        .scalar()
    )

    # Completed appointments
    completed = (
        db.query(func.count(Appointment.id))
        .filter(
            Appointment.doctor_id == current_doctor.id,
            Appointment.status == "completed",
        )
        .scalar()
    )

    # Recent appointments
    recent_appointments = (
        db.query(Appointment)
        .filter(Appointment.doctor_id == current_doctor.id)
        .order_by(Appointment.created_at.desc())
        .limit(10)
        .all()
    )

    # This week's appointments
    week_start = (
        datetime.now() - timedelta(days=datetime.now().weekday())
    ).strftime("%Y-%m-%d")
    week_appointments = (
        db.query(func.count(Appointment.id))
        .filter(
            Appointment.doctor_id == current_doctor.id,
            Appointment.appointment_date >= week_start,
        )
        .scalar()
    )

    return {
        "total_appointments": total_appointments,
        "today_appointments": today_appointments,
        "pending_appointments": pending,
        "completed_appointments": completed,
        "week_appointments": week_appointments,
        "total_consultations": current_doctor.total_consultations,
        "rating": current_doctor.rating,
        "is_available": current_doctor.is_available,
        "recent_appointments": [
            {
                "id": apt.id,
                "patient_id": apt.patient_id,
                "date": apt.appointment_date,
                "time": apt.appointment_time,
                "status": apt.status,
                "reason": apt.reason,
            }
            for apt in recent_appointments
        ],
    }
