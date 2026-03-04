# Database safety when using real Supabase (local dev)

You can use **one database** — your real Supabase — for both production and local dev. To keep that data safe, we only block commands that **change or wipe** data when you're pointed at Supabase.

## What is blocked (when `DATABASE_URL` looks like Supabase)

These commands are **blocked** so you don't accidentally alter real data:

- `npm run db:push` — apply schema changes
- `npm run db:migrate` — run migrations
- `npm run seed:all`, `seed:test-data`, `seed:school-management`, `seed:super-admin` — seed data
- `npx tsx scripts/reset-to-clean.ts` — wipe/reset data

If you run one of them with your real Supabase URL in `.env`, the script exits with a message and does nothing.

## What is not blocked

- **Starting the app** (e.g. `npm run dev` for web, or running services) — they connect to Supabase and read/write through the API as usual.
- **Normal usage** — logging in, creating/editing records, etc. All of that still uses your real data.

So: you're safe to work with real Supabase data during local dev; only the destructive/admin commands above are blocked.

## When you need to run a blocked command (e.g. deploy)

In CI or a deploy pipeline where you **intentionally** run migrations or seed against production, set:

```bash
ALLOW_PRODUCTION_DB=1
```

Then run the command. Do not set this for everyday local dev.

## Summary

| Use case              | What happens                                                                 |
|-----------------------|-------------------------------------------------------------------------------|
| Local dev (app/services) | Connects to Supabase; read/write via API — allowed.                        |
| Local dev (push/migrate/seed/reset) | Blocked when URL is Supabase, so real data isn’t changed by mistake. |
| Deploy / CI           | Set `ALLOW_PRODUCTION_DB=1` when you need to run migrations or seed.         |
