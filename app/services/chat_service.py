from typing import Dict, List, Optional
from sqlalchemy.orm import Session
import uuid
from openai import OpenAI

from repositories.consultation import ConsultationRepository
from services.redis_service import RedisService
from core.exceptions import NotFoundError
from config.settings import get_settings

settings = get_settings()
openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)


class ChatService:
    def __init__(self, db: Session, redis: RedisService):
        self.db = db
        self.redis = redis
        self.consultation_repo = ConsultationRepository(db)

    def create_session(
        self, patient_id: str, language: str = "en"
    ) -> tuple[str, str]:
        """Create a new consultation session"""
        session_id = str(uuid.uuid4())

        # Create consultation in database
        consultation_data = {
            "patient_id": patient_id,
            "session_id": session_id,
            "language": language,
            "is_active": True,
        }
        consultation = self.consultation_repo.create(consultation_data)

        # Store session in Redis (24-hour TTL)
        self.redis.create_session(session_id, patient_id, ttl=86400)

        return session_id, consultation.id

    def get_or_create_session(
        self, patient_id: str, session_id: Optional[str] = None
    ) -> tuple[str, str]:
        """Get existing session or create new one"""
        if session_id:
            # Check Redis first
            if self.redis.session_exists(session_id):
                consultation = self.consultation_repo.get_by_session(
                    session_id
                )
                if consultation:
                    return session_id, consultation.id

            # Check database
            consultation = self.consultation_repo.get_by_session(session_id)
            if consultation and consultation.patient_id == patient_id:
                # Restore to Redis
                self.redis.create_session(session_id, patient_id)
                return session_id, consultation.id

        # Create new session
        return self.create_session(patient_id)

    def _get_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using OpenAI"""
        try:
            response = openai_client.embeddings.create(
                model="text-embedding-3-small", input=text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return []

    def _cosine_similarity(
        self, vec1: List[float], vec2: List[float]
    ) -> float:
        """Calculate cosine similarity between two vectors"""
        try:
            dot_product = sum(a * b for a, b in zip(vec1, vec2))
            magnitude1 = sum(a * a for a in vec1) ** 0.5
            magnitude2 = sum(b * b for b in vec2) ** 0.5
            return (
                dot_product / (magnitude1 * magnitude2)
                if magnitude1 and magnitude2
                else 0.0
            )
        except Exception:
            return 0.0

    def add_message(
        self, session_id: str, sender: str, message: str
    ) -> tuple[Dict, Optional[Dict]]:
        """Add message to consultation and return user message + AI response"""
        # Get consultation
        consultation = self.consultation_repo.get_by_session(session_id)
        if not consultation:
            raise NotFoundError("Consultation session not found")

        # Generate embedding for the message
        embedding = self._get_embedding(message)

        # Generate AI response if sender is user (BEFORE storing user message)
        ai_message_data = None
        ai_response = None
        ai_embedding = None
        if sender == "user":
            # Generate AI response using vector search (before adding current message)
            ai_response = self._generate_ai_response(
                session_id, message, embedding
            )

            # Generate embedding for AI response
            ai_embedding = self._get_embedding(ai_response)

        # Add user message to database with embedding
        chat_message = self.consultation_repo.add_message(
            consultation.id, sender, message, embedding
        )

        # Set conversation title from first user message
        if sender == "user" and not consultation.conversation_title:
            title = message[:50] + "..." if len(message) > 50 else message
            self.consultation_repo.update(
                consultation.id, {"conversation_title": title}
            )

        # Build user message response
        user_message_data = {
            "id": chat_message.id,
            "sender": sender,
            "message": message,
            "timestamp": chat_message.timestamp.isoformat(),
        }

        # Add to Redis with embedding
        self.redis.add_message(session_id, user_message_data, embedding)

        # Add AI response to database and Redis if it was generated
        if ai_response:
            # Add AI response to database with embedding
            ai_message = self.consultation_repo.add_message(
                consultation.id, "ai", ai_response, ai_embedding
            )

            # Build AI message response
            ai_message_data = {
                "id": ai_message.id,
                "sender": "ai",
                "message": ai_response,
                "timestamp": ai_message.timestamp.isoformat(),
            }

            # Add AI response to Redis with embedding
            self.redis.add_message(session_id, ai_message_data, ai_embedding)

        return user_message_data, ai_message_data

    def _generate_ai_response(
        self,
        session_id: str,
        user_message: str,
        query_embedding: Optional[List[float]] = None,
    ) -> str:
        """Generate AI response using OpenAI with vector search for context"""
        try:
            # Use provided embedding or generate new one
            if query_embedding is None:
                query_embedding = self._get_embedding(user_message)

            # Find relevant context using Redis vector search
            relevant_context = self.redis.search_similar_messages(
                session_id, query_embedding, top_k=3
            )

            print(
                f"[AI RESPONSE] Found {len(relevant_context)} relevant messages from vector search"
            )

            # Get recent conversation history (last 6 messages = 3 exchanges)
            # recent_history = self.get_session_history(session_id, limit=6)

            # Build messages for OpenAI
            messages = [
                {
                    "role": "system",
                    "content": "You are a helpful medical assistant. Provide helpful health information and guidance. Always remind users to consult with healthcare professionals for proper diagnosis and treatment. Be empathetic and clear.",
                }
            ]

            # Add relevant context from vector search if available
            if relevant_context:
                context_text = "\n".join(
                    [f"- {ctx['message']}" for ctx in relevant_context]
                )
                print(
                    f"[AI RESPONSE] Adding context to prompt:\n{context_text}"
                )
                messages.append(
                    {
                        "role": "system",
                        "content": f"Relevant context from previous conversation:\n{context_text}",
                    }
                )
            else:
                print(
                    "[AI RESPONSE] No relevant context found from vector search"
                )

            # # Add recent conversation history
            # for msg in recent_history[
            #     :-1
            # ]:  # Exclude the just-added user message
            #     role = "assistant" if msg["sender"] == "ai" else "user"
            #     messages.append({"role": role, "content": msg["message"]})

            # Add current message
            messages.append({"role": "user", "content": user_message})

            # Call OpenAI
            response = openai_client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=messages,
                temperature=0.7,
                max_tokens=500,
            )

            return response.choices[0].message.content

        except Exception as e:
            return f"I apologize, but I'm having trouble processing your request right now. Please try again or consult with a healthcare professional. Error: {str(e)}"

    def _find_relevant_context(
        self, session_id: str, query: str, top_k: int = 5
    ) -> List[Dict]:
        """Find relevant messages using Redis vector search (fallback to database if needed)"""
        try:
            # Generate embedding for query
            query_embedding = self._get_embedding(query)
            if not query_embedding:
                return []

            # Try Redis vector search first
            relevant_messages = self.redis.search_similar_messages(
                session_id, query_embedding, top_k=top_k
            )

            if relevant_messages:
                return relevant_messages

            # Fallback to database vector search if Redis has no results
            consultation = self.consultation_repo.get_by_session(session_id)
            if not consultation:
                return []

            messages = self.consultation_repo.get_messages(
                consultation.id, limit=100
            )

            relevant_messages = []
            for msg in messages:
                if msg.embedding:
                    # Calculate cosine similarity
                    similarity = self._cosine_similarity(
                        query_embedding, msg.embedding
                    )
                    relevant_messages.append(
                        {
                            "message": msg.message,
                            "sender": msg.sender,
                            "similarity": similarity,
                            "timestamp": msg.timestamp.isoformat(),
                        }
                    )

            # Sort by similarity and return top_k
            relevant_messages.sort(key=lambda x: x["similarity"], reverse=True)
            return relevant_messages[:top_k]
        except Exception as e:
            print(f"Error finding relevant context: {e}")
            return []

    def get_session_history(
        self, session_id: str, limit: int = 50
    ) -> List[Dict]:
        """Get chat history for session"""
        # Try Redis first (faster)
        redis_history = self.redis.get_messages(session_id, limit)
        if redis_history:
            return redis_history

        # Fallback to database
        consultation = self.consultation_repo.get_by_session(session_id)
        if not consultation:
            return []

        messages = self.consultation_repo.get_messages(consultation.id, limit)
        return [
            {
                "id": msg.id,
                "sender": msg.sender,
                "message": msg.message,
                "timestamp": msg.timestamp.isoformat(),
            }
            for msg in messages
        ]

    def update_assessment(
        self,
        session_id: str,
        symptoms: List[str],
        urgency_level: str,
        emergency_flag: bool,
        **kwargs,
    ) -> None:
        """Update consultation assessment"""
        consultation = self.consultation_repo.get_by_session(session_id)
        if not consultation:
            raise NotFoundError("Consultation not found")

        update_data = {
            "symptoms": symptoms,
            "urgency_level": urgency_level,
            "emergency_flag": emergency_flag,
            **kwargs,
        }
        self.consultation_repo.update(consultation.id, update_data)

    def end_session(self, session_id: str) -> None:
        """Delete consultation session"""
        consultation = self.consultation_repo.get_by_session(session_id)
        if consultation:
            self.consultation_repo.delete_consultation(consultation.id)

        # Remove from Redis
        self.redis.delete_session(session_id)
