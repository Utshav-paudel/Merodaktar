from sqlalchemy.orm import Session
from typing import List, Optional
from models.report import Report
from repositories.base import BaseRepository


class ReportRepository(BaseRepository[Report]):
    """Repository for Report operations"""
    
    def __init__(self, db: Session):
        super().__init__(Report, db)
    
    def get_by_patient(self, patient_id: str, skip: int = 0, limit: int = 100) -> List[Report]:
        """Get all reports for a patient"""
        return (
            self.db.query(Report)
            .filter(Report.patient_id == patient_id)
            .order_by(Report.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_by_status(self, patient_id: str, status: str) -> List[Report]:
        """Get reports by status for a patient"""
        return (
            self.db.query(Report)
            .filter(Report.patient_id == patient_id, Report.status == status)
            .order_by(Report.created_at.desc())
            .all()
        )
    
    def get_latest_report_number(self, patient_id: str) -> int:
        """Get the latest report number for a patient"""
        latest = (
            self.db.query(Report)
            .filter(Report.patient_id == patient_id)
            .order_by(Report.report_number.desc())
            .first()
        )
        return latest.report_number if latest else 0
    
    def get_unused_reports(self, patient_id: str) -> List[Report]:
        """Get reports that haven't been used for appointments"""
        return (
            self.db.query(Report)
            .filter(
                Report.patient_id == patient_id,
                Report.status == "completed",
                Report.is_used_for_appointment == False
            )
            .order_by(Report.created_at.desc())
            .all()
        )
