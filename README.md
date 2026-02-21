# codeForge

Full-stack coding platform for problems and contests with async judging, team features, and submission tracking.

**LIVE DEMO** : https://code-forge-kappa.vercel.app/

## Highlights

- Problem solving with Monaco editor and 4 languages (`python`, `c`, `cpp`, `java`)
- Contest exam mode with one-attempt enforcement and score calculation
- Persistent submission history for problems and contests
- Async judging pipeline (Next API -> Judge Service -> Redis queue worker)
- Teams + invites + team leaderboard
- In-app notifications (including team invite accept flow)

## Tech Stack

- Frontend/API: Next.js 16, React 19, TypeScript, Tailwind, shadcn/ui
- Database/Auth: Supabase (Postgres + Supabase Auth)
- Judge backend: Express + BullMQ + Redis
- Editor: Monaco (`@monaco-editor/react`)

## Monorepo Structure

```text
app/                     Next.js app routes and APIs
components/              Shared UI components
lib/                     Shared client/server utilities
scripts/                 Base schema and setup helpers
services/judge-service/  Async judge microservice
supabase/migrations/     Incremental DB migrations
```

## Local Setup

### 1) Install deps

```bash
npm install
npm run judge-service:install
```

### 2) Configure environment

Create `.env.local` from `.env.example` and fill values.

### 3) Run database SQL

Run these in Supabase SQL Editor (in order):

1. `scripts/01-init-schema.sql`
2. `supabase/migrations/004_async_judge_columns.sql`
3. `supabase/migrations/005_phase3_teams_notifications.sql`

### 4) Start services

Terminal 1 (judge service):

```bash
npm run judge-service:dev
```

Terminal 2 (next app):

```bash
npm run dev
```

App: `http://localhost:3000`

## Production Deployment (Recommended)

Order:

1. Supabase (schema + auth URLs)
2. Judge service on Render
3. Next app on Vercel

### Supabase Auth URLs

- Site URL: your Vercel app URL
- Redirect URLs:
  - `https://<your-domain>/auth/forgot-password`
  - `https://<your-domain>/auth/reset-password`

### Render (judge service)

- Root directory: `services/judge-service`
- Build: `npm install`
- Start: `npm start`
- Required env:
  - `REDIS_URL`
  - `JUDGE_JWT_SECRET`
  - `JUDGE_SERVICE_API_TOKEN`
  - `JUDGE_CORS_ORIGIN=https://<your-vercel-domain>`
  - `JUDGE_SERVICE_PUBLIC_BASE_URL=https://<your-render-service>`

### Vercel (next app)

- Required env:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `ADMIN_EMAILS`
  - `JUDGE_ASYNC_ENABLED=true`
  - `JUDGE_SERVICE_URL=https://<your-render-service>`
  - `JUDGE_SERVICE_API_TOKEN=<same-as-render>`

## NPM Scripts

- `npm run dev` - Start Next dev server
- `npm run build` - Production build
- `npm run start` - Run production Next server
- `npm run judge-service:install` - Install judge service dependencies
- `npm run judge-service:dev` - Run judge service in dev mode

## Verification Checklist

- Auth: sign up, sign in, forgot password, reset password
- Problems: run + submit, submissions visible
- Contests: start/end attempt, contest submissions and scoring
- Teams: create team, invite, accept invite from notifications
- Async judge: submission status polling and report link

## Security Notes

- Never commit `.env.local` or service secrets.
- Keep `JUDGE_SERVICE_API_TOKEN` server-side only.
- Prefer `JUDGE_RUNNER_MODE=docker` in production when container runner is available.

## Contributing

See `CONTRIBUTING.md`.

## License

MIT - see `LICENSE`.

