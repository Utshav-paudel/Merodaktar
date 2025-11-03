# app/subapps/medical_chat/chat.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import os
import uuid
import re
from ..login_verification.auth import get_current_user
from dotenv import load_dotenv
router = APIRouter(prefix="/medical", tags=["medical_chat"])
load_dotenv()

# OpenAI configuration
from openai import OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Storage for medical consultations
medical_consultations = {}

# Medical AI System Prompts
MEDICAL_SYSTEM_PROMPT = """You are a HIPAA-compliant medical assistant for MeroDaktar clinic.

CAPABILITIES:
- Provide preliminary health assessments based on symptoms
- Offer general medical information and health advice
- Suggest appropriate specialists based on symptoms
- Communicate in both English and Nepali
- Provide emergency guidance when needed

LIMITATIONS:
- Never provide definitive diagnoses
- Always recommend consulting healthcare providers
- Flag emergency situations immediately
- Maintain patient confidentiality

Response Format:
1. Symptom Analysis: Summarize the symptoms described
2. Possible Conditions: List potential conditions (with clear disclaimers)
3. Urgency Level: Assess as routine/moderate/urgent/emergency
4. Immediate Actions: What to do right now
5. Medical Consultation: When and what type of doctor to see
6. Warning Signs: Symptoms that require immediate emergency care

Always end with: "This is not a medical diagnosis. Please consult a healthcare provider for proper medical evaluation."

For Nepali responses, translate the entire response maintaining the same structure."""

EMERGENCY_ASSESSMENT_PROMPT = """Based on these symptoms: {symptoms}

Assess if this is an emergency situation. Consider:
- Life-threatening conditions
- Time-sensitive medical issues
- Severe pain or distress
- Risk of permanent damage

Provide a clear YES/NO for emergency status and explain why."""

# Pydantic models
class ChatMessage(BaseModel):
    message: str
    language: str = "en"
    context: Optional[List[Dict]] = None

class ChatResponse(BaseModel):
    response: str
    urgency_level: str
    recommendations: List[str]
    record_id: str
    consultation_saved: bool
    emergency_flag: bool = False
    suggested_specialists: List[str] = []

class ConsultationHistory(BaseModel):
    consultations: List[Dict]
    total_count: int

class SymptomAnalysis(BaseModel):
    symptoms: List[str]
    duration: Optional[str] = None
    severity: str
    associated_symptoms: List[str] = []

# Helper functions
def sanitize_phi(text: str) -> str:
    """Remove Protected Health Information from text"""
    patterns = [
        (r'\b\d{10}\b', '[PHONE]'),  # Phone numbers
        (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]'),  # Emails
        (r'\b\d{1,2}/\d{1,2}/\d{4}\b', '[DATE]'),  # Dates
        (r'\b\d{3}-\d{2}-\d{4}\b', '[SSN]'),  # SSN
        (r'\b\d{5}[-\s]?\d{4}\b', '[ZIP]'),  # Zip codes
    ]
    
    sanitized = text
    for pattern, replacement in patterns:
        sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)
    
    return sanitized

def extract_symptoms(message: str) -> List[str]:
    """Extract symptoms from the message"""
    symptom_keywords = [
        "fever", "headache", "pain", "cough", "cold", "fatigue", "nausea",
        "vomiting", "diarrhea", "rash", "swelling", "dizziness", "weakness",
        "bleeding", "breathing", "chest", "stomach", "throat", "ear"
    ]
    
    message_lower = message.lower()
    found_symptoms = []
    
    for symptom in symptom_keywords:
        if symptom in message_lower:
            found_symptoms.append(symptom)
    
    return found_symptoms

def assess_urgency(message: str, ai_assessment: str = "") -> tuple[str, bool]:
    """Assess urgency level and emergency status"""
    message_lower = message.lower()
    combined_text = (message + " " + ai_assessment).lower()
    
    # Emergency conditions - require immediate attention
    emergency_patterns = [
        "chest pain", "heart attack", "stroke", "can't breathe", "cannot breathe",
        "severe bleeding", "unconscious", "unresponsive", "seizure", "convulsion",
        "severe allergic", "anaphylaxis", "suicide", "overdose", "poisoning",
        "severe burn", "major trauma", "severe head injury"
    ]
    
    # Urgent conditions - need attention within hours
    urgent_patterns = [
        "high fever", "severe pain", "difficulty breathing", "persistent vomiting",
        "dehydration", "severe headache", "broken bone", "deep cut", "burn",
        "allergic reaction", "blood in vomit", "blood in stool", "severe diarrhea"
    ]
    
    # Moderate conditions - need attention within 1-2 days
    moderate_patterns = [
        "fever", "moderate pain", "persistent cough", "infection signs",
        "mild breathing difficulty", "persistent symptoms", "worsening condition"
    ]
    
    # Check for emergency
    for pattern in emergency_patterns:
        if pattern in combined_text:
            return "emergency", True
    
    # Check for urgent
    for pattern in urgent_patterns:
        if pattern in combined_text:
            return "urgent", False
    
    # Check for moderate
    for pattern in moderate_patterns:
        if pattern in combined_text:
            return "moderate", False
    
    return "routine", False

def get_specialist_recommendations(symptoms: List[str]) -> List[str]:
    """Recommend appropriate specialists based on symptoms"""
    specialist_map = {
        "cardiologist": ["chest pain", "heart", "palpitation", "blood pressure"],
        "neurologist": ["headache", "migraine", "seizure", "numbness", "dizziness"],
        "gastroenterologist": ["stomach", "abdomen", "digestion", "nausea", "vomiting"],
        "pulmonologist": ["breathing", "cough", "lung", "asthma", "respiratory"],
        "dermatologist": ["skin", "rash", "acne", "hair", "nail"],
        "orthopedic": ["bone", "joint", "fracture", "sprain", "back pain"],
        "ent_specialist": ["ear", "nose", "throat", "sinus", "hearing"],
        "psychiatrist": ["anxiety", "depression", "mental", "stress", "sleep"],
        "pediatrician": ["child", "infant", "baby", "toddler"],
        "gynecologist": ["pregnancy", "menstrual", "female"],
        "urologist": ["urinary", "kidney", "bladder", "prostate"]
    }
    
    recommended = set()
    symptoms_text = " ".join(symptoms).lower()
    
    for specialist, keywords in specialist_map.items():
        for keyword in keywords:
            if keyword in symptoms_text:
                recommended.add(specialist.replace("_", " ").title())
                break
    
    if not recommended:
        recommended.add("General Physician")
    
    return list(recommended)

def generate_recommendations(urgency: str, symptoms: List[str], emergency: bool) -> List[str]:
    """Generate actionable recommendations"""
    recommendations = []
    
    if emergency:
        recommendations = [
            "🚨 SEEK IMMEDIATE EMERGENCY CARE",
            "Call emergency services (102 in Nepal) or your local emergency number",
            "Go to the nearest emergency room immediately",
            "Do not drive yourself - have someone drive you or call an ambulance",
            "Bring a list of current medications if possible"
        ]
    elif urgency == "urgent":
        recommendations = [
            "⚠️ Seek medical attention within 2-4 hours",
            "Visit an urgent care center or emergency room",
            "Call your doctor's office for same-day appointment",
            "Monitor symptoms closely - go to ER if they worsen",
            "Keep a written record of symptom progression"
        ]
    elif urgency == "moderate":
        recommendations = [
            "📅 Schedule a doctor's appointment within 24-48 hours",
            "Monitor your symptoms and note any changes",
            "Rest and stay hydrated",
            "Take over-the-counter medications as appropriate",
            "Seek immediate care if symptoms significantly worsen"
        ]
    else:  # routine
        recommendations = [
            "Schedule a routine appointment with your primary care doctor",
            "Continue monitoring your symptoms",
            "Maintain a symptom diary",
            "Practice good self-care (rest, hydration, nutrition)",
            "Consider preventive health measures"
        ]
    
    # Add specific recommendations based on symptoms
    if "fever" in symptoms:
        recommendations.append("Take temperature regularly and record it")
    if "pain" in symptoms:
        recommendations.append("Note pain location, intensity (1-10), and triggers")
    if "breathing" in symptoms:
        recommendations.append("Sit upright and try to remain calm")
    
    return recommendations

# API Routes
@router.post("/chat", response_model=ChatResponse)
async def medical_chat(
    chat_message: ChatMessage,
    current_user: dict = Depends(get_current_user)
):
    """AI-powered medical consultation chat"""
    try:
        print(f"=== MEDICAL CHAT REQUEST ===")
        print(f"User: {current_user['email']}")
        print(f"Message: {chat_message.message}")
        print(f"Language: {chat_message.language}")
        
        # Sanitize input
        sanitized_message = sanitize_phi(chat_message.message)
        
        # Extract symptoms
        symptoms = extract_symptoms(sanitized_message)
        
        # Prepare context for AI
        messages = [
            {"role": "system", "content": MEDICAL_SYSTEM_PROMPT},
            {"role": "user", "content": f"[Language: {chat_message.language}]\n{sanitized_message}"}
        ]
        
        # Add context if provided
        if chat_message.context:
            for ctx in chat_message.context[-3:]:  # Last 3 messages for context
                messages.append(ctx)
        
        # Get AI response
        try:
            response = client.chat.completions.create(
                model="gpt-4-turbo-preview",  # Updated model name
                messages=messages,
                temperature=0.3,  # Low temperature for medical accuracy
                max_tokens=600,
                presence_penalty=0.1,
                frequency_penalty=0.1
            )
            
            ai_response = response.choices[0].message.content
        except Exception as api_error:
            print(f"OpenAI API Error: {api_error}")
            # Fallback response if OpenAI is unavailable
            ai_response = f"""Based on your message: "{sanitized_message}"

I'm experiencing technical difficulties with the AI service right now. Here's some general guidance:

1. **Symptom Analysis**: I understand you're experiencing some health concerns.

2. **Immediate Actions**: 
   - If you're experiencing severe symptoms, please contact emergency services immediately
   - For non-urgent issues, consider scheduling an appointment with your healthcare provider

3. **Medical Consultation**: Please consult with a qualified healthcare provider for proper medical evaluation and treatment.

4. **Emergency Warning**: Seek immediate medical attention if you experience:
   - Difficulty breathing
   - Chest pain
   - Severe abdominal pain
   - Signs of stroke (sudden weakness, speech difficulties, facial drooping)
   - High fever with severe symptoms

This is not a medical diagnosis. Please consult a healthcare provider for proper medical evaluation."""
        
        # Assess urgency and emergency status
        urgency, is_emergency = assess_urgency(sanitized_message, ai_response)
        
        # Get specialist recommendations
        specialists = get_specialist_recommendations(symptoms)
        
        # Generate recommendations
        recommendations = generate_recommendations(urgency, symptoms, is_emergency)
        
        # Create consultation record
        record_id = str(uuid.uuid4())
        consultation_record = {
            "record_id": record_id,
            "patient_email": current_user["email"],
            "patient_name": current_user["full_name"],
            "consultation_date": datetime.utcnow().isoformat(),
            "symptoms": symptoms,
            "raw_message": sanitized_message,
            "ai_assessment": ai_response,
            "urgency_level": urgency,
            "emergency_flag": is_emergency,
            "recommendations": recommendations,
            "suggested_specialists": specialists,
            "language": chat_message.language
        }
        
        # Store consultation
        email = current_user["email"]
        if email not in medical_consultations:
            medical_consultations[email] = []
        medical_consultations[email].append(consultation_record)
        
        return ChatResponse(
            response=ai_response,
            urgency_level=urgency,
            recommendations=recommendations,
            record_id=record_id,
            consultation_saved=True,
            emergency_flag=is_emergency,
            suggested_specialists=specialists
        )
        
    except Exception as e:
        print(f"Medical chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Consultation failed: {str(e)}")

@router.get("/consultations", response_model=ConsultationHistory)
async def get_consultation_history(
    current_user: dict = Depends(get_current_user),
    limit: int = 10,
    offset: int = 0
):
    """Get user's medical consultation history"""
    email = current_user["email"]
    user_consultations = medical_consultations.get(email, [])
    
    # Sort by date (most recent first)
    user_consultations.sort(key=lambda x: x["consultation_date"], reverse=True)
    
    # Apply pagination
    paginated = user_consultations[offset:offset + limit]
    
    return ConsultationHistory(
        consultations=paginated,
        total_count=len(user_consultations)
    )

@router.get("/consultation/{record_id}")
async def get_consultation_detail(
    record_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific consultation details"""
    email = current_user["email"]
    user_consultations = medical_consultations.get(email, [])
    
    for consultation in user_consultations:
        if consultation["record_id"] == record_id:
            return consultation
    
    raise HTTPException(status_code=404, detail="Consultation record not found")

@router.post("/analyze-symptoms", response_model=SymptomAnalysis)
async def analyze_symptoms(
    message: str,
    current_user: dict = Depends(get_current_user)
):
    """Analyze symptoms from user message"""
    symptoms = extract_symptoms(message)
    
    # Determine severity based on keywords
    severity = "mild"
    if any(word in message.lower() for word in ["severe", "extreme", "unbearable", "worst"]):
        severity = "severe"
    elif any(word in message.lower() for word in ["moderate", "persistent", "continuous"]):
        severity = "moderate"
    
    # Extract duration if mentioned
    duration = None
    duration_patterns = [
        r"(\d+)\s*(days?|weeks?|months?|hours?)",
        r"since\s*(yesterday|today|last\s*week)"
    ]
    
    for pattern in duration_patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            duration = match.group(0)
            break
    
    return SymptomAnalysis(
        symptoms=symptoms,
        duration=duration,
        severity=severity,
        associated_symptoms=[]
    )

@router.post("/emergency-check")
async def check_emergency_status(
    symptoms: str,
    current_user: dict = Depends(get_current_user)
):
    """Quick emergency assessment"""
    urgency, is_emergency = assess_urgency(symptoms)
    
    response_message = ""
    if is_emergency:
        response_message = "⚠️ EMERGENCY DETECTED: Seek immediate medical attention!"
    elif urgency == "urgent":
        response_message = "This appears to be urgent. Please see a doctor as soon as possible."
    else:
        response_message = "Not an emergency, but monitor your symptoms and consult a doctor if they worsen."
    
    return {
        "is_emergency": is_emergency,
        "urgency_level": urgency,
        "message": response_message,
        "emergency_contacts": {
            "nepal_emergency": "102",
            "ambulance": "102",
            "medical_helpline": "1133"
        }
    }

