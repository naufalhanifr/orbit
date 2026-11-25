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
    TaskDependency,
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
# Agents in these statuses cannot take work. Draft/Configuring agents can: they
# become Ready automatically when the Founder assigns them a task.
UNASSIGNABLE_AGENT_STATUSES = {AgentStatus.PAUSED, AgentStatus.ERROR, AgentStatus.ARCHIVED}
AUTO_READY_STATUSES = {AgentStatus.DRAFT, AgentStatus.CONFIGURING}


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


def validate_assignee(db: Session, task: Task, agent_id: int) -> Agent:
    agent = db.get(Agent, agent_id)
    if agent is None or agent.organization_id != task.organization_id:
        raise TransitionError("invalid_assignee", "Assignee must be an agent in this organization")
    if agent.status in UNASSIGNABLE_AGENT_STATUSES:
        raise TransitionError(
            "assignee_unavailable", f"Assignee agent is {agent.status.value} and cannot take work"
        )
    assigned = db.scalar(
        select(ProjectAssignment.id).where(
            ProjectAssignment.project_id == task.project_id,
            ProjectAssignment.agent_id == agent_id,
        )
    )
    if assigned is None:
        raise TransitionError("assignee_not_in_project", "Assignee agent is not assigned to this project")
    return agent


def transition(
    db: Session,
    user: User | None,
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
            actor_id=user.workforce_id if user else None,  # None = system
        )
    )
    task.status = to
    db.flush()
    if to == S.DONE:
        for dependent in dependents(db, task):
            auto_advance(db, dependent)
    return task


def _check_forward(
    db: Session, task: Task, to: TaskStatus, *, reason: str | None, pr_url: str | None
) -> None:
    if to == S.ASSIGNED:
        if unfinished_dependencies(db, task):
            raise TransitionError(
                "dependencies_not_done", "All dependencies must be Done before assignment"
            )
        if not has_acceptance_criteria(task):
            raise TransitionError(
                "acceptance_criteria_required", "Acceptance criteria are required before assignment"
            )
        if task.assignee_id is None:
            raise TransitionError("assignee_required", "Set an assignee before assigning the task")
        agent = validate_assignee(db, task, task.assignee_id)
        if agent.status in AUTO_READY_STATUSES:
            agent.status = AgentStatus.READY
    elif to == S.FOUNDER_APPROVAL:
        if pr_url:
            task.pr_url = pr_url
        if not task.pr_url:
            raise TransitionError("pr_required", "A pull request URL is required for Founder review")
    elif to == S.REVISION:
        if reason is None:
            raise TransitionError("feedback_required", "Revision requires structured feedback")
        task.revision_count += 1


# --- Dependencies -------------------------------------------------------------
# A task waits in Backlog until every task it depends on is Done. When the last
# one is Done, the task moves to Assigned automatically (actor: system) if it is
# ready for it (acceptance criteria and an available assignee in the project);
# otherwise it stays in Backlog until the Founder completes it.
# A Cancelled dependency does not count as Done: the Founder decides by removing it.


def dependency_ids(db: Session, task: Task) -> list[int]:
    return list(
        db.scalars(
            select(TaskDependency.depends_on_id)
            .where(TaskDependency.task_id == task.id)
            .order_by(TaskDependency.depends_on_id)
        )
    )


def unfinished_dependencies(db: Session, task: Task) -> list[int]:
    return list(
        db.scalars(
            select(Task.id)
            .join(TaskDependency, TaskDependency.depends_on_id == Task.id)
            .where(TaskDependency.task_id == task.id, Task.status != S.DONE)
        )
    )


def dependents(db: Session, task: Task) -> list[Task]:
    return list(
        db.scalars(
            select(Task)
            .join(TaskDependency, TaskDependency.task_id == Task.id)
            .where(TaskDependency.depends_on_id == task.id)
            .order_by(Task.id)
        )
    )


def auto_advance(db: Session, task: Task, *, dependency_removed: bool = False) -> bool:
    """Move a waiting Backlog task to Assigned once its dependencies are all Done and it
    is ready. Tasks that never had dependencies are only moved by the Founder."""
    if task.status != S.BACKLOG:
        return False
    if not dependency_removed and not dependency_ids(db, task):
        return False
    savepoint = db.begin_nested()
    try:
        transition(db, None, task, S.ASSIGNED, reason="All dependencies are Done")
    except TransitionError:
        savepoint.rollback()
        return False
    savepoint.commit()
    return True


def _depends_transitively(db: Session, start_id: int, target_id: int) -> bool:
    """True if `start_id` depends (directly or not) on `target_id`."""
    seen, stack = set(), [start_id]
    while stack:
        current = stack.pop()
        if current == target_id:
            return True
        if current in seen:
            continue
        seen.add(current)
        stack.extend(
            db.scalars(select(TaskDependency.depends_on_id).where(TaskDependency.task_id == current))
        )
    return False


def add_dependency(db: Session, task: Task, depends_on: Task) -> None:
    if task.status != S.BACKLOG:
        raise TransitionError("not_backlog", "Dependencies can only be added to Backlog tasks")
    if depends_on.id == task.id or _depends_transitively(db, depends_on.id, task.id):
        raise TransitionError("dependency_cycle", "Task dependencies cannot form a cycle")
    exists = db.scalar(
        select(TaskDependency.id).where(
            TaskDependency.task_id == task.id, TaskDependency.depends_on_id == depends_on.id
        )
    )
    if exists is None:
        db.add(
            TaskDependency(
                organization_id=task.organization_id, task_id=task.id, depends_on_id=depends_on.id
            )
        )
        db.flush()


def remove_dependency(db: Session, task: Task, depends_on_id: int) -> None:
    dep = db.scalar(
        select(TaskDependency).where(
            TaskDependency.task_id == task.id, TaskDependency.depends_on_id == depends_on_id
        )
    )
    if dep is None:
        raise NotFound("Dependency")
    db.delete(dep)
    db.flush()
    auto_advance(db, task, dependency_removed=True)
