"""Project Chat: one thread per project; mentions invoke agents without a task."""

import pytest


@pytest.fixture
def ctx(api, client):
    dev = api.agent("Dev")
    outsider = api.agent("Outsider")
    project = api.project()
    api.ok(api.assign(project["id"], dev["id"]))
    pid = project["id"]

    def post(body, mentions=()):
        return client.post(f"/projects/{pid}/messages", json={"body": body, "mentions": list(mentions)})

    return dict(dev=dev, outsider=outsider, project=project, pid=pid, post=post)


def test_project_thread_separate_from_task_threads(api, client, ctx):
    t = api.ok(client.post(f"/projects/{ctx['pid']}/tasks", json={"title": "T"}))
    api.ok(client.post(f"/tasks/{t['id']}/messages", json={"body": "task comment"}))
    api.ok(ctx["post"]("hello team"))
    api.ok(ctx["post"]("second"))
    assert [m["body"] for m in api.ok(client.get(f"/projects/{ctx['pid']}/messages"))] == [
        "hello team",
        "second",
    ]
    assert [m["body"] for m in api.ok(client.get(f"/tasks/{t['id']}/messages"))] == ["task comment"]


def test_mention_queues_execution_without_task(api, client, ctx):
    msg = api.ok(ctx["post"]("@Dev refactor the config loader", [ctx["dev"]["id"]]))
    [ex] = api.ok(client.get(f"/projects/{ctx['pid']}/executions"))
    assert (ex["task_id"], ex["agent_id"], ex["status"], ex["trigger"], ex["trigger_message_id"]) == (
        None,
        ctx["dev"]["id"],
        "queued",
        "chat_mention",
        msg["id"],
    )


def test_message_without_mention_invokes_nothing(api, client, ctx):
    api.ok(ctx["post"]("just a note"))
    assert api.ok(client.get(f"/projects/{ctx['pid']}/executions")) == []


def test_mention_must_be_agent_in_project(api, client, ctx):
    r = ctx["post"]("hi", [ctx["outsider"]["id"]])
    assert r.status_code == 409 and r.json()["code"] == "agent_not_in_project"


def test_reading_project_chat_triggers_nothing(api, client, ctx):
    assert api.ok(client.get(f"/projects/{ctx['pid']}/messages")) == []
    assert api.ok(client.get(f"/projects/{ctx['pid']}/executions")) == []


def test_tasks_expose_from_chat_fields(api, client, ctx):
    t = api.ok(client.post(f"/projects/{ctx['pid']}/tasks", json={"title": "T"}))
    assert (t["from_chat"], t["source_message_id"]) == (False, None)
