from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from orbit import chat
from orbit.api.deps import founder
from orbit.api.projects import get_project
from orbit.api.schemas import ExecutionEventOut, ExecutionOut, MessageIn, MessageOut
from orbit.db import get_db
from orbit.models import Execution, ExecutionEvent, User
from orbit.tasks import get_task

router = APIRouter(tags=["chat"])


@router.get("/tasks/{task_id}/messages", response_model=list[MessageOut])
def list_messages(task_id: int, user: User = Depends(founder), db: Session = Depends(get_db)):
    task = get_task(db, user.organization_id, task_id)
    return chat.list_messages(db, chat.task_conversation(db, task, create=False))


@router.post("/tasks/{task_id}/messages", response_model=MessageOut, status_code=201)
def post_message(
    task_id: int, body: MessageIn, user: User = Depends(founder), db: Session = Depends(get_db)
):
    task = get_task(db, user.organization_id, task_id)
    msg = chat.post_task_message(db, user, task, body.body, body.mentions)
    db.commit()
    return msg


@router.get("/projects/{project_id}/messages", response_model=list[MessageOut])
def list_project_messages(
    project_id: int, user: User = Depends(founder), db: Session = Depends(get_db)
):
    project = get_project(db, user.organization_id, project_id)
    return chat.list_messages(db, chat.project_conversation(db, project, create=False))


@router.post("/projects/{project_id}/messages", response_model=MessageOut, status_code=201)
def post_project_message(
    project_id: int, body: MessageIn, user: User = Depends(founder), db: Session = Depends(get_db)
):
    project = get_project(db, user.organization_id, project_id)
    msg = chat.post_project_message(db, user, project, body.body, body.mentions)
    db.commit()
    return msg


@router.get("/projects/{project_id}/executions", response_model=list[ExecutionOut])
def project_executions(
    project_id: int, user: User = Depends(founder), db: Session = Depends(get_db)
):
    project = get_project(db, user.organization_id, project_id)
    return db.scalars(
        select(Execution).where(Execution.project_id == project.id).order_by(Execution.id.desc())
    ).all()


@router.get("/tasks/{task_id}/executions", response_model=list[ExecutionOut])
def task_executions(task_id: int, user: User = Depends(founder), db: Session = Depends(get_db)):
    task = get_task(db, user.organization_id, task_id)
    return db.scalars(
        select(Execution).where(Execution.task_id == task.id).order_by(Execution.id.desc())
    ).all()


@router.get("/executions/{execution_id}", response_model=ExecutionOut)
def read_execution(execution_id: int, user: User = Depends(founder), db: Session = Depends(get_db)):
    return chat.get_execution(db, user.organization_id, execution_id)


@router.get("/executions/{execution_id}/events", response_model=list[ExecutionEventOut])
def execution_events(
    execution_id: int,
    after_seq: int = 0,
    user: User = Depends(founder),
    db: Session = Depends(get_db),
):
    """Poll with `after_seq` for new events. SSE streaming arrives with the runtime."""
    execution = chat.get_execution(db, user.organization_id, execution_id)
    return db.scalars(
        select(ExecutionEvent)
        .where(ExecutionEvent.execution_id == execution.id, ExecutionEvent.seq > after_seq)
        .order_by(ExecutionEvent.seq)
    ).all()


@router.post("/executions/{execution_id}/resume", response_model=ExecutionOut)
def resume(execution_id: int, user: User = Depends(founder), db: Session = Depends(get_db)):
    execution = chat.get_execution(db, user.organization_id, execution_id)
    chat.resume_execution(db, execution)
    db.commit()
    return execution


@router.post("/executions/{execution_id}/stop", response_model=ExecutionOut)
def stop(execution_id: int, user: User = Depends(founder), db: Session = Depends(get_db)):
    execution = chat.get_execution(db, user.organization_id, execution_id)
    chat.stop_execution(db, execution)
    db.commit()
    return execution
