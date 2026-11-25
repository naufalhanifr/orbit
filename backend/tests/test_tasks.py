"""Task state machine (PRD 15.1 adapted to MVP 4.4)."""

import pytest

from orbit.models import TaskStatus
from orbit.tasks import TERMINAL, TRANSITIONS

PR = "https://github.com/example/sandbox/pull/1"


@pytest.fixture
def setup(api, client):
    cto = api.agent("CTO", ready=True)
    dev = api.agent("Dev", supervisor=cto["id"], ready=True)
    project = api.project()
    api.ok(api.assign(project["id"], dev["id"]))
    return {"project": project, "dev": dev, "cto": cto}


@pytest.fixture
def new_task(api, client, setup):
    def make(**fields):
        body = {"title": "Add login page", "acceptance_criteria": "- page renders", **fields}
        return api.ok(client.post(f"/projects/{setup['project']['id']}/tasks", json=body))

    return make


def move(client, task, to, **extra):
    return client.post(f"/tasks/{task['id']}/transitions", json={"to_status": to, **extra})


def advance(api, client, task, path, dev_id):
    """Drive a task along a path of statuses with valid payloads."""
    for to in path:
        extra = {}
        if to == "assigned" and task["assignee_id"] is None:
            task = api.ok(client.patch(f"/tasks/{task['id']}", json={"assignee_id": dev_id}))
        if to == "founder_approval":
            extra["pr_url"] = PR
        if to in {"revision", "blocked", "cancelled"}:
            extra["reason"] = "because"
        task = api.ok(move(client, task, to, **extra))
    return task


def test_task_key_and_numbering(new_task):
    a, b = new_task(), new_task()
    assert (a["key"], b["key"]) == ("ORB-1", "ORB-2")
    assert a["status"] == "backlog"


def test_happy_path_to_done_via_founder_review(api, client, setup, new_task):
    t = advance(api, client, new_task(), ["assigned", "in_progress", "founder_approval", "done"], setup["dev"]["id"])
    assert t["status"] == "done" and t["pr_url"] == PR
    events = api.ok(client.get(f"/tasks/{t['id']}/events"))
    assert [(e["from_status"], e["to_status"]) for e in events] == [
        ("backlog", "assigned"),
        ("assigned", "in_progress"),
        ("in_progress", "founder_approval"),
        ("founder_approval", "done"),
    ]


def test_revision_loop(api, client, setup, new_task):
    t = advance(api, client, new_task(), ["assigned", "in_progress", "founder_approval"], setup["dev"]["id"])
    t = api.ok(move(client, t, "revision", reason="Button label is wrong"))
    assert t["revision_count"] == 1
    t = advance(api, client, t, ["founder_approval", "done"], setup["dev"]["id"])
    assert t["status"] == "done"


VALID = {(src, dst) for src, dsts in TRANSITIONS.items() for dst in dsts}
FORWARD_STATUSES = [s for s in TaskStatus if s not in {TaskStatus.BLOCKED, TaskStatus.CANCELLED}]
PATH_TO = {
    "backlog": [],
    "assigned": ["assigned"],
    "in_progress": ["assigned", "in_progress"],
    "founder_approval": ["assigned", "in_progress", "founder_approval"],
    "revision": ["assigned", "in_progress", "founder_approval", "revision"],
    "done": ["assigned", "in_progress", "founder_approval", "done"],
}


@pytest.mark.parametrize(
    "src,dst",
    [
        (s, d)
        for s in FORWARD_STATUSES
        for d in FORWARD_STATUSES
        if (s, d) not in VALID
    ],
)
def test_invalid_forward_transitions_are_rejected(api, client, setup, new_task, src, dst):
    t = advance(api, client, new_task(), PATH_TO[src.value], setup["dev"]["id"])
    r = move(client, t, dst.value, reason="x", pr_url=PR)
    assert r.status_code == 409, f"{src} -> {dst} should be rejected"
    assert api.ok(client.get(f"/tasks/{t['id']}"))["status"] == src.value


def test_no_po_review_status_in_mvp(client, new_task):
    r = move(client, new_task(), "po_review")
    assert r.status_code == 422


def test_acceptance_criteria_required_before_assigned(api, client, setup, new_task):
    t = new_task(acceptance_criteria=None, assignee_id=setup["dev"]["id"])
    r = move(client, t, "assigned")
    assert r.status_code == 409 and r.json()["code"] == "acceptance_criteria_required"
    t = api.ok(client.patch(f"/tasks/{t['id']}", json={"acceptance_criteria": "   "}))
    assert move(client, t, "assigned").json()["code"] == "acceptance_criteria_required"
    api.ok(client.patch(f"/tasks/{t['id']}", json={"acceptance_criteria": "- works"}))
    assert api.ok(move(client, t, "assigned"))["status"] == "assigned"


def test_exploratory_task_can_waive_acceptance_criteria(api, client, setup, new_task):
    t = new_task(acceptance_criteria=None, acceptance_criteria_waived=True, assignee_id=setup["dev"]["id"])
    assert api.ok(move(client, t, "assigned"))["status"] == "assigned"


def test_acceptance_criteria_cannot_be_cleared_after_assignment(api, client, setup, new_task):
    t = advance(api, client, new_task(), ["assigned"], setup["dev"]["id"])
    r = client.patch(f"/tasks/{t['id']}", json={"acceptance_criteria": ""})
    assert r.status_code == 409


def test_assigned_requires_assignee_in_project(api, client, setup, new_task):
    t = new_task()
    r = move(client, t, "assigned")
    assert r.json()["code"] == "assignee_required"
    outsider = api.agent("Outsider", ready=True)
    r = client.patch(f"/tasks/{t['id']}", json={"assignee_id": outsider["id"]})
    assert r.json()["code"] == "assignee_not_in_project"


def test_draft_agent_becomes_ready_when_founder_assigns_a_task(api, client, setup, new_task):
    sub = api.agent("Subordinate", supervisor=setup["dev"]["id"])
    assert sub["status"] == "draft"
    api.ok(api.assign(setup["project"]["id"], sub["id"]))
    t = new_task(assignee_id=sub["id"])
    assert api.ok(client.get(f"/agents/{sub['id']}"))["status"] == "draft"  # not yet ordered
    api.ok(move(client, t, "assigned"))
    assert api.ok(client.get(f"/agents/{sub['id']}"))["status"] == "ready"


def test_agent_without_any_supervisor_line_is_auto_ready_too(api, client, setup, new_task):
    """No agent supervisor means it reports to the Founder; nothing blocks Ready."""
    solo = api.agent("Solo")
    api.ok(api.assign(setup["project"]["id"], solo["id"]))
    api.ok(move(client, new_task(assignee_id=solo["id"]), "assigned"))
    assert api.ok(client.get(f"/agents/{solo['id']}"))["status"] == "ready"


@pytest.mark.parametrize("status", ["paused", "error"])
def test_paused_or_errored_agent_cannot_be_assigned(api, client, setup, new_task, status):
    a = api.agent("Stopped")
    api.ok(api.assign(setup["project"]["id"], a["id"]))
    api.ok(client.patch(f"/agents/{a['id']}", json={"status": status}))
    r = client.post(f"/projects/{setup['project']['id']}/tasks", json={"title": "x", "assignee_id": a["id"]})
    assert r.status_code == 409 and r.json()["code"] == "assignee_unavailable"
    # Also rejected if the agent was paused after being set as assignee.
    b = api.agent("Later paused")
    api.ok(api.assign(setup["project"]["id"], b["id"]))
    t = new_task(assignee_id=b["id"])
    api.ok(client.patch(f"/agents/{b['id']}", json={"status": status}))
    assert move(client, t, "assigned").json()["code"] == "assignee_unavailable"
    assert api.ok(client.get(f"/agents/{b['id']}"))["status"] == status


def test_founder_review_requires_pr(api, client, setup, new_task):
    t = advance(api, client, new_task(), ["assigned", "in_progress"], setup["dev"]["id"])
    r = move(client, t, "founder_approval")
    assert r.status_code == 409 and r.json()["code"] == "pr_required"


def test_revision_requires_feedback(api, client, setup, new_task):
    t = advance(api, client, new_task(), ["assigned", "in_progress", "founder_approval"], setup["dev"]["id"])
    r = move(client, t, "revision", reason="  ")
    assert r.status_code == 409 and r.json()["code"] == "feedback_required"


@pytest.mark.parametrize("src", ["backlog", "assigned", "in_progress", "founder_approval", "revision"])
def test_block_requires_reason_and_returns_to_previous_status(api, client, setup, new_task, src):
    t = advance(api, client, new_task(), PATH_TO[src], setup["dev"]["id"])
    r = move(client, t, "blocked")
    assert r.status_code == 409 and r.json()["code"] == "reason_required"
    t = api.ok(move(client, t, "blocked", reason="Tests fail on CI"))
    assert t["status"] == "blocked" and t["status_before_block"] == src
    # Only the previous status (or Cancelled) is allowed out of Blocked.
    other = "done" if src != "done" else "backlog"
    assert move(client, t, other, pr_url=PR, reason="x").status_code == 409
    assert move(client, t, "blocked", reason="again").status_code == 409
    t = api.ok(move(client, t, src))
    assert t["status"] == src and t["status_before_block"] is None


@pytest.mark.parametrize("src", ["backlog", "assigned", "in_progress", "founder_approval", "revision"])
def test_cancel_requires_reason(api, client, setup, new_task, src):
    t = advance(api, client, new_task(), PATH_TO[src], setup["dev"]["id"])
    r = move(client, t, "cancelled", reason="")
    assert r.status_code == 409 and r.json()["code"] == "reason_required"
    assert api.ok(move(client, t, "cancelled", reason="No longer needed"))["status"] == "cancelled"


def test_blocked_task_can_be_cancelled(api, client, setup, new_task):
    t = advance(api, client, new_task(), ["blocked"], setup["dev"]["id"])
    assert api.ok(move(client, t, "cancelled", reason="Dropped"))["status"] == "cancelled"


@pytest.mark.parametrize("terminal", sorted(s.value for s in TERMINAL))
def test_terminal_states_allow_nothing(api, client, setup, new_task, terminal):
    path = PATH_TO["done"] if terminal == "done" else ["cancelled"]
    t = advance(api, client, new_task(), path, setup["dev"]["id"])
    for to in TaskStatus:
        r = move(client, t, to.value, reason="x", pr_url=PR)
        assert r.status_code == 409, f"{terminal} -> {to} should be rejected"
    assert client.patch(f"/tasks/{t['id']}", json={"title": "new"}).status_code == 409
