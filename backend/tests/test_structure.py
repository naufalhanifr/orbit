"""Agent organization structure rules.

Founder decision: the Founder is the root; any number of agents may report directly
to the Founder, with no depth limit. Cycles are still rejected, per project too.
"""

from tests.conftest import Api

FOUNDER_WF = 1  # the Founder's workforce row (first row created by create-founder)


def code(resp):
    return resp.json().get("code")


# --- Founder is the root ------------------------------------------------------

def test_new_org_has_zero_agents_and_founder_is_not_an_agent(api, client):
    assert api.ok(client.get("/agents")) == []
    assert api.ok(client.get("/auth/me"))["role"] == "founder"


def test_many_agents_can_report_directly_to_the_founder(api, client):
    agents = [api.agent(f"Agent {i}") for i in range(5)]
    assert all(a["fixed_supervisor_id"] is None and a["status"] == "idle" for a in agents)


def test_founder_can_be_named_explicitly_as_supervisor(api):
    a = api.agent("A", supervisor=FOUNDER_WF)
    assert a["fixed_supervisor_id"] is None
    b = api.agent("B", supervisor=a["id"])
    assert api.ok(api.set_supervisor(b["id"], FOUNDER_WF))["fixed_supervisor_id"] is None


def test_no_depth_limit(api: Api):
    prev = None
    for i in range(10):
        prev = api.agent(f"L{i}", supervisor=prev["id"] if prev else None)
    assert prev["fixed_supervisor_id"] is not None


def test_no_limit_on_number_of_agents(api):
    for i in range(30):
        api.agent(f"Agent {i}")
    assert len(api.ok(api.c.get("/agents"))) == 30


# --- Supervisor validity and cycles -------------------------------------------

def test_agent_cannot_supervise_itself(api):
    a = api.agent("A")
    r = api.set_supervisor(a["id"], a["id"])
    assert r.status_code == 409 and code(r) == "cycle"


def test_supervisor_must_be_founder_or_live_agent(api, client):
    a = api.agent("A")
    assert code(api.set_supervisor(a["id"], 9999)) == "invalid_supervisor"
    b = api.agent("B")
    api.ok(client.post(f"/agents/{b['id']}/archive"))
    assert code(api.set_supervisor(a["id"], b["id"])) == "invalid_supervisor"


def test_fixed_supervisor_cycle_is_rejected(api):
    a = api.agent("A")
    b = api.agent("B", supervisor=a["id"])
    c = api.agent("C", supervisor=b["id"])
    r = api.set_supervisor(a["id"], c["id"])
    assert r.status_code == 409 and code(r) == "cycle"


def test_cycle_that_only_exists_in_one_project_is_rejected(api):
    a = api.agent("A")
    b = api.agent("B", supervisor=a["id"])
    p = api.project()
    api.ok(api.assign(p["id"], b["id"]))
    # In this project A would report to B while B reports to A (fixed).
    r = api.assign(p["id"], a["id"], supervisor=b["id"])
    assert r.status_code == 409 and code(r) == "cycle"


def test_project_line_cannot_create_cycle_via_update(api, client):
    a = api.agent("A")
    b = api.agent("B", supervisor=a["id"])
    p = api.project()
    api.ok(api.assign(p["id"], b["id"]))
    pa = api.ok(api.assign(p["id"], a["id"]))
    r = client.put(
        f"/projects/{p['id']}/assignments/{pa['id']}/supervisor", json={"supervisor_id": b["id"]}
    )
    assert r.status_code == 409 and code(r) == "cycle"


def test_same_lines_in_different_projects_do_not_conflict(api):
    """Matrix model: Shared reports to PO1 in project A and PO2 in project B."""
    po1, po2 = api.agent("PO 1"), api.agent("PO 2")
    shared = api.agent("Shared")
    pa, pb = api.project("AAA", "A"), api.project("BBB", "B")
    api.ok(api.assign(pa["id"], shared["id"], supervisor=po1["id"]))
    api.ok(api.assign(pb["id"], shared["id"], supervisor=po2["id"]))


def test_opposite_lines_in_different_projects_are_not_a_cycle(api):
    a, b = api.agent("A"), api.agent("B")
    pa, pb = api.project("AAA", "A"), api.project("BBB", "B")
    api.ok(api.assign(pa["id"], a["id"], supervisor=b["id"]))
    api.ok(api.assign(pb["id"], b["id"], supervisor=a["id"]))


# --- Archiving ----------------------------------------------------------------

def test_agent_with_subordinates_cannot_be_archived(api, client):
    po = api.agent("PO")
    api.agent("Dev", supervisor=po["id"])
    r = client.post(f"/agents/{po['id']}/archive")
    assert r.status_code == 409 and code(r) == "has_subordinates"


def test_agent_with_project_only_subordinate_cannot_be_archived(api, client):
    po, dev = api.agent("PO"), api.agent("Dev")
    p = api.project()
    api.ok(api.assign(p["id"], dev["id"], supervisor=po["id"]))
    r = client.post(f"/agents/{po['id']}/archive")
    assert r.status_code == 409 and code(r) == "has_subordinates"


def test_agent_without_subordinates_can_be_archived(api, client):
    a = api.agent("A")
    assert api.ok(client.post(f"/agents/{a['id']}/archive"))["archived"] is True
    assert api.ok(client.get("/agents")) == []
    [archived] = api.ok(client.get("/agents", params={"include_archived": True}))
    assert archived["id"] == a["id"]


# --- Supervisor resolution for tasks ------------------------------------------

def _task_for(api, client, project, agent):
    t = api.ok(client.post(f"/projects/{project['id']}/tasks", json={"title": "T"}))
    return api.ok(client.patch(f"/tasks/{t['id']}", json={"assignee_id": agent["id"]}))


def test_supervisor_resolution_project_then_fixed_then_founder(api, client):
    cto = api.agent("CTO")
    po1 = api.agent("PO 1", supervisor=cto["id"])
    po2 = api.agent("PO 2", supervisor=cto["id"])
    shared = api.agent("Shared", supervisor=po2["id"])
    pa, pb = api.project("AAA", "A"), api.project("BBB", "B")
    api.ok(api.assign(pa["id"], shared["id"], supervisor=po1["id"]))
    api.ok(api.assign(pb["id"], shared["id"]))
    api.ok(api.assign(pa["id"], cto["id"]))

    t_a = _task_for(api, client, pa, shared)
    t_b = _task_for(api, client, pb, shared)
    t_root = _task_for(api, client, pa, cto)

    assert api.ok(client.get(f"/tasks/{t_a['id']}/supervisor"))["id"] == po1["id"]
    assert api.ok(client.get(f"/tasks/{t_b['id']}/supervisor"))["id"] == po2["id"]
    founder = api.ok(client.get(f"/tasks/{t_root['id']}/supervisor"))
    assert founder["is_founder"] is True and founder["id"] == FOUNDER_WF


# --- Instruction versions -----------------------------------------------------

def test_every_instruction_save_creates_a_new_version(api, client):
    a = api.agent("CTO", instructions="v1 text")
    assert a["instruction_version"] == 1
    api.ok(client.post(f"/agents/{a['id']}/instructions", json={"content": "v2 text"}))
    api.ok(client.post(f"/agents/{a['id']}/instructions", json={"content": "v2 text"}))
    versions = api.ok(client.get(f"/agents/{a['id']}/instructions"))
    assert [v["version"] for v in versions] == [1, 2, 3]
    assert versions[0]["content"] == "v1 text"
    assert api.ok(client.get(f"/agents/{a['id']}"))["instruction_version"] == 3
