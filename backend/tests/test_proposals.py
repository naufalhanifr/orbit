"""Planning with PO (PRD 17.10)."""

import pytest

from orbit import proposals
from orbit.db import SessionLocal
from orbit.models import Agent, Project

PR = "https://github.com/example/sandbox/pull/1"


@pytest.fixture
def ctx(api, client):
    po = api.agent("PO 1")
    dev = api.agent("Dev", supervisor=po["id"])  # reports to PO by fixed line
    qa = api.agent("QA")  # reports to the Founder
    project = api.project()
    for a in (po, dev, qa):
        api.ok(api.assign(project["id"], a["id"]))

    def propose(items, proposer=None):
        with SessionLocal() as db:
            p = proposals.create_proposal(
                db, db.get(Agent, (proposer or po)["id"]), db.get(Project, project["id"]), items
            )
            db.commit()
            return p.id

    def get(pid):
        return api.ok(client.get(f"/proposals/{pid}"))

    def board():
        return api.ok(client.get(f"/projects/{project['id']}/tasks"))

    return dict(po=po, dev=dev, qa=qa, project=project, propose=propose, get=get, board=board)


BREAKDOWN = [
    {"title": "Google OAuth backend", "acceptance_criteria": "- callback works", "depends_on_positions": []},
    {"title": "Login button", "acceptance_criteria": "- button shows", "depends_on_positions": [1]},
]


def items_with(ctx, **extra):
    return [{**i, "assignee_id": ctx["dev"]["id"], **extra} for i in BREAKDOWN]


def test_pending_proposal_is_not_on_the_board(api, client, ctx):
    pid = ctx["propose"](items_with(ctx))
    assert ctx["board"]() == []
    [listed] = api.ok(client.get(f"/projects/{ctx['project']['id']}/proposals"))
    assert listed["id"] == pid and [i["status"] for i in listed["items"]] == ["pending", "pending"]


def test_approve_all_creates_tasks_with_dependencies(api, client, ctx):
    pid = ctx["propose"](items_with(ctx))
    p = api.ok(client.post(f"/proposals/{pid}/approve", json={}))
    t1, t2 = (i["task_id"] for i in p["items"])
    board = {t["id"]: t for t in ctx["board"]()}
    assert set(board) == {t1, t2}
    assert board[t2]["depends_on"] == [t1]
    assert board[t1]["assignee_id"] == ctx["dev"]["id"] and board[t1]["status"] == "backlog"
    assert api.ok(client.get(f"/projects/{ctx['project']['id']}/proposals")) == []  # nothing pending


def test_approved_tasks_follow_dependency_rules(api, client, ctx):
    pid = ctx["propose"](items_with(ctx))
    t1, t2 = (i["task_id"] for i in api.ok(client.post(f"/proposals/{pid}/approve", json={}))["items"])
    for to in ("assigned", "in_progress", "founder_approval", "done"):
        api.ok(client.post(f"/tasks/{t1}/transitions", json={"to_status": to, "pr_url": PR}))
    assert api.ok(client.get(f"/tasks/{t2}"))["status"] == "assigned"


def test_item_depending_on_done_task_starts_on_approval(api, client, ctx):
    done = api.ok(client.post(
        f"/projects/{ctx['project']['id']}/tasks",
        json={"title": "Base", "acceptance_criteria": "- x", "assignee_id": ctx["dev"]["id"]},
    ))
    for to in ("assigned", "in_progress", "founder_approval", "done"):
        api.ok(client.post(f"/tasks/{done['id']}/transitions", json={"to_status": to, "pr_url": PR}))
    pid = ctx["propose"]([{"title": "Next", "acceptance_criteria": "- y", "assignee_id": ctx["dev"]["id"],
                           "depends_on_task_ids": [done["id"]]}])
    [item] = api.ok(client.post(f"/proposals/{pid}/approve", json={}))["items"]
    assert api.ok(client.get(f"/tasks/{item['task_id']}"))["status"] == "assigned"


def test_approve_per_task_requires_dependencies_approved(api, client, ctx):
    pid = ctx["propose"](items_with(ctx))
    i1, i2 = (i["id"] for i in ctx["get"](pid)["items"])
    r = client.post(f"/proposals/{pid}/approve", json={"item_ids": [i2]})
    assert r.status_code == 409 and r.json()["code"] == "dependency_not_approved"
    api.ok(client.post(f"/proposals/{pid}/approve", json={"item_ids": [i1]}))
    p = api.ok(client.post(f"/proposals/{pid}/approve", json={"item_ids": [i2]}))
    assert [i["status"] for i in p["items"]] == ["approved", "approved"]


def test_rejected_dependency_requires_edit_before_approval(api, client, ctx):
    pid = ctx["propose"](items_with(ctx))
    i1, i2 = (i["id"] for i in ctx["get"](pid)["items"])
    api.ok(client.post(f"/proposals/{pid}/reject", json={"item_ids": [i1]}))
    assert client.post(f"/proposals/{pid}/approve", json={}).json()["code"] == "dependency_not_approved"
    api.ok(client.patch(f"/proposals/{pid}/items/{i2}", json={"depends_on_positions": []}))
    p = api.ok(client.post(f"/proposals/{pid}/approve", json={}))
    assert [i["status"] for i in p["items"]] == ["rejected", "approved"]
    assert len(ctx["board"]()) == 1


def test_reject_all(api, client, ctx):
    pid = ctx["propose"](items_with(ctx))
    p = api.ok(client.post(f"/proposals/{pid}/reject", json={}))
    assert [i["status"] for i in p["items"]] == ["rejected", "rejected"]
    assert ctx["board"]() == []
    assert client.post(f"/proposals/{pid}/approve", json={"item_ids": [p["items"][0]["id"]]}).json()["code"] == "not_pending"


def test_founder_can_edit_items_including_assignee_outside_po_line(api, client, ctx):
    pid = ctx["propose"](items_with(ctx))
    i1 = ctx["get"](pid)["items"][0]["id"]
    item = api.ok(client.patch(
        f"/proposals/{pid}/items/{i1}", json={"title": "OAuth backend", "assignee_id": ctx["qa"]["id"]}
    ))
    assert (item["title"], item["assignee_id"]) == ("OAuth backend", ctx["qa"]["id"])


def test_edit_cannot_create_dependency_cycle(api, client, ctx):
    pid = ctx["propose"](items_with(ctx))
    i1 = ctx["get"](pid)["items"][0]["id"]
    r = client.patch(f"/proposals/{pid}/items/{i1}", json={"depends_on_positions": [2]})
    assert r.status_code == 409 and r.json()["code"] == "dependency_cycle"


def test_po_may_only_propose_its_own_reports_in_the_project(api, ctx):
    with pytest.raises(proposals.ProposalError) as e:
        ctx["propose"]([{"title": "x", "assignee_id": ctx["qa"]["id"]}])  # QA reports to the Founder
    assert e.value.code == "assignee_not_reporting_to_po"


def test_per_project_line_to_po_counts(api, client, ctx):
    pa = [a for a in api.ok(client.get(f"/projects/{ctx['project']['id']}/assignments"))
          if a["agent_id"] == ctx["qa"]["id"]][0]
    api.ok(client.put(
        f"/projects/{ctx['project']['id']}/assignments/{pa['id']}/supervisor",
        json={"supervisor_id": ctx["po"]["id"]},
    ))
    ctx["propose"]([{"title": "x", "assignee_id": ctx["qa"]["id"]}])


def test_assignee_must_work_in_project(api, client, ctx):
    outsider = api.agent("Outsider", supervisor=ctx["po"]["id"])
    with pytest.raises(proposals.ProposalError) as e:
        ctx["propose"]([{"title": "x", "assignee_id": outsider["id"]}])
    assert e.value.code == "assignee_not_in_project"


def test_proposer_must_work_in_project(api, ctx):
    stranger = api.agent("Stranger")
    with pytest.raises(proposals.ProposalError) as e:
        ctx["propose"]([{"title": "x"}], proposer=stranger)
    assert e.value.code == "proposer_not_in_project"


def test_invalid_proposals_are_rejected(ctx):
    for items, code in [
        ([], "empty_proposal"),
        ([{"title": " "}], "invalid_item"),
        ([{"title": "a", "depends_on_positions": [5]}], "invalid_dependency"),
        ([{"title": "a", "depends_on_positions": [2]}, {"title": "b", "depends_on_positions": [1]}], "dependency_cycle"),
        ([{"title": "a", "depends_on_task_ids": [999]}], "invalid_dependency"),
    ]:
        with pytest.raises(proposals.ProposalError) as e:
            ctx["propose"](items)
        assert e.value.code == code
