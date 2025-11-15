from fastapi import APIRouter
from .auth import router as auth_router
from .users import router as users_router
from .doctors import router as doctors_router
from .appointments import router as appointments_router
from .chat import router as chat_router
from .ehr import router as ehr_router
from .dashboard import router as dashboard_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(doctors_router, prefix="/doctors", tags=["Doctors"])
api_router.include_router(
    appointments_router, prefix="/appointments", tags=["Appointments"]
)
api_router.include_router(chat_router, prefix="/chat", tags=["Medical Chat"])
api_router.include_router(
    ehr_router, prefix="/ehr", tags=["Electronic Health Records"]
)
api_router.include_router(
    dashboard_router, prefix="/dashboard", tags=["Dashboard"]
)
