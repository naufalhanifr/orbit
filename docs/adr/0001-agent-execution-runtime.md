# ADR-0001: Agent Execution Runtime

| Field | Value |
|---|---|
| Status | **Proposed** (menunggu persetujuan Founder) |
| Tanggal | 2026-11-25 |
| Terkait | PRD v1.9 — Bagian 16 (Trigger & Autonomy), 18 (Agent Execution), 19 (Budget), 20 (Workspace), 29 (Security) |

## 1. Konteks

ORBIT harus menjalankan AI Agent untuk mengerjakan task: membaca dan menulis kode, menjalankan perintah, memakai skill, dan memanggil tools/MCP. PRD menetapkan kebutuhan berikut terhadap runtime:

| # | Kebutuhan | Sumber PRD |
|---|---|---|
| R1 | Izin tool dan MCP ditegakkan di runtime, bukan hanya lewat instruksi | 18.1, 29.1 |
| R2 | Budget keras per execution; berhenti dengan status `Budget Exceeded` | 19 |
| R3 | Stop menghentikan konsumsi token ≤ 5 detik | 30, 33 |
| R4 | Token dan biaya tercatat per execution, agent, proyek | 19, 27 |
| R5 | Streaming respons ke chat | 17.2 |
| R6 | Waiting for Input → Suspended → Resume | 18.3 |
| R7 | Runtime tidak menulis ke database; semua lewat backend API | 18.1 |
| R8 | Isolasi per execution (Docker), egress allowlist, secret tidak bocor | 20.2, 29.1 |
| R9 | Context snapshot dan instruksi berversi yang bisa diaudit | 11, 17.7 |
| R10 | Backend ORBIT ditulis dalam Python (FastAPI + Dramatiq) | 28.1 |

## 2. Opsi yang Dipertimbangkan

### Opsi A — Wrapper Claude Code CLI (headless)
Worker menjalankan `claude -p ... --output-format stream-json` sebagai subprocess di dalam container.

- ➕ Paling cepat untuk prototipe; tidak perlu library tambahan.
- ➕ Dukungan `--allowedTools`, `--resume`, `--max-turns` tersedia lewat flag.
- ➖ Kontrol izin per panggilan tool kurang fleksibel (berbasis flag dan konfigurasi file).
- ➖ ORBIT harus mem-parse stream JSON sendiri dan menjaga kompatibilitas format output.
- ➖ Custom tool ORBIT (submit report, minta review) harus dibuat sebagai MCP server terpisah.
- ➖ Interrupt hanya lewat kill proses — kasar dan state bisa tidak rapi.

### Opsi B — Claude Agent SDK (Python) ✅ *direkomendasikan*
Library `claude-agent-sdk` — harness Claude Code yang dapat diprogram — dijalankan oleh proses **ORBIT Runner** di dalam container execution.

- ➕ `can_use_tool` callback dan hooks (misalnya `PreToolUse`) memungkinkan ORBIT memutuskan **setiap** panggilan tool berdasarkan policy-nya sendiri (R1).
- ➕ `max_budget_usd` dan `max_turns` sebagai batas keras bawaan; hasil berakhir dengan subtype `error_max_budget_usd` / `error_max_turns` (R2).
- ➕ `ClaudeSDKClient.interrupt()` untuk stop yang rapi (R3).
- ➕ `ResultMessage` membawa `total_cost_usd`, `usage`, `model_usage`, `num_turns`, `duration_ms`, `permission_denials` (R4).
- ➕ `include_partial_messages=True` untuk streaming (R5).
- ➕ `resume` / `fork_session` dengan `session_id` untuk suspend dan resume (R6).
- ➕ `create_sdk_mcp_server` + `@tool` untuk membuat tool ORBIT in-process yang memanggil backend API, sehingga agent tidak pernah menyentuh database (R7).
- ➕ Bahasa sama dengan backend (Python) (R10).
- ➖ Ketergantungan pada versi SDK dan binary Claude Code; perlu pin versi dan uji upgrade.
- ➖ Sedikit lebih banyak kode dibanding Opsi A.

### Opsi C — Claude Managed Agents
Anthropic menjalankan agent loop; sandbox di-host Anthropic atau self-hosted.

- ➕ Tidak perlu meng-host harness; sesi, versi agent, dan event stream disediakan.
- ➖ Masih beta; ada biaya runtime sesi di atas token.
- ➖ Kontrol atas workspace, Git worktree, dan egress lebih terbatas dibanding container milik ORBIT (kecuali memakai self-hosted sandbox).
- ➖ Riwayat sesi tersimpan di pihak Anthropic sampai dihapus — perlu ditinjau terhadap kebijakan data EVORA.
- Dicatat sebagai **alternatif masa depan**, terutama bila beban operasional container menjadi besar.

### Opsi D — Agent loop sendiri di atas Messages API
ORBIT menulis sendiri loop tool-use di atas Claude API.

- ➕ Kontrol total.
- ➖ Harus membangun ulang tools file/bash/edit, context management, compaction, subagents, skills — pekerjaan besar yang tidak menjadi pembeda produk ORBIT.
- Ditolak untuk eksekusi coding. Tetap boleh dipakai untuk panggilan LLM kecil non-agentic (misalnya ringkasan on-demand).

## 3. Keputusan

ORBIT menggunakan **Opsi B: Claude Agent SDK (Python)**, dijalankan oleh **ORBIT Runner** di dalam satu container Docker per execution.

### 3.1 Arsitektur

```
Backend API ──(enqueue)──► Dramatiq Worker
                                │ 1. Ambil Execution Spec (snapshot)
                                │ 2. Buat container + mount worktree
                                ▼
                    ┌─────────── Execution Container ───────────┐
                    │ ORBIT Runner (Python)                      │
                    │  └─ claude-agent-sdk ─► Claude Code binary │
                    │  └─ ORBIT MCP tools (in-process)           │
                    │ Workspace: /workspace (git worktree)       │
                    └──────────────┬─────────────────────────────┘
                                   │ HTTPS (execution token)
                   ┌───────────────┼──────────────────┐
                   ▼                                  ▼
          ORBIT Backend API                   ORBIT LLM Gateway
   (events, report, status, docs)      (inject API key, metering, budget)
                                                      │
                                                      ▼
                                                 Claude API
```

### 3.2 Execution Spec
Worker menyiapkan spec yang tidak berubah selama execution (snapshot, R9): instruksi agent versi terpublikasi, project/task context, skill manifest, daftar tool & MCP yang diizinkan, model, budget, timeout, dan execution token berumur pendek. Spec disimpan bersama execution record untuk audit.

### 3.3 Pemetaan Policy ORBIT → SDK

| Policy ORBIT | Mekanisme SDK |
|---|---|
| Tool yang diizinkan agent | `allowed_tools` |
| Tool yang dilarang | `disallowed_tools` |
| Keputusan per panggilan (path di luar workspace, perintah berbahaya, akses MCP) | `can_use_tool` callback + hook `PreToolUse` yang memanggil policy engine ORBIT |
| Mode izin | Tidak pernah `bypassPermissions`. Default: allowlist ketat, sisanya ditolak |
| Konfigurasi dari repo proyek | `setting_sources=[]` — file `.claude/` di repo **tidak** dimuat otomatis, karena repo adalah konten untrusted |
| Skill | Dimuat dari paket Skill Center yang sudah divalidasi, bukan dari repo |
| Batas biaya | `max_budget_usd` (dari budget execution) |
| Batas langkah | `max_turns` |
| Model | `model` dari konfigurasi agent |
| Direktori kerja | `cwd=/workspace` |

### 3.4 Tool Khusus ORBIT
Disediakan sebagai MCP server in-process (`create_sdk_mcp_server`). Semua memanggil Backend API dengan execution token, bukan database:

- `orbit_submit_work_report` — skema terstruktur sesuai PRD 8.6; divalidasi backend.
- `orbit_request_review` — menyerahkan task ke PO Review.
- `orbit_escalate` — membuat eskalasi sesuai PRD 8.7.
- `orbit_read_document` / `orbit_write_document` — akses Document Storage sesuai permission.
- `orbit_ask_human` — memindahkan execution ke Waiting for Input.
- `orbit_propose_tasks` — PO mengirim usulan breakdown task ke Project Chat untuk disetujui Founder (PRD 17.10). Task baru dibuat oleh backend setelah disetujui.

Agent **tidak** diberi tool untuk mengubah status task secara langsung di luar transisi yang diizinkan state machine.

### 3.5 Stop, Timeout, Suspend
- **Stop:** Runner memanggil `interrupt()`. Jika tidak selesai dalam 3 detik, worker mematikan container. Gateway menolak request baru untuk execution tersebut seketika (R3).
- **Timeout:** worker menegakkan timeout maksimum dari spec.
- **Suspend:** saat Waiting for Input melewati batas waktu, Runner menyimpan `session_id` dan file sesi ke penyimpanan persisten, lalu container dihentikan. Resume membuat container baru dengan `resume=session_id` (R6).

### 3.6 LLM Gateway
Container **tidak** menyimpan API key asli. Runner diarahkan ke ORBIT LLM Gateway; gateway:
- menyuntikkan API key organisasi,
- mencatat token per execution,
- menolak request bila budget execution/proyek/organisasi habis atau kill switch aktif.

Dengan begitu budget ditegakkan dua lapis: `max_budget_usd` di SDK dan pemblokiran di gateway (R2, R8).

### 3.7 Isolasi Container
- Satu container per execution, non-root, filesystem hanya worktree proyek terkait.
- Egress hanya ke Backend API, LLM Gateway, GitHub, dan host yang diizinkan project policy.
- Secret Git (token GitHub App berumur pendek) diinjeksi per execution dan dicabut setelah selesai.

### 3.8 Autentikasi & Branding
- Target jangka panjang: API key organisasi (Claude API atau penyedia cloud yang didukung), sesuai ketentuan Agent SDK. Penggunaan API tunduk pada Anthropic Commercial Terms of Service.
- **Keputusan Founder untuk MVP (2026-11-25):** memakai **langganan Claude (subscription)** milik Founder untuk penggunaan internal pribadi. Dokumentasi Agent SDK menyatakan: *"Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products, including agents built on the Claude Agent SDK."* Kesesuaian pemakaian langganan untuk kasus ORBIT **belum dikonfirmasi** dan sedang dicek Founder ke Anthropic. Sampai terkonfirmasi, status ini adalah risiko terbuka.
- Konsekuensi teknis selama memakai langganan:
  - Autentikasi dibuat **dapat diganti** (subscription ↔ API key) lewat konfigurasi Runner, tanpa perubahan kode agent.
  - Budget ditegakkan dalam **token** per execution/proyek/organisasi, bukan dolar; `max_budget_usd` tidak dijadikan sumber kebenaran.
  - Kuota langganan dipakai bersama penggunaan Claude pribadi Founder; jumlah execution paralel dibatasi (default: 1).
  - Kredensial langganan tidak dapat disuntikkan oleh LLM Gateway seperti API key, sehingga berada di dalam container execution. Mitigasi: egress allowlist ketat, container berumur pendek, kredensial tidak ditulis ke workspace atau log.
- UI ORBIT tidak menyebut dirinya "Claude Code". Label yang diperbolehkan misalnya "Powered by Claude".

## 4. Konsekuensi

### Positif
- Seluruh kebutuhan R1–R10 terpenuhi dengan mekanisme bawaan, tanpa membangun harness sendiri.
- Policy dan budget ditegakkan di kode, bukan bergantung pada kepatuhan model terhadap instruksi.
- Tool ORBIT in-process membuat batas "runtime tidak menyentuh database" mudah dijaga.

### Negatif / Risiko
| Risiko | Mitigasi |
|---|---|
| Perubahan API SDK atau binary | Pin versi di image Runner; upgrade lewat PR dengan test suite runtime |
| Overhead start container per execution | Image ringan dan pre-pulled; pertimbangkan warm pool di Phase 3 |
| Prompt injection dari repo/dokumen | `setting_sources=[]`, policy engine di `can_use_tool`, egress allowlist, secret tidak ada di container |
| `usage` hanya menghitung loop utama | Pakai `model_usage` dan angka dari LLM Gateway sebagai sumber kebenaran biaya |
| Komponen baru (LLM Gateway) menambah kerja | Mulai dengan reverse proxy tipis; fitur metering bertahap |
| Pemakaian langganan untuk MVP mungkin tidak sesuai ketentuan Anthropic | Founder mengonfirmasi ke Anthropic; autentikasi dapat diganti ke API key tanpa perubahan kode agent |
| Kredensial langganan berada di dalam container | Egress allowlist, container berumur pendek, kredensial tidak ditulis ke disk workspace/log; pindah ke API key + gateway untuk produksi |

### Netral
- Opsi C (Managed Agents) dapat ditinjau ulang lewat ADR baru jika beban operasional container terlalu besar.
- Opsi D tetap dipakai untuk panggilan LLM kecil non-agentic.

## 5. Langkah Validasi (Spike, sebelum status → Accepted)
1. Runner minimal di Docker: satu task sederhana di worktree, streaming ke backend.
2. Uji `can_use_tool` menolak akses di luar `/workspace`.
3. Uji stop ≤ 5 detik dari tombol Stop hingga request ke gateway berhenti.
4. Uji `max_budget_usd` menghasilkan `error_max_budget_usd` dan status execution `Failed (Budget Exceeded)`.
5. Uji suspend → container mati → resume dengan `session_id` → lanjut tanpa kehilangan konteks.
6. Bandingkan angka biaya SDK (`total_cost_usd`/`model_usage`) dengan angka gateway.

## 6. Referensi
- Claude Agent SDK overview: https://code.claude.com/docs/en/agent-sdk/overview
- Claude Agent SDK Python reference: https://code.claude.com/docs/en/agent-sdk/python
- Claude Code headless mode: https://code.claude.com/docs/en/headless
- Claude Managed Agents: https://platform.claude.com/docs/en/managed-agents/overview
