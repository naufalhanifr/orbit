"use client"

import * as React from "react"
import { Square } from "lucide-react"

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
import { ActorAvatar } from "@/components/orbit/actor-avatar"
import { EXEC_STATUS, StatusBadge } from "@/components/orbit/status"
import { actorById, byId, formatTokens, runningExecution, tasks, usage, type ExecStatus } from "@/lib/orbit-data"
import { cn } from "@/lib/utils"

type Exec = typeof runningExecution

export function StopExecutionDialog({ exec, onConfirm, defaultOpen }: { exec: Exec; onConfirm: () => void; defaultOpen?: boolean }) {
  const agent = actorById(exec.agentId)!
  const task = byId(tasks, exec.taskId)!
  const [open, setOpen] = React.useState(!!defaultOpen)
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
            {agent.name} is working on {task.id} {task.title} ({exec.elapsed}, {formatTokens(exec.tokens)} tokens used). The execution stops now and becomes Cancelled. Uncommitted changes are lost. Tokens already used stay on record.
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

export function ExecutionCard({ className, showLog = false, stopOpen }: { className?: string; showLog?: boolean; stopOpen?: boolean }) {
  const [status, setStatus] = React.useState<ExecStatus>(runningExecution.status)
  const exec = runningExecution
  const agent = actorById(exec.agentId)!
  const task = byId(tasks, exec.taskId)!
  const progress = exec.minutes / usage.timeoutMinutes
  const running = status === "running"
  return (
    <section aria-label={`Execution ${exec.id}`} className={cn("flex flex-col gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10", className)}>
      <div className="flex items-center gap-2">
        <ActorAvatar actor={agent} size="sm" />
        <p className="min-w-0 flex-1 truncate text-sm">
          <span className="font-medium">{agent.name}</span>
          <span className="text-muted-foreground"> working on </span>
          <span className="font-mono text-xs">{task.id}</span> {task.title}
        </p>
        {running ? <StopExecutionDialog exec={exec} onConfirm={() => setStatus("cancelled")} defaultOpen={stopOpen} /> : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" aria-live="polite">
        <StatusBadge def={EXEC_STATUS[status]} progress={progress} />
        <span className="font-mono text-muted-foreground">{exec.id}</span>
        <span className="font-mono tabular-nums text-muted-foreground">
          {exec.elapsed} <span className="sr-only">elapsed</span>of {usage.timeoutMinutes}m timeout
        </span>
        <span className="ml-auto font-mono tabular-nums">
          {formatTokens(exec.tokens)} <span className="text-muted-foreground">tokens used</span>
        </span>
      </div>
      <p className="font-mono text-xs text-muted-foreground">
        {running ? <>Last step: {exec.step}</> : <>Stopped by the Founder. Task returned to Assigned.</>}
      </p>
      {showLog ? (
        <section aria-label="Tools called" className="flex flex-col gap-1 text-xs">
          <h3 className="text-muted-foreground">Tools called</h3>
          <ul className="flex flex-col gap-0.5 font-mono">
            {exec.tools.map((t) => (
              <li key={t.detail} className="flex gap-2">
                <span className="w-20 shrink-0 text-muted-foreground">{t.kind}</span>
                <span className="min-w-0 truncate">{t.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {showLog ? (
        <pre aria-label="Execution log" className="max-h-56 overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-5 text-foreground">
          {exec.log.join("\n")}
          {running ? "" : "\n11:02:10  Stopped by the Founder"}
        </pre>
      ) : null}
    </section>
  )
}
