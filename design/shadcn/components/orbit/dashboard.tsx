"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ExecutionCard } from "@/components/orbit/execution-card"
import { EXEC_STATUS, StatusBadge } from "@/components/orbit/status"
import { byId, formatTokens, recentExecutions, tasks, tokensPerDay, usage } from "@/lib/orbit-data"

const chartConfig = { tokens: { label: "Tokens", color: "var(--chart-3)" } } satisfies ChartConfig

export function Dashboard({ stopOpen }: { stopOpen?: boolean }) {
  const failed = recentExecutions.filter((e) => e.status === "failed").length
  return (
    <div className="grid gap-6 p-4 md:p-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-6">
        <section aria-labelledby="running" className="flex flex-col gap-2">
          <h2 id="running" className="text-sm font-medium">Running now</h2>
          <ExecutionCard showLog stopOpen={stopOpen} />
        </section>

        <section aria-labelledby="recent" className="flex flex-col gap-2">
          <h2 id="recent" className="text-sm font-medium">Recent executions</h2>
          <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Execution</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentExecutions.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono">{e.id}</TableCell>
                    <TableCell className="max-w-64 truncate"><span className="font-mono text-muted-foreground">{e.taskId}</span> {byId(tasks, e.taskId)?.title}</TableCell>
                    <TableCell><StatusBadge def={EXEC_STATUS[e.status]} progress={e.minutes / usage.timeoutMinutes} /></TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{e.minutes}m</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatTokens(e.tokens)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <aside aria-label="Token usage" className="flex flex-col gap-6">
        <section aria-labelledby="today" className="flex flex-col gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
          <h2 id="today" className="text-xs text-muted-foreground">Tokens today</h2>
          <p className="font-mono text-2xl font-medium tabular-nums">{formatTokens(usage.tokensToday)}</p>
          <p className="text-xs text-muted-foreground">Usage is recorded for every execution.</p>
        </section>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border ring-1 ring-foreground/10">
          <div className="flex flex-col gap-1 bg-card p-4">
            <dt className="text-xs text-muted-foreground">Execution timeout</dt>
            <dd className="font-mono text-sm tabular-nums">{usage.timeoutMinutes} min</dd>
          </div>
          <div className="flex flex-col gap-1 bg-card p-4">
            <dt className="text-xs text-muted-foreground">Failed, last 24h</dt>
            <dd className="font-mono text-sm tabular-nums">{failed}</dd>
          </div>
        </dl>
        <section aria-labelledby="perday" className="flex flex-col gap-2 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
          <h2 id="perday" className="text-xs text-muted-foreground">Tokens per day, last 7 days</h2>
          <ChartContainer config={chartConfig} className="aspect-auto h-44 w-full">
            <BarChart data={tokensPerDay} margin={{ left: 0, right: 0, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis width={44} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v / 1000000).toLocaleString("en-US", { maximumFractionDigits: 1 })}M`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${formatTokens(Number(v))} tokens`} />} />
              <Bar dataKey="tokens" fill="var(--color-tokens)" />
            </BarChart>
          </ChartContainer>
        </section>
      </aside>
    </div>
  )
}
