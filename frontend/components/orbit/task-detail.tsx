"use client"

import * as React from "react"
import { ExternalLink, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { AssigneeSelect } from "@/components/orbit/assignee-select"
import { founderActions, readiness, type Action } from "@/components/orbit/board"
import { ExecutionCard } from "@/components/orbit/execution-card"
import { useActor } from "@/components/orbit/orbit-context"
import { EXEC_STATUS, StatusBadge, TASK_STATUS } from "@/components/orbit/status"
import { TaskThread } from "@/components/orbit/task-thread"
import {
  ACTIVE_EXEC,
  api,
  ApiError,
  criteriaLines,
  formatTime,
  formatTokens,
  useApi,
  type Execution,
  type Task,
  type TaskEvent,
} from "@/lib/api"
import { cn } from "@/lib/utils"

function DetailsForm({ task, onSaved }: { task: Task; onSaved: () => void }) {
  const [criteria, setCriteria] = React.useState(task.acceptance_criteria ?? "")
  const [description, setDescription] = React.useState(task.description ?? "")
  const [waived, setWaived] = React.useState(task.acceptance_criteria_waived)
  const [assignee, setAssignee] = React.useState<number | null>(task.assignee_id)
  const [status, setStatus] = React.useState<{ ok?: string; error?: string }>({})
  const dirty =
    criteria !== (task.acceptance_criteria ?? "") ||
    description !== (task.description ?? "") ||
    waived !== task.acceptance_criteria_waived ||
    assignee !== task.assignee_id

  return (
    <form
      aria-labelledby="details"
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault()
        try {
          await api<Task>(`/tasks/${task.id}`, {
            method: "PATCH",
            body: {
              description: description.trim() || null,
              acceptance_criteria: criteria.trim() || null,
              acceptance_criteria_waived: waived,
              assignee_id: assignee,
            },
          })
          setStatus({ ok: "Saved." })
          onSaved()
        } catch (err) {
          setStatus({ error: err instanceof ApiError ? err.message : "Not saved." })
        }
      }}
    >
      <h2 id="details" className="text-sm font-medium">
        Details
      </h2>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="t-description">Description</FieldLabel>
          <Textarea id="t-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="t-criteria">Acceptance criteria</FieldLabel>
          <Textarea id="t-criteria" rows={4} value={criteria} onChange={(e) => setCriteria(e.target.value)} />
          <FieldDescription>One criterion per line. A task can’t move to Assigned without them.</FieldDescription>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" className="size-4 accent-primary" checked={waived} onChange={(e) => setWaived(e.target.checked)} />
            Exploratory task, no acceptance criteria needed
          </label>
        </Field>
        <Field>
          <FieldLabel htmlFor="t-assignee">Assignee</FieldLabel>
          <AssigneeSelect id="t-assignee" value={assignee} onChange={setAssignee} />
        </Field>
      </FieldGroup>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" size="sm" disabled={!dirty}>
          Save details
        </Button>
        {status.error ? <FieldError>{status.error}</FieldError> : null}
        {status.ok && !dirty ? (
          <p role="status" className="text-xs text-muted-foreground">
            {status.ok}
          </p>
        ) : null}
      </div>
    </form>
  )
}

function Dependencies({ task, all, onChanged }: { task: Task; all: Task[]; onChanged: () => void }) {
  const [error, setError] = React.useState<string | null>(null)
  const candidates = all.filter((t) => t.id !== task.id && !task.depends_on.includes(t.id) && t.status !== "cancelled")
  const run = (p: Promise<unknown>) =>
    p.then(
      () => (setError(null), onChanged()),
      (e) => setError(e instanceof ApiError ? e.message : "Dependency not changed.")
    )
  return (
    <section aria-labelledby="dep" className="flex flex-col gap-2">
      <h2 id="dep" className="text-sm font-medium">
        Depends on
      </h2>
      {task.depends_on.length ? (
        <ul className="flex flex-col gap-1">
          {task.depends_on.map((id) => {
            const d = all.find((t) => t.id === id)
            return (
              <li key={id} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{d?.key ?? `#${id}`}</span>
                <span className="min-w-0 flex-1 truncate">{d?.title ?? "Task in another project"}</span>
                {d ? <StatusBadge def={TASK_STATUS[d.status]} /> : null}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove dependency on ${d?.key ?? id}`}
                  onClick={() => run(api(`/tasks/${task.id}/dependencies/${id}`, { method: "DELETE" }))}
                >
                  <X aria-hidden="true" />
                </Button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No dependencies.</p>
      )}
      {task.status === "backlog" && candidates.length ? (
        <Select value={null} onValueChange={(v) => v && run(api(`/tasks/${task.id}/dependencies`, { body: { depends_on_id: v } }))}>
          <SelectTrigger size="sm" className="w-full" aria-label="Add a dependency">
            <SelectValue>{() => "Add a dependency"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {candidates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.key} {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {task.depends_on.length ? (
        <p className="text-xs text-muted-foreground">This task moves to Assigned automatically once every dependency is Done.</p>
      ) : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </section>
  )
}

function Executions({ task, executions, onChanged }: { task: Task; executions: Execution[]; onChanged: () => void }) {
  const actor = useActor()
  const [openId, setOpenId] = React.useState<number | null>(null)
  const active = executions.filter((e) => ACTIVE_EXEC.includes(e.status))
  const past = executions.filter((e) => !ACTIVE_EXEC.includes(e.status))
  const label = `${task.key} ${task.title}`
  return (
    <section aria-labelledby="live" className="flex flex-col gap-2">
      <h2 id="live" className="text-sm font-medium">
        Executions
      </h2>
      {active.map((e) => (
        <ExecutionCard key={e.id} execution={e} label={label} showLog onChanged={onChanged} />
      ))}
      {!executions.length ? (
        <p className="text-xs text-muted-foreground">
          No executions yet. Agents work only when you mention them in a comment. The agent runtime isn’t connected yet, so new
          executions stay Queued.
        </p>
      ) : null}
      {past.length ? (
        <ul aria-label="Previous executions" className="flex flex-col gap-1">
          {past.map((e) => (
            <li key={e.id} className="flex flex-col gap-2">
              <button
                type="button"
                aria-expanded={openId === e.id}
                onClick={() => setOpenId(openId === e.id ? null : e.id)}
                className="flex items-center gap-2 rounded-md px-1 py-1 text-left text-xs outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="font-mono">#{e.id}</span>
                <span className="min-w-0 flex-1 truncate">{actor(e.agent_id).name}</span>
                <StatusBadge def={EXEC_STATUS[e.status]} />
                <span className="font-mono text-muted-foreground tabular-nums">{formatTokens(e.tokens_used)} tok</span>
                <span className="font-mono text-muted-foreground">{formatTime(e.created_at)}</span>
              </button>
              {openId === e.id ? <ExecutionCard execution={e} label={label} showLog /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export function TaskSheet({
  taskId,
  all,
  onClose,
  onChanged,
  onPick,
}: {
  taskId: number | null
  all: Task[]
  onClose: () => void
  onChanged: () => void
  onPick: (t: Task, a: Action) => void
}) {
  const fallback = useApi<Task>(taskId && !all.some((t) => t.id === taskId) ? `/tasks/${taskId}` : null)
  const task = all.find((t) => t.id === taskId) ?? (fallback.data?.id === taskId ? fallback.data : undefined)
  const [tick, setTick] = React.useState(0)
  const execs = useApi<Execution[]>(task ? `/tasks/${task.id}/executions?t=${tick}` : null, 5000)
  const events = useApi<TaskEvent[]>(task ? `/tasks/${task.id}/events?s=${task.status}` : null)
  const actor = useActor()
  const assignee = task?.assignee_id ? actor(task.assignee_id) : null
  const actions = task ? founderActions(task, all) : []
  const primary = actions.find((a) => !["blocked", "cancelled", "revision"].includes(a.to))
  const secondary = actions.filter((a) => a !== primary)
  const ready = task ? readiness(task, all) : null
  const last = events.data?.at(-1)
  const lastReason = last?.to_status === task?.status ? last?.reason : null
  const changed = () => {
    setTick((t) => t + 1)
    onChanged()
  }
  const editable = task && task.status !== "done" && task.status !== "cancelled"

  return (
    <Sheet open={taskId !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-xl data-[side=right]:sm:max-w-xl">
        {task ? (
          <>
            <SheetHeader className="gap-2 border-b">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{task.key}</span>
                <StatusBadge def={TASK_STATUS[task.status]} />
              </div>
              <SheetTitle className="text-base">{task.title}</SheetTitle>
              <SheetDescription>
                {assignee ? `Assigned to ${assignee.name}` : "No assignee yet"}
                {task.revision_count ? ` · ${task.revision_count} revision${task.revision_count > 1 ? "s" : ""}` : ""}
              </SheetDescription>
              {task.pr_url ? (
                <a href={task.pr_url} target="_blank" rel="noreferrer" className="flex w-fit items-center gap-1 text-xs underline underline-offset-4">
                  Open pull request
                  <ExternalLink aria-hidden="true" className="size-3" />
                </a>
              ) : null}
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 text-sm">
              {lastReason ? (
                <p className={cn("text-sm", task.status === "blocked" && "text-task-blocked-foreground")}>
                  {task.status === "revision" ? "Feedback: " : ""}
                  {lastReason}
                </p>
              ) : null}
              <Executions task={task} executions={execs.data ?? []} onChanged={changed} />
              {editable ? (
                <DetailsForm key={`${task.id}-${task.status}`} task={task} onSaved={changed} />
              ) : (
                <section aria-labelledby="ac" className="flex flex-col gap-2">
                  <h2 id="ac" className="text-sm font-medium">
                    Acceptance criteria
                  </h2>
                  {criteriaLines(task).length ? (
                    <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
                      {criteriaLines(task).map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-muted-foreground">None.</p>
                  )}
                </section>
              )}
              <Dependencies task={task} all={all} onChanged={changed} />
              <TaskThread key={task.id} task={task} executions={execs.data ?? []} onSent={changed} />
            </div>
            {actions.length ? (
              <div className="flex flex-wrap items-center gap-2 border-t p-4">
                {primary ? <Button onClick={() => onPick(task, primary)}>{primary.label}</Button> : null}
                {secondary.map((a) => (
                  <Button key={a.label} variant={a.to === "cancelled" ? "ghost" : "outline"} onClick={() => onPick(task, a)}>
                    {a.label}
                  </Button>
                ))}
                {task.status === "backlog" && ready && !ready.ok ? <p className="w-full text-xs text-muted-foreground">{ready.why}</p> : null}
              </div>
            ) : null}
          </>
        ) : (
          <SheetHeader>
            <SheetTitle>{fallback.error ? "Task not found" : "Loading task…"}</SheetTitle>
            {fallback.error ? <SheetDescription>{fallback.error.message}</SheetDescription> : null}
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  )
}
