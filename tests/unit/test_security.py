"""
Unit tests for security functions
"""
import pytest
import sys
import os

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "app")))

from services.auth_service import AuthService


@pytest.mark.unit
class TestSecurity:
    """Test security and authentication functions"""
    
    def test_password_hashing(self):
        """Test password hashing"""
        password = "TestPassword123!"
        hashed = AuthService.hash_password(password)
        
        assert hashed != password
        assert len(hashed) > 0
        assert AuthService.verify_password(password, hashed)
    
    def test_password_verification_fail(self):
        """Test password verification with wrong password"""
        password = "TestPassword123!"
        hashed = AuthService.hash_password(password)
        
        assert not AuthService.verify_password("WrongPassword", hashed)
    
    def test_create_access_token(self):
        """Test JWT token creation"""
        data = {"sub": "test@example.com", "role": "patient"}
        token = AuthService.create_access_token(data)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_decode_access_token(self):
        """Test JWT token decoding"""
        data = {"sub": "test@example.com", "role": "patient"}
        token = AuthService.create_access_token(data)
        
        decoded = AuthService.decode_token(token)
        assert decoded is not None
        assert decoded["sub"] == "test@example.com"
        assert decoded["role"] == "patient"
    
    def test_decode_invalid_token(self):
        """Test decoding invalid token"""
        invalid_token = "invalid.token.here"
        
        with pytest.raises(Exception):
            AuthService.decode_token(invalid_token)
