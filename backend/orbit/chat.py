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
    Conversation,
    ConversationMessage,
    Execution,
    ExecutionEvent,
    ExecutionEventKind,
    ExecutionStatus,
    ExecutionTrigger,
    Project,
    Task,
    User,
)
from orbit.structure import works_in

E = ExecutionStatus
# Lifecycle (PRD 18.3). Suspended is resumed by a human back to Queued.
EXECUTION_TRANSITIONS: dict[ExecutionStatus, set[ExecutionStatus]] = {
    E.QUEUED: {E.PREPARING, E.CANCELLED},
    E.PREPARING: {E.RUNNING, E.FAILED, E.CANCELLED},
    E.RUNNING: {E.WAITING_FOR_INPUT, E.COMPLETED, E.FAILED, E.CANCELLED},
    E.WAITING_FOR_INPUT: {E.RUNNING, E.SUSPENDED, E.FAILED, E.CANCELLED},
    E.SUSPENDED: {E.QUEUED, E.CANCELLED},
}
TERMINAL = {E.COMPLETED, E.FAILED, E.CANCELLED}
# The agent is working: a comment mentioning it is an extra instruction, not a new run.
IN_FLIGHT = {E.PREPARING, E.RUNNING, E.WAITING_FOR_INPUT}


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


def project_conversation(db: Session, project: Project, *, create: bool) -> Conversation | None:
    """The project's own chat thread (not linked to a task)."""
    conv = db.scalar(
        select(Conversation).where(
            Conversation.project_id == project.id, Conversation.task_id.is_(None)
        )
    )
    if conv is None and create:
        conv = Conversation(organization_id=project.organization_id, project_id=project.id)
        db.add(conv)
        db.flush()
    return conv


def list_messages(db: Session, conv: Conversation | None) -> list[ConversationMessage]:
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
            Execution.status.in_(IN_FLIGHT),
        )
    )


def _check_mentionable(db: Session, conv: Conversation, agent_id: int) -> Agent:
    agent = db.get(Agent, agent_id)
    if agent is None or agent.organization_id != conv.organization_id:
        raise ChatError("invalid_mention", f"Mentioned agent {agent_id} does not exist")
    if agent.archived_at is not None:
        raise ChatError("agent_unavailable", f"Agent {agent_id} is archived")
    if not works_in(db, agent, conv.project_id):
        raise ChatError("agent_not_in_project", f"Agent {agent_id} does not work in this project")
    return agent


def post_task_message(
    db: Session, user: User, task: Task, body: str, mentions: list[int]
) -> ConversationMessage:
    """Task comment (PRD 17.4). Mentions route as:
    - the assignee with an in-flight execution on this task (preparing, running or
      waiting for input): extra instruction to it — this is also how the Founder
      answers an agent's question;
    - any other mentioned agent: a new queued execution (chat invocation);
    - no mention: stored as a note only.
    """
    return _post(db, user, task_conversation(db, task, create=True), task, body, mentions)


def post_project_message(
    db: Session, user: User, project: Project, body: str, mentions: list[int]
) -> ConversationMessage:
    """Project Chat. Each mentioned agent gets a new queued execution without a task.
    # shortcut: the "from chat" light task (PRD 4.4) is created once the runtime sees
    # code changes; tasks already carry `from_chat` and `source_message_id` for it.
    """
    return _post(db, user, project_conversation(db, project, create=True), None, body, mentions)


def _post(
    db: Session,
    user: User,
    conv: Conversation,
    task: Task | None,
    body: str,
    mentions: list[int],
) -> ConversationMessage:
    mentions = list(dict.fromkeys(mentions))  # dedupe, keep order
    agents = [_check_mentionable(db, conv, agent_id) for agent_id in mentions]
    msg = ConversationMessage(
        organization_id=conv.organization_id,
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
            if task is not None and agent.workforce_id == task.assignee_id
            else None
        )
        if running is not None:
            record_event(db, running, ExecutionEventKind.INSTRUCTION, {"message_id": msg.id})
        else:
            queue_execution(
                db, conv, task, agent, ExecutionTrigger.CHAT_MENTION, user=user, message=msg
            )
    return msg


def queue_execution(
    db: Session,
    conv: Conversation,
    task: Task | None,
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
        organization_id=conv.organization_id,
        project_id=conv.project_id,
        task_id=task.id if task else None,
        agent_id=agent.workforce_id,
        status=ExecutionStatus.QUEUED,
        trigger=trigger,
        trigger_message_id=message.id if message else None,
        triggered_by_id=user.workforce_id if user else None,
        instruction_version_id=latest_instructions,
    )
    db.add(execution)
    db.flush()
    return execution


def record_event(
    db: Session, execution: Execution, kind: ExecutionEventKind, payload: dict
) -> ExecutionEvent:
    """Append an event. Used by the runtime (later) and for comment instructions."""
    if execution.status not in IN_FLIGHT:
        raise ChatError("execution_not_running", "Execution is not in progress")
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


def advance_execution(db: Session, execution: Execution, to: ExecutionStatus) -> None:
    """Move an execution along its lifecycle. Used by the runtime and by Stop/Resume."""
    if to not in EXECUTION_TRANSITIONS.get(execution.status, set()):
        raise ChatError(
            "invalid_execution_transition",
            f"Cannot move execution from {execution.status.value} to {to.value}",
        )
    now = datetime.now(UTC)
    if to == E.PREPARING and execution.started_at is None:
        execution.started_at = now
    if to in TERMINAL:
        execution.finished_at = now
    execution.status = to
    db.flush()


def stop_execution(db: Session, execution: Execution) -> None:
    # shortcut: only marks the record cancelled; the runtime must also kill the container once it exists (ADR-0001).
    advance_execution(db, execution, E.CANCELLED)


def resume_execution(db: Session, execution: Execution) -> None:
    advance_execution(db, execution, E.QUEUED)


def get_execution(db: Session, org_id: int, execution_id: int) -> Execution:
    execution = db.get(Execution, execution_id)
    if execution is None or execution.organization_id != org_id:
        raise NotFound("Execution")
    return execution
