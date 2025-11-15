from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from repositories.ehr import EHRRepository
from core.exceptions import NotFoundError


class EHRService:
    def __init__(self, db: Session):
        self.db = db
        self.ehr_repo = EHRRepository(db)

    def get_or_create_ehr(self, patient_id: str):
        """Get or create EHR for patient"""
        return self.ehr_repo.create_or_get(patient_id)

    def get_patient_ehr(self, patient_id: str):
        """Get patient's EHR"""
        ehr = self.ehr_repo.get_by_patient(patient_id)
        if not ehr:
            raise NotFoundError("EHR not found")
        return ehr

    def update_ehr(self, patient_id: str, update_data: dict):
        """Update patient's EHR"""
        ehr = self.get_or_create_ehr(patient_id)
        return self.ehr_repo.update(ehr.id, update_data)

    def add_vital_signs(self, patient_id: str, vital_data: Dict):
        """Add vital signs record"""
        vital_data["recorded_at"] = datetime.utcnow().isoformat()
        return self.ehr_repo.add_vital_sign(patient_id, vital_data)

    def add_lab_result(self, patient_id: str, lab_data: Dict):
        """Add lab result"""
        lab_data["recorded_at"] = datetime.utcnow().isoformat()
        return self.ehr_repo.add_lab_result(patient_id, lab_data)

    def add_medication(self, patient_id: str, medication: Dict):
        """Add medication to patient's record"""
        ehr = self.get_or_create_ehr(patient_id)
        medications = ehr.medications or []
        medication["added_at"] = datetime.utcnow().isoformat()
        medications.append(medication)
        return self.ehr_repo.update(ehr.id, {"medications": medications})

    def add_allergy(self, patient_id: str, allergy: Dict):
        """Add allergy to patient's record"""
        ehr = self.get_or_create_ehr(patient_id)
        allergies = ehr.allergies or []
        allergy["recorded_at"] = datetime.utcnow().isoformat()
        allergies.append(allergy)
        return self.ehr_repo.update(ehr.id, {"allergies": allergies})

    def add_immunization(self, patient_id: str, immunization: Dict):
        """Add immunization record"""
        ehr = self.get_or_create_ehr(patient_id)
        immunizations = ehr.immunizations or []
        immunizations.append(immunization)
        return self.ehr_repo.update(ehr.id, {"immunizations": immunizations})
