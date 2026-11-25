"use client"

import * as React from "react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ActorAvatar } from "@/components/orbit/actor-avatar"
import { AGENT_STATUS, StatusBadge } from "@/components/orbit/status"
import { actorById, agents, byId, founder, projects, type Agent } from "@/lib/orbit-data"
import { cn } from "@/lib/utils"

const W = 208
const H = 64
// Posisi tengah-atas tiap node. Tata letak tetap untuk contoh; implementasi nyata memakai layout otomatis.
const POS: Record<string, [number, number]> = {
  founder: [520, 24],
  cto: [340, 164],
  cmo: [700, 164],
  po1: [196, 304],
  po2: [484, 304],
  spec: [340, 444],
}

type Edge = { from: string; to: string; project?: string; fromX?: number; toX?: number }
const EDGES: Edge[] = [
  { from: "cto", to: "founder" },
  { from: "cmo", to: "founder" },
  { from: "po1", to: "cto" },
  { from: "po2", to: "cto" },
  { from: "spec", to: "cto" },
  { from: "spec", to: "po1", project: "ORB", fromX: 290 },
  { from: "spec", to: "po2", project: "SBX", fromX: 390 },
]

function path(e: Edge) {
  const [cx, cy] = POS[e.from]
  const [px, py] = POS[e.to]
  const x1 = e.toX ?? px
  const y1 = py + H
  const x2 = e.fromX ?? cx
  const mid = y1 + (cy - y1) / 2
  return { d: `M${x1} ${y1} V${mid} H${x2} V${cy}`, label: [(x1 + x2) / 2, mid] as const }
}

export function OrgChart() {
  const [project, setProject] = React.useState<string>("all")
  const [selected, setSelected] = React.useState<Agent | null>(null)

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Sorot proyek</span>
          <Select value={project} onValueChange={(v) => setProject((v as string) ?? "all")}>
            <SelectTrigger size="sm" className="w-40" aria-label="Sorot garis atasan proyek">
              <SelectValue>{(v: string) => (v === "all" ? "Semua proyek" : projects.find((p) => p.key === v)?.name)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua proyek</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.key} value={p.key}>{p.name} ({p.key})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <ul aria-label="Legenda garis" className="flex flex-wrap items-center gap-x-5 gap-y-1 text-muted-foreground">
          <li className="flex items-center gap-2">
            <svg width="28" height="2" aria-hidden="true"><line x1="0" y1="1" x2="28" y2="1" className="stroke-muted-foreground" strokeWidth="1.5" /></svg>
            Atasan tetap
          </li>
          <li className="flex items-center gap-2">
            <svg width="28" height="2" aria-hidden="true"><line x1="0" y1="1" x2="28" y2="1" className="stroke-muted-foreground" strokeWidth="1.5" strokeDasharray="6 4" /></svg>
            Atasan per proyek (berlabel)
          </li>
          <li>Kotak = agent, lingkaran = human</li>
        </ul>
      </div>

      <div className="overflow-x-auto bg-muted/40 ring-1 ring-foreground/10" role="region" aria-label="Struktur organisasi, geser horizontal" tabIndex={0}>
        <div className="relative" style={{ width: 920, height: 540 }}>
          <svg className="absolute inset-0" width={920} height={540} aria-hidden="true">
            {EDGES.map((e) => {
              const { d } = path(e)
              const dim = project !== "all" && e.project !== project
              const hot = project !== "all" && e.project === project
              return (
                <path
                  key={`${e.from}-${e.to}`}
                  d={d}
                  fill="none"
                  strokeDasharray={e.project ? "6 4" : undefined}
                  strokeWidth={hot ? 2 : 1.5}
                  className={cn(hot ? "stroke-primary" : "stroke-muted-foreground", dim && "opacity-30")}
                />
              )
            })}
          </svg>
          {EDGES.filter((e) => e.project).map((e) => {
            const [x, y] = path(e).label
            const dim = project !== "all" && e.project !== project
            return (
              <span
                key={`l-${e.project}`}
                className={cn("absolute -translate-x-1/2 -translate-y-1/2 bg-card px-1.5 py-0.5 font-mono text-xs ring-1 ring-input", dim && "opacity-30")}
                style={{ left: x, top: y }}
              >
                {e.project}
              </span>
            )
          })}

          <div className="absolute flex items-center gap-2 bg-card p-2 ring-1 ring-foreground/10" style={{ left: POS.founder[0] - W / 2, top: POS.founder[1], width: W, height: H }}>
            <ActorAvatar actor={founder} />
            <div className="min-w-0 text-xs">
              <p className="font-medium">Founder</p>
              <p className="text-muted-foreground">Puncak struktur, human</p>
            </div>
          </div>

          {agents.map((a) => {
            const [x, y] = POS[a.id]
            const matrix = a.projectManagers ? Object.keys(a.projectManagers).length + 1 : 0
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelected(a)}
                aria-label={`${a.name}, ${a.title}, status ${AGENT_STATUS[a.status].label}. Buka detail.`}
                className="absolute flex items-center gap-2 bg-card p-2 text-left ring-1 ring-foreground/10 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                style={{ left: x - W / 2, top: y, width: W, height: H }}
              >
                <ActorAvatar actor={a} />
                <span className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
                  <span className="truncate font-medium">{a.name}</span>
                  <span className="flex items-center gap-1.5">
                    <StatusBadge def={AGENT_STATUS[a.status]} progress={0.28} className="h-4 px-1" />
                    {matrix ? <span className="text-muted-foreground">{matrix} atasan</span> : null}
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
                  <ActorAvatar actor={selected} size="lg" />
                  <div>
                    <SheetTitle className="text-base">{selected.name}</SheetTitle>
                    <SheetDescription>{selected.title}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-3 p-4 text-sm">
                <dt className="text-muted-foreground">Status</dt>
                <dd><StatusBadge def={AGENT_STATUS[selected.status]} progress={0.28} /></dd>
                <dt className="text-muted-foreground">Atasan tetap</dt>
                <dd>{actorById(selected.managerId)?.name}</dd>
                <dt className="text-muted-foreground">Atasan per proyek</dt>
                <dd>
                  {selected.projectManagers
                    ? Object.entries(selected.projectManagers).map(([p, m]) => (
                        <p key={p}><span className="font-mono text-xs text-muted-foreground">{p}</span> {byId(agents, m)?.name}</p>
                      ))
                    : "Tidak ada"}
                </dd>
                <dt className="text-muted-foreground">Model</dt>
                <dd>{selected.model}</dd>
                <dt className="text-muted-foreground">Izin</dt>
                <dd className="font-mono">{selected.preset}</dd>
              </dl>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
