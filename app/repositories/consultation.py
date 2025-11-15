from typing import Optional, List
from sqlalchemy.orm import Session
from models.consultation import Consultation, ChatMessage
from .base import BaseRepository


class ConsultationRepository(BaseRepository[Consultation]):
    def __init__(self, db: Session):
        super().__init__(Consultation, db)

    def get_by_session(self, session_id: str) -> Optional[Consultation]:
        """Get consultation by session ID"""
        return (
            self.db.query(Consultation)
            .filter(Consultation.session_id == session_id)
            .first()
        )

    def get_by_patient(
        self, patient_id: str, skip: int = 0, limit: int = 100
    ) -> List[Consultation]:
        """Get consultations for a patient (excluding empty conversations)"""
        return (
            self.db.query(Consultation)
            .filter(
                Consultation.patient_id == patient_id,
                Consultation.total_messages > 0,
            )
            .order_by(Consultation.consultation_date.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_active_consultations(self, patient_id: str) -> List[Consultation]:
        """Get active consultations for a patient"""
        return (
            self.db.query(Consultation)
            .filter(
                Consultation.patient_id == patient_id,
                Consultation.is_active,
            )
            .all()
        )

    def add_message(
        self,
        consultation_id: str,
        sender: str,
        message: str,
        embedding: Optional[List[float]] = None,
    ) -> ChatMessage:
        """Add a message to consultation with optional embedding"""
        chat_message = ChatMessage(
            consultation_id=consultation_id,
            sender=sender,
            message=message,
            embedding=embedding,
        )
        self.db.add(chat_message)

        # Increment message count
        consultation = self.get(consultation_id)
        if consultation:
            consultation.total_messages += 1

        self.db.commit()
        self.db.refresh(chat_message)
        return chat_message

    def get_messages(
        self, consultation_id: str, limit: int = 50
    ) -> List[ChatMessage]:
        """Get messages for a consultation"""
        return (
            self.db.query(ChatMessage)
            .filter(ChatMessage.consultation_id == consultation_id)
            .order_by(ChatMessage.timestamp.asc())
            .limit(limit)
            .all()
        )

    def end_consultation(self, consultation_id: str) -> Optional[Consultation]:
        """End a consultation"""
        from datetime import datetime

        return self.update(
            consultation_id,
            {"is_active": False, "ended_at": datetime.utcnow()},
        )

    def delete_consultation(self, consultation_id: str) -> bool:
        """Delete a consultation and all its messages"""
        consultation = self.get(consultation_id)
        if consultation:
            self.db.delete(consultation)
            self.db.commit()
            return True
        return False
