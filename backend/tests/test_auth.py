from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update

from orbit.cli import main as cli_main
from orbit.db import SessionLocal
from orbit.models import User
from tests.conftest import FOUNDER_EMAIL, FOUNDER_PASSWORD


def login(c, password=FOUNDER_PASSWORD, email=FOUNDER_EMAIL):
    return c.post("/auth/login", json={"email": email, "password": password})


def test_login_sets_secure_session_cookie_and_logout_revokes(anon):
    r = login(anon)
    assert r.status_code == 200
    assert r.json()["role"] == "founder"
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie
    assert anon.get("/auth/me").status_code == 200

    token = anon.cookies.get("orbit_session")
    assert anon.post("/auth/logout").status_code == 204
    anon.cookies.set("orbit_session", token)  # replaying the old token must fail
    assert anon.get("/auth/me").status_code == 401


def test_password_is_stored_as_argon2(founder_account):
    with SessionLocal() as db:
        user = db.scalar(select(User))
        assert user.password_hash.startswith("$argon2")


def test_wrong_password_and_unknown_email_are_indistinguishable(anon):
    a = login(anon, password="wrong-password-123")
    b = login(anon, email="nobody@example.com")
    assert a.status_code == b.status_code == 401
    assert a.json() == b.json()


def test_api_requires_login(anon):
    assert anon.get("/agents").status_code == 401


def test_lockout_after_five_failures_even_with_correct_password(anon):
    for _ in range(5):
        assert login(anon, password="wrong-password-123").status_code == 401
    assert login(anon).status_code == 429


def test_lock_expires(anon):
    for _ in range(5):
        login(anon, password="wrong-password-123")
    with SessionLocal() as db:
        db.execute(update(User).values(locked_until=datetime.now(UTC) - timedelta(seconds=1)))
        db.commit()
    assert login(anon).status_code == 200


def test_successful_login_resets_failure_counter(anon):
    for _ in range(4):
        login(anon, password="wrong-password-123")
    assert login(anon).status_code == 200
    for _ in range(4):
        login(anon, password="wrong-password-123")
    assert login(anon).status_code == 200


def test_cli_reset_password_clears_lock_and_sessions(client, monkeypatch, capsys):
    for _ in range(5):
        login(client, password="wrong-password-123")
    new_password = "another-long-password"
    monkeypatch.setattr("sys.stdin", __import__("io").StringIO(new_password + "\n"))
    assert cli_main(["reset-password", "--email", FOUNDER_EMAIL, "--password-stdin"]) == 0
    assert client.get("/auth/me").status_code == 401  # old session revoked
    assert login(client).status_code == 401
    assert login(client, password=new_password).status_code == 200


def test_cli_rejects_short_password(founder_account, monkeypatch):
    monkeypatch.setattr("sys.stdin", __import__("io").StringIO("short\n"))
    assert cli_main(["reset-password", "--email", FOUNDER_EMAIL, "--password-stdin"]) == 1


def test_cookie_is_marked_secure_when_enabled(anon, monkeypatch):
    from orbit.config import get_settings

    monkeypatch.setattr(get_settings(), "cookie_secure", True)
    r = login(anon)
    assert "secure" in r.headers["set-cookie"].lower()
