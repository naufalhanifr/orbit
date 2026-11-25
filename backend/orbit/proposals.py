"""Planning with PO (PRD 17.10): a PO agent proposes a task breakdown, the
Founder approves, edits or rejects it (whole or per task), and approved items
become real tasks. Pending proposals never appear on the board.

`create_proposal` is what the runtime tool `orbit_propose_tasks` will call
(ADR-0001 §3.4).
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from orbit import tasks as task_svc
from orbit.errors import DomainError, NotFound
from orbit.models import (
    Agent,
    ConversationMessage,
    Execution,
    Project,
    ProposalItemStatus,
    Task,
    TaskProposal,
    TaskProposalItem,
    User,
)
from orbit.structure import effective_supervisor_id, works_in

P = ProposalItemStatus
EDITABLE = ("title", "description", "acceptance_criteria", "assignee_id", "depends_on_positions", "depends_on_task_ids")


class ProposalError(DomainError):
    pass


def get_proposal(db: Session, org_id: int, proposal_id: int) -> TaskProposal:
    proposal = db.get(TaskProposal, proposal_id)
    if proposal is None or proposal.organization_id != org_id:
        raise NotFound("Proposal")
    return proposal


def _check_assignee(db: Session, project_id: int, agent_id: int, *, proposer: Agent | None) -> None:
    agent = db.get(Agent, agent_id)
    if agent is None or agent.organization_id != db.get(Project, project_id).organization_id:
        raise ProposalError("invalid_assignee", f"Agent {agent_id} does not exist")
    if agent.archived_at is not None:
        raise ProposalError("assignee_unavailable", f"Agent {agent_id} is archived")
    if not works_in(db, agent, project_id):
        raise ProposalError("assignee_not_in_project", f"Agent {agent_id} does not work in this project")
    # The PO may only propose its own reports in this project; the Founder may pick anyone.
    if proposer is not None and effective_supervisor_id(db, agent_id, project_id) != proposer.workforce_id:
        raise ProposalError(
            "assignee_not_reporting_to_po",
            f"Agent {agent_id} does not report to the proposing PO in this project",
        )


def _check_dependencies(db: Session, proposal: TaskProposal) -> None:
    positions = {i.position for i in proposal.items}
    graph = {}
    for item in proposal.items:
        for pos in item.depends_on_positions:
            if pos == item.position or pos not in positions:
                raise ProposalError("invalid_dependency", f"Item {item.position}: invalid dependency {pos}")
        for task_id in item.depends_on_task_ids:
            t = db.get(Task, task_id)
            if t is None or t.organization_id != proposal.organization_id:
                raise ProposalError("invalid_dependency", f"Item {item.position}: task {task_id} not found")
        graph[item.position] = set(item.depends_on_positions)
    _topological(graph)


def _topological(graph: dict[int, set[int]]) -> list[int]:
    order, done, visiting = [], set(), set()

    def visit(n: int) -> None:
        if n in done:
            return
        if n in visiting:
            raise ProposalError("dependency_cycle", "Proposed task dependencies form a cycle")
        visiting.add(n)
        for d in sorted(graph.get(n, ())):
            visit(d)
        visiting.discard(n)
        done.add(n)
        order.append(n)

    for n in sorted(graph):
        visit(n)
    return order


def create_proposal(
    db: Session,
    proposer: Agent,
    project: Project,
    items: list[dict],
    *,
    execution: Execution | None = None,
    message: ConversationMessage | None = None,
) -> TaskProposal:
    """Runtime entry point. Each item: title, description, acceptance_criteria,
    assignee_id, depends_on_positions (1-based within this proposal), depends_on_task_ids."""
    if proposer.archived_at is not None or not works_in(db, proposer, project.id):
        raise ProposalError("proposer_not_in_project", "The PO must work in this project")
    if not items:
        raise ProposalError("empty_proposal", "A proposal needs at least one task")
    proposal = TaskProposal(
        organization_id=project.organization_id,
        project_id=project.id,
        proposer_id=proposer.workforce_id,
        execution_id=execution.id if execution else None,
        message_id=message.id if message else None,
    )
    db.add(proposal)
    db.flush()
    for position, fields in enumerate(items, start=1):
        unknown = set(fields) - set(EDITABLE)
        if unknown or not (fields.get("title") or "").strip():
            raise ProposalError("invalid_item", f"Item {position}: title required, unknown {sorted(unknown)}")
        if fields.get("assignee_id") is not None:
            _check_assignee(db, project.id, fields["assignee_id"], proposer=proposer)
        db.add(
            TaskProposalItem(
                organization_id=project.organization_id,
                proposal_id=proposal.id,
                position=position,
                **{k: fields.get(k) for k in ("title", "description", "acceptance_criteria", "assignee_id")},
                depends_on_positions=list(fields.get("depends_on_positions") or []),
                depends_on_task_ids=list(fields.get("depends_on_task_ids") or []),
            )
        )
    db.flush()
    db.refresh(proposal)
    _check_dependencies(db, proposal)
    return proposal


def edit_item(db: Session, proposal: TaskProposal, item_id: int, fields: dict) -> TaskProposalItem:
    item = _item(proposal, item_id)
    if item.status != P.PENDING:
        raise ProposalError("not_pending", "Only pending items can be edited")
    for k, v in fields.items():
        setattr(item, k, list(v) if k.startswith("depends_on") else v)
    if not (item.title or "").strip():
        raise ProposalError("invalid_item", "Title is required")
    if item.assignee_id is not None:
        _check_assignee(db, proposal.project_id, item.assignee_id, proposer=None)
    db.flush()
    _check_dependencies(db, proposal)
    return item


def _item(proposal: TaskProposal, item_id: int) -> TaskProposalItem:
    for item in proposal.items:
        if item.id == item_id:
            return item
    raise NotFound("Proposal item")


def _selected(proposal: TaskProposal, item_ids: list[int] | None) -> list[TaskProposalItem]:
    if item_ids is None:
        return [i for i in proposal.items if i.status == P.PENDING]
    items = [_item(proposal, i) for i in item_ids]
    if any(i.status != P.PENDING for i in items):
        raise ProposalError("not_pending", "Only pending items can be approved or rejected")
    return items


def reject(db: Session, proposal: TaskProposal, item_ids: list[int] | None = None) -> None:
    for item in _selected(proposal, item_ids):
        item.status = P.REJECTED
    db.flush()


def approve(db: Session, user: User, proposal: TaskProposal, item_ids: list[int] | None = None) -> None:
    """Create tasks for the selected pending items (all pending when item_ids is None).
    An item can only be approved together with, or after, the items it depends on."""
    selected = _selected(proposal, item_ids)
    chosen = {i.position for i in selected}
    by_pos = {i.position: i for i in proposal.items}
    for item in selected:
        for pos in item.depends_on_positions:
            if pos not in chosen and by_pos[pos].status != P.APPROVED:
                raise ProposalError(
                    "dependency_not_approved",
                    f"Item {item.position} depends on item {pos}, which is not approved",
                )
    project = db.get(Project, proposal.project_id)
    order = _topological({i.position: set(i.depends_on_positions) & chosen for i in selected})
    created: list[Task] = []
    for pos in order:
        item = by_pos[pos]
        if item.assignee_id is not None:
            _check_assignee(db, project.id, item.assignee_id, proposer=None)
        task = task_svc.create_task(
            db,
            user,
            project,
            title=item.title,
            description=item.description,
            acceptance_criteria=item.acceptance_criteria,
        )
        task.assignee_id = item.assignee_id
        db.flush()
        for dep_pos in item.depends_on_positions:
            task_svc.add_dependency(db, task, db.get(Task, by_pos[dep_pos].task_id))
        for dep_id in item.depends_on_task_ids:
            task_svc.add_dependency(db, task, db.get(Task, dep_id))
        item.status = P.APPROVED
        item.task_id = task.id
        created.append(task)
    db.flush()
    # Tasks whose dependencies are already Done start right away (PRD 14.3).
    for task in created:
        task_svc.auto_advance(db, task)


def list_proposals(db: Session, project: Project, pending_only: bool) -> list[TaskProposal]:
    proposals = list(
        db.scalars(
            select(TaskProposal)
            .where(TaskProposal.project_id == project.id)
            .order_by(TaskProposal.id.desc())
        )
    )
    if pending_only:
        proposals = [p for p in proposals if any(i.status == P.PENDING for i in p.items)]
    return proposals
