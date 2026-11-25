from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from orbit.models import (
    AgentStatus,
    ExecutionEventKind,
    ExecutionStatus,
    ExecutionTrigger,
    TaskPriority,
    TaskStatus,
    TaskType,
    ToolPreset,
)


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    role: str
    name: str
    organization_id: int


class AgentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    title: str | None = Field(default=None, max_length=200)
    fixed_supervisor_id: int | None = None
    model: str | None = None
    tool_preset: ToolPreset = ToolPreset.READ_ONLY
    works_in_all_projects: bool = False
    instructions: str | None = None


class AgentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    title: str | None = Field(default=None, max_length=200)
    model: str | None = None
    tool_preset: ToolPreset | None = None
    works_in_all_projects: bool | None = None


class SupervisorIn(BaseModel):
    supervisor_id: int | None


class InstructionsIn(BaseModel):
    content: str


class InstructionVersionOut(ORM):
    id: int
    version: int
    content: str
    created_at: datetime


class AgentOut(BaseModel):
    id: int
    name: str
    title: str | None
    status: AgentStatus
    fixed_supervisor_id: int | None
    model: str | None
    tool_preset: ToolPreset
    works_in_all_projects: bool
    archived: bool
    instruction_version: int | None


class ProjectCreate(BaseModel):
    key: str = Field(pattern=r"^[A-Z][A-Z0-9]{1,9}$")
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None


class ProjectOut(ORM):
    id: int
    key: str
    name: str
    description: str | None


class AssignmentCreate(BaseModel):
    agent_id: int
    supervisor_id: int | None = None


class AssignmentOut(ORM):
    id: int
    project_id: int
    agent_id: int
    supervisor_id: int | None


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    description: str | None = None
    type: TaskType = TaskType.TASK
    priority: TaskPriority = TaskPriority.MEDIUM
    acceptance_criteria: str | None = None
    acceptance_criteria_waived: bool = False
    assignee_id: int | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = None
    type: TaskType | None = None
    priority: TaskPriority | None = None
    acceptance_criteria: str | None = None
    acceptance_criteria_waived: bool | None = None
    assignee_id: int | None = None


class TransitionIn(BaseModel):
    to_status: TaskStatus
    reason: str | None = Field(
        default=None,
        description="Required for blocked, cancelled, and revision feedback (Founder Approval → In Progress).",
    )
    pr_url: str | None = None


class TaskOut(BaseModel):
    id: int
    key: str
    project_id: int
    title: str
    description: str | None
    type: TaskType
    priority: TaskPriority
    status: TaskStatus
    status_before_block: TaskStatus | None
    acceptance_criteria: str | None
    acceptance_criteria_waived: bool
    assignee_id: int | None
    reporter_id: int | None
    pr_url: str | None
    revision_count: int
    depends_on: list[int]
    from_chat: bool
    source_message_id: int | None


class DependencyIn(BaseModel):
    depends_on_id: int


class TaskEventOut(ORM):
    from_status: TaskStatus
    to_status: TaskStatus
    reason: str | None
    actor_id: int | None
    created_at: datetime


class SupervisorOut(BaseModel):
    id: int
    name: str
    type: str
    is_founder: bool


class MessageIn(BaseModel):
    body: str = Field(min_length=1, max_length=20_000)
    mentions: list[int] = Field(default_factory=list, description="Agent ids mentioned in the comment")


class MessageOut(ORM):
    id: int
    author_id: int
    body: str
    mentions: list[int]
    created_at: datetime


class ExecutionOut(ORM):
    id: int
    task_id: int | None
    agent_id: int
    status: ExecutionStatus
    trigger: ExecutionTrigger
    trigger_message_id: int | None
    instruction_version_id: int | None
    current_step: str | None
    tokens_used: int
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None


class ExecutionEventOut(ORM):
    seq: int
    kind: ExecutionEventKind
    payload: dict
    created_at: datetime


class ProposalItemOut(ORM):
    id: int
    position: int
    title: str
    description: str | None
    acceptance_criteria: str | None
    assignee_id: int | None
    depends_on_positions: list[int]
    depends_on_task_ids: list[int]
    status: str
    task_id: int | None


class ProposalOut(ORM):
    id: int
    project_id: int
    proposer_id: int
    execution_id: int | None
    message_id: int | None
    created_at: datetime
    items: list[ProposalItemOut]


class ProposalItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = None
    acceptance_criteria: str | None = None
    assignee_id: int | None = None
    depends_on_positions: list[int] | None = None
    depends_on_task_ids: list[int] | None = None


class ProposalDecisionIn(BaseModel):
    item_ids: list[int] | None = Field(
        default=None, description="Items to approve/reject; omit for every pending item."
    )
