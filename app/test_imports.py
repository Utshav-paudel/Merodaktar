#!/usr/bin/env python
# Test imports
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from subapps.login_verification.auth import router as auth_router
    print("✓ Auth router imported successfully")
except Exception as e:
    print(f"✗ Auth router import failed: {e}")

try:
    from subapps.dashboard.dashboard import router as dashboard_router
    print("✓ Dashboard router imported successfully")
except Exception as e:
    print(f"✗ Dashboard router import failed: {e}")

try:
    from subapps.appointment.appointments import router as appointments_router
    print("✓ Appointments router imported successfully")
except Exception as e:
    print(f"✗ Appointments router import failed: {e}")

try:
    from subapps.medical_chat.chat import router as medical_chat_router
    print("✓ Medical chat router imported successfully")
except Exception as e:
    print(f"✗ Medical chat router import failed: {e}")

print("\nAll imports completed!")
