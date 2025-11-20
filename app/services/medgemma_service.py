import logging
from typing import List, Dict, Optional
from openai import OpenAI
from config.settings import get_settings
from services.redis_service import RedisService

logger = logging.getLogger(__name__)
settings = get_settings()


class MedGemmaService:
    """Service for interacting with MedGemma model via Hugging Face with OpenAI fallback"""
    
    def __init__(self, redis: Optional[RedisService] = None):
        # Get AI backend from settings (default to 'openai' for reliable operation)
        self.ai_backend = getattr(settings, 'AI_BACKEND', 'openai').lower()
        logger.info(f"AI Backend configured: {self.ai_backend}")
        
        # Initialize Redis service for question tracking
        self.redis = redis if redis else RedisService()
        
        # Initialize OpenAI client for standard OpenAI API
        try:
            self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info("OpenAI client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
            self.openai_client = None
        
        # Initialize MedGemma client using OpenAI-compatible endpoint
        try:
            # Use environment variables for configuration
            medgemma_base_url = settings.MEDGEMMA_BASE_URL
            medgemma_api_key = settings.MEDGEMMA_API_KEY or settings.HF_TOKEN  # Fallback to HF_TOKEN
            
            if medgemma_api_key:
                self.medgemma_client = OpenAI(
                    base_url=medgemma_base_url,
                    api_key=medgemma_api_key
                )
                logger.info(f"MedGemma client initialized successfully with endpoint: {medgemma_base_url}")
            else:
                logger.warning("MedGemma API key not configured. MedGemma will not be available.")
                self.medgemma_client = None
        except Exception as e:
            logger.error(f"Failed to initialize MedGemma client: {e}")
            self.medgemma_client = None
        
        # Store model name from settings
        self.medgemma_model = settings.MEDGEMMA_MODEL
        
        # Question similarity threshold to detect duplicates
        self.DUPLICATE_THRESHOLD = 0.80  # 80% similarity = likely duplicate
    
    def _get_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using OpenAI"""
        try:
            if not self.openai_client:
                return []
            response = self.openai_client.embeddings.create(
                model="text-embedding-3-small", 
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return []
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
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
    
    def _is_duplicate_question(
        self, 
        session_id: str, 
        new_question: str,
        question_embedding: Optional[List[float]] = None
    ) -> bool:
        """Check if question is too similar to previously asked questions"""
        try:
            # Generate embedding if not provided
            if question_embedding is None:
                question_embedding = self._get_embedding(new_question)
            
            if not question_embedding:
                return False
            
            # Get previous questions from Redis
            questions_key = f"symptom_questions:{session_id}"
            previous_questions = self.redis.get_messages(questions_key, limit=50)
            
            if not previous_questions:
                return False
            
            # Check similarity with each previous question
            for prev_q in previous_questions:
                if "embedding" in prev_q and prev_q["embedding"]:
                    similarity = self._cosine_similarity(
                        question_embedding, 
                        prev_q["embedding"]
                    )
                    
                    if similarity >= self.DUPLICATE_THRESHOLD:
                        logger.warning(
                            f"Duplicate question detected (similarity: {similarity:.2f})\n"
                            f"New: {new_question}\n"
                            f"Previous: {prev_q.get('question', '')}"
                        )
                        return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking duplicate question: {e}")
            return False
    
    def _store_question(self, session_id: str, question: str, embedding: List[float]):
        """Store question with embedding in Redis for duplicate detection"""
        try:
            questions_key = f"symptom_questions:{session_id}"
            question_data = {
                "question": question,
                "timestamp": str(self.redis.client.time()[0])
            }
            
            self.redis.add_message(questions_key, question_data, embedding)
            logger.info(f"Stored question in Redis: {question[:50]}...")
            
        except Exception as e:
            logger.error(f"Error storing question: {e}")
    
    def _generate_with_openai(
        self,
        prompt: str,
        max_tokens: int = 500,
        temperature: float = 0.7,
        system_message: str = None
    ) -> str:
        """Generate text using OpenAI GPT-4o-mini"""
        if not self.openai_client:
            logger.error("OpenAI client not initialized")
            return "I'm having trouble processing your request. Please configure OpenAI API key."
        
        try:
            logger.info("Using OpenAI GPT-4o-mini")
            
            messages = []
            if system_message:
                messages.append({"role": "system", "content": system_message})
            else:
                messages.append({
                    "role": "system", 
                    "content": "You are MedAssist, a professional medical assistant. Follow the instructions carefully. DO NOT repeat questions or ask for information already provided. Be empathetic, concise, and professional."
                })
            
            messages.append({"role": "user", "content": prompt})
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"OpenAI error: {e}")
            return "I'm having trouble processing your request. Please try again."
    
    def _generate_with_medgemma(
        self,
        prompt: str,
        max_tokens: int = 500,
        temperature: float = 0.7
    ) -> str:
        """Generate text using MedGemma via OpenAI-compatible endpoint"""
        if not self.medgemma_client:
            logger.error("MedGemma client not initialized")
            return None
        
        try:
            logger.info(f"Attempting MedGemma request: {prompt[:100]}...")
            
            response = self.medgemma_client.chat.completions.create(
                model=self.medgemma_model,  # Use model from settings
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=max_tokens,
                temperature=temperature
            )
            
            generated_text = response.choices[0].message.content.strip()
            logger.info(f"MedGemma response successful")
            
            if generated_text:
                return generated_text
            else:
                logger.warning("MedGemma returned empty response, falling back to OpenAI")
                return None
                
        except Exception as e:
            logger.error(f"MedGemma error: {e}")
            return None
    
    def generate_text(
        self, 
        prompt: str, 
        max_tokens: int = 500,
        temperature: float = 0.7,
        system_message: str = None,
        use_medgemma: bool = None
    ) -> str:
        """
        Generate text response - uses AI_BACKEND setting or use_medgemma parameter
        
        Args:
            prompt: The input prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            system_message: Optional system message for OpenAI
            use_medgemma: Override backend choice (True=MedGemma, False=OpenAI, None=use setting)
        """
        # Determine which backend to use
        if use_medgemma is None:
            # Use setting
            use_medgemma = self.ai_backend != 'openai'
        
        # Try MedGemma if requested
        if use_medgemma:
            logger.info("Using MedGemma backend")
            result = self._generate_with_medgemma(prompt, max_tokens, temperature)
            if result:
                return result
            logger.warning("MedGemma failed, falling back to OpenAI")
        
        # Use OpenAI (either as primary or fallback)
        logger.info("Using OpenAI backend")
        return self._generate_with_openai(prompt, max_tokens, temperature, system_message)
    
    def _build_standard_system_prompt(
        self,
        patient_context: Optional[Dict] = None,
        conversation_history: List[Dict] = None,
        task_type: str = "symptom_interview"
    ) -> str:
        """Build standardized system prompt with patient context"""
        
        # Base prompt by task type
        if task_type == "symptom_interview":
            base_prompt = """You are a caring, professional medical assistant conducting a symptom interview.

CRITICAL RULES - READ CAREFULLY:
1. Ask ONLY ONE question at a time (maximum 20 words)
2. NEVER ask about information that has ALREADY been discussed
3. Review the "CONVERSATION SO FAR" section below - this is what you ALREADY KNOW
4. Your next question must explore a COMPLETELY NEW topic not covered before
5. Be empathetic and professional
6. Focus on unexplored areas: location, triggers, patterns, associated symptoms, impact on daily life
7. After 10-12 comprehensive questions covering different aspects, conclude the interview

FORBIDDEN - DO NOT ASK ABOUT:
- Anything already answered in the conversation below
- Timing/onset if already asked
- Severity/intensity if already rated
- Symptoms if already described"""
        elif task_type == "report_generation":
            base_prompt = """You are a professional medical assistant generating a clinical report.
Be concise, accurate, and use proper medical terminology."""
        elif task_type == "assessment":
            base_prompt = """You are a medical AI assistant performing clinical assessment.
Be objective and base your assessment on the provided information."""
        else:
            base_prompt = "You are MedAssist, a professional medical assistant."
        
        # Add patient context if available
        context_parts = [base_prompt]
        
        if patient_context:
            context_summary = self._format_patient_context(patient_context)
            if context_summary:
                context_parts.append(f"\nPATIENT CONTEXT:\n{context_summary}")
                context_parts.append(
                    "\nIMPORTANT: DO NOT ask about information already in the patient context "
                    "(age, gender, chronic conditions, allergies, current medications)."
                )
        
        # Add conversation history for symptom interviews
        if task_type == "symptom_interview" and conversation_history:
            # Build detailed conversation summary
            conversation_summary = "\n\n=== CONVERSATION SO FAR (DO NOT REPEAT THESE TOPICS) ===\n"
            
            for i, qa in enumerate(conversation_history, 1):
                conversation_summary += f"\n{i}. Q: {qa['question']}\n   A: {qa['answer']}\n"
            
            context_parts.append(conversation_summary)
            
            # Extract and list asked topics explicitly
            asked_topics = self._extract_asked_topics(conversation_history)
            if asked_topics and asked_topics != "None yet":
                context_parts.append(f"\n=== TOPICS ALREADY COVERED - NEVER ASK AGAIN ===\n{asked_topics}")
            
            # Add explicit instruction about what to ask next
            context_parts.append(f"\n\n=== YOUR TASK ===")
            context_parts.append(f"This is question #{len(conversation_history) + 1}.")
            context_parts.append("Based on the conversation above, ask about a COMPLETELY NEW aspect not yet discussed.")
            context_parts.append("Examples of unexplored areas: specific triggers, time of day patterns, associated symptoms, family history, recent changes, impact on daily activities.")
        
        return "\n".join(context_parts)
    
    def _format_patient_context(self, patient_context: Dict) -> str:
        """Format patient context into readable summary"""
        parts = []
        
        patient_info = patient_context.get("patient_info", {})
        if patient_info.get("name"):
            demo = f"Patient: {patient_info['name']}"
            if patient_info.get("age"):
                demo += f", {patient_info['age']}"
            if patient_info.get("gender"):
                demo += f", {patient_info['gender']}"
            parts.append(demo)
        
        medical_history = patient_context.get("medical_history", {})
        
        # Chronic conditions
        chronic = medical_history.get("chronic_conditions", [])
        if chronic:
            conditions = []
            for c in chronic:
                if isinstance(c, dict):
                    conditions.append(c.get("condition") or c.get("name", ""))
                else:
                    conditions.append(str(c))
            if conditions:
                parts.append(f"Chronic Conditions: {', '.join(conditions)}")
        
        # Allergies
        allergies = medical_history.get("allergies", [])
        if allergies:
            allergy_list = []
            for a in allergies:
                if isinstance(a, dict):
                    allergy_list.append(a.get("allergen") or a.get("name", ""))
                else:
                    allergy_list.append(str(a))
            if allergy_list:
                parts.append(f"Known Allergies: {', '.join(allergy_list)}")
        
        # Medications
        medications = medical_history.get("current_medications", [])
        if medications:
            med_list = []
            for m in medications:
                if isinstance(m, dict) and m.get("name"):
                    med_list.append(m["name"])
                elif isinstance(m, str):
                    med_list.append(m)
            if med_list:
                parts.append(f"Current Medications: {', '.join(med_list)}")
        
        # Recent encounters
        previous_encounters = patient_context.get("previous_encounters", [])
        if previous_encounters:
            parts.append("\nRecent Medical History:")
            for enc in previous_encounters[:2]:
                parts.append(
                    f"- {enc.get('date', 'Date unknown')}: "
                    f"{enc.get('chief_complaint', 'No complaint recorded')}"
                )
        
        return "\n".join(parts) if parts else ""
    
    def _extract_asked_topics(self, conversation_history: List[Dict]) -> str:
        """Extract topics already covered in conversation"""
        asked_topics = []
        answers_summary = []
        
        for i, qa in enumerate(conversation_history):
            question_lower = qa['question'].lower()
            answer_lower = qa['answer'].lower()
            
            # Track specific topics
            if any(keyword in question_lower for keyword in ['when', 'start', 'how long', 'began', 'first notice']):
                asked_topics.append(f"- ❌ Onset/timing already asked: \"{qa['answer'][:50]}...\"")
            if any(keyword in question_lower for keyword in ['severe', 'scale', 'rate', 'intensity', 'how bad']):
                asked_topics.append(f"- ❌ Severity already asked: \"{qa['answer'][:50]}...\"")
            if any(keyword in question_lower for keyword in ['where', 'location', 'which part']):
                asked_topics.append(f"- ❌ Location already asked: \"{qa['answer'][:50]}...\"")
            if any(keyword in question_lower for keyword in ['what symptom', 'other symptom', 'additional', 'else experiencing', 'specific symptom']):
                asked_topics.append(f"- ❌ Symptoms already described: \"{qa['answer'][:50]}...\"")
            if any(keyword in question_lower for keyword in ['better', 'worse', 'aggravat', 'reliev', 'improve']):
                asked_topics.append(f"- ❌ Modifying factors already asked")
            if any(keyword in question_lower for keyword in ['medication', 'medicine', 'treatment', 'tried', 'taking']):
                asked_topics.append(f"- ❌ Medications already asked")
            if any(keyword in question_lower for keyword in ['medical condition', 'health condition', 'chronic']):
                asked_topics.append(f"- ❌ Medical history already asked")
            if 'allerg' in question_lower:
                asked_topics.append(f"- ❌ Allergies already asked")
            if 'travel' in question_lower:
                asked_topics.append(f"- ❌ Travel history already asked")
            if any(keyword in question_lower for keyword in ['contact', 'exposure', 'around someone']):
                asked_topics.append(f"- ❌ Exposure/contact already asked")
            if any(keyword in question_lower for keyword in ['last', 'occur', 'episode', 'duration']):
                asked_topics.append(f"- ❌ Duration/frequency already asked")
        
        # Add a summary of key facts learned
        if conversation_history:
            answers_summary.append("\n=== KEY FACTS ALREADY LEARNED ===")
            for i, qa in enumerate(conversation_history, 1):
                # Keep first 100 chars of answer
                answer_text = qa['answer'][:100] + ("..." if len(qa['answer']) > 100 else "")
                answers_summary.append(f"{i}. {answer_text}")
        
        result = "\n".join(asked_topics) if asked_topics else ""
        if answers_summary:
            result += "\n" + "\n".join(answers_summary)
        
        return result if result else "None yet"
    
    def generate_symptom_question(
        self,
        session_id: str,
        conversation_history: List[Dict],
        question_count: int,
        patient_context: Optional[Dict] = None,
        max_retries: int = 3,
    
    ) -> str:
        """Generate next symptom interview question with duplicate prevention"""
        
        # Simple base system message
        system_message = """You are a medical assistant conducting a symptom interview. 
Rules:
1. Ask ONE question at a time (under 20 words)
2. NEVER repeat questions or topics already discussed
3. Review the conversation history carefully
4. Ask about completely new aspects
5. Be empathetic and professional"""
        
        # Generate question with retry logic for duplicates
        for attempt in range(max_retries):
            # Build a clear, simple prompt with full conversation
            if conversation_history:
                # Build conversation history explicitly
                conversation_text = "CONVERSATION SO FAR:\n\n"
                for i, qa in enumerate(conversation_history, 1):
                    conversation_text += f"Q{i}: {qa['question']}\n"
                    conversation_text += f"A{i}: {qa['answer']}\n\n"
                
                # List what has been covered
                covered_topics = []
                for qa in conversation_history:
                    q_lower = qa['question'].lower()
                    if any(k in q_lower for k in ['when', 'start', 'how long']):
                        covered_topics.append("timing/onset")
                    if any(k in q_lower for k in ['severe', 'scale', 'rate']):
                        covered_topics.append("severity")
                    if any(k in q_lower for k in ['trigger', 'worsen', 'worse', 'better']):
                        covered_topics.append("triggers/modifying factors")
                    if any(k in q_lower for k in ['appetite', 'eating', 'food']):
                        covered_topics.append("appetite")
                    if any(k in q_lower for k in ['energy', 'tired', 'fatigue']):
                        covered_topics.append("energy levels")
                    if any(k in q_lower for k in ['pattern', 'time of day']):
                        covered_topics.append("time patterns")
                
                topics_covered = ", ".join(set(covered_topics)) if covered_topics else "none"
                
                # Suggest unexplored areas
                unexplored = [
                    "duration of symptoms",
                    "location/radiation of pain",
                    "associated symptoms not yet mentioned",
                    "previous similar episodes",
                    "medications tried",
                    "impact on sleep or work",
                    "family history",
                    "recent travel or exposures"
                ]
                
                prompt = f"""{conversation_text}

Topics already covered: {topics_covered}

Unexplored areas: {', '.join(unexplored)}

IMPORTANT: Generate question #{question_count} that explores a COMPLETELY NEW topic not covered above. 
Ask about a different aspect of their symptoms. Be specific and concise (under 20 words).

Question #{question_count}:"""
            else:
                prompt = "Generate a warm, professional opening question asking about the patient's main health concern (under 20 words):\n\nQuestion:"
            
            # Generate question
            question = self.generate_text(
                prompt, 
                max_tokens=100, 
                temperature=0.7 + (attempt * 0.1), # Increase temperature on retries
                system_message=system_message,
                use_medgemma=True
            )
            
            # Clean up the question
            question = question.strip()
            # Remove common prefixes
            for prefix in ["Q:", "Question:", f"Q{question_count}:", f"Question {question_count}:"]:
                if question.startswith(prefix):
                    question = question[len(prefix):].strip()
            
            # Generate embedding
            question_embedding = self._get_embedding(question)
            
            # Check if duplicate
            is_duplicate = self._is_duplicate_question(
                session_id, 
                question, 
                question_embedding
            )
            
            if not is_duplicate:
                # Store the question for future duplicate detection
                if question_embedding:
                    self._store_question(session_id, question, question_embedding)
                logger.info(f"Generated unique question #{question_count}: {question}")
                return question
            
            logger.warning(f"Duplicate detected on attempt {attempt + 1}/{max_retries}, retrying with higher temperature...")
        
        # If all retries failed, conclude the interview
        logger.error("Failed to generate unique question after retries - concluding interview")
        return "Thank you for providing that information. I have enough details to create your assessment."
    
    def generate_personalized_greeting(self, patient_context: Dict) -> str:
        """Generate a personalized greeting and first question"""
        
        system_prompt = self._build_standard_system_prompt(
            patient_context=patient_context,
            task_type="symptom_interview"
        )
        
        prompt = f"""{system_prompt}

Generate a warm, professional greeting (1-2 sentences) that:
1. Welcomes the patient by name if available
2. Shows awareness of their medical history if relevant
3. Asks about their main health concern today

Keep it brief, warm, and professional.

Greeting:"""
        
        return self.generate_text(prompt, max_tokens=80, temperature=0.8)
    
    def extract_symptoms(self, qa_history: List[Dict]) -> List[str]:
        """Extract symptoms from Q&A history"""
        
        system_prompt = """You are a medical AI assistant. Extract ONLY the symptoms mentioned by the patient.
List each symptom as a brief phrase, one per line. Be specific and concise."""
        
        prompt = "Analyze this medical interview and extract the symptoms:\n\n"
        for qa in qa_history:
            prompt += f"Q: {qa['question']}\nA: {qa['answer']}\n"
        
        prompt += "\nExtracted symptoms (one per line, no numbering or bullets):"
        
        response = self.generate_text(
            prompt, 
            max_tokens=200, 
            temperature=0.3,
            system_message=system_prompt
        )
        
        # Parse symptoms from response
        symptoms = []
        for line in response.split('\n'):
            cleaned = line.strip().lstrip('0123456789.-) ')
            if cleaned and len(cleaned) > 2:
                symptoms.append(cleaned)
        
        return symptoms[:10]  # Limit to 10 symptoms
    
    def generate_medical_report(
        self,
        chief_complaint: str,
        qa_history: List[Dict],
        symptoms: List[str]
    ) -> str:
        """Generate medical report from interview"""
        
        system_prompt = self._build_standard_system_prompt(
            task_type="report_generation"
        )
        
        prompt = f"""Generate a concise medical report based on this symptom interview.

Chief Complaint: {chief_complaint}

Identified Symptoms: {', '.join(symptoms)}

Interview Q&A:
"""
        for qa in qa_history:
            prompt += f"Q: {qa['question']}\nA: {qa['answer']}\n"
        
        prompt += """\nGenerate a medical report with these sections:
1. Chief Complaint
2. History of Present Illness
3. Symptoms Summary
4. Severity Assessment (mild/moderate/severe)
5. Recommended Next Steps

Report:"""
        
        return self.generate_text(
            prompt, 
            max_tokens=800, 
            temperature=0.3,
            system_message=system_prompt
        )
    
    def assess_severity(
        self,
        chief_complaint: str,
        symptoms: List[str]
    ) -> str:
        """Assess symptom severity"""
        
        system_prompt = self._build_standard_system_prompt(task_type="assessment")
        
        prompt = f"""Assess the severity level of these symptoms.

Chief Complaint: {chief_complaint}
Symptoms: {', '.join(symptoms)}

Respond with ONLY ONE WORD from: mild, moderate, severe, emergency

Severity:"""
        
        response = self.generate_text(
            prompt, 
            max_tokens=10, 
            temperature=0.1,
            system_message=system_prompt
        )
        
        # Extract severity level
        severity = response.lower().strip()
        valid_severities = ['mild', 'moderate', 'severe', 'emergency']
        
        for valid in valid_severities:
            if valid in severity:
                return valid
        
        return 'moderate'  # Default
    
    def recommend_specialization(
        self,
        chief_complaint: str,
        symptoms: List[str]
    ) -> str:
        """Recommend medical specialization"""
        
        system_prompt = self._build_standard_system_prompt(task_type="assessment")
        
        specializations = [
            'general_practice', 'cardiology', 'pulmonology', 'gastroenterology',
            'neurology', 'dermatology', 'orthopedics', 'psychiatry'
        ]
        
        prompt = f"""Recommend the most appropriate medical specialization for these symptoms.

Chief Complaint: {chief_complaint}
Symptoms: {', '.join(symptoms)}

Choose ONE from: {', '.join(specializations)}

Recommended specialization:"""
        
        response = self.generate_text(
            prompt, 
            max_tokens=20, 
            temperature=0.1,
            system_message=system_prompt
        )
        
        # Extract specialization
        response_lower = response.lower().strip()
        for spec in specializations:
            if spec in response_lower:
                return spec
        
        return 'general_practice'  # Default


# Singleton instance
_medgemma_service = None

def get_medgemma_service() -> MedGemmaService:
    """Get MedGemma service instance"""
    global _medgemma_service
    if _medgemma_service is None:
        _medgemma_service = MedGemmaService()
    return _medgemma_service