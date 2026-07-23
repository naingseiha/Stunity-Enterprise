# GCP Migration — New Account + Clean Project (Path B)

**Date:** 2026-07-23
**Status:** 🟡 Approved plan — not started
**Decision:** Migrate Cloud Run workloads from the personal-Gmail project `stunity-enterprise` to a **new GCP project under a new, dedicated Gmail account**, executed **together with Phase 0 service consolidation** (16 → 3 services) from [ARCHITECTURE_REVIEW_2026-07.md](./ARCHITECTURE_REVIEW_2026-07.md).

**Why Path B (fresh project) instead of transferring ownership:**

- Pre-production: current data is test data, no store builds to keep compatible, no users to migrate.
- The new account gets a fresh $300/90-day credit and a clean billing baseline.
- Combining with Phase 0 means the new project **never contains the 16-service sprawl** — only the 3 consolidated services are ever deployed there.
- Verified: passkeys/universal links are bound to `stunity.app` (AASA/assetlinks live in `apps/web/public/.well-known/`, served by Vercel) — **unaffected** by the GCP move.

---

## What stays exactly the same

| Component | Why unaffected |
|---|---|
| Supabase Postgres (`mwqdsxbxqlkrahoyqqox`) | `DATABASE_URL` is just an env var; new services point at the same DB |
| Web app on Vercel + `stunity.app` domain | Separate platform entirely |
| AASA / assetlinks / passkey RP ID | Served from `stunity.app` on Vercel, not from Cloud Run |
| Cloudflare R2 media storage | Credential env vars, platform-independent |
| EAS / Expo builds | Only the API base URLs inside them change |
| Sentry | DSN is an env var |

## What changes

| Component | Change |
|---|---|
| GCP account | New dedicated Gmail (infra-only, break-glass owner) |
| GCP project | New project (suggested ID: `stunity-prod`) |
| Deployables | 16 services → **3** (Academic API, Engagement API, AI API) per Phase 0 |
| Service URLs | New `*.run.app` URLs → then custom subdomains of `stunity.app` |
| `JWT_SECRET` | **Generate a fresh random secret** — do not copy the old one (rotation hygiene; test users just re-login) |
| Cloud Scheduler | Re-create streak-at-risk job in the new project |

---

## Phase A — Account & project foundation ✅ done 2026-07-23

- [x] Create the new Gmail account (`seihaczn@gmail.com`). **Never share its password** — future developers get IAM roles on their own Google accounts (e.g. `roles/run.developer`), this account is billing + break-glass owner only.
- [x] Billing account linked. No $300 free-trial credit (this Google account had prior GCP billing history) — cost discipline via `min-instances=0` matters even more here, not less.
- [x] Budget alert created via CLI: $5/month, thresholds at 50/90/100%.
- [x] Project `stunity-prod` created under org `seihaczn-org`.
- [x] APIs enabled: Cloud Run, Cloud Build, Artifact Registry, Secret Manager, Cloud Scheduler.
- [x] Local `gcloud` configuration `stunity-prod` created and authenticated as the new account.
- [x] Region: `asia-southeast1` confirmed to support Cloud Run domain mappings (`gcloud beta run domain-mappings list` returned cleanly, no region error).

Known local gotcha: this machine's system Python (3.9) crashes `gcloud`'s newer commands (`gcloud beta run domain-mappings`, budget commands). Fix: `export CLOUDSDK_PYTHON=/opt/homebrew/bin/python3.11` (added to `~/.zshrc`).

**Old project `stunity-enterprise`:** not yet decommissioned. Full env-var dump of all 20 old Cloud Run deployments backed up to `~/stunity-old-cloudrun-env-backup.txt` before any shutdown decision — needed for Phase C secrets below. Confirm current status before assuming it's gone or still billing.

## Phase B — Phase 0 consolidation ✅ done 2026-07-23 (merged to `main`)

Per [ARCHITECTURE_REVIEW_2026-07.md §5](./ARCHITECTURE_REVIEW_2026-07.md): merged 16 services into

1. **Academic API** — school, student, teacher, class, subject, grade, attendance, timetable, club
2. **Engagement API** — auth, feed, messaging, notification, learn, analytics
3. **AI API** — ai-service as-is

Also done: deleted `search-service` / `storage-service` / `user-service` stubs, and introduced the shared `getJwtSecret()` helper (§7 of the review) so the new project never contains a hardcoded JWT fallback — every merged module uses it now, closing the 3 previously-unguarded route files.

Found and fixed during the merge: auth-service and notification-service each had their own `/notifications/*` routes (different verbs, different clients — web-parent UI vs mobile) — invisible as a conflict while they were separate deployables. Renamed auth's to `/auth/notifications/*` and updated the 3 real call sites (web parent-notification page + dropdown, academic-api's grade/attendance cross-service calls).

Pure code/router move, same DB — verified via tsc + live boot test of both services against the dev DB before merging to `main`.

## Phase C — First deploy to the new project

- [x] `scripts/deploy-cloud-run.sh` updated: `PROJECT_ID=stunity-prod`, `REGION=asia-southeast1`, service list = `engagement-api`, `academic-api`, `ai-service` (in that order — academic-api's cross-service notification calls need engagement-api's URL, captured automatically after its deploy and injected as `AUTH_SERVICE_URL`).
- [x] Removed the `core`-profile overrides entirely (the per-service min-instances for auth/feed/notification/learn no longer apply — those were separate deployables that don't exist anymore). `min-instances` defaults to **0**, CPU throttling to **true** everywhere.
- [x] Dockerfiles added for `services/academic-api` and `services/engagement-api` (same multi-stage pattern as the other services).
- [ ] **Not yet run** — no local Docker to test-build the new Dockerfiles; running the script performs a real deploy. Needs a real Cloud Build run to confirm they build before first production use.
- [ ] Set env vars/secrets on each service (prefer Secret Manager over plain env for secrets) — the deploy script now passes these through automatically from `.env`, but `.env` itself still needs the production values set:

| Variable | Value/source |
|---|---|
| `DATABASE_URL` | Same Supabase transaction pooler (`:6543`) URL as today |
| `JWT_SECRET` | **New**: `openssl rand -base64 48` — same value across Academic + Engagement |
| `ANTHROPIC_API_KEY` | From current secret store (confirmed absent in old Cloud Run env — fix that here) |
| `SENTRY_DSN` | Same as current (confirmed absent in old Cloud Run env — fix that here) |
| R2 credentials, `REDIS_URL`, `GEMINI_API_KEY`, `NOTIFICATION_SERVICE_AUTH_TOKEN`, `SUPABASE_URL`/`SUPABASE_ANON_KEY` | Copied from `~/stunity-old-cloudrun-env-backup.txt` (full env dump of all 20 old deployments, taken 2026-07-23 before old-project shutdown; delete that file once Phase C is verified) |
| `AUTH_PASSKEYS_ENABLED`, `WEBAUTHN_RP_ID=stunity.app`, `WEBAUTHN_RP_NAME`, `WEBAUTHN_ORIGIN=https://stunity.app` | Same as current — RP stays `stunity.app` |
| CORS allow-list | Explicit origins (`https://stunity.app`, dev origins) — **not `*`** (fixes the store-readiness finding) |

**Phase C shipped 2026-07-24 — all 3 services live on `stunity-prod` / `asia-southeast1`:**

| Service | URL | `/health` |
|---|---|---|
| engagement-api | `https://stunity-engagement-api-wi6osjnoxq-as.a.run.app` | 200 |
| academic-api | `https://stunity-academic-api-wi6osjnoxq-as.a.run.app` | 200 |
| ai-service | `https://stunity-ai-service-wi6osjnoxq-as.a.run.app` | 200 |

Confirmed `minScale` unset (Cloud Run default scale-to-zero) and `maxScale=3` on all three — the cost-friendly config that was the actual point of this migration.

Two real bugs found only by the live Cloud Build run (local `tsc` passed on both — npm workspaces hoists `@types/jest` and the generated Prisma client to the repo root, masking what an isolated per-service `npm install` actually sees) — both fixed on `main`:
1. `tsconfig.json` `"lib": ["ES2020"]` (no DOM) broke every `fetch()`/`Response.json()` call site; the original per-service tsconfigs omitted `"lib"` entirely, which defaults to including DOM.
2. A handful of Prisma `findMany()`/`$queryRaw()` results feeding `Promise.all()` + `new Map(...)` silently inferred as `unknown` in the isolated build only — fixed with explicit type annotations at those call sites (6 files).
3. `services/academic-api/src/modules/club/index.ts` crashed at Cloud Run startup (`ReferenceError: Cannot access 'jwt_secret_1' before initialization`) — the merge script inserted the `getJwtSecret` import after its first use in that one file; moved to the top.
4. `ai-service` (pre-existing, untouched by Phase 0) hit the same test-file-in-production-build issue as engagement-api originally did — fixed with the same tsconfig exclusion.

## Phase D — Custom API domains (recommended before launch)

- [ ] Verify `stunity.app` ownership in the new project (Search Console / `gcloud domains verify`).
- [ ] Map subdomains via Cloud Run domain mappings (free; no load balancer needed pre-launch):
  - `api.stunity.app` → Engagement API
  - `academic.stunity.app` → Academic API
  - `ai.stunity.app` → AI API
- [ ] Add the CNAME records (`ghs.googlehosted.com.`) wherever `stunity.app` DNS is managed (Vercel DNS or the registrar). Subdomain CNAMEs do not affect the Vercel apex site.
- [ ] After this, clients reference **only stunity.app subdomains** — any future GCP project change becomes invisible to the apps.

## Phase E — Client config updates

- [ ] `apps/mobile/src/config/env.ts`: replace the ~16 hardcoded `*.run.app` URLs (old project hash `mc7wnjp2kq`) with the 3 new base URLs.
- [ ] `apps/web/src/lib/api/config.ts`: same reduction.
- [ ] Root `.env` / `.env.example`, EAS env vars (`EXPO_PUBLIC_*`): update to the 3 URLs.
- [ ] Rebuild dev clients; grep the repo for `mc7wnjp2kq` to catch stragglers.

## Phase F — Ops re-creation + verification

- [ ] Re-run `scripts/setup-streak-at-risk-scheduler.sh` against the new project (update its project/URL variables first).
- [ ] Full device regression pass (existing workflow): login (password + passkey), feed, DM, notifications, learn/quiz, grades, attendance, admin web.
- [ ] Confirm in the new console: every service shows `min-instances: 0`; billing forecast is $0.

## Phase G — Decommission the old project

Only after Phase F passes:

- [ ] Disable billing on the old `stunity-enterprise` project (stops all possible charges immediately).
- [ ] Shut down / delete the project (30-day recovery window applies).
- [ ] Remove the old account's local `gcloud` configuration to avoid deploying to the wrong project by habit.

---

## Explicit non-goals of this migration

- **No database change** — Supabase project stays as-is. The Academic/Engagement DB split is Phase 1 of the architecture review and is deliberately deferred.
- **No new features** — this is infra + consolidation only.
- Store-readiness blockers that are *not* infra (account deletion flow, privacy pages) remain tracked separately in the store-readiness audit.
