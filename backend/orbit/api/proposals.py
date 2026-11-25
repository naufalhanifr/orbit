from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from orbit import proposals as svc
from orbit.api.deps import founder
from orbit.api.projects import get_project
from orbit.api.schemas import ProposalDecisionIn, ProposalItemOut, ProposalItemUpdate, ProposalOut
from orbit.db import get_db
from orbit.models import User

router = APIRouter(tags=["proposals"])


@router.get("/projects/{project_id}/proposals", response_model=list[ProposalOut])
def list_proposals(
    project_id: int,
    pending_only: bool = True,
    user: User = Depends(founder),
    db: Session = Depends(get_db),
):
    return svc.list_proposals(db, get_project(db, user.organization_id, project_id), pending_only)


@router.get("/proposals/{proposal_id}", response_model=ProposalOut)
def read_proposal(proposal_id: int, user: User = Depends(founder), db: Session = Depends(get_db)):
    return svc.get_proposal(db, user.organization_id, proposal_id)


@router.patch("/proposals/{proposal_id}/items/{item_id}", response_model=ProposalItemOut)
def edit_item(
    proposal_id: int,
    item_id: int,
    body: ProposalItemUpdate,
    user: User = Depends(founder),
    db: Session = Depends(get_db),
):
    proposal = svc.get_proposal(db, user.organization_id, proposal_id)
    item = svc.edit_item(db, proposal, item_id, body.model_dump(exclude_unset=True))
    db.commit()
    return item


@router.post("/proposals/{proposal_id}/approve", response_model=ProposalOut)
def approve(
    proposal_id: int,
    body: ProposalDecisionIn,
    user: User = Depends(founder),
    db: Session = Depends(get_db),
):
    proposal = svc.get_proposal(db, user.organization_id, proposal_id)
    svc.approve(db, user, proposal, body.item_ids)
    db.commit()
    return proposal


@router.post("/proposals/{proposal_id}/reject", response_model=ProposalOut)
def reject(
    proposal_id: int,
    body: ProposalDecisionIn,
    user: User = Depends(founder),
    db: Session = Depends(get_db),
):
    proposal = svc.get_proposal(db, user.organization_id, proposal_id)
    svc.reject(db, proposal, body.item_ids)
    db.commit()
    return proposal
