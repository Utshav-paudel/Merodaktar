from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel

from config.database import get_db
from core.security import get_current_user
from models.user import User
from schemas.report import ReportCreate, ReportUpdate, ReportResponse
from repositories.report import ReportRepository
from repositories.encounter import EncounterRepository
from services.report_service import ReportService
from services.redis_service import RedisService
from core.exceptions import NotFoundError

router = APIRouter()


# Request/Response models for symptom interview
class StartInterviewResponse(BaseModel):
    report_id: str
    session_active: bool
    question_number: int
    question: str


class AnswerRequest(BaseModel):
    answer: str


class AnswerResponse(BaseModel):
    report_id: str
    session_active: bool
    question_number: int
    question: Optional[str] = None
    is_complete: bool
    report: Optional[dict] = None


def get_report_service(db: Session = Depends(get_db)) -> ReportService:
    """Dependency to get report service with Redis"""
    report_repo = ReportRepository(db)
    encounter_repo = EncounterRepository(db)
    redis_service = RedisService()
    return ReportService(report_repo, encounter_repo, redis_service)


# Symptom Interview Endpoints
@router.post("/symptom-interview/start", response_model=StartInterviewResponse)
async def start_symptom_interview(
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """Start a new symptom interview session"""
    try:
        result = report_service.start_symptom_interview(current_user.id)
        return result
    except Exception as e:
        import traceback
        print(f"Error starting symptom interview: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error starting interview: {str(e)}"
        )


@router.post("/symptom-interview/{report_id}/answer", response_model=AnswerResponse)
async def submit_answer(
    report_id: str,
    answer_data: AnswerRequest,
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """Submit an answer to the current question"""
    try:
        result = report_service.process_answer(
            report_id=report_id,
            answer=answer_data.answer,
            patient_id=current_user.id
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Report Management Endpoints
@router.get("/my-reports", response_model=List[ReportResponse])
async def get_my_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all reports for current user"""
    report_repo = ReportRepository(db)
    reports = report_repo.get_by_patient(current_user.id, skip, limit)
    return reports


@router.get("/my-reports/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific report"""
    report_repo = ReportRepository(db)
    report = report_repo.get(report_id)
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    if report.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return report


@router.post("/my-reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    report_data: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new report"""
    report_repo = ReportRepository(db)
    
    # Get next report number for this patient
    next_number = report_repo.get_latest_report_number(current_user.id) + 1
    
    # Create report
    report = report_repo.create({
        "patient_id": current_user.id,
        "report_number": next_number,
        "chief_complaint": report_data.chief_complaint,
        "symptoms": report_data.symptoms,
        "preliminary_assessment": report_data.preliminary_assessment,
        "severity_level": report_data.severity_level,
        "recommended_specialization": report_data.recommended_specialization,
        "status": "completed"
    })
    
    return report


@router.put("/my-reports/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: str,
    report_data: ReportUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a report"""
    report_repo = ReportRepository(db)
    report = report_repo.get(report_id)
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    if report.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update only provided fields
    update_data = report_data.dict(exclude_unset=True)
    updated_report = report_repo.update(report_id, update_data)
    
    return updated_report


@router.delete("/my-reports/{report_id}")
async def delete_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a report"""
    report_repo = ReportRepository(db)
    report = report_repo.get(report_id)
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    if report.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    report_repo.delete(report_id)
    
    return {"message": "Report deleted successfully"}
