"""Agent status is derived (PRD 10): Idle, Running, Blocked."""

import pytest

from orbit import chat
from orbit.db import SessionLocal
from orbit.models import Execution, ExecutionStatus


@pytest.fixture
def ctx(api, client):
    dev = api.agent("Dev", works_in_all_projects=True)
    project = api.project()
    task = api.ok(
        client.post(
            f"/projects/{project['id']}/tasks",
            json={"title": "T", "acceptance_criteria": "- ok", "assignee_id": dev["id"]},
        )
    )

    def status():
        return api.ok(client.get(f"/agents/{dev['id']}"))["status"]

    def mention():
        api.ok(client.post(f"/tasks/{task['id']}/messages", json={"body": "go", "mentions": [dev["id"]]}))
        return api.ok(client.get(f"/tasks/{task['id']}/executions"))[0]["id"]

    return dict(dev=dev, task=task, status=status, mention=mention)


def advance(execution_id, *statuses):
    with SessionLocal() as db:
        ex = db.get(Execution, execution_id)
        for s in statuses:
            chat.advance_execution(db, ex, ExecutionStatus(s))
        db.commit()


def test_new_agent_is_idle_and_status_cannot_be_set(api, client, ctx):
    assert ctx["status"]() == "idle"
    r = client.patch(f"/agents/{ctx['dev']['id']}", json={"status": "running"})
    assert r.status_code == 200 and ctx["status"]() == "idle"  # field ignored


def test_queued_execution_keeps_agent_idle(ctx):
    ctx["mention"]()
    assert ctx["status"]() == "idle"


@pytest.mark.parametrize("path", [["preparing"], ["preparing", "running"]])
def test_running_while_preparing_or_running(ctx, path):
    advance(ctx["mention"](), *path)
    assert ctx["status"]() == "running"


@pytest.mark.parametrize(
    "path", [["preparing", "running", "waiting_for_input"], ["preparing", "running", "waiting_for_input", "suspended"]]
)
def test_blocked_while_waiting_or_suspended(ctx, path):
    advance(ctx["mention"](), *path)
    assert ctx["status"]() == "blocked"


def test_failed_blocks_until_a_new_execution_starts(ctx):
    advance(ctx["mention"](), "preparing", "running", "failed")
    assert ctx["status"]() == "blocked"
    ctx["mention"]()  # new execution on the same task
    assert ctx["status"]() == "idle"


def test_failed_stops_blocking_when_task_cancelled(api, client, ctx):
    advance(ctx["mention"](), "preparing", "running", "failed")
    api.ok(client.post(f"/tasks/{ctx['task']['id']}/transitions", json={"to_status": "cancelled", "reason": "drop"}))
    assert ctx["status"]() == "idle"


def test_completed_execution_returns_to_idle(ctx):
    advance(ctx["mention"](), "preparing", "running", "completed")
    assert ctx["status"]() == "idle"


def test_blocked_task_blocks_agent(api, client, ctx):
    tid = ctx["task"]["id"]
    api.ok(client.post(f"/tasks/{tid}/transitions", json={"to_status": "blocked", "reason": "Need key"}))
    assert ctx["status"]() == "blocked"
    api.ok(client.post(f"/tasks/{tid}/transitions", json={"to_status": "backlog"}))
    assert ctx["status"]() == "idle"
