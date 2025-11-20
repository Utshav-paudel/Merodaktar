from sqlalchemy.orm import Session
from typing import List, Optional
from models.encounter import Encounter
from repositories.base import BaseRepository


class EncounterRepository(BaseRepository[Encounter]):
    """Repository for Encounter operations"""
    
    def __init__(self, db: Session):
        super().__init__(Encounter, db)
    
    def get_by_patient(self, patient_id: str, skip: int = 0, limit: int = 100) -> List[Encounter]:
        """Get all encounters for a patient"""
        return (
            self.db.query(Encounter)
            .filter(Encounter.patient_id == patient_id)
            .order_by(Encounter.encounter_date.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_latest_encounter_number(self, patient_id: str) -> int:
        """Get the latest encounter number for a patient"""
        latest = (
            self.db.query(Encounter)
            .filter(Encounter.patient_id == patient_id)
            .order_by(Encounter.encounter_number.desc())
            .first()
        )
        return latest.encounter_number if latest else 0
    
    def get_by_type(self, patient_id: str, encounter_type: str) -> List[Encounter]:
        """Get encounters by type"""
        return (
            self.db.query(Encounter)
            .filter(
                Encounter.patient_id == patient_id,
                Encounter.encounter_type == encounter_type
            )
            .order_by(Encounter.encounter_date.desc())
            .all()
        )
    
    def get_by_report(self, report_id: str) -> Optional[Encounter]:
        """Get encounter by report ID"""
        return (
            self.db.query(Encounter)
            .filter(Encounter.report_id == report_id)
            .first()
        )
