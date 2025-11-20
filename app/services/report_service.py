from typing import List, Dict, Optional
from repositories.report import ReportRepository
from repositories.encounter import EncounterRepository
from schemas.report import ReportCreate, ReportUpdate
from core.exceptions import NotFoundError, ValidationError
from services.medgemma_service import get_medgemma_service
from services.redis_service import RedisService
import json
from openai import OpenAI
from config.settings import get_settings

settings = get_settings()
openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)


class ReportService:
    """Service for managing medical reports and symptom interviews"""
    
    def __init__(
        self, 
        report_repo: ReportRepository,
        encounter_repo: EncounterRepository,
        redis_service: Optional[RedisService] = None
    ):
        self.report_repo = report_repo
        self.encounter_repo = encounter_repo
        self.medgemma = get_medgemma_service()  # Add MedGemma service
        self.redis = redis_service or RedisService()  # Add Redis for session memory
    
    def _get_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using OpenAI"""
        try:
            response = openai_client.embeddings.create(
                model="text-embedding-3-small", input=text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"[SYMPTOM ASSESSMENT] Error generating embedding: {e}")
            return []
    
    def start_symptom_interview(self, patient_id: str) -> Dict:
        """Start a new symptom interview session with full patient context and Redis memory"""
        # Get next report number
        latest_number = self.report_repo.get_latest_report_number(patient_id)
        report_number = (latest_number or 0) + 1
        
        # Gather comprehensive patient context for AI
        patient_context = self._get_patient_context(patient_id)
        
        # Generate personalized first question using patient context
        first_question = self._generate_personalized_first_question(patient_context)
        
        # Store patient context in report for continued personalization
        # Initialize with EMPTY questions_asked - questions will be added as they are ANSWERED
        report_data = {
            "patient_id": patient_id,
            "report_number": report_number,
            "status": "draft",
            "questions_asked": [],  # Start empty - questions added only AFTER they're answered
            "symptoms": [],
            "chief_complaint": "",
            "patient_context": json.dumps(patient_context)  # Store context as JSON string
        }
        
        report = self.report_repo.create(report_data)
        
        # Create Redis session for symptom assessment with 24-hour TTL
        session_id = f"symptom_assessment:{report.id}"
        self.redis.create_session(session_id, patient_id, ttl=86400)
        
        print(f"[SYMPTOM ASSESSMENT] Created Redis session: {session_id}")
        
        # Store the first question in Redis metadata (not in message history yet)
        # We'll add it to message history when user answers it
        self.redis.client.hset(session_id, "current_question", first_question)
        self.redis.client.hset(session_id, "question_number", "1")
        
        return {
            "report_id": report.id,
            "session_active": True,
            "question_number": 1,
            "question": first_question,
            "patient_context": patient_context  # Return context to frontend if needed
        }
    
    def process_answer(
        self, 
        report_id: str, 
        answer: str,
        patient_id: str
    ) -> Dict:
        """Process answer and generate next question using Redis session memory"""
        report = self.report_repo.get(report_id)
        
        if not report:
            raise NotFoundError("Report not found")
        
        if report.patient_id != patient_id:
            raise ValidationError("Access denied")
        
        # Get Redis session ID
        session_id = f"symptom_assessment:{report_id}"
        
        # Get the current question from Redis
        current_question = self.redis.client.hget(session_id, "current_question")
        if current_question:
            current_question = current_question.decode('utf-8') if isinstance(current_question, bytes) else current_question
        
        if not current_question:
            raise ValidationError("No active question found for this session")
        
        # Parse existing Q&A history from database
        try:
            if isinstance(report.questions_asked, str):
                questions_asked = json.loads(report.questions_asked)
            elif isinstance(report.questions_asked, list):
                questions_asked = report.questions_asked
            else:
                questions_asked = []
        except:
            questions_asked = []
        
        # Add the current Q&A pair to history (now that it's answered)
        qa_pair = {
            "question": current_question,
            "answer": answer
        }
        questions_asked.append(qa_pair)
        
        # Store the complete Q&A pair in Redis for semantic search
        qa_text = f"Q: {current_question}\nA: {answer}"
        qa_embedding = self._get_embedding(qa_text)
        question_number = len(questions_asked)
        
        qa_data = {
            "question": current_question,
            "answer": answer,
            "question_number": question_number,
            "timestamp": str(self.redis.client.time()[0])
        }
        self.redis.add_message(session_id, qa_data, qa_embedding)
        
        print(f"[SYMPTOM ASSESSMENT] Stored Q&A #{question_number} in Redis")
        
        # Check if user wants to end the interview early
        answer_lower = answer.lower().strip()
        user_wants_to_finish = any(phrase in answer_lower for phrase in [
            'finish', 'done', 'complete', 'end this', 'stop', 'enough',
            'thats all', "that's all", 'no more', 'finish this assessment',
            'finish assessment', 'end assessment', 'complete this'
        ])
        
        # Update chief complaint if this is the first answer
        if question_number == 1:
            report.chief_complaint = answer
        
        # Get patient context for personalized questions
        try:
            if hasattr(report, 'patient_context') and report.patient_context:
                if isinstance(report.patient_context, str):
                    patient_context = json.loads(report.patient_context)
                elif isinstance(report.patient_context, dict):
                    patient_context = report.patient_context
                else:
                    patient_context = {}
            else:
                patient_context = {}
        except:
            patient_context = {}
        
        # Generate next question using MedGemma with Redis context and patient history
        next_question = self._generate_next_question_with_redis(
            session_id, 
            questions_asked,  # All Q&A pairs now have both question and answer
            patient_context,
            question_number
        )
        
        # Check if interview is complete
        is_complete = (
            question_number >= 15 or  # Max questions reached
            user_wants_to_finish and question_number >= 3 or  # User requested early finish (min 3 questions)
            "thank you for" in next_question.lower() or  # AI concluded
            "have everything needed" in next_question.lower() or
            "that completes" in next_question.lower() or
            "enough details" in next_question.lower()
        )
        
        if is_complete:
            # Extract symptoms from all answers
            symptoms_list = self._extract_symptoms(questions_asked)
            
            # Generate final assessment
            assessment = self._generate_assessment(
                report.chief_complaint, 
                questions_asked, 
                symptoms_list
            )
            severity = self._assess_severity(symptoms_list)
            specialization = self._recommend_specialization(symptoms_list)
            
            # Update report to completed
            self.report_repo.update(report_id, {
                "questions_asked": questions_asked,
                "symptoms": symptoms_list,
                "preliminary_assessment": assessment,
                "severity_level": severity,
                "recommended_specialization": specialization,
                "status": "completed"
            })
            
            # Get patient information for comprehensive summary
            from repositories.user import UserRepository
            from repositories.ehr import EHRRepository
            
            user_repo = UserRepository(self.report_repo.db)
            ehr_repo = EHRRepository(self.report_repo.db)
            
            patient = user_repo.get(patient_id)
            
            # Create comprehensive patient summary with demographics
            patient_summary = {
                "patient_name": patient.full_name if patient else "Unknown",
                "patient_email": patient.email if patient else "",
                "age": self._calculate_age(patient.date_of_birth) if patient and patient.date_of_birth else "Not provided",
                "gender": patient.gender if patient and patient.gender else "Not provided",
                "phone": patient.phone if patient and patient.phone else "Not provided",
                "address": patient.address if patient and patient.address else "Not provided"
            }
            
            # Add EHR data to patient summary
            try:
                ehr = ehr_repo.get_by_patient(patient_id)
                if ehr:
                    # Add vital signs (latest)
                    if ehr.vital_signs and len(ehr.vital_signs) > 0:
                        latest_vitals = ehr.vital_signs[-1]
                        patient_summary["vital_signs"] = {
                            "blood_pressure": f"{latest_vitals.get('blood_pressure_systolic', 'N/A')}/{latest_vitals.get('blood_pressure_diastolic', 'N/A')}" if latest_vitals.get('blood_pressure_systolic') else "Not recorded",
                            "heart_rate": f"{latest_vitals.get('heart_rate', 'N/A')} bpm" if latest_vitals.get('heart_rate') else "Not recorded",
                            "temperature": f"{latest_vitals.get('temperature', 'N/A')}°F" if latest_vitals.get('temperature') else "Not recorded",
                            "weight": f"{latest_vitals.get('weight', 'N/A')} kg" if latest_vitals.get('weight') else "Not recorded",
                            "height": f"{latest_vitals.get('height', ehr.height or 'N/A')}" if latest_vitals.get('height') or ehr.height else "Not recorded",
                            "bmi": latest_vitals.get('bmi', 'N/A') if latest_vitals.get('bmi') else "Not calculated"
                        }
                    else:
                        patient_summary["vital_signs"] = {
                            "blood_pressure": "Not recorded",
                            "heart_rate": "Not recorded",
                            "temperature": "Not recorded",
                            "weight": ehr.weight if ehr.weight else "Not recorded",
                            "height": ehr.height if ehr.height else "Not recorded",
                            "bmi": "Not calculated"
                        }
                    
                    # Add current medications
                    if ehr.medications and len(ehr.medications) > 0:
                        patient_summary["current_medications"] = [
                            {
                                "name": med.get("name", "Unknown"),
                                "dosage": med.get("dosage", "N/A"),
                                "frequency": med.get("frequency", "N/A")
                            }
                            for med in ehr.medications
                        ]
                    else:
                        patient_summary["current_medications"] = []
                    
                    # Add allergies
                    if ehr.allergies and len(ehr.allergies) > 0:
                        patient_summary["allergies"] = [
                            {
                                "allergen": allergy.get("allergen", "Unknown"),
                                "reaction": allergy.get("reaction", "N/A"),
                                "severity": allergy.get("severity", "N/A")
                            }
                            for allergy in ehr.allergies
                        ]
                    else:
                        patient_summary["allergies"] = []
                    
                    # Add chronic conditions/medical history
                    if ehr.chronic_conditions and len(ehr.chronic_conditions) > 0:
                        patient_summary["medical_history"] = [
                            {
                                "condition": condition.get("condition", "Unknown"),
                                "diagnosed_date": condition.get("diagnosed_date", "Unknown"),
                                "status": condition.get("status", "active")
                            }
                            for condition in ehr.chronic_conditions
                        ]
                    else:
                        patient_summary["medical_history"] = []
                    
                    # Add blood type
                    patient_summary["blood_type"] = ehr.blood_type if ehr.blood_type else "Unknown"
                else:
                    # No EHR data available
                    patient_summary["vital_signs"] = {}
                    patient_summary["current_medications"] = []
                    patient_summary["allergies"] = []
                    patient_summary["medical_history"] = []
                    patient_summary["blood_type"] = "Unknown"
            except Exception as e:
                # If EHR fetch fails, just use basic demographics
                patient_summary["vital_signs"] = {}
                patient_summary["current_medications"] = []
                patient_summary["allergies"] = []
                patient_summary["medical_history"] = []
                patient_summary["blood_type"] = "Unknown"
            
            # Create encounter in EHR with comprehensive data
            encounter_data = {
                "patient_id": patient_id,
                "encounter_type": "ai_symptom_assessment",
                "chief_complaint": report.chief_complaint or "General health concern",
                "symptoms": symptoms_list,
                "assessment": assessment,
                "report_id": report.id,
                "patient_summary": patient_summary,
                "ai_preliminary_report": assessment,
                "doctor_notes": ""  # Empty initially, doctor will fill this later
            }
            
            # Get encounter number
            latest_number = self.encounter_repo.get_latest_encounter_number(patient_id)
            encounter_data["encounter_number"] = (latest_number or 0) + 1
            
            encounter = self.encounter_repo.create(encounter_data)
            
            # Clean up Redis session after completion
            print(f"[SYMPTOM ASSESSMENT] Interview complete, cleaning up Redis session: {session_id}")
            self.redis.delete_session(session_id)
            
            return {
                "report_id": report.id,
                "session_active": False,
                "question_number": question_number,
                "question": None,
                "is_complete": True,
                "report": {
                    "chief_complaint": report.chief_complaint,
                    "symptoms": symptoms_list,
                    "assessment": assessment,
                    "severity": severity,
                    "encounter_id": encounter.id,
                    "report_id": report.id
                }
            }
        else:
            # Store the next question in Redis metadata (not in message history)
            # It will be added to history when the user answers it
            self.redis.client.hset(session_id, "current_question", next_question)
            self.redis.client.hset(session_id, "question_number", str(question_number + 1))
            
            print(f"[SYMPTOM ASSESSMENT] Stored next question #{question_number + 1} in Redis metadata")
            
            # Update database with only the ANSWERED questions (don't add unanswered question)
            self.report_repo.update(report_id, {
                "questions_asked": questions_asked,
                "chief_complaint": report.chief_complaint
            })
            
            return {
                "report_id": report.id,
                "session_active": True,
                "question_number": question_number + 1,
                "question": next_question,
                "is_complete": False,
                "report": None
            }
    
    def _get_current_question(self, question_index: int) -> str:
        """Get the question for the given index"""
        questions = [
            "What is your main health concern today?",
            # This would be dynamically generated, but for now we have a fallback
        ]
        if question_index < len(questions):
            return questions[question_index]
        return "Could you describe your symptoms?"
    
    def _generate_next_question(
        self, 
        qa_history: List[Dict],
        symptoms: List[Dict],
        patient_context: Dict = None
    ) -> str:
        """Generate the next question based on context using MedGemma"""
        question_count = len(qa_history)
        
        # Debug logging
        print(f"[SYMPTOM INTERVIEW] Generating question #{question_count + 1}")
        print(f"[SYMPTOM INTERVIEW] Answered questions so far: {question_count}")
        if qa_history:
            print(f"[SYMPTOM INTERVIEW] Last Q&A: Q: {qa_history[-1].get('question')} | A: {qa_history[-1].get('answer')}")
        
        # Use MedGemma to generate intelligent next question with patient context
        try:
            # Generate a session_id for duplicate detection (use a hash of qa_history)
            import hashlib
            session_hash = hashlib.md5(str(qa_history).encode()).hexdigest()[:16]
            session_id_for_tracking = f"symptom_interview:{session_hash}"
            
            question = self.medgemma.generate_symptom_question(
                session_id=session_id_for_tracking,
                conversation_history=qa_history, 
                question_count=question_count + 1,
                patient_context=patient_context
            )
            print(f"[SYMPTOM INTERVIEW] Generated question: {question}")
            return question
        except Exception as e:
            print(f"[SYMPTOM INTERVIEW] Error generating question: {e}")
            # Fallback to predefined questions if MedGemma fails
            questions = [
                "What is your main health concern today?",
                "When did these symptoms start?",
                "How severe are your symptoms on a scale of 1-10?",
                "Have you noticed any other symptoms?",
                "Does anything make your symptoms better or worse?",
                "Have you taken any medication for this?",
                "Do you have any chronic medical conditions?",
                "Are you currently taking any medications?",
                "Do you have any allergies?",
                "Have you traveled recently?",
                "Have you been in contact with anyone who was sick?",
                "How is your appetite?",
                "How is your sleep?",
                "Any fever, chills, or night sweats?",
                "Is there anything else you'd like to mention?"
            ]
            
            if question_count < len(questions):
                return questions[question_count]
            
            return "Thank you for answering my questions. I have everything needed for your report."
    
    def _extract_symptoms(self, qa_history: List[Dict]) -> List[Dict]:
        """Extract symptoms from Q&A history using MedGemma"""
        
        # Use MedGemma for intelligent symptom extraction
        try:
            symptom_names = self.medgemma.extract_symptoms(qa_history)
            symptoms = [
                {
                    "symptom": symptom,
                    "severity": "moderate"  # Default, can be enhanced
                }
                for symptom in symptom_names
            ]
            return symptoms
        except Exception as e:
            # Fallback to keyword matching if MedGemma fails
            symptoms = []
            symptom_keywords = [
                "fever", "cough", "headache", "pain", "nausea", "vomiting",
                "diarrhea", "fatigue", "weakness", "dizziness", "rash",
                "shortness of breath", "chest pain", "sore throat"
            ]
            
            for qa in qa_history:
                answer = qa["answer"].lower()
                for keyword in symptom_keywords:
                    if keyword in answer:
                        symptoms.append({
                            "symptom": keyword,
                            "mentioned_in": qa["question"],
                            "severity": "moderate"
                        })
            
            # Remove duplicates
            seen = set()
            unique_symptoms = []
            for symptom in symptoms:
                if symptom["symptom"] not in seen:
                    seen.add(symptom["symptom"])
                    unique_symptoms.append(symptom)
            
            return unique_symptoms
    
    def _generate_assessment(
        self,
        chief_complaint: str,
        qa_history: List[Dict],
        symptoms: List[Dict]
    ) -> str:
        """Generate preliminary assessment using MedGemma"""
        
        # Use MedGemma to generate comprehensive report
        try:
            symptom_list = [s["symptom"] for s in symptoms]
            return self.medgemma.generate_medical_report(chief_complaint, qa_history, symptom_list)
        except Exception as e:
            # Fallback to simple template if MedGemma fails
            symptom_list = ", ".join([s["symptom"] for s in symptoms])
            
            assessment = f"""
PRELIMINARY MEDICAL REPORT

Chief Complaint: {chief_complaint}

Symptoms Reported: {symptom_list if symptom_list else 'None specified'}

History of Present Illness:
The patient reports {chief_complaint.lower()}. """
            
            # Add duration if mentioned
            for qa in qa_history:
                if "when" in qa["question"].lower() or "start" in qa["question"].lower():
                    assessment += f"Symptoms began {qa['answer'].lower()}. "
                    break
            
            # Add severity
            for qa in qa_history:
                if "severe" in qa["question"].lower() or "scale" in qa["question"].lower():
                    assessment += f"Patient rates severity as {qa['answer']}. "
                    break
            
            assessment += "\n\nRecommendation: Please consult with a healthcare provider for proper diagnosis and treatment plan."
            
            return assessment.strip()
    
    def _assess_severity(self, symptoms: List[Dict]) -> str:
        """Assess severity level using MedGemma"""
        if not symptoms:
            return "mild"
        
        try:
            symptom_list = [s["symptom"] for s in symptoms]
            chief_complaint = symptom_list[0] if symptom_list else "general symptoms"
            return self.medgemma.assess_severity(chief_complaint, symptom_list)
        except Exception as e:
            # Fallback logic
            severe_symptoms = ["chest pain", "shortness of breath", "severe pain"]
            for symptom in symptoms:
                if any(severe in symptom["symptom"] for severe in severe_symptoms):
                    return "severe"
            
            if len(symptoms) > 5:
                return "moderate"
            
            return "mild"
    
    def _recommend_specialization(self, symptoms: List[Dict]) -> str:
        """Recommend medical specialization using MedGemma"""
        if not symptoms:
            return "general_practice"
        
        try:
            symptom_list = [s["symptom"] for s in symptoms]
            chief_complaint = symptom_list[0] if symptom_list else "general symptoms"
            return self.medgemma.recommend_specialization(chief_complaint, symptom_list)
        except Exception as e:
            # Fallback logic
            symptom_text = " ".join([s["symptom"] for s in symptoms])
            
            if any(word in symptom_text for word in ["chest pain", "heart"]):
                return "cardiology"
            elif any(word in symptom_text for word in ["cough", "breathing", "lung"]):
                return "pulmonology"
            elif any(word in symptom_text for word in ["stomach", "nausea", "diarrhea"]):
                return "gastroenterology"
            elif any(word in symptom_text for word in ["headache", "dizziness"]):
                return "neurology"
            else:
                return "general_practice"
    
    def _calculate_age(self, date_of_birth: str) -> str:
        """Calculate age from date of birth string"""
        try:
            from datetime import datetime
            dob = datetime.strptime(date_of_birth, "%Y-%m-%d")
            today = datetime.today()
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            return f"{age} years"
        except:
            return "Not provided"
    
    def get_user_reports(self, patient_id: str) -> List:
        """Get all reports for a patient"""
        return self.report_repo.get_by_patient(patient_id)
    
    def get_report(self, report_id: str, patient_id: str):
        """Get a specific report"""
        report = self.report_repo.get(report_id)
        
        if not report:
            raise NotFoundError("Report not found")
        
        if report.patient_id != patient_id:
            raise ValidationError("Access denied")
        
        return report
    
    def update_report(
        self,
        report_id: str,
        patient_id: str,
        update_data: ReportUpdate
    ):
        """Update a report"""
        report = self.report_repo.get(report_id)
        
        if not report:
            raise NotFoundError("Report not found")
        
        if report.patient_id != patient_id:
            raise ValidationError("Access denied")
        
        return self.report_repo.update(report_id, update_data.dict(exclude_unset=True))
    
    def delete_report(self, report_id: str, patient_id: str):
        """Delete a report"""
        report = self.report_repo.get(report_id)
        
        if not report:
            raise NotFoundError("Report not found")
        
        if report.patient_id != patient_id:
            raise ValidationError("Access denied")
        
        self.report_repo.delete(report_id)
    
    def _get_patient_context(self, patient_id: str) -> Dict:
        """Gather comprehensive patient context for AI personalization"""
        from repositories.user import UserRepository
        from repositories.ehr import EHRRepository
        
        context = {
            "patient_info": {},
            "medical_history": {},
            "previous_encounters": [],
            "recent_symptoms": []
        }
        
        # Get patient demographic information
        user_repo = UserRepository(self.report_repo.db)
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
        
        # Get EHR medical history
        try:
            ehr_repo = EHRRepository(self.report_repo.db)
            ehr = ehr_repo.get_by_patient(patient_id)
            
            if ehr:
                context["medical_history"] = {
                    "blood_type": ehr.blood_type or "Unknown",
                    "height": ehr.height or "Not recorded",
                    "weight": ehr.weight or "Not recorded",
                    "chronic_conditions": ehr.chronic_conditions or [],
                    "allergies": ehr.allergies or [],
                    "current_medications": ehr.medications or [],
                    "immunizations": ehr.immunizations or []
                }
        except:
            context["medical_history"] = {
                "chronic_conditions": [],
                "allergies": [],
                "current_medications": [],
                "immunizations": []
            }
        
        # Get previous encounters (last 5)
        try:
            recent_encounters = self.encounter_repo.get_by_patient(patient_id, skip=0, limit=5)
            
            for encounter in recent_encounters:
                context["previous_encounters"].append({
                    "date": encounter.encounter_date.strftime("%Y-%m-%d") if encounter.encounter_date else "Unknown",
                    "chief_complaint": encounter.chief_complaint or "Not recorded",
                    "assessment": encounter.assessment[:200] + "..." if encounter.assessment and len(encounter.assessment) > 200 else encounter.assessment or "",
                    "doctor_notes": encounter.doctor_notes[:200] + "..." if encounter.doctor_notes and len(encounter.doctor_notes) > 200 else encounter.doctor_notes or ""
                })
        except:
            context["previous_encounters"] = []
        
        # Get recent symptoms from previous reports
        try:
            recent_reports = self.report_repo.get_by_patient(patient_id, skip=0, limit=3)
            
            for report in recent_reports:
                if report.status == "completed" and report.chief_complaint:
                    context["recent_symptoms"].append({
                        "date": report.created_at.strftime("%Y-%m-%d") if report.created_at else "Unknown",
                        "complaint": report.chief_complaint,
                        "severity": report.severity_level or "Not assessed"
                    })
        except:
            context["recent_symptoms"] = []
        
        return context
    
    def _generate_personalized_first_question(self, patient_context: Dict) -> str:
        """Generate a personalized first question using patient context"""
        try:
            # Use MedGemma to generate personalized greeting and first question
            return self.medgemma.generate_personalized_greeting(patient_context)
        except Exception as e:
            # Fallback to basic personalized greeting
            name = patient_context.get("patient_info", {}).get("name", "")
            if name and name != "Patient":
                return f"Hello {name}! What brings you in today? I see from your records that we're here to help. Please tell me about your main health concern."
            else:
                return "Hello! What is your main health concern or symptom that brings you here today?"
    
    def _generate_next_question_with_redis(
        self,
        session_id: str,
        qa_history: List[Dict],
        patient_context: Dict,
        question_number: int
    ) -> str:
        """Generate next question using Redis session context and vector search"""
        
        print(f"[SYMPTOM ASSESSMENT REDIS] Generating question #{question_number + 1} for session: {session_id}")
        
        # Get all messages from Redis for this session
        redis_messages = self.redis.get_messages(session_id, limit=100)
        
        print(f"[SYMPTOM ASSESSMENT REDIS] Retrieved {len(redis_messages)} messages from Redis")
        
        # If we have previous context, use vector search to find similar topics
        # This helps avoid asking the same thing twice
        relevant_context = []
        if redis_messages and question_number > 1:
            # Get the last answer to understand what we just learned
            last_answer = qa_history[-1].get("answer", "") if qa_history else ""
            
            if last_answer:
                # Generate embedding for the last answer
                answer_embedding = self._get_embedding(last_answer)
                
                # Search for similar previous exchanges
                similar_messages = self.redis.search_similar_messages(
                    session_id, answer_embedding, top_k=3
                )
                
                if similar_messages:
                    print(f"[SYMPTOM ASSESSMENT REDIS] Found {len(similar_messages)} similar previous exchanges")
                    relevant_context = [
                        {
                            "question": msg.get("question", ""),
                            "answer": msg.get("answer", ""),
                            "similarity": msg.get("similarity", 0)
                        }
                        for msg in similar_messages
                        if msg.get("similarity", 0) > 0.7  # Only highly relevant context
                    ]
        
        # Use MedGemma with enhanced context from Redis
        try:
            question = self.medgemma.generate_symptom_question(
                session_id=session_id,
                conversation_history=qa_history,
                question_count=question_number + 1,
                patient_context=patient_context
            )
            
            print(f"[SYMPTOM ASSESSMENT REDIS] Generated question: {question}")
            return question
            
        except Exception as e:
            print(f"[SYMPTOM ASSESSMENT REDIS] Error generating question: {e}")
            # Fallback
            return self._generate_next_question(qa_history, [], patient_context)
