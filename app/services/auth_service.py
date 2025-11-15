from typing import Optional, Tuple
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext

from config.settings import get_settings
from repositories.user import UserRepository
from repositories.doctor import DoctorRepository
from models.user import User
from models.doctor import Doctor
from core.exceptions import AuthenticationError, ValidationError

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.doctor_repo = DoctorRepository(db)

    @staticmethod
    def _truncate_password(password: str) -> str:
        """
        Truncate password to bcrypt's 72 byte limit in a consistent way.
        Properly handles multi-byte UTF-8 characters.
        """
        password_bytes = password.encode("utf-8")
        if len(password_bytes) <= 72:
            return password

        # Truncate to 72 bytes without breaking UTF-8 characters
        truncated = password_bytes[:72]
        # Try to decode, backing off byte by byte if we hit a partial character
        for i in range(
            72, 68, -1
        ):  # Try up to 4 bytes back (max UTF-8 char size)
            try:
                return truncated[:i].decode("utf-8")
            except UnicodeDecodeError:
                continue
        # Fallback: use ignore to skip broken characters
        return truncated.decode("utf-8", errors="ignore")

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password"""
        password = AuthService._truncate_password(password)
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify password"""
        plain_password = AuthService._truncate_password(plain_password)
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def create_access_token(
        data: dict, expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + (
            expires_delta
            or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(
            to_encode,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )

    @staticmethod
    def create_refresh_token(data: dict) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        to_encode.update({"exp": expire, "type": "refresh"})
        return jwt.encode(
            to_encode,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )

    @staticmethod
    def decode_token(token: str) -> dict:
        """Decode and verify JWT token"""
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
            )
            return payload
        except JWTError:
            raise AuthenticationError("Invalid token")

    def register_user(
        self, email: str, password: str, full_name: str, **kwargs
    ) -> User:
        """Register a new user"""
        # Check if user exists
        if self.user_repo.get_by_email(email):
            raise ValidationError("Email already registered")

        # Create user
        user_data = {
            "email": email,
            "hashed_password": self.hash_password(password),
            "full_name": full_name,
            **kwargs,
        }
        return self.user_repo.create(user_data)

    def authenticate_user(
        self, email: str, password: str
    ) -> Tuple[User, str, str]:
        """Authenticate user and return tokens"""
        user = self.user_repo.get_by_email(email)

        if not user or not self.verify_password(
            password, user.hashed_password
        ):
            raise AuthenticationError("Invalid email or password")

        if not user.is_active:
            raise AuthenticationError("Account is deactivated")

        # Create tokens
        access_token = self.create_access_token(
            {"sub": user.id, "email": user.email, "role": "user"}
        )
        refresh_token = self.create_refresh_token(
            {"sub": user.id, "role": "user"}
        )

        return user, access_token, refresh_token

    def register_doctor(
        self,
        email: str,
        password: str,
        full_name: str,
        specialization: str,
        license_number: str,
        **kwargs,
    ) -> Doctor:
        """Register a new doctor"""
        # Check if doctor exists
        if self.doctor_repo.get_by_email(email):
            raise ValidationError("Email already registered")

        # Create doctor
        doctor_data = {
            "email": email,
            "hashed_password": self.hash_password(password),
            "full_name": full_name,
            "specialization": specialization,
            "license_number": license_number,
            **kwargs,
        }
        return self.doctor_repo.create(doctor_data)

    def authenticate_doctor(
        self, email: str, password: str
    ) -> Tuple[Doctor, str, str]:
        """Authenticate doctor and return tokens"""
        doctor = self.doctor_repo.get_by_email(email)

        if not doctor or not self.verify_password(
            password, doctor.hashed_password
        ):
            raise AuthenticationError("Invalid email or password")

        if not doctor.is_verified:
            raise AuthenticationError(
                "Account not verified. Please contact admin."
            )

        # Create tokens
        access_token = self.create_access_token(
            {"sub": doctor.id, "email": doctor.email, "role": "doctor"}
        )
        refresh_token = self.create_refresh_token(
            {"sub": doctor.id, "role": "doctor"}
        )

        return doctor, access_token, refresh_token

    def refresh_access_token(self, refresh_token: str) -> str:
        """Generate new access token from refresh token"""
        payload = self.decode_token(refresh_token)

        if payload.get("type") != "refresh":
            raise AuthenticationError("Invalid refresh token")

        # Create new access token
        new_access_token = self.create_access_token(
            {
                "sub": payload["sub"],
                "email": payload.get("email"),
                "role": payload.get("role"),
            }
        )

        return new_access_token
