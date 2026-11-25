"use client"

import * as React from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ActorAvatar } from "@/components/orbit/actor-avatar"
import { useAllAssignments } from "@/components/orbit/agents"
import { useOrbit } from "@/components/orbit/orbit-context"
import { BoardError, BoardLoading, NoAgents } from "@/components/orbit/states"
import { AGENT_STATUS, StatusBadge } from "@/components/orbit/status"
import type { Agent } from "@/lib/api"
import { cn } from "@/lib/utils"

const W = 208
const H = 64
const GAP_X = 32
const GAP_Y = 76
const PAD = 24
const FOUNDER = 0 // node id for the Founder (agents use workforce ids > 0)

type Edge = { from: number; to: number; project?: string; offset?: number }

/** Tidy tree on fixed managers: leaves take the next slot, parents center over their children. */
export function layout(agents: Agent[]) {
  const children = new Map<number, Agent[]>()
  const ids = new Set(agents.map((a) => a.id))
  for (const a of agents) {
    const parent = a.fixed_supervisor_id && ids.has(a.fixed_supervisor_id) ? a.fixed_supervisor_id : FOUNDER
    children.set(parent, [...(children.get(parent) ?? []), a])
  }
  const pos = new Map<number, [number, number]>()
  let slot = 0
  let depthMax = 0
  const seen = new Set<number>()
  const place = (id: number, depth: number): number => {
    seen.add(id)
    depthMax = Math.max(depthMax, depth)
    const kids = (children.get(id) ?? []).filter((k) => !seen.has(k.id))
    const xs = kids.map((k) => place(k.id, depth + 1))
    const x = xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : PAD + W / 2 + slot++ * (W + GAP_X)
    pos.set(id, [x, PAD + depth * (H + GAP_Y)])
    return x
  }
  place(FOUNDER, 0)
  return { pos, width: PAD * 2 + Math.max(1, slot) * (W + GAP_X) - GAP_X, height: PAD * 2 + (depthMax + 1) * (H + GAP_Y) - GAP_Y }
}

function path(pos: Map<number, [number, number]>, e: Edge) {
  const [cx, cy] = pos.get(e.from)!
  const [px, py] = pos.get(e.to)!
  const y1 = py + H
  const x2 = cx + (e.offset ?? 0)
  if (cy > y1) {
    const mid = y1 + (cy - y1) / 2
    return { d: `M${px} ${y1} V${mid} H${x2} V${cy}`, label: [(px + x2) / 2, mid] as const }
  }
  // Manager on the same level or below: leave its top off-center and bend closer to the agent,
  // so the line doesn't run on top of the fixed-manager connectors.
  const mid = cy - GAP_Y / 4
  const sx = px + W / 4
  return { d: `M${sx} ${py} V${Math.min(mid, py)} H${x2} V${cy}`, label: [(sx + x2) / 2, mid] as const }
}

export function OrgChart() {
  const { agents, projects, me } = useOrbit()
  const assignments = useAllAssignments(projects)
  const [project, setProject] = React.useState<string>("all")
  const [selected, setSelected] = React.useState<Agent | null>(null)

  if (!agents || !projects || (!assignments.data && !assignments.error)) return <div className="p-4 md:p-6"><BoardLoading /></div>
  if (assignments.error) return <div className="p-4 md:p-6"><BoardError message={assignments.error} onRetry={assignments.reload} /></div>
  const live = agents.filter((a) => a.status !== "archived")
  if (!live.length) return <div className="p-4 md:p-6"><NoAgents /></div>

  const { pos, width, height } = layout(live)
  const liveIds = new Set(live.map((a) => a.id))
  const name = (id: number | null) => (id ? agents.find((a) => a.id === id)?.name ?? `#${id}` : "Founder")
  const edges: Edge[] = live.map((a) => ({ from: a.id, to: a.fixed_supervisor_id && liveIds.has(a.fixed_supervisor_id) ? a.fixed_supervisor_id : FOUNDER }))
  const perProject = (id: number) =>
    projects.flatMap((p) => (assignments.data?.[p.id] ?? []).filter((x) => x.agent_id === id && x.supervisor_id).map((x) => ({ p, sup: x.supervisor_id! })))
  for (const a of live) {
    perProject(a.id)
      .filter(({ sup }) => liveIds.has(sup))
      .forEach(({ p, sup }, i) => edges.push({ from: a.id, to: sup, project: p.key, offset: (i + 1) * 24 - W / 4 }))
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Highlight project</span>
          <Select value={project} onValueChange={(v) => setProject((v as string) ?? "all")}>
            <SelectTrigger size="sm" className="w-40" aria-label="Highlight project manager lines">
              <SelectValue>{(v: string) => (v === "all" ? "All projects" : projects.find((p) => p.key === v)?.name)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.key} value={p.key}>
                  {p.name} ({p.key})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <ul aria-label="Line legend" className="flex flex-wrap items-center gap-x-5 gap-y-1 text-muted-foreground">
          <li className="flex items-center gap-2">
            <svg width="28" height="2" aria-hidden="true">
              <line x1="0" y1="1" x2="28" y2="1" className="stroke-muted-foreground" strokeWidth="1.5" />
            </svg>
            Fixed manager
          </li>
          <li className="flex items-center gap-2">
            <svg width="28" height="2" aria-hidden="true">
              <line x1="0" y1="1" x2="28" y2="1" className="stroke-muted-foreground" strokeWidth="1.5" strokeDasharray="6 4" />
            </svg>
            Per-project manager (labeled)
          </li>
          <li>Square = agent, circle = human</li>
        </ul>
      </div>

      <div className="overflow-x-auto rounded-lg bg-muted/40 ring-1 ring-foreground/10" role="region" aria-label="Org chart, scrolls horizontally" tabIndex={0}>
        <div className="relative" style={{ width, height }}>
          <svg className="absolute inset-0" width={width} height={height} aria-hidden="true">
            {edges.map((e) => {
              const dim = project !== "all" && e.project !== project
              const hot = project !== "all" && e.project === project
              return (
                <path
                  key={`${e.from}-${e.to}-${e.project ?? "fixed"}`}
                  d={path(pos, e).d}
                  fill="none"
                  strokeDasharray={e.project ? "6 4" : undefined}
                  strokeWidth={hot ? 2 : 1.5}
                  className={cn(hot ? "stroke-primary" : "stroke-muted-foreground", dim && "opacity-30")}
                />
              )
            })}
          </svg>
          {edges
            .filter((e) => e.project)
            .map((e) => {
              const [x, y] = path(pos, e).label
              const dim = project !== "all" && e.project !== project
              return (
                <span
                  key={`l-${e.from}-${e.project}`}
                  className={cn("absolute -translate-x-1/2 -translate-y-1/2 rounded-md bg-card px-1.5 py-0.5 font-mono text-xs ring-1 ring-input", dim && "opacity-30")}
                  style={{ left: x, top: y }}
                >
                  {e.project}
                </span>
              )
            })}

          <div
            className="absolute flex items-center gap-2 rounded-lg bg-card p-2 ring-1 ring-foreground/10"
            style={{ left: pos.get(FOUNDER)![0] - W / 2, top: pos.get(FOUNDER)![1], width: W, height: H }}
          >
            <ActorAvatar actor={{ name: me?.name ?? "Founder", kind: "human" }} />
            <div className="min-w-0 text-xs">
              <p className="truncate font-medium">{me?.name ?? "Founder"}</p>
              <p className="text-muted-foreground">Founder, top of the structure</p>
            </div>
          </div>

          {live.map((a) => {
            const [x, y] = pos.get(a.id)!
            const matrix = perProject(a.id).length
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelected(a)}
                aria-label={`${a.name}${a.title ? `, ${a.title}` : ""}, status ${AGENT_STATUS[a.status].label}. Open details.`}
                className="absolute flex items-center gap-2 rounded-lg bg-card p-2 text-left ring-1 ring-foreground/10 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                style={{ left: x - W / 2, top: y, width: W, height: H }}
              >
                <ActorAvatar actor={{ name: a.name, kind: "agent" }} />
                <span className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
                  <span className="truncate font-medium">{a.name}</span>
                  <span className="flex items-center gap-1.5">
                    <StatusBadge def={AGENT_STATUS[a.status]} className="h-4 px-1" />
                    {matrix ? <span className="text-muted-foreground">{matrix + 1} managers</span> : null}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent>
          {selected ? (
            <>
              <SheetHeader className="border-b">
                <div className="flex items-center gap-3">
                  <ActorAvatar actor={{ name: selected.name, kind: "agent" }} size="lg" />
                  <div>
                    <SheetTitle className="text-base">{selected.name}</SheetTitle>
                    <SheetDescription>{selected.title}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-3 p-4 text-sm">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <StatusBadge def={AGENT_STATUS[selected.status]} />
                </dd>
                <dt className="text-muted-foreground">Fixed manager</dt>
                <dd>{name(selected.fixed_supervisor_id)}</dd>
                <dt className="text-muted-foreground">Per-project managers</dt>
                <dd>
                  {perProject(selected.id).length
                    ? perProject(selected.id).map(({ p, sup }) => (
                        <p key={p.id}>
                          <span className="font-mono text-xs text-muted-foreground">{p.key}</span> {name(sup)}
                        </p>
                      ))
                    : "None"}
                </dd>
                <dt className="text-muted-foreground">Model</dt>
                <dd>{selected.model ?? "Default"}</dd>
                <dt className="text-muted-foreground">Permissions</dt>
                <dd className="font-mono">{selected.tool_preset}</dd>
              </dl>
              <div className="px-4">
                <Button variant="outline" render={<Link href={`/agents/${selected.id}`} />}>
                  Edit agent
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
