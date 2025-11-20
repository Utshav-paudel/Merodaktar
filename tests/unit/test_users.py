"""
Unit tests for user endpoints
"""
import pytest
from fastapi import status


@pytest.mark.unit
class TestUserEndpoints:
    """Test user API endpoints"""
    
    def test_get_user_profile(self, client, patient_auth_headers, test_patient_user):
        """Test getting user profile"""
        response = client.get(
            f"/api/v1/users/{test_patient_user.id}",
            headers=patient_auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == test_patient_user.id
        assert data["email"] == test_patient_user.email
        assert "hashed_password" not in data
    
    def test_update_user_profile(
        self, client, patient_auth_headers, test_patient_user
    ):
        """Test updating user profile"""
        update_data = {
            "full_name": "Updated Name",
            "phone": "+9779841111111"
        }
        
        response = client.patch(
            f"/api/v1/users/{test_patient_user.id}",
            json=update_data,
            headers=patient_auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["full_name"] == update_data["full_name"]
        assert data["phone"] == update_data["phone"]
    
    def test_update_user_unauthorized(self, client, test_patient_user):
        """Test updating user without authentication"""
        response = client.patch(
            f"/api/v1/users/{test_patient_user.id}",
            json={"full_name": "Hacked Name"}
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_delete_user(self, client, patient_auth_headers, test_patient_user):
        """Test deleting user account"""
        response = client.delete(
            f"/api/v1/users/{test_patient_user.id}",
            headers=patient_auth_headers
        )
        
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT]
