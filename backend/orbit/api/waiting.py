"""'Waiting on you' strip (PRD 4.4): everything that needs the Founder now."""

from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from orbit.api.deps import founder
from orbit.db import get_db
from orbit.models import Execution, ExecutionEvent, ExecutionStatus, Task, TaskStatus, TaskStatusEvent, User
from orbit.tasks import task_key

router = APIRouter(tags=["waiting"])


class WaitingItem(BaseModel):
    # pr_review: task in Founder Approval; agent_question: execution waiting for input;
    # suspended: execution to resume; blocked: task only the Founder can unblock.
    kind: Literal["pr_review", "agent_question", "suspended", "blocked"]
    task_id: int | None
    task_key: str | None
    title: str | None
    execution_id: int | None = None
    pr_url: str | None = None
    reason: str | None = None
    since: datetime


@router.get("/waiting-on-you", response_model=list[WaitingItem])
def waiting_on_you(user: User = Depends(founder), db: Session = Depends(get_db)):
    # shortcut: budget run confirmations (PRD 4.4) are not listed yet; add with budgets.
    org = user.organization_id
    items: list[WaitingItem] = []

    tasks = db.scalars(
        select(Task).where(
            Task.organization_id == org,
            Task.status.in_([TaskStatus.FOUNDER_APPROVAL, TaskStatus.BLOCKED]),
        )
    )
    for t in tasks:
        last = db.scalar(
            select(TaskStatusEvent)
            .where(TaskStatusEvent.task_id == t.id, TaskStatusEvent.to_status == t.status)
            .order_by(TaskStatusEvent.id.desc())
            .limit(1)
        )
        blocked = t.status == TaskStatus.BLOCKED
        items.append(
            WaitingItem(
                kind="blocked" if blocked else "pr_review",
                task_id=t.id,
                task_key=task_key(t),
                title=t.title,
                pr_url=None if blocked else t.pr_url,
                reason=last.reason if blocked and last else None,
                since=last.created_at if last else t.updated_at,
            )
        )

    executions = db.scalars(
        select(Execution).where(
            Execution.organization_id == org,
            Execution.status.in_([ExecutionStatus.WAITING_FOR_INPUT, ExecutionStatus.SUSPENDED]),
        )
    )
    for ex in executions:
        task = db.get(Task, ex.task_id) if ex.task_id else None
        last_event = db.scalar(
            select(func.max(ExecutionEvent.created_at)).where(ExecutionEvent.execution_id == ex.id)
        )
        items.append(
            WaitingItem(
                kind="agent_question" if ex.status == ExecutionStatus.WAITING_FOR_INPUT else "suspended",
                task_id=ex.task_id,
                task_key=task_key(task) if task else None,
                title=task.title if task else None,
                execution_id=ex.id,
                since=last_event or ex.created_at,
            )
        )

    return sorted(items, key=lambda i: i.since)
