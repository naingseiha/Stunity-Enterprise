# Stunity Enterprise

**Documentation hub — last reorganized:** May 13, 2026

Stunity Enterprise is a **monorepo** for a Cambodia-first school platform: multi-tenant school management (students, teachers, classes, grades, attendance, timetables), social feed, clubs, messaging, notifications, analytics, and hierarchical **Learn** courses. It ships as a **Next.js** web app, an **Expo** mobile app, and **Node microservices** backed by **PostgreSQL** (Prisma).

This file is the **single entrypoint** for engineers and operators. Everything else is linked from here; archived material is historical context only.

---

## Table of contents

1. [What ships in this repository](#what-ships-in-this-repository)
2. [Quick start (local)](#quick-start-local)
3. [Repository map](#repository-map)
4. [Runtime: services and ports](#runtime-services-and-ports)
5. [Current completion (where to look)](#current-completion-where-to-look)
6. [Documentation map](#documentation-map)
7. [Deployment (all platforms)](#deployment-all-platforms)
8. [Security, database, and secrets](#security-database-and-secrets)
9. [Verification and health checks](#verification-and-health-checks)
10. [Shared development credentials](#shared-development-credentials)
11. [Useful commands](#useful-commands)

---

## What ships in this repository

| Layer | Location | Role |
|--------|-----------|------|
| Web app | `apps/web` | Next.js (App Router), admin and school-facing UI |
| Mobile app | `apps/mobile` | Expo (iOS / Android), students, teachers, parents |
| Backend | `services/*` | REST (and related) microservices, one deployable unit per folder |
| Data | `packages/database` | Prisma schema, migrations, generated client |
| Shared libraries | `packages/shared`, `packages/types`, `packages/ui`, `packages/utils` | Cross-app helpers and types |
| Tooling | `scripts/` | Admin utilities, seeding, migration helpers, deploy scripts |

Placeholder service folders (not in the default local stack or default Cloud Run deploy list): `search-service`, `storage-service`, `user-service`.

---

## Quick start (local)

```bash
npm install
npm run db:generate
./quick-start.sh
```

- Web: `http://localhost:3000`
- Expect a working **root** `.env`. Copy `.env.example` → `.env` and fill values before starting services.

**Mobile (Expo):**

```bash
cd apps/mobile
npx expo start --tunnel
```

**School registration policy (enterprise-friendly default):**

- New schools are `PENDING` but can log in and finish onboarding immediately.
- High-risk actions (claim-code distribution, bulk invites) stay blocked until Super Admin approval when configured that way.
- Set `PENDING_SCHOOL_ACCESS_MODE=inactive` to require approval before first login.

---

## Repository map

```text
apps/                 Product surfaces (web, mobile)
services/             Backend microservices (Node)
packages/             database (Prisma), shared, types, ui, utils
scripts/              Admin, deploy, seeding, tests
docs/                 Active guides, current status, deployment, archive
```

---

## Runtime: services and ports

Typical local layout:

- **Web:** `3000`
- **Services:** `3001`–`3014`, `3018`, `3020` (see `docs/current/DEVELOPER_GUIDE.md` for the canonical list)

Active microservices include: `auth-service`, `school-service`, `student-service`, `teacher-service`, `class-service`, `subject-service`, `grade-service`, `attendance-service`, `timetable-service`, `feed-service`, `messaging-service`, `club-service`, `notification-service`, `analytics-service`, `learn-service`, `ai-service`.

---

## Current completion (where to look)

Authoritative **verified status**, **feature matrix**, and **next priorities** live under `docs/current/`:

| Document | Purpose |
|----------|---------|
| [docs/CURRENT_SITUATION.md](docs/CURRENT_SITUATION.md) | Short “ground truth” snapshot of repo and APIs |
| [docs/current/PROJECT_STATUS.md](docs/current/PROJECT_STATUS.md) | What is live-verified, what is implemented, known gaps |
| [docs/current/CURRENT_FEATURES.md](docs/current/CURRENT_FEATURES.md) | Feature matrix by verification level |
| [docs/current/NEXT_IMPLEMENTATION.md](docs/current/NEXT_IMPLEMENTATION.md) | Roadmap from the latest audit |
| [docs/current/DEVELOPER_GUIDE.md](docs/current/DEVELOPER_GUIDE.md) | Day-to-day setup, ports, layout, common tasks |

**Recent themes (2026):** admin web performance (caching, fewer fanout calls), hierarchical Learn (`learn-service`), English name fields (completed — see archive), mobile **tablet layout** and **admin users who also teach** (linked `teacherId`: classes, grades, attendance, sidebar parity across auth/class/attendance services and mobile). For dates and evidence, follow the `docs/current/*` pages above; update those files when you complete a verification pass.

---

## Documentation map

### Start here (onboarding)

1. This `README.md`
2. [docs/CURRENT_SITUATION.md](docs/CURRENT_SITUATION.md)
3. [docs/current/DEVELOPER_GUIDE.md](docs/current/DEVELOPER_GUIDE.md)

### Operations and deployment

- **Master guide:** [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) — Supabase, Cloud Run, Vercel, EAS, R2, CI, RLS checklist
- **Index of deployment-related folders:** [docs/deployment/README.md](docs/deployment/README.md)
- **Mobile store releases:** [apps/mobile/PRODUCTION_RELEASE_GUIDE.md](apps/mobile/PRODUCTION_RELEASE_GUIDE.md), [apps/mobile/PLAY_STORE_RELEASE.md](apps/mobile/PLAY_STORE_RELEASE.md)
- **Attendance production notes:** [services/attendance-service/PRODUCTION_RUNBOOK.md](services/attendance-service/PRODUCTION_RUNBOOK.md)

### Domain and product reference (long-form)

Moved from the repo root into **`docs/guides/`** for a clean root and predictable discovery:

- [docs/guides/README.md](docs/guides/README.md) — index of all guides
- Education model, onboarding flexibility, reporting architecture, Cambodia MoEYS export blueprint, and Learn/Course documentation

### Subsystem deep dives (`docs/`)

- [docs/README.md](docs/README.md) — curated index (feed, realtime, mobile API, timetable, admin permissions, etc.)

### Vision and future work

- [docs/stunity-vision/README.md](docs/stunity-vision/README.md) — strategy, architecture narrative, roadmap
- [docs/future-implementation/README.md](docs/future-implementation/README.md) — longer-horizon features and audits

### Archive (not source of truth)

- [docs/archive/](docs/archive/) — historical session notes, completed milestones, superseded plans
- [docs/archive/completed-milestones-2026-05/README.md](docs/archive/completed-milestones-2026-05/README.md) — plans and dated reports moved in the May 2026 doc cleanup

---

## Deployment (all platforms)

Use **[docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)** as the full runbook. Summary:

| Target | Platform | Primary doc |
|--------|-----------|-------------|
| Database | Supabase (PostgreSQL) | [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) (Database section) |
| Backend | Google Cloud Run | `scripts/deploy-cloud-run.sh`, [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) (Backend section) |
| Web | Vercel (`apps/web`) | [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) (Web section) |
| Media | Cloudflare R2 | [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md), [docs/deployment-setup/](docs/deployment-setup/) |
| Mobile | App Store / Play Store (EAS) | [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) (Mobile section) and `apps/mobile` release guides |
| CI | GitHub Actions | `.github/workflows/` (example: feed-service deploy path in DEPLOYMENT_GUIDE) |

**Selective Cloud Run deploy (changed services only):**

```bash
npm run deploy:list-changed-services
# or: ./scripts/list-changed-cloud-run-services.sh origin/main...HEAD
./scripts/deploy-cloud-run.sh auth-service class-service
```

**Prisma migrations in production:** run `npm run db:migrate:deploy` when `packages/database/prisma/schema.prisma` changed, **before** rolling out service code that depends on the new schema.

---

## Security, database, and secrets

- Do not commit real `.env` files, production credentials, or store signing keys. Use Vercel / EAS / Secret Manager patterns described in [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md).
- Destructive DB commands are guarded when `DATABASE_URL` points at Supabase: [docs/DATABASE_SAFETY.md](docs/DATABASE_SAFETY.md).
- Production RLS expectations are summarized in the deployment guide (Supabase checklist).

---

## Verification and health checks

```bash
npm run db:generate
npm run build
npx tsc -p apps/mobile/tsconfig.json --noEmit --pretty false
./check-services.sh
```

`./check-services.sh` is the fastest way to see which service ports respond in your current session.

---

## Shared development credentials

Verified dataset example: **Svaythom High School**

- Email: `admin@svaythom.edu.kh`
- Password: `SvaythomAdmin2026!`

Create another school admin if your database differs:

```bash
npx tsx scripts/admin/create-school-admin.ts
```

---

## Useful commands

```bash
./quick-start.sh
./start-all-services.sh
./stop-all-services.sh
./restart-all-services.sh
./check-services.sh
```

---

## Contributing to documentation

- Prefer updating **`docs/current/*`** when verification status changes.
- Put **new long-form reference** under `docs/guides/` or the relevant `docs/` subsystem folder.
- Move **finished plans and dated “status of work” writeups** into `docs/archive/…` and link them once from [docs/archive/completed-milestones-2026-05/README.md](docs/archive/completed-milestones-2026-05/README.md) or a dedicated archive README.
- Keep this root `README.md` as the navigation hub; avoid sprouting new top-level markdown files unless there is a strong reason (e.g. GitHub-required `SECURITY.md`).
