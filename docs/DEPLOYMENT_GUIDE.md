# Stunity Enterprise — Production Deployment Guide

Also see **[deployment/README.md](deployment/README.md)** for a compact index of deploy scripts, mobile runbooks, and supplemental setup notes.

This guide covers Google Cloud Run (backend microservices), Vercel (web), Supabase (database), and Expo EAS (iOS / Android).

## Infrastructure requirements

| Component | Target platform | Notes |
|-----------|-----------------|-------|
| **Database** | Supabase | Pooler for runtime; direct URL for migrations |
| **Backend** | Google Cloud Run | Sixteen active microservices in `scripts/deploy-cloud-run.sh` |
| **Frontend** | Vercel | Root directory `apps/web` |
| **Media** | Cloudflare R2 | S3-compatible; public URL in `NEXT_PUBLIC_R2_PUBLIC_URL` |
| **Mobile** | App Store / Play Store | EAS `production` profile |

Placeholder service folders (not deployed by the default script): `search-service`, `storage-service`, `user-service`.

---

## 1. Database (Supabase)

1. **Connection pooling**: Project Settings → Database → Connection Pooler.
2. **Connection strings**:
   - **Transaction mode (pooler, port 6543)**: `DATABASE_URL` for services.
   - **Session mode (direct, port 5432)**: `DIRECT_URL` for Prisma migrations.
3. Add `?pgbouncer=true` to `DATABASE_URL` when using the pooler.

### Production migrations

When `packages/database/prisma/schema.prisma` has changed since the last production deploy, apply migrations **before** deploying new service code:

```bash
# From repo root; requires DATABASE_URL and DIRECT_URL in the environment (e.g. root .env)
npm run db:migrate:deploy
```

Equivalent:

```bash
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
```

Destructive local commands (`db:migrate`, `db:push`, seeds) still use `scripts/db-safety-check.ts` and block accidental use against production URLs unless `ALLOW_PRODUCTION_DB=1`.

### Row Level Security (RLS) — production checklist

Complete this in the Supabase dashboard before treating the environment as production-ready:

1. **Enable RLS** on every table that holds tenant or user data (SQL editor or Table Editor).
2. **Policies**: For each table, confirm `SELECT` / `INSERT` / `UPDATE` / `DELETE` policies match your product rules (school scoping, role checks, service role usage).
3. **Service role**: Backend services using the service role key bypass RLS — restrict that key to server-side only; never ship it in mobile or web clients.
4. **Anon key**: Used by Expo with `EXPO_PUBLIC_*`; ensure RLS blocks cross-tenant access for all anon-authenticated paths.
5. **Review** after schema migrations: new tables need RLS before traffic hits them.

---

## 2. Backend (Google Cloud Run)

The script [scripts/deploy-cloud-run.sh](scripts/deploy-cloud-run.sh) builds and deploys these sixteen services:

`auth-service`, `feed-service`, `learn-service`, `school-service`, `student-service`, `teacher-service`, `attendance-service`, `class-service`, `subject-service`, `grade-service`, `analytics-service`, `club-service`, `notification-service`, `messaging-service`, `ai-service`, `timetable-service`.

### Root `.env` (not committed)

Required for deploy (see script): `DATABASE_URL`, `JWT_SECRET`, Supabase and R2 variables, `GEMINI_API_KEY`, etc.

**Scaling and CORS** (optional overrides in the same `.env`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `CLOUD_RUN_MIN_INSTANCES` | `0` | Set to `1` to reduce cold starts (higher cost). |
| `CLOUD_RUN_CPU_THROTTLING` | `true` | Set to `false` for steadier CPU when instances are idle (higher cost). |
| `CORS_ORIGIN` | `*` | Set to your real web origin (e.g. `https://stunity.com`). Avoid `*` in production. |

The script prints a warning when `CORS_ORIGIN` is `*`.

### Deploy commands

1. Authenticate: `gcloud auth login`
2. **All services** (interactive confirm):

   ```bash
   ./scripts/deploy-cloud-run.sh
   ```

3. **Selective deploy**:

   ```bash
   ./scripts/deploy-cloud-run.sh auth-service feed-service
   ```

4. **List services touched by git** (since `origin/main`, or pass another ref range):

   ```bash
   npm run deploy:list-changed-services
   # or: ./scripts/list-changed-cloud-run-services.sh origin/main...HEAD
   ```

   If only `packages/database/prisma/schema.prisma` appears in the diff, the script prints a note to stderr: redeploy every service that depends on that schema (or run a full backend deploy). The list itself may be empty — that is expected.

5. If Cloud Run URLs change, update all `NEXT_PUBLIC_*` URLs in Vercel and rebuild mobile if URLs are hardcoded in `apps/mobile/src/config/env.ts`.

### Backend rollout checklist

1. Run `npm run db:migrate:deploy` when the Prisma schema changed.
2. Deploy changed services with `./scripts/deploy-cloud-run.sh …`.
3. Verify logs and health (e.g. `/health`) in Cloud Run.
4. Smoke-test web and mobile against the live URLs.
5. **Auth**: If provisioning changed, confirm password `ADMIN` / `SUPER_ADMIN` users use `accountType=SCHOOL_ONLY`; backfill legacy `SOCIAL_ONLY` rows before release to avoid login `401`.

### Streak-at-risk push (Cloud Scheduler)

The notification-service exposes a service-auth endpoint for evening streak reminders:

- `POST /notifications/jobs/streak-at-risk` with header `x-service-token: $NOTIFICATION_SERVICE_AUTH_TOKEN`
- Deploy script sets `NOTIFICATION_SERVICE_AUTH_TOKEN` from `NOTIFICATION_SERVICE_AUTH_TOKEN` or `JWT_SECRET` in root `.env`.

One-time scheduler setup (project `stunity-enterprise`, region `us-central1`):

```bash
export GCP_PROJECT_ID="stunity-enterprise"
export GCP_REGION="us-central1"
export NOTIFICATION_SERVICE_URL="https://stunity-notification-service-mc7wnjp2kq-uc.a.run.app"
export NOTIFICATION_SERVICE_AUTH_TOKEN="<your production service token>"
./scripts/setup-streak-at-risk-scheduler.sh
```

Creates job `stunity-streak-at-risk-evening` (daily 19:00 `Asia/Phnom_Penh`). See [`docs/current/LEARNING_GAMIFICATION_AND_QUIZ_ANALYTICS_2026-05.md`](current/LEARNING_GAMIFICATION_AND_QUIZ_ANALYTICS_2026-05.md).

### Per-service Cloud Run environment

Each service needs at least: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `NODE_ENV=production`, plus any service-specific secrets the Dockerfile/runtime expects.

---

## 3. Continuous integration (GitHub Actions)

[.github/workflows/deploy-feed.yml](.github/workflows/deploy-feed.yml) deploys **feed-service** on pushes to `main` that touch `services/feed-service/**` or the shared Prisma schema.

**Repository Variables** (Settings → Secrets and variables → Actions → Variables), optional — defaults match `deploy-cloud-run.sh`:

- `CORS_ORIGIN` — if unset, deploy step uses `*`.
- `CLOUD_RUN_MIN_INSTANCES` — if unset, `0`.
- `CLOUD_RUN_CPU_THROTTLING` — if unset, `true` (`--cpu-throttling`).

For production, set `CORS_ORIGIN` to your web origin and consider `CLOUD_RUN_MIN_INSTANCES` / throttling per cost and latency goals.

Broader automation (Cloud Build triggers per service) is described in the original Cloud Build section below.

### Google Cloud Build triggers (optional)

1. Connect the GitHub repo in GCP → Cloud Build → Triggers.
2. One trigger per service (e.g. `deploy-auth`) with path filter `services/auth-service/**`.
3. Event: push to `main`; build using the service `Dockerfile`.

---

## 4. Web frontend (Vercel)

1. Link the repo; root directory **`apps/web`**.
2. **Environment variables**: Copy every key from [apps/web/.env.production.example](apps/web/.env.production.example). The tracked [apps/web/.env.production](apps/web/.env.production) mirrors current Cloud Run URLs for convenience — **do not put private keys in tracked files**; Vercel should hold production values.
3. **Required for Learn**: `NEXT_PUBLIC_LEARN_SERVICE_URL` must point at the live `learn-service` URL. If it is missing, production builds still compile but log a warning and fall back to `http://localhost:3018` (see [apps/web/src/lib/api/config.ts](apps/web/src/lib/api/config.ts)).
4. Redeploy Vercel after any backend URL change.

### Vercel build notes (March 2026)

- Align `next` 15.x with `eslint-config-next` 15.x; `react` / `react-dom` 18.3.x with matching `@types/*`.
- App Router: use async `params` where applicable (`params: Promise<...>`).
- Lint policy for production: see `apps/web/.eslintrc.json` for intentionally relaxed rules on legacy pages.

### Web security headers

[apps/web/vercel.json](apps/web/vercel.json) sets global headers including `Permissions-Policy` (camera/microphone/geolocation off for the **web** app). Confirm this matches product needs; native apps use separate permission strings in `app.json`.

---

## 5. Mobile (Expo / EAS)

### Environment selection

- [apps/mobile/src/config/env.ts](apps/mobile/src/config/env.ts): production config is selected when `EXPO_PUBLIC_APP_ENV=production` (set in [apps/mobile/eas.json](apps/mobile/eas.json) `production` profile).
- Production API URLs are hardcoded in `env.ts` for Cloud Run. After a deploy that changes URLs, update `env.ts` or move URLs into EAS env and read them at build time, then rebuild.

### Store listing URLs

- `EXPO_PUBLIC_APP_STORE_URL` — full App Store URL when the app is live. If unset, the app falls back to `https://stunity.com`.
- `EXPO_PUBLIC_PLAY_STORE_URL` — optional override; default Play URL uses package id `app.stunity.mobile`.

Set these in EAS **Secrets** or the `production` profile `env` block (avoid committing non-public values).

### Builds

```bash
cd apps/mobile
eas build --platform ios --profile production
eas build --platform android --profile production
```

`app.json` drives store versioning (`version`, iOS `buildNumber`, Android `versionCode`). `APP_CONFIG` in `env.ts` reads version/build from Expo Constants when available.

---

## 6. Security summary

1. **Secrets**: Prefer Google Secret Manager and Vercel / EAS secrets over committing `.env` files.
2. **CORS**: Restrict `CORS_ORIGIN` to real front-end origins in production.
3. **RLS**: Follow the checklist in section 1.
4. **TLS**: Cloud Run and Vercel terminate HTTPS for you.

---

*Last updated: May 12, 2026*
