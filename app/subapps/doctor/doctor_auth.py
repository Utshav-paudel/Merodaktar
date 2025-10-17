# app/subapps/doctor/doctor_auth.py
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import uuid

router = APIRouter(prefix="/doctor", tags=["doctor"])

# Security configuration
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours for doctors

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/doctor/token")

# In-memory storage (replace with database)
doctors_db = {}

# Pydantic models
class DoctorRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    specialization: str
    license_number: str
    years_of_experience: int
    education: str
    bio: Optional[str] = None

class DoctorProfile(BaseModel):
    email: str
    full_name: str
    phone: str
    specialization: str
    license_number: str
    years_of_experience: int
    education: str
    bio: Optional[str] = None
    rating: float = 0.0
    total_patients: int = 0
    available_slots: List[dict] = []

class Token(BaseModel):
    access_token: str
    token_type: str
    doctor_info: dict

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "doctor"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_doctor(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if email is None or token_type != "doctor":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    doctor = doctors_db.get(email)
    if doctor is None:
        raise credentials_exception
    return doctor

# API Routes
@router.post("/register")
async def register_doctor(doctor: DoctorRegister):
    """Register a new doctor"""
    print(f"=== DOCTOR REGISTRATION ===")
    print(f"Email: {doctor.email}")
    print(f"Specialization: {doctor.specialization}")
    
    if doctor.email in doctors_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(doctor.password)
    doctor_data = {
        "email": doctor.email,
        "hashed_password": hashed_password,
        "full_name": doctor.full_name,
        "phone": doctor.phone,
        "specialization": doctor.specialization,
        "license_number": doctor.license_number,
        "years_of_experience": doctor.years_of_experience,
        "education": doctor.education,
        "bio": doctor.bio,
        "rating": 4.5,  # Default rating
        "total_patients": 0,
        "created_at": datetime.utcnow().isoformat(),
        "status": "active"
    }
    
    doctors_db[doctor.email] = doctor_data
    print(f"Doctor {doctor.email} registered successfully")
    
    return {
        "message": "Doctor registered successfully",
        "doctor": {
            "email": doctor.email,
            "full_name": doctor.full_name,
            "specialization": doctor.specialization
        }
    }

@router.post("/token", response_model=Token)
async def login_doctor(form_data: OAuth2PasswordRequestForm = Depends()):
    """Doctor login"""
    print(f"=== DOCTOR LOGIN ATTEMPT ===")
    print(f"Username: {form_data.username}")
    
    doctor = doctors_db.get(form_data.username)
    if not doctor or not verify_password(form_data.password, doctor["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": doctor["email"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "doctor_info": {
            "email": doctor["email"],
            "full_name": doctor["full_name"],
            "specialization": doctor["specialization"],
            "license_number": doctor["license_number"]
        }
    }

@router.get("/profile", response_model=DoctorProfile)
async def get_doctor_profile(current_doctor: dict = Depends(get_current_doctor)):
    """Get current doctor's profile"""
    return DoctorProfile(
        email=current_doctor["email"],
        full_name=current_doctor["full_name"],
        phone=current_doctor["phone"],
        specialization=current_doctor["specialization"],
        license_number=current_doctor["license_number"],
        years_of_experience=current_doctor["years_of_experience"],
        education=current_doctor["education"],
        bio=current_doctor.get("bio"),
        rating=current_doctor.get("rating", 0.0),
        total_patients=current_doctor.get("total_patients", 0)
    )

@router.put("/profile")
async def update_doctor_profile(
    profile_update: dict,
    current_doctor: dict = Depends(get_current_doctor)
):
    """Update doctor profile"""
    email = current_doctor["email"]
    
    # Update allowed fields
    allowed_fields = ["full_name", "phone", "specialization", "education", "bio"]
    for field in allowed_fields:
        if field in profile_update:
            doctors_db[email][field] = profile_update[field]
    
    return {"message": "Profile updated successfully"}

@router.get("/debug/doctors")
async def debug_doctors():
    """Debug endpoint to see all doctors"""
    return {
        "doctors": [
            {
                "email": email,
                "full_name": doctor["full_name"],
                "specialization": doctor["specialization"]
            }
            for email, doctor in doctors_db.items()
        ],
        "total": len(doctors_db)
    }

@router.put("/availability")
async def update_availability(
    availability: dict,
    current_doctor: dict = Depends(get_current_doctor)
):
    """Update doctor availability status"""
    email = current_doctor["email"]
    doctors_db[email]["is_available"] = availability.get("is_available", True)
    doctors_db[email]["availability_note"] = availability.get("note", "")
    
    return {
        "message": "Availability updated successfully",
        "is_available": doctors_db[email]["is_available"]
    }

@router.post("/schedule")
async def set_schedule(
    schedule: dict,
    current_doctor: dict = Depends(get_current_doctor)
):
    """Set doctor's weekly schedule"""
    email = current_doctor["email"]
    
    # Schedule format: {"monday": ["09:00-12:00", "14:00-17:00"], "tuesday": [...], ...}
    doctors_db[email]["weekly_schedule"] = schedule.get("schedule", {})
    doctors_db[email]["break_time"] = schedule.get("break_time", "12:00-14:00")
    doctors_db[email]["max_patients_per_day"] = schedule.get("max_patients_per_day", 20)
    
    return {
        "message": "Schedule updated successfully",
        "schedule": doctors_db[email]["weekly_schedule"]
    }

@router.get("/schedule")
async def get_schedule(current_doctor: dict = Depends(get_current_doctor)):
    """Get doctor's schedule"""
    email = current_doctor["email"]
    return {
        "weekly_schedule": doctors_db[email].get("weekly_schedule", {}),
        "break_time": doctors_db[email].get("break_time", "12:00-14:00"),
        "max_patients_per_day": doctors_db[email].get("max_patients_per_day", 20),
        "is_available": doctors_db[email].get("is_available", True)
    }
