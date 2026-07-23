# Architecture Review — Service Consolidation Decision (2026-07)

**Date:** 2026-07-23
**Status:** 🔵 Analysis only — **no implementation started**. This is the pre-work requested before touching any code.
**Audience:** Solo founder/engineer (Stunity Enterprise), future collaborators
**Trigger:** Manual Cloud Run billing exceeded free tier; open question of whether the 16-service split is correct for a pre-revenue, pre-production, solo-maintained project.

Related docs (read alongside this one — this document reconciles with, not replaces, them):

| Document | Relationship to this review |
|---|---|
| [PRODUCTION_ARCHITECTURE_LONG_TERM.md](./PRODUCTION_ARCHITECTURE_LONG_TERM.md) | Already recommends consolidating ~15 services → 3–5 domain APIs on **one** Supabase project ("Phase 2", written May 2026). This review confirms that direction with fresh evidence and gives the concrete merge map + migration mechanics. **That phase was never executed** — still 16 services in production deploy list today. |
| [MICROSERVICES_CONNECTION_AUDIT.md](./MICROSERVICES_CONNECTION_AUDIT.md) | Operational connection-pool audit (Prisma clients, pool slots). This review is about **service/data boundaries**, not connection tuning — complementary, not overlapping. |
| [POLYGLOT_ARCHITECTURE_PLAN.md](./POLYGLOT_ARCHITECTURE_PLAN.md) | Already concluded "PostgreSQL is the only correct choice" for the school-management domain (ACID, complex joins). This review agrees and treats that domain as one undividable data boundary. |
| [SECURITY_IMPROVEMENTS.md](./SECURITY_IMPROVEMENTS.md) | Claims JWT_SECRET hardcoded-fallback issue is fixed. §6 of this review found the fix is **partial** — see correction below. |

---

## 1. Executive summary

**Question asked:** Is the current 16-microservice split correct for this project, or should it change — and does changing it put the working app at risk?

**Answer:**
- The 16-way split is **not** correct. It is a "distributed monolith": 16 independently deployed processes that all share **one** Postgres database (one 4,724-line / 176-model Prisma schema). This gives you the operational cost of microservices (16 Dockerfiles, 16 CI paths, 16 copies of auth/CORS/rate-limit boilerplate) without the main benefit (independent data ownership, independent scaling, fault isolation at the data layer).
- **Full "true" microservices (one database per service, for all 16)** would be a step in the *wrong* direction — most of the 16 services are not independent bounded contexts, they are slices of one relational domain (school/student/teacher/class/grade/attendance/timetable). Splitting their databases would force distributed transactions for routine operations (e.g. transferring a student between classes) and reduce correctness, not improve it.
- The **correct target** is a **modular consolidation**: reduce 16 deployables to 3–4 domain services, and split the database along the *one* real seam the schema evidence supports (Identity/Social vs. Academic), not along all 16 current service lines. This matches (and sharpens) what [PRODUCTION_ARCHITECTURE_LONG_TERM.md](./PRODUCTION_ARCHITECTURE_LONG_TERM.md) already proposed and never executed.
- Because the project is **pre-production** (real-device tested, not yet released to real users), this consolidation is **low-risk right now** and becomes significantly more expensive and risky after launch. This is the cheapest window that will ever exist to fix it.

---

## 2. Current state — verified facts

All figures below were confirmed directly against the repository on 2026-07-23 (not estimated).

### 2.1 Deployables

- **16 services** actually deployed to Cloud Run (`scripts/deploy-cloud-run.sh:117-134`): auth, feed, learn, school, student, teacher, attendance, class, subject, grade, analytics, club, messaging, notification, ai, timetable.
- **3 dead stub directories**, never deployed, 0 lines of code: `search-service`, `storage-service`, `user-service` (also `services/lib`, which is a shared library, not a service).

### 2.2 Data layer

- **One Prisma schema**, `packages/database/prisma/schema.prisma` — 176 models, 4,724 lines.
- Every service's Dockerfile copies this same schema into its own image (`COPY packages/database/prisma ./prisma/`) and every service's `DATABASE_URL` points at the **same** Supabase Postgres project (`mwqdsxbxqlkrahoyqqox`, transaction pooler `:6543`).
- No service owns its own data. This is the technical definition of a **distributed monolith**, not microservices.

### 2.3 Client → service topology

- **No API gateway / BFF.** Mobile and web hold ~16 separate base URLs directly (`AUTH_SERVICE_URL`, `SCHOOL_SERVICE_URL`, … `AI_SERVICE_URL`) in `.env` / `apps/mobile/src/config/env.ts` / `apps/web/src/lib/api/config.ts`.
- JWT verification logic is independently re-implemented in nearly every service (each has its own `jsonwebtoken` dependency and its own decode/verify code path).
- Direct synchronous service-to-service HTTP calls exist (`axios`) in `club-service`, `analytics-service`, `attendance-service`, `grade-service` — cross-service coupling with no message queue or event bus to absorb failure.

### 2.4 Size distribution (why "16 services" is itself suspicious)

| Service | LOC | Notes |
|---|---:|---|
| feed-service | 23,511 | Legitimately large — media, ranking, ws |
| auth-service | 12,482 | Legitimately large — passkeys, OIDC, 2FA, sessions |
| school-service | 7,429 | |
| analytics-service | 5,998 | |
| club-service | 5,459 | |
| learn-service | 4,852 | |
| grade-service | 4,389 | |
| attendance-service | 4,197 | |
| student-service | 3,539 | |
| timetable-service | 3,100 | |
| class-service | 3,016 | |
| teacher-service | 2,686 | |
| ai-service | 1,651 | |
| messaging-service | 1,233 | |
| notification-service | 1,052 | |
| subject-service | 971 | Full Docker/Cloud Run/CI footprint for < 1,000 lines |
| search-service / storage-service / user-service | 0 | Dead scaffolding, not deployed |

Several of the 16 are too small to justify independent deployment overhead on their own merits; they exist as separate services because of how the project was initially decomposed, not because they have independent scaling or data-ownership needs.

### 2.5 Confirmed cost driver

`scripts/deploy-cloud-run.sh:112-113` sets `auth-service` and `feed-service` to `CLOUD_RUN_MIN_INSTANCES=1` by default under the `core` deploy profile — i.e. always-on, not scale-to-zero. Cloud Run's free tier only stays free under scale-to-zero traffic-based billing; any service pinned at `min-instances≥1` bills continuously regardless of traffic. This is almost certainly the specific service that caused the unexpected billing.

---

## 3. Domain analysis — where the real boundaries are

This is new evidence gathered for this review: actual foreign-key relationships in the 176-model schema, not assumptions from the service folder names.

**Finding: the 176 models cluster into two — not sixteen — natural bounded contexts.**

### Cluster A — Academic / School Information System (SIS)

`School, Student, Teacher, Class, Subject, Grade, Attendance, TimetableEntry, StudentClass, TeacherClass, ClubMember, ClubGrade, Enrollment, AcademicYear/Term, …`

Evidence of tight, transactional coupling:
```prisma
model Grade {
  class   Class   @relation(fields: [classId],   references: [id], onDelete: Cascade)
  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  subject Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)
}
model Attendance {
  class   Class?  @relation(fields: [classId],   references: [id])
  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
}
```
Routine operations here (e.g. moving a student between classes) touch several of these tables **atomically**. This is one bounded context. Splitting it across databases would force every such operation to become a distributed saga — strictly worse correctness for zero benefit, since this domain has no independent scaling need (low write volume, admin/teacher/parent UI only).

### Cluster B — Identity / Social / Engagement

`User, AuthSession, PasskeyCredential, TwoFactorSecret, SocialAccount, Post, Comment, Like, Story, DirectMessage, Conversation, Notification, Course, Lesson, AnalyticsEvent, …`

Evidence of loose, reference-only coupling — everything here points at `User`, not at the Academic cluster:
```prisma
model Post         { author  User @relation(fields: [authorId], references: [id]) }
model Course        { instructor User @relation(fields: [instructorId], references: [id]) }
model Notification  { recipient User @relation(fields: [recipientId], references: [id]) }
model ClubGrade     { gradedBy  User @relation("ClubGrader", fields: [gradedById], references: [id]) }
model AnalyticsEvent { userId String /* no @relation at all — already decoupled in code */ }
```
`Student`/`Teacher` hold only an **optional** 1:1 pointer to `User` (`user User?`) — the one place the two clusters touch, and it's a low-frequency lookup (login/account-linking), not a per-query join.

**Conclusion:** there is exactly **one** defensible database seam in this schema — Academic vs. Identity/Social — not sixteen. `AnalyticsEvent` already has zero enforced relations, making it the safest model to move first if/when a third database is ever justified.

---

## 4. Decision (ADR)

### Options considered

| | Option A — Status quo (16 services, 1 DB) | Option B — "True" microservices (DB-per-service, ~16 DBs) | Option C — Modular consolidation (3–4 services, 2–4 DBs, phased) | Option D — Single monolith (1 service, 1 DB) |
|---|---|---|---|---|
| Matches actual data coupling | ❌ no isolation, but no split either | ❌ forces distributed transactions on a tightly relational domain | ✅ splits only where FK evidence supports it | ⚠️ correct for data, loses AI/Feed isolation |
| Ops overhead (solo dev) | 🔴 16 Dockerfiles/CI paths/dep sets | 🔴🔴 same 16, plus event bus, saga logic, schema-drift risk | 🟢 3–4 deployables | 🟢 1 deployable |
| Cost | 🔴 min-instances misconfig already caused overage | 🔴 Supabase Free = 2 projects only; 16 would require ~14 × Pro-tier projects (~$25+/mo **each**, [source](https://uibakery.io/blog/supabase-pricing)) — hundreds of $/mo before any compute | 🟢 fits inside Supabase Free (2 projects) at Phase 1; adds cost only as revenue justifies it | 🟢 cheapest |
| Blast radius / isolation where it matters (auth security, feed load, AI latency) | ⚠️ none | ✅ full, but disproportionate everywhere | ✅ preserved exactly where justified (auth, feed, AI) | ❌ none |
| Migration effort from today | — | 🔴🔴 very high — rewrite 176-model schema into ~16, build event sync for every cross-cluster reference | 🟡 moderate — mostly code moves, one real DB split | 🟡 moderate, but throws away legitimate isolation |

### Decision: **Option C — Modular consolidation**

Target end-state (reached in phases, §5):

```
┌─────────────────────────┐   ┌───────────────────────────────┐   ┌──────────────┐
│   Academic / SIS API     │   │  Engagement API                 │   │   AI API      │
│ school+student+teacher+  │   │ auth+feed+messaging+notification│   │  ai-service   │
│ class+subject+grade+     │   │ +learn+analytics+club(social)   │   │ (stateless,   │
│ attendance+timetable     │   │                                  │   │  no own DB)   │
└────────────┬─────────────┘   └───────────────┬─────────────────┘   └──────┬────────┘
             │ DB-1 (Academic)                  │ DB-2 (Engagement)          │ calls Engagement
             ▼                                   ▼                          │  for auth only
        Supabase project #1                 Supabase project #2  ◄──────────┘
```

Later, only once revenue justifies the extra Supabase cost: peel **Auth** out of the Engagement DB into its own project (security blast-radius reduction), and peel `AnalyticsEvent` out (already has zero FK — cheapest possible future split).

This is consistent with, and sharper than, the merge map already proposed in [PRODUCTION_ARCHITECTURE_LONG_TERM.md §5.2](./PRODUCTION_ARCHITECTURE_LONG_TERM.md#5-phased-implementation-plan) (`social-api`, `school-api`, `learn-api`, `ai-api`). The difference here is DB-count discipline: that document keeps everything on **one** Supabase project indefinitely; this review recommends the **one** additional split (Academic vs. Engagement) that the schema evidence actually supports, timed to arrive free (within the 2-project free tier) rather than costing extra immediately.

---

## 5. Phased plan

| Phase | What | Database changes | Cost | Risk (pre-production) |
|---|---|---|---|---|
| **0** | Merge 11 core-SIS services (school/student/teacher/class/subject/grade/attendance/timetable/club) into one **Academic API**. Merge auth/feed/messaging/notification/learn/analytics into one **Engagement API**. Delete `search-service`/`storage-service`/`user-service` stubs. AI stays separate. | None — same DB, pure code/router move | $0 | Very low — no data touched |
| **1** | Point Academic API and Engagement API at **two separate** Supabase projects | Real split, along the Cluster A/B boundary from §3 | $0 (fits 2-project free tier) | Low — no production users yet (§6) |
| **2** *(post-revenue)* | Peel Auth out of Engagement DB into its own project | 3rd Supabase project | +$25–35/mo | Low, mechanical |
| **3** *(only if traffic demands)* | Peel `AnalyticsEvent` (and optionally Feed) out | 4th project | +$25–35/mo | Very low — model already has no FK |

**Do not** attempt Phase 1+ before Phase 0. Phase 0 is pure refactor risk (import/routing mistakes, testable immediately) with zero data risk; doing it first also makes Phase 1 simpler (2 Prisma schema/client packages to create instead of untangling 16).

---

## 6. Why pre-production timing matters (and simplifies this)

The project is real-device tested but **not released to real users** — no production data continuity to protect, no uptime SLA, no live-write traffic during a cutover window.

This removes the need for the heavyweight zero-downtime migration machinery (dual-write, CDC/logical replication, multi-day soak periods) that would be mandatory once real users exist. Instead, Phase 1's database split can be done directly:

1. Split `packages/database/prisma/schema.prisma` into two schema files/packages (`database-academic`, `database-engagement`) along the Cluster A/B line in §3.
2. Convert cross-cluster Prisma `@relation` fields to plain scalar ID columns (Prisma relations only work within one database) — e.g. `Post.author User @relation(...)` → `Post.authorId String`. Anywhere code did `include: { author: true }`, replace with an explicit lookup call to the Engagement API (small, since Cluster A rarely needs Cluster B data, and vice versa is mostly display-only fields like name/avatar).
3. Provision the second Supabase project, run `prisma migrate` for the Engagement schema subset against it.
4. One-off copy script (reuse the existing `migrate:v1-export` / `migrate:v1-import` pattern already in this repo) to move the relevant tables — **preserve every primary-key `id` value exactly**, since IDs become plain string references across the DB boundary with no enforced FK.
5. Point Engagement API's Prisma client at the new DB, redeploy, and run a full manual regression pass on real iOS/Android devices (login, feed, DM, notifications, learn) — the same kind of device pass already part of this project's normal workflow.
6. No maintenance window, no dual-write, no rollback-soak period required — if something's wrong, fix and redeploy; there's no live user session to protect.
7. Update mobile/web env config from ~16 service URLs down to `ACADEMIC_API_URL` + `ENGAGEMENT_API_URL` (+ `AI_SERVICE_URL`), and rebuild — normal since no App Store/Play Store production build exists yet to preserve compatibility for.

This is dramatically cheaper than doing the same migration after launch, where steps 4–6 would each need production-safe versions (backfill + dual-write + monitored soak + phased traffic cutover).

---

## 7. Security addendum — correction to SECURITY_IMPROVEMENTS.md

[SECURITY_IMPROVEMENTS.md](./SECURITY_IMPROVEMENTS.md) states the hardcoded `JWT_SECRET` fallback (`'stunity-enterprise-secret-2026'`) issue was fixed everywhere via a startup guard. Verified against current code:

**Correctly guarded** (service refuses to start in production without `JWT_SECRET` set) — `services/auth-service/src/index.ts:54-56`, `services/analytics-service/src/index.ts:42-44`. The literal fallback string is still present one line below the guard in both files but is unreachable in production once the guard fires — low-severity leftover, safe to delete for clarity.

**Not guarded** — three route files independently redeclare their own local constant with no startup check:
- `services/auth-service/src/routes/twoFactor.routes.ts:10`
- `services/auth-service/src/routes/sso.routes.ts:11`
- `services/auth-service/src/routes/passwordReset.routes.ts:240`

These are only safe today because `index.ts`'s module-level guard happens to execute before these routers are mounted, crashing the process first. That is an **implicit ordering dependency**, not a structural guarantee — a future import-order change could silently reintroduce the vulnerable path in exactly these three security-sensitive flows (2FA, SSO, password reset).

**Recommended fix (independent of the architecture work above, do anytime, ~15 min):** replace all remaining `process.env.JWT_SECRET || 'stunity-enterprise-secret-2026'` occurrences with a single shared `getJwtSecret()` helper (in `services/lib`) that throws if unset, imported by every file that currently redeclares the constant. This also directly serves Phase 0 above, since consolidating services naturally collapses these duplicated constants into one.

---

## 8. Cost facts (verified 2026-07-23)

- Supabase **Free** plan: **2 active projects** maximum. Beyond that, **Pro** starts at **$25/month per project**, plus usage-based compute (~$10/project minimum). ([UI Bakery](https://uibakery.io/blog/supabase-pricing), [MetaCTO](https://www.metacto.com/blogs/the-true-cost-of-supabase-a-comprehensive-guide-to-pricing-integration-and-maintenance))
  - This is why Option B (DB-per-service for all 16) is not just architecturally wrong but **financially incompatible** with the project's current stage — it would require ~14 paid projects.
  - It's also why Phase 1 above is scoped to exactly **2** databases: it is the largest split that costs nothing extra.
- Cloud Run: free tier requires scale-to-zero. `min-instances≥1` (currently set for auth+feed, §2.5) bills 24/7 regardless of traffic — this should be reverted to `0` until there's a latency reason (real users, measured cold-start complaints) to pay for warm instances.

---

## 9. Action items

- [x] Confirm this plan (this document) before any code changes
- [x] Phase 0: consolidate 9 Academic/SIS services (school, student, teacher, class, subject, grade, attendance, timetable, club) into one Express app — `services/academic-api` (branch `feat/phase0-service-consolidation`)
- [x] Phase 0: consolidate auth/feed/learn/messaging/notification/analytics into one Engagement app — `services/engagement-api` (same branch)
- [x] Phase 0: delete `search-service`, `storage-service`, `user-service` stub directories
- [x] Independent, low-effort: introduce shared `getJwtSecret()` helper (`services/lib/jwt-secret.js`) and remove all hardcoded fallback occurrences, including the 3 unguarded route files (§7)
- [x] Found and fixed during Phase 0: a real route collision invisible while auth-service and notification-service were separate deployables — both implemented `/notifications/*` with different verbs, used by different clients (web-parent UI vs mobile). Renamed auth's 9 routes to `/auth/notifications/*`; updated the 3 real call sites (web parent-notifications page + dropdown, academic-api's grade/attendance cross-service notification calls)
- [ ] Set `CLOUD_RUN_MIN_INSTANCES_AUTH` / `_FEED` to `0` — moot once Phase 0 branch deploys (services are renamed/merged; new deploy script needed regardless, see `docs/GCP_NEW_ACCOUNT_MIGRATION.md` Phase C)
- [ ] Merge `feat/phase0-service-consolidation` and cut deploy script / client `*_SERVICE_URL` config over to the 2 new services (tracked in `docs/GCP_NEW_ACCOUNT_MIGRATION.md` Phase B–E, done together with the new-GCP-account migration)
- [ ] Phase 1: split Prisma schema into `database-academic` / `database-engagement`, provision 2nd Supabase project, run one-off backfill, cut over, full device regression pass
- [ ] Update `docs/PRODUCTION_ARCHITECTURE_LONG_TERM.md` §13 decision log once Phase 0/1 ship
- [ ] Phase 2/3: revisit only once there is real revenue/traffic to justify additional Supabase projects
