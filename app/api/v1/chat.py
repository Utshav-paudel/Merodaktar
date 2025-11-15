from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from sqlalchemy.orm import Session

from config.database import get_db
from core.security import get_current_user
from models.user import User
from schemas.consultation import (
    ConsultationCreate,
    ConsultationResponse,
    MessageCreate,
    MessageResponse,
    ConsultationUpdate,
)
from services.chat_service import ChatService
from api.dependencies import get_chat_service
from core.exceptions import NotFoundError

router = APIRouter()


@router.post("/session", response_model=dict)
async def create_chat_session(
    session_data: ConsultationCreate,
    current_user: User = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service),
):
    """Create a new chat session"""
    session_id, consultation_id = chat_service.create_session(
        patient_id=current_user.id, language=session_data.language
    )

    return {
        "session_id": session_id,
        "consultation_id": consultation_id,
        "message": "Chat session created successfully",
    }


@router.get("/session/{session_id}", response_model=dict)
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service),
):
    """Get or restore chat session"""
    try:
        restored_session_id, consultation_id = (
            chat_service.get_or_create_session(
                patient_id=current_user.id, session_id=session_id
            )
        )

        return {
            "session_id": restored_session_id,
            "consultation_id": consultation_id,
            "message": (
                "Session restored"
                if restored_session_id == session_id
                else "New session created"
            ),
        }

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail)
        )


@router.post("/session/{session_id}/message", response_model=dict)
async def send_message(
    session_id: str,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service),
):
    """Send a message in chat session and get AI response"""
    try:
        # Add user message and get AI response (both returned as tuple)
        user_message, ai_response = chat_service.add_message(
            session_id=session_id,
            sender=message_data.sender,
            message=message_data.message,
        )

        return {
            "user_message": user_message,
            "ai_response": ai_response,
            "success": True,
        }

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail)
        )


@router.get(
    "/session/{session_id}/history", response_model=List[MessageResponse]
)
async def get_chat_history(
    session_id: str,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service),
):
    """Get chat history for a session"""
    history = chat_service.get_session_history(session_id, limit)
    return history


@router.put("/session/{session_id}/assessment")
async def update_assessment(
    session_id: str,
    assessment_data: ConsultationUpdate,
    current_user: User = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service),
):
    """Update consultation assessment"""
    try:
        update_dict = assessment_data.model_dump(exclude_unset=True)
        chat_service.update_assessment(session_id=session_id, **update_dict)
        return {"message": "Assessment updated successfully"}

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail)
        )


@router.delete("/session/{session_id}")
async def end_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service),
):
    """End chat session"""
    chat_service.end_session(session_id)
    return {"message": "Chat session ended successfully"}


@router.get("/my-consultations", response_model=List[ConsultationResponse])
async def get_my_consultations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user's consultation history"""
    from repositories.consultation import ConsultationRepository

    consultation_repo = ConsultationRepository(db)
    consultations = consultation_repo.get_by_patient(
        current_user.id, skip, limit
    )

    return consultations
