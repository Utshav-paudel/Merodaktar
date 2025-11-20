from typing import Dict, List, Optional
from sqlalchemy.orm import Session
import uuid
from openai import OpenAI
import json

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

    def _get_patient_ehr_context(self, patient_id: str) -> Dict:
        """Gather comprehensive patient EHR context for AI personalization"""
        from repositories.user import UserRepository
        from repositories.ehr import EHRRepository
        from repositories.encounter import EncounterRepository
        from datetime import datetime
        
        context = {
            "patient_info": {},
            "medical_history": {},
            "vital_signs": {},
            "previous_encounters": [],
            "recent_symptoms": []
        }
        
        try:
            # Get patient demographic information
            user_repo = UserRepository(self.db)
            patient = user_repo.get(patient_id)
            
            if patient:
                age = self._calculate_age(patient.date_of_birth) if patient.date_of_birth else "Unknown"
                context["patient_info"] = {
                    "name": patient.full_name or "Patient",
                    "age": age,
                    "gender": patient.gender or "Not specified",
                    "phone": patient.phone or "Not provided",
                    "email": patient.email or ""
                }
            
            # Get EHR medical history and current health status
            ehr_repo = EHRRepository(self.db)
            ehr = ehr_repo.get_by_patient(patient_id)
            
            if ehr:
                # Get latest vital signs
                if ehr.vital_signs and len(ehr.vital_signs) > 0:
                    latest_vitals = ehr.vital_signs[-1]
                    context["vital_signs"] = {
                        "blood_pressure": f"{latest_vitals.get('blood_pressure_systolic', 'N/A')}/{latest_vitals.get('blood_pressure_diastolic', 'N/A')}" if latest_vitals.get('blood_pressure_systolic') else "Not recorded",
                        "heart_rate": f"{latest_vitals.get('heart_rate', 'N/A')} bpm" if latest_vitals.get('heart_rate') else "Not recorded",
                        "temperature": f"{latest_vitals.get('temperature', 'N/A')}°F" if latest_vitals.get('temperature') else "Not recorded",
                        "weight": f"{latest_vitals.get('weight', 'N/A')} kg" if latest_vitals.get('weight') else "Not recorded",
                        "height": f"{latest_vitals.get('height', ehr.height or 'N/A')}" if latest_vitals.get('height') or ehr.height else "Not recorded",
                        "bmi": latest_vitals.get('bmi', 'N/A') if latest_vitals.get('bmi') else "Not calculated",
                        "recorded_date": latest_vitals.get('recorded_date', 'Unknown')
                    }
                else:
                    context["vital_signs"] = {
                        "blood_pressure": "Not recorded",
                        "heart_rate": "Not recorded",
                        "temperature": "Not recorded",
                        "weight": ehr.weight if ehr.weight else "Not recorded",
                        "height": ehr.height if ehr.height else "Not recorded",
                        "bmi": "Not calculated"
                    }
                
                # Medical history
                context["medical_history"] = {
                    "blood_type": ehr.blood_type or "Unknown",
                    "chronic_conditions": ehr.chronic_conditions or [],
                    "allergies": ehr.allergies or [],
                    "current_medications": ehr.medications or [],
                    "immunizations": ehr.immunizations or []
                }
            else:
                context["medical_history"] = {
                    "blood_type": "Unknown",
                    "chronic_conditions": [],
                    "allergies": [],
                    "current_medications": [],
                    "immunizations": []
                }
                context["vital_signs"] = {}
            
            # Get previous encounters (last 3 for context)
            encounter_repo = EncounterRepository(self.db)
            recent_encounters = encounter_repo.get_by_patient(patient_id, skip=0, limit=3)
            
            for encounter in recent_encounters:
                context["previous_encounters"].append({
                    "date": encounter.encounter_date.strftime("%Y-%m-%d") if encounter.encounter_date else "Unknown",
                    "chief_complaint": encounter.chief_complaint or "Not recorded",
                    "assessment": encounter.assessment[:150] + "..." if encounter.assessment and len(encounter.assessment) > 150 else encounter.assessment or "",
                    "doctor_notes": encounter.doctor_notes[:150] + "..." if encounter.doctor_notes and len(encounter.doctor_notes) > 150 else encounter.doctor_notes or ""
                })
        except Exception as e:
            print(f"Error gathering patient EHR context: {e}")
        
        return context
    
    def _calculate_age(self, date_of_birth) -> str:
        """Calculate age from date of birth"""
        try:
            from datetime import datetime
            if isinstance(date_of_birth, str):
                dob = datetime.strptime(date_of_birth, "%Y-%m-%d")
            else:
                dob = date_of_birth
            today = datetime.today()
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            return f"{age} years"
        except:
            return "Unknown"
    
    def _format_ehr_for_prompt(self, patient_context: Dict) -> str:
        """Format EHR context into a readable summary for AI prompt"""
        sections = []
        
        # Patient demographics
        if patient_context.get("patient_info"):
            info = patient_context["patient_info"]
            demo = f"Patient: {info.get('name', 'Unknown')}, Age: {info.get('age', 'Unknown')}, Gender: {info.get('gender', 'Unknown')}"
            sections.append(demo)
        
        # Vital signs
        if patient_context.get("vital_signs") and any(v != "Not recorded" and v != "Not calculated" and v != "N/A" for v in patient_context["vital_signs"].values()):
            vitals = patient_context["vital_signs"]
            vital_str = "Vital Signs: "
            vital_parts = []
            if vitals.get("blood_pressure") and vitals["blood_pressure"] != "Not recorded":
                vital_parts.append(f"BP {vitals['blood_pressure']}")
            if vitals.get("heart_rate") and vitals["heart_rate"] != "Not recorded":
                vital_parts.append(f"HR {vitals['heart_rate']}")
            if vitals.get("temperature") and vitals["temperature"] != "Not recorded":
                vital_parts.append(f"Temp {vitals['temperature']}")
            if vitals.get("weight") and vitals["weight"] != "Not recorded":
                vital_parts.append(f"Weight {vitals['weight']}")
            if vitals.get("bmi") and vitals["bmi"] != "Not calculated":
                vital_parts.append(f"BMI {vitals['bmi']}")
            
            if vital_parts:
                sections.append(vital_str + ", ".join(vital_parts))
        
        # Medical history
        if patient_context.get("medical_history"):
            med_hist = patient_context["medical_history"]
            
            # Chronic conditions
            if med_hist.get("chronic_conditions"):
                conditions = [c.get("condition", str(c)) if isinstance(c, dict) else str(c) for c in med_hist["chronic_conditions"]]
                sections.append(f"Chronic Conditions: {', '.join(conditions)}")
            
            # Current medications
            if med_hist.get("current_medications"):
                meds = []
                for med in med_hist["current_medications"]:
                    if isinstance(med, dict):
                        med_str = med.get("name", "Unknown")
                        if med.get("dosage"):
                            med_str += f" {med['dosage']}"
                        meds.append(med_str)
                    else:
                        meds.append(str(med))
                if meds:
                    sections.append(f"Current Medications: {', '.join(meds)}")
            
            # Allergies
            if med_hist.get("allergies"):
                allergies = []
                for allergy in med_hist["allergies"]:
                    if isinstance(allergy, dict):
                        allergen = allergy.get("allergen", str(allergy))
                        severity = allergy.get("severity", "")
                        if severity:
                            allergies.append(f"{allergen} ({severity})")
                        else:
                            allergies.append(allergen)
                    else:
                        allergies.append(str(allergy))
                if allergies:
                    sections.append(f"Allergies: {', '.join(allergies)}")
            
            # Blood type
            if med_hist.get("blood_type") and med_hist["blood_type"] != "Unknown":
                sections.append(f"Blood Type: {med_hist['blood_type']}")
        
        # Previous encounters
        if patient_context.get("previous_encounters"):
            encounters = patient_context["previous_encounters"]
            if encounters:
                sections.append(f"\nRecent Medical History:")
                for i, enc in enumerate(encounters[:2], 1):  # Limit to 2 most recent
                    sections.append(f"  {i}. {enc.get('date', 'Unknown date')}: {enc.get('chief_complaint', 'No complaint recorded')}")
                    if enc.get("assessment"):
                        sections.append(f"     Assessment: {enc['assessment']}")
        
        return "\n".join(sections) if sections else "No medical history available."

    def _generate_ai_response(
        self,
        session_id: str,
        user_message: str,
        query_embedding: Optional[List[float]] = None,
    ) -> str:
        """Generate AI response using OpenAI with vector search for context and comprehensive EHR data"""
        try:
            # Use provided embedding or generate new one
            if query_embedding is None:
                query_embedding = self._get_embedding(user_message)

            # Get consultation to access patient_id
            consultation = self.consultation_repo.get_by_session(session_id)
            if not consultation:
                raise NotFoundError("Consultation session not found")
            
            # Get comprehensive patient EHR context
            patient_context = self._get_patient_ehr_context(consultation.patient_id)

            # Find relevant context using Redis vector search
            relevant_context = self.redis.search_similar_messages(
                session_id, query_embedding, top_k=3
            )

            print(
                f"[AI RESPONSE] Found {len(relevant_context)} relevant messages from vector search"
            )

            # Build messages for OpenAI with comprehensive system prompt
            system_prompt = """You are MedAssist, a helpful and empathetic medical AI assistant. Your role is to:

1. Provide helpful health information and guidance based on the patient's medical history
2. Answer health-related questions clearly and compassionately
3. Consider the patient's existing conditions, medications, and allergies when responding
4. IMPORTANT: Do NOT ask repetitive questions that can be answered from the patient's medical record
5. Always remind users that you are providing information only, not a diagnosis
6. Encourage users to consult healthcare professionals for proper diagnosis and treatment

Be conversational, supportive, and provide context-aware responses."""

            messages = [
                {
                    "role": "system",
                    "content": system_prompt
                }
            ]

            # Add comprehensive patient EHR context
            if patient_context:
                ehr_summary = self._format_ehr_for_prompt(patient_context)
                print(f"[AI CHAT] Adding patient EHR context to prompt")
                messages.append({
                    "role": "system",
                    "content": f"PATIENT MEDICAL RECORD:\n{ehr_summary}\n\nIMPORTANT: Use this information to provide personalized responses. DO NOT ask the patient for information that is already in their medical record (age, gender, medical history, medications, allergies, etc.). Reference their existing conditions and medications when relevant."
                })
            else:
                print("[AI CHAT] No patient EHR context available")

            # Add relevant context from vector search if available
            if relevant_context:
                context_text = "\n".join(
                    [f"- {ctx['message']}" for ctx in relevant_context]
                )
                print(
                    f"[AI CHAT] Adding conversation history to prompt"
                )
                messages.append(
                    {
                        "role": "system",
                        "content": f"RECENT CONVERSATION CONTEXT:\n{context_text}\n\nUse this to maintain conversational continuity. Do not repeat questions already asked.",
                    }
                )
            else:
                print(
                    "[AI CHAT] No relevant context found from vector search"
                )

            # Add current message
            messages.append({"role": "user", "content": user_message})

            # Call OpenAI
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
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
