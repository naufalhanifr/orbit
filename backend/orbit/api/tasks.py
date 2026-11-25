from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from orbit import tasks as svc
from orbit.api.deps import founder
from orbit.api.projects import get_project
from orbit.api.schemas import (
    SupervisorOut,
    DependencyIn,
    TaskCreate,
    TaskEventOut,
    TaskOut,
    TaskStatus,
    TaskUpdate,
    TransitionIn,
)
from orbit.db import get_db
from orbit.models import Task, TaskStatusEvent, User, WorkforceType
from orbit.structure import resolve_supervisor

router = APIRouter(tags=["tasks"])


def task_out(db: Session, task: Task) -> TaskOut:
    return TaskOut(
        id=task.id,
        key=svc.task_key(task),
        project_id=task.project_id,
        title=task.title,
        description=task.description,
        type=task.type,
        priority=task.priority,
        status=task.status,
        status_before_block=task.status_before_block,
        acceptance_criteria=task.acceptance_criteria,
        acceptance_criteria_waived=task.acceptance_criteria_waived,
        assignee_id=task.assignee_id,
        reporter_id=task.reporter_id,
        pr_url=task.pr_url,
        revision_count=task.revision_count,
        depends_on=svc.dependency_ids(db, task),
        from_chat=task.from_chat,
        source_message_id=task.source_message_id,
    )


@router.get("/projects/{project_id}/tasks", response_model=list[TaskOut])
def list_tasks(
    project_id: int,
    status: TaskStatus | None = None,
    user: User = Depends(founder),
    db: Session = Depends(get_db),
):
    project = get_project(db, user.organization_id, project_id)
    q = select(Task).where(Task.project_id == project.id)
    if status is not None:
        q = q.where(Task.status == status)
    return [task_out(db, t) for t in db.scalars(q.order_by(Task.number))]


@router.post("/projects/{project_id}/tasks", response_model=TaskOut, status_code=201)
def create_task(
    project_id: int, body: TaskCreate, user: User = Depends(founder), db: Session = Depends(get_db)
):
    project = get_project(db, user.organization_id, project_id)
    data = body.model_dump()
    assignee_id = data.pop("assignee_id")
    task = svc.create_task(db, user, project, **data)
    if assignee_id is not None:
        svc.validate_assignee(db, task, assignee_id)
        task.assignee_id = assignee_id
    db.commit()
    return task_out(db, task)


@router.get("/tasks/{task_id}", response_model=TaskOut)
def read_task(task_id: int, user: User = Depends(founder), db: Session = Depends(get_db)):
    return task_out(db, svc.get_task(db, user.organization_id, task_id))


@router.patch("/tasks/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int, body: TaskUpdate, user: User = Depends(founder), db: Session = Depends(get_db)
):
    task = svc.get_task(db, user.organization_id, task_id)
    if task.status in svc.TERMINAL:
        raise svc.TransitionError("terminal", f"Task is already {task.status.value}")
    data = body.model_dump(exclude_unset=True)
    if data.get("assignee_id") is not None:
        svc.validate_assignee(db, task, data["assignee_id"])
    for field, value in data.items():
        setattr(task, field, value)
    if task.status != TaskStatus.BACKLOG and not svc.has_acceptance_criteria(task):
        raise svc.TransitionError(
            "acceptance_criteria_required", "Acceptance criteria cannot be removed after assignment"
        )
    db.flush()
    svc.auto_advance(db, task)
    db.commit()
    return task_out(db, task)


@router.post("/tasks/{task_id}/transitions", response_model=TaskOut)
def transition_task(
    task_id: int, body: TransitionIn, user: User = Depends(founder), db: Session = Depends(get_db)
):
    task = svc.get_task(db, user.organization_id, task_id)
    svc.transition(db, user, task, body.to_status, reason=body.reason, pr_url=body.pr_url)
    db.commit()
    return task_out(db, task)


@router.get("/tasks/{task_id}/events", response_model=list[TaskEventOut])
def task_events(task_id: int, user: User = Depends(founder), db: Session = Depends(get_db)):
    task = svc.get_task(db, user.organization_id, task_id)
    return db.scalars(
        select(TaskStatusEvent).where(TaskStatusEvent.task_id == task.id).order_by(TaskStatusEvent.id)
    ).all()


@router.get("/tasks/{task_id}/supervisor", response_model=SupervisorOut)
def task_supervisor(task_id: int, user: User = Depends(founder), db: Session = Depends(get_db)):
    task = svc.get_task(db, user.organization_id, task_id)
    wf = resolve_supervisor(db, task)
    return SupervisorOut(
        id=wf.id, name=wf.name, type=wf.type.value, is_founder=wf.type == WorkforceType.HUMAN
    )


@router.post("/tasks/{task_id}/dependencies", response_model=TaskOut, status_code=201)
def add_dependency(
    task_id: int, body: DependencyIn, user: User = Depends(founder), db: Session = Depends(get_db)
):
    task = svc.get_task(db, user.organization_id, task_id)
    depends_on = svc.get_task(db, user.organization_id, body.depends_on_id)
    svc.add_dependency(db, task, depends_on)
    db.commit()
    return task_out(db, task)


@router.delete("/tasks/{task_id}/dependencies/{depends_on_id}", response_model=TaskOut)
def remove_dependency(
    task_id: int, depends_on_id: int, user: User = Depends(founder), db: Session = Depends(get_db)
):
    task = svc.get_task(db, user.organization_id, task_id)
    svc.remove_dependency(db, task, depends_on_id)
    db.commit()
    return task_out(db, task)
