# app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import os
import sys
from dotenv import load_dotenv

# Add the current directory to Python path to enable imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import all subapps
from subapps.login_verification.auth import router as auth_router
from subapps.dashboard.dashboard import router as dashboard_router
from subapps.appointment.appointments import router as appointments_router
from subapps.medical_chat.chat import router as medical_chat_router
from subapps.doctor.doctor_auth import router as doctor_auth_router
from subapps.doctor.doctor_dashboard import router as doctor_dashboard_router
from subapps.patient.ehr import router as patient_ehr_router
from subapps.medical_chat.gemini_tts import router as gemini_tts_router
from app.subapps.medical_chat.gemini_asr import router as speech_router

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="MeroDaktar API",
    description="AI-Powered Medical Appointment Booking System with Medical Chat",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add comprehensive logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    print(f"=== INCOMING REQUEST ===")
    print(f"Method: {request.method}")
    print(f"URL: {request.url}")
    print(f"Headers: {dict(request.headers)}")

    body = b""
    if request.method in ("POST", "PUT", "PATCH"):
        body = await request.body()

        content_type = request.headers.get("content-type", "")
        if "multipart/form-data" in content_type or "application/octet-stream" in content_type:
            # Binary upload (e.g., file upload)
            print(f"Body: <binary data of length {len(body)} bytes>")
        else:
            # Try to safely decode
            try:
                decoded = body.decode("utf-8")
                print(f"Body: {decoded if decoded else 'Empty'}")
            except UnicodeDecodeError:
                print(f"Body: <non-UTF8 data of length {len(body)} bytes>")

        # Rebuild body for downstream request handling
        async def receive():
            return {"type": "http.request", "body": body}
        request._receive = receive

    response = await call_next(request)
    print(f"Response status: {response.status_code}")
    print(f"=== REQUEST COMPLETE ===\n")
    return response


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5176", "http://localhost:5174", "http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all subapp routers with API prefix
app.include_router(auth_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(appointments_router, prefix="/api")
app.include_router(medical_chat_router, prefix="/api")
app.include_router(doctor_auth_router, prefix="/api")
app.include_router(doctor_dashboard_router, prefix="/api")
app.include_router(patient_ehr_router, prefix="/api")
app.include_router(gemini_tts_router, prefix="/api")
app.include_router(speech_router, prefix="/api")
# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "MeroDaktar API",
        "version": "1.0.0",
        "status": "running",
        "documentation": "/docs",
        "endpoints": {
            "authentication": {
                "register": "POST /api/register",
                "login": "POST /api/token", 
                "verify": "GET /api/verify",
                "enable_mfa": "POST /api/enable-mfa",
                "test": "GET /api/test",
                "debug_users": "GET /api/debug/users",
                "clear_users": "DELETE /api/debug/clear-users"
            },
            "medical_chat": {
                "chat": "POST /api/medical/chat",
                "consultations": "GET /api/medical/consultations",
                "consultation_detail": "GET /api/medical/consultation/{id}",
                "analyze_symptoms": "POST /api/medical/analyze-symptoms",
                "emergency_check": "POST /api/medical/emergency-check"
            },
            "dashboard": {
                "summary": "GET /api/dashboard/summary",
                "health_metrics": "GET /api/dashboard/health-metrics",
                "notifications": "GET /api/dashboard/notifications",
                "consultation_history": "GET /api/dashboard/consultation-history"
            },
            "appointments": {
                "doctors": "GET /api/appointments/doctors",
                "book": "POST /api/appointments/book",
                "my_appointments": "GET /api/appointments/my-appointments",
                "appointment_detail": "GET /api/appointments/appointment/{id}"
            }
        }
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": "in-memory",
            "ai_service": "openai",
            "authentication": "jwt",
            "mfa": "enabled"
        }
    }

# API info endpoint
@app.get("/api/info")
async def api_info():
    """Get API information and statistics"""
    return {
        "name": "MeroDaktar API",
        "version": "1.0.0",
        "description": "AI-Powered Medical Appointment Booking System",
        "features": [
            "AI Medical Consultation",
            "Multi-Factor Authentication",
            "Appointment Management",
            "Health Metrics Tracking",
            "Emergency Assessment",
            "Multilingual Support (English/Nepali)"
        ],
        "ai_model": "GPT-4 Turbo",
        "security": "JWT + MFA",
        "compliance": "HIPAA-compliant structure"
    }

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )