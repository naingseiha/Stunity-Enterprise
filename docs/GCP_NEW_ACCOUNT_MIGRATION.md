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

## Phase A — Account & project foundation

- [ ] Create the new Gmail account. Enable 2FA/passkey on it. **Never share its password** — future developers get IAM roles on their own Google accounts (e.g. `roles/run.developer`), this account is billing + break-glass owner only.
- [ ] Accept the $300 free-trial credit; create the billing account.
- [ ] **Set a budget alert immediately** (e.g. $5 threshold with email notification) — this is the guard that was missing when `min-instances=1` caused the surprise bill.
- [ ] Create project `stunity-prod`.
- [ ] Enable APIs: Cloud Run, Cloud Build, Artifact Registry, Secret Manager, Cloud Scheduler.
- [ ] Locally: `gcloud auth login` with the new account; keep configurations separated with `gcloud config configurations create stunity-prod`.
- [ ] Pick **one region for everything**: `asia-southeast1` (Singapore — closest to Cambodia). Note: the old project mixed `us-central1` and `asia-southeast1`; do not repeat that.
  - Before committing, confirm the region supports Cloud Run **domain mappings** (`gcloud beta run domain-mappings` — `asia-southeast1` was on the supported list at last check). If it isn't, keep `run.app` URLs until launch and revisit.

## Phase B — Phase 0 consolidation (do BEFORE first deploy)

Per [ARCHITECTURE_REVIEW_2026-07.md §5](./ARCHITECTURE_REVIEW_2026-07.md): merge 16 services into

1. **Academic API** — school, student, teacher, class, subject, grade, attendance, timetable, club
2. **Engagement API** — auth, feed, messaging, notification, learn, analytics
3. **AI API** — ai-service as-is

Also: delete `search-service` / `storage-service` / `user-service` stubs, and introduce the shared `getJwtSecret()` helper (§7 of the review) so the new project never contains a hardcoded JWT fallback.

Pure code/router move, same DB, testable locally before anything is deployed.

## Phase C — First deploy to the new project

- [ ] Update `scripts/deploy-cloud-run.sh`: `PROJECT_ID=stunity-prod`, `REGION=asia-southeast1`, service list = the 3 new services.
- [ ] Remove the `core`-profile overrides: `min-instances` must default to **0** and CPU throttling to **true** everywhere (free tier requires scale-to-zero; revisit only after launch with measured cold-start complaints).
- [ ] Set env vars/secrets on each service (prefer Secret Manager over plain env for secrets):

| Variable | Value/source |
|---|---|
| `DATABASE_URL` | Same Supabase transaction pooler (`:6543`) URL as today |
| `JWT_SECRET` | **New**: `openssl rand -base64 48` — same value across Academic + Engagement |
| `ANTHROPIC_API_KEY` | From current secret store (confirmed absent in old Cloud Run env — fix that here) |
| `SENTRY_DSN` | Same as current (confirmed absent in old Cloud Run env — fix that here) |
| R2 credentials, `REDIS_URL`, `GEMINI_API_KEY`, `NOTIFICATION_SERVICE_AUTH_TOKEN`, `SUPABASE_URL`/`SUPABASE_ANON_KEY` | Copied from `~/stunity-old-cloudrun-env-backup.txt` (full env dump of all 20 old deployments, taken 2026-07-23 before old-project shutdown; delete that file once Phase C is verified) |
| `AUTH_PASSKEYS_ENABLED`, `WEBAUTHN_RP_ID=stunity.app`, `WEBAUTHN_RP_NAME`, `WEBAUTHN_ORIGIN=https://stunity.app` | Same as current — RP stays `stunity.app` |
| CORS allow-list | Explicit origins (`https://stunity.app`, dev origins) — **not `*`** (fixes the store-readiness finding) |

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
