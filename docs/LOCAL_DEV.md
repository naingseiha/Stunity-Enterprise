# Local development — Supabase, connections, and quick-start

**Last updated:** May 2026

This guide explains how to run Stunity locally **without overloading Supabase** (connection limits, pooler URLs, and which start script to use). It complements [DEV_TO_PRODUCTION_WORKFLOW.md](./DEV_TO_PRODUCTION_WORKFLOW.md) (full dev→prod flow), [LOCAL_DEVELOPMENT_AND_PRODUCTION.md](./LOCAL_DEVELOPMENT_AND_PRODUCTION.md), and [DATABASE_SAFETY.md](./DATABASE_SAFETY.md).

---

## Golden rules

1. **Runtime apps use the Transaction pooler** — port **6543**, `?pgbouncer=true`. Never `db.*.supabase.co:5432` for microservices.
2. **Migrations use `DIRECT_URL`** — Session pooler port **5432** on the pooler host (or Supabase “direct” URL from the dashboard). See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).
3. **Prefer a separate Supabase project for local dev** — Do not point `./quick-start.sh` at production if you can avoid it. Use `.env.development.example` as a template.
4. **Default to `./quick-start-lite.sh`** for mobile/feed work — far fewer DB connections than full `./quick-start.sh`.
5. **Keep `PRISMA_CONNECTION_LIMIT` low** — **2–3** per service process on Micro; **3** on Cloud Run (set in deploy script).

---

## Environment files

| File | Purpose |
|------|---------|
| `.env` | Your real local secrets (gitignored). Copy from `.env.example`. |
| `.env.example` | Documented template for all variables. |
| `.env.development.example` | **Dev/staging Supabase** placeholders. |
| `.env.development.local` | Generated dev DB overrides (gitignored). |
| `apps/mobile/.env.local` | Mobile `EXPO_PUBLIC_SUPABASE_*` for dev (gitignored). |

**Recommended: separate dev Supabase project (`stunity-dev`)**

```bash
# One-time (password + API key from Supabase dashboard — never commit)
SUPABASE_DEV_DB_PASSWORD='...' \
SUPABASE_DEV_PUBLISHABLE_KEY='...' \
./scripts/setup-dev-supabase-env.sh

source scripts/activate-dev-database.sh
./quick-start-lite.sh
```

This loads `.env.development.local` **only** when `STUNITY_USE_DEV_DB=1` (set by `activate-dev-database.sh`). Production `DATABASE_URL` in `.env` stays untouched.

**Manual setup** (if you prefer paste from dashboard):

```bash
cp .env.example .env
# Fill DATABASE_URL / DIRECT_URL from Supabase → Settings → Database
#   - Transaction pooler → DATABASE_URL (6543, pgbouncer=true)
#   - Session pooler     → DIRECT_URL (5432)
```

---

## Which start script?

| Script | Services started | DB load | When to use |
|--------|------------------|---------|-------------|
| **`./quick-start-lite.sh`** | auth, feed, notification, learn, web | **Low** | Mobile app, feed, realtime, daily dev |
| **`./quick-start.sh`** | All school/grade/club/analytics/… services | **High** | Full admin web, grades, attendance, imports |
| Full + messaging | Add `SKIP_MESSAGING_SERVICE=0` | Higher | Legacy DM testing only |

### What lite mode sets automatically

- `QUICK_START_LITE=1`
- `SKIP_MESSAGING_SERVICE=1` (aligned with archived mobile messaging)
- `SKIP_DB_MIGRATE=1` (skip migrate on every start)
- `DISABLE_DB_KEEPALIVE=1` (no `SELECT 1` every 4 minutes × N services)
- `PRISMA_CONNECTION_LIMIT=2`

### Useful overrides (full quick-start)

```bash
# Skip migration when schema unchanged
SKIP_DB_MIGRATE=1 ./quick-start.sh

# Re-enable messaging service locally (optional)
SKIP_MESSAGING_SERVICE=0 ./quick-start.sh

# Re-enable DB keepalive (not recommended on Micro)
DISABLE_DB_KEEPALIVE=0 DB_KEEPALIVE_INTERVAL_MS=240000 ./quick-start.sh
```

---

## Connection math (why local felt like “high usage”)

Each microservice process opens a **Prisma pool** (`connection_limit` slots).
Full `./quick-start.sh` can start **~14 Node processes**, each holding pool slots, plus:

- `feed-service` used to open **two** Prisma clients (`prisma` + `prismaRead`) — now **one** unless `DATABASE_READ_URL` is a separate replica.
- **Keepalive** timers pinged the DB every 4 minutes per service — disabled by default in quick-start via `DISABLE_DB_KEEPALIVE=1`.

Example (before fixes):

```text
14 services × ~20 connection_limit ≈ hundreds of pool slots → Supabase Micro exhaust
```

After fixes (lite + limit 2–3 + no keepalive): typically **~10–20** slots while developing.

---

## Mobile (Expo) + local APIs

1. Run `./quick-start-lite.sh` (or full stack if you need school/grade APIs).
2. `cd apps/mobile && npx expo start`
3. Android emulator: quick-start runs `adb reverse` for API ports so `localhost` works.

Supabase **Realtime** (new feed posts) uses `EXPO_PUBLIC_SUPABASE_URL` / `ANON_KEY` in the mobile app — separate from Postgres pooler traffic, but still the same Supabase project.

---

## Production deploy (connection caps)

**Core profile** (auth + feed warm, notification + learn, no messaging):

```bash
./scripts/deploy-production-core.sh
```

Equivalent to `DEPLOY_PROFILE=core` with `min-instances=1` on **auth-service** and **feed-service**, `CLOUD_RUN_MAX_INSTANCES=2` by default.

`scripts/deploy-cloud-run.sh` defaults:

- `PRISMA_CONNECTION_LIMIT=3`
- `PRISMA_POOL_TIMEOUT=10`
- `DISABLE_DB_KEEPALIVE=1` and `DISABLE_DB_STARTUP_WARMUP=1`
- `CLOUD_RUN_MAX_INSTANCES=3`
- **messaging-service** omitted from the default “deploy all” list
- Refuses deploy if `DATABASE_URL` contains the dev project ref `ykvqgyrwizqjjzfuitto`

Override in root `.env` before deploy if needed:

```bash
PRISMA_CONNECTION_LIMIT=3
CLOUD_RUN_MAX_INSTANCES=2
./scripts/deploy-cloud-run.sh feed-service auth-service notification-service
```

---

## Checklist after changing setup

1. Supabase Dashboard → **Database** → confirm **Transaction pooler** URL in `.env` (`6543`, `pgbouncer=true`).
2. Run `./quick-start-lite.sh` — log line should show `connection_limit=2` (or 3), `keepalive=1`, and `startup_warmup=1` (disabled).
3. Open **Database → Connections** in Supabase — active connections should stay modest with only you developing.
4. Use `/health` for cheap liveness; use `/ready` or `/health/ready` only when you explicitly need a DB/Redis check.
5. Test mobile feed: post from another account → **New posts** banner should appear (realtime unchanged).

---

## Related docs

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) — pooler vs direct, Cloud Run, RLS
- [REALTIME_ARCHITECTURE.md](./REALTIME_ARCHITECTURE.md) — feed realtime
- [DATABASE_SAFETY.md](./DATABASE_SAFETY.md) — blocked migrate/seed on Supabase
- [apps/mobile/src/config/featureFlags.ts](../apps/mobile/src/config/featureFlags.ts) — `MESSAGING_ENABLED`
- [apps/mobile/src/features/archived/messaging/README.md](../apps/mobile/src/features/archived/messaging/README.md)
