# Migration: Add encounter_id to appointments table
# Run this script to update your database schema

import sys
import os
# Add parent directory to path to allow imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from config.settings import get_settings

settings = get_settings()

def migrate():
    """Add encounter_id column to appointments table"""
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='appointments' AND column_name='encounter_id';
        """))
        
        if result.fetchone() is None:
            # Add the column
            conn.execute(text("""
                ALTER TABLE appointments 
                ADD COLUMN encounter_id VARCHAR;
            """))
            
            # Add foreign key constraint
            try:
                conn.execute(text("""
                    ALTER TABLE appointments
                    ADD CONSTRAINT fk_appointments_encounter_id 
                    FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE SET NULL;
                """))
            except Exception as e:
                print(f"⚠️  Warning: Could not add foreign key constraint: {e}")
                print("    This is OK if encounters table doesn't exist yet")
            
            conn.commit()
            print("✅ Successfully added encounter_id column to appointments table")
        else:
            print("ℹ️  encounter_id column already exists")

if __name__ == "__main__":
    migrate()
