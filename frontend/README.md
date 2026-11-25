# ORBIT frontend

Next.js + shadcn/ui (style base-mira), copied from `design/shadcn` (design reference, commit e25d031).
Tokens live in `app/globals.css`; do not add color tokens elsewhere.

## Run

Start the backend first (`backend/README.md`, with `ORBIT_COOKIE_SECURE=false` for local http), then:

```bash
cd frontend
npm ci
npm run dev            # http://localhost:3000
```

The browser only calls `/api/*`; `next.config.ts` rewrites it to the backend
(`ORBIT_API_URL`, default `http://localhost:8000`). The session cookie stays same-origin, so no CORS setup.

## Checks

```bash
npm run lint && npm run typecheck && npm run build
```

## Screens

| Route | Backend |
|---|---|
| `/login` | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` |
| `/board` (Kanban/List, task detail sheet, Waiting on you) | `/projects`, `/projects/{id}/tasks`, `/tasks/{id}` (PATCH, transitions, events, dependencies, messages, executions), `/waiting-on-you`, `/executions/{id}` (events, stop, resume) |
| `/agents`, `/agents/new`, `/agents/{id}` | `/agents`, `/agents/{id}/instructions`, `/agents/{id}/supervisor`, `/projects/{id}/assignments` |
| `/org` | agents + assignments of every project |
| `/dashboard` | `/projects/{id}/executions` and tasks, summed client side |
| `/chat` | `/projects/{id}/messages`, `/projects/{id}/executions` |

## Known gaps (backend)

- Agent runtime (ADR-0001): executions stay Queued; the live panel polls `/executions/{id}/events` every 3 s.
- No org-wide token usage endpoint: the dashboard sums executions per project in the browser.
- Daily budget and its "Run anyway" confirmation in Waiting on you: not in the backend yet.
- `/auth/me` has no workforce id; comment authors that are not agents are shown as the Founder.
