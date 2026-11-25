import os

os.environ.setdefault(
    "ORBIT_TEST_DATABASE_URL", "postgresql+psycopg://orbit:orbit@localhost:5432/orbit_test"
)
os.environ["ORBIT_DATABASE_URL"] = os.environ["ORBIT_TEST_DATABASE_URL"]
os.environ["ORBIT_COOKIE_SECURE"] = "false"

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from orbit.cli import create_founder  # noqa: E402
from orbit.db import engine  # noqa: E402
from orbit.main import app  # noqa: E402
from orbit.models import Base  # noqa: E402

FOUNDER_EMAIL = "founder@example.com"
FOUNDER_PASSWORD = "correct-horse-battery"


@pytest.fixture(scope="session", autouse=True)
def migrated_db():
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(os.path.dirname(__file__), "..", "alembic"))
    cfg.set_main_option("sqlalchemy.url", os.environ["ORBIT_DATABASE_URL"])
    command.upgrade(cfg, "head")
    yield


@pytest.fixture(autouse=True)
def clean_tables():
    yield
    tables = ", ".join(t.name for t in Base.metadata.sorted_tables)
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))


@pytest.fixture
def founder_account():
    create_founder(FOUNDER_EMAIL, "The Founder", "EVORA", FOUNDER_PASSWORD)


@pytest.fixture
def anon(founder_account):
    return TestClient(app)


@pytest.fixture
def client(founder_account):
    c = TestClient(app)
    r = c.post("/auth/login", json={"email": FOUNDER_EMAIL, "password": FOUNDER_PASSWORD})
    assert r.status_code == 200, r.text
    return c


class Api:
    """Small helpers over the HTTP API for readable tests."""

    def __init__(self, client: TestClient):
        self.c = client

    def ok(self, resp, status=(200, 201, 204)):
        assert resp.status_code in status, resp.text
        return resp.json() if resp.content else None

    def agent(self, name, supervisor=None, **extra):
        return self.ok(self.c.post("/agents", json={"name": name, "fixed_supervisor_id": supervisor, **extra}))

    def project(self, key="ORB", name="Orbit"):
        return self.ok(self.c.post("/projects", json={"key": key, "name": name}))

    def assign(self, project_id, agent_id, supervisor=None):
        return self.c.post(
            f"/projects/{project_id}/assignments",
            json={"agent_id": agent_id, "supervisor_id": supervisor},
        )

    def set_supervisor(self, agent_id, supervisor_id):
        return self.c.put(f"/agents/{agent_id}/supervisor", json={"supervisor_id": supervisor_id})


@pytest.fixture
def api(client):
    return Api(client)
