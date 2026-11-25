from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from orbit import structure
from orbit.api.deps import founder
from orbit.api.schemas import (
    AgentCreate,
    AgentOut,
    AgentUpdate,
    InstructionsIn,
    InstructionVersionOut,
    SupervisorIn,
)
from orbit.db import get_db
from orbit.models import Agent, AgentStatus, User

router = APIRouter(prefix="/agents", tags=["agents"])


def agent_out(agent: Agent) -> AgentOut:
    versions = agent.instruction_versions
    return AgentOut(
        id=agent.workforce_id,
        name=agent.workforce.name,
        title=agent.workforce.title,
        status=agent.status,
        fixed_supervisor_id=agent.fixed_supervisor_id,
        model=agent.model,
        tool_preset=agent.tool_preset,
        token_limit_per_execution=agent.token_limit_per_execution,
        instruction_version=versions[-1].version if versions else None,
    )


def _commit_and_out(db: Session, agent: Agent) -> AgentOut:
    db.commit()
    db.refresh(agent)
    return agent_out(agent)


@router.get("", response_model=list[AgentOut])
def list_agents(
    include_archived: bool = False, user: User = Depends(founder), db: Session = Depends(get_db)
):
    q = select(Agent).where(Agent.organization_id == user.organization_id)
    if not include_archived:
        q = q.where(Agent.status != AgentStatus.ARCHIVED)
    return [agent_out(a) for a in db.scalars(q.order_by(Agent.workforce_id))]


@router.post("", response_model=AgentOut, status_code=201)
def create_agent(body: AgentCreate, user: User = Depends(founder), db: Session = Depends(get_db)):
    agent = structure.create_agent(db, user, **body.model_dump())
    return _commit_and_out(db, agent)


@router.get("/{agent_id}", response_model=AgentOut)
def get_agent(agent_id: int, user: User = Depends(founder), db: Session = Depends(get_db)):
    return agent_out(structure.get_agent(db, user.organization_id, agent_id))


@router.patch("/{agent_id}", response_model=AgentOut)
def update_agent(
    agent_id: int, body: AgentUpdate, user: User = Depends(founder), db: Session = Depends(get_db)
):
    agent = structure.get_agent(db, user.organization_id, agent_id)
    data = body.model_dump(exclude_unset=True)
    for field in ("name", "title"):
        if field in data:
            setattr(agent.workforce, field, data.pop(field))
    status = data.pop("status", None)
    for field, value in data.items():
        setattr(agent, field, value)
    if status is not None:
        structure.set_status(db, agent, status)
    return _commit_and_out(db, agent)


@router.put("/{agent_id}/supervisor", response_model=AgentOut)
def set_supervisor(
    agent_id: int, body: SupervisorIn, user: User = Depends(founder), db: Session = Depends(get_db)
):
    agent = structure.get_agent(db, user.organization_id, agent_id)
    structure.set_fixed_supervisor(db, agent, body.supervisor_id)
    return _commit_and_out(db, agent)


@router.post("/{agent_id}/archive", response_model=AgentOut)
def archive(agent_id: int, user: User = Depends(founder), db: Session = Depends(get_db)):
    agent = structure.get_agent(db, user.organization_id, agent_id)
    structure.archive_agent(db, agent)
    return _commit_and_out(db, agent)


@router.get("/{agent_id}/instructions", response_model=list[InstructionVersionOut])
def list_instructions(agent_id: int, user: User = Depends(founder), db: Session = Depends(get_db)):
    return structure.get_agent(db, user.organization_id, agent_id).instruction_versions


@router.post("/{agent_id}/instructions", response_model=InstructionVersionOut, status_code=201)
def save_instructions(
    agent_id: int, body: InstructionsIn, user: User = Depends(founder), db: Session = Depends(get_db)
):
    agent = structure.get_agent(db, user.organization_id, agent_id)
    version = structure.save_instructions(db, user, agent, body.content)
    db.commit()
    return version
