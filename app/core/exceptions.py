from fastapi import HTTPException, status


class BaseAppException(HTTPException):
    """Base exception for application"""

    def __init__(
        self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST
    ):
        super().__init__(status_code=status_code, detail=detail)


class AuthenticationError(BaseAppException):
    """Authentication failed"""

    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(
            detail=detail, status_code=status.HTTP_401_UNAUTHORIZED
        )


class AuthorizationError(BaseAppException):
    """Not authorized to access resource"""

    def __init__(self, detail: str = "Not authorized"):
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN)


class NotFoundError(BaseAppException):
    """Resource not found"""

    def __init__(self, detail: str = "Resource not found"):
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)


class ValidationError(BaseAppException):
    """Validation error"""

    def __init__(self, detail: str = "Validation failed"):
        super().__init__(
            detail=detail, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
        )


class ConflictError(BaseAppException):
    """Resource conflict"""

    def __init__(self, detail: str = "Resource conflict"):
        super().__init__(detail=detail, status_code=status.HTTP_409_CONFLICT)
