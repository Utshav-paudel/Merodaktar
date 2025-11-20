"""
Migration: Add patient_context to reports table
This allows storing patient context for personalized AI conversations
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from config.database import engine

def run_migration():
    """Add patient_context column to reports table"""
    print("Running migration: add_patient_context_to_reports")
    
    with engine.connect() as conn:
        # Check if column already exists (PostgreSQL)
        result = conn.execute(text("""
            SELECT COUNT(*) as count
            FROM information_schema.columns
            WHERE table_name = 'reports'
            AND column_name = 'patient_context'
        """))
        
        exists = result.fetchone()[0] > 0
        
        if not exists:
            # Add patient_context column
            conn.execute(text("""
                ALTER TABLE reports
                ADD COLUMN patient_context TEXT
            """))
            conn.commit()
            print("✅ Added patient_context column to reports table")
        else:
            print("ℹ️  patient_context column already exists")
    
    print("✅ Migration completed: add_patient_context_to_reports")

if __name__ == "__main__":
    run_migration()
