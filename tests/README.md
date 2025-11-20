# MeroDaktar Testing Guide

## Overview
This directory contains comprehensive tests for the MeroDaktar medical application using pytest.

## Test Structure

```
tests/
├── conftest.py          # Shared fixtures and configuration
├── pytest.ini           # Pytest configuration (in root)
├── utils.py            # Test utilities and helpers
├── unit/               # Unit tests (fast, isolated)
│   ├── test_auth.py
│   ├── test_users.py
│   ├── test_doctors.py
│   ├── test_appointments.py
│   └── test_security.py
├── integration/        # Integration tests (with dependencies)
│   ├── test_chat.py
│   ├── test_ehr.py
│   ├── test_medgemma.py
│   └── test_speech.py
└── e2e/               # End-to-end tests (full workflows)
    ├── test_appointment_workflow.py
    ├── test_symptom_workflow.py
    └── test_consultation_workflow.py
```

## Running Tests

### Install Test Dependencies
```powershell
pip install -r requirements.txt
```

### Run All Tests
```powershell
pytest
```

### Run Specific Test Categories

**Unit Tests Only (Fast)**
```powershell
pytest -m unit
```

**Integration Tests Only**
```powershell
pytest -m integration
```

**End-to-End Tests Only**
```powershell
pytest -m e2e
```

**API Tests**
```powershell
pytest -m api
```

**Authentication Tests**
```powershell
pytest -m auth
```

**Skip Slow Tests**
```powershell
pytest -m "not slow"
```

### Run Specific Test Files
```powershell
# Run authentication tests
pytest tests/unit/test_auth.py

# Run appointment tests
pytest tests/unit/test_appointments.py

# Run speech transcription tests
pytest tests/integration/test_speech.py
```

### Run Specific Test Classes or Functions
```powershell
# Run specific test class
pytest tests/unit/test_auth.py::TestAuthEndpoints

# Run specific test function
pytest tests/unit/test_auth.py::TestAuthEndpoints::test_login_success
```

### Run with Coverage Report
```powershell
# Generate HTML coverage report
pytest --cov=app --cov-report=html

# View coverage in terminal
pytest --cov=app --cov-report=term-missing

# Generate XML coverage (for CI/CD)
pytest --cov=app --cov-report=xml
```

### Run with Verbose Output
```powershell
pytest -v
```

### Run and Stop on First Failure
```powershell
pytest -x
```

### Run Last Failed Tests
```powershell
pytest --lf
```

### Run in Parallel (Faster)
```powershell
# Install pytest-xdist first
pip install pytest-xdist

# Run with 4 workers
pytest -n 4
```

## Test Markers

Tests are organized with the following markers:

- `@pytest.mark.unit` - Unit tests (fast, no external dependencies)
- `@pytest.mark.integration` - Integration tests (database, Redis, etc.)
- `@pytest.mark.e2e` - End-to-end tests (complete workflows)
- `@pytest.mark.api` - API endpoint tests
- `@pytest.mark.auth` - Authentication tests
- `@pytest.mark.chat` - Chat and symptom assessment tests
- `@pytest.mark.ehr` - Electronic health record tests
- `@pytest.mark.speech` - Speech transcription tests
- `@pytest.mark.medgemma` - MedGemma AI tests
- `@pytest.mark.slow` - Slow running tests
- `@pytest.mark.database` - Tests requiring database
- `@pytest.mark.redis` - Tests requiring Redis

## Fixtures

Common fixtures available in `conftest.py`:

- `client` - FastAPI test client
- `test_db_session` - Test database session
- `test_patient_user` - Sample patient user
- `test_doctor_user` - Sample doctor user
- `patient_auth_headers` - Auth headers for patient
- `doctor_auth_headers` - Auth headers for doctor
- `test_user_data` - Sample user data
- `test_doctor_data` - Sample doctor data
- `test_appointment_data` - Sample appointment data
- `mock_redis` - Mock Redis client
- `mock_medgemma_service` - Mock AI service
- `sample_audio_file` - Sample WAV audio file

## Writing New Tests

### Unit Test Example
```python
import pytest
from fastapi import status

@pytest.mark.unit
def test_example(client, patient_auth_headers):
    """Test description"""
    response = client.get("/api/v1/endpoint", headers=patient_auth_headers)
    assert response.status_code == status.HTTP_200_OK
```

### Integration Test Example
```python
import pytest

@pytest.mark.integration
@pytest.mark.asyncio
async def test_example_async(test_db_session):
    """Test description"""
    # Your async test code here
    pass
```

### E2E Test Example
```python
import pytest

@pytest.mark.e2e
@pytest.mark.slow
def test_complete_workflow(client, test_patient_user):
    """Test complete user workflow"""
    # Step 1: Do something
    # Step 2: Do something else
    # Step 3: Verify results
    pass
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.10'
      - run: pip install -r requirements.txt
      - run: pytest --cov=app --cov-report=xml
      - uses: codecov/codecov-action@v2
```

## Best Practices

1. **Keep tests isolated** - Each test should be independent
2. **Use fixtures** - Reuse common setup code with fixtures
3. **Test edge cases** - Test both success and failure scenarios
4. **Use descriptive names** - Test names should explain what they test
5. **Keep tests fast** - Unit tests should run in milliseconds
6. **Mock external services** - Don't make real API calls in tests
7. **Test one thing** - Each test should verify one behavior
8. **Clean up after tests** - Use fixtures with proper cleanup

## Troubleshooting

### Database Connection Issues
```powershell
# Tests use in-memory SQLite by default
# No database setup required
```

### Import Errors
```powershell
# Make sure you're running from project root
cd d:\merodaktarv2\shishir\Merodaktar
pytest
```

### Slow Tests
```powershell
# Skip slow tests during development
pytest -m "not slow"

# Or run tests in parallel
pytest -n auto
```

### Coverage Issues
```powershell
# Generate detailed coverage report
pytest --cov=app --cov-report=html
# Open htmlcov/index.html in browser
```

## Test Data

All test data is automatically created and cleaned up using fixtures. No manual database setup required.

## Environment Variables

Tests use test-specific environment variables. Create a `.env.test` file if needed:

```env
MEDGEMMA_API_KEY=test_key
MEDGEMMA_BASE_URL=http://test.example.com
GEMINI_API_KEY=test_key
```

## Debugging Tests

```powershell
# Run with print statements visible
pytest -s

# Run with Python debugger
pytest --pdb

# Run with verbose traceback
pytest -vv --tb=long
```

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [SQLAlchemy Testing](https://docs.sqlalchemy.org/en/14/orm/session_transaction.html#joining-a-session-into-an-external-transaction-such-as-for-test-suites)
