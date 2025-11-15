from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from config.database import get_db
from schemas.user import UserCreate, UserLogin, TokenResponse
from schemas.doctor import (
    DoctorCreate,
    DoctorLogin,
    DoctorTokenResponse,
    DoctorRegistrationResponse,
)
from services.auth_service import AuthService
from api.dependencies import get_auth_service
from core.exceptions import AuthenticationError, ValidationError

router = APIRouter()


@router.post(
    "/register/user",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_user(
    user_data: UserCreate,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Register a new user"""
    try:
        user = auth_service.register_user(
            email=user_data.email,
            password=user_data.password,
            full_name=user_data.full_name,
            phone=user_data.phone,
            date_of_birth=user_data.date_of_birth,
            gender=user_data.gender,
        )

        # Authenticate and return tokens
        user, access_token, refresh_token = auth_service.authenticate_user(
            user_data.email, user_data.password
        )

        return TokenResponse(
            access_token=access_token, refresh_token=refresh_token, user=user
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e.detail)
        )


@router.post("/login/user", response_model=TokenResponse)
async def login_user(
    credentials: UserLogin,
    auth_service: AuthService = Depends(get_auth_service),
):
    """User login"""
    try:
        user, access_token, refresh_token = auth_service.authenticate_user(
            credentials.email, credentials.password
        )

        return TokenResponse(
            access_token=access_token, refresh_token=refresh_token, user=user
        )

    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e.detail)
        )


@router.post(
    "/register/doctor",
    response_model=DoctorRegistrationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_doctor(
    doctor_data: DoctorCreate,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Register a new doctor"""
    try:
        doctor = auth_service.register_doctor(
            email=doctor_data.email,
            password=doctor_data.password,
            full_name=doctor_data.full_name,
            specialization=doctor_data.specialization,
            license_number=doctor_data.license_number,
            phone=doctor_data.phone,
            nmc_number=doctor_data.nmc_number,
            years_of_experience=doctor_data.years_of_experience,
            education=doctor_data.education,
            bio=doctor_data.bio,
        )

        # Note: Doctor needs verification before login
        return DoctorRegistrationResponse(
            message="Doctor registered successfully. Account pending verification.",
            doctor_id=doctor.id,
            email=doctor.email,
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e.detail)
        )


@router.post("/login/doctor", response_model=DoctorTokenResponse)
async def login_doctor(
    credentials: DoctorLogin,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Doctor login"""
    try:
        doctor, access_token, refresh_token = auth_service.authenticate_doctor(
            credentials.email, credentials.password
        )

        return DoctorTokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            doctor=doctor,
        )

    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e.detail)
        )


@router.post("/refresh")
async def refresh_token(
    refresh_token: str, auth_service: AuthService = Depends(get_auth_service)
):
    """Refresh access token"""
    try:
        new_access_token = auth_service.refresh_access_token(refresh_token)
        return {"access_token": new_access_token, "token_type": "bearer"}

    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e.detail)
        )
