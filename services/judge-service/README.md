# Judge Service (Phase 1)

Async judge microservice using:
- Express
- BullMQ + Redis
- Socket.IO
- JWT auth + role guards
- Audit logs

## 1) Install

```bash
npm --prefix services/judge-service install
```

## 2) Required env

Set these in your shell before start:

```bash
JUDGE_SERVICE_PORT=4100
REDIS_URL=redis://127.0.0.1:6379
JUDGE_JWT_SECRET=change-this
JUDGE_SERVICE_API_TOKEN=change-this-token
JUDGE_CORS_ORIGIN=http://localhost:3000
JUDGE_SERVICE_PUBLIC_BASE_URL=http://localhost:4100
JUDGE_RUNNER_MODE=local
# optional for docker mode
# JUDGE_RUNNER_SECCOMP_PROFILE=/path/to/seccomp.json
```

Optional service users:

```bash
JUDGE_SERVICE_USERS_JSON=[{"id":"admin-1","email":"admin@example.com","password":"change-me","roles":["admin"],"name":"Judge Admin"}]
```

## 3) Start

```bash
npm run judge-service:dev
```

## 4) Next.js integration env

Set in `.env.local`:

```bash
JUDGE_ASYNC_ENABLED=true
JUDGE_SERVICE_URL=http://localhost:4100
JUDGE_SERVICE_API_TOKEN=change-this-token
```

If disabled, Next judge route falls back to local synchronous execution.

## 5) APIs

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/users/me`
- `POST /api/v1/judge/jobs` (service token protected)
- `GET /api/v1/judge/jobs/:id` (service token protected)
- `GET /api/v1/admin/audit` (admin JWT protected)
- `POST /api/v1/contests/rank-update` (service token protected)

Socket events:
- subscribe: `judge:job:subscribe` with `jobId`
- updates: `judge:job:update`
- subscribe: `contest:subscribe` with `contestId`
- updates: `contest:rank:update`

## Runner modes (Phase 2)

- `JUDGE_RUNNER_MODE=local` (default): executes directly on host.
- `JUDGE_RUNNER_MODE=docker`: executes with docker isolation flags:
  - `--network=none`
  - `--cpus=1`
  - memory/pids limits
  - `no-new-privileges`
  - optional seccomp profile via `JUDGE_RUNNER_SECCOMP_PROFILE`
