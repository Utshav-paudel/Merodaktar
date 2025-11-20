"""
Migration to fix double-encoded JSON fields in encounters and reports tables.
This script parses string JSON fields and stores them as proper JSON objects.
"""

import json
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import SessionLocal
from models.encounter import Encounter
from models.report import Report


def fix_double_encoded_json():
    """Fix double-encoded JSON fields in database"""
    db = SessionLocal()
    
    try:
        # Fix Encounter table
        print("Fixing Encounter table...")
        encounters = db.query(Encounter).all()
        encounters_fixed = 0
        
        for encounter in encounters:
            updated = False
            
            # Fix patient_summary if it's a string
            if encounter.patient_summary and isinstance(encounter.patient_summary, str):
                try:
                    encounter.patient_summary = json.loads(encounter.patient_summary)
                    updated = True
                except json.JSONDecodeError:
                    print(f"Warning: Could not parse patient_summary for encounter {encounter.id}")
            
            # Fix symptoms if it's a string
            if encounter.symptoms and isinstance(encounter.symptoms, str):
                try:
                    encounter.symptoms = json.loads(encounter.symptoms)
                    updated = True
                except json.JSONDecodeError:
                    print(f"Warning: Could not parse symptoms for encounter {encounter.id}")
            
            if updated:
                encounters_fixed += 1
        
        db.commit()
        print(f"Fixed {encounters_fixed} encounter records")
        
        # Fix Report table
        print("\nFixing Report table...")
        reports = db.query(Report).all()
        reports_fixed = 0
        
        for report in reports:
            updated = False
            
            # Fix questions_asked if it's a string
            if report.questions_asked and isinstance(report.questions_asked, str):
                try:
                    report.questions_asked = json.loads(report.questions_asked)
                    updated = True
                except json.JSONDecodeError:
                    print(f"Warning: Could not parse questions_asked for report {report.id}")
            
            # Fix symptoms if it's a string
            if report.symptoms and isinstance(report.symptoms, str):
                try:
                    report.symptoms = json.loads(report.symptoms)
                    updated = True
                except json.JSONDecodeError:
                    print(f"Warning: Could not parse symptoms for report {report.id}")
            
            # Fix patient_context if it exists and is a string
            if hasattr(report, 'patient_context') and report.patient_context and isinstance(report.patient_context, str):
                try:
                    report.patient_context = json.loads(report.patient_context)
                    updated = True
                except json.JSONDecodeError:
                    print(f"Warning: Could not parse patient_context for report {report.id}")
            
            if updated:
                reports_fixed += 1
        
        db.commit()
        print(f"Fixed {reports_fixed} report records")
        
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Starting migration to fix double-encoded JSON fields...")
    fix_double_encoded_json()
