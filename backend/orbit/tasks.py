"""Task state machine (PRD 15.1, adapted to the MVP in PRD 4.4).

MVP: the Founder reviews directly on the PR, so the PO Review step is not used.
In Progress goes straight to Founder Approval; the Founder approves (Done) or
asks for a revision.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from orbit.errors import DomainError, NotFound
from orbit.models import (
    Agent,
    AgentStatus,
    Project,
    ProjectAssignment,
    Task,
    TaskStatus,
    TaskStatusEvent,
    User,
)

S = TaskStatus

# Regular forward transitions. Blocked and Cancelled are handled separately below.
TRANSITIONS: dict[TaskStatus, set[TaskStatus]] = {
    S.BACKLOG: {S.ASSIGNED},
    S.ASSIGNED: {S.IN_PROGRESS},
    S.IN_PROGRESS: {S.FOUNDER_APPROVAL},
    S.FOUNDER_APPROVAL: {S.DONE, S.REVISION},
    S.REVISION: {S.FOUNDER_APPROVAL},
}
TERMINAL = {S.DONE, S.CANCELLED}
ASSIGNABLE_AGENT_STATUSES = {AgentStatus.READY, AgentStatus.ACTIVE}


class TransitionError(DomainError):
    pass


def get_task(db: Session, org_id: int, task_id: int) -> Task:
    task = db.get(Task, task_id)
    if task is None or task.organization_id != org_id:
        raise NotFound("Task")
    return task


def task_key(task: Task) -> str:
    return f"{task.project.key}-{task.number}"


def has_acceptance_criteria(task: Task) -> bool:
    return task.acceptance_criteria_waived or bool((task.acceptance_criteria or "").strip())


def create_task(db: Session, user: User, project: Project, **fields) -> Task:
    # Row lock keeps task numbers unique per project under concurrent creates.
    db.execute(select(Project.id).where(Project.id == project.id).with_for_update())
    db.refresh(project)
    task = Task(
        organization_id=project.organization_id,
        project_id=project.id,
        number=project.next_task_number,
        reporter_id=user.workforce_id,
        status=S.BACKLOG,
        **fields,
    )
    project.next_task_number += 1
    db.add(task)
    db.flush()
    return task


def validate_assignee(db: Session, task: Task, agent_id: int) -> None:
    agent = db.get(Agent, agent_id)
    if agent is None or agent.organization_id != task.organization_id:
        raise TransitionError("invalid_assignee", "Assignee must be an agent in this organization")
    if agent.status not in ASSIGNABLE_AGENT_STATUSES:
        raise TransitionError("assignee_not_ready", "Assignee agent must be Ready or Active")
    assigned = db.scalar(
        select(ProjectAssignment.id).where(
            ProjectAssignment.project_id == task.project_id,
            ProjectAssignment.agent_id == agent_id,
        )
    )
    if assigned is None:
        raise TransitionError("assignee_not_in_project", "Assignee agent is not assigned to this project")


def transition(
    db: Session,
    user: User,
    task: Task,
    to: TaskStatus,
    *,
    reason: str | None = None,
    pr_url: str | None = None,
) -> Task:
    current = task.status
    reason = (reason or "").strip() or None

    if current in TERMINAL:
        raise TransitionError("terminal", f"Task is already {current.value}")

    if to == S.CANCELLED:
        if reason is None:
            raise TransitionError("reason_required", "Cancelling a task requires a reason")
    elif to == S.BLOCKED:
        if current == S.BLOCKED:
            raise TransitionError("invalid_transition", "Task is already blocked")
        if reason is None:
            raise TransitionError("reason_required", "Blocking a task requires a reason")
        task.status_before_block = current
    elif current == S.BLOCKED:
        if to != task.status_before_block:
            raise TransitionError(
                "invalid_transition",
                f"A blocked task can only return to {task.status_before_block.value} or be cancelled",
            )
        task.status_before_block = None
    elif to not in TRANSITIONS.get(current, set()):
        raise TransitionError(
            "invalid_transition", f"Cannot move task from {current.value} to {to.value}"
        )
    else:
        _check_forward(db, task, to, reason=reason, pr_url=pr_url)

    db.add(
        TaskStatusEvent(
            organization_id=task.organization_id,
            task_id=task.id,
            from_status=current,
            to_status=to,
            reason=reason,
            actor_id=user.workforce_id,
        )
    )
    task.status = to
    db.flush()
    return task


def _check_forward(
    db: Session, task: Task, to: TaskStatus, *, reason: str | None, pr_url: str | None
) -> None:
    if to == S.ASSIGNED:
        if not has_acceptance_criteria(task):
            raise TransitionError(
                "acceptance_criteria_required", "Acceptance criteria are required before assignment"
            )
        if task.assignee_id is None:
            raise TransitionError("assignee_required", "Set an assignee before assigning the task")
        validate_assignee(db, task, task.assignee_id)
    elif to == S.FOUNDER_APPROVAL:
        if pr_url:
            task.pr_url = pr_url
        if not task.pr_url:
            raise TransitionError("pr_required", "A pull request URL is required for Founder review")
    elif to == S.REVISION:
        if reason is None:
            raise TransitionError("feedback_required", "Revision requires structured feedback")
        task.revision_count += 1
