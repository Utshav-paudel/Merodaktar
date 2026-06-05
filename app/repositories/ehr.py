from typing import Optional
from sqlalchemy.orm import Session
from models.ehr import EHR
from .base import BaseRepository


class EHRRepository(BaseRepository[EHR]):
    def __init__(self, db: Session):
        super().__init__(EHR, db)

    def get_by_patient(self, patient_id: str) -> Optional[EHR]:
        """Get EHR by patient ID"""
        return self.db.query(EHR).filter(EHR.patient_id == patient_id).first()

    def create_or_get(self, patient_id: str) -> EHR:
        """Create EHR if doesn't exist, otherwise return existing"""
        ehr = self.get_by_patient(patient_id)
        if not ehr:
            ehr = self.create({"patient_id": patient_id})
        return ehr

    def add_vital_sign(
        self, patient_id: str, vital_data: dict
    ) -> Optional[EHR]:
        """Add vital sign record"""
        ehr = self.get_by_patient(patient_id)
        if ehr:
            vital_signs = list(ehr.vital_signs or [])  # copy so SQLAlchemy detects the change
            vital_signs.append(vital_data)
            return self.update(ehr.id, {"vital_signs": vital_signs})
        return None

    def add_lab_result(self, patient_id: str, lab_data: dict) -> Optional[EHR]:
        """Add lab result"""
        ehr = self.get_by_patient(patient_id)
        if ehr:
            lab_results = list(ehr.lab_results or [])  # copy so SQLAlchemy detects the change
            lab_results.append(lab_data)
            return self.update(ehr.id, {"lab_results": lab_results})
        return None
