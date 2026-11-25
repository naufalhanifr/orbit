from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from orbit.models import AgentStatus, TaskPriority, TaskStatus, TaskType, ToolPreset


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
    token_limit_per_execution: int = Field(default=300_000, gt=0)
    instructions: str | None = None


class AgentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    title: str | None = Field(default=None, max_length=200)
    model: str | None = None
    tool_preset: ToolPreset | None = None
    token_limit_per_execution: int | None = Field(default=None, gt=0)
    status: AgentStatus | None = None


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
    is_top: bool
    fixed_supervisor_id: int | None
    model: str | None
    tool_preset: ToolPreset
    token_limit_per_execution: int
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
        default=None, description="Required for blocked, cancelled and revision (feedback)."
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
