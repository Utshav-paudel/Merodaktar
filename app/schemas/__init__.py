from .user import UserCreate, UserLogin, UserResponse, UserUpdate
from .doctor import DoctorCreate, DoctorLogin, DoctorResponse, DoctorUpdate
from .appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate,
)
from .consultation import (
    ConsultationCreate,
    ConsultationResponse,
    MessageCreate,
)
from .ehr import EHRCreate, EHRResponse, EHRUpdate

__all__ = [
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "UserUpdate",
    "DoctorCreate",
    "DoctorLogin",
    "DoctorResponse",
    "DoctorUpdate",
    "AppointmentCreate",
    "AppointmentResponse",
    "AppointmentUpdate",
    "ConsultationCreate",
    "ConsultationResponse",
    "MessageCreate",
    "EHRCreate",
    "EHRResponse",
    "EHRUpdate",
]
