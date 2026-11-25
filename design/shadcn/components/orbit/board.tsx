"use client"

import * as React from "react"
import Link from "next/link"
import { GitPullRequest, Link2, MessageCircleQuestion, MoreHorizontal, Plus } from "lucide-react"

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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ActorAvatar } from "@/components/orbit/actor-avatar"
import { ExecutionCard } from "@/components/orbit/execution-card"
import { StatusBadge, StatusIcon, TASK_STATUS } from "@/components/orbit/status"
import { actorById, byId, formatTokens, tasks as seed, type Task, type TaskStatus } from "@/lib/orbit-data"
import { cn } from "@/lib/utils"

const COLUMNS: TaskStatus[] = ["backlog", "assigned", "in-progress", "founder-approval", "revision", "blocked", "done"]

type Action = { label: string; to: TaskStatus | "restore"; reason?: "alasan" | "feedback" }

/** Aksi Founder per status, sesuai PRD 15.1 (MVP). Transisi milik assignee/system tidak ditawarkan. */
function founderActions(t: Task, all: Task[]): Action[] {
  const end = t.status === "done" || t.status === "cancelled"
  const a: Action[] = []
  if (t.status === "founder-approval") {
    a.push({ label: "Setujui, tandai Done", to: "done" }, { label: "Minta revisi", to: "revision", reason: "feedback" })
  }
  if (t.status === "backlog" && readiness(t, all).ok) a.push({ label: "Pindah ke Assigned", to: "assigned" })
  if (t.status === "blocked") a.push({ label: "Buka blokir", to: "restore" })
  if (!end && t.status !== "blocked") a.push({ label: "Tandai Blocked", to: "blocked", reason: "alasan" })
  if (!end) a.push({ label: "Batalkan task", to: "cancelled", reason: "alasan" })
  return a
}

function readiness(t: Task, all: Task[]) {
  const waitingOn = (t.dependsOn ?? []).filter((id) => byId(all, id)?.status !== "done")
  if (!t.criteria.length) return { ok: false, why: "Tambahkan acceptance criteria dulu." }
  if (!t.assigneeId) return { ok: false, why: "Pilih assignee dulu." }
  if (waitingOn.length) return { ok: false, why: `Maju otomatis setelah ${waitingOn.join(", ")} Done.` }
  return { ok: true, why: "" }
}

function useBoard() {
  const [items, setItems] = React.useState<Task[]>(seed)
  const apply = (id: string, action: Action, text?: string) =>
    setItems((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        if (action.to === "restore") return { ...t, status: t.previousStatus ?? "assigned", previousStatus: undefined, note: undefined }
        return {
          ...t,
          previousStatus: action.to === "blocked" ? t.status : t.previousStatus,
          status: action.to,
          note: text ? (action.reason === "feedback" ? `Feedback: ${text}` : text) : action.to === "done" ? undefined : t.note,
        }
      })
    )
  return { items, setItems, apply }
}

function ReasonDialog({
  pending,
  onClose,
  onSubmit,
}: {
  pending: { task: Task; action: Action } | null
  onClose: () => void
  onSubmit: (text: string) => void
}) {
  const [text, setText] = React.useState("")
  const [error, setError] = React.useState(false)
  const feedback = pending?.action.reason === "feedback"
  return (
    <Dialog
      open={!!pending}
      onOpenChange={(o) => {
        if (!o) {
          setText("")
          setError(false)
          onClose()
        }
      }}
    >
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!text.trim()) return setError(true)
            onSubmit(text.trim())
            setText("")
            setError(false)
          }}
        >
          <DialogHeader>
            <DialogTitle>{pending?.action.label} {pending?.task.id}</DialogTitle>
            <DialogDescription>
              {feedback ? "Feedback dikirim ke agent sebagai dasar revisi dan dihitung sebagai satu siklus revisi." : "Alasan wajib diisi dan tersimpan di riwayat task."}
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={error || undefined}>
            <FieldLabel htmlFor="reason">{feedback ? "Feedback revisi" : "Alasan"}</FieldLabel>
            <Textarea id="reason" value={text} onChange={(e) => setText(e.target.value)} aria-invalid={error || undefined} rows={4} />
            {error ? <FieldError>{feedback ? "Tulis feedback yang bisa dikerjakan agent." : "Alasan wajib diisi."}</FieldError> : null}
          </Field>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Batal</DialogClose>
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
        render={<Button variant="ghost" size="icon-sm" className="relative z-10 -mr-1" aria-label={`Aksi untuk ${task.id}`} />}
      >
        <MoreHorizontal aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{task.id}</DropdownMenuLabel>
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

function TaskCard({ task, all, onOpen, onPick }: { task: Task; all: Task[]; onOpen: () => void; onPick: (a: Action) => void }) {
  const assignee = actorById(task.assigneeId)
  const ready = readiness(task, all)
  const def = TASK_STATUS[task.status]
  const noteTone =
    task.status === "blocked" ? "text-task-blocked-foreground" : task.status === "revision" ? "text-foreground" : "text-muted-foreground"
  return (
    <article className="relative flex flex-col gap-2 bg-card p-3 ring-1 ring-foreground/10 transition-colors has-[button[data-open]]:ring-ring hover:bg-muted/50">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{task.id}</span>
        {task.fromChat ? <span className="text-xs text-muted-foreground">dari chat</span> : null}
        <span className="ml-auto" />
        <TaskMenu task={task} all={all} onPick={onPick} />
      </div>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "text-left text-sm leading-snug font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-1 focus-visible:after:ring-ring",
          task.status === "cancelled" && "text-muted-foreground line-through"
        )}
      >
        {task.title}
      </button>
      {task.note ? (
        <p className={cn("flex items-start gap-1 text-xs", noteTone)}>
          {task.status === "blocked" ? <StatusIcon def={def} className="mt-px" /> : null}
          {task.note}
        </p>
      ) : null}
      {task.status === "backlog" && !ready.ok && task.criteria.length ? (
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
          <span>Belum ada assignee</span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-2 font-mono whitespace-nowrap tabular-nums">
          {task.pr ? (
            <span className="flex items-center gap-0.5">
              <GitPullRequest aria-hidden="true" className="size-3" />#{task.pr}
            </span>
          ) : null}
          {task.tokens ? <span>{Math.round(task.tokens / 1000)}k tok</span> : null}
        </span>
      </div>
    </article>
  )
}

function TaskSheet({ task, all, onClose, onPick }: { task: Task | null; all: Task[]; onClose: () => void; onPick: (a: Action) => void }) {
  const assignee = actorById(task?.assigneeId)
  const actions = task ? founderActions(task, all) : []
  const primary = actions.find((a) => a.to === "done" || a.to === "assigned" || a.to === "restore")
  const secondary = actions.filter((a) => a !== primary)
  const ready = task ? readiness(task, all) : null
  return (
    <Sheet open={!!task} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-xl data-[side=right]:sm:max-w-xl">
        {task ? (
          <>
            <SheetHeader className="gap-2 border-b">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{task.id}</span>
                <StatusBadge def={TASK_STATUS[task.status]} progress={task.tokens ? task.tokens / 300000 : undefined} />
              </div>
              <SheetTitle className="text-base">{task.title}</SheetTitle>
              <SheetDescription>
                {assignee ? `Dikerjakan ${assignee.name}` : "Belum ada assignee"}
                {task.pr ? ` · PR #${task.pr}` : ""}
                {task.tokens ? ` · ${formatTokens(task.tokens)} token` : ""}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 text-sm">
              {task.note ? (
                <p className={cn("text-sm", task.status === "blocked" && "text-task-blocked-foreground")}>{task.note}</p>
              ) : null}
              {task.status === "in-progress" ? <ExecutionCard /> : null}
              <section aria-labelledby="ac" className="flex flex-col gap-2">
                <h2 id="ac" className="text-sm font-medium">Acceptance criteria</h2>
                {task.criteria.length ? (
                  <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
                    {task.criteria.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-muted-foreground">Belum ada. Task tidak bisa masuk Assigned tanpa acceptance criteria.</p>
                )}
              </section>
              {task.dependsOn?.length ? (
                <section aria-labelledby="dep" className="flex flex-col gap-2">
                  <h2 id="dep" className="text-sm font-medium">Bergantung pada</h2>
                  {task.dependsOn.map((id) => {
                    const d = byId(all, id)
                    return d ? (
                      <div key={id} className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-xs text-muted-foreground">{d.id}</span>
                        <span className="min-w-0 flex-1 truncate">{d.title}</span>
                        <StatusBadge def={TASK_STATUS[d.status]} />
                      </div>
                    ) : null
                  })}
                  <p className="text-xs text-muted-foreground">Task ini pindah ke Assigned otomatis saat semua dependency Done.</p>
                </section>
              ) : null}
            </div>
            {actions.length ? (
              <div className="flex flex-wrap items-center gap-2 border-t p-4">
                {primary ? <Button onClick={() => onPick(primary)}>{primary.label}</Button> : null}
                {secondary.map((a) => (
                  <Button key={a.label} variant={a.to === "cancelled" ? "ghost" : "outline"} onClick={() => onPick(a)}>
                    {a.label}
                  </Button>
                ))}
                {task.status === "backlog" && ready && !ready.ok ? <p className="w-full text-xs text-muted-foreground">{ready.why}</p> : null}
              </div>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function CreateTaskDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (o: boolean) => void; onCreate: (title: string, criteria: string[]) => void }) {
  const [error, setError] = React.useState(false)
  return (
    <Dialog open={open} onOpenChange={(o) => (setError(false), onOpenChange(o))}>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            const title = String(f.get("title") ?? "").trim()
            if (!title) return setError(true)
            const criteria = String(f.get("criteria") ?? "").split("\n").map((s) => s.trim()).filter(Boolean)
            onCreate(title, criteria)
          }}
        >
          <DialogHeader>
            <DialogTitle>Buat task</DialogTitle>
            <DialogDescription>Task baru masuk Backlog. Agent hanya bisa mengerjakan task yang punya acceptance criteria.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={error || undefined}>
              <FieldLabel htmlFor="title">Judul</FieldLabel>
              <Input id="title" name="title" aria-invalid={error || undefined} />
              {error ? <FieldError>Judul wajib diisi.</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="criteria">Acceptance criteria</FieldLabel>
              <Textarea id="criteria" name="criteria" rows={4} />
              <FieldDescription>Satu kriteria per baris. Bisa dilengkapi nanti.</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Batal</DialogClose>
            <Button type="submit">Buat task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function Board() {
  const { items, setItems, apply } = useBoard()
  const [view, setView] = React.useState<string>("kanban")
  const [showCancelled, setShowCancelled] = React.useState(false)
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState<{ task: Task; action: Action } | null>(null)
  const [creating, setCreating] = React.useState(false)
  const openTask = items.find((t) => t.id === openId) ?? null
  const columns = showCancelled ? [...COLUMNS, "cancelled" as TaskStatus] : COLUMNS
  const pick = (task: Task) => (a: Action) => (a.reason ? setPending({ task, action: a }) : apply(task.id, a))
  const approvals = items.filter((t) => t.status === "founder-approval")
  const cancelledCount = items.filter((t) => t.status === "cancelled").length

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {approvals.length ? (
        <section aria-labelledby="needs-you" className="flex flex-col gap-2 bg-task-founder-approval-subtle p-3 text-task-founder-approval-foreground sm:flex-row sm:items-center sm:gap-4">
          <h2 id="needs-you" className="text-sm font-medium">Menunggu keputusanmu</h2>
          <ul className="flex flex-1 flex-col gap-1 text-sm text-foreground sm:flex-row sm:gap-4">
            {approvals.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <GitPullRequest aria-hidden="true" className="size-3.5" />
                <span>
                  <span className="font-mono text-xs">{t.id}</span> PR #{t.pr} siap di-review
                </span>
                <Button size="sm" variant="outline" onClick={() => setOpenId(t.id)}>
                  Review {t.id}
                </Button>
              </li>
            ))}
            <li className="flex items-center gap-2">
              <MessageCircleQuestion aria-hidden="true" className="size-3.5" />
              <span>Shared Specialist bertanya di ORB-14</span>
              <Button size="sm" variant="outline" render={<Link href="/chat" />}>
                Jawab di chat
              </Button>
            </li>
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup value={[view]} onValueChange={(v) => v[0] && setView(v[0])} variant="outline" aria-label="Tampilan">
          <ToggleGroupItem value="kanban">Kanban</ToggleGroupItem>
          <ToggleGroupItem value="list">List</ToggleGroupItem>
        </ToggleGroup>
        <Button variant="ghost" aria-pressed={showCancelled} onClick={() => setShowCancelled((v) => !v)}>
          {showCancelled ? "Sembunyikan" : "Tampilkan"} Cancelled ({cancelledCount})
        </Button>
        <Button className="ml-auto" onClick={() => setCreating(true)}>
          <Plus aria-hidden="true" />
          Buat task
        </Button>
      </div>

      {view === "kanban" ? (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6" role="region" aria-label="Kanban, geser horizontal" tabIndex={0}>
          <div className="flex w-max snap-x gap-3">
            {columns.map((status) => {
              const list = items.filter((t) => t.status === status)
              const def = TASK_STATUS[status]
              const needsYou = status === "founder-approval" && list.length > 0
              return (
                <section key={status} aria-label={`${def.label}, ${list.length} task`} className="flex w-[264px] shrink-0 snap-start flex-col gap-2">
                  <h2 className="flex h-8 items-center gap-1.5 px-1 text-xs font-medium">
                    <StatusIcon def={def} className={needsYou ? "text-task-founder-approval-foreground" : "text-muted-foreground"} />
                    {def.label}
                    <span className={cn("ml-auto font-mono tabular-nums", needsYou ? "text-task-founder-approval-foreground" : "text-muted-foreground")}>
                      {list.length}
                    </span>
                  </h2>
                  <div className="flex min-h-24 flex-col gap-2 bg-muted/60 p-2">
                    {list.length ? (
                      list.map((t) => <TaskCard key={t.id} task={t} all={items} onOpen={() => setOpenId(t.id)} onPick={pick(t)} />)
                    ) : (
                      <p className="px-1 py-2 text-xs text-muted-foreground">Kosong</p>
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">ID</TableHead>
                <TableHead>Judul</TableHead>
                <TableHead className="w-44">Status</TableHead>
                <TableHead className="w-44">Assignee</TableHead>
                <TableHead className="w-24 text-right">Token</TableHead>
                <TableHead className="w-12"><span className="sr-only">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items
                .filter((t) => showCancelled || t.status !== "cancelled")
                .map((t) => {
                  const a = actorById(t.assigneeId)
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-muted-foreground">{t.id}</TableCell>
                      <TableCell>
                        <button type="button" className="text-left font-medium hover:underline" onClick={() => setOpenId(t.id)}>
                          {t.title}
                        </button>
                      </TableCell>
                      <TableCell><StatusBadge def={TASK_STATUS[t.status]} /></TableCell>
                      <TableCell>
                        {a ? (
                          <span className="flex items-center gap-2"><ActorAvatar actor={a} size="sm" className="size-5" />{a.name}</span>
                        ) : (
                          <span className="text-muted-foreground">Belum ada</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{t.tokens ? formatTokens(t.tokens) : ""}</TableCell>
                      <TableCell><TaskMenu task={t} all={items} onPick={pick(t)} /></TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </div>
      )}

      <TaskSheet task={openTask} all={items} onClose={() => setOpenId(null)} onPick={(a) => openTask && pick(openTask)(a)} />
      <ReasonDialog
        pending={pending}
        onClose={() => setPending(null)}
        onSubmit={(text) => {
          if (pending) apply(pending.task.id, pending.action, text)
          setPending(null)
        }}
      />
      <CreateTaskDialog
        open={creating}
        onOpenChange={setCreating}
        onCreate={(title, criteria) => {
          const n = Math.max(...items.map((t) => Number(t.id.split("-")[1]))) + 1
          setItems((prev) => [{ id: `ORB-${n}`, title, status: "backlog", criteria, note: criteria.length ? undefined : "Belum ada acceptance criteria" }, ...prev])
          setCreating(false)
        }}
      />
    </div>
  )
}
