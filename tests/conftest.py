"""
Test configuration and fixtures
"""
import os
import sys
from typing import Generator, AsyncGenerator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
import asyncio

# Set test environment variables BEFORE importing app modules
os.environ["DB_HOST"] = "localhost"
os.environ["DB_PORT"] = "5432"
os.environ["DB_USER"] = "test_user"
os.environ["DB_PASS"] = "test_pass"
os.environ["DB_NAME"] = "test_db"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"
os.environ["OPENAI_API_KEY"] = "test-openai-key"
os.environ["GEMINI_API_KEY"] = "test-gemini-key"
os.environ["MEDGEMMA_API_KEY"] = "test-medgemma-key"
os.environ["MEDGEMMA_BASE_URL"] = "https://test.endpoint.com"
os.environ["MEDGEMMA_MODEL"] = "test-model"
os.environ["REDIS_HOST"] = "localhost"
os.environ["REDIS_PORT"] = "6379"
os.environ["REDIS_DB"] = "1"
os.environ["HF_TOKEN"] = "test-hf-token"
os.environ["MEDGEMMA_ENDPOINT"] = "https://test.endpoint.com"

# Add app directory to Python path
app_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app"))
sys.path.insert(0, app_dir)

from main import app
from config.database import Base, get_db
from services.auth_service import AuthService
from models.user import User
from models.doctor import Doctor
from models.appointment import Appointment

# Test database URL (use in-memory SQLite for tests)
TEST_DATABASE_URL = "sqlite:///:memory:"

# Create test engine
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """
    Create a fresh database session for each test.
    """
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        # Drop all tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """
    Create a test client with database session override.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session: Session) -> User:
    """
    Create a test patient user.
    """
    user = User(
        id="test-user-1",
        email="patient@test.com",
        full_name="Test Patient",
        phone="+9779800000000",
        hashed_password=AuthService.hash_password("testpass123"),
        role="patient",
        is_active=True,
        is_verified=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_doctor_user(db_session: Session) -> User:
    """
    Create a test doctor user.
    """
    user = User(
        id="test-doctor-user-1",
        email="doctor@test.com",
        full_name="Dr. Test Doctor",
        phone="+9779800000001",
        hashed_password=AuthService.hash_password("testpass123"),
        role="doctor",
        is_active=True,
        is_verified=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_doctor(db_session: Session, test_doctor_user: User) -> Doctor:
    """
    Create a test doctor profile.
    """
    doctor = Doctor(
        id="test-doctor-1",
        user_id=test_doctor_user.id,
        specialization="General Medicine",
        license_number="NMC12345",
        qualification="MBBS, MD",
        experience_years=10,
        consultation_fee=1000.0,
        bio="Test doctor for automated testing"
    )
    db_session.add(doctor)
    db_session.commit()
    db_session.refresh(doctor)
    return doctor


@pytest.fixture
def auth_headers_patient(client: TestClient) -> dict:
    """
    Get authentication headers for patient user.
    """
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "patient@test.com",
            "password": "testpass123"
        }
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_doctor(client: TestClient) -> dict:
    """
    Get authentication headers for doctor user.
    """
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "doctor@test.com",
            "password": "testpass123"
        }
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def event_loop():
    """
    Create an event loop for async tests.
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()
