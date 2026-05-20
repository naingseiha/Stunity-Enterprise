# Microservices — Connection & Resource Audit

**ធ្វើបច្ចុប្បន្នភាព:** May 2026
**គោលដៅ:** កាត់បន្ថយ Supabase connections មិនចាំបាច់, រក្កា app លឿន, ប្រក្រតីតាម enterprise patterns

ពាក់ព័ន្ធ៖ [PRODUCTION_ARCHITECTURE_LONG_TERM.md](./PRODUCTION_ARCHITECTURE_LONG_TERM.md), [LOCAL_DEV.md](./LOCAL_DEV.md), [DEV_TO_PRODUCTION_WORKFLOW.md](./DEV_TO_PRODUCTION_WORKFLOW.md)

---

## 1. ស្តង់ដារ Enterprise (អ្វីដែល “ត្រឹមត្រូវ”)

| គោលការណ៍ | Stunity target |
|----------|----------------|
| **មួយ PrismaClient ក្នុងមួយ process** | ✅ `services/lib/prisma-client` → `getPooledPrismaClient()` |
| **Pooler URL** port `6543` + `pgbouncer=true` | ✅ `withPrismaPoolParams()` |
| **`connection_limit` ទាប** | ✅ default `3` (local lite: `2`) |
| **មិនពីរ read client** លើ URL ដូចគ្នា | ✅ feed + learn: `prismaRead` = `prisma` unless `DATABASE_READ_URL` |
| **Keepalive បិទ** ពេល local | ✅ `DISABLE_DB_KEEPALIVE=1` in quick-start |
| **Liveness មិន query DB** | ✅ `/health` cheap; `/ready` / `/health/ready` for DB checks |
| **Deploy តែ services ដែលផ្លាស់** | ✅ `deploy-production-core.sh`, per-service deploy |
| **Dev DB ដាច់** | ✅ `activate-dev-database.sh` |

---

## 2. រូបមន្ត connections (យល់មុនពេល optimize)

```text
Supabase slots ≈
  (ចំនួន microservice processes កំពុងដំណើរការ)
  × (Prisma clients ក្នុង process នោះ)
  × connection_limit (URL param)
```

**ឧទាហរណ៍ local full quick-start (មុន):**
14 services × 2 clients × limit 20 ≈ **រយៈពាន់** pool slots → timeout

**ឥឡូវ lite dev:**
4 services × 1 client × limit 2 ≈ **~8 slots** ✅

**Production Cloud Run (core, max 2 instances):**
4 services × 2 instances × 1 client × 3 ≈ **~24 slots** (គួរសម Micro/Small)

---

## 3. ស្ថានភាពតាម service

| Service | Prisma clients / process | Pool params | Keepalive | កំណត់ចំណាំ |
|---------|-------------------------|-------------|-----------|-------------|
| auth-service | 1 | ✅ | ❌ | OK |
| feed-service | 1 (+ read = same URL) | ✅ | optional | Background jobs: hourly/daily |
| learn-service | 1 (+ read = same) | ✅ | ❌ | qa/review → shared `context` ✅ |
| notification-service | 1 | ✅ | ❌ | OK |
| class, subject, club, timetable | 1 each | ✅ | ❌ | club: **fixed** (was 12 clients) |
| school, student, teacher, grade, attendance | 1 each | ✅ | ⚠️ keepalive if env allows | OK if `DISABLE_DB_KEEPALIVE=1` |
| messaging-service | 1 | ✅ | ⚠️ | Skipped in lite by default |
| analytics-service | **1** (was ~8) | ✅ | ❌ | **fixed** gamification modules |
| ai-service | check locally | — | — | Not in lite stack |

---

## 4. បញ្ហាដែលរកឃើញ (និងស្ថានភាព)

### 🔴 Critical — បានជួស (May 2026)

| បញ្ហា | ផលប៉ះពាល់ | ដំណោះស្រាយ |
|-------|-----------|------------|
| **club-service:** 11 controllers × `new PrismaClient()` | ~11 pools × limit default ក្នុង process តែមួយ | `club-service/src/lib/prisma.ts` shared |
| **analytics-service:** gamification modules each `new PrismaClient()` | ~8 pools / process | `analytics-service/src/lib/prisma.ts` |

### 🟡 Medium — ដឹង / គ្រប់គ្រង

| បញ្ហា | ណែនាំ |
|-------|--------|
| **14 microservices** on one DB | Daily dev: `quick-start-lite` only. Prod: `deploy-production-core` |
| **Keepalive** on 7 services | Local: `DISABLE_DB_KEEPALIVE=1`. Prod deploy: now set in `deploy-cloud-run.sh` |
| **Startup DB warmup** on cold starts | Local + Cloud Run: `DISABLE_DB_STARTUP_WARMUP=1` unless testing DB readiness |
| **feed gamification jobs** | Set `DISABLE_BACKGROUND_JOBS=true` locally if not testing |
| **student-service** index + `studentIdGenerator` | 2 singletons possible — low impact (same limit); merge later optional |
| **Too many Cloud Run services scaled** | `CLOUD_RUN_MAX_INSTANCES=2`, deploy subset |

### 🟢 Already good

- `withPrismaPoolParams` on service entrypoints
- feed/learn single read client when no replica URL
- Deploy refuses dev `DATABASE_URL`
- Mobile messaging archived (less WS/DB load)

---

## 5. Local development — អ្វីគួរធ្វើ

```bash
source scripts/activate-dev-database.sh
./quick-start-lite.sh
```

Env (auto in lite / dev):

```bash
PRISMA_CONNECTION_LIMIT=2
DISABLE_DB_KEEPALIVE=1
DISABLE_DB_STARTUP_WARMUP=1
SKIP_MESSAGING_SERVICE=1
SKIP_DB_MIGRATE=1          # optional — avoid migrate noise on dev
DISABLE_BACKGROUND_JOBS=true   # optional — less feed CPU/DB
```

**មិនប្រើ** `./quick-start.sh` សម្រាប់ feed/mobile ទើប — បើក 10+ services មិនចាំបាច់។

---

## 6. Production — តើមានអ្វី “មិនប្រក្រតី” បន្ទាប់ deploy?

### 6.1 បញ្ហាដែល **ធ្លាប់** កើត (និងឥឡូវគ្រប់គ្រង)

| បញ្ហា | ផលលើ production | ស្ថានភាពឥឡូវ |
|-------|------------------|----------------|
| Deploy **15 services** × max 3 instances × pool 3 | រហូតដល់ **~135** pool slots ពេល peak | ប្រើ `deploy-production-core.sh` (4 services) |
| **club / analytics** ច្រើន PrismaClient / process | Slots × 8–12 ក្នុង service តែមួយ | ✅ ជួស — 1 client / process |
| **Keepalive** `SELECT 1` រៀងរាល់ 4 នាទី × N services | Connection churn + slots | ✅ `DISABLE_DB_KEEPALIVE=1` on deploy |
| **Health checks** querying DB | Uptime checks create pool traffic | ✅ `/health` liveness is cheap; use `/ready` only when needed |
| **feed** background jobs × **រាល់** Cloud Run instance | 5min ranker + cache × instances | ✅ default `DISABLE_BACKGROUND_JOBS=true`; `FEED_ENABLE_BACKGROUND_JOBS=1` តែពេលចង់ |
| **auth+feed min-instances=1** (core profile) | Can hold up to ~6 slots after traffic (2×3) | ចាំបាច់សម្រាប់ cold start — ទាប |

### 6.2 Connection budget (production core profile)

ឧបមាត្រ **`deploy-production-core.sh`** defaults:

| Service | min | max | clients/instance | limit | slots (max theory) |
|---------|-----|-----|------------------|-------|---------------------|
| auth | 1 | 2 | 1 | 3 | 6 |
| feed | 1 | 2 | 1 | 3 | 6 |
| notification | 0 | 2 | 1 | 3 | 6 |
| learn | 0 | 2 | 1 | 3 | 6 |
| **សរុប** | | | | | **≤ ~24** |

Supabase **Micro** ជារឿយៗអាចទ្រទ្រង់ ~60–100 client connections (ផ្អែក plan) — **core profile សុវត្ថិភាព** បើមិន deploy school stack ក្នុងពេលដំណាលគ្នា។

### 6.3 បើ deploy **ទាំង 15 services** (មិនណែនាំ)

```text
15 services × 3 max instances × 3 connection_limit = 135 slots (worst case)
```

នេះ **មិនប្រក្រតី** លើ Micro — នឹងឃើញ timeout / “too many connections” ពេល traffic ឡើង។
**ណែនាំ:** deploy តែ services ដែល app ប្រើពិត (mobile core = 4; web admin = +school, grade, …)។

### 6.4 Checklist បន្ទាប់ deploy production

- [ ] `.env` = **production** Supabase (មិន dev ref)
- [ ] `npx prisma migrate deploy` រួចមុន code deploy
- [ ] `./scripts/deploy-production-core.sh` (ឬ subset)
- [ ] Supabase Dashboard → **Database → Connections** — stable
- [ ] `PRISMA_CONNECTION_LIMIT=3` (មិន 20)
- [ ] **មិន** set `DATABASE_READ_URL` លុះត្រាតែមាន replica
- [ ] Feed background jobs: បើត្រូវការ → `FEED_ENABLE_BACKGROUND_JOBS=1` **តែមួយ** revision / max-instances=1

### 6.5 CI guard (P1)

```bash
npm run check:prisma-singleton
```

GitHub Actions: `.github/workflows/prisma-singleton-check.yml` — ហាម `new PrismaClient()` ក្នុង controllers ថ្មី។

---

## 7. Production — អ្វីគួរធ្វើ (commands)

1. **Migrate:** `ALLOW_PRODUCTION_DB=1 npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma`
2. **Deploy core:** `./scripts/deploy-production-core.sh`
3. **Env on Cloud Run** (script sets):
   - `PRISMA_CONNECTION_LIMIT=3`
   - `PRISMA_POOL_TIMEOUT=10`
   - `DISABLE_DB_KEEPALIVE=1`
   - `DISABLE_DB_STARTUP_WARMUP=1`
   - `DISABLE_BACKGROUND_JOBS=true` (feed included unless `FEED_ENABLE_BACKGROUND_JOBS=1`)
   - `CLOUD_RUN_MAX_INSTANCES=2` (adjust by plan)
4. **Do not set** `DATABASE_READ_URL` unless you have a real read replica
5. **Supabase compute:** Micro minimum for multi-service; monitor Connections dashboard

---

## 8. Code convention (អ្នកអភិវឌ្ឍន៍ថ្មី)

```typescript
// ❌ កុំធ្វើក្នុង controllers / routes
const prisma = new PrismaClient();

// ✅ Service entry or lib/prisma.ts
import { getPooledPrismaClient } from '../../lib/prisma-client';
export const prisma = getPooledPrismaClient();

// ✅ feed / learn — use context.ts exports only
import { prisma, prismaRead } from '../context';
```

---

## 9. Roadmap (ជម្រើស បន្ទាប់)

| Priority | Task |
|----------|------|
| P1 | ✅ `npm run check:prisma-singleton` + GitHub Action |
| P2 | Merge student-service to single prisma export |
| P3 | Redis cache for hot feed reads (reduce DB round-trips) |
| P4 | Consolidate school-domain APIs long-term (fewer Cloud Run services) |
| P5 | Read replica + `DATABASE_READ_URL` only when Supabase replica exists |

---

## 10. តារាងពិនិត្យរហ័ស (weekly)

- [ ] Supabase Dashboard → Connections stable under peak
- [ ] Local: quick-start log shows `🧪 dev` + `connection_limit=2`, `keepalive=1`, `startup_warmup=1`
- [ ] No `new PrismaClient()` in `services/*/src/controllers` (grep)
- [ ] Production deploy uses production `.env` only
- [ ] Only changed services redeployed
