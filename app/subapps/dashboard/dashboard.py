from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import random
from ..login_verification.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# In-memory storage
patient_records = {}
health_metrics = {}
notifications = {}

# Pydantic models
class HealthMetrics(BaseModel):
    blood_pressure: Optional[str] = None
    heart_rate: Optional[int] = None
    weight: Optional[float] = None
    temperature: Optional[float] = None
    blood_sugar: Optional[int] = None
    recorded_at: Optional[str] = None

class DashboardSummary(BaseModel):
    total_consultations: int
    upcoming_appointments: int
    unread_notifications: int
    health_score: int
    recent_activity: List[dict]

class Notification(BaseModel):
    id: str
    type: str  # appointment_reminder, test_result, medication_reminder
    title: str
    message: str
    created_at: str
    read: bool = False

# API Routes
@router.get("/summary")
async def get_dashboard_summary(current_user: dict = Depends(get_current_user)):
    """Get comprehensive dashboard summary for the user"""
    email = current_user["email"]
    
    # Get user's records
    user_records = patient_records.get(email, [])
    
    # Calculate statistics
    total_consultations = len(user_records)
    
    # Mock upcoming appointments (in production, fetch from appointments service)
    upcoming_appointments = random.randint(0, 3)
    
    # Get unread notifications
    user_notifications = notifications.get(email, [])
    unread_count = sum(1 for n in user_notifications if not n.get("read", False))
    
    # Calculate health score (mock algorithm)
    health_score = random.randint(70, 95)
    
    # Get recent activity
    recent_activity = []
    for record in user_records[-5:]:
        recent_activity.append({
            "type": "consultation",
            "description": f"Medical consultation",
            "date": record.get("consultation_date", datetime.utcnow().isoformat()),
            "status": "completed"
        })
    
    return DashboardSummary(
        total_consultations=total_consultations,
        upcoming_appointments=upcoming_appointments,
        unread_notifications=unread_count,
        health_score=health_score,
        recent_activity=recent_activity
    )

@router.get("/health-metrics")
async def get_health_metrics(current_user: dict = Depends(get_current_user)):
    """Get user's health metrics"""
    email = current_user["email"]
    
    metrics = health_metrics.get(email, {})
    
    if not metrics:
        # Return mock data if no metrics recorded
        metrics = {
            "blood_pressure": "120/80",
            "heart_rate": 72,
            "weight": 70.5,
            "temperature": 98.6,
            "blood_sugar": 95,
            "recorded_at": datetime.utcnow().isoformat()
        }
    
    return metrics

@router.post("/health-metrics")
async def update_health_metrics(
    metrics: HealthMetrics,
    current_user: dict = Depends(get_current_user)
):
    """Update user's health metrics"""
    email = current_user["email"]
    
    metrics_data = metrics.dict()
    metrics_data["recorded_at"] = datetime.utcnow().isoformat()
    
    health_metrics[email] = metrics_data
    
    return {
        "message": "Health metrics updated successfully",
        "metrics": metrics_data
    }

@router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    """Get user's notifications"""
    email = current_user["email"]
    
    user_notifications = notifications.get(email, [])
    
    if not user_notifications:
        # Create sample notifications
        user_notifications = [
            {
                "id": "1",
                "type": "appointment_reminder",
                "title": "Upcoming Appointment",
                "message": "You have an appointment tomorrow at 10:00 AM",
                "created_at": datetime.utcnow().isoformat(),
                "read": False
            },
            {
                "id": "2",
                "type": "medication_reminder",
                "title": "Medication Reminder",
                "message": "Time to take your evening medication",
                "created_at": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
                "read": False
            }
        ]
        notifications[email] = user_notifications
    
    return user_notifications

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a notification as read"""
    email = current_user["email"]
    
    user_notifications = notifications.get(email, [])
    
    for notif in user_notifications:
        if notif["id"] == notification_id:
            notif["read"] = True
            return {"message": "Notification marked as read"}
    
    raise HTTPException(status_code=404, detail="Notification not found")

@router.get("/consultation-history")
async def get_consultation_history(current_user: dict = Depends(get_current_user)):
    """Get user's consultation history"""
    email = current_user["email"]
    
    user_records = patient_records.get(email, [])
    
    # Format consultation history
    history = []
    for record in user_records:
        history.append({
            "id": record.get("record_id"),
            "date": record.get("consultation_date"),
            "symptoms": record.get("symptoms"),
            "urgency_level": record.get("urgency_level"),
            "ai_assessment": record.get("ai_assessment")[:200] + "..." if len(record.get("ai_assessment", "")) > 200 else record.get("ai_assessment"),
            "status": "completed"
        })
    
    return {"consultations": history}