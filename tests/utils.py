"""
Test utilities and helper functions
"""
from typing import Dict, Any
from datetime import datetime, timedelta
import random
import string


def generate_random_email() -> str:
    """Generate random email for testing"""
    random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"test_{random_str}@example.com"


def generate_random_phone() -> str:
    """Generate random Nepali phone number for testing"""
    return f"+977984{random.randint(1000000, 9999999)}"


def generate_future_date(days: int = 7) -> str:
    """Generate a future date string"""
    future = datetime.now() + timedelta(days=days)
    return future.strftime("%Y-%m-%d")


def generate_time_slot(hour: int = 10) -> str:
    """Generate time slot string"""
    return f"{hour:02d}:00"


def create_test_user_data(role: str = "patient") -> Dict[str, Any]:
    """Create test user data"""
    return {
        "email": generate_random_email(),
        "password": "TestPassword123!",
        "full_name": f"Test {role.capitalize()}",
        "phone": generate_random_phone(),
        "date_of_birth": "1990-01-01",
        "gender": random.choice(["male", "female", "other"]),
        "address": "Test Address, Kathmandu",
        "role": role
    }


def create_test_appointment_data(
    patient_id: str,
    doctor_id: str,
    days_ahead: int = 7
) -> Dict[str, Any]:
    """Create test appointment data"""
    return {
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "appointment_date": generate_future_date(days_ahead),
        "appointment_time": generate_time_slot(),
        "appointment_type": random.choice(["in-person", "video", "phone"]),
        "reason": "Test appointment reason",
        "symptoms": "Test symptoms"
    }


def create_test_encounter_data(
    patient_id: str,
    doctor_id: str
) -> Dict[str, Any]:
    """Create test encounter data"""
    return {
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "chief_complaint": "Test chief complaint",
        "present_illness": "Test present illness",
        "vital_signs": {
            "temperature": "98.6",
            "blood_pressure": "120/80",
            "pulse": "72",
            "respiratory_rate": "16"
        },
        "physical_examination": "Test physical examination",
        "diagnosis": "Test diagnosis",
        "treatment_plan": "Test treatment plan"
    }


def assert_valid_uuid(uuid_string: str) -> bool:
    """Check if string is valid UUID"""
    import uuid
    try:
        uuid.UUID(uuid_string)
        return True
    except ValueError:
        return False


def assert_valid_date(date_string: str) -> bool:
    """Check if string is valid date"""
    try:
        datetime.strptime(date_string, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def assert_valid_time(time_string: str) -> bool:
    """Check if string is valid time"""
    try:
        datetime.strptime(time_string, "%H:%M")
        return True
    except ValueError:
        return False


class APITestHelper:
    """Helper class for API testing"""
    
    @staticmethod
    def register_and_login(client, user_data: Dict[str, Any]) -> tuple:
        """Register a user and return user data and auth token"""
        # Register
        register_response = client.post("/api/v1/auth/register", json=user_data)
        user = register_response.json()
        
        # Login
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": user_data["email"],
                "password": user_data["password"]
            }
        )
        token_data = login_response.json()
        
        return user, token_data["access_token"]
    
    @staticmethod
    def get_auth_headers(token: str) -> Dict[str, str]:
        """Get authorization headers"""
        return {"Authorization": f"Bearer {token}"}
    
    @staticmethod
    def create_appointment(
        client,
        appointment_data: Dict[str, Any],
        auth_token: str
    ) -> Dict[str, Any]:
        """Create an appointment and return the response"""
        headers = APITestHelper.get_auth_headers(auth_token)
        response = client.post(
            "/api/v1/appointments",
            json=appointment_data,
            headers=headers
        )
        return response.json()
