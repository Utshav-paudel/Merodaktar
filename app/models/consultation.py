from sqlalchemy import (
    Column,
    String,
    DateTime,
    Boolean,
    Text,
    ForeignKey,
    JSON,
    Integer,
    ARRAY,
    Float,
)
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from config.database import Base


class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    session_id = Column(String, nullable=False, unique=True, index=True)

    # Consultation metadata
    consultation_date = Column(DateTime, default=datetime.utcnow)
    language = Column(String, default="en")
    conversation_title = Column(String, nullable=True)

    # Assessment data
    symptoms = Column(JSON)  # ["fever", "cough", "headache"]
    urgency_level = Column(String)  # mild, moderate, urgent, emergency
    emergency_flag = Column(Boolean, default=False)

    # AI recommendations
    recommended_specialization = Column(String)
    recommended_tests = Column(JSON)
    preliminary_diagnosis = Column(Text)

    # Session status
    is_active = Column(Boolean, default=True)
    ended_at = Column(DateTime)
    total_messages = Column(Integer, default=0)

    # Relationships
    patient = relationship("User", back_populates="consultations")
    messages = relationship(
        "ChatMessage",
        back_populates="consultation",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Consultation(id={self.id}, session_id={self.session_id}, urgency={self.urgency_level})>"


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    consultation_id = Column(
        String,
        ForeignKey("consultations.id", ondelete="CASCADE"),
        nullable=False,
    )

    sender = Column(String, nullable=False)  # user, ai
    message = Column(Text, nullable=False)
    message_type = Column(String, default="text")  # text, audio, image

    # Vector embedding for semantic search (1536 dimensions for OpenAI ada-002)
    embedding = Column(ARRAY(Float), nullable=True)

    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    consultation = relationship("Consultation", back_populates="messages")

    def __repr__(self):
        return f"<ChatMessage(id={self.id}, sender={self.sender}, time={self.timestamp})>"
