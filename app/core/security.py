from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from config.database import get_db
from services.auth_service import AuthService
from repositories.user import UserRepository
from repositories.doctor import DoctorRepository
from models.user import User
from models.doctor import Doctor

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials
    auth_service = AuthService(db)

    try:
        payload = auth_service.decode_token(token)
        user_id = payload.get("sub")
        role = payload.get("role")

        if not user_id or role != "user":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )

        user_repo = UserRepository(db)
        user = user_repo.get(user_id)

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        return user

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


async def get_current_doctor(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Doctor:
    """Get current authenticated doctor"""
    token = credentials.credentials
    auth_service = AuthService(db)

    try:
        payload = auth_service.decode_token(token)
        doctor_id = payload.get("sub")
        role = payload.get("role")

        if not doctor_id or role != "doctor":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )

        doctor_repo = DoctorRepository(db)
        doctor = doctor_repo.get(doctor_id)

        if not doctor or not doctor.is_verified:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Doctor not found or not verified",
            )

        return doctor

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


async def get_current_user_or_doctor(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """Get current authenticated user or doctor (for endpoints that accept both)"""
    token = credentials.credentials
    auth_service = AuthService(db)

    try:
        payload = auth_service.decode_token(token)
        user_id = payload.get("sub")
        role = payload.get("role")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )

        if role == "doctor":
            doctor_repo = DoctorRepository(db)
            doctor = doctor_repo.get(user_id)
            if not doctor or not doctor.is_verified:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Doctor not found or not verified",
                )
            # Add role attribute to doctor object for consistency
            doctor.role = "doctor"
            return doctor
        elif role == "user":
            user_repo = UserRepository(db)
            user = user_repo.get(user_id)
            if not user or not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found or inactive",
                )
            # Add role attribute to user object for consistency
            user.role = "patient"
            return user
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid role",
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure user is active"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user"
        )
    return current_user
