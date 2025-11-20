"""
Unit tests for authentication endpoints
"""
import pytest
from fastapi import status


@pytest.mark.unit
@pytest.mark.auth
class TestAuthEndpoints:
    """Test authentication API endpoints"""
    
    def test_register_user_success(self, client, test_user_data):
        """Test successful user registration"""
        response = client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["email"] == test_user_data["email"]
        assert data["full_name"] == test_user_data["full_name"]
        assert "id" in data
        assert "hashed_password" not in data
    
    def test_register_user_duplicate_email(self, client, test_user_data, test_patient_user):
        """Test registration with duplicate email"""
        response = client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already registered" in response.json()["detail"].lower()
    
    def test_register_user_invalid_email(self, client, test_user_data):
        """Test registration with invalid email"""
        test_user_data["email"] = "invalid-email"
        response = client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_register_user_weak_password(self, client, test_user_data):
        """Test registration with weak password"""
        test_user_data["password"] = "weak"
        response = client.post("/api/v1/auth/register", json=test_user_data)
        
        # Should fail validation
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]
    
    def test_login_success(self, client, test_patient_user, test_user_data):
        """Test successful login"""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": test_user_data["email"],
                "password": test_user_data["password"]
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_login_wrong_password(self, client, test_patient_user, test_user_data):
        """Test login with wrong password"""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": test_user_data["email"],
                "password": "WrongPassword123!"
            }
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_login_nonexistent_user(self, client):
        """Test login with nonexistent user"""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "nonexistent@example.com",
                "password": "SomePassword123!"
            }
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_current_user(self, client, test_patient_user, patient_auth_headers):
        """Test getting current user info"""
        response = client.get("/api/v1/auth/me", headers=patient_auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == test_patient_user.email
        assert data["id"] == test_patient_user.id
    
    def test_get_current_user_no_token(self, client):
        """Test getting current user without authentication"""
        response = client.get("/api/v1/auth/me")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_current_user_invalid_token(self, client):
        """Test getting current user with invalid token"""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
