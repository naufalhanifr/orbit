# ORBIT — Product Requirements Document (PRD)

| Field | Value |
|---|---|
| Product | ORBIT |
| Brand | ORBIT by EVORA Studio |
| Version | 1.13 |
| Status | Approved Product Direction |
| Product Category | AI Workforce & Project Operating System |
| Initial Organization | EVORA Studio |
| Architecture | Custom-built, Paperclip-independent (tidak dibangun di atas atau bergantung pada Paperclip; seluruh domain model dan orkestrasi dibangun sendiri) |
| Execution Runtime | Claude Agent SDK di container Docker per execution (lihat [ADR-0001](adr/0001-agent-execution-runtime.md), status Proposed) |
| Workforce Model | Human + AI Agents dalam satu struktur organisasi |
| Deployment Strategy | Internal-first, multi-organization ready |
| Primary Domain | orbit.evora-studio.com |

## Changelog

### v1.13
- **Diperbaiki:** Bagian 18.1 diselaraskan dengan 4.4 dan ADR-0001 §3.8: runtime memakai langganan Claude milik Founder; API key organisasi menjadi opsi pengganti.
- **Baru:** Seluruh teks UI ORBIT memakai bahasa Inggris (Bagian 4.4 dan 31).

### v1.12
- **Baru:** Detail task menampilkan execution yang sedang berjalan secara live, dan komentar task berfungsi sebagai chat dengan agent (Bagian 17.4).

### v1.11
- **Diubah (mengganti v1.10):** Founder adalah puncak struktur organisasi. Tidak ada lagi "tepat satu agent puncak" dan batas kedalaman dihapus; jumlah agent yang melapor langsung ke Founder bebas. Model matriks tetap berlaku.
- **Diubah:** Agent otomatis menjadi Ready saat task-nya masuk Assigned; aturan "tidak dapat Ready tanpa atasan" dihapus.
- **Diubah:** State machine task MVP memakai Founder Approval tanpa PO Review (Bagian 15.1).
- **Baru:** Dependency antar-task dengan perpindahan otomatis Backlog → Assigned (Bagian 14.3).
- **Klarifikasi:** format project key; hal yang ditunda di backend.

### v1.10
- **Diubah:** Founder berada di luar struktur agent. Struktur agent memiliki **tepat satu agent puncak** (misalnya CTO) yang melapor ke Founder.
- **Diubah:** Reporting line memakai **model matriks**: agent boleh memiliki lebih dari satu atasan; atasan yang berlaku ditentukan oleh proyek task yang sedang dikerjakan.
- **Baru:** Keputusan MVP tambahan: login email + password, perilaku chat, Agent Builder minimal, versi instruksi otomatis, batas token default, bukti test sebelum PR (Bagian 4.4).

### v1.9
- **Baru:** Organization Structure & Reporting Lines (Bagian 8). Workforce tersusun seperti struktur perusahaan; setiap anggota melapor ke atasannya hingga Founder.
- **Baru:** Default **0 agent**. Founder menentukan sendiri agent apa saja yang dibuat.
- **Baru:** Prinsip *Lean Coordination* — pelaporan dan koordinasi singkat, padat, bernilai, dan hemat token.
- **Baru:** Delivery Phases, Trigger & Autonomy Policy, Budget & Cost Control, Roles & Permission Matrix, Threat Model, Non-Functional Requirements, Out of Scope, Open Questions.
- **Diubah:** Task workflow ditulis sebagai state machine; status "In Review" dihapus; ditambah Blocked dan Cancelled.
- **Diubah:** Runtime memakai API key organisasi; permission ditegakkan di runtime layer.
- **Diubah:** Sumber kebenaran file dipertegas (Git / Document Storage / Workspace).
- **Diubah:** VS Code v1 dipersempit ke remote workspace; sinkronisasi lokal dua arah ditunda.
- **Diubah:** FigCraft diakses melalui abstraksi Design Provider.
- **Diubah:** Pola branch menjadi `orbit/{PROJECT_KEY}-{number}-{slug}`.
- **Diubah:** Success Metrics dipisah menjadi Release Criteria dan Outcome Metrics.

> Catatan: angka yang ditandai **(default)** adalah nilai awal yang dapat dikonfigurasi. Angka yang ditandai **(target awal)** perlu divalidasi setelah Phase 1 berjalan.

---

## 1. Product Overview

ORBIT adalah platform untuk mengelola proyek, tenaga kerja manusia, dan AI Agent dalam satu ekosistem operasional yang terintegrasi.

ORBIT memungkinkan organisasi merencanakan proyek, menyusun struktur organisasi human dan AI Agent, mendistribusikan pekerjaan, menjalankan pekerjaan secara mandiri berdasarkan instruksi dan policy, berkolaborasi dalam desain dan pengembangan, serta menyimpan seluruh dokumen dan hasil pekerjaan secara terstruktur.

ORBIT bukan hanya project management tool, tetapi pusat koordinasi dan eksekusi pekerjaan antara manusia dan AI Agent.

**Core Product Statement:** ORBIT is the Operating System for AI-Powered Teams.

**Core Tagline:** Organize Projects. Clarify Tasks. Coordinate Agents. Communicate Directly. Design Live. Code Live. Store Everything. Ship Automatically — within policy. Optimize Tokens.

## 2. Product Vision

Membangun sistem operasional perusahaan yang memungkinkan manusia dan AI Agent bekerja sebagai satu workforce yang terorganisasi, dengan struktur pelaporan yang jelas seperti sebuah perusahaan.

Founder berfokus pada strategi dan keputusan penting. Product Owner mengatur distribusi pekerjaan dan kualitas hasil. Manager (human atau agent) mengawasi bawahannya. AI Agent menjalankan pekerjaan berdasarkan tanggung jawab, instruksi, skill, dan batasan yang telah ditentukan.

ORBIT harus mengelola proses dari perencanaan sampai delivery tanpa mengharuskan manusia mengatur setiap aktivitas secara manual, dan tanpa koordinasi berlebihan yang membuang token.

## 3. Product Goals

1. Mengelola seluruh proyek dalam satu platform.
2. Menjadikan task, tanggung jawab, progres, dan dependensi pekerjaan transparan.
3. Mengelola manusia dan AI Agent sebagai satu workforce dalam struktur organisasi yang jelas.
4. Memberi Founder kendali penuh atas agent apa yang ada (default 0 agent).
5. Memungkinkan AI Agent bekerja secara mandiri sesuai kebijakan dan instruksi.
6. Menjaga koordinasi dan pelaporan tetap ringkas, bernilai, dan hemat token.
7. Mengendalikan — bukan hanya memonitor — penggunaan token dan resource.
8. Mengintegrasikan GitHub untuk source control dan delivery.
9. Mendukung live design melalui FigCraft MCP.
10. Mendukung live coding melalui VS Code.
11. Menyediakan workspace terisolasi untuk setiap proyek.
12. Menyediakan penyimpanan dokumen permanen untuk setiap proyek.
13. Menyediakan komunikasi langsung antara human dan AI Agent melalui project chat.
14. Memastikan aktivitas AI hanya berjalan ketika ada trigger yang sah.

## 4. Product Scope

### 4.1 Initial Scope
Pengembangan awal berfokus pada pembangunan platform ORBIT itu sendiri.

### 4.2 Long-Term Scope
- Mengelola seluruh proyek EVORA.
- Mengelola shared specialists lintas proyek.
- Mendukung beberapa organisasi.
- Mengelola human dan AI workforce dalam struktur organisasi.
- Menyediakan project-level workspace dan document storage.
- Mengintegrasikan berbagai tools melalui MCP dan konektor.
- Mendukung autonomous project execution.

### 4.3 Delivery Phases
Sebuah fase dianggap selesai apabila acceptance criteria fase tersebut terpenuhi.

| Fase | Isi |
|---|---|
| **Phase 0 – Foundation** | Authentication, Organization (single-org, skema multi-org-ready), RBAC, Workforce, Organization Structure & Reporting Lines, Agent Builder, Agent Instruction Management, Project, Task beserta state machine. View: Backlog, Kanban, List. |
| **Phase 1 – Execution Core** | Claude Code runtime di Docker, Agent Execution Management, Project Workspace (Git worktree), GitHub Integration (branch, push, PR, CI status), Token Tracking & Budget Control, Project Chat dengan explicit invocation, Work Reports & Escalation. |
| **Phase 2 – Knowledge & Visibility** | Project Document Management, Skill Center, Notifications, Analytics. |
| **Phase 3 – Autonomy** | Fully Autonomous Mode, PO Agent, manager agent, auto-merge sesuai policy. |
| **Phase 4 – Live Collaboration & Scale** | VS Code Extension, FigCraft MCP, Timeline, Calendar, Gantt, Dependency Graph, multi-organization aktif. |

### 4.4 MVP Definition (keputusan Founder, 2026-11-25)
MVP menggabungkan Phase 0 dan Phase 1 dengan batasan berikut. Bagian ini mengesampingkan isi Phase 0–1 di atas bila bertentangan.

| Topik | Keputusan |
|---|---|
| Pengguna human | Hanya Founder. Peran yang aktif: Founder dan Member. Aturan izin Manager, PO, dan Viewer ditunda; jabatan tetap tersimpan sebagai data struktur organisasi. |
| Kriteria berhasil | Founder membuat task berisi acceptance criteria di Web UI → agent mengerjakannya di repo → agent membuka PR → Founder me-review. |
| Review | Founder me-review langsung di PR. Task Done setelah PR di-approve atau di-merge. PO Agent belum ikut alur review. |
| Hosting | 1 VPS dengan Docker (backend, Postgres, container agent) di `orbit.evora-studio.com`. |
| Autentikasi Claude | Langganan Claude milik Founder, dengan risiko ketentuan tercatat di ADR-0001 §3.8. Autentikasi dapat diganti ke API key. Budget dalam token. Execution paralel: 1. |
| Bahasa UI | Seluruh teks UI ORBIT memakai bahasa Inggris. |
| Web UI | Kanban, List, dan detail task (dengan panel execution live dan thread komentar/chat, Bagian 17.4); Project Chat dengan @mention agent; Agent Builder dan Org chart; Dashboard token serta execution log dengan tombol Stop. |
| Ditunda | Gantt, Timeline, Calendar, tampilan Dependency Graph, Document Storage, Skill Center, Notifications, FigCraft, VS Code, Row-Level Security multi-org, PO Agent, auto-merge. |
| Repo target | Repo sandbox khusus uji agent, diakses lewat GitHub App. |
| Target waktu | 4–6 minggu. |
| Login ORBIT | Email + password: hash argon2, pembatasan percobaan login (kunci sementara setelah 5 kali gagal), session cookie aman, reset password lewat perintah di server. 2FA (TOTP) menyusul sebelum ada pengguna kedua. |
| Struktur agent | Sesuai Bagian 8. Di MVP, reporting line dipakai untuk data dan org chart; seluruh eskalasi langsung ke Founder. Audit trail perubahan reporting line dan otorisasi per pelaku transisi ditunda (di MVP semua aksi dilakukan Founder). |
| Dependency | Data dan aturan dependency antar-task aktif di MVP (Bagian 14.3). Yang ditunda hanya tampilan Dependency Graph. |
| Agent template | Tidak ada. Org dimulai dengan 0 agent. |
| Agent Builder | Nama, jabatan, atasan (tetap dan per proyek), model, instruksi markdown, preset izin tool (`read-only` atau `coding`), batas token per execution. Memory, skill, MCP custom, dan authority limit ditunda. |
| Versi instruksi | Setiap simpan membuat versi baru; setiap execution mencatat versi yang dipakai. UI draft/publish, compare, dan restore ditunda. |
| Penugasan | Satu task dikerjakan satu agent. Tanpa handoff dan tanpa percakapan antar-agent. |
| Budget default | 300.000 token per execution, 3.000.000 token per hari (execution otomatis diblokir saat tercapai; execution yang dipicu Founder memerlukan konfirmasi), timeout 60 menit. |
| Bukti selesai | Agent wajib menjalankan test proyek bila ada dan menyertakan hasilnya di work report dan deskripsi PR. Jika test tetap gagal, PR dibuka sebagai draft dan task menjadi Blocked dengan alasan. |
| Chat | Agent di chat mana pun boleh mengubah kode, tetapi hanya saat dipanggil eksplisit oleh Founder. Perubahan kode dari chat yang tidak terhubung ke task otomatis membuat task ringan bertanda "dari chat" (acceptance criteria dari isi pesan, terhubung ke percakapan), lalu branch dan PR seperti biasa. |

### 4.5 Out of Scope (v1)
- JAPRI, PANTAU, dan EVORA Website.
- Billing atau penagihan ke pelanggan eksternal.
- Marketplace skill publik.
- Sinkronisasi workspace lokal dua arah tanpa Git.
- Agent bawaan yang dibuat otomatis oleh sistem.

## 5. Core Product Modules

1. Organization Management
2. Workforce Management
3. Organization Structure & Reporting Lines
4. Roles & Permissions
5. Agent Builder
6. Agent Instruction Management
7. Skill Center
8. Project Management
9. Task Management
10. Trigger & Autonomy Policy
11. Project Chat & Agent Invocation
12. Agent Execution Management
13. Budget & Cost Control
14. Project Workspace
15. Project Document Management
16. GitHub Integration
17. FigCraft MCP Integration
18. VS Code Integration
19. Notifications & Activity
20. Analytics & Token Monitoring
21. System Settings & Integration Management

## 6. Organization Management

Struktur: `Organization → Org Structure (Workforce & Reporting Lines) → Projects → Tasks`

Organization memiliki:
- Organization profile.
- Organization members.
- Organization structure (reporting lines).
- Organization policies.
- Workforce registry, agent registry, skill registry.
- Integration settings.
- Usage, budget, dan resource limits.
- Organization-level permissions.

Arsitektur harus multi-organization-ready meskipun implementasi awal hanya digunakan oleh EVORA Studio.

## 7. Workforce Management

Human dan AI Agent dikelola sebagai satu workforce.

Setiap workforce memiliki:
- Unique ID, name, profile.
- Type: `human` atau `agent`.
- Position / title dan responsibilities.
- Reports to: atasan tetap dan/atau atasan per proyek (lihat Bagian 8).
- Organization dan project assignments.
- Permissions dan authority limits.
- Availability dan workload.
- Activity history.

AI Agent merupakan subtype dari workforce. Agent profile terhubung 1:1 dengan workforce melalui relasi database.

### 7.1 Default: Zero Agents
- Organisasi baru dimulai **tanpa agent**. Workforce awal hanya Founder (human).
- Sistem tidak membuat agent secara otomatis.
- Founder menentukan sendiri agent apa yang dibutuhkan, termasuk posisinya dalam struktur organisasi.
- Di luar MVP, ORBIT boleh menyediakan **agent templates** (misalnya Frontend Engineer, QA, Product Owner) sebagai titik awal opsional. Template baru menjadi agent setelah Founder membuat dan mempublikasikannya secara eksplisit.
- Selama organisasi belum memiliki agent, seluruh fitur yang memerlukan agent menampilkan empty state dengan ajakan membuat agent, bukan error.

## 8. Organization Structure & Reporting Lines

### 8.1 Overview
Agent disusun dalam struktur organisasi seperti perusahaan. **Founder (human) adalah puncak struktur.** Jumlah agent yang melapor langsung ke Founder bebas, dan kedalaman struktur tidak dibatasi.

Reporting line memakai **model matriks**: satu agent boleh memiliki lebih dari satu atasan, dan atasan yang berlaku ditentukan oleh **proyek dari task yang sedang dikerjakan**.

Contoh:

```
              Founder (human)
             ┌──────┴──────┐
            CTO           CMO
        ┌───┴───┐
      PO 1     PO 2
        └───┬───┘
   Shared Specialist
   (proyek A → PO 1, proyek B → PO 2)
```

### 8.2 Aturan Struktural
- **Atasan tetap** disimpan di profil agent; **atasan per proyek** disimpan di penugasan proyek agent (`project assignment`).
- Agent tanpa atasan agent berarti melapor langsung ke Founder. Founder juga boleh dipilih secara eksplisit sebagai atasan.
- Atasan yang berlaku untuk sebuah task:
  1. Atasan pada penugasan proyek task tersebut, jika ada.
  2. Jika tidak ada, atasan tetap dari profil agent.
  3. Jika keduanya tidak ada, Founder.
- Reporting line tidak boleh membentuk siklus. Pengecekan memperhitungkan atasan tetap dan atasan per proyek.
- Agent yang masih memiliki bawahan (tetap atau per proyek) tidak dapat diarsipkan.
- Atasan dapat berupa human atau agent.
- Org chart menampilkan seluruh garis atasan; garis atasan per proyek diberi label nama proyek.
- Perubahan reporting line tercatat dalam history dan audit trail (ditunda di MVP).

### 8.3 Reporting Line vs Project Role
Dua jalur ini berbeda dan tidak boleh menghasilkan koordinasi ganda:

| Jalur | Fungsi |
|---|---|
| **Project role** (PO, assignee) | Koordinasi operasional task di dalam proyek: assignment, review, revisi. |
| **Reporting line** (atasan) | Pengawasan, eskalasi, keputusan di luar wewenang, dan ringkasan kinerja. |

Satu work report ditulis **sekali** dan hanya diarahkan ke **atasan yang berlaku untuk proyek task tersebut** (aturan 8.2), bukan ke seluruh atasan agent. Report tidak dikirim ulang ke masing-masing pihak.

### 8.4 Authority Limits
Setiap posisi memiliki batas wewenang, misalnya:
- Budget token yang boleh disetujui.
- Jenis task yang boleh di-approve.
- Boleh atau tidaknya melakukan merge.
- Boleh atau tidaknya meng-assign task ke bawahan.

Atasan hanya dapat mendelegasikan pekerjaan kepada bawahannya (langsung atau tidak langsung) yang memiliki akses ke proyek terkait. Bawahan tidak dapat diberi wewenang melebihi atasannya.

### 8.5 Lean Coordination (Prinsip Utama)
Struktur organisasi ada untuk kejelasan tanggung jawab, **bukan** untuk menambah percakapan antar-agent. Setiap pelaporan dan koordinasi harus singkat, padat, dan bernilai.

1. **Report by exception.** Tidak ada laporan jika tidak ada perubahan yang relevan. *No news is no report.*
2. **Report dihasilkan di dalam execution yang sama.** Ringkasan report merupakan bagian dari output akhir execution, bukan invocation LLM terpisah.
3. **Report adalah data, bukan pemicu.** Report tersimpan sebagai record. Atasan agent **tidak** dijalankan hanya karena menerima report.
4. **Roll-up deterministik.** Agregasi status ke level atas (jumlah task, progres, biaya, blocker) dihitung oleh sistem tanpa LLM. Ringkasan berbasis LLM hanya dibuat atas permintaan eksplisit.
5. **Eskalasi langsung ke pihak berwenang.** Eskalasi diarahkan ke atasan terdekat yang memiliki wewenang untuk memutuskan, tanpa melewati setiap level satu per satu dengan reasoning LLM.
6. **Tidak ada rapat atau check-in antar-agent** yang terjadwal secara default.
7. **Digest berkala nonaktif secara default.** Founder dapat mengaktifkannya; digest default disusun secara deterministik.

### 8.6 Work Report Format
Work report memiliki skema terstruktur dengan batas panjang:

| Field | Isi | Batas |
|---|---|---|
| `outcome` | Hasil yang dicapai | ≤ 3 kalimat |
| `status` | Done / In Progress / Blocked / Needs Decision | enum |
| `blockers` | Hambatan, jika ada | ≤ 3 butir |
| `decision_needed` | Keputusan yang dibutuhkan dari atasan, jika ada | ≤ 1 pertanyaan yang jelas |
| `artifacts` | Referensi PR, dokumen, desain | link |
| `cost` | Token dan estimasi biaya | otomatis dari sistem |

Report yang melebihi batas ditolak oleh validasi dan dipotong atau diminta diringkas.

### 8.7 Escalation Rules
Eskalasi dibuat hanya jika:
- Task berstatus Blocked dan tidak dapat diselesaikan oleh assignee atau PO.
- Dibutuhkan keputusan di luar authority limit.
- Budget tercapai.
- Batas siklus revisi terlampaui.
- Terjadi masalah keamanan atau akses.

Di MVP, seluruh eskalasi langsung ke Founder. Alur bertingkat di bawah ini aktif mulai Phase 3.

Alur eskalasi:
1. Sistem mencari atasan terdekat yang berlaku untuk proyek task tersebut dan memiliki wewenang atas jenis keputusan itu.
2. Jika atasan itu human, dibuat notifikasi dan approval request.
3. Jika atasan itu agent, agent tersebut dipanggil **satu kali** dengan payload eskalasi terstruktur (bukan seluruh riwayat).
4. Jika agent tidak dapat memutuskan, eskalasi naik ke level berikutnya.
5. Jumlah hop eskalasi dibatasi (nilai ditetapkan sebelum Phase 3; lihat Open Questions). Eskalasi yang mencapai Founder tidak dapat naik lagi.

## 9. Roles & Permissions

### 9.1 Roles
- **Founder:** pemilik organisasi dan puncak struktur organisasi.
- **Manager:** workforce yang memiliki bawahan (human atau agent).
- **Product Owner (PO):** koordinator operasional task dalam proyek (human atau agent).
- **Member:** human yang berkontribusi pada proyek.
- **Viewer:** akses baca.
- **Agent:** AI workforce dengan izin sesuai konfigurasi.

### 9.2 Permission Matrix

| Aksi | Founder | Manager | PO | Member | Viewer | Agent |
|---|---|---|---|---|---|---|
| Buat proyek | ✓ | – | – | – | – | – |
| Buat dan kelola agent | ✓ | bawahan sendiri* | – | – | – | – |
| Ubah struktur organisasi | ✓ | – | – | – | – | – |
| Kelola instruksi agent | ✓ | bawahan sendiri | – | – | – | – |
| Assign task | ✓ | ke bawahan | ✓ | – | – | PO/Manager Agent** |
| Invoke agent di chat | ✓ | ✓ | ✓ | ✓ | – | – |
| Approve (Founder gate) | ✓ | – | – | – | – | – |
| Aktifkan Autonomous Mode | ✓ | – | – | – | – | – |
| Atur budget | ✓ | dalam authority limit | – | – | – | – |
| Merge / auto-merge policy | ✓ | sesuai authority | ✓ | – | – | sesuai policy |

\* Jika diizinkan Founder. \*\* Hanya jika Autonomous Mode aktif dan dalam authority limit.

## 10. Agent Builder

Setiap agent dapat dikonfigurasi melalui:
- Name, identity, position.
- Reports to: atasan tetap dan/atau atasan per proyek. Jika kosong, agent melapor langsung ke Founder.
- Role dan job description.
- Responsibilities dan authority limits.
- Model configuration.
- System instructions.
- Skills.
- Tools dan MCP access.
- Permissions.
- Memory configuration.
- Project assignments.
- Execution policy dan budget.
- Workload, token usage, activity history.

**Memory configuration:**
- **Project memory:** catatan persisten per proyek di `.orbit/project-context`.
- **Agent memory:** catatan milik agent lintas proyek, tanpa data proyek atau organisasi lain.
- **Conversation summary.**

Memory tidak boleh membawa informasi melewati batas proyek atau organisasi.

**Agent lifecycle:** Draft → Configuring → Ready → Active → Paused → Error → Archived

- Agent berstatus Draft atau Configuring otomatis menjadi Ready saat task-nya masuk Assigned, baik karena perintah Founder maupun otomatis lewat dependency.
- Agent berstatus Paused, Error, atau Archived tidak dapat menerima task.
- Assignee harus ditugaskan ke proyek task tersebut.

Agent hanya dapat menjalankan pekerjaan sesuai izin, instruksi, project assignment, dan authority limit yang berlaku. Mengarsipkan agent yang memiliki bawahan mengharuskan bawahannya dipindahkan ke atasan lain terlebih dahulu.

## 11. Agent Instruction Management

Fitur:
- Markdown editor dan instruction templates.
- Draft dan publish.
- Version history, compare, restore.
- Execution instruction snapshot.
- Instruction validation.

**Instruction precedence:**
1. Platform Safety & Runtime Restrictions.
2. Organization Policies.
3. Agent Instructions.
4. Project Context.
5. Task Instructions.
6. Skill Procedures.

Setiap execution menggunakan snapshot instruksi agar perubahan instruksi di tengah pekerjaan tidak mengubah konteks execution yang sedang berjalan.

## 12. Skill Center

Fitur:
- Upload skill ZIP dan import melalui Git.
- Mendukung `SKILL.md` beserta references, scripts, dan assets.
- Skill versioning, compatibility validation, dependency management, checksum verification.
- Agent skill assignment, activation, deactivation.
- Skill usage tracking.

Ketentuan:
- Skill yang diunggah dianggap untrusted sampai divalidasi.
- Memiliki skill tidak otomatis memberikan izin menggunakan tools.
- Agent hanya dapat menggunakan skill yang diizinkan.
- Skill dimuat secara on-demand untuk efisiensi context.
- Paket skill disimpan dalam immutable object storage; database hanya menyimpan metadata dan referensi.

## 13. Project Management

### 13.1 Project Structure
`Organization → Project → Initiative/Epic → Feature/Story → Task → Subtask`

### 13.2 Project Information
- Name, description, **project key** unik per organisasi (misalnya `ORB`; 2–10 karakter huruf kapital atau angka, diawali huruf).
- Owner, Product Owner, members, assigned agents.
- Repository, workspace, document storage, design workspace, development workspace.
- Milestones, priorities, deadlines, status.
- Autonomy mode dan budget proyek.
- Project documentation.

### 13.3 Project Views
Phase 0–1: Overview, Backlog, Kanban, List, Team / Workforce, Chat, Activity.
Phase 2: Documents, Repository / Branches, Analytics.
Phase 4: Timeline, Calendar, Gantt, Dependency Graph, Design Workspace, Development Workspace.

## 14. Task Management

### 14.1 Task Types
Initiative, Epic, Feature, Story, Task, Subtask, Bug, Technical Debt, Improvement, Research, Milestone.

### 14.2 Task Information
Task ID (`{PROJECT_KEY}-{number}`), title, description, project, type, priority, status, assignee, reporter, due date, acceptance criteria, approval gate, dependencies, repository/branch/workspace/design/document references, attachments, comments (thread task, Bagian 17.4), activity history, execution records, work reports.

Task wajib memiliki acceptance criteria sebelum execution, kecuali pekerjaan eksploratif yang secara eksplisit ditandai tidak memerlukannya.

### 14.3 Task Dependencies
- Task boleh bergantung pada task lain dalam organisasi yang sama, termasuk lintas proyek. Dependency tidak boleh membentuk siklus.
- Dependency hanya dapat ditambahkan ke task yang berstatus Backlog.
- Task tidak dapat masuk Assigned selama masih ada dependency yang belum Done.
- Saat dependency terakhir menjadi Done atau dihapus, sistem otomatis memindahkan task ke Assigned dan agent-nya otomatis menjadi Ready, asalkan task memiliki acceptance criteria dan assignee yang tersedia. Jika belum, task menunggu di Backlog dan otomatis maju begitu Founder melengkapinya.
- Dependency yang Cancelled tidak dihitung Done. Founder memutuskan dengan menghapus dependency tersebut.
- Task tanpa dependency hanya dipindah secara manual oleh Founder.
- Perpindahan otomatis berhenti di Assigned. Mulai bekerja (In Progress) menunggu runtime agent (ADR-0001).

## 15. Task Workflow & Approval

### 15.1 State Machine

**MVP (berlaku sekarang, sesuai Bagian 4.4):**

| Dari | Ke | Pelaku | Syarat |
|---|---|---|---|
| Backlog | Assigned | Founder / system (dependency) | Acceptance criteria wajib (kecuali task eksploratif yang ditandai), assignee wajib, semua dependency Done |
| Assigned | In Progress | Assignee / system | Execution dimulai |
| In Progress | Founder Approval | Assignee | URL PR wajib; Founder me-review di PR |
| Founder Approval | Done | Founder | – |
| Founder Approval | Revision | Founder | Feedback wajib; jumlah revisi dihitung |
| Revision | Founder Approval | Assignee | Revisi diserahkan |
| * (kecuali Done/Cancelled) | Blocked | Founder / Assignee | Alasan wajib |
| Blocked | status sebelumnya | Founder | Hanya kembali ke status sebelum Blocked |
| * (kecuali Done/Cancelled) | Cancelled | Founder | Alasan wajib |

PO Review belum dipakai di MVP. Batas 3 siklus revisi (15.4) belum ditegakkan di MVP.

**Target (Phase 3, dengan PO):**

| Dari | Ke | Pelaku | Syarat |
|---|---|---|---|
| Backlog | Assigned | PO / Manager | Acceptance criteria terisi |
| Assigned | In Progress | Assignee / system | Execution dimulai |
| In Progress | PO Review | Assignee | Hasil dan work report diserahkan |
| PO Review | Revision | PO | Feedback terstruktur wajib |
| Revision | PO Review | Assignee | Revisi diserahkan |
| PO Review | Founder Approval | PO | Task memiliki approval gate |
| PO Review | Done | PO | Tidak ada approval gate |
| Founder Approval | Done | Founder | – |
| Founder Approval | Revision | Founder | Feedback terstruktur wajib |
| * (kecuali Done/Cancelled) | Blocked | Assignee / PO / Manager | Alasan wajib |
| Blocked | status sebelumnya | Pihak yang berwenang | Blocker terselesaikan |
| * (kecuali Done/Cancelled) | Cancelled | PO / Founder | Alasan wajib |

### 15.2 Mode
- **Human Approval Mode:** task dengan approval gate melewati Founder Approval.
- **Fully Autonomous Mode:** PO dapat berupa AI Agent. Jika acceptance criteria terpenuhi dan tidak ada approval gate, task dapat diselesaikan otomatis.

### 15.3 Approval Gate
Approval gate dikonfigurasi per proyek dan dapat di-override per tipe task atau per task. Contoh default yang disarankan: perubahan production, security, billing, dan penghapusan data.

### 15.4 Revision Rules
- Task ID, assignee, branch, dan workspace tetap sama selama revisi (kecuali reassignment).
- Agent menerima feedback terstruktur dan mengerjakan revisi berdasarkan feedback dan acceptance criteria.
- Maksimal **(default) 3 siklus revisi**; jika terlampaui, task dieskalasi sesuai Bagian 8.7.

Execution completed tidak otomatis berarti task Done.

## 16. Trigger & Autonomy Policy

### 16.1 Trigger yang Sah
Setiap execution wajib memiliki trigger yang sah dan tercatat.

| Trigger | Contoh | Syarat |
|---|---|---|
| Human chat invocation | `@Frontend Agent ...` | Human memiliki akses proyek |
| Human explicit action | Tombol Run, Retry, Continue | Permission user |
| Task assignment ke agent | PO meng-assign task | Acceptance criteria tersedia |
| Workflow transition | Task masuk PO Review → PO Agent dipanggil | Autonomous Mode aktif |
| Escalation | Eskalasi ke manager agent | Sesuai Bagian 8.7 |
| Dependency Done | Dependency terakhir Done → task Backlog → Assigned | Aktif di MVP tanpa project policy; sesuai Bagian 14.3 |
| Integration event | CI selesai | Didefinisikan dalam project policy |

### 16.2 Autonomy Root
Setiap trigger otomatis harus dapat ditelusuri ke keputusan human, yaitu human yang mengaktifkan Autonomous Mode pada organisasi, proyek, atau task tersebut.

### 16.3 Batas Otomatis
- Maksimal siklus revisi per task: **(default) 3**.
- Maksimal kedalaman chain execution: **(default) 5**.
- Mention di dalam output agent **tidak** memicu agent lain.
- Work report tidak memicu execution.
- Kill switch tersedia per task, proyek, dan organisasi untuk menghentikan seluruh execution otomatis seketika.

## 17. Project Chat & Agent Invocation

### 17.1 Prinsip
**Nothing happens until a human initiates an interaction.** Tidak ada aktivitas agent hanya karena human membuka, membaca, me-refresh, atau membiarkan chat terbuka.

### 17.2 Chat Scope
Setiap proyek memiliki ruang chat yang terhubung dengan project context, menyediakan: percakapan human–agent, invocation via mention atau agent selector, pemilihan agent yang memiliki akses ke proyek, percakapan multi-agent bila diizinkan, task linking, context linking, file dan document references, riwayat dan pencarian percakapan, execution status, dan response streaming.

Agent hanya boleh mengakses informasi, dokumen, task, dan workspace yang diizinkan untuknya.

### 17.3 Agent Invocation
Human dapat memanggil agent melalui mention `@AgentName`, agent selector, percakapan langsung, atau task-linked chat.

Alur:
1. Mengidentifikasi agent yang dipanggil.
2. Memeriksa akses agent terhadap proyek.
3. Mengidentifikasi task yang dikaitkan.
4. Menyusun context yang relevan secara selektif.
5. Memeriksa budget.
6. Mengirim instruksi kepada agent dan memulai execution bila diperlukan.
7. Menampilkan respons dan status execution di chat.

Mention tidak boleh menjadi mekanisme untuk melewati permission system.

**Multi-agent:** jika satu pesan me-mention beberapa agent, setiap agent menjalankan invocation terpisah dengan execution ID masing-masing. Agent tidak dapat memanggil agent lain melalui mention di responsnya.

### 17.4 Task-Linked Chat
Chat dapat dihubungkan ke task. Agent memperoleh task context yang relevan (description, acceptance criteria, dependencies, status, dokumen yang diizinkan). Task-linked chat tidak otomatis mengubah status task.

**Komentar task adalah chat.** Setiap task memiliki satu thread yang sekaligus menjadi kolom komentar dan task-linked conversation. Tidak ada sistem komentar terpisah.

**Panel execution live di detail task.** Saat task memiliki execution yang berjalan, halaman detail task menampilkan:
- Status execution dan langkah yang sedang dikerjakan.
- Output agent secara streaming.
- Ringkasan tool yang dipanggil (misalnya file yang diubah, perintah yang dijalankan).
- Pemakaian token berjalan terhadap batas execution.
- Tombol Stop.

Riwayat execution sebelumnya tetap dapat dibuka dari detail task.

**Komentar saat execution berjalan:**
- Komentar yang me-mention assignee yang sedang bekerja dikirim ke execution yang berjalan sebagai instruksi tambahan. Tidak dibuat execution baru.
- Komentar yang me-mention agent lain memulai invocation baru sesuai aturan chat.
- Komentar tanpa mention hanya tersimpan sebagai catatan. Agent tidak membacanya sampai dipanggil berikutnya.
- Membuka detail task atau melihat panel live tidak memicu aktivitas agent (Bagian 17.5).

Setiap pesan atau execution yang relevan dapat merujuk Project ID, Task ID, Agent ID, Conversation ID, dan Execution ID.

### 17.5 Trigger yang Tidak Sah di Chat
Membuka chat, berpindah ruang chat, membaca pesan, membiarkan chat terbuka, refresh, status online, perubahan state UI tanpa instruksi, atau tidak ada pesan baru dari human.

Sistem tidak boleh mengasumsikan setiap pesan harus dijawab agent; agent harus dipanggil secara eksplisit.

### 17.6 No Background Agent Activity
- Tidak ada autonomous chat polling atau agent yang membaca percakapan secara berkala.
- Tidak ada auto-response atau auto-execution tanpa human trigger.
- Tidak ada background reasoning tanpa instruksi baru.
- Tidak ada pengiriman ulang seluruh riwayat chat saat halaman dibuka.
- Tidak ada penggunaan token saat chat idle.
- Tidak ada agent-to-agent conversation yang dimulai karena tidak ada aktivitas human.

Proses teknis (penyimpanan pesan, koneksi, pembaruan tampilan) tetap boleh berjalan tetapi tidak boleh memicu reasoning atau execution agent.

### 17.7 Conversation Context Management
- Jangan mengirim seluruh dokumen proyek di setiap pesan.
- Jangan membaca ulang seluruh conversation tanpa kebutuhan.
- Gunakan context retrieval selektif dan conversation summary bila riwayat terlalu panjang.
- Simpan conversation history secara persisten.
- Pisahkan conversation context dari task execution context.
- Setiap execution memiliki context snapshot yang dapat diaudit.

### 17.8 Chat & Task Relationship
Chat dan task adalah entitas berbeda. Percakapan tidak otomatis menjadi task; human dapat membuat task dari percakapan melalui tindakan eksplisit. Satu task dapat memiliki beberapa percakapan terkait.

### 17.9 Chat Interface
Conversation sidebar, message history, composer, agent mention/selector, task selector, task reference card, file attachment, document reference, agent response, execution status, token usage per respons, Stop, Retry, dan conversation search.

Chat menampilkan dengan jelas agent yang dipanggil, task yang menjadi konteks, dan apakah agent sedang menjalankan execution atau hanya merespons.

## 18. Agent Execution Management

### 18.1 Runtime
Execution runtime menggunakan **Claude Agent SDK (Python)** yang dijalankan oleh ORBIT Runner di dalam container Docker terisolasi per execution — lihat [ADR-0001](adr/0001-agent-execution-runtime.md). UI ORBIT tidak menyebut dirinya "Claude Code"; label yang diperbolehkan misalnya "Powered by Claude".

- Autentikasi menggunakan **langganan Claude (subscription) milik Founder**, sesuai Bagian 4.4 dan ADR-0001 §3.8; risiko ketentuannya tercatat di ADR tersebut. **API key organisasi** (Claude API, atau penyedia cloud yang mendukung) tetap menjadi opsi pengganti melalui konfigurasi Runner, tanpa perubahan kode agent.
- Permission ORBIT dipetakan ke tool allowlist, MCP allowlist, dan network egress allowlist di runtime.
- Runtime tidak boleh mengubah business state database secara langsung; semua perubahan melalui backend API dan validasi business rules.

### 18.2 Execution Record
Execution ID, Agent ID, Project ID, Task ID (jika ada), trigger source, autonomy root, parent execution (jika chain), input instruction, context snapshot, skill manifest, tool permissions, workspace reference, status, token usage, budget, start/completion timestamps, output, work report, error details.

### 18.3 Lifecycle
`Queued → Preparing Context → Running → Waiting for Input → Completed / Failed / Cancelled / Suspended`

**Waiting for Input:** jika tidak ada respons dalam **(default) 30 menit**, execution berpindah ke Suspended: state disimpan dan container dihentikan. Execution dapat di-resume oleh human.

## 19. Budget & Cost Control

- Budget token dan biaya dapat ditetapkan per execution, agent, proyek, dan organisasi per periode.
- Budget execution tercapai → execution dihentikan dengan status `Failed (Budget Exceeded)`.
- Budget proyek mencapai 80% → peringatan. Mencapai 100% → execution otomatis baru diblokir; execution yang dipicu human memerlukan konfirmasi.
- Timeout maksimum per execution: **(default) 60 menit**.
- Deteksi loop: aksi atau output berulang tanpa progres menghentikan execution.
- Model dipilih per agent atau per tipe task; default memakai model paling efisien yang memenuhi kebutuhan.
- Token yang dipakai untuk koordinasi (eskalasi, review, report) tercatat terpisah agar overhead koordinasi dapat dipantau.

## 20. Project Workspace

Setiap proyek wajib memiliki workspace terisolasi yang dibuat otomatis saat proyek dibuat.

Logical structure:

```
ORBIT/
└── organizations/
    └── evora-studio/
        └── projects/
            └── {PROJECT_KEY}/
                ├── workspace/
                └── documents/
```

Implementasi fisik dapat menggunakan local disk, remote workspace host, atau object storage.

Workspace berisi repository, source code, development resources, project configuration, runtime artifacts, agent workspace state, `.orbit/project-context`, dan workspace metadata.

### 20.1 Lifecycle
`Provisioning → Ready → Active → Idle → Syncing → Recovery → Error → Archived`

Workspace yang diarsipkan tidak langsung dihapus; penghapusan memerlukan retention policy dan konfirmasi pihak berwenang.

### 20.2 Isolation
- Setiap proyek memiliki workspace terpisah; agent hanya mengakses workspace yang diizinkan.
- File events tercatat; concurrent modification terdeteksi; perubahan tidak boleh ditimpa diam-diam.
- Execution paralel menggunakan Git worktrees atau execution overlays.

### 20.3 Sumber Kebenaran File

| Jenis | Sumber kebenaran |
|---|---|
| Source code | Git repository |
| Dokumen dan deliverables | Document Storage (object storage berversi) |
| File kerja sementara | Workspace (dapat di-reset) |

Output agent di workspace menjadi dokumen permanen hanya melalui aksi **Promote to Documents**, baik eksplisit maupun yang didefinisikan dalam task.

## 21. Project Document Management

Document storage permanen per proyek, terpisah secara fungsi dari workspace.

Struktur default:

```
documents/
├── README.md
├── requirements/
├── planning/
├── architecture/
├── design/
├── development/
├── research/
├── reports/
├── deliverables/
├── meeting-notes/
└── archive/
```

Agent dapat membuat, membaca, mengedit, memindahkan dokumen, membuat folder, mengelola versi, menghubungkan dokumen dengan task, serta menghasilkan laporan dan deliverables — sesuai permission.

Format: Markdown, TXT, RST, HTML, XML, DOCX, XLSX, PPTX, PDF, CSV, JSON, YAML, TOML, PNG, JPG, SVG, PY, TS, TSX, JS, CSS, SQL, SH, dan binary lain sesuai batasan keamanan dan ukuran.

Metadata: Document ID, Organization ID, Project ID, file name, file type, storage reference, folder path, created/updated by, related task, related execution, version, file size, checksum, timestamps.

Fitur: version history, compare (format yang didukung), restore, audit trail, file locking, conflict detection, pencarian (filename, folder, type, project, task, metadata, extracted content), preview, upload, download, rename, move, delete berdasarkan permission.

Dokumen tetap tersedia meskipun runtime atau workspace di-reset.

## 22. GitHub Integration

GitHub App menjadi metode autentikasi utama. Fitur: repository connection, branch management, commit and push, pull request, CI status, merge management, repository permissions, commit dan PR references.

Pola branch: `orbit/{PROJECT_KEY}-{number}-{slug}`, contoh `orbit/ORB-123-create-landing-page`.

Ketentuan:
- Revisi menggunakan branch yang sama.
- Task Done memicu GitHub synchronization sesuai policy; proses idempotent.
- Jika dependencies belum selesai, branch dapat di-push tetapi merge ditunda; setelah selesai, integrasi dievaluasi ulang.
- Jika CI lolos, tidak ada conflict, dan policy mengizinkan, ORBIT dapat membuat/memperbarui PR dan merge otomatis.
- ORBIT tidak boleh melewati branch protection atau required approvals.
- Merge conflict menghentikan proses dan menandai Integration Blocked.

Task Done dan GitHub Merged adalah status berbeda.

GitHub status: Not Required, Branch Pending, Branch Ready, Push Pending, Pushed, PR Pending, Checks Running, Ready to Merge, Waiting for Dependencies, Merged, Integration Blocked, Push Failed, Merge Failed.

## 23. FigCraft MCP Integration

Integrasi desain diimplementasikan melalui abstraksi **Design Provider**. FigCraft MCP (https://getartcraft.com/apps/figcraft) adalah provider pertama; provider lain dapat ditambahkan tanpa mengubah modul task atau dokumen.

Dukungan: attached mode, headless mode, MCP connection management, local authenticated bridge, session management, health monitoring, permission management.

Operasi desain sesuai tools yang tersedia di MCP: create/edit design documents dan frames, layers, layout, typography, colors, components, prototype, inspect, render, screenshot, export.

Design deliverables dapat dihubungkan dengan task dan disimpan sebagai project artifacts atau document references. ORBIT tidak boleh mengasumsikan fitur tersedia jika MCP server tidak menyediakan tool terkait.

## 24. VS Code Integration

**v1:** human terhubung ke workspace yang dikelola ORBIT melalui VS Code Remote-SSH atau Dev Container — workspace yang sama dengan yang dipakai agent. VS Code Extension menyediakan:
- Authenticated workspace bridge.
- Project dan task context.
- Agent execution visibility dan kontrol (stop, handoff).
- Live file change detection, file ownership, conflict detection.
- Task status dan handoff notification.

Human tidak perlu push/pull GitHub hanya agar perubahan terlihat oleh agent. GitHub tetap menjadi source control dan delivery mechanism.

**Later:** local workspace dengan sinkronisasi dua arah.

Akses dibatasi berdasarkan project scope, user permission, dan execution permission.

## 25. Communication & Coordination Principles

- **Lean Coordination:** singkat, padat, bernilai (Bagian 8.5).
- PO menjadi pusat koordinasi operasional task; reporting line untuk pengawasan dan eskalasi.
- Founder berfokus pada keputusan strategis dan approval.
- Agent tidak melakukan komunikasi agent-to-agent tanpa kebutuhan yang didefinisikan policy.
- Handoff, report, dan eskalasi menggunakan payload terstruktur.
- Hindari mengirim seluruh conversation history sebagai context.
- Hindari polling; tidak ada background reasoning tanpa trigger yang sah.
- Project Chat hanya menjalankan agent ketika human secara eksplisit memulai interaksi.
- Task workflow, chat workflow, dan reporting line dibedakan dengan jelas.

## 26. Notifications & Activity

Notifikasi untuk: task assignment, handoff, review request, revision request, approval request, escalation, execution completion/failure, budget warning, workspace error, GitHub integration status, document updates, agent status changes, perubahan reporting line.

Notifikasi tidak menjadi pemicu execution agent kecuali didefinisikan sebagai workflow trigger yang diizinkan.

## 27. Analytics & Token Monitoring

- Token usage per agent, proyek, execution, dan per cabang struktur organisasi (roll-up).
- Model usage, execution duration, success/failure rate.
- Agent workload dan task completion.
- **Coordination overhead:** persentase token untuk review, report, dan eskalasi dibanding token untuk pekerjaan.
- Resource consumption dan cost estimation.

Chat analytics membedakan human messages, agent responses, agent executions, token usage, dan idle conversations. Membuka atau membaca chat tidak boleh menghasilkan token usage.

## 28. Technical Architecture

### 28.1 Technology Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, Python, PostgreSQL, SQLAlchemy 2, Alembic |
| Background Processing | Redis, Dramatiq, durable job queue |
| Real-time | SSE untuk streaming respons dan update execution; WebSocket hanya bila dibutuhkan interaksi dua arah (presence, file lock) |
| AI Runtime | Claude Code (Agent SDK atau headless CLI), Docker isolated runtime |
| Integration | GitHub App/API, Git CLI, FigCraft MCP, VS Code Extension, authenticated workspace bridge |
| Storage | PostgreSQL untuk metadata; object storage untuk dokumen, artifacts, dan skill packages |
| Observability | OpenTelemetry, structured logs, execution tracing, audit logs |
| Deployment | Docker, Nginx |

### 28.2 Architecture Principles
Modular monolith untuk core application; distributed workers untuk background processing dan execution; event-driven; durable queues; transactional outbox; idempotent operations; multi-tenant Row-Level Security; centralized authorization; audit trail; secure runtime isolation.

### 28.3 Chat Architecture

```
Human → Project Chat → Message API → Authorization & Invocation Validation
      → Budget Check → Conversation Context Assembly → Execution Queue
      → Claude Code Runtime → Agent Response → Chat Message & Execution Update
```

Saat chat idle: tidak ada invocation, execution, reasoning, maupun konsumsi token agent.

### 28.4 Database Architecture
Selain tabel inti organization, project, workforce, agents, tasks, executions, skills, dan integrations:

**Organization Structure:** `workforce_reporting_lines` (dengan riwayat), `positions`, `authority_limits`, `work_reports`, `escalations`.

**Chat:** `conversations`, `conversation_members`, `conversation_messages`, `conversation_task_links`, `conversation_agent_invocations`, `message_attachments`.

**Workspace:** `project_workspaces`, `workspace_sessions`, `workspace_file_events`.

**Documents:** `project_document_folders`, `project_documents`, `project_document_versions`, `project_document_permissions`, `project_document_events`.

**Budget:** `budgets`, `budget_usage_events`.

Seluruh entitas memiliki relasi organization dan project yang sesuai serta menerapkan tenant isolation.

## 29. Security & Permissions

- Organization isolation dan project-level access control.
- Agent-level tool permissions dan authority limits.
- Workspace, document, chat, dan MCP access control.
- Secret management dan secure execution environment.
- Audit logging.

Agent tidak mendapat akses tambahan karena dipanggil melalui chat atau karena posisinya dalam struktur organisasi; posisi hanya memberikan wewenang yang dikonfigurasi secara eksplisit.

Setiap invocation memeriksa identitas human, akses proyek, akses agent, task permission, tool permission, dan budget.

### 29.1 Threat Model & AI Security
- Konten dari dokumen, repository, chat, issue, dan web diperlakukan sebagai **data, bukan instruksi** (mitigasi prompt injection).
- Tool permission dan MCP access ditegakkan di **runtime layer**, bukan hanya melalui instruksi.
- Container execution menggunakan network egress allowlist per proyek.
- Secret diinjeksi saat runtime dan tidak boleh tersimpan di workspace, log, context snapshot, maupun output agent.
- Local bridge (FigCraft, VS Code) menggunakan token berumur pendek yang terikat ke user dan proyek.

## 30. Non-Functional Requirements

| Aspek | Requirement |
|---|---|
| Skala | (target awal) ≥ 10 execution bersamaan, ≥ 20 proyek, ≥ 50 workforce |
| Latensi | (target awal) Token pertama respons agent di chat ≤ 3 detik setelah execution berjalan |
| Stop | Stop execution menghentikan konsumsi token ≤ 5 detik |
| Backup | Backup database harian, point-in-time recovery 7 hari |
| Retensi | (default) Audit log ≥ 1 tahun; context snapshot ≥ 90 hari; workspace diarsipkan ≥ 30 hari sebelum boleh dihapus |
| Upload | (default) Maksimal 100 MB per file |

## 31. Domain & System Identity

ORBIT adalah nama resmi platform. Primary domain: `orbit.evora-studio.com`.

Tahap awal menggunakan satu domain dengan routing berbasis path (`/api`, `/files`). Subdomain berikut dipisah hanya bila ada kebutuhan skala atau keamanan:
- `api.orbit.evora-studio.com` — Backend API.
- `auth.orbit.evora-studio.com` — Authentication service.
- `files.orbit.evora-studio.com` — File and document access.

Seluruh interface, dokumentasi, branding, dan notifikasi menggunakan nama ORBIT. Seluruh teks UI dan notifikasi menggunakan bahasa Inggris. Nama PLAN tidak lagi digunakan.

## 32. Success Metrics

### 32.1 Release Criteria
1. Project dapat dibuat dan dikelola secara terstruktur.
2. Setiap proyek memiliki workspace dan document storage permanen.
3. Human dan agent dikelola melalui unified workforce dalam struktur organisasi.
4. Organisasi baru dimulai dengan 0 agent dan Founder dapat membuat agent sendiri.
5. Founder adalah puncak struktur; atasan yang berlaku untuk setiap task dapat ditentukan (per proyek → tetap → Founder).
6. Agent dapat menerima dan menyelesaikan task sesuai workflow.
7. Revision dan approval berjalan tanpa membuat task duplikat.
8. Human dapat memanggil agent melalui project chat; chat dapat dihubungkan dengan task.
9. Agent tidak berjalan ketika chat idle atau tanpa trigger sah.
10. Human dan agent dapat berkolaborasi melalui VS Code.
11. Agent dapat melakukan desain melalui FigCraft MCP.
12. GitHub integration mendukung source control dan delivery.
13. Token usage dan execution dapat dimonitor dan dibatasi.
14. Tidak terjadi akses lintas proyek tanpa izin.

### 32.2 Outcome Metrics (target awal)
- ≥ 70% task agent lolos PO Review tanpa revisi.
- Rata-rata siklus revisi ≤ 1,5 per task.
- Cycle time Assigned → Done turun ≥ 30% dibanding baseline manual.
- Coordination overhead ≤ 15% dari total token.
- Biaya token per task Done berada di bawah target per tipe task.
- Token agent saat chat idle = 0, diverifikasi otomatis dari log execution.
- Insiden akses lintas proyek = 0.

## 33. Acceptance Criteria — Project Chat

- Setiap proyek memiliki ruang chat; human dapat mengirim pesan dan melihat riwayat.
- Human dapat memanggil agent melalui mention atau agent selector; agent harus memiliki akses proyek.
- Chat dapat dihubungkan dengan task dan agent menerima task context yang relevan.
- Chat dan task memiliki identitas serta lifecycle masing-masing.
- Human dapat melihat status execution dan token usage dari chat; agent merespons melalui chat.
- Tidak ada invocation karena chat dibuka, di-refresh, atau tanpa instruksi human.
- Tidak ada background polling, auto-response, atau token usage saat idle.
- Mention di dalam respons agent tidak memicu invocation.
- Tidak ada agent-to-agent conversation tanpa trigger dan policy yang sah.
- Setiap invocation dibatasi budget execution.
- Stop menghentikan execution dan konsumsi token ≤ 5 detik.
- Seluruh invocation dan execution tercatat dalam audit trail; permission dan project isolation tetap berlaku.

## 34. Acceptance Criteria — Organization Structure & Reporting

- Organisasi baru memiliki 0 agent; hanya Founder yang ada di workforce, sebagai puncak struktur.
- Tidak ada agent yang dibuat otomatis oleh sistem, termasuk dari template.
- Agent tanpa atasan agent melapor langsung ke Founder; jumlahnya tidak dibatasi.
- Agent Draft/Configuring otomatis menjadi Ready saat task-nya masuk Assigned.
- Agent yang masih memiliki bawahan tidak dapat diarsipkan.
- Atasan yang berlaku untuk task ditentukan dari penugasan proyek, lalu atasan tetap, lalu Founder.
- Reporting line tidak dapat membentuk siklus, dicek untuk atasan tetap dan atasan per proyek.
- Work report hanya diterima atasan yang berlaku untuk proyek task tersebut.
- Work report mengikuti skema dan batas panjang; report yang melanggar ditolak validasi.
- Work report dihasilkan di dalam execution yang sama dan tidak memicu execution atasan.
- Tidak ada report yang dibuat jika tidak ada perubahan relevan.
- Roll-up status ke level atas dihitung tanpa LLM.
- Eskalasi diarahkan ke atasan terdekat yang berwenang; manager agent dipanggil maksimal satu kali per eskalasi per level.
- Tidak ada check-in atau digest terjadwal kecuali diaktifkan Founder.
- Perubahan reporting line tercatat di audit trail.

## 35. Open Questions

1. **ADR-0001:** usulan memakai Claude Agent SDK (status Proposed; menunggu spike validasi dan persetujuan Founder).
2. Penyedia model: Claude API langsung atau melalui penyedia cloud?
3. Apakah folder `documents/` juga di-commit ke repository proyek?
4. Hosting workspace: single host atau cluster?
5. Apakah Manager boleh membuat agent untuk bawahannya secara default, atau hanya Founder?
6. Validasi angka default dan target awal (Bagian 19, 30, 32.2) setelah Phase 1.
7. Batas jumlah hop eskalasi (Bagian 8.7) setelah batas kedalaman struktur dihapus: perlu ditetapkan sebelum Phase 3.

## 36. Final Product Direction

ORBIT adalah platform operasional perusahaan yang menggabungkan project management, workforce management dengan struktur organisasi, AI agent orchestration, communication, autonomous execution, live design, live development, dan persistent project knowledge.

ORBIT memungkinkan manusia mengendalikan kapan dan bagaimana AI Agent bekerja, siapa melapor ke siapa, dan berapa resource yang boleh dipakai — sekaligus memberikan kemampuan kepada agent untuk bekerja mandiri sesuai task, instruksi, dan policy, dengan koordinasi yang singkat, padat, dan bernilai.

**ORBIT — The Operating System for AI-Powered Teams.**
Satu ekosistem untuk mengatur manusia, AI Agent, proyek, komunikasi, pekerjaan, dan delivery dari awal hingga selesai.
