// Data contoh untuk review desain. Bukan data nyata: angka token, waktu, dan isi task
// hanya ilustrasi agar layout bisa dinilai. Nama agent mengikuti contoh di PRD Bagian 8.

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
  managerId: string // atasan tetap; "founder" bila langsung ke Founder
  projectManagers?: Record<string, string> // atasan per proyek (matriks)
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
  note?: string // satu baris konteks: alasan blocked, feedback revisi, dsb.
  criteria: string[]
  tokens?: number
  previousStatus?: TaskStatus
}

export const tasks: Task[] = [
  { id: "ORB-15", title: "Halaman Agent Builder", status: "backlog", criteria: [], note: "Belum ada acceptance criteria" },
  { id: "ORB-13", title: "Blokir execution otomatis saat budget harian tercapai", status: "backlog", assigneeId: "spec", dependsOn: ["ORB-11"], criteria: ["Execution otomatis ditolak saat pemakaian hari ini mencapai batas", "Execution dari Founder meminta konfirmasi"] },
  { id: "ORB-12", title: "Tombol Stop execution dengan konfirmasi", status: "assigned", assigneeId: "spec", criteria: ["Stop menghentikan container", "Status execution menjadi Cancelled"] },
  { id: "ORB-16", title: "Perbaiki pesan error login terkunci", status: "assigned", assigneeId: "spec", fromChat: true, criteria: ["Pesan menyebut durasi kunci 15 menit"] },
  { id: "ORB-11", title: "Streaming execution log ke Web UI", status: "in-progress", assigneeId: "spec", tokens: 84200, criteria: ["Log tampil per baris tanpa reload", "Koneksi terputus disambung ulang otomatis", "Test integrasi lulus"] },
  { id: "ORB-9", title: "Dependency antar-task dengan perpindahan otomatis", status: "founder-approval", assigneeId: "spec", pr: 18, tokens: 212400, criteria: ["Task maju ke Assigned saat dependency terakhir Done", "Siklus dependency ditolak", "Test lulus"] },
  { id: "ORB-14", title: "Org chart matriks dengan garis per proyek", status: "revision", assigneeId: "spec", pr: 19, note: "Feedback: label proyek tertutup node saat garis bersilangan", criteria: ["Garis atasan per proyek berlabel nama proyek"] },
  { id: "ORB-10", title: "Rate limit login 5 kali gagal", status: "blocked", previousStatus: "in-progress", assigneeId: "spec", pr: 17, note: "2 test gagal setelah 3 percobaan. PR dibuka sebagai draft.", criteria: ["Akun dikunci 15 menit setelah 5 kali gagal"] },
  { id: "ORB-7", title: "State machine task MVP", status: "done", assigneeId: "spec", pr: 12, tokens: 188900, criteria: [] },
  { id: "ORB-1", title: "Login email dan password", status: "done", assigneeId: "spec", pr: 4, tokens: 143100, criteria: [] },
  { id: "ORB-8", title: "Reset password lewat email", status: "cancelled", note: "Diganti perintah di server (PRD 4.4)", criteria: [] },
]

export const budget = { perExecution: 300000, perDay: 3000000, usedToday: 1284300 }

export const runningExecution = {
  id: "EXE-482",
  taskId: "ORB-11",
  agentId: "spec",
  status: "running" as ExecStatus,
  elapsed: "18 m 40 d",
  tokens: 84200,
  limit: 300000,
  step: "Menjalankan test integrasi (pnpm test)",
  log: [
    "10:42:03  Mengambil branch orb-11-log-stream",
    "10:42:09  Membaca instruksi agent v7",
    "10:43:51  Mengubah backend/app/executions/stream.py",
    "10:51:12  Mengubah web/components/execution-log.tsx",
    "10:58:30  pnpm test: 41 lulus, 0 gagal (unit)",
    "11:00:43  Menjalankan test integrasi (pnpm test)",
  ],
}

export const recentExecutions: { id: string; taskId: string; status: ExecStatus; tokens: number; duration: string }[] = [
  { id: "EXE-482", taskId: "ORB-11", status: "running", tokens: 84200, duration: "18 m" },
  { id: "EXE-479", taskId: "ORB-9", status: "completed", tokens: 212400, duration: "41 m" },
  { id: "EXE-477", taskId: "ORB-14", status: "waiting", tokens: 52300, duration: "9 m" },
  { id: "EXE-471", taskId: "ORB-10", status: "failed", tokens: 296800, duration: "57 m" },
  { id: "EXE-468", taskId: "ORB-12", status: "suspended", tokens: 12100, duration: "30 m" },
]

export const tokensPerDay = [
  { day: "Kam", tokens: 1840200 },
  { day: "Jum", tokens: 2410900 },
  { day: "Sab", tokens: 620400 },
  { day: "Min", tokens: 0 },
  { day: "Sen", tokens: 2950100 },
  { day: "Sel", tokens: 2120700 },
  { day: "Rab", tokens: 1284300 },
]

export const byId = <T extends { id: string }>(list: T[], id?: string) => list.find((x) => x.id === id)
export const actorById = (id?: string): Actor | undefined => (id === "founder" ? founder : byId(agents, id))
export const formatTokens = (n: number) => n.toLocaleString("id-ID")
