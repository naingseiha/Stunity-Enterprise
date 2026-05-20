# Long-Term Production Architecture — Many Microservices, One Supabase

**Last updated:** May 2026
**Audience:** Engineering, DevOps, tech leads
**Status:** Recommended roadmap (not all phases implemented yet)

This document defines how Stunity Enterprise should run in **full production** when many Cloud Run microservices share **one Supabase (PostgreSQL) project**. It complements:

| Document | Focus |
|----------|--------|
| [DEV_TO_PRODUCTION_WORKFLOW.md](./DEV_TO_PRODUCTION_WORKFLOW.md) | Day-to-day dev → deploy commands |
| [MICROSERVICES_CONNECTION_AUDIT.md](./MICROSERVICES_CONNECTION_AUDIT.md) | Connection audit, fixes, CI guard |
| [LOCAL_DEV.md](./LOCAL_DEV.md) | Local quick-start, pooler, lite mode |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Cloud Run, Vercel, EAS, migrations |

---

## 1. Executive summary

**Today:** Up to ~15 Node microservices on Google Cloud Run, each with its own Prisma pool, all using one Supabase database via the **transaction pooler** (port 6543).

**Risk:** Under load, total pool slots ≈ `services × max_instances × connection_limit`. That can exceed Supabase compute limits (timeouts, “too many connections”, slow APIs).

**Long-term strategy (do not rewrite everything at once):**

1. **Operate safely** — pool discipline, deploy tiers, monitoring, right compute tier.
2. **Consolidate by domain** — merge school-related services into fewer APIs (target **3–5** Cloud Run services).
3. **Scale reads, not pools** — Redis, optional read replica, async jobs via queues.
4. **Keep one product database** — single Supabase project for transactional data; separate warehouse only if analytics volume demands it later.

---

## 2. Current architecture (baseline)

### 2.1 Deployed microservices (Cloud Run)

Default deploy list in `scripts/deploy-cloud-run.sh`:

| Service | Port (local) | Primary consumers |
|---------|--------------|-------------------|
| auth-service | 3001 | Mobile, web, all APIs |
| feed-service | 3010 | Mobile feed, quizzes, media |
| learn-service | 3018 | Mobile learn, web learn hub |
| notification-service | 3013 | Push, in-app notifications |
| school-service | 3002 | Web admin, onboarding |
| student-service | 3003 | Web admin, mobile roster |
| teacher-service | 3004 | Web admin, mobile |
| class-service | 3005 | Web admin, mobile classes |
| subject-service | 3006 | Web admin |
| grade-service | 3007 | Web admin, reports |
| attendance-service | 3008 | Web admin, mobile |
| timetable-service | 3009 | Web admin |
| club-service | 3012 | Mobile clubs |
| analytics-service | 3014 | Gamification, leaderboards, live quiz |
| ai-service | 3020 | AI features |
| messaging-service | 3011 | Web/mobile DM (mobile archived) |

Placeholder folders (not in default deploy): `search-service`, `storage-service`, `user-service`.

### 2.2 Clients

- **Mobile (Expo):** Production URLs in `apps/mobile/src/config/env.ts` — points at separate Cloud Run URLs per domain.
- **Web (Vercel):** `NEXT_PUBLIC_*_SERVICE_URL` in `apps/web/src/lib/api/config.ts`.
- **Realtime:** Mobile uses `EXPO_PUBLIC_SUPABASE_*` for feed realtime (not Postgres pooler traffic).

### 2.3 Data layer

| URL | Use |
|-----|-----|
| `DATABASE_URL` | Transaction pooler `:6543`, `?pgbouncer=true` — **all runtime services** |
| `DIRECT_URL` | Session pooler `:5432` — **migrations only** |
| `DATABASE_READ_URL` | Optional — only when a **real** read replica exists |

**Rule:** Never point microservices at `db.*.supabase.co:5432` for runtime traffic.

---

## 3. The core problem (why one Supabase feels “full”)

PostgreSQL enforces a **maximum connection count** based on compute tier. Prisma opens a **pool** per process; each slot in the pool counts toward Supabase usage when connected through the pooler.

```text
Estimated peak slots ≈
  (number of Cloud Run services with ≥1 instance)
  × (max instances per service)
  × (Prisma connection_limit per instance)
```

### 3.1 Example scenarios

| Scenario | Services | Max inst. | limit | Peak slots |
|----------|----------|-----------|-------|------------|
| Core profile (recommended mobile) | 4 | 2 | 3 | **24** |
| Full deploy (all 15) | 15 | 3 | 3 | **135** |
| Full + min-instances=1 everywhere | 15 | 1 warm each | 3 | **45** always-on |

Supabase **Micro** is appropriate for **dev**; **full production with all services** should plan for **Small** or higher and/or fewer services.

### 3.2 What is *not* the main problem

- Having multiple APIs (microservices) is fine **if** pools are small and service count is controlled.
- Mobile calling many URLs is fine **if** each backend shares pool discipline and DB compute is sized correctly.

---

## 4. Target architecture (12–24 month vision)

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Clients                                   │
│   Expo Mobile          Vercel Web          Parent portal           │
└────────────┬──────────────────┬──────────────────┬──────────────┘
             │                  │                  │
             ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  Cloud Run — domain APIs (target: 3–5 services)                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────┐ │
│  │ social-api   │ │ school-api   │ │ learn-api    │ │ ai-api  │ │
│  │ auth+feed+   │ │ school+grade │ │ courses+     │ │ (opt)   │ │
│  │ notification │ │ +attendance… │ │ paths        │ │         │ │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └────┬────┘ │
└─────────┼────────────────┼────────────────┼──────────────┼──────┘
          │                │                │              │
          │    DATABASE_URL (pooler :6543, connection_limit=3)
          ▼                ▼                ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase — single product project (Postgres)                    │
│  Transaction pooler │ optional read replica │ Realtime           │
└─────────────────────────────────────────────────────────────────┘
          ▲
          │ cache / rate limits
┌─────────┴─────────┐
│ Redis (Upstash)   │  feed ranking cache, hot keys (phase 3)
└───────────────────┘
```

**Principles:**

- **One transactional database** per product environment (prod, staging, dev).
- **Fewer processes** talking to Postgres in production.
- **Heavy work off the request path** (queues, single-instance cron).
- **Reads scaled** via cache and replica, not via duplicating Prisma clients.

---

## 5. Phased implementation plan

### Phase 1 — Stabilize production (now → ~6 months)

**Goal:** All current services can run in production without connection storms.

| Action | Detail | Owner / artifact |
|--------|--------|------------------|
| Pool params everywhere | `withPrismaPoolParams`, `PRISMA_CONNECTION_LIMIT=3` | `services/lib/prisma-pool-url`, deploy script |
| One Prisma per process | `getPooledPrismaClient()` | `services/lib/prisma-client` |
| CI guard | `npm run check:prisma-singleton` | `scripts/check-prisma-singleton.sh`, GitHub Action |
| Deploy tiers | Core vs full | `scripts/deploy-production-core.sh` |
| Disable keepalive in prod | `DISABLE_DB_KEEPALIVE=1` | `scripts/deploy-cloud-run.sh` |
| Background jobs | Default off; feed opt-in | `FEED_ENABLE_BACKGROUND_JOBS`, `DISABLE_BACKGROUND_JOBS` |
| Dev/prod DB split | `stunity-dev` vs production project | `scripts/activate-dev-database.sh` |
| Compute tier | **Small+** for prod with all services | Supabase dashboard |
| Monitoring | Connections, Cloud Run latency, 5xx | Supabase + GCP |

**Exit criteria:**

- [ ] Peak connections stay below ~70% of Supabase limit for 7 days
- [ ] No recurring `P1001` / pool timeout in service logs
- [ ] Core user journeys (login, feed, class list) p95 &lt; agreed SLA

---

### Phase 2 — Consolidate by bounded context (6–18 months)

**Goal:** Reduce Cloud Run service count from ~15 to **3–5** without a big-bang rewrite.

#### 2.1 Proposed merge map

| Target API | Absorbs (current services) | Rationale |
|------------|----------------------------|-----------|
| **social-api** | auth-service, feed-service, notification-service | Shared user identity, feed, pushes |
| **school-api** | school, student, teacher, class, subject, grade, attendance, timetable | Same tenant (`schoolId`), same admin UX |
| **learn-api** | learn-service | Course domain isolated |
| **engagement-api** (optional) | analytics-service, club-service | Gamification + clubs |
| **ai-api** | ai-service | Different scaling, keys, rate limits |

**Keep separate if:** independent scaling, security boundary, or team ownership is strong (e.g. AI).

#### 2.2 Implementation approach (low risk)

1. **Monorepo modules first** — move routes into `services/school-api/src/modules/{students,grades,...}` without deleting old services.
2. **Strangler routing** — API gateway or URL prefix sends new traffic to merged service; old Cloud Run names kept as aliases during migration.
3. **Dual-write period** — only if schema changes; otherwise read-only cutover per route group.
4. **Update clients last** — change `NEXT_PUBLIC_*` and mobile `env.ts` once new URLs stable.

#### 2.3 Suggested merge order

| Order | Merge | Reason |
|-------|-------|--------|
| 1 | subject + class → class module | Small, few cross-deps |
| 2 | student + teacher → school-api | Shared roster patterns |
| 3 | grade + attendance + timetable | Admin web heavy |
| 4 | school-service into school-api | Onboarding + settings |
| 5 | auth + notification into social-api | Token + push coupling |
| 6 | feed stays boundary until Redis | Highest traffic |

**Exit criteria:**

- [ ] ≤ 5 Cloud Run services in production
- [ ] Peak connection estimate ≤ 40 slots at configured max scale
- [ ] No regression on web admin + mobile feature matrix ([CURRENT_FEATURES.md](./current/CURRENT_FEATURES.md))

---

### Phase 3 — Scale reads and async work (when metrics justify)

**Triggers (any of):**

- Feed p95 latency &gt; target while CPU/connections healthy
- Read I/O &gt; 70% on Supabase dashboard
- Daily active users &gt; internal threshold (define per business)

| Capability | Purpose | Notes |
|------------|---------|-------|
| **Redis** | Feed precompute, rate limits, session cache | `REDIS_URL` mentioned in LOCAL_DEV; wire in feed-service |
| **Read replica** | `DATABASE_READ_URL` for feed/learn reads | Only enable `prismaRead` second client when URL is a **real** replica |
| **Cloud Tasks / Pub/Sub** | Notifications, emails, exports | Replace in-process `setInterval` cron |
| **CDN + R2** | Media | Already Cloudflare R2 — keep hot paths off DB |

**Exit criteria:**

- [ ] 30%+ reduction in read query volume on primary (measured)
- [ ] Background jobs run on ≤ 1 dedicated worker revision

---

### Phase 4 — Optional advanced (12+ months, cost-driven)

| Option | When to consider |
|--------|----------------|
| Prisma Accelerate / external pooler | Many services must stay separate; pool centralization without merge |
| Analytics warehouse (BigQuery) | Reporting crushes OLTP |
| Second Supabase project | **Only** for isolated staging — not split prod product DB |
| Regional replicas | Multi-region user base |

---

## 6. Connection budget worksheet

Use this before every production scale change.

```text
peak_slots = Σ (service_s) [ max_instances_s × connection_limit_s × clients_per_process_s ]
```

| Variable | Production default | Dev default |
|----------|-------------------|-------------|
| `connection_limit` | 3 | 2 |
| `max_instances` (core) | 2 | N/A (local processes) |
| `clients_per_process` | 1 (enforce via CI) | 1 |
| `min_instances` (auth, feed) | 1 each (core profile) | 0 |

**Template (fill per deploy):**

| Service | max inst. | min inst. | limit | clients | subtotal |
|---------|-----------|-----------|-------|---------|----------|
| auth-service | | | 3 | 1 | |
| feed-service | | | 3 | 1 | |
| … | | | | | |
| **Total** | | | | | |

**Rule of thumb:** Keep production peak **≤ 50–60** on Small; **≤ 100** on Medium; measure actuals in Supabase dashboard.

---

## 7. Production deployment profiles

### 7.1 Profile: `core` (mobile + social)

```bash
./scripts/deploy-production-core.sh
```

Deploys: auth, feed, notification, learn.
Defaults: auth/feed `min-instances=1`, `CLOUD_RUN_MAX_INSTANCES=2`, `PRISMA_CONNECTION_LIMIT=3`.

**Use when:** Mobile app release, feed-focused sprint, minimizing DB load.

### 7.2 Profile: `school` (web admin)

Deploy only school-domain services:

```bash
./scripts/deploy-cloud-run.sh \
  school-service student-service teacher-service class-service \
  subject-service grade-service attendance-service timetable-service
```

**Use when:** Grade/attendance/timetable release; no mobile feed changes.

### 7.3 Profile: `full`

```bash
./scripts/deploy-cloud-run.sh
# Interactive confirm — 15 services
```

**Use when:** Full regression before major release.
**Requires:** Small+ Supabase, connection monitoring, off-peak deploy.

### 7.4 Environment variables (production)

Set in root `.env`; injected by `deploy-cloud-run.sh`:

| Variable | Recommended prod value |
|----------|------------------------|
| `DATABASE_URL` | Production pooler `:6543` + `pgbouncer=true` |
| `DIRECT_URL` | Session pooler `:5432` (migrations only) |
| `PRISMA_CONNECTION_LIMIT` | `3` |
| `PRISMA_POOL_TIMEOUT` | `10` |
| `DISABLE_DB_KEEPALIVE` | `1` (set by deploy script) |
| `DISABLE_BACKGROUND_JOBS` | `true` (default all services) |
| `FEED_ENABLE_BACKGROUND_JOBS` | `0` unless single cron revision |
| `CLOUD_RUN_MAX_INSTANCES` | `2`–`3` (core), tune per service |
| `CORS_ORIGIN` | Real web origin (not `*`) |

**Never deploy with:** `STUNITY_USE_DEV_DB=1` or dev project ref in `DATABASE_URL` (script blocks dev ref).

---

## 8. Supabase sizing guide

| Tier | Typical use | All 15 services? |
|------|-------------|------------------|
| **Free / Micro** | `stunity-dev` only | ❌ |
| **Micro (prod)** | Early pilot, low users | ⚠️ Core 4 only |
| **Small** | Full prod, moderate users | ✅ with limits + monitoring |
| **Medium+** | Growth, all services, peak traffic | ✅ recommended target |

**Upgrade signals:**

- Frequent connection errors in logs
- Dashboard “Database” CPU pegged
- p95 API latency up while Cloud Run CPU low (DB-bound)

---

## 9. Code standards (enforce in PRs)

### 9.1 Prisma

```typescript
// ❌ Forbidden in controllers / route files
const prisma = new PrismaClient();

// ✅ Service entry or lib/prisma.ts
import { getPooledPrismaClient } from '../../lib/prisma-client';
export const prisma = getPooledPrismaClient();

// ✅ feed / learn
import { prisma, prismaRead } from '../context';
```

Run locally: `npm run check:prisma-singleton`

### 9.2 Read replica

```typescript
// context.ts pattern — only two clients when DATABASE_READ_URL differs
const useDedicatedReadReplica = Boolean(readUrlRaw && readUrlRaw !== databaseUrl);
export const prismaRead = useDedicatedReadReplica ? new PrismaClient(...) : prisma;
```

Do **not** set `DATABASE_READ_URL` to the same URL as `DATABASE_URL` in production.

### 9.3 Background work

- No unbounded `setInterval` per instance without guard.
- Prefer `DISABLE_BACKGROUND_JOBS=true` on all but one revision.
- Long-term: Cloud Tasks subscriber.

---

## 10. Client configuration checklist

### 10.1 Mobile production build (EAS)

- [ ] `EXPO_PUBLIC_APP_ENV=production`
- [ ] Supabase prod URL + anon key (not dev publishable key)
- [ ] Cloud Run URLs match deployed revisions
- [ ] Remove or archive unused URLs (e.g. messaging if feature off)

### 10.2 Web production build (Vercel)

- [ ] All `NEXT_PUBLIC_*_SERVICE_URL` set (see warnings in `apps/web/src/lib/api/config.ts`)
- [ ] No `localhost` fallbacks in production bundle
- [ ] CORS on services allows Vercel origin

---

## 11. Monitoring and alerting

### 11.1 Weekly

| Check | Where |
|-------|--------|
| Active DB connections vs limit | Supabase → Database → Connections |
| Connection pooler errors | Supabase logs |
| Cloud Run 5xx rate per service | GCP Cloud Run metrics |
| p95 latency auth + feed | GCP / client analytics |

### 11.2 Alerts to configure (recommended)

- Supabase connections &gt; 80% of max for 5 minutes
- Cloud Run error rate &gt; 1% for 10 minutes on auth or feed
- Migration deploy failure in CI/CD

---

## 12. Anti-patterns (do not do)

| Anti-pattern | Why |
|--------------|-----|
| 15 services × high `connection_limit` | Exhausts pooler |
| `min-instances=1` on every service | Always-on slot waste |
| Multiple `new PrismaClient()` per service | Multiplies pools (fixed in club/analytics — redeploy) |
| `db.*:5432` from Cloud Run | Bypasses pooler |
| `db push --force-reset` on production | Data loss |
| Separate Supabase prod DB per microservice | Schema drift |
| Feed background jobs on every scaled instance | Duplicate heavy queries |
| Full stack deploy for every hotfix | Slow, risky, connection spike |

---

## 13. Decision log (template)

Record major infra decisions here.

| Date | Decision | Rationale | Revisit |
|------|----------|-----------|--------|
| 2026-05 | Dev project `stunity-dev` separate from prod | Safe local/schema work | — |
| 2026-05 | `deploy-production-core` default for mobile | Lower connection footprint | When school-api ships |
| | Target 3–5 domain APIs by 2027 | Connection + ops cost | Q2 2027 review |

---

## 14. Related commands (quick reference)

```bash
# Dev
source scripts/activate-dev-database.sh
./quick-start-lite.sh

# Checks
npm run check:prisma-singleton

# Production migrate
ALLOW_PRODUCTION_DB=1 npx prisma migrate deploy \
  --schema=packages/database/prisma/schema.prisma

# Deploy
./scripts/deploy-production-core.sh
./scripts/deploy-cloud-run.sh school-service grade-service  # subset
```

---

## 15. FAQ

**Q: Can all 15 services be live in production?**
A: Yes, functionally. Smooth operation requires Small+ compute, `connection_limit=3`, deployed fixes, and monitoring. Long-term, consolidate to reduce ops and connection headroom.

**Q: Should we use multiple Supabase projects for production?**
A: **Dev + prod** yes. **Per microservice** no — use one product database.

**Q: Is microservices wrong for us?**
A: Not wrong — **too many separate pools on one small DB** is the mismatch. Consolidate domains or centralize pooling over time.

**Q: When do we add Redis?**
A: Phase 3, when feed/read latency or DB metrics justify it — not a day-one requirement.

**Q: Mobile needs many URLs — is that bad?**
A: HTTP calls to many hosts is fine. The cost is on the **server side** (each host = pool), not the number of client URLs.

---

## 16. Next implementation tasks (backlog)

| ID | Task | Phase |
|----|------|-------|
| L1 | Document actual prod connection peak after 1 week monitoring | 1 |
| L2 | Redeploy club + analytics with singleton prisma | 1 |
| L3 | Add `DEPLOY_PROFILE=school` script mirroring core | 1 |
| L4 | Spike: `school-api` folder structure + first merged routes | 2 |
| L5 | Redis POC for feed precompute cache | 3 |
| L6 | Cloud Tasks for notification batch jobs | 3 |

---

*Maintainers: update this doc when deploy profiles, service list, or merge map changes.*
