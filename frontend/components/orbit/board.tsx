"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { GitPullRequest, Link2, MoreHorizontal, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ActorAvatar } from "@/components/orbit/actor-avatar"
import { AssigneeSelect } from "@/components/orbit/assignee-select"
import { useActor, useOrbit } from "@/components/orbit/orbit-context"
import { CreateProjectForm } from "@/components/orbit/projects"
import { BoardError, BoardLoading } from "@/components/orbit/states"
import { TaskSheet } from "@/components/orbit/task-detail"
import { WaitingOnYou } from "@/components/orbit/waiting-on-you"
import { StatusBadge, StatusIcon, TASK_STATUS } from "@/components/orbit/status"
import { api, ApiError, criteriaLines, useApi, type Task, type TaskStatus, type WaitingItem } from "@/lib/api"
import { cn } from "@/lib/utils"

const COLUMNS: TaskStatus[] = ["backlog", "assigned", "in_progress", "founder_approval", "revision", "blocked", "done"]

export type Action = { label: string; to: TaskStatus; reason?: "reason" | "feedback" }

/** Founder actions per status, per PRD 15.1 (MVP). Assignee/system transitions are not offered. */
export function founderActions(t: Task, all: Task[]): Action[] {
  const end = t.status === "done" || t.status === "cancelled"
  const a: Action[] = []
  if (t.status === "founder_approval") {
    a.push({ label: "Approve, mark Done", to: "done" }, { label: "Request revision", to: "revision", reason: "feedback" })
  }
  if (t.status === "backlog" && readiness(t, all).ok) a.push({ label: "Move to Assigned", to: "assigned" })
  if (t.status === "blocked" && t.status_before_block)
    a.push({ label: `Unblock, back to ${TASK_STATUS[t.status_before_block].label}`, to: t.status_before_block })
  if (!end && t.status !== "blocked") a.push({ label: "Mark Blocked", to: "blocked", reason: "reason" })
  if (!end) a.push({ label: "Cancel task", to: "cancelled", reason: "reason" })
  return a
}

export function readiness(t: Task, all: Task[]) {
  const waitingOn = t.depends_on
    .map((id) => all.find((x) => x.id === id))
    .filter((d) => d?.status !== "done")
    .map((d) => d?.key ?? "a task in another project")
  if (!criteriaLines(t).length && !t.acceptance_criteria_waived) return { ok: false, why: "Add acceptance criteria first." }
  if (!t.assignee_id) return { ok: false, why: "Pick an assignee first." }
  if (waitingOn.length) return { ok: false, why: `Moves on automatically once ${waitingOn.join(", ")} is Done.` }
  return { ok: true, why: "" }
}

/** Runs a transition and reports the backend's message on failure. */
export async function runTransition(task: Task, action: Action, reason?: string) {
  await api<Task>(`/tasks/${task.id}/transitions`, { body: { to_status: action.to, reason } })
}

export function ReasonDialog({
  pending,
  onClose,
  onSubmit,
}: {
  pending: { task: Task; action: Action } | null
  onClose: () => void
  onSubmit: (text: string) => Promise<void>
}) {
  const [text, setText] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const feedback = pending?.action.reason === "feedback"
  const close = () => {
    setText("")
    setError(null)
    onClose()
  }
  return (
    <Dialog open={!!pending} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!text.trim()) return setError(feedback ? "Write feedback the agent can act on." : "Enter a reason.")
            try {
              await onSubmit(text.trim())
              close()
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "The change wasn’t saved.")
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {pending?.action.label} {pending?.task.key}
            </DialogTitle>
            <DialogDescription>
              {feedback
                ? "Feedback goes to the agent as the basis for the revision and counts as one revision cycle."
                : "A reason is required and is saved in the task history."}
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={!!error || undefined}>
            <FieldLabel htmlFor="reason">{feedback ? "Revision feedback" : "Reason"}</FieldLabel>
            <Textarea id="reason" value={text} onChange={(e) => setText(e.target.value)} aria-invalid={!!error || undefined} rows={4} />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" variant={pending?.action.to === "cancelled" ? "destructive" : "default"}>
              {pending?.action.label}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TaskMenu({ task, all, onPick }: { task: Task; all: Task[]; onPick: (a: Action) => void }) {
  const actions = founderActions(task, all)
  if (!actions.length) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" className="relative z-10 -mr-1" aria-label={`Actions for ${task.key}`} />}
      >
        <MoreHorizontal aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{task.key}</DropdownMenuLabel>
          {actions.map((a) => (
            <DropdownMenuItem key={a.label} variant={a.to === "cancelled" ? "destructive" : "default"} onClick={() => onPick(a)}>
              {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TaskCard({
  task,
  all,
  note,
  onOpen,
  onPick,
}: {
  task: Task
  all: Task[]
  note?: string
  onOpen: () => void
  onPick: (a: Action) => void
}) {
  const actor = useActor()
  const assignee = task.assignee_id ? actor(task.assignee_id) : null
  const ready = readiness(task, all)
  const def = TASK_STATUS[task.status]
  const missingCriteria = task.status === "backlog" && !criteriaLines(task).length && !task.acceptance_criteria_waived
  return (
    <article className="relative flex flex-col gap-2 rounded-lg bg-card p-3 ring-1 ring-foreground/10 transition-colors has-[button[data-open]]:ring-ring hover:bg-muted/50">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{task.key}</span>
        {task.from_chat ? <span className="text-xs text-muted-foreground">from chat</span> : null}
        <span className="ml-auto" />
        <TaskMenu task={task} all={all} onPick={onPick} />
      </div>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "text-left text-sm leading-snug font-medium outline-none after:absolute after:inset-0 focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring",
          task.status === "cancelled" && "text-muted-foreground line-through"
        )}
      >
        {task.title}
      </button>
      {note ? (
        <p className="flex items-start gap-1 text-xs text-task-blocked-foreground">
          <StatusIcon def={def} className="mt-px" />
          {note}
        </p>
      ) : null}
      {missingCriteria ? <p className="text-xs text-muted-foreground">No acceptance criteria yet</p> : null}
      {task.status === "backlog" && !ready.ok && !missingCriteria ? (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link2 aria-hidden="true" className="size-3.5" />
          {ready.why}
        </p>
      ) : null}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {assignee ? (
          <>
            <ActorAvatar actor={assignee} size="sm" className="size-5" />
            <span className="truncate">{assignee.name}</span>
          </>
        ) : (
          <span>No assignee yet</span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-2 font-mono whitespace-nowrap tabular-nums">
          {task.pr_url ? (
            <span className="flex items-center gap-0.5">
              <GitPullRequest aria-hidden="true" className="size-3" />
              PR
            </span>
          ) : null}
          {task.revision_count ? <span>rev {task.revision_count}</span> : null}
        </span>
      </div>
    </article>
  )
}

function CreateTaskDialog({
  projectId,
  open,
  onOpenChange,
  onCreated,
}: {
  projectId: number
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: (t: Task) => void
}) {
  const [error, setError] = React.useState<{ title?: boolean; server?: string }>({})
  const [assignee, setAssignee] = React.useState<number | null>(null)
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setError({})
        setAssignee(null)
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            const title = String(f.get("title") ?? "").trim()
            if (!title) return setError({ title: true })
            const criteria = String(f.get("criteria") ?? "")
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
              .join("\n")
            try {
              const t = await api<Task>(`/projects/${projectId}/tasks`, {
                body: {
                  title,
                  description: String(f.get("description") ?? "").trim() || null,
                  acceptance_criteria: criteria || null,
                  assignee_id: assignee,
                },
              })
              setAssignee(null)
              onCreated(t)
            } catch (err) {
              setError({ server: err instanceof ApiError ? err.message : "Task couldn’t be created." })
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Create task</DialogTitle>
            <DialogDescription>New tasks start in Backlog. Agents only work on tasks with acceptance criteria.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={error.title || undefined}>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input id="title" name="title" aria-invalid={error.title || undefined} />
              {error.title ? <FieldError>Enter a title.</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea id="description" name="description" rows={3} />
            </Field>
            <Field>
              <FieldLabel htmlFor="criteria">Acceptance criteria</FieldLabel>
              <Textarea id="criteria" name="criteria" rows={4} />
              <FieldDescription>One criterion per line. You can add them later.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="assignee">Assignee</FieldLabel>
              <AssigneeSelect id="assignee" value={assignee} onChange={setAssignee} />
            </Field>
          </FieldGroup>
          {error.server ? <FieldError>{error.server}</FieldError> : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit">Create task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function Board() {
  const { project, projects, bumpWaiting, waitingTick } = useOrbit()
  const actor = useActor()
  const tasks = useApi<Task[]>(project ? `/projects/${project.id}/tasks` : null)
  const waiting = useApi<WaitingItem[]>(`/waiting-on-you?t=${waitingTick}`, 30_000)
  const items = React.useMemo(() => tasks.data ?? [], [tasks.data])
  const [view, setView] = React.useState<string>("kanban")
  const [showCancelled, setShowCancelled] = React.useState(false)
  // Deep link from other screens: /board?task=ID
  const params = useSearchParams()
  const [openId, setOpenId] = React.useState<number | null>(() => Number(params.get("task")) || null)
  const [pending, setPending] = React.useState<{ task: Task; action: Action } | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const refresh = () => {
    tasks.reload()
    bumpWaiting()
  }
  const apply = async (task: Task, action: Action, reason?: string) => {
    await runTransition(task, action, reason)
    setActionError(null)
    refresh()
  }
  const pick = (task: Task) => (a: Action) =>
    a.reason
      ? setPending({ task, action: a })
      : apply(task, a).catch((e) => setActionError(`${task.key}: ${e instanceof ApiError ? e.message : "change failed"}`))

  if (projects && !projects.length) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 p-4 md:p-6">
        <h2 className="text-base font-medium">Create your first project</h2>
        <p className="text-sm text-muted-foreground">Tasks live in a project. Create one to start the board.</p>
        <CreateProjectForm />
      </div>
    )
  }

  const blockedNote = (t: Task) =>
    t.status === "blocked" ? waiting.data?.find((w) => w.kind === "blocked" && w.task_id === t.id)?.reason ?? undefined : undefined
  const columns = showCancelled ? [...COLUMNS, "cancelled" as TaskStatus] : COLUMNS
  const cancelledCount = items.filter((t) => t.status === "cancelled").length

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <WaitingOnYou items={waiting.data ?? []} onOpenTask={setOpenId} onChanged={refresh} />

      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup value={[view]} onValueChange={(v) => v[0] && setView(v[0])} variant="outline" aria-label="View">
          <ToggleGroupItem value="kanban">Kanban</ToggleGroupItem>
          <ToggleGroupItem value="list">List</ToggleGroupItem>
        </ToggleGroup>
        <Button variant="ghost" aria-pressed={showCancelled} onClick={() => setShowCancelled((v) => !v)}>
          {showCancelled ? "Hide" : "Show"} Cancelled ({cancelledCount})
        </Button>
        <Button className="ml-auto" onClick={() => setCreating(true)} disabled={!project}>
          <Plus aria-hidden="true" />
          Create task
        </Button>
      </div>

      {actionError ? (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      ) : null}

      {tasks.error && !tasks.data ? (
        <BoardError message={tasks.error.message} onRetry={tasks.reload} />
      ) : tasks.loading || !project ? (
        <BoardLoading />
      ) : view === "kanban" ? (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6" role="region" aria-label="Kanban board, scrolls horizontally" tabIndex={0}>
          <div className="flex w-max snap-x gap-3">
            {columns.map((status) => {
              const list = items.filter((t) => t.status === status)
              const def = TASK_STATUS[status]
              const needsYou = status === "founder_approval" && list.length > 0
              return (
                <section key={status} aria-label={`${def.label}, ${list.length} tasks`} className="flex w-[264px] shrink-0 snap-start flex-col gap-2">
                  <h2 className="flex h-8 items-center gap-1.5 px-1 text-xs font-medium">
                    <StatusIcon def={def} className={needsYou ? "text-task-founder-approval-foreground" : "text-muted-foreground"} />
                    {def.label}
                    <span className={cn("ml-auto font-mono tabular-nums", needsYou ? "text-task-founder-approval-foreground" : "text-muted-foreground")}>
                      {list.length}
                    </span>
                  </h2>
                  <div className="flex min-h-24 flex-col gap-2 rounded-lg bg-muted/60 p-2">
                    {list.length ? (
                      list.map((t) => (
                        <TaskCard key={t.id} task={t} all={items} note={blockedNote(t)} onOpen={() => setOpenId(t.id)} onPick={pick(t)} />
                      ))
                    ) : (
                      <p className="px-1 py-2 text-xs text-muted-foreground">Empty</p>
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-44">Status</TableHead>
                <TableHead className="w-44">Assignee</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items
                .filter((t) => showCancelled || t.status !== "cancelled")
                .map((t) => {
                  const a = t.assignee_id ? actor(t.assignee_id) : null
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-muted-foreground">{t.key}</TableCell>
                      <TableCell>
                        <button type="button" className="text-left font-medium hover:underline" onClick={() => setOpenId(t.id)}>
                          {t.title}
                        </button>
                      </TableCell>
                      <TableCell>
                        <StatusBadge def={TASK_STATUS[t.status]} />
                      </TableCell>
                      <TableCell>
                        {a ? (
                          <span className="flex items-center gap-2">
                            <ActorAvatar actor={a} size="sm" className="size-5" />
                            {a.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <TaskMenu task={t} all={items} onPick={pick(t)} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              {!items.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No tasks yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      )}

      <TaskSheet taskId={openId} all={items} onClose={() => setOpenId(null)} onChanged={refresh} onPick={(t, a) => pick(t)(a)} />
      <ReasonDialog pending={pending} onClose={() => setPending(null)} onSubmit={(text) => apply(pending!.task, pending!.action, text)} />
      {project ? (
        <CreateTaskDialog
          projectId={project.id}
          open={creating}
          onOpenChange={setCreating}
          onCreated={(t) => {
            setCreating(false)
            refresh()
            setOpenId(t.id)
          }}
        />
      ) : null}
    </div>
  )
}
