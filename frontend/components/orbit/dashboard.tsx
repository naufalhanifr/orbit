"use client"

import * as React from "react"
import Link from "next/link"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ExecutionCard } from "@/components/orbit/execution-card"
import { useActor, useOrbit } from "@/components/orbit/orbit-context"
import { BoardError, BoardLoading } from "@/components/orbit/states"
import { EXEC_STATUS, StatusBadge } from "@/components/orbit/status"
import { ACTIVE_EXEC, api, ApiError, formatTime, formatTokens, type Execution, type Task } from "@/lib/api"

const chartConfig = { tokens: { label: "Tokens", color: "var(--chart-3)" } } satisfies ChartConfig

// shortcut: no org-wide executions or usage endpoint yet, so this walks projects → tasks → executions
// (one request per task). Replace with a backend /executions and usage summary endpoint.
function useAllExecutions() {
  const { projects } = useOrbit()
  const [data, setData] = React.useState<{ executions: Execution[]; tasks: Map<number, Task>; now: number }>()
  const [error, setError] = React.useState<string | null>(null)
  const [tick, setTick] = React.useState(0)
  React.useEffect(() => {
    if (!projects) return
    let live = true
    ;(async () => {
      const tasks = (await Promise.all(projects.map((p) => api<Task[]>(`/projects/${p.id}/tasks`)))).flat()
      const executions = (await Promise.all(tasks.map((t) => api<Execution[]>(`/tasks/${t.id}/executions`)))).flat()
      executions.sort((a, b) => b.id - a.id)
      return { executions, tasks: new Map(tasks.map((t) => [t.id, t])), now: Date.now() }
    })().then(
      (d) => live && (setData(d), setError(null)),
      (e) => live && setError(e instanceof ApiError ? e.message : "Executions couldn’t load.")
    )
    const timer = setTimeout(() => live && setTick((t) => t + 1), 15_000)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [projects, tick])
  return { data, error, reload: () => setTick((t) => t + 1) }
}

const dayKey = (d: Date) => d.toLocaleDateString("en-CA") // local YYYY-MM-DD

function duration(e: Execution, now: number) {
  if (!e.started_at) return "Not started"
  const ms = (e.finished_at ? new Date(e.finished_at).getTime() : now) - new Date(e.started_at).getTime()
  return `${Math.max(0, Math.round(ms / 60000))}m`
}

export function Dashboard() {
  const { data, error, reload } = useAllExecutions()
  const actor = useActor()
  if (error && !data) return <div className="p-4 md:p-6"><BoardError message={error} onRetry={reload} /></div>
  if (!data) return <div className="p-4 md:p-6"><BoardLoading /></div>

  const { executions, tasks, now } = data
  const label = (e: Execution) => {
    const t = e.task_id ? tasks.get(e.task_id) : undefined
    return t ? `${t.key} ${t.title}` : "No task"
  }
  const active = executions.filter((e) => ACTIVE_EXEC.includes(e.status))
  const today = dayKey(new Date(now))
  // Tokens are attributed to the day the execution was created.
  const usedToday = executions.filter((e) => dayKey(new Date(e.created_at)) === today).reduce((s, e) => s + e.tokens_used, 0)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (6 - i))
    return { key: dayKey(d), day: d.toLocaleDateString("en-US", { weekday: "short" }), tokens: 0 }
  })
  for (const e of executions) {
    const row = days.find((d) => d.key === dayKey(new Date(e.created_at)))
    if (row) row.tokens += e.tokens_used
  }
  const dayAgo = now - 86_400_000
  const failed = executions.filter((e) => e.status === "failed" && new Date(e.created_at).getTime() > dayAgo).length

  return (
    <div className="grid gap-6 p-4 md:p-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-6">
        <section aria-labelledby="running" className="flex flex-col gap-2">
          <h2 id="running" className="text-sm font-medium">
            Active executions
          </h2>
          {active.length ? (
            active.map((e) => <ExecutionCard key={e.id} execution={e} label={label(e)} showLog onChanged={reload} />)
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing is running. Executions start when you mention an agent in a task comment.
            </p>
          )}
        </section>

        <section aria-labelledby="recent" className="flex flex-col gap-2">
          <h2 id="recent" className="text-sm font-medium">
            Execution log
          </h2>
          <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Execution</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono">#{e.id}</TableCell>
                    <TableCell className="max-w-64 truncate">
                      {e.task_id ? (
                        <Link href={`/board?task=${e.task_id}`} className="hover:underline">
                          {label(e)}
                        </Link>
                      ) : (
                        label(e)
                      )}
                    </TableCell>
                    <TableCell>{actor(e.agent_id).name}</TableCell>
                    <TableCell>
                      <StatusBadge def={EXEC_STATUS[e.status]} progress={e.token_limit ? e.tokens_used / e.token_limit : 0} />
                    </TableCell>
                    <TableCell className="font-mono">{formatTime(e.created_at)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{duration(e, now)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatTokens(e.tokens_used)}</TableCell>
                  </TableRow>
                ))}
                {!executions.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      No executions yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <aside aria-label="Token usage" className="flex flex-col gap-6">
        <section aria-labelledby="today" className="flex flex-col gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
          <h2 id="today" className="text-xs text-muted-foreground">
            Tokens today
          </h2>
          <p className="font-mono text-2xl font-medium tabular-nums">{formatTokens(usedToday)}</p>
          <p className="text-xs text-muted-foreground">
            The daily budget (3,000,000 tokens by default) isn’t enforced by the server yet, so no limit is shown.
          </p>
        </section>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border ring-1 ring-foreground/10">
          <div className="flex flex-col gap-1 bg-card p-4">
            <dt className="text-xs text-muted-foreground">Executions, all time</dt>
            <dd className="font-mono text-sm tabular-nums">{executions.length}</dd>
          </div>
          <div className="flex flex-col gap-1 bg-card p-4">
            <dt className="text-xs text-muted-foreground">Failed, last 24h</dt>
            <dd className="font-mono text-sm tabular-nums">{failed}</dd>
          </div>
        </dl>
        <section aria-labelledby="perday" className="flex flex-col gap-2 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
          <h2 id="perday" className="text-xs text-muted-foreground">
            Tokens per day, last 7 days
          </h2>
          <ChartContainer config={chartConfig} className="aspect-auto h-44 w-full">
            <BarChart data={days} margin={{ left: 0, right: 0, top: 8 }} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis width={44} allowDecimals={false} domain={[0, (max: number) => Math.max(max, 1000)]} tickLine={false} axisLine={false} tickFormatter={(v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1000)}k`)} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${formatTokens(Number(v))} tokens`} />} />
              <Bar dataKey="tokens" fill="var(--color-tokens)" />
            </BarChart>
          </ChartContainer>
        </section>
      </aside>
    </div>
  )
}
