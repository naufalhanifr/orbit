"""Agent organization structure rules (PRD 8.2, acceptance criteria in PRD 34)."""

import pytest
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError

from orbit.db import SessionLocal
from orbit.models import Agent


def code(resp):
    return resp.json().get("code")


def chain(api, n):
    """Create a fixed-supervisor chain top -> a2 -> ... of n agents."""
    agents = [api.agent("A1")]
    for i in range(2, n + 1):
        agents.append(api.agent(f"A{i}", supervisor=agents[-1]["id"]))
    return agents


# --- Founder and top agent -------------------------------------------------

def test_new_org_has_zero_agents_and_founder_is_not_an_agent(api, client):
    assert api.ok(client.get("/agents")) == []
    me = api.ok(client.get("/auth/me"))
    assert me["role"] == "founder"


def test_first_agent_becomes_top_and_later_ones_do_not(api):
    cto = api.agent("CTO")
    po = api.agent("PO", supervisor=cto["id"])
    assert cto["is_top"] is True
    assert po["is_top"] is False


def test_top_can_be_ready_without_supervisor(api):
    assert api.agent("CTO", ready=True)["status"] == "ready"


def test_top_cannot_get_a_supervisor(api, client):
    cto = api.agent("CTO")
    po = api.agent("PO", supervisor=cto["id"])
    r = api.set_supervisor(cto["id"], po["id"])
    assert r.status_code == 409 and code(r) in {"top_has_supervisor", "cycle"}
    p = api.project()
    r = api.assign(p["id"], cto["id"], supervisor=po["id"])
    assert r.status_code == 409 and code(r) == "top_has_supervisor"


def test_replacing_top_keeps_exactly_one_top(api, client):
    cto = api.agent("CTO")
    po = api.agent("PO", supervisor=cto["id"])
    new_top = api.ok(client.post(f"/agents/{po['id']}/make-top"))
    assert new_top["is_top"] is True and new_top["fixed_supervisor_id"] is None
    agents = {a["id"]: a for a in api.ok(client.get("/agents"))}
    assert [a["id"] for a in agents.values() if a["is_top"]] == [po["id"]]
    # old top moved under the new top
    assert agents[cto["id"]]["fixed_supervisor_id"] == po["id"]


def test_make_top_clears_new_tops_project_supervisors(api, client):
    cto = api.agent("CTO")
    po = api.agent("PO", supervisor=cto["id"])
    p = api.project()
    pa = api.ok(api.assign(p["id"], po["id"], supervisor=cto["id"]))
    api.ok(client.post(f"/agents/{po['id']}/make-top"))
    rows = api.ok(client.get(f"/projects/{p['id']}/assignments"))
    assert [r["supervisor_id"] for r in rows if r["id"] == pa["id"]] == [None]


def test_database_rejects_a_second_top(api):
    api.agent("CTO")
    other = api.agent("PO")
    with SessionLocal() as db, pytest.raises(IntegrityError):
        db.execute(update(Agent).where(Agent.workforce_id == other["id"]).values(is_top=True))
        db.commit()


def test_top_cannot_be_archived_while_it_has_subordinates(api, client):
    cto = api.agent("CTO")
    api.agent("PO", supervisor=cto["id"])
    r = client.post(f"/agents/{cto['id']}/archive")
    assert r.status_code == 409 and code(r) == "has_subordinates"


def test_top_with_project_only_subordinate_cannot_be_archived(api, client):
    cto = api.agent("CTO")
    dev = api.agent("Dev")
    p = api.project()
    api.ok(api.assign(p["id"], dev["id"], supervisor=cto["id"]))
    r = client.post(f"/agents/{cto['id']}/archive")
    assert r.status_code == 409 and code(r) == "has_subordinates"


def test_top_cannot_be_archived_while_other_agents_remain(api, client):
    cto = api.agent("CTO")
    api.agent("Draft without supervisor")
    r = client.post(f"/agents/{cto['id']}/archive")
    assert r.status_code == 409 and code(r) == "top_in_use"


def test_lone_top_can_be_archived_and_next_agent_becomes_top(api, client):
    cto = api.agent("CTO")
    assert api.ok(client.post(f"/agents/{cto['id']}/archive"))["status"] == "archived"
    assert api.agent("New CTO")["is_top"] is True


def test_agent_with_subordinates_cannot_be_archived(api, client):
    cto = api.agent("CTO")
    po = api.agent("PO", supervisor=cto["id"])
    api.agent("Dev", supervisor=po["id"])
    r = client.post(f"/agents/{po['id']}/archive")
    assert r.status_code == 409 and code(r) == "has_subordinates"


# --- Ready requires a supervisor --------------------------------------------

def test_non_top_cannot_be_ready_without_supervisor(api, client):
    api.agent("CTO")
    po = api.agent("PO")
    r = client.patch(f"/agents/{po['id']}", json={"status": "ready"})
    assert r.status_code == 409 and code(r) == "supervisor_required"


def test_project_supervisor_alone_is_enough_for_ready(api, client):
    cto = api.agent("CTO")
    dev = api.agent("Dev")
    p = api.project()
    api.ok(api.assign(p["id"], dev["id"], supervisor=cto["id"]))
    assert api.ok(client.patch(f"/agents/{dev['id']}", json={"status": "ready"}))["status"] == "ready"


def test_cannot_remove_last_supervisor_from_ready_agent(api):
    cto = api.agent("CTO")
    po = api.agent("PO", supervisor=cto["id"], ready=True)
    r = api.set_supervisor(po["id"], None)
    assert r.status_code == 409 and code(r) == "supervisor_required"


def test_cannot_delete_assignment_holding_ready_agents_only_supervisor(api, client):
    cto = api.agent("CTO")
    dev = api.agent("Dev")
    p = api.project()
    pa = api.ok(api.assign(p["id"], dev["id"], supervisor=cto["id"]))
    api.ok(client.patch(f"/agents/{dev['id']}", json={"status": "ready"}))
    r = client.delete(f"/projects/{p['id']}/assignments/{pa['id']}")
    assert r.status_code == 409 and code(r) == "supervisor_required"


# --- Supervisor validity, cycles and depth ----------------------------------

def test_agent_cannot_supervise_itself(api):
    cto = api.agent("CTO")
    po = api.agent("PO", supervisor=cto["id"])
    r = api.set_supervisor(po["id"], po["id"])
    assert r.status_code == 409 and code(r) == "cycle"


def test_supervisor_must_be_an_existing_agent(api, client):
    cto = api.agent("CTO")
    po = api.agent("PO", supervisor=cto["id"])
    founder_wf = 1  # the Founder's workforce row; humans are not agent supervisors in the MVP
    r = api.set_supervisor(po["id"], founder_wf)
    assert r.status_code == 409 and code(r) == "invalid_supervisor"


def test_fixed_supervisor_cycle_is_rejected(api):
    cto = api.agent("CTO")
    a = api.agent("A", supervisor=cto["id"])
    b = api.agent("B", supervisor=a["id"])
    r = api.set_supervisor(a["id"], b["id"])
    assert r.status_code == 409 and code(r) == "cycle"


def test_cycle_that_only_exists_in_one_project_is_rejected(api):
    cto = api.agent("CTO")
    a = api.agent("A", supervisor=cto["id"])
    b = api.agent("B", supervisor=a["id"])
    p = api.project()
    api.ok(api.assign(p["id"], b["id"]))
    # In project ORB, A would report to B while B reports to A (fixed).
    r = api.assign(p["id"], a["id"], supervisor=b["id"])
    assert r.status_code == 409 and code(r) == "cycle"


def test_same_lines_in_different_projects_do_not_conflict(api):
    """Matrix model: Shared reports to PO1 in project A and PO2 in project B."""
    cto = api.agent("CTO")
    po1 = api.agent("PO 1", supervisor=cto["id"])
    po2 = api.agent("PO 2", supervisor=cto["id"])
    shared = api.agent("Shared", supervisor=cto["id"])
    pa, pb = api.project("AAA", "A"), api.project("BBB", "B")
    api.ok(api.assign(pa["id"], shared["id"], supervisor=po1["id"]))
    api.ok(api.assign(pb["id"], shared["id"], supervisor=po2["id"]))


def test_four_levels_allowed_five_rejected(api):
    agents = chain(api, 4)
    r = api.c.post("/agents", json={"name": "A5", "fixed_supervisor_id": agents[-1]["id"]})
    assert r.status_code == 409 and code(r) == "too_deep"


def test_depth_is_checked_per_project(api):
    a1, a2, a3 = chain(api, 3)
    a4 = api.agent("A4", supervisor=a1["id"])  # level 2 by fixed line
    p = api.project()
    # In this project A4 reports to A3 -> level 4: fine.
    api.ok(api.assign(p["id"], a4["id"], supervisor=a3["id"]))
    a5 = api.agent("A5", supervisor=a1["id"])
    # A5 under A4 in this project -> level 5: rejected.
    r = api.assign(p["id"], a5["id"], supervisor=a4["id"])
    assert r.status_code == 409 and code(r) == "too_deep"
    # A5 under A4 by fixed line is level 3 outside the project: allowed ...
    api.ok(api.set_supervisor(a5["id"], a4["id"]))
    # ... but joining the project puts it at level 5 there: rejected.
    r = api.assign(p["id"], a5["id"])
    assert r.status_code == 409 and code(r) == "too_deep"


# --- Supervisor resolution for tasks ----------------------------------------

def _task_for(api, client, project, agent):
    t = api.ok(client.post(f"/projects/{project['id']}/tasks", json={"title": "T"}))
    return api.ok(client.patch(f"/tasks/{t['id']}", json={"assignee_id": agent["id"]}))


def test_supervisor_resolution_project_then_fixed_then_founder(api, client):
    cto = api.agent("CTO", ready=True)
    po1 = api.agent("PO 1", supervisor=cto["id"], ready=True)
    po2 = api.agent("PO 2", supervisor=cto["id"], ready=True)
    shared = api.agent("Shared", supervisor=po2["id"], ready=True)
    pa, pb = api.project("AAA", "A"), api.project("BBB", "B")
    api.ok(api.assign(pa["id"], shared["id"], supervisor=po1["id"]))
    api.ok(api.assign(pb["id"], shared["id"]))
    api.ok(api.assign(pa["id"], cto["id"]))

    t_a = _task_for(api, client, pa, shared)
    t_b = _task_for(api, client, pb, shared)
    t_top = _task_for(api, client, pa, cto)

    assert api.ok(client.get(f"/tasks/{t_a['id']}/supervisor"))["id"] == po1["id"]
    assert api.ok(client.get(f"/tasks/{t_b['id']}/supervisor"))["id"] == po2["id"]
    founder = api.ok(client.get(f"/tasks/{t_top['id']}/supervisor"))
    assert founder["is_founder"] is True and founder["type"] == "human"


# --- Instruction versions ---------------------------------------------------

def test_every_instruction_save_creates_a_new_version(api, client):
    cto = api.agent("CTO", instructions="v1 text")
    assert cto["instruction_version"] == 1
    api.ok(client.post(f"/agents/{cto['id']}/instructions", json={"content": "v2 text"}))
    api.ok(client.post(f"/agents/{cto['id']}/instructions", json={"content": "v2 text"}))
    versions = api.ok(client.get(f"/agents/{cto['id']}/instructions"))
    assert [v["version"] for v in versions] == [1, 2, 3]
    assert versions[0]["content"] == "v1 text"
    assert api.ok(client.get(f"/agents/{cto['id']}"))["instruction_version"] == 3
