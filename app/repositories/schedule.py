from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, time as dt_time
from models.schedule import DoctorSchedule, TimeSlot
from repositories.base import BaseRepository


class ScheduleRepository(BaseRepository[DoctorSchedule]):
    """Repository for DoctorSchedule operations"""
    
    def __init__(self, db: Session):
        super().__init__(DoctorSchedule, db)
    
    def get_by_doctor(self, doctor_id: str) -> List[DoctorSchedule]:
        """Get all schedules for a doctor"""
        return (
            self.db.query(DoctorSchedule)
            .filter(DoctorSchedule.doctor_id == doctor_id)
            .order_by(DoctorSchedule.day_of_week)
            .all()
        )
    
    def get_by_day(self, doctor_id: str, day_of_week: int) -> Optional[DoctorSchedule]:
        """Get schedule for a specific day"""
        return (
            self.db.query(DoctorSchedule)
            .filter(
                DoctorSchedule.doctor_id == doctor_id,
                DoctorSchedule.day_of_week == day_of_week,
                DoctorSchedule.is_available == True
            )
            .first()
        )
    
    def delete_by_doctor(self, doctor_id: str) -> None:
        """Delete all schedules for a doctor"""
        self.db.query(DoctorSchedule).filter(
            DoctorSchedule.doctor_id == doctor_id
        ).delete()
        self.db.commit()


class TimeSlotRepository(BaseRepository[TimeSlot]):
    """Repository for TimeSlot operations"""
    
    def __init__(self, db: Session):
        super().__init__(TimeSlot, db)
    
    def get_by_doctor_and_date(
        self, doctor_id: str, date: str
    ) -> List[TimeSlot]:
        """Get all time slots for a doctor on a specific date"""
        return (
            self.db.query(TimeSlot)
            .filter(
                TimeSlot.doctor_id == doctor_id,
                TimeSlot.date == date
            )
            .order_by(TimeSlot.time)
            .all()
        )
    
    def get_available_slots(
        self, doctor_id: str, date: str
    ) -> List[TimeSlot]:
        """Get available (not booked) time slots"""
        return (
            self.db.query(TimeSlot)
            .filter(
                TimeSlot.doctor_id == doctor_id,
                TimeSlot.date == date,
                TimeSlot.is_booked == False
            )
            .order_by(TimeSlot.time)
            .all()
        )
    
    def get_by_appointment(self, appointment_id: str) -> Optional[TimeSlot]:
        """Get time slot by appointment ID"""
        return (
            self.db.query(TimeSlot)
            .filter(TimeSlot.appointment_id == appointment_id)
            .first()
        )
    
    def book_slot(self, slot_id: str, appointment_id: str) -> Optional[TimeSlot]:
        """Mark a time slot as booked"""
        slot = self.get(slot_id)
        if slot and not slot.is_booked:
            slot.is_booked = True
            slot.appointment_id = appointment_id
            self.db.commit()
            self.db.refresh(slot)
            return slot
        return None
    
    def unbook_slot(self, slot_id: str) -> Optional[TimeSlot]:
        """Mark a time slot as available"""
        slot = self.get(slot_id)
        if slot:
            slot.is_booked = False
            slot.appointment_id = None
            self.db.commit()
            self.db.refresh(slot)
            return slot
        return None
    
    def delete_by_doctor_and_date_range(
        self, doctor_id: str, start_date: str, end_date: str
    ) -> None:
        """Delete time slots in a date range"""
        self.db.query(TimeSlot).filter(
            TimeSlot.doctor_id == doctor_id,
            TimeSlot.date >= start_date,
            TimeSlot.date <= end_date
        ).delete()
        self.db.commit()
    
    def generate_slots_from_schedule(
        self, schedule: DoctorSchedule, date: str
    ) -> List[TimeSlot]:
        """Generate time slots from a schedule for a specific date"""
        slots = []
        
        # Parse start and end times
        start_hour, start_min = map(int, schedule.start_time.split(':'))
        end_hour, end_min = map(int, schedule.end_time.split(':'))
        
        start_time = datetime.strptime(f"{start_hour}:{start_min}", "%H:%M")
        end_time = datetime.strptime(f"{end_hour}:{end_min}", "%H:%M")
        duration = timedelta(minutes=schedule.slot_duration)
        
        current_time = start_time
        while current_time + duration <= end_time:
            slot = TimeSlot(
                doctor_id=schedule.doctor_id,
                date=date,
                time=current_time.strftime("%H:%M"),
                duration=schedule.slot_duration,
                is_booked=False
            )
            slots.append(slot)
            current_time += duration
        
        return slots
