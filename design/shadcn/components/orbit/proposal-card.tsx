"use client"

import * as React from "react"
import { Check, Pencil, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ActorAvatar } from "@/components/orbit/actor-avatar"
import { actorById, agents, type ProposedTask } from "@/lib/orbit-data"
import { cn } from "@/lib/utils"

type State = { status: "pending" } | { status: "approved"; id: string } | { status: "rejected" }

/**
 * PO task breakdown proposal (PRD 17.10). Approve, edit or reject per task or all at once.
 * Only approved tasks are created; proposals never show on the board.
 */
export function ProposalCard({
  proposal,
  project,
  po,
  firstId,
}: {
  proposal: ProposedTask[]
  project: string
  po: string // id of the PO agent that proposed it
  firstId: number // next free task number in the project
}) {
  const [items, setItems] = React.useState(proposal)
  const [state, setState] = React.useState<Record<number, State>>(() => Object.fromEntries(proposal.map((t) => [t.key, { status: "pending" }])))
  const [editing, setEditing] = React.useState<number | null>(null)
  const next = React.useRef(firstId)

  // A PO may only propose agents that work in this project and report to this PO for it (PRD 17.10).
  const eligible = agents.filter(
    (a) => (a.worksIn === "all" || a.worksIn.includes(project)) && (a.projectManagers?.[project] ?? a.managerId) === po
  )
  const blockedBy = (t: ProposedTask) => t.dependsOn.filter((k) => state[k]?.status === "rejected")
  const depLabel = (k: number) => {
    const s = state[k]
    return s?.status === "approved" ? s.id : `task ${k}`
  }
  const approve = (keys: number[]) =>
    setState((prev) => {
      const out = { ...prev }
      for (const k of keys) out[k] = { status: "approved", id: `${project}-${next.current++}` }
      return out
    })
  const pending = items.filter((t) => state[t.key].status === "pending")
  const approvable = pending.filter((t) => !blockedBy(t).length)

  return (
    <section aria-label={`Proposed breakdown, ${items.length} tasks`} className="flex flex-col gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium">Proposed breakdown</h3>
        <span className="text-xs text-muted-foreground">
          {items.length} tasks in {project}. Nothing is created until you approve.
        </span>
        {pending.length ? (
          <span className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setState((p) => ({ ...p, ...Object.fromEntries(pending.map((t) => [t.key, { status: "rejected" }])) }))}>
              Reject all
            </Button>
            <Button size="sm" disabled={!approvable.length} onClick={() => approve(approvable.map((t) => t.key))}>
              Approve all ({approvable.length})
            </Button>
          </span>
        ) : null}
      </header>
      <ol className="flex flex-col divide-y">
        {items.map((t) => {
          const s = state[t.key]
          const assignee = actorById(t.assigneeId)
          const blocked = blockedBy(t)
          if (editing === t.key) {
            return (
              <li key={t.key} className="py-3">
                <EditForm
                  task={t}
                  eligible={eligible}
                  onCancel={() => setEditing(null)}
                  onSave={(u) => {
                    setItems((all) => all.map((x) => (x.key === t.key ? u : x)))
                    setEditing(null)
                  }}
                />
              </li>
            )
          }
          return (
            <li key={t.key} className="flex flex-col gap-2 py-3">
              <div className="flex flex-wrap items-start gap-2">
                <span className="font-mono text-xs text-muted-foreground">{t.key}</span>
                <p className={cn("min-w-0 flex-1 text-sm font-medium", s.status === "rejected" && "text-muted-foreground line-through")}>{t.title}</p>
                {s.status === "pending" ? (
                  <span className="flex gap-1">
                    <Button size="sm" variant="ghost" aria-label={`Reject task ${t.key}`} onClick={() => setState((p) => ({ ...p, [t.key]: { status: "rejected" } }))}>
                      <X aria-hidden="true" />
                      Reject
                    </Button>
                    <Button size="sm" variant="outline" aria-label={`Edit task ${t.key}`} onClick={() => setEditing(t.key)}>
                      <Pencil aria-hidden="true" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" aria-label={`Approve task ${t.key}`} disabled={!!blocked.length} onClick={() => approve([t.key])}>
                      <Check aria-hidden="true" />
                      Approve
                    </Button>
                  </span>
                ) : (
                  <span role="status" className={cn("text-xs", s.status === "approved" ? "text-task-done-foreground" : "text-muted-foreground")}>
                    {s.status === "approved" ? `Created as ${s.id} in Backlog` : "Rejected"}
                  </span>
                )}
              </div>
              {s.status !== "rejected" ? (
                <div className="flex flex-col gap-1.5 pl-5 text-xs">
                  <p className="text-muted-foreground">{t.description}</p>
                  <ul className="list-disc pl-4">
                    {t.criteria.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      {assignee ? <ActorAvatar actor={assignee} size="sm" className="size-5" /> : null}
                      {assignee ? assignee.name : "No assignee proposed"}
                    </span>
                    <span>{t.dependsOn.length ? `Depends on ${t.dependsOn.map(depLabel).join(", ")}` : "No dependencies"}</span>
                  </p>
                  {blocked.length && s.status === "pending" ? (
                    <p className="text-task-blocked-foreground">Depends on rejected task {blocked.join(", ")}. Edit or reject this task.</p>
                  ) : null}
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function EditForm({
  task,
  eligible,
  onSave,
  onCancel,
}: {
  task: ProposedTask
  eligible: typeof agents
  onSave: (t: ProposedTask) => void
  onCancel: () => void
}) {
  const [assignee, setAssignee] = React.useState<string | null>(task.assigneeId ?? null)
  const [error, setError] = React.useState(false)
  return (
    <form
      className="flex flex-col gap-3"
      aria-label={`Edit task ${task.key}`}
      onSubmit={(e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        const title = String(f.get("title") ?? "").trim()
        if (!title) return setError(true)
        const criteria = String(f.get("criteria") ?? "").split("\n").map((c) => c.trim()).filter(Boolean)
        onSave({ ...task, title, criteria, assigneeId: assignee ?? undefined })
      }}
    >
      <Field data-invalid={error || undefined}>
        <FieldLabel htmlFor={`p-title-${task.key}`}>Title</FieldLabel>
        <Input id={`p-title-${task.key}`} name="title" defaultValue={task.title} aria-invalid={error || undefined} />
        {error ? <FieldError>Enter a title.</FieldError> : null}
      </Field>
      <Field>
        <FieldLabel htmlFor={`p-ac-${task.key}`}>Acceptance criteria, one per line</FieldLabel>
        <Textarea id={`p-ac-${task.key}`} name="criteria" rows={3} defaultValue={task.criteria.join("\n")} />
      </Field>
      <Field>
        <FieldLabel htmlFor={`p-assignee-${task.key}`}>Assignee</FieldLabel>
        <Select value={assignee} onValueChange={(v) => setAssignee(v as string | null)}>
          <SelectTrigger id={`p-assignee-${task.key}`} className="w-full sm:w-64">
            <SelectValue>{(v: string | null) => (v ? actorById(v)?.name : "No assignee")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>No assignee</SelectItem>
            {eligible.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="flex gap-2">
        <Button type="submit" size="sm">Save changes</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}
