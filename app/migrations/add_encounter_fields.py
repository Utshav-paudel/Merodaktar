"""
Migration: Add patient_summary, ai_preliminary_report, and doctor_notes to encounters table
"""
import sys
from pathlib import Path

# Add the app directory to the path
app_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(app_dir))

from sqlalchemy import text
from config.database import engine


def upgrade():
    """Add new fields to encounters table"""
    with engine.connect() as conn:
        # Add patient_summary as JSON field
        conn.execute(text("""
            ALTER TABLE encounters 
            ADD COLUMN IF NOT EXISTS patient_summary TEXT
        """))
        
        # Add ai_preliminary_report as TEXT field
        conn.execute(text("""
            ALTER TABLE encounters 
            ADD COLUMN IF NOT EXISTS ai_preliminary_report TEXT
        """))
        
        # Add doctor_notes as TEXT field
        conn.execute(text("""
            ALTER TABLE encounters 
            ADD COLUMN IF NOT EXISTS doctor_notes TEXT
        """))
        
        conn.commit()
        print("✅ Migration completed: Added patient_summary, ai_preliminary_report, and doctor_notes to encounters")


def downgrade():
    """Remove the new fields"""
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE encounters DROP COLUMN IF EXISTS patient_summary"))
        conn.execute(text("ALTER TABLE encounters DROP COLUMN IF EXISTS ai_preliminary_report"))
        conn.execute(text("ALTER TABLE encounters DROP COLUMN IF EXISTS doctor_notes"))
        conn.commit()
        print("✅ Rollback completed")


if __name__ == "__main__":
    print("Running migration: add_encounter_fields")
    upgrade()
