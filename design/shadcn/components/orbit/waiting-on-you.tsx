"use client"

import * as React from "react"
import Link from "next/link"
import { CirclePause, GitPullRequest, MessageCircleQuestion, OctagonAlert } from "lucide-react"

import { Button } from "@/components/ui/button"

/** One entry per thing only the Founder can move forward (PRD 4.4, v1.15). */
export type WaitingItem =
  | { kind: "approval"; taskId: string; pr: number }
  | { kind: "question"; taskId: string; agent: string }
  | { kind: "suspended"; execId: string; taskId: string }
  | { kind: "blocked"; taskId: string; reason: string }

const ICON = { approval: GitPullRequest, question: MessageCircleQuestion, suspended: CirclePause, blocked: OctagonAlert }

export function WaitingOnYou({ items, onOpenTask }: { items: WaitingItem[]; onOpenTask?: (taskId: string) => void }) {
  const [done, setDone] = React.useState<Record<string, string>>({})
  const key = (i: WaitingItem) => ("execId" in i ? i.execId : `${i.kind}-${i.taskId}`)
  const open = items.filter((i) => !done[key(i)])
  const resolved = Object.values(done)
  // Without a board on the page, review actions link to the board instead of opening a sheet.
  const openProps = (taskId: string) =>
    onOpenTask ? { onClick: () => onOpenTask(taskId) } : { render: <Link href="/board" /> }
  if (!open.length && !resolved.length) return null

  return (
    <section aria-labelledby="waiting-on-you" className="flex flex-col gap-2 rounded-lg bg-task-founder-approval-subtle p-3">
      <h2 id="waiting-on-you" className="flex items-center gap-2 text-sm font-medium text-task-founder-approval-foreground">
        Waiting on you
        <span className="font-mono tabular-nums">{open.length}</span>
      </h2>
      <ul className="flex flex-col divide-y divide-task-founder-approval/20">
        {open.map((i) => {
          const Icon = ICON[i.kind]
          return (
            <li key={key(i)} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 text-sm">
              <Icon aria-hidden="true" className="size-4 shrink-0 text-task-founder-approval-foreground" />
              <p className="min-w-0 flex-1">
                <span className="mr-1.5 font-mono text-xs">{i.taskId}</span>
                {i.kind === "approval" && <>PR #{i.pr} is ready for review</>}
                {i.kind === "question" && <>{i.agent} asked a question</>}
                {i.kind === "suspended" && <>{i.execId} was suspended after 30 minutes without an answer</>}
                {i.kind === "blocked" && <>Blocked: {i.reason}</>}
              </p>
              {i.kind === "approval" && (
                <Button size="sm" variant="outline" {...openProps(i.taskId)}>Review {i.taskId}</Button>
              )}
              {i.kind === "question" && (
                <Button size="sm" variant="outline" render={<Link href="/chat" />}>Answer in chat</Button>
              )}
              {i.kind === "suspended" && (
                <Button size="sm" variant="outline" onClick={() => setDone((d) => ({ ...d, [key(i)]: `${i.execId} resumed and is queued.` }))}>
                  Resume {i.execId}
                </Button>
              )}
              {i.kind === "blocked" && (
                <Button size="sm" variant="outline" {...openProps(i.taskId)}>Review blocker</Button>
              )}
            </li>
          )
        })}
      </ul>
      {resolved.length ? (
        <p role="status" className="text-xs text-task-founder-approval-foreground">{resolved.join(" ")}</p>
      ) : null}
    </section>
  )
}
