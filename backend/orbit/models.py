from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


def _enum(cls: type[StrEnum], name: str) -> Enum:
    return Enum(cls, name=name, values_callable=lambda e: [m.value for m in e])


class WorkforceType(StrEnum):
    HUMAN = "human"
    AGENT = "agent"


class UserRole(StrEnum):
    FOUNDER = "founder"
    MEMBER = "member"


class AgentStatus(StrEnum):
    DRAFT = "draft"
    CONFIGURING = "configuring"
    READY = "ready"
    ACTIVE = "active"
    PAUSED = "paused"
    ERROR = "error"
    ARCHIVED = "archived"


class ToolPreset(StrEnum):
    READ_ONLY = "read-only"
    CODING = "coding"


class TaskStatus(StrEnum):
    BACKLOG = "backlog"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    FOUNDER_APPROVAL = "founder_approval"
    REVISION = "revision"
    BLOCKED = "blocked"
    DONE = "done"
    CANCELLED = "cancelled"


class TaskType(StrEnum):
    INITIATIVE = "initiative"
    EPIC = "epic"
    FEATURE = "feature"
    STORY = "story"
    TASK = "task"
    SUBTASK = "subtask"
    BUG = "bug"
    TECH_DEBT = "technical_debt"
    IMPROVEMENT = "improvement"
    RESEARCH = "research"
    MILESTONE = "milestone"


class TaskPriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Organization(TimestampMixin, Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))


class Workforce(TimestampMixin, Base):
    """Human and AI agent workforce (PRD 7). Agents have a 1:1 `Agent` profile."""

    __tablename__ = "workforce"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    type: Mapped[WorkforceType] = mapped_column(_enum(WorkforceType, "workforce_type"))
    name: Mapped[str] = mapped_column(String(200))
    title: Mapped[str | None] = mapped_column(String(200))

    agent: Mapped["Agent | None"] = relationship(
        back_populates="workforce", foreign_keys="Agent.workforce_id", uselist=False
    )


class User(TimestampMixin, Base):
    """Login identity of a human workforce member."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    workforce_id: Mapped[int] = mapped_column(ForeignKey("workforce.id"), unique=True)
    email: Mapped[str] = mapped_column(String(320), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(_enum(UserRole, "user_role"))
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    workforce: Mapped[Workforce] = relationship()


class UserSession(TimestampMixin, Base):
    __tablename__ = "user_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship()


class Agent(TimestampMixin, Base):
    __tablename__ = "agents"
    workforce_id: Mapped[int] = mapped_column(ForeignKey("workforce.id"), primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    status: Mapped[AgentStatus] = mapped_column(
        _enum(AgentStatus, "agent_status"), default=AgentStatus.DRAFT
    )
    # Fixed supervisor (atasan tetap); NULL means the agent reports to the Founder.
    # Per-project supervisors live on ProjectAssignment.
    fixed_supervisor_id: Mapped[int | None] = mapped_column(ForeignKey("workforce.id"))
    model: Mapped[str | None] = mapped_column(String(100))
    tool_preset: Mapped[ToolPreset] = mapped_column(
        _enum(ToolPreset, "tool_preset"), default=ToolPreset.READ_ONLY
    )
    token_limit_per_execution: Mapped[int] = mapped_column(Integer, default=300_000)

    workforce: Mapped[Workforce] = relationship(
        back_populates="agent", foreign_keys=[workforce_id]
    )
    instruction_versions: Mapped[list["AgentInstructionVersion"]] = relationship(
        order_by="AgentInstructionVersion.version"
    )


class AgentInstructionVersion(TimestampMixin, Base):
    """Immutable instruction snapshot. Every save creates a new version."""

    __tablename__ = "agent_instruction_versions"
    __table_args__ = (UniqueConstraint("agent_id", "version"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    agent_id: Mapped[int] = mapped_column(ForeignKey("agents.workforce_id"))
    version: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))


class Project(TimestampMixin, Base):
    __tablename__ = "projects"
    __table_args__ = (UniqueConstraint("organization_id", "key"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    key: Mapped[str] = mapped_column(String(10))
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    next_task_number: Mapped[int] = mapped_column(Integer, default=1, server_default="1")


class ProjectAssignment(TimestampMixin, Base):
    __tablename__ = "project_assignments"
    __table_args__ = (UniqueConstraint("project_id", "agent_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    agent_id: Mapped[int] = mapped_column(ForeignKey("agents.workforce_id"))
    # Per-project supervisor (atasan per proyek); overrides the fixed supervisor.
    supervisor_id: Mapped[int | None] = mapped_column(ForeignKey("workforce.id"))


class Task(TimestampMixin, Base):
    __tablename__ = "tasks"
    __table_args__ = (UniqueConstraint("project_id", "number"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    number: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text)
    type: Mapped[TaskType] = mapped_column(_enum(TaskType, "task_type"), default=TaskType.TASK)
    priority: Mapped[TaskPriority] = mapped_column(
        _enum(TaskPriority, "task_priority"), default=TaskPriority.MEDIUM
    )
    status: Mapped[TaskStatus] = mapped_column(
        _enum(TaskStatus, "task_status"), default=TaskStatus.BACKLOG
    )
    # Status to return to when a Blocked task is unblocked.
    status_before_block: Mapped[TaskStatus | None] = mapped_column(_enum(TaskStatus, "task_status"))
    acceptance_criteria: Mapped[str | None] = mapped_column(Text)
    # Exploratory work explicitly marked as not needing acceptance criteria (PRD 14.2).
    acceptance_criteria_waived: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("workforce.id"))
    reporter_id: Mapped[int | None] = mapped_column(ForeignKey("workforce.id"))
    pr_url: Mapped[str | None] = mapped_column(String(500))
    revision_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    project: Mapped[Project] = relationship()


class TaskStatusEvent(TimestampMixin, Base):
    """History of task status transitions, including reasons and feedback."""

    __tablename__ = "task_status_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    from_status: Mapped[TaskStatus] = mapped_column(_enum(TaskStatus, "task_status"))
    to_status: Mapped[TaskStatus] = mapped_column(_enum(TaskStatus, "task_status"))
    reason: Mapped[str | None] = mapped_column(Text)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("workforce.id"))


class TaskDependency(TimestampMixin, Base):
    """`task_id` cannot start until `depends_on_id` is Done."""

    __tablename__ = "task_dependencies"
    __table_args__ = (
        UniqueConstraint("task_id", "depends_on_id"),
        CheckConstraint("task_id <> depends_on_id", name="ck_task_dependency_not_self"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    depends_on_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )


class ExecutionStatus(StrEnum):
    """PRD 18.3: Queued → Preparing Context → Running → Waiting for Input →
    Completed / Failed / Cancelled / Suspended."""

    QUEUED = "queued"
    PREPARING = "preparing"  # Preparing Context; UI label "Preparing"
    RUNNING = "running"
    WAITING_FOR_INPUT = "waiting_for_input"
    SUSPENDED = "suspended"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ExecutionTrigger(StrEnum):
    CHAT_MENTION = "chat_mention"
    TASK_ASSIGNMENT = "task_assignment"
    HUMAN_ACTION = "human_action"


class ExecutionEventKind(StrEnum):
    STEP = "step"  # payload: {"step": str}
    OUTPUT = "output"  # payload: {"text": str}
    TOOL = "tool"  # payload: {"tool": str, "summary": str}
    TOKENS = "tokens"  # payload: {"used": int}
    INSTRUCTION = "instruction"  # extra instruction from a comment; payload: {"message_id": int}


class Conversation(TimestampMixin, Base):
    """Chat thread. A task's thread is also its comment section (PRD 17.4)."""

    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    task_id: Mapped[int | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), unique=True
    )


class ConversationMessage(TimestampMixin, Base):
    __tablename__ = "conversation_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[int] = mapped_column(ForeignKey("workforce.id"))
    body: Mapped[str] = mapped_column(Text)
    mentions: Mapped[list[int]] = mapped_column(ARRAY(Integer), default=list, server_default="{}")


class Execution(TimestampMixin, Base):
    __tablename__ = "executions"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id"), index=True)
    agent_id: Mapped[int] = mapped_column(ForeignKey("agents.workforce_id"), index=True)
    status: Mapped[ExecutionStatus] = mapped_column(
        _enum(ExecutionStatus, "execution_status"), default=ExecutionStatus.QUEUED
    )
    trigger: Mapped[ExecutionTrigger] = mapped_column(_enum(ExecutionTrigger, "execution_trigger"))
    trigger_message_id: Mapped[int | None] = mapped_column(ForeignKey("conversation_messages.id"))
    triggered_by_id: Mapped[int | None] = mapped_column(ForeignKey("workforce.id"))
    # Instruction snapshot used by this execution (PRD 11).
    instruction_version_id: Mapped[int | None] = mapped_column(
        ForeignKey("agent_instruction_versions.id")
    )
    current_step: Mapped[str | None] = mapped_column(Text)
    tokens_used: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    token_limit: Mapped[int] = mapped_column(Integer)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ExecutionEvent(TimestampMixin, Base):
    __tablename__ = "execution_events"
    __table_args__ = (UniqueConstraint("execution_id", "seq"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    execution_id: Mapped[int] = mapped_column(ForeignKey("executions.id", ondelete="CASCADE"))
    seq: Mapped[int] = mapped_column(Integer)
    kind: Mapped[ExecutionEventKind] = mapped_column(_enum(ExecutionEventKind, "execution_event_kind"))
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
