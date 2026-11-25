from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from orbit.config import get_settings
from orbit.db import get_db
from orbit.models import User, UserRole
from orbit.security import user_for_token


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(get_settings().cookie_name)
    user = user_for_token(db, token) if token else None
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def founder(user: User = Depends(current_user)) -> User:
    # MVP: only the Founder uses the API (PRD 4.4).
    if user.role != UserRole.FOUNDER:
        raise HTTPException(status_code=403, detail="Founder only")
    return user
