import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from orbit.config import get_settings
from orbit.errors import DomainError
from orbit.models import User, UserSession

_hasher = PasswordHasher()
# Verified against when the email is unknown, so timing does not reveal accounts.
_DUMMY_HASH = _hasher.hash("orbit-dummy-password")

MIN_PASSWORD_LENGTH = 12


def hash_password(password: str) -> str:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise DomainError(
            "weak_password", f"Password must be at least {MIN_PASSWORD_LENGTH} characters"
        )
    return _hasher.hash(password)


def _verify(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def _now() -> datetime:
    return datetime.now(UTC)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class InvalidCredentials(DomainError):
    status_code = 401

    def __init__(self) -> None:
        super().__init__("invalid_credentials", "Invalid email or password")


class AccountLocked(DomainError):
    status_code = 429

    def __init__(self) -> None:
        super().__init__(
            "account_locked", "Too many failed attempts; account is temporarily locked"
        )


def authenticate(db: Session, email: str, password: str) -> User:
    """Check credentials, applying the temporary lockout after repeated failures."""
    settings = get_settings()
    user = db.scalar(select(User).where(User.email == email.strip().lower()))
    if user is None:
        _verify(_DUMMY_HASH, password)
        raise InvalidCredentials()

    now = _now()
    if user.locked_until is not None and user.locked_until > now:
        raise AccountLocked()

    if not _verify(user.password_hash, password):
        if user.locked_until is not None:  # previous lock expired: start a fresh window
            user.locked_until = None
            user.failed_login_attempts = 0
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= settings.login_max_failures:
            user.locked_until = now + timedelta(minutes=settings.login_lock_minutes)
        db.commit()
        raise InvalidCredentials()

    user.failed_login_attempts = 0
    user.locked_until = None
    if _hasher.check_needs_rehash(user.password_hash):
        user.password_hash = _hasher.hash(password)
    return user


def create_session(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    expires = _now() + timedelta(hours=get_settings().session_ttl_hours)
    db.add(UserSession(user_id=user.id, token_hash=_token_hash(token), expires_at=expires))
    db.commit()
    return token


def user_for_token(db: Session, token: str) -> User | None:
    session = db.scalar(select(UserSession).where(UserSession.token_hash == _token_hash(token)))
    if session is None or session.expires_at <= _now():
        return None
    return session.user


def revoke_session(db: Session, token: str) -> None:
    db.execute(delete(UserSession).where(UserSession.token_hash == _token_hash(token)))
    db.commit()


def reset_password(db: Session, email: str, new_password: str) -> None:
    """Server-side password reset (CLI). Clears lockout and revokes all sessions."""
    user = db.scalar(select(User).where(User.email == email.strip().lower()))
    if user is None:
        raise DomainError("not_found", f"No user with email {email}")
    user.password_hash = hash_password(new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    db.execute(delete(UserSession).where(UserSession.user_id == user.id))
    db.commit()
