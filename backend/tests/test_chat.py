"""Task comments = chat, and execution records for the live panel (PRD 17.4)."""

import pytest

from orbit import chat
from orbit.db import SessionLocal
from orbit.models import Execution, ExecutionEventKind, ExecutionStatus


@pytest.fixture
def ctx(api, client):
    dev = api.agent("Dev", instructions="v1")
    qa = api.agent("QA")
    outsider = api.agent("Outsider")
    project = api.project()
    for a in (dev, qa):
        api.ok(api.assign(project["id"], a["id"]))
    task = api.ok(
        client.post(
            f"/projects/{project['id']}/tasks",
            json={"title": "T", "acceptance_criteria": "- ok", "assignee_id": dev["id"]},
        )
    )

    def post(body, mentions=()):
        return client.post(f"/tasks/{task['id']}/messages", json={"body": body, "mentions": list(mentions)})

    def executions():
        return api.ok(client.get(f"/tasks/{task['id']}/executions"))

    return dict(dev=dev, qa=qa, outsider=outsider, task=task, post=post, executions=executions)


def advance(execution_id, *statuses):
    with SessionLocal() as db:
        ex = db.get(Execution, execution_id)
        for status in statuses:
            chat.advance_execution(db, ex, ExecutionStatus(status))
        db.commit()


def run(execution_id, *events):
    """Simulate the runtime: start an execution and append events."""
    advance(execution_id, "preparing", "running")
    with SessionLocal() as db:
        ex = db.get(Execution, execution_id)
        for kind, payload in events:
            chat.record_event(db, ex, kind, payload)
        db.commit()


def test_comment_without_mention_is_a_note_only(api, client, ctx):
    msg = api.ok(ctx["post"]("Looks good so far"))
    assert msg["mentions"] == []
    assert ctx["executions"]() == []
    assert [m["body"] for m in api.ok(client.get(f"/tasks/{ctx['task']['id']}/messages"))] == [
        "Looks good so far"
    ]


def test_one_thread_per_task(api, client, ctx):
    api.ok(ctx["post"]("first"))
    api.ok(ctx["post"]("second"))
    with SessionLocal() as db:
        from sqlalchemy import func, select

        from orbit.models import Conversation

        assert db.scalar(select(func.count()).select_from(Conversation)) == 1


def test_mention_queues_a_new_execution_with_instruction_snapshot(api, client, ctx):
    msg = api.ok(ctx["post"]("@Dev please start", [ctx["dev"]["id"]]))
    [ex] = ctx["executions"]()
    assert ex["agent_id"] == ctx["dev"]["id"]
    assert (ex["status"], ex["trigger"], ex["trigger_message_id"]) == ("queued", "chat_mention", msg["id"])
    assert ex["instruction_version_id"] is not None
    assert "token_limit" not in ex  # no token budget in the MVP


def test_mention_of_working_assignee_goes_to_running_execution(api, client, ctx):
    api.ok(ctx["post"]("go", [ctx["dev"]["id"]]))
    [ex] = ctx["executions"]()
    run(ex["id"])
    msg = api.ok(ctx["post"]("@Dev also add tests", [ctx["dev"]["id"]]))
    assert len(ctx["executions"]()) == 1  # no new execution
    events = api.ok(client.get(f"/executions/{ex['id']}/events"))
    assert events[-1]["kind"] == "instruction" and events[-1]["payload"] == {"message_id": msg["id"]}


def test_mention_of_other_agent_starts_new_invocation_while_assignee_runs(api, client, ctx):
    api.ok(ctx["post"]("go", [ctx["dev"]["id"]]))
    run(ctx["executions"]()[0]["id"])
    api.ok(ctx["post"]("@QA review this", [ctx["qa"]["id"]]))
    latest = ctx["executions"]()[0]
    assert (latest["agent_id"], latest["status"]) == (ctx["qa"]["id"], "queued")
    assert len(ctx["executions"]()) == 2


def test_mention_must_be_available_agent_in_project(api, client, ctx):
    r = ctx["post"]("hi", [ctx["outsider"]["id"]])
    assert r.status_code == 409 and r.json()["code"] == "agent_not_in_project"
    api.ok(client.post(f"/agents/{ctx['qa']['id']}/archive"))
    r = ctx["post"]("hi", [ctx["qa"]["id"]])
    assert r.status_code == 409 and r.json()["code"] == "agent_unavailable"
    assert ctx["post"]("hi", [9999]).json()["code"] == "invalid_mention"
    assert api.ok(client.get(f"/tasks/{ctx['task']['id']}/messages")) == []  # nothing stored


def test_live_panel_data_step_output_tools_tokens(api, client, ctx):
    api.ok(ctx["post"]("go", [ctx["dev"]["id"]]))
    ex_id = ctx["executions"]()[0]["id"]
    run(
        ex_id,
        (ExecutionEventKind.STEP, {"step": "Running tests"}),
        (ExecutionEventKind.OUTPUT, {"text": "3 passed"}),
        (ExecutionEventKind.TOOL, {"tool": "bash", "summary": "pytest -q"}),
        (ExecutionEventKind.TOKENS, {"used": 1200}),
    )
    ex = api.ok(client.get(f"/executions/{ex_id}"))
    assert (ex["status"], ex["current_step"], ex["tokens_used"]) == ("running", "Running tests", 1200)
    events = api.ok(client.get(f"/executions/{ex_id}/events"))
    assert [e["seq"] for e in events] == [1, 2, 3, 4]
    newer = api.ok(client.get(f"/executions/{ex_id}/events", params={"after_seq": 2}))
    assert [e["kind"] for e in newer] == ["tool", "tokens"]


def test_stop_execution(api, client, ctx):
    api.ok(ctx["post"]("go", [ctx["dev"]["id"]]))
    ex_id = ctx["executions"]()[0]["id"]
    run(ex_id)
    ex = api.ok(client.post(f"/executions/{ex_id}/stop"))
    assert ex["status"] == "cancelled" and ex["finished_at"] is not None
    assert client.post(f"/executions/{ex_id}/stop").json()["code"] == "invalid_execution_transition"
    # A later mention of the assignee starts a new invocation, not an instruction.
    api.ok(ctx["post"]("again", [ctx["dev"]["id"]]))
    assert [e["status"] for e in ctx["executions"]()] == ["queued", "cancelled"]


def test_reading_task_and_panel_triggers_nothing(api, client, ctx):
    tid = ctx["task"]["id"]
    for path in (f"/tasks/{tid}", f"/tasks/{tid}/messages", f"/tasks/{tid}/executions", f"/tasks/{tid}/events"):
        api.ok(client.get(path))
    assert ctx["executions"]() == []
    assert api.ok(client.get(f"/tasks/{tid}/messages")) == []


def test_unknown_execution_is_404(api, client):
    assert client.get("/executions/1").status_code == 404


# --- Lifecycle (PRD 18.3) -------------------------------------------------------

def _queued(api, ctx):
    api.ok(ctx["post"]("go", [ctx["dev"]["id"]]))
    return ctx["executions"]()[0]["id"]


def test_lifecycle_happy_path_sets_timestamps(api, client, ctx):
    ex_id = _queued(api, ctx)
    advance(ex_id, "preparing")
    ex = api.ok(client.get(f"/executions/{ex_id}"))
    assert ex["status"] == "preparing" and ex["started_at"] is not None
    advance(ex_id, "running", "waiting_for_input", "running", "completed")
    ex = api.ok(client.get(f"/executions/{ex_id}"))
    assert ex["status"] == "completed" and ex["finished_at"] is not None


@pytest.mark.parametrize(
    "path,bad",
    [
        ([], "running"),  # queued must prepare first
        (["preparing"], "waiting_for_input"),
        (["preparing", "running"], "suspended"),  # only from waiting_for_input
        (["preparing", "running", "completed"], "running"),
        (["preparing", "running", "failed"], "queued"),
    ],
)
def test_invalid_lifecycle_transitions(api, ctx, path, bad):
    ex_id = _queued(api, ctx)
    advance(ex_id, *path)
    with pytest.raises(chat.ChatError):
        advance(ex_id, bad)


def test_answering_agent_question_goes_to_waiting_execution(api, client, ctx):
    ex_id = _queued(api, ctx)
    advance(ex_id, "preparing", "running", "waiting_for_input")
    msg = api.ok(ctx["post"]("Use the blue button", [ctx["dev"]["id"]]))
    assert len(ctx["executions"]()) == 1
    events = api.ok(client.get(f"/executions/{ex_id}/events"))
    assert events[-1]["payload"] == {"message_id": msg["id"]}


def test_suspended_execution_can_be_resumed_or_cancelled(api, client, ctx):
    ex_id = _queued(api, ctx)
    advance(ex_id, "preparing", "running", "waiting_for_input", "suspended")
    assert api.ok(client.post(f"/executions/{ex_id}/resume"))["status"] == "queued"
    assert client.post(f"/executions/{ex_id}/resume").json()["code"] == "invalid_execution_transition"
    advance(ex_id, "preparing", "running", "waiting_for_input", "suspended")
    assert api.ok(client.post(f"/executions/{ex_id}/stop"))["status"] == "cancelled"


# --- Waiting on you (PRD 4.4) ----------------------------------------------------

def test_waiting_on_you_lists_what_needs_the_founder(api, client, ctx):
    tid = ctx["task"]["id"]
    assert api.ok(client.get("/waiting-on-you")) == []

    question = _queued(api, ctx)
    advance(question, "preparing", "running", "waiting_for_input")
    api.ok(ctx["post"]("@QA check", [ctx["qa"]["id"]]))
    suspended = ctx["executions"]()[0]["id"]
    advance(suspended, "preparing", "running", "waiting_for_input", "suspended")

    pr = "https://github.com/example/sandbox/pull/7"
    for to in ("assigned", "in_progress", "founder_approval"):
        api.ok(client.post(f"/tasks/{tid}/transitions", json={"to_status": to, "pr_url": pr}))
    blocked = api.ok(
        client.post(f"/projects/{ctx['task']['project_id']}/tasks", json={"title": "Stuck"})
    )
    api.ok(client.post(f"/tasks/{blocked['id']}/transitions", json={"to_status": "blocked", "reason": "Need API key"}))

    items = {(i["kind"], i["task_id"], i["execution_id"]): i for i in api.ok(client.get("/waiting-on-you"))}
    assert set(items) == {
        ("agent_question", tid, question),
        ("suspended", tid, suspended),
        ("pr_review", tid, None),
        ("blocked", blocked["id"], None),
    }
    assert items[("pr_review", tid, None)]["pr_url"] == pr
    assert items[("blocked", blocked["id"], None)]["reason"] == "Need API key"
    assert items[("pr_review", tid, None)]["task_key"] == "ORB-1"


def test_waiting_on_you_drops_items_once_handled(api, client, ctx):
    ex_id = _queued(api, ctx)
    advance(ex_id, "preparing", "running", "waiting_for_input", "suspended")
    assert len(api.ok(client.get("/waiting-on-you"))) == 1
    api.ok(client.post(f"/executions/{ex_id}/resume"))
    assert api.ok(client.get("/waiting-on-you")) == []
