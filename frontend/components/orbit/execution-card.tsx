"use client"

import * as React from "react"
import { Play, Square } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ActorAvatar } from "@/components/orbit/actor-avatar"
import { useActor } from "@/components/orbit/orbit-context"
import { EXEC_STATUS, StatusBadge } from "@/components/orbit/status"
import { ACTIVE_EXEC, api, ApiError, formatTime, formatTokens, useApi, type Execution, type ExecutionEvent } from "@/lib/api"
import { cn } from "@/lib/utils"

const POLL_MS = 3000
const STOPPABLE = ["queued", "preparing", "running", "waiting_for_input", "suspended"]

const TRIGGER = { chat_mention: "Mentioned in a comment", task_assignment: "Task assignment", human_action: "Started by the Founder" }

function StopExecutionDialog({ exec, agentName, label, onConfirm }: { exec: Execution; agentName: string; label: string; onConfirm: () => void }) {
  const [open, setOpen] = React.useState(false)
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
        <Square aria-hidden="true" />
        Stop
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Stop this execution?</AlertDialogTitle>
          <AlertDialogDescription>
            {agentName} execution #{exec.id} on {label} ({formatTokens(exec.tokens_used)} tokens used). The execution stops now and becomes
            Cancelled. Uncommitted changes are lost. Tokens already used stay on record.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              setOpen(false)
              onConfirm()
            }}
          >
            Stop execution
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function eventLine(e: ExecutionEvent) {
  const p = e.payload as Record<string, string | number>
  if (e.kind === "step") return `Step: ${p.step}`
  if (e.kind === "output") return String(p.text)
  if (e.kind === "tool") return `${p.tool}: ${p.summary}`
  if (e.kind === "tokens") return `Tokens used: ${formatTokens(Number(p.used))}`
  return `Instruction from comment #${p.message_id}`
}

/** Live panel for one execution (PRD 17.4). Polls while active; reading never triggers the agent (17.5). */
export function ExecutionCard({
  execution,
  label,
  showLog = false,
  onChanged,
  className,
}: {
  execution: Execution
  label: string
  showLog?: boolean
  onChanged?: () => void
  className?: string
}) {
  const active = ACTIVE_EXEC.includes(execution.status)
  const live = useApi<Execution>(`/executions/${execution.id}`, active ? POLL_MS : undefined)
  const exec = live.data ?? execution
  const stillActive = ACTIVE_EXEC.includes(exec.status)
  const events = useApi<ExecutionEvent[]>(showLog ? `/executions/${exec.id}/events` : null, showLog && stillActive ? POLL_MS : undefined)
  const actor = useActor()
  const agent = actor(exec.agent_id)
  const [error, setError] = React.useState<string | null>(null)
  const progress = exec.token_limit ? exec.tokens_used / exec.token_limit : 0
  const tools = events.data?.filter((e) => e.kind === "tool") ?? []

  const act = async (verb: "stop" | "resume") => {
    try {
      await api(`/executions/${exec.id}/${verb}`, { method: "POST" })
      setError(null)
      live.reload()
      onChanged?.()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : `${verb} failed`)
    }
  }

  return (
    <section aria-label={`Execution ${exec.id}`} className={cn("flex flex-col gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10", className)}>
      <div className="flex items-center gap-2">
        <ActorAvatar actor={agent} size="sm" />
        <p className="min-w-0 flex-1 truncate text-sm">
          <span className="font-medium">{agent.name}</span>
          <span className="text-muted-foreground"> on </span>
          {label}
        </p>
        {exec.status === "suspended" ? (
          <Button size="sm" variant="outline" onClick={() => act("resume")}>
            <Play aria-hidden="true" />
            Resume
          </Button>
        ) : null}
        {STOPPABLE.includes(exec.status) ? (
          <StopExecutionDialog exec={exec} agentName={agent.name} label={label} onConfirm={() => act("stop")} />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" aria-live="polite">
        <StatusBadge def={EXEC_STATUS[exec.status]} progress={progress} />
        <span className="font-mono text-muted-foreground">#{exec.id}</span>
        <span className="text-muted-foreground">{TRIGGER[exec.trigger]}</span>
        <span className="font-mono text-muted-foreground">{formatTime(exec.created_at)}</span>
        <span className="ml-auto font-mono tabular-nums">
          {formatTokens(exec.tokens_used)} <span className="text-muted-foreground">/ {formatTokens(exec.token_limit)} tokens</span>
        </span>
      </div>
      <Progress value={Math.round(progress * 100)} aria-label="Tokens used of the per-execution limit" />
      <p className="font-mono text-xs text-muted-foreground">
        {exec.current_step
          ? `Current step: ${exec.current_step}`
          : exec.status === "queued"
            ? "Queued. The agent runtime isn’t connected yet, so queued executions don’t start."
            : "No step reported."}
      </p>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      {showLog && tools.length ? (
        <section aria-label="Tools called" className="flex flex-col gap-1 text-xs">
          <h3 className="text-muted-foreground">Tools called</h3>
          <ul className="flex flex-col gap-0.5 font-mono">
            {tools.map((t) => (
              <li key={t.seq} className="flex gap-2">
                <span className="w-20 shrink-0 text-muted-foreground">{String(t.payload.tool)}</span>
                <span className="min-w-0 truncate">{String(t.payload.summary)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {showLog ? (
        <pre aria-label="Execution log" className="max-h-56 overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-5 whitespace-pre-wrap text-foreground">
          {events.data?.length
            ? events.data.map((e) => `${formatTime(e.created_at)}  ${eventLine(e)}`).join("\n")
            : events.error
              ? events.error.message
              : "No events yet."}
        </pre>
      ) : null}
    </section>
  )
}
