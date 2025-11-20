from .user import UserRepository
from .doctor import DoctorRepository
from .appointment import AppointmentRepository
from .consultation import ConsultationRepository
from .ehr import EHRRepository
from .report import ReportRepository
from .encounter import EncounterRepository
from .schedule import ScheduleRepository, TimeSlotRepository

__all__ = [
    "UserRepository",
    "DoctorRepository",
    "AppointmentRepository",
    "ConsultationRepository",
    "EHRRepository",
    "ReportRepository",
    "EncounterRepository",
    "ScheduleRepository",
    "TimeSlotRepository",
]
