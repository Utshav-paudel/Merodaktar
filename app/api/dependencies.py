from fastapi import Depends
from sqlalchemy.orm import Session

from config.database import get_db
from services.redis_service import RedisService
from services.auth_service import AuthService
from services.chat_service import ChatService
from services.appointment_service import AppointmentService
from services.ehr_service import EHRService


def get_redis_service() -> RedisService:
    """Get Redis service instance"""
    return RedisService()


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    """Get Auth service instance"""
    return AuthService(db)


def get_chat_service(
    db: Session = Depends(get_db),
    redis: RedisService = Depends(get_redis_service),
) -> ChatService:
    """Get Chat service instance"""
    return ChatService(db, redis)


def get_appointment_service(
    db: Session = Depends(get_db),
) -> AppointmentService:
    """Get Appointment service instance"""
    return AppointmentService(db)


def get_ehr_service(db: Session = Depends(get_db)) -> EHRService:
    """Get EHR service instance"""
    return EHRService(db)
