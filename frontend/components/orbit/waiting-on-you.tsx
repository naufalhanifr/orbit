"use client"

import * as React from "react"
import Link from "next/link"
import { CirclePause, GitPullRequest, MessageCircleQuestion, OctagonAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { api, ApiError, type WaitingItem } from "@/lib/api"

/** One entry per thing only the Founder can move forward (PRD 4.4, v1.14). */
const ICON = { pr_review: GitPullRequest, agent_question: MessageCircleQuestion, suspended: CirclePause, blocked: OctagonAlert }

export function WaitingOnYou({
  items,
  onOpenTask,
  onChanged,
}: {
  items: WaitingItem[]
  onOpenTask?: (taskId: number) => void
  onChanged?: () => void
}) {
  const [status, setStatus] = React.useState<string | null>(null)
  // Without a board on the page, review actions link to the board instead of opening a sheet.
  const openProps = (taskId: number | null) =>
    onOpenTask && taskId ? { onClick: () => onOpenTask(taskId) } : { render: <Link href={taskId ? `/board?task=${taskId}` : "/board"} /> }
  if (!items.length && !status) return null

  return (
    <section aria-labelledby="waiting-on-you" className="flex flex-col gap-2 rounded-lg bg-task-founder-approval-subtle p-3">
      <h2 id="waiting-on-you" className="flex items-center gap-2 text-sm font-medium text-task-founder-approval-foreground">
        Waiting on you
        <span className="font-mono tabular-nums">{items.length}</span>
      </h2>
      <ul className="flex flex-col divide-y divide-task-founder-approval/20">
        {items.map((i) => {
          const Icon = ICON[i.kind]
          const ref = i.task_key ?? (i.execution_id ? `Execution #${i.execution_id}` : "")
          return (
            <li key={`${i.kind}-${i.execution_id ?? i.task_id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 text-sm">
              <Icon aria-hidden="true" className="size-4 shrink-0 text-task-founder-approval-foreground" />
              <p className="min-w-0 flex-1">
                <span className="mr-1.5 font-mono text-xs">{ref}</span>
                {i.kind === "pr_review" && <>PR is ready for review{i.title ? `: ${i.title}` : ""}</>}
                {i.kind === "agent_question" && <>An agent asked a question{i.title ? ` on ${i.title}` : ""}</>}
                {i.kind === "suspended" && <>Execution #{i.execution_id} was suspended after 30 minutes without an answer</>}
                {i.kind === "blocked" && <>Blocked: {i.reason ?? "no reason recorded"}</>}
              </p>
              {i.kind === "pr_review" && (
                <>
                  {i.pr_url ? (
                    <Button size="sm" variant="ghost" render={<a href={i.pr_url} target="_blank" rel="noreferrer" />}>
                      Open PR
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" {...openProps(i.task_id)}>
                    Review {i.task_key}
                  </Button>
                </>
              )}
              {i.kind === "agent_question" && (
                <Button size="sm" variant="outline" {...openProps(i.task_id)}>
                  Answer in task thread
                </Button>
              )}
              {i.kind === "suspended" && i.execution_id && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await api(`/executions/${i.execution_id}/resume`, { method: "POST" })
                      setStatus(`Execution #${i.execution_id} resumed and is queued.`)
                      onChanged?.()
                    } catch (e) {
                      setStatus(e instanceof ApiError ? e.message : "Resume failed.")
                    }
                  }}
                >
                  Resume #{i.execution_id}
                </Button>
              )}
              {i.kind === "blocked" && (
                <Button size="sm" variant="outline" {...openProps(i.task_id)}>
                  Review blocker
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      <p role="status" className="text-xs text-task-founder-approval-foreground empty:hidden">
        {status}
      </p>
    </section>
  )
}
