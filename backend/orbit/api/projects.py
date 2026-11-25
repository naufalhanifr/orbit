from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from orbit import structure
from orbit.api.deps import founder
from orbit.api.schemas import (
    AssignmentCreate,
    AssignmentOut,
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    SupervisorIn,
)
from orbit.db import get_db
from orbit.errors import DomainError, NotFound
from orbit.models import AgentStatus, Project, ProjectAssignment, User

router = APIRouter(prefix="/projects", tags=["projects"])


def get_project(db: Session, org_id: int, project_id: int) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.organization_id != org_id:
        raise NotFound("Project")
    return project


def _get_assignment(db: Session, project: Project, assignment_id: int) -> ProjectAssignment:
    pa = db.get(ProjectAssignment, assignment_id)
    if pa is None or pa.project_id != project.id:
        raise NotFound("Project assignment")
    return pa


@router.get("", response_model=list[ProjectOut])
def list_projects(user: User = Depends(founder), db: Session = Depends(get_db)):
    return db.scalars(
        select(Project).where(Project.organization_id == user.organization_id).order_by(Project.id)
    ).all()


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(body: ProjectCreate, user: User = Depends(founder), db: Session = Depends(get_db)):
    project = Project(organization_id=user.organization_id, **body.model_dump())
    db.add(project)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise DomainError("duplicate_key", f"Project key {body.key} is already used") from None
    return project


@router.get("/{project_id}", response_model=ProjectOut)
def read_project(project_id: int, user: User = Depends(founder), db: Session = Depends(get_db)):
    return get_project(db, user.organization_id, project_id)


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int, body: ProjectUpdate, user: User = Depends(founder), db: Session = Depends(get_db)
):
    project = get_project(db, user.organization_id, project_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    return project


@router.get("/{project_id}/assignments", response_model=list[AssignmentOut])
def list_assignments(project_id: int, user: User = Depends(founder), db: Session = Depends(get_db)):
    project = get_project(db, user.organization_id, project_id)
    return db.scalars(
        select(ProjectAssignment)
        .where(ProjectAssignment.project_id == project.id)
        .order_by(ProjectAssignment.id)
    ).all()


@router.post("/{project_id}/assignments", response_model=AssignmentOut, status_code=201)
def create_assignment(
    project_id: int, body: AssignmentCreate, user: User = Depends(founder), db: Session = Depends(get_db)
):
    project = get_project(db, user.organization_id, project_id)
    agent = structure.get_agent(db, user.organization_id, body.agent_id)
    if agent.status == AgentStatus.ARCHIVED:
        raise DomainError("archived", "Archived agents cannot be assigned to projects")
    exists = db.scalar(
        select(ProjectAssignment.id).where(
            ProjectAssignment.project_id == project.id, ProjectAssignment.agent_id == agent.workforce_id
        )
    )
    if exists is not None:
        raise DomainError("duplicate_assignment", "Agent is already assigned to this project")
    pa = ProjectAssignment(
        organization_id=user.organization_id,
        project_id=project.id,
        agent_id=agent.workforce_id,
        supervisor_id=body.supervisor_id,
    )
    db.add(pa)
    structure.validate_structure(db, user.organization_id)
    db.commit()
    return pa


@router.put("/{project_id}/assignments/{assignment_id}/supervisor", response_model=AssignmentOut)
def set_assignment_supervisor(
    project_id: int,
    assignment_id: int,
    body: SupervisorIn,
    user: User = Depends(founder),
    db: Session = Depends(get_db),
):
    pa = _get_assignment(db, get_project(db, user.organization_id, project_id), assignment_id)
    pa.supervisor_id = body.supervisor_id
    structure.validate_structure(db, user.organization_id)
    db.commit()
    return pa


@router.delete("/{project_id}/assignments/{assignment_id}", status_code=204)
def delete_assignment(
    project_id: int, assignment_id: int, user: User = Depends(founder), db: Session = Depends(get_db)
):
    pa = _get_assignment(db, get_project(db, user.organization_id, project_id), assignment_id)
    db.delete(pa)
    structure.validate_structure(db, user.organization_id)
    db.commit()
