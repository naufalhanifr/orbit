"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CircleCheck, Plus } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ActorAvatar } from "@/components/orbit/actor-avatar"
import { useOrbit } from "@/components/orbit/orbit-context"
import { BoardError, BoardLoading, NoAgents } from "@/components/orbit/states"
import { AGENT_STATUS, StatusBadge } from "@/components/orbit/status"
import {
  api,
  ApiError,
  formatTime,
  formatTokens,
  useApi,
  type Agent,
  type AgentStatus,
  type Assignment,
  type InstructionVersion,
  type Project,
  type ToolPreset,
} from "@/lib/api"

const DEFAULT_LIMIT = 300_000
// shortcut: model ids are free text on the backend; list the two the MVP uses until a model registry exists.
const MODELS = ["Claude Sonnet", "Claude Opus"]

/** Assignments for every project, keyed by project id. Org chart and agent list need all of them. */
export function useAllAssignments(projects: Project[] | undefined) {
  const [data, setData] = React.useState<Record<number, Assignment[]>>()
  const [error, setError] = React.useState<string | null>(null)
  const [tick, setTick] = React.useState(0)
  React.useEffect(() => {
    if (!projects) return
    let live = true
    Promise.all(projects.map((p) => api<Assignment[]>(`/projects/${p.id}/assignments`).then((a) => [p.id, a] as const))).then(
      (rows) => live && setData(Object.fromEntries(rows)),
      (e) => live && setError(e instanceof ApiError ? e.message : "Assignments couldn’t load.")
    )
    return () => {
      live = false
    }
  }, [projects, tick])
  return { data, error, reload: () => setTick((t) => t + 1) }
}

export function AgentList() {
  const { agents, projects } = useOrbit()
  const assignments = useAllAssignments(projects)
  const [showArchived, setShowArchived] = React.useState(false)
  if (!agents) return <div className="p-4 md:p-6"><BoardLoading /></div>
  const visible = agents.filter((a) => showArchived || a.status !== "archived")
  const name = (id: number | null) => (id ? agents.find((a) => a.id === id)?.name ?? `#${id}` : "Founder")
  const perProject = (a: Agent) =>
    (projects ?? [])
      .flatMap((p) => (assignments.data?.[p.id] ?? []).filter((x) => x.agent_id === a.id).map((x) => `${p.key} → ${x.supervisor_id ? name(x.supervisor_id) : "fixed"}`))
      .join(", ") || "None"

  if (!agents.length)
    return (
      <div className="p-4 md:p-6">
        <NoAgents />
      </div>
    )

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {visible.length} agents. Agents without an agent manager report directly to the Founder.
        </p>
        <Button variant="ghost" aria-pressed={showArchived} onClick={() => setShowArchived((v) => !v)}>
          {showArchived ? "Hide" : "Show"} archived
        </Button>
        <Button className="ml-auto" render={<Link href="/agents/new" />}>
          <Plus aria-hidden="true" />
          Create agent
        </Button>
      </div>
      {assignments.error ? <BoardError message={assignments.error} onRetry={assignments.reload} /> : null}
      <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fixed manager</TableHead>
              <TableHead>Projects and per-project managers</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="text-right">Instructions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Link href={`/agents/${a.id}`} className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <ActorAvatar actor={{ name: a.name, kind: "agent" }} size="sm" />
                    <span className="flex flex-col">
                      <span className="font-medium hover:underline">{a.name}</span>
                      <span className="text-muted-foreground">{a.title}</span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusBadge def={AGENT_STATUS[a.status]} />
                </TableCell>
                <TableCell>{name(a.fixed_supervisor_id)}</TableCell>
                <TableCell className="text-muted-foreground">{assignments.data ? perProject(a) : "…"}</TableCell>
                <TableCell>{a.model ?? "Default"}</TableCell>
                <TableCell className="font-mono">{a.tool_preset}</TableCell>
                <TableCell className="text-right font-mono">{a.instruction_version ? `v${a.instruction_version}` : "None"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// Per project: not assigned (undefined), assigned with fixed manager (null), or assigned with a per-project manager (id).
type ProjectPlan = Record<number, number | null | undefined>
const NOT_IN = "none"
const FIXED = "fixed"

export function AgentBuilder({ agentId }: { agentId?: number }) {
  const router = useRouter()
  const { agents, projects, reloadAgents, reloadAssignments } = useOrbit()
  const agent = agentId ? agents?.find((a) => a.id === agentId) : undefined
  const assignments = useAllAssignments(projects)
  const versions = useApi<InstructionVersion[]>(agentId ? `/agents/${agentId}/instructions` : null)

  if (agentId && (!agents || !assignments.data || versions.loading)) return <div className="p-4 md:p-6"><BoardLoading /></div>
  if (agentId && !agent)
    return (
      <div className="p-4 md:p-6">
        <BoardError message="This agent doesn’t exist in your organization." onRetry={reloadAgents} />
      </div>
    )
  if (!agentId && !assignments.data) return <div className="p-4 md:p-6"><BoardLoading /></div>

  const current: ProjectPlan = {}
  for (const p of projects ?? []) {
    const a = assignments.data?.[p.id]?.find((x) => x.agent_id === agentId)
    current[p.id] = a ? a.supervisor_id : undefined
  }
  const latest = versions.data?.at(-1)

  return (
    <BuilderForm
      key={agent?.id ?? "new"}
      agent={agent}
      agents={(agents ?? []).filter((a) => a.status !== "archived" && a.id !== agentId)}
      projects={projects ?? []}
      assignments={assignments.data ?? {}}
      currentPlan={current}
      latestInstructions={latest?.content ?? ""}
      versions={versions.data ?? []}
      onSaved={(id, created) => {
        reloadAgents()
        reloadAssignments()
        assignments.reload()
        versions.reload()
        if (created) router.push(`/agents/${id}?created=1`)
      }}
    />
  )
}

function BuilderForm({
  agent,
  agents,
  projects,
  assignments,
  currentPlan,
  latestInstructions,
  versions,
  onSaved,
}: {
  agent?: Agent
  agents: Agent[]
  projects: Project[]
  assignments: Record<number, Assignment[]>
  currentPlan: ProjectPlan
  latestInstructions: string
  versions: InstructionVersion[]
  onSaved: (id: number, created: boolean) => void
}) {
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  // BuilderForm renders only after client-side fetches, so reading the URL here is safe.
  const [saved, setSaved] = React.useState<string | null>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("created")
      ? "Agent saved as Draft. It becomes Ready automatically when its first task moves to Assigned."
      : null
  )
  const [instructions, setInstructions] = React.useState(latestInstructions)
  const [manager, setManager] = React.useState<number | null>(agent?.fixed_supervisor_id ?? null)
  const [model, setModel] = React.useState<string | null>(agent?.model ?? MODELS[0])
  const [preset, setPreset] = React.useState<ToolPreset>(agent?.tool_preset ?? "read-only")
  const [plan, setPlan] = React.useState<ProjectPlan>(currentPlan)
  const [busy, setBusy] = React.useState(false)

  const managerName = (id: number | null) => (id ? agents.find((m) => m.id === id)?.name ?? `#${id}` : "Founder (direct)")

  const save = async (f: FormData) => {
    const next: Record<string, string> = {}
    const name = String(f.get("name") ?? "").trim()
    const title = String(f.get("title") ?? "").trim()
    if (!name) next.name = "Enter a name."
    if (!instructions.trim()) next.instructions = "Enter instructions. The agent works only from these."
    const limit = Number(String(f.get("limit") ?? "").replace(/\D/g, ""))
    if (!limit) next.limit = "Enter a whole number of tokens greater than 0."
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    const done: string[] = []
    try {
      let id = agent?.id
      if (!agent) {
        const a = await api<Agent>("/agents", {
          body: { name, title: title || null, fixed_supervisor_id: manager, model, tool_preset: preset, token_limit_per_execution: limit, instructions },
        })
        id = a.id
        done.push("Agent created, instructions v1")
      } else {
        await api<Agent>(`/agents/${agent.id}`, {
          method: "PATCH",
          body: { name, title: title || null, model, tool_preset: preset, token_limit_per_execution: limit },
        })
        if (manager !== agent.fixed_supervisor_id) await api(`/agents/${agent.id}/supervisor`, { method: "PUT", body: { supervisor_id: manager } })
        if (instructions !== latestInstructions) {
          const v = await api<InstructionVersion>(`/agents/${agent.id}/instructions`, { body: { content: instructions } })
          done.push(`instructions v${v.version}`)
        }
        done.unshift("Agent saved")
      }
      // Sync project membership and per-project managers.
      for (const p of projects) {
        const want = plan[p.id]
        const had = currentPlan[p.id]
        const existing = assignments[p.id]?.find((x) => x.agent_id === id)
        if (want === had) continue
        if (want === undefined && existing) await api(`/projects/${p.id}/assignments/${existing.id}`, { method: "DELETE" })
        else if (existing) await api(`/projects/${p.id}/assignments/${existing.id}/supervisor`, { method: "PUT", body: { supervisor_id: want } })
        else await api(`/projects/${p.id}/assignments`, { body: { agent_id: id, supervisor_id: want } })
        done.push(`${p.key} updated`)
      }
      setSaved(`${done.join(", ")}.`)
      onSaved(id!, !agent)
    } catch (e) {
      // Partial saves are possible (agent created, assignment refused); show what went through.
      setErrors({ server: `${done.length ? `${done.join(", ")}. Then: ` : ""}${e instanceof ApiError ? e.message : "Save failed."}` })
      if (done.length) onSaved(agent?.id ?? 0, false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      noValidate
      className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4 md:p-6"
      onSubmit={(e) => {
        e.preventDefault()
        save(new FormData(e.currentTarget))
      }}
    >
      {agent ? (
        <div className="flex flex-wrap items-center gap-3">
          <ActorAvatar actor={{ name: agent.name, kind: "agent" }} size="lg" />
          <StatusBadge def={AGENT_STATUS[agent.status]} />
          <StatusControl agent={agent} onChanged={() => onSaved(agent.id, false)} />
        </div>
      ) : null}
      {saved ? (
        <Alert>
          <CircleCheck aria-hidden="true" />
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{saved}</AlertDescription>
        </Alert>
      ) : null}
      {errors.server ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Not everything was saved</AlertTitle>
          <AlertDescription>{errors.server}</AlertDescription>
        </Alert>
      ) : null}

      <FieldSet>
        <FieldLegend>Identity</FieldLegend>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field data-invalid={!!errors.name || undefined}>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" name="name" defaultValue={agent?.name} aria-invalid={!!errors.name || undefined} />
            {errors.name ? <FieldError>{errors.name}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input id="title" name="title" defaultValue={agent?.title ?? ""} />
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Structure</FieldLegend>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="manager">Fixed manager</FieldLabel>
            <Select value={manager} onValueChange={(v) => setManager((v as number | null) ?? null)}>
              <SelectTrigger id="manager" className="w-full">
                <SelectValue>{(v: number | null) => managerName(v)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Founder (direct)</SelectItem>
                {agents.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                    {m.title ? `, ${m.title}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>Choose Founder if the agent reports directly to the Founder.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Projects and per-project managers</FieldLabel>
            {projects.length ? (
              <div className="flex flex-col gap-2">
                {projects.map((p) => {
                  const v = plan[p.id]
                  const value = v === undefined ? NOT_IN : v === null ? FIXED : String(v)
                  return (
                    <div key={p.id} className="flex items-center gap-2">
                      <Label htmlFor={`pm-${p.id}`} className="w-20 shrink-0 font-mono text-muted-foreground">
                        {p.key}
                      </Label>
                      <Select
                        value={value}
                        onValueChange={(nv) =>
                          setPlan((pl) => ({ ...pl, [p.id]: nv === NOT_IN ? undefined : nv === FIXED ? null : Number(nv) }))
                        }
                      >
                        <SelectTrigger id={`pm-${p.id}`} className="w-full">
                          <SelectValue>
                            {(s: string) => (s === NOT_IN ? "Not in project" : s === FIXED ? "In project, fixed manager" : `In project, reports to ${managerName(Number(s))}`)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NOT_IN}>Not in project</SelectItem>
                          <SelectItem value={FIXED}>In project, fixed manager</SelectItem>
                          {agents.map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              In project, reports to {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No projects yet. Create one from the sidebar.</p>
            )}
            <FieldDescription>Agents can only take tasks in projects they belong to. A per-project manager receives work reports for that project.</FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Runtime</FieldLegend>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="model">Model</FieldLabel>
            <Select value={model} onValueChange={(v) => setModel(v as string | null)}>
              <SelectTrigger id="model" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...new Set([...MODELS, ...(agent?.model ? [agent.model] : [])])].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field data-invalid={!!errors.limit || undefined}>
            <FieldLabel htmlFor="limit">Token limit per execution</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="limit"
                name="limit"
                inputMode="numeric"
                defaultValue={formatTokens(agent?.token_limit_per_execution ?? DEFAULT_LIMIT)}
                className="font-mono tabular-nums"
                aria-invalid={!!errors.limit || undefined}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>tokens</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            {errors.limit ? (
              <FieldError>{errors.limit}</FieldError>
            ) : (
              <FieldDescription>Default 300,000. The execution stops automatically when it reaches this limit.</FieldDescription>
            )}
          </Field>
        </FieldGroup>
        <Field>
          <FieldLabel id="preset-label">Tool permission preset</FieldLabel>
          <RadioGroup value={preset} onValueChange={(v) => setPreset(v as ToolPreset)} aria-labelledby="preset-label" className="grid gap-2 md:grid-cols-2">
            {[
              { v: "read-only", d: "Reads the repo and documents. Cannot change code." },
              { v: "coding", d: "Changes code, runs tests and opens PRs in the project repo." },
            ].map((o) => (
              <Label key={o.v} htmlFor={`preset-${o.v}`} className="flex items-start gap-3 rounded-lg p-3 ring-1 ring-input has-data-checked:ring-2 has-data-checked:ring-ring">
                <RadioGroupItem id={`preset-${o.v}`} value={o.v} className="mt-0.5" />
                <span className="flex flex-col gap-1">
                  <span className="font-mono font-medium">{o.v}</span>
                  <span className="font-normal text-muted-foreground">{o.d}</span>
                </span>
              </Label>
            ))}
          </RadioGroup>
        </Field>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Instructions{versions.length ? ` (current v${versions.at(-1)!.version})` : ""}</FieldLegend>
        <Field data-invalid={!!errors.instructions || undefined}>
          <Tabs defaultValue="write">
            <TabsList>
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              {versions.length ? <TabsTrigger value="history">History ({versions.length})</TabsTrigger> : null}
            </TabsList>
            <TabsContent value="write">
              <Textarea
                id="instructions"
                aria-label="Agent instructions in markdown"
                aria-invalid={!!errors.instructions || undefined}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={10}
                className="font-mono"
                placeholder={"# Role\nDescribe responsibilities, limits and the definition of done."}
              />
            </TabsContent>
            <TabsContent value="preview">
              <div className="min-h-40 rounded-md p-3 text-sm whitespace-pre-wrap ring-1 ring-input">
                {instructions || <span className="text-muted-foreground">No instructions yet.</span>}
              </div>
            </TabsContent>
            <TabsContent value="history">
              <ol className="flex flex-col gap-3">
                {[...versions].reverse().map((v) => (
                  <li key={v.id} className="flex flex-col gap-1">
                    <p className="flex gap-2 text-xs">
                      <span className="font-mono font-medium">v{v.version}</span>
                      <span className="font-mono text-muted-foreground">{formatTime(v.created_at)}</span>
                    </p>
                    <pre className="max-h-40 overflow-auto rounded-md bg-muted p-2 font-mono text-xs whitespace-pre-wrap">{v.content}</pre>
                  </li>
                ))}
              </ol>
            </TabsContent>
          </Tabs>
          {errors.instructions ? (
            <FieldError>{errors.instructions}</FieldError>
          ) : (
            <FieldDescription>Every save that changes the instructions creates a new version. Every execution records the version it used.</FieldDescription>
          )}
        </Field>
      </FieldSet>

      <div className="flex items-center gap-2 border-t pt-4">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save agent"}
        </Button>
        <Button variant="ghost" render={<Link href="/agents" />}>
          Back to agents
        </Button>
      </div>
    </form>
  )
}

/** Pause, resume or archive. Draft/Configuring → Ready happens automatically on assignment. */
function StatusControl({ agent, onChanged }: { agent: Agent; onChanged: () => void }) {
  const [error, setError] = React.useState<string | null>(null)
  const run = async (p: Promise<unknown>) => {
    try {
      await p
      setError(null)
      onChanged()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Status not changed.")
    }
  }
  const set = (status: AgentStatus) => run(api(`/agents/${agent.id}`, { method: "PATCH", body: { status } }))
  if (agent.status === "archived") return null
  return (
    <div className="ml-auto flex flex-wrap items-center gap-2">
      {agent.status === "paused" ? (
        <Button type="button" size="sm" variant="outline" onClick={() => set("ready")}>
          Resume agent
        </Button>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => set("paused")}>
          Pause agent
        </Button>
      )}
      <Button type="button" size="sm" variant="ghost" onClick={() =>
          window.confirm(`Archive ${agent.name}? Archived agents can’t be restored or assigned again.`) &&
          run(api(`/agents/${agent.id}/archive`, { method: "POST" }))
        }>
        Archive
      </Button>
      {error ? (
        <p role="alert" className="w-full text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
