from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from orbit.api.deps import current_user
from orbit.api.schemas import LoginIn, UserOut
from orbit.config import get_settings
from orbit.db import get_db
from orbit.models import User
from orbit.security import authenticate, create_session, revoke_session

router = APIRouter(prefix="/auth", tags=["auth"])


def user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        role=user.role.value,
        name=user.workforce.name,
        organization_id=user.organization_id,
    )


@router.post("/login", response_model=UserOut)
def login(body: LoginIn, response: Response, db: Session = Depends(get_db)):
    settings = get_settings()
    user = authenticate(db, body.email, body.password)
    token = create_session(db, user)
    response.set_cookie(
        settings.cookie_name,
        token,
        max_age=settings.session_ttl_hours * 3600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    return user_out(user)


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    settings = get_settings()
    token = request.cookies.get(settings.cookie_name)
    if token:
        revoke_session(db, token)
    response.delete_cookie(
        settings.cookie_name, path="/", httponly=True, secure=settings.cookie_secure, samesite="lax"
    )


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user_out(user)
