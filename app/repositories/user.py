from typing import Optional
from sqlalchemy.orm import Session
from models.user import User
from .base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return self.db.query(User).filter(User.email == email).first()

    def get_active_users(self, skip: int = 0, limit: int = 100):
        """Get all active users"""
        return (
            self.db.query(User)
            .filter(User.is_active)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def verify_user(self, user_id: str) -> Optional[User]:
        """Verify a user account"""
        return self.update(user_id, {"is_verified": True})
