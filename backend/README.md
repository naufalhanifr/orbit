# ORBIT backend (MVP Phase 0)

FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL. Lihat `docs/PRD.md` §4.4, §8, §13–15.

## Menjalankan

```bash
cd backend
docker compose up -d db                      # Postgres 16 (db `orbit` + `orbit_test`)
python -m venv .venv && . .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env                         # set ORBIT_COOKIE_SECURE=false untuk dev lewat http
alembic upgrade head
python -m orbit.cli create-founder --email founder@example.com --name "Founder" --org "EVORA"
uvicorn orbit.main:app --reload              # http://localhost:8000/docs
```

App beserta Postgres dalam Docker: `docker compose --profile app up --build`.

Reset password Founder (di server; mencabut semua session dan membuka kunci login):

```bash
python -m orbit.cli reset-password --email founder@example.com
```

## Test

```bash
docker compose up -d db
pytest
```

Test memakai `ORBIT_TEST_DATABASE_URL`
(default `postgresql+psycopg://orbit:orbit@localhost:5432/orbit_test`); schema database itu
dihapus lalu dibuat ulang lewat migrasi Alembic setiap kali test dijalankan.

## Isi

| Modul | Isi |
|---|---|
| `orbit/security.py` | Hash argon2, kunci 15 menit setelah 5 gagal login, session cookie (`HttpOnly`, `Secure`, `SameSite=Lax`), reset password. |
| `orbit/structure.py` | Struktur agent: Founder adalah akar; agent tanpa atasan agent melapor langsung ke Founder (jumlah dan kedalaman bebas). Atasan tetap + per proyek (matriks), tanpa siklus (dicek per proyek), agent yang masih punya bawahan tidak bisa diarsipkan, resolusi atasan task: per proyek → tetap → Founder. |
| `orbit/tasks.py` | State machine task. |
| `orbit/cli.py` | `create-founder`, `reset-password`. |

### Agent (PRD 10)

- Agent baru melapor langsung ke Founder (`fixed_supervisor_id = null`); "Reports to" bisa diubah lewat `PUT /agents/{id}/supervisor`.
- "Works in": `works_in_all_projects = true` (semua proyek, termasuk yang dibuat nanti) atau proyek terpilih lewat `/projects/{id}/assignments`. Atasan per proyek tetap diatur di assignment.
- `status` diturunkan sistem, tidak bisa diubah: `running` (execution preparing/running), `blocked` (task Blocked, execution waiting_for_input/suspended, atau execution terakhir sebuah task Failed sampai ada execution baru atau task Done/Cancelled), selain itu `idle`.
- Arsip bukan status: `POST /agents/{id}/archive` (field `archived`). Agent yang diarsipkan disembunyikan dan tidak bisa menerima task.
- Tidak ada batas token di MVP; `tokens_used` tetap dicatat.

### State machine task (MVP)

```
Backlog → Assigned → In Progress ⇄ Founder Approval → Done
                     (Founder Approval → In Progress = revisi, feedback wajib)
* (kecuali Done/Cancelled) → Blocked (alasan wajib) → kembali ke status sebelumnya
* (kecuali Done/Cancelled) → Cancelled (alasan wajib)
```

- Assigned: acceptance criteria wajib (kecuali `acceptance_criteria_waived` untuk task eksploratif) dan assignee agent yang bekerja di proyek itu (Works in) dan tidak diarsipkan.
- Founder Approval: Founder me-review di PR; `pr_url` wajib. PO Review belum dipakai (MVP §4.4).
- Revisi: Founder Approval → In Progress, feedback wajib (field `reason`); `revision_count` bertambah. Tidak ada status Revision.
- Setiap transisi tercatat di `task_status_events`.

### Dependency antar-task

- `POST /tasks/{id}/dependencies` `{"depends_on_id": ...}` dan `DELETE /tasks/{id}/dependencies/{depends_on_id}`. Boleh lintas proyek dalam satu organisasi. Dependency hanya bisa ditambahkan ke task di Backlog, dan tidak boleh membentuk siklus.
- Task tidak bisa Assigned selama ada dependency yang belum Done.
- Begitu dependency terakhir Done (atau dihapus), task otomatis pindah ke Assigned oleh sistem (`actor_id = null`), asalkan task punya acceptance criteria dan assignee yang tersedia. Jika belum, task menunggu di Backlog dan otomatis maju saat Founder melengkapinya.
- Dependency yang Cancelled tidak dihitung Done; Founder memutuskan dengan menghapus dependency tersebut.
- Perpindahan otomatis hanya sampai Assigned. Menjalankan agent (In Progress) menunggu runtime agent (ADR-0001).

### Komentar task = chat, dan panel execution (PRD 17.4)

- `GET/POST /tasks/{id}/messages` — satu thread per task. `POST` berisi `{"body", "mentions": [agent_id, ...]}`; mention dipilih di UI, bukan di-parse dari teks.
  - Mention assignee yang punya execution `running` di task ini → event `instruction` ke execution itu (tanpa execution baru).
  - Mention agent lain (atau assignee tanpa execution berjalan) → execution baru `queued`, trigger `chat_mention`, dengan snapshot versi instruksi.
  - Tanpa mention → catatan saja.
  - Agent yang di-mention harus bekerja di proyek itu dan tidak diarsipkan.
- `GET /tasks/{id}/executions` (riwayat), `GET /executions/{id}` (status, `current_step`, `tokens_used`; tanpa batas token di MVP), `GET /executions/{id}/events?after_seq=N` (step, output, tool, tokens, instruction; polling), `POST /executions/{id}/stop` (→ `cancelled`), `POST /executions/{id}/resume` (Suspended → Queued).
- Endpoint baca tidak memicu aktivitas agent (17.5).
- Lifecycle (PRD 18.3): `queued → preparing → running ⇄ waiting_for_input → completed | failed | cancelled`, `waiting_for_input → suspended → queued` (resume). `preparing` ditampilkan di UI sebagai "Preparing". Mention assignee saat `preparing`/`running`/`waiting_for_input` menjadi instruksi ke execution itu (termasuk menjawab pertanyaan agent).
- Belum ada runtime: execution tetap `queued`. Runtime nanti memakai `chat.advance_execution` dan `chat.record_event`; streaming SSE, Stop yang mematikan container, dan Suspended otomatis setelah 30 menit menyusul.

### Project Chat

- `GET/POST /projects/{id}/messages` — satu thread per proyek (terpisah dari thread task). Mention agent → execution `queued` tanpa task (`task_id = null`), trigger `chat_mention`. Tanpa mention → pesan biasa.
- `GET /projects/{id}/executions` — semua execution di proyek, termasuk dari chat.
- Task punya `from_chat` dan `source_message_id` untuk task ringan "dari chat" (PRD 4.4). Pembuatannya otomatis menyusul bersama runtime, saat agent mengubah kode.

### Waiting on you (PRD 4.4)

`GET /waiting-on-you` — item `pr_review` (task di Founder Approval, dengan `pr_url`), `agent_question` (execution Waiting for Input), `suspended` (perlu di-resume), `blocked` (dengan alasan), urut dari yang paling lama. Konfirmasi run saat budget harian tercapai menyusul bersama budget.

## Ditunda

Redis/Dramatiq, Row-Level Security, agent execution runtime, integrasi GitHub, frontend,
2FA, audit trail perubahan reporting line, otorisasi per pelaku transisi (di MVP semua aksi oleh Founder).
