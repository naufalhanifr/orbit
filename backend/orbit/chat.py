"""Task threads (task comments = chat) and executions (PRD 17.4).

The agent runtime (ADR-0001) is not built yet. Executions created here stay
`queued`; the runtime will start them and append events via `record_event`.
Nothing in this module runs an agent, and reading threads or executions never
creates activity (PRD 17.5).
"""

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from orbit.errors import DomainError, NotFound
from orbit.models import (
    Agent,
    AgentInstructionVersion,
    AgentStatus,
    Conversation,
    ConversationMessage,
    Execution,
    ExecutionEvent,
    ExecutionEventKind,
    ExecutionStatus,
    ExecutionTrigger,
    ProjectAssignment,
    Task,
    User,
)

ACTIVE = {ExecutionStatus.QUEUED, ExecutionStatus.RUNNING}
UNAVAILABLE = {AgentStatus.PAUSED, AgentStatus.ERROR, AgentStatus.ARCHIVED}


class ChatError(DomainError):
    pass


def task_conversation(db: Session, task: Task, *, create: bool) -> Conversation | None:
    conv = db.scalar(select(Conversation).where(Conversation.task_id == task.id))
    if conv is None and create:
        conv = Conversation(
            organization_id=task.organization_id, project_id=task.project_id, task_id=task.id
        )
        db.add(conv)
        db.flush()
    return conv


def list_messages(db: Session, task: Task) -> list[ConversationMessage]:
    conv = task_conversation(db, task, create=False)
    if conv is None:
        return []
    return list(
        db.scalars(
            select(ConversationMessage)
            .where(ConversationMessage.conversation_id == conv.id)
            .order_by(ConversationMessage.id)
        )
    )


def running_execution(db: Session, task: Task, agent_id: int) -> Execution | None:
    return db.scalar(
        select(Execution).where(
            Execution.task_id == task.id,
            Execution.agent_id == agent_id,
            Execution.status == ExecutionStatus.RUNNING,
        )
    )


def _check_mentionable(db: Session, task: Task, agent_id: int) -> Agent:
    agent = db.get(Agent, agent_id)
    if agent is None or agent.organization_id != task.organization_id:
        raise ChatError("invalid_mention", f"Mentioned agent {agent_id} does not exist")
    if agent.status in UNAVAILABLE:
        raise ChatError("agent_unavailable", f"Agent {agent_id} is {agent.status.value}")
    in_project = db.scalar(
        select(ProjectAssignment.id).where(
            ProjectAssignment.project_id == task.project_id,
            ProjectAssignment.agent_id == agent_id,
        )
    )
    if in_project is None:
        raise ChatError("agent_not_in_project", f"Agent {agent_id} is not assigned to this project")
    return agent


def post_message(
    db: Session, user: User, task: Task, body: str, mentions: list[int]
) -> ConversationMessage:
    """Store a comment and route its mentions:
    - the assignee with a running execution on this task: extra instruction to it;
    - any other mentioned agent: a new queued execution (chat invocation);
    - no mention: stored as a note only.
    """
    mentions = list(dict.fromkeys(mentions))  # dedupe, keep order
    agents = [_check_mentionable(db, task, agent_id) for agent_id in mentions]
    conv = task_conversation(db, task, create=True)
    msg = ConversationMessage(
        organization_id=task.organization_id,
        conversation_id=conv.id,
        author_id=user.workforce_id,
        body=body,
        mentions=mentions,
    )
    db.add(msg)
    db.flush()
    for agent in agents:
        running = (
            running_execution(db, task, agent.workforce_id)
            if agent.workforce_id == task.assignee_id
            else None
        )
        if running is not None:
            record_event(db, running, ExecutionEventKind.INSTRUCTION, {"message_id": msg.id})
        else:
            queue_execution(
                db, task, agent, ExecutionTrigger.CHAT_MENTION, user=user, message=msg
            )
    return msg


def queue_execution(
    db: Session,
    task: Task,
    agent: Agent,
    trigger: ExecutionTrigger,
    *,
    user: User | None = None,
    message: ConversationMessage | None = None,
) -> Execution:
    latest_instructions = db.scalar(
        select(AgentInstructionVersion.id)
        .where(AgentInstructionVersion.agent_id == agent.workforce_id)
        .order_by(AgentInstructionVersion.version.desc())
        .limit(1)
    )
    execution = Execution(
        organization_id=task.organization_id,
        project_id=task.project_id,
        task_id=task.id,
        agent_id=agent.workforce_id,
        status=ExecutionStatus.QUEUED,
        trigger=trigger,
        trigger_message_id=message.id if message else None,
        triggered_by_id=user.workforce_id if user else None,
        instruction_version_id=latest_instructions,
        token_limit=agent.token_limit_per_execution,
    )
    db.add(execution)
    db.flush()
    return execution


def record_event(
    db: Session, execution: Execution, kind: ExecutionEventKind, payload: dict
) -> ExecutionEvent:
    """Append an event. Used by the runtime (later) and for comment instructions."""
    if execution.status not in ACTIVE:
        raise ChatError("execution_finished", "Execution has already finished")
    seq = (
        db.scalar(
            select(func.max(ExecutionEvent.seq)).where(ExecutionEvent.execution_id == execution.id)
        )
        or 0
    ) + 1
    event = ExecutionEvent(
        organization_id=execution.organization_id,
        execution_id=execution.id,
        seq=seq,
        kind=kind,
        payload=payload,
    )
    if kind == ExecutionEventKind.STEP:
        execution.current_step = payload.get("step")
    elif kind == ExecutionEventKind.TOKENS:
        execution.tokens_used = int(payload["used"])
    db.add(event)
    db.flush()
    return event


def start_execution(db: Session, execution: Execution) -> None:
    """Runtime hook: mark a queued execution as running."""
    if execution.status != ExecutionStatus.QUEUED:
        raise ChatError("not_queued", "Only queued executions can start")
    execution.status = ExecutionStatus.RUNNING
    execution.started_at = datetime.now(UTC)
    db.flush()


def stop_execution(db: Session, execution: Execution) -> None:
    # shortcut: only marks the record stopped; the runtime must also kill the container once it exists (ADR-0001).
    if execution.status not in ACTIVE:
        raise ChatError("execution_finished", "Execution has already finished")
    execution.status = ExecutionStatus.STOPPED
    execution.finished_at = datetime.now(UTC)
    db.flush()


def get_execution(db: Session, org_id: int, execution_id: int) -> Execution:
    execution = db.get(Execution, execution_id)
    if execution is None or execution.organization_id != org_id:
        raise NotFound("Execution")
    return execution
