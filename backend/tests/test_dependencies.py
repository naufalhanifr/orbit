"""Task dependencies: a task waits for its dependencies and moves automatically."""

import pytest

PR = "https://github.com/example/sandbox/pull/1"


@pytest.fixture
def ctx(api, client):
    dev = api.agent("Dev")
    sub = api.agent("Sub", supervisor=dev["id"])
    project = api.project()
    for a in (dev, sub):
        api.ok(api.assign(project["id"], a["id"]))

    def task(assignee=None, ac="- done", **extra):
        body = {"title": "T", "acceptance_criteria": ac, "assignee_id": assignee, **extra}
        return api.ok(client.post(f"/projects/{project['id']}/tasks", json=body))

    def move(t, to, **extra):
        return client.post(f"/tasks/{t['id']}/transitions", json={"to_status": to, **extra})

    def finish(t):
        steps = ["assigned", "in_progress", "founder_approval", "done"]
        current = api.ok(client.get(f"/tasks/{t['id']}"))["status"]
        start = steps.index(current) + 1 if current in steps else 0
        for to in steps[start:]:
            api.ok(move(t, to, pr_url=PR))

    def depend(t, on):
        return client.post(f"/tasks/{t['id']}/dependencies", json={"depends_on_id": on["id"]})

    def get(t):
        return api.ok(client.get(f"/tasks/{t['id']}"))

    return dict(dev=dev, sub=sub, project=project, task=task, move=move, finish=finish,
                depend=depend, get=get)


def test_task_cannot_be_assigned_until_dependencies_are_done(api, ctx):
    a = ctx["task"](ctx["dev"]["id"])
    b = ctx["task"](ctx["sub"]["id"])
    assert api.ok(ctx["depend"](b, a))["depends_on"] == [a["id"]]
    r = ctx["move"](b, "assigned")
    assert r.status_code == 409 and r.json()["code"] == "dependencies_not_done"


def test_dependent_moves_to_assigned_automatically_and_agent_becomes_ready(api, client, ctx):
    a = ctx["task"](ctx["dev"]["id"])
    b = ctx["task"](ctx["sub"]["id"])
    api.ok(ctx["depend"](b, a))
    assert api.ok(client.get(f"/agents/{ctx['sub']['id']}"))["status"] == "draft"
    ctx["finish"](a)
    assert ctx["get"](b)["status"] == "assigned"
    assert api.ok(client.get(f"/agents/{ctx['sub']['id']}"))["status"] == "ready"
    last = api.ok(client.get(f"/tasks/{b['id']}/events"))[-1]
    assert (last["to_status"], last["actor_id"]) == ("assigned", None)  # system


def test_waits_for_all_dependencies(api, ctx):
    a1, a2 = ctx["task"](ctx["dev"]["id"]), ctx["task"](ctx["dev"]["id"])
    b = ctx["task"](ctx["sub"]["id"])
    api.ok(ctx["depend"](b, a1))
    api.ok(ctx["depend"](b, a2))
    ctx["finish"](a1)
    assert ctx["get"](b)["status"] == "backlog"
    ctx["finish"](a2)
    assert ctx["get"](b)["status"] == "assigned"


def test_chain_moves_one_step_at_a_time(api, ctx):
    a, b, c = (ctx["task"](ctx["dev"]["id"]) for _ in range(3))
    api.ok(ctx["depend"](b, a))
    api.ok(ctx["depend"](c, b))
    ctx["finish"](a)
    assert (ctx["get"](b)["status"], ctx["get"](c)["status"]) == ("assigned", "backlog")
    ctx["finish"](ctx["get"](b))
    assert ctx["get"](c)["status"] == "assigned"


def test_unready_dependent_stays_in_backlog_then_moves_once_completed(api, client, ctx):
    a = ctx["task"](ctx["dev"]["id"])
    b = ctx["task"](assignee=None, ac=None)
    api.ok(ctx["depend"](b, a))
    ctx["finish"](a)
    assert ctx["get"](b)["status"] == "backlog"
    api.ok(client.patch(f"/tasks/{b['id']}", json={"assignee_id": ctx["sub"]["id"]}))
    assert ctx["get"](b)["status"] == "backlog"  # still no acceptance criteria
    t = api.ok(client.patch(f"/tasks/{b['id']}", json={"acceptance_criteria": "- ok"}))
    assert t["status"] == "assigned"


def test_paused_assignee_keeps_dependent_in_backlog(api, client, ctx):
    a = ctx["task"](ctx["dev"]["id"])
    b = ctx["task"](ctx["sub"]["id"])
    api.ok(ctx["depend"](b, a))
    api.ok(client.patch(f"/agents/{ctx['sub']['id']}", json={"status": "paused"}))
    ctx["finish"](a)
    assert ctx["get"](a)["status"] == "done"
    assert ctx["get"](b)["status"] == "backlog"


def test_cancelled_dependency_blocks_until_removed(api, client, ctx):
    a = ctx["task"](ctx["dev"]["id"])
    b = ctx["task"](ctx["sub"]["id"])
    api.ok(ctx["depend"](b, a))
    api.ok(ctx["move"](a, "cancelled", reason="dropped"))
    assert ctx["get"](b)["status"] == "backlog"
    t = api.ok(client.delete(f"/tasks/{b['id']}/dependencies/{a['id']}"))
    assert t["depends_on"] == [] and t["status"] == "assigned"


def test_task_without_dependencies_is_not_moved_automatically(api, client, ctx):
    b = ctx["task"](ctx["sub"]["id"])
    t = api.ok(client.patch(f"/tasks/{b['id']}", json={"title": "renamed"}))
    assert t["status"] == "backlog"


def test_dependency_on_done_task_allows_assignment(api, ctx):
    a = ctx["task"](ctx["dev"]["id"])
    ctx["finish"](a)
    b = ctx["task"](ctx["sub"]["id"])
    api.ok(ctx["depend"](b, a))
    assert api.ok(ctx["move"](b, "assigned"))["status"] == "assigned"


def test_dependency_cycles_are_rejected(api, ctx):
    a, b, c = (ctx["task"]() for _ in range(3))
    assert ctx["depend"](a, a).json()["code"] == "dependency_cycle"
    api.ok(ctx["depend"](b, a))
    api.ok(ctx["depend"](c, b))
    r = ctx["depend"](a, c)
    assert r.status_code == 409 and r.json()["code"] == "dependency_cycle"


def test_dependencies_only_added_in_backlog(api, ctx):
    a = ctx["task"](ctx["dev"]["id"])
    b = ctx["task"](ctx["sub"]["id"])
    api.ok(ctx["move"](b, "assigned"))
    assert ctx["depend"](b, a).json()["code"] == "not_backlog"


def test_dependencies_across_projects_in_same_org(api, client, ctx):
    other = api.project("OTH", "Other")
    x = api.ok(client.post(f"/projects/{other['id']}/tasks", json={"title": "X"}))
    b = ctx["task"](ctx["sub"]["id"])
    api.ok(ctx["depend"](b, x))
    assert ctx["move"](b, "assigned").json()["code"] == "dependencies_not_done"
