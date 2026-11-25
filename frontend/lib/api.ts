"use client"

import * as React from "react"

// Types mirror backend/orbit/api/schemas.py. Ids are workforce ids for agents.

export type TaskStatus =
  | "backlog"
  | "assigned"
  | "in_progress"
  | "founder_approval"
  | "revision"
  | "blocked"
  | "done"
  | "cancelled"

export type ExecStatus =
  | "queued"
  | "preparing"
  | "running"
  | "waiting_for_input"
  | "suspended"
  | "completed"
  | "failed"
  | "cancelled"

export type AgentStatus = "draft" | "configuring" | "ready" | "active" | "paused" | "error" | "archived"
export type ToolPreset = "read-only" | "coding"

export type User = { id: number; email: string; role: string; name: string; organization_id: number }
export type Project = { id: number; key: string; name: string; description: string | null }
export type Assignment = { id: number; project_id: number; agent_id: number; supervisor_id: number | null }

export type Agent = {
  id: number
  name: string
  title: string | null
  status: AgentStatus
  fixed_supervisor_id: number | null
  model: string | null
  tool_preset: ToolPreset
  token_limit_per_execution: number
  instruction_version: number | null
}

export type InstructionVersion = { id: number; version: number; content: string; created_at: string }

export type Task = {
  id: number
  key: string
  project_id: number
  title: string
  description: string | null
  type: string
  priority: string
  status: TaskStatus
  status_before_block: TaskStatus | null
  acceptance_criteria: string | null
  acceptance_criteria_waived: boolean
  assignee_id: number | null
  reporter_id: number | null
  pr_url: string | null
  revision_count: number
  depends_on: number[]
}

export type TaskEvent = {
  from_status: TaskStatus
  to_status: TaskStatus
  reason: string | null
  actor_id: number | null
  created_at: string
}

export type Message = { id: number; author_id: number; body: string; mentions: number[]; created_at: string }

export type Execution = {
  id: number
  task_id: number | null
  agent_id: number
  status: ExecStatus
  trigger: "chat_mention" | "task_assignment" | "human_action"
  trigger_message_id: number | null
  instruction_version_id: number | null
  current_step: string | null
  tokens_used: number
  token_limit: number
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export type ExecutionEvent = {
  seq: number
  kind: "step" | "output" | "tool" | "tokens" | "instruction"
  payload: Record<string, unknown>
  created_at: string
}

export type WaitingItem = {
  kind: "pr_review" | "agent_question" | "suspended" | "blocked"
  task_id: number | null
  task_key: string | null
  title: string | null
  execution_id: number | null
  pr_url: string | null
  reason: string | null
  since: string
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message)
  }
}

// FastAPI returns {detail: string, code} for domain errors and {detail: [{msg, loc}]} for validation.
function errorMessage(status: number, body: unknown): { message: string; code?: string } {
  const b = body as { detail?: unknown; code?: string } | null
  if (typeof b?.detail === "string") return { message: b.detail, code: b.code }
  if (Array.isArray(b?.detail)) {
    const msgs = b.detail.map((d: { msg?: string; loc?: unknown[] }) =>
      [d.loc?.slice(1).join("."), d.msg].filter(Boolean).join(": ")
    )
    return { message: msgs.join(". ") || "Invalid input" }
  }
  if (status >= 500 || status === 0) return { message: "The server isn’t responding. Try again in a moment." }
  return { message: `Request failed (${status})` }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method: init?.method ?? (init?.body === undefined ? "GET" : "POST"),
      headers: init?.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: "same-origin",
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new ApiError(0, "The server didn’t respond within 10 seconds.")
  }
  if (res.status === 401 && path !== "/auth/login" && typeof window !== "undefined" && window.location.pathname !== "/login") {
    // Full reload on purpose: drops all client state of the expired session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`)
  }
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  if (!res.ok) {
    const { message, code } = errorMessage(res.status, body)
    throw new ApiError(res.status, message, code)
  }
  return body as T
}

/** Fetch on mount and when `path` changes; `reload` refetches. `path = null` skips. */
export function useApi<T>(path: string | null, pollMs?: number) {
  const [data, setData] = React.useState<T | undefined>(undefined)
  const [error, setError] = React.useState<ApiError | null>(null)
  const [tick, setTick] = React.useState(0)
  const reload = React.useCallback(() => setTick((t) => t + 1), [])

  React.useEffect(() => {
    if (!path) return
    let live = true
    api<T>(path).then(
      (d) => live && (setData(d), setError(null)),
      (e: ApiError) => live && setError(e)
    )
    const timer = pollMs ? setTimeout(() => live && setTick((t) => t + 1), pollMs) : undefined
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [path, tick, pollMs])

  return { data, error, reload, loading: !!path && data === undefined && !error }
}

export const formatTokens = (n: number) => n.toLocaleString("en-US")

export const formatTime = (iso: string) => {
  const d = new Date(iso)
  const today = new Date().toDateString() === d.toDateString()
  return today
    ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
    : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
}

export const ACTIVE_EXEC: ExecStatus[] = ["queued", "preparing", "running", "waiting_for_input", "suspended"]

/** Acceptance criteria are stored as one text field; the UI writes one criterion per line. */
export const criteriaLines = (t: Pick<Task, "acceptance_criteria">) =>
  (t.acceptance_criteria ?? "").split("\n").map((s) => s.trim()).filter(Boolean)
