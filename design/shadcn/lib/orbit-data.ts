// Sample data for design review. Not real data: token counts, times and task content
// only illustrate the layout. Agent names follow the example in PRD section 8.

export type TaskStatus =
  | "backlog"
  | "assigned"
  | "in-progress"
  | "founder-approval"
  | "revision"
  | "blocked"
  | "done"
  | "cancelled"

export type ExecStatus =
  | "queued"
  | "running"
  | "waiting"
  | "completed"
  | "failed"
  | "cancelled"
  | "suspended"

export type AgentStatus =
  | "draft"
  | "configuring"
  | "ready"
  | "active"
  | "paused"
  | "error"
  | "archived"

export type Actor = { id: string; name: string; title: string; kind: "human" | "agent" }

export const founder: Actor = { id: "founder", name: "Founder", title: "Founder", kind: "human" }

export type Agent = Actor & {
  kind: "agent"
  status: AgentStatus
  model: string
  preset: "read-only" | "coding"
  managerId: string // fixed manager; "founder" when reporting directly to the Founder
  projectManagers?: Record<string, string> // per-project manager (matrix)
  instructionVersion: number
}

export const agents: Agent[] = [
  { id: "cto", name: "CTO", title: "Chief Technology Officer", kind: "agent", status: "ready", model: "Claude Opus", preset: "read-only", managerId: "founder", instructionVersion: 4 },
  { id: "cmo", name: "CMO", title: "Chief Marketing Officer", kind: "agent", status: "draft", model: "Claude Sonnet", preset: "read-only", managerId: "founder", instructionVersion: 1 },
  { id: "po1", name: "PO 1", title: "Product Owner ORBIT", kind: "agent", status: "ready", model: "Claude Sonnet", preset: "read-only", managerId: "cto", instructionVersion: 3 },
  { id: "po2", name: "PO 2", title: "Product Owner Sandbox", kind: "agent", status: "paused", model: "Claude Sonnet", preset: "read-only", managerId: "cto", instructionVersion: 2 },
  { id: "spec", name: "Shared Specialist", title: "Backend Engineer", kind: "agent", status: "active", model: "Claude Opus", preset: "coding", managerId: "cto", projectManagers: { ORB: "po1", SBX: "po2" }, instructionVersion: 7 },
]

export const projects = [
  { key: "ORB", name: "ORBIT" },
  { key: "SBX", name: "Sandbox" },
]

export type Task = {
  id: string
  title: string
  status: TaskStatus
  assigneeId?: string
  pr?: number
  dependsOn?: string[]
  fromChat?: boolean
  note?: string // one line of context: blocked reason, revision feedback, etc.
  criteria: string[]
  tokens?: number
  previousStatus?: TaskStatus
}

export const tasks: Task[] = [
  { id: "ORB-15", title: "Agent Builder page", status: "backlog", criteria: [], note: "No acceptance criteria yet" },
  { id: "ORB-13", title: "Block automatic executions when the daily budget is reached", status: "backlog", assigneeId: "spec", dependsOn: ["ORB-11"], criteria: ["Automatic executions are rejected once today's usage hits the limit", "Founder-triggered executions ask for confirmation"] },
  { id: "ORB-12", title: "Stop execution button with confirmation", status: "assigned", assigneeId: "spec", criteria: ["Stop shuts down the container", "Execution status becomes Cancelled"] },
  { id: "ORB-16", title: "Fix the locked-login error message", status: "assigned", assigneeId: "spec", fromChat: true, criteria: ["Message states the 15-minute lockout"] },
  { id: "ORB-11", title: "Stream execution logs to the web UI", status: "in-progress", assigneeId: "spec", tokens: 84200, criteria: ["Log lines appear without a reload", "Dropped connections reconnect automatically", "Integration tests pass"] },
  { id: "ORB-9", title: "Task dependencies with automatic advance", status: "founder-approval", assigneeId: "spec", pr: 18, tokens: 212400, criteria: ["Task moves to Assigned when its last dependency is Done", "Dependency cycles are rejected", "Tests pass"] },
  { id: "ORB-14", title: "Matrix org chart with per-project lines", status: "revision", assigneeId: "spec", pr: 19, note: "Feedback: project labels hide behind nodes where lines cross", criteria: ["Per-project manager lines are labeled with the project"] },
  { id: "ORB-10", title: "Lock login after 5 failed attempts", status: "blocked", previousStatus: "in-progress", assigneeId: "spec", pr: 17, note: "2 tests still fail after 3 attempts. PR opened as draft.", criteria: ["Account locks for 15 minutes after 5 failures"] },
  { id: "ORB-7", title: "MVP task state machine", status: "done", assigneeId: "spec", pr: 12, tokens: 188900, criteria: [] },
  { id: "ORB-1", title: "Email and password login", status: "done", assigneeId: "spec", pr: 4, tokens: 143100, criteria: [] },
  { id: "ORB-8", title: "Password reset by email", status: "cancelled", note: "Replaced by a server command (PRD 4.4)", criteria: [] },
]

export const budget = { perExecution: 300000, perDay: 3000000, usedToday: 1284300 }

export const runningExecution = {
  id: "EXE-482",
  taskId: "ORB-11",
  agentId: "spec",
  status: "running" as ExecStatus,
  elapsed: "18m 40s",
  tokens: 84200,
  limit: 300000,
  step: "Running integration tests (pnpm test)",
  tools: [
    { kind: "Edit file", detail: "backend/app/executions/stream.py" },
    { kind: "Edit file", detail: "web/components/execution-log.tsx" },
    { kind: "Command", detail: "pnpm test (unit): 41 passed" },
    { kind: "Command", detail: "pnpm test (integration): running" },
  ],
  log: [
    "10:42:03  Checked out branch orb-11-log-stream",
    "10:42:09  Read agent instructions v7",
    "10:43:51  Edited backend/app/executions/stream.py",
    "10:51:12  Edited web/components/execution-log.tsx",
    "10:58:30  pnpm test: 41 passed, 0 failed (unit)",
    "11:00:43  Running integration tests (pnpm test)",
  ],
}

export const recentExecutions: { id: string; taskId: string; status: ExecStatus; tokens: number; duration: string }[] = [
  { id: "EXE-482", taskId: "ORB-11", status: "running", tokens: 84200, duration: "18m" },
  { id: "EXE-479", taskId: "ORB-9", status: "completed", tokens: 212400, duration: "41m" },
  { id: "EXE-477", taskId: "ORB-14", status: "waiting", tokens: 52300, duration: "9m" },
  { id: "EXE-471", taskId: "ORB-10", status: "failed", tokens: 296800, duration: "57m" },
  { id: "EXE-468", taskId: "ORB-12", status: "suspended", tokens: 12100, duration: "30m" },
]

export const tokensPerDay = [
  { day: "Thu", tokens: 1840200 },
  { day: "Fri", tokens: 2410900 },
  { day: "Sat", tokens: 620400 },
  { day: "Sun", tokens: 0 },
  { day: "Mon", tokens: 2950100 },
  { day: "Tue", tokens: 2120700 },
  { day: "Wed", tokens: 1284300 },
]

export type Comment = { id: number; authorId: string; time: string; text: string; note?: string }

// Task thread = comments = task-linked chat (PRD 17.4, v1.12).
export const taskThreads: Record<string, Comment[]> = {
  "ORB-11": [
    { id: 1, authorId: "founder", time: "10:41", text: "@Shared Specialist please take ORB-11. Use Server-Sent Events, not WebSockets." },
    { id: 2, authorId: "spec", time: "10:42", text: "Starting on branch orb-11-log-stream with SSE. Execution EXE-482." },
  ],
  "ORB-9": [
    { id: 1, authorId: "spec", time: "Yesterday", text: "PR #18 is ready for review. Tests: 58 passed, 0 failed. Dependency cycles are rejected with a message naming the task that causes them." },
  ],
}

export const byId = <T extends { id: string }>(list: T[], id?: string) => list.find((x) => x.id === id)
export const actorById = (id?: string): Actor | undefined => (id === "founder" ? founder : byId(agents, id))
export const formatTokens = (n: number) => n.toLocaleString("en-US")
