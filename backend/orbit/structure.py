"""Agent organization structure rules.

Founder decision (2026-11-25), overriding PRD 8.2's single top agent and depth limit:
the Founder is the root of the organisation. Any number of agents may report directly
to the Founder (no agent supervisor = reports to the Founder), and there is no depth
limit. Reporting lines must still never form a cycle, checked for fixed supervisors
and per project (matrix model).

Every change to agents, supervisors or project assignments is applied inside a
transaction and then checked with `validate_structure`; on a violation the caller
rolls back. The organisation is small, so the whole structure is rechecked.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from orbit.errors import DomainError, NotFound
from orbit.models import (
    Agent,
    AgentInstructionVersion,
    AgentStatus,
    ProjectAssignment,
    Task,
    User,
    UserRole,
    Workforce,
    WorkforceType,
)


class StructureError(DomainError):
    pass


def _live_agents(db: Session, org_id: int) -> list[Agent]:
    return list(
        db.scalars(
            select(Agent).where(
                Agent.organization_id == org_id, Agent.status != AgentStatus.ARCHIVED
            )
        )
    )


def _live_assignments(db: Session, org_id: int, live_ids: set[int]) -> list[ProjectAssignment]:
    rows = db.scalars(select(ProjectAssignment).where(ProjectAssignment.organization_id == org_id))
    return [a for a in rows if a.agent_id in live_ids]


def _check_no_cycles(graph: dict[int, int | None], starts, scope: str) -> None:
    for start in starts:
        seen = {start}
        node = graph.get(start)
        while node is not None:
            if node in seen:
                raise StructureError("cycle", f"Reporting lines form a cycle ({scope})")
            seen.add(node)
            node = graph.get(node)


def normalize_supervisor(db: Session, org_id: int, supervisor_id: int | None) -> int | None:
    """The Founder is stored as "no agent supervisor" (NULL)."""
    if supervisor_id is not None:
        founder = founder_workforce(db, org_id)
        if founder is not None and supervisor_id == founder.id:
            return None
        agent = db.get(Agent, supervisor_id)
        if agent is None or agent.organization_id != org_id:
            raise StructureError(
                "invalid_supervisor",
                "Supervisor must be the Founder or an active (non-archived) agent",
            )
    return supervisor_id


def validate_structure(db: Session, org_id: int) -> None:
    db.flush()
    agents = _live_agents(db, org_id)
    if not agents:
        return
    by_id = {a.workforce_id: a for a in agents}
    assignments = _live_assignments(db, org_id, set(by_id))

    for sup_id, owner in [(a.fixed_supervisor_id, a.workforce_id) for a in agents] + [
        (pa.supervisor_id, pa.agent_id) for pa in assignments
    ]:
        if sup_id is None:
            continue
        if sup_id == owner:
            raise StructureError("cycle", "An agent cannot supervise itself")
        if sup_id not in by_id:
            raise StructureError(
                "invalid_supervisor",
                "Supervisor must be the Founder or an active (non-archived) agent",
            )

    base = {a.workforce_id: a.fixed_supervisor_id for a in agents}
    _check_no_cycles(base, base, "fixed supervisors")
    # Per project: each assigned agent's per-project supervisor overrides its fixed one.
    for pid in {pa.project_id for pa in assignments}:
        members = [pa for pa in assignments if pa.project_id == pid]
        graph = dict(base)
        graph.update({pa.agent_id: pa.supervisor_id for pa in members if pa.supervisor_id})
        _check_no_cycles(graph, [pa.agent_id for pa in members], f"project {pid}")


def get_agent(db: Session, org_id: int, agent_id: int) -> Agent:
    agent = db.get(Agent, agent_id)
    if agent is None or agent.organization_id != org_id:
        raise NotFound("Agent")
    return agent


def create_agent(
    db: Session,
    user: User,
    *,
    name: str,
    title: str | None,
    fixed_supervisor_id: int | None = None,
    instructions: str | None = None,
    **profile,
) -> Agent:
    org_id = user.organization_id
    wf = Workforce(organization_id=org_id, type=WorkforceType.AGENT, name=name, title=title)
    db.add(wf)
    db.flush()
    agent = Agent(
        workforce_id=wf.id,
        organization_id=org_id,
        fixed_supervisor_id=normalize_supervisor(db, org_id, fixed_supervisor_id),
        **profile,
    )
    db.add(agent)
    db.flush()
    if instructions is not None:
        save_instructions(db, user, agent, instructions)
    validate_structure(db, org_id)
    return agent


def save_instructions(db: Session, user: User, agent: Agent, content: str) -> AgentInstructionVersion:
    latest = db.scalar(
        select(AgentInstructionVersion.version)
        .where(AgentInstructionVersion.agent_id == agent.workforce_id)
        .order_by(AgentInstructionVersion.version.desc())
        .limit(1)
    )
    version = AgentInstructionVersion(
        organization_id=agent.organization_id,
        agent_id=agent.workforce_id,
        version=(latest or 0) + 1,
        content=content,
        created_by_id=user.id,
    )
    db.add(version)
    db.flush()
    return version


def set_fixed_supervisor(db: Session, agent: Agent, supervisor_id: int | None) -> None:
    agent.fixed_supervisor_id = normalize_supervisor(db, agent.organization_id, supervisor_id)
    validate_structure(db, agent.organization_id)


def set_status(db: Session, agent: Agent, status: AgentStatus) -> None:
    if status == AgentStatus.ARCHIVED:
        raise StructureError("use_archive", "Use the archive action to archive an agent")
    if agent.status == AgentStatus.ARCHIVED:
        raise StructureError("archived", "Archived agents cannot change status")
    agent.status = status
    validate_structure(db, agent.organization_id)


def _subordinate_ids(db: Session, agent: Agent) -> set[int]:
    org_id = agent.organization_id
    live = {a.workforce_id: a for a in _live_agents(db, org_id)}
    subs = {a.workforce_id for a in live.values() if a.fixed_supervisor_id == agent.workforce_id}
    subs |= {
        pa.agent_id
        for pa in _live_assignments(db, org_id, set(live))
        if pa.supervisor_id == agent.workforce_id
    }
    return subs


def archive_agent(db: Session, agent: Agent) -> None:
    if agent.status == AgentStatus.ARCHIVED:
        return
    if _subordinate_ids(db, agent):
        raise StructureError(
            "has_subordinates", "Move this agent's subordinates to another supervisor first"
        )
    agent.status = AgentStatus.ARCHIVED
    validate_structure(db, agent.organization_id)


def founder_workforce(db: Session, org_id: int) -> Workforce:
    return db.scalar(
        select(Workforce)
        .join(User, User.workforce_id == Workforce.id)
        .where(User.organization_id == org_id, User.role == UserRole.FOUNDER)
        .order_by(User.id)
        .limit(1)
    )


def resolve_supervisor(db: Session, task: Task) -> Workforce:
    """Effective supervisor for a task: per-project → fixed → Founder (PRD 8.2)."""
    if task.assignee_id is not None:
        pa = db.scalar(
            select(ProjectAssignment).where(
                ProjectAssignment.project_id == task.project_id,
                ProjectAssignment.agent_id == task.assignee_id,
            )
        )
        if pa is not None and pa.supervisor_id is not None:
            return db.get(Workforce, pa.supervisor_id)
        agent = db.get(Agent, task.assignee_id)
        if agent is not None and agent.fixed_supervisor_id is not None:
            return db.get(Workforce, agent.fixed_supervisor_id)
    return founder_workforce(db, task.organization_id)
