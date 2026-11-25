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
| `orbit/structure.py` | Aturan struktur agent (PRD 8.2): tepat satu puncak, atasan tetap + per proyek, tanpa siklus, maks. 4 level (puncak = level 1) dicek per proyek, Ready wajib punya atasan, resolusi atasan task. |
| `orbit/tasks.py` | State machine task. |
| `orbit/cli.py` | `create-founder`, `reset-password`. |

### State machine task (MVP)

```
Backlog → Assigned → In Progress → Founder Approval → Done
                                        ↓      ↑
                                       Revision
* (kecuali Done/Cancelled) → Blocked (alasan wajib) → kembali ke status sebelumnya
* (kecuali Done/Cancelled) → Cancelled (alasan wajib)
```

- Assigned: acceptance criteria wajib (kecuali `acceptance_criteria_waived` untuk task eksploratif) dan assignee agent Ready/Active yang ditugaskan ke proyek.
- Founder Approval: Founder me-review di PR; `pr_url` wajib. PO Review belum dipakai (MVP §4.4).
- Revision: feedback wajib (field `reason`); `revision_count` bertambah.
- Setiap transisi tercatat di `task_status_events`.

## Ditunda

Redis/Dramatiq, Row-Level Security, agent execution runtime, integrasi GitHub, chat, frontend,
2FA, audit trail perubahan reporting line, otorisasi per pelaku transisi (di MVP semua aksi oleh Founder).
