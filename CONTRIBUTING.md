# Contributing

## Development Workflow

1. Create a feature branch from `main`.
2. Keep changes focused and small.
3. Run typecheck before pushing:

```bash
npx tsc --noEmit
```

4. Open a pull request with:
- Summary of changes
- Screenshots for UI changes
- Testing notes

## Commit Style

Use clear commit messages, for example:

- `feat: add team invite acceptance in notifications`
- `fix: validate contest access code in register route`
- `docs: update deployment steps for render + vercel`

## Database Changes

For schema changes:

1. Add a new SQL file in `supabase/migrations/`.
2. Keep `scripts/01-init-schema.sql` aligned for fresh setups.
3. Update `app/setup/page.tsx` SQL block if setup UI must support it.

## Security

- Do not commit secrets.
- Keep all private tokens in environment variables.
- Validate auth and role checks on server routes.

