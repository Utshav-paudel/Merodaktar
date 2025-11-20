"""
Migration to fix double-encoded JSON fields in encounters and reports.

This fixes the issue where patient_summary, questions_asked, symptoms, and patient_context
were being json.dumps() before saving to JSON columns, causing double-encoding.
"""

import json
import psycopg
import os
import sys

# Add parent directory to path to import settings
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.settings import get_settings

settings = get_settings()


def fix_double_encoded_json():
    """Fix double-encoded JSON fields in database using direct PostgreSQL connection"""
    
    # Build database URL without SQLAlchemy prefix
    db_url = f"postgresql://{settings.DB_USER}:{settings.DB_PASS}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    
    # Connect to database
    conn = psycopg.connect(db_url)
    cursor = conn.cursor()
    
    try:
        print("Starting JSON double-encoding fix...")
        
        # Fix encounters - patient_summary
        print("\n=== Fixing Encounters ===")
        cursor.execute("SELECT id, patient_summary FROM encounters WHERE patient_summary IS NOT NULL")
        encounters = cursor.fetchall()
        fixed_encounters = 0
        
        for enc_id, patient_summary in encounters:
            # Check if it's a string (double-encoded)
            if isinstance(patient_summary, str):
                try:
                    # Parse the JSON string to get the dict
                    parsed = json.loads(patient_summary)
                    # Update with the parsed dict (PostgreSQL will handle JSON serialization)
                    cursor.execute(
                        "UPDATE encounters SET patient_summary = %s WHERE id = %s",
                        (json.dumps(parsed), enc_id)
                    )
                    fixed_encounters += 1
                    print(f"  Fixed encounter {enc_id}: patient_summary")
                except (json.JSONDecodeError, TypeError) as e:
                    print(f"  Warning: Could not parse patient_summary for encounter {enc_id}: {e}")
        
        print(f"\nFixed {fixed_encounters} encounter records")
        
        # Fix reports - questions_asked, symptoms, patient_context
        print("\n=== Fixing Reports ===")
        cursor.execute("SELECT id, questions_asked, symptoms, patient_context FROM reports")
        reports = cursor.fetchall()
        fixed_reports = 0
        
        for report_id, questions_asked, symptoms, patient_context in reports:
            fields_fixed = []
            
            # Fix questions_asked
            if questions_asked and isinstance(questions_asked, str):
                try:
                    parsed = json.loads(questions_asked)
                    cursor.execute(
                        "UPDATE reports SET questions_asked = %s WHERE id = %s",
                        (json.dumps(parsed), report_id)
                    )
                    fields_fixed.append("questions_asked")
                except (json.JSONDecodeError, TypeError) as e:
                    print(f"  Warning: Could not parse questions_asked for report {report_id}: {e}")
            
            # Fix symptoms
            if symptoms and isinstance(symptoms, str):
                try:
                    parsed = json.loads(symptoms)
                    cursor.execute(
                        "UPDATE reports SET symptoms = %s WHERE id = %s",
                        (json.dumps(parsed), report_id)
                    )
                    fields_fixed.append("symptoms")
                except (json.JSONDecodeError, TypeError) as e:
                    print(f"  Warning: Could not parse symptoms for report {report_id}: {e}")
            
            # Fix patient_context
            if patient_context and isinstance(patient_context, str):
                try:
                    parsed = json.loads(patient_context)
                    cursor.execute(
                        "UPDATE reports SET patient_context = %s WHERE id = %s",
                        (json.dumps(parsed), report_id)
                    )
                    fields_fixed.append("patient_context")
                except (json.JSONDecodeError, TypeError) as e:
                    print(f"  Warning: Could not parse patient_context for report {report_id}: {e}")
            
            if fields_fixed:
                fixed_reports += 1
                print(f"  Fixed report {report_id}: {', '.join(fields_fixed)}")
        
        print(f"\nFixed {fixed_reports} report records")
        
        # Commit all changes
        conn.commit()
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    fix_double_encoded_json()
