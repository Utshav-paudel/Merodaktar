#@ appoinment_service.py
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import random
import string

from repositories.appointment import AppointmentRepository
from repositories.doctor import DoctorRepository
from repositories.schedule import TimeSlotRepository
from repositories.encounter import EncounterRepository
from core.exceptions import NotFoundError, ValidationError


class AppointmentService:
    def __init__(self, db: Session):
        self.db = db
        self.appointment_repo = AppointmentRepository(db)
        self.doctor_repo = DoctorRepository(db)
        self.timeslot_repo = TimeSlotRepository(db)
        self.encounter_repo = EncounterRepository(db)

    def _get_patient_ehr_context(self, patient_id: str) -> dict:
        """Get comprehensive patient EHR context"""
        from repositories.ehr import EHRRepository
        from repositories.user import UserRepository
        from repositories.encounter import EncounterRepository
        
        user_repo = UserRepository(self.db)
        ehr_repo = EHRRepository(self.db)
        
        patient = user_repo.get(patient_id)
        ehr = ehr_repo.get_by_patient(patient_id)
        
        # Calculate age
        age = "Not provided"
        if patient and patient.date_of_birth:
            try:
                from datetime import datetime
                dob = datetime.strptime(patient.date_of_birth, "%Y-%m-%d")
                today = datetime.today()
                age = f"{today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))} years"
            except:
                age = "Not provided"
        
        # Build comprehensive patient summary
        patient_summary = {
            "patient_name": patient.full_name if patient else "Unknown",
            "patient_email": patient.email if patient else "",
            "age": age,
            "gender": patient.gender if patient and patient.gender else "Not provided",
            "phone": patient.phone if patient and patient.phone else "Not provided",
            "address": patient.address if patient and patient.address else "Not provided",
            "blood_type": ehr.blood_type if ehr and ehr.blood_type else "Not provided",
            "height": ehr.height if ehr and ehr.height else "Not provided",
            "weight": ehr.weight if ehr and ehr.weight else "Not provided"
        }
        
        # Get medical records from EHR
        vital_signs = []
        medications = []
        allergies = []
        chronic_conditions = []
        
        if ehr:
            # Get latest vital signs (last 3 records)
            if ehr.vital_signs and len(ehr.vital_signs) > 0:
                vital_signs = ehr.vital_signs[-3:] if len(ehr.vital_signs) >= 3 else ehr.vital_signs
            
            # Get current medications
            if ehr.medications:
                medications = ehr.medications
            
            # Get allergies
            if ehr.allergies:
                allergies = ehr.allergies
            
            # Get chronic conditions
            if ehr.chronic_conditions:
                chronic_conditions = ehr.chronic_conditions
        
        return {
            "patient_summary": patient_summary,
            "vital_signs": vital_signs,
            "medications": medications,
            "allergies": allergies,
            "chronic_conditions": chronic_conditions
        }

    @staticmethod
    def generate_confirmation_code() -> str:
        """Generate unique confirmation code"""
        return "".join(
            random.choices(string.ascii_uppercase + string.digits, k=8)
        )

    def create_appointment(
        self,
        patient_id: str,
        doctor_id: str,
        appointment_date: Optional[str] = None,
        appointment_time: Optional[str] = None,
        slot_id: Optional[str] = None,
        encounter_id: Optional[str] = None,  # Link to existing encounter
        **kwargs
    ):
        """Create a new appointment - supports both slot-based and manual booking"""
        # Verify doctor exists
        doctor = self.doctor_repo.get(doctor_id)
        if not doctor:
            raise NotFoundError("Doctor not found")

        if not doctor.is_available:
            raise ValidationError("Doctor is not available")

        # If slot_id is provided, use time slot booking
        if slot_id:
            # Try to get existing slot from database
            time_slot = self.timeslot_repo.get(slot_id)
            
            if time_slot:
                # Slot exists in database, validate it
                if time_slot.is_booked:
                    raise ValidationError("Time slot is already booked")
                
                if time_slot.doctor_id != doctor_id:
                    raise ValidationError("Time slot does not belong to this doctor")
                
                # Extract date and time from existing slot
                appointment_date = time_slot.date
                appointment_time = time_slot.time
            else:
                # Slot doesn't exist in DB (was dynamically generated)
                # Use provided date and time, and create the slot
                if not appointment_date or not appointment_time:
                    raise ValidationError("Time slot requires date and time information")
                
                # Check if a booked slot already exists for this time
                existing_slots = self.timeslot_repo.get_by_doctor_and_date(doctor_id, appointment_date)
                for existing in existing_slots:
                    if existing.time == appointment_time and existing.is_booked:
                        raise ValidationError("Time slot is already booked")
                
                # Create the slot in database with the provided slot_id
                slot_data = {
                    "id": slot_id,
                    "doctor_id": doctor_id,
                    "date": appointment_date,
                    "time": appointment_time,
                    "duration": 30,  # Default duration, can be customized
                    "is_booked": False
                }
                time_slot = self.timeslot_repo.create(slot_data)
        else:
            # Manual booking - require date and time
            if not appointment_date or not appointment_time:
                raise ValidationError("Either slot_id or both appointment_date and appointment_time are required")
            
            # Check for conflicting appointments (for manual booking)
            existing = self.appointment_repo.get_by_date(
                doctor_id, appointment_date
            )
            for apt in existing:
                if apt.appointment_time == appointment_time:
                    raise ValidationError("Time slot already booked")

        # Create appointment
        appointment_data = {
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "appointment_date": appointment_date,
            "appointment_time": appointment_time,
            "slot_id": slot_id,
            "encounter_id": encounter_id,  # Link encounter if provided
            "confirmation_code": self.generate_confirmation_code(),
            "status": "scheduled",
            **kwargs,
        }

        appointment = self.appointment_repo.create(appointment_data)

        # If slot-based booking, mark the slot as booked
        if slot_id:
            self.timeslot_repo.book_slot(slot_id, appointment.id)

        # Increment doctor's consultation count
        self.doctor_repo.increment_consultations(doctor_id)

        # Automatically create an encounter with comprehensive EHR data for this appointment
        if not encounter_id:
            try:
                ehr_context = self._get_patient_ehr_context(patient_id)
                
                # Get latest encounter number
                latest_number = self.encounter_repo.get_latest_encounter_number(patient_id)
                
                # Create encounter with full patient context
                encounter_data = {
                    "patient_id": patient_id,
                    "provider_id": doctor_id,
                    "encounter_type": kwargs.get("appointment_type", "in_person"),
                    "chief_complaint": kwargs.get("reason", "Scheduled appointment"),
                    "symptoms": kwargs.get("symptoms", []),
                    "appointment_id": appointment.id,
                    "encounter_number": (latest_number or 0) + 1,
                    "patient_summary": {
                        **ehr_context["patient_summary"],
                        "vital_signs_history": ehr_context["vital_signs"],
                        "current_medications": ehr_context["medications"],
                        "known_allergies": ehr_context["allergies"],
                        "chronic_conditions": ehr_context["chronic_conditions"]
                    },
                    "vital_signs": ehr_context["vital_signs"][-1] if ehr_context["vital_signs"] else None,
                    "assessment": "",
                    "doctor_notes": "",
                    "ai_preliminary_report": self._format_ehr_summary(ehr_context)
                }
                
                encounter = self.encounter_repo.create(encounter_data)
                
                # Link encounter back to appointment
                self.appointment_repo.update(appointment.id, {"encounter_id": encounter.id})
                appointment.encounter_id = encounter.id
                
            except Exception as e:
                # Log error but don't fail appointment creation
                print(f"Failed to create encounter for appointment: {str(e)}")

        return appointment

    def get_patient_appointments(
        self, patient_id: str, skip: int = 0, limit: int = 100
    ):
        """Get all appointments for a patient"""
        return self.appointment_repo.get_by_patient(patient_id, skip, limit)

    def get_doctor_appointments(
        self, doctor_id: str, skip: int = 0, limit: int = 100
    ):
        """Get all appointments for a doctor"""
        return self.appointment_repo.get_by_doctor(doctor_id, skip, limit)

    def update_appointment(self, appointment_id: str, update_data: dict):
        """Update appointment"""
        appointment = self.appointment_repo.get(appointment_id)
        if not appointment:
            raise NotFoundError("Appointment not found")

        return self.appointment_repo.update(appointment_id, update_data)

    def cancel_appointment(
        self, appointment_id: str, cancellation_reason: str = None
    ):
        """Cancel an appointment and free the time slot"""
        appointment = self.appointment_repo.get(appointment_id)
        if not appointment:
            raise NotFoundError("Appointment not found")
        
        # If this was a slot-based appointment, unbook the slot
        if appointment.slot_id:
            self.timeslot_repo.unbook_slot(appointment.slot_id)
        
        # Update appointment status
        update_data = {
            "status": "cancelled",
            "cancelled_at": datetime.utcnow(),
            "cancellation_reason": cancellation_reason,
        }
        return self.appointment_repo.update(appointment_id, update_data)

    def complete_appointment(
        self,
        appointment_id: str,
        doctor_notes: str = None,
        diagnosis: str = None,
        prescription: str = None,
        follow_up_date: str = None,
        follow_up_required: str = "no",
    ):
        """Mark appointment as completed with details"""
        # Get the appointment
        appointment = self.appointment_repo.get(appointment_id)
        if not appointment:
            raise NotFoundError("Appointment not found")
        
        # Update appointment
        update_data = {
            "status": "completed",
            "doctor_notes": doctor_notes,
            "diagnosis": diagnosis,
            "prescription": prescription,
            "follow_up_date": follow_up_date,
            "follow_up_required": follow_up_required,
        }
        updated_appointment = self.appointment_repo.update(appointment_id, update_data)
        
        # If this appointment is linked to an encounter, update the encounter with doctor notes
        if appointment.encounter_id and doctor_notes:
            encounter = self.encounter_repo.get(appointment.encounter_id)
            if encounter:
                # Format doctor notes with appointment details
                formatted_notes = f"""
=== Doctor's Clinical Notes ===
Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}
Appointment: {appointment.confirmation_code}

{doctor_notes}

Diagnosis: {diagnosis or 'Not specified'}
Prescription: {prescription or 'None'}
Follow-up Required: {follow_up_required}
"""
                if follow_up_date:
                    formatted_notes += f"Follow-up Date: {follow_up_date}\n"
                
                # Update encounter with doctor notes
                self.encounter_repo.update(appointment.encounter_id, {
                    "doctor_notes": formatted_notes
                })
        
        return updated_appointment

    def confirm_appointment(self, appointment_id: str):
        """Confirm an appointment"""
        return self.appointment_repo.update_status(appointment_id, "confirmed")

    def _format_ehr_summary(self, ehr_context: dict) -> str:
        """Format comprehensive EHR summary for encounter report"""
        summary_parts = []
        
        # Patient demographics
        ps = ehr_context["patient_summary"]
        summary_parts.append(f"=== PATIENT INFORMATION ===")
        summary_parts.append(f"Name: {ps['patient_name']}")
        summary_parts.append(f"Age: {ps['age']}")
        summary_parts.append(f"Gender: {ps['gender']}")
        summary_parts.append(f"Blood Type: {ps.get('blood_type', 'Not provided')}")
        if ps.get('height') or ps.get('weight'):
            summary_parts.append(f"Height: {ps.get('height', 'N/A')} | Weight: {ps.get('weight', 'N/A')}")
        
        # Allergies (CRITICAL)
        if ehr_context["allergies"]:
            summary_parts.append(f"\n⚠️ === ALLERGIES (CRITICAL) ===")
            for allergy in ehr_context["allergies"]:
                allergy_name = allergy.get('allergen', allergy.get('name', 'Unknown'))
                reaction = allergy.get('reaction', 'Not specified')
                severity = allergy.get('severity', 'Unknown')
                summary_parts.append(f"• {allergy_name} - {reaction} (Severity: {severity})")
        else:
            summary_parts.append(f"\n=== ALLERGIES ===")
            summary_parts.append("No known allergies")
        
        # Current Medications
        if ehr_context["medications"]:
            summary_parts.append(f"\n=== CURRENT MEDICATIONS ===")
            for med in ehr_context["medications"]:
                med_name = med.get('medication', med.get('name', 'Unknown'))
                dosage = med.get('dosage', 'N/A')
                frequency = med.get('frequency', 'N/A')
                summary_parts.append(f"• {med_name} - {dosage} ({frequency})")
        else:
            summary_parts.append(f"\n=== CURRENT MEDICATIONS ===")
            summary_parts.append("No current medications")
        
        # Chronic Conditions
        if ehr_context["chronic_conditions"]:
            summary_parts.append(f"\n=== CHRONIC CONDITIONS / MEDICAL HISTORY ===")
            for condition in ehr_context["chronic_conditions"]:
                condition_name = condition.get('condition', condition.get('name', 'Unknown'))
                status = condition.get('status', 'active')
                diagnosed = condition.get('diagnosed_date', 'Unknown date')
                summary_parts.append(f"• {condition_name} (Status: {status}, Diagnosed: {diagnosed})")
        else:
            summary_parts.append(f"\n=== CHRONIC CONDITIONS ===")
            summary_parts.append("No chronic conditions recorded")
        
        # Recent Vital Signs
        if ehr_context["vital_signs"]:
            summary_parts.append(f"\n=== RECENT VITAL SIGNS ===")
            for idx, vitals in enumerate(ehr_context["vital_signs"][-3:], 1):  # Last 3 records
                date = vitals.get('recorded_at', 'Unknown date')
                summary_parts.append(f"Record {idx} ({date}):")
                if vitals.get('blood_pressure_systolic'):
                    summary_parts.append(f"  BP: {vitals['blood_pressure_systolic']}/{vitals.get('blood_pressure_diastolic', 'N/A')} mmHg")
                if vitals.get('heart_rate'):
                    summary_parts.append(f"  Heart Rate: {vitals['heart_rate']} bpm")
                if vitals.get('temperature'):
                    summary_parts.append(f"  Temperature: {vitals['temperature']}°F")
                if vitals.get('weight'):
                    summary_parts.append(f"  Weight: {vitals['weight']} kg")
                if vitals.get('bmi'):
                    summary_parts.append(f"  BMI: {vitals['bmi']}")
        else:
            summary_parts.append(f"\n=== VITAL SIGNS ===")
            summary_parts.append("No vital signs recorded")
        
        return "\n".join(summary_parts)
