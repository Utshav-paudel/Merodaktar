from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from core.security import get_current_user
from models.user import User
from schemas.user import UserResponse, UserUpdate
from repositories.user import UserRepository
from config.database import get_db
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Get current user profile"""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current user profile"""
    user_repo = UserRepository(db)

    update_data = user_update.model_dump(exclude_unset=True)
    updated_user = user_repo.update(current_user.id, update_data)

    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    return updated_user


@router.delete("/me")
async def deactivate_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deactivate user account"""
    user_repo = UserRepository(db)
    user_repo.update(current_user.id, {"is_active": False})

    return {"message": "Account deactivated successfully"}
