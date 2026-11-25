import {
  Archive,
  Check,
  Circle,
  CircleCheck,
  CircleDashed,
  CirclePause,
  CircleSlash,
  Clock,
  GitPullRequest,
  Hourglass,
  MessageCircleQuestion,
  OctagonAlert,
  Pause,
  PencilLine,
  RotateCcw,
  Settings2,
  X,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { OrbitIndicator } from "@/components/orbit/orbit-indicator"
import type { AgentStatus, ExecStatus, TaskStatus } from "@/lib/orbit-data"
import { cn } from "@/lib/utils"

type Def = { label: string; icon: LucideIcon | "orbit"; cls: string; dot: string }

// Classes are written out in full so Tailwind can see them.
export const TASK_STATUS: Record<TaskStatus, Def> = {
  backlog: { label: "Backlog", icon: CircleDashed, cls: "bg-task-backlog-subtle text-task-backlog-foreground", dot: "bg-task-backlog" },
  assigned: { label: "Assigned", icon: Circle, cls: "bg-task-assigned-subtle text-task-assigned-foreground", dot: "bg-task-assigned" },
  "in-progress": { label: "In Progress", icon: "orbit", cls: "bg-task-in-progress-subtle text-task-in-progress-foreground", dot: "bg-task-in-progress" },
  "founder-approval": { label: "Founder Approval", icon: GitPullRequest, cls: "bg-task-founder-approval-subtle text-task-founder-approval-foreground", dot: "bg-task-founder-approval" },
  revision: { label: "Revision", icon: RotateCcw, cls: "bg-task-revision-subtle text-task-revision-foreground", dot: "bg-task-revision" },
  blocked: { label: "Blocked", icon: OctagonAlert, cls: "bg-task-blocked-subtle text-task-blocked-foreground", dot: "bg-task-blocked" },
  done: { label: "Done", icon: CircleCheck, cls: "bg-task-done-subtle text-task-done-foreground", dot: "bg-task-done" },
  cancelled: { label: "Cancelled", icon: CircleSlash, cls: "bg-task-cancelled-subtle text-task-cancelled-foreground", dot: "bg-task-cancelled" },
}

export const EXEC_STATUS: Record<ExecStatus, Def> = {
  queued: { label: "Queued", icon: Clock, cls: "bg-exec-queued-subtle text-exec-queued-foreground", dot: "bg-exec-queued" },
  preparing: { label: "Preparing", icon: Hourglass, cls: "bg-exec-preparing-subtle text-exec-preparing-foreground", dot: "bg-exec-preparing" },
  running: { label: "Running", icon: "orbit", cls: "bg-exec-running-subtle text-exec-running-foreground", dot: "bg-exec-running" },
  waiting: { label: "Waiting for Input", icon: MessageCircleQuestion, cls: "bg-exec-waiting-subtle text-exec-waiting-foreground", dot: "bg-exec-waiting" },
  completed: { label: "Completed", icon: Check, cls: "bg-exec-completed-subtle text-exec-completed-foreground", dot: "bg-exec-completed" },
  failed: { label: "Failed", icon: X, cls: "bg-exec-failed-subtle text-exec-failed-foreground", dot: "bg-exec-failed" },
  cancelled: { label: "Cancelled", icon: CircleSlash, cls: "bg-exec-cancelled-subtle text-exec-cancelled-foreground", dot: "bg-exec-cancelled" },
  suspended: { label: "Suspended", icon: CirclePause, cls: "bg-exec-suspended-subtle text-exec-suspended-foreground", dot: "bg-exec-suspended" },
}

export const AGENT_STATUS: Record<AgentStatus, Def> = {
  draft: { label: "Draft", icon: PencilLine, cls: "bg-agent-status-draft-subtle text-agent-status-draft-foreground", dot: "bg-agent-status-draft" },
  configuring: { label: "Configuring", icon: Settings2, cls: "bg-agent-status-configuring-subtle text-agent-status-configuring-foreground", dot: "bg-agent-status-configuring" },
  ready: { label: "Ready", icon: Circle, cls: "bg-agent-status-ready-subtle text-agent-status-ready-foreground", dot: "bg-agent-status-ready" },
  active: { label: "Active", icon: "orbit", cls: "bg-agent-status-active-subtle text-agent-status-active-foreground", dot: "bg-agent-status-active" },
  paused: { label: "Paused", icon: Pause, cls: "bg-agent-status-paused-subtle text-agent-status-paused-foreground", dot: "bg-agent-status-paused" },
  error: { label: "Error", icon: OctagonAlert, cls: "bg-agent-status-error-subtle text-agent-status-error-foreground", dot: "bg-agent-status-error" },
  archived: { label: "Archived", icon: Archive, cls: "bg-agent-status-archived-subtle text-agent-status-archived-foreground", dot: "bg-agent-status-archived" },
}

export function StatusIcon({ def, progress, className }: { def: Def; progress?: number; className?: string }) {
  if (def.icon === "orbit") return <OrbitIndicator progress={progress} className={className} />
  const Icon = def.icon
  return <Icon aria-hidden="true" className={cn("size-3.5", className)} />
}

/** Status badge: icon + label + color. No border, no uppercase, no glow. */
export function StatusBadge({ def, progress, className }: { def: Def; progress?: number; className?: string }) {
  return (
    <Badge className={cn("gap-1 border-transparent font-normal", def.cls, className)}>
      <StatusIcon def={def} progress={progress} />
      {def.label}
    </Badge>
  )
}
