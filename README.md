# Stunity Enterprise

**Last Verified:** April 9, 2026

This `README.md` is the single starting point for active project documentation. If you are onboarding, start here and use the linked docs below instead of older archived notes.

## What This Repo Contains

Stunity Enterprise combines:

- School management services for schools, students, teachers, classes, grades, attendance, and timetables
- Social and learning features for feed, quizzes, clubs, messaging, notifications, and analytics
- A web app in [`apps/web`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web)
- A mobile app in [`apps/mobile`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile)
- Shared Prisma database code in [`packages/database`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/packages/database)
- Additional shared source folders in [`packages`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/packages) for `shared`, `types`, `ui`, and `utils`

## Quick Start

```bash
npm install
npm run db:generate
./quick-start.sh
```

Web runs at `http://localhost:3000`.

Local startup expects a working root `.env`. If you are setting up a fresh machine, copy `.env.example` to `.env` and review the values before starting services.

For mobile:

```bash
cd apps/mobile
npx expo start --tunnel
```

## Current Shared Dev Credentials

The currently verified shared dataset is **Svaythom High School**.

- Email: `admin@svaythom.edu.kh`
- Password: `SvaythomAdmin2026!`

If your database is different, create or restore an admin with:

```bash
npx tsx scripts/admin/create-school-admin.ts
```

## Runtime Reality

Default local startup scripts currently start:

- Web on `3000`
- 15 backend services on `3001` to `3014` and `3020`

Those active runtime services are:

- `auth-service`
- `school-service`
- `student-service`
- `teacher-service`
- `class-service`
- `subject-service`
- `grade-service`
- `attendance-service`
- `timetable-service`
- `feed-service`
- `messaging-service`
- `club-service`
- `notification-service`
- `analytics-service`
- `ai-service`

There are also three extra service folders in [`services`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services) that are not part of the default local runtime right now:

- `search-service`
- `storage-service`
- `user-service`

Each currently contains only a placeholder `Dockerfile`.

## Repo Map

```text
apps/               Product applications
  mobile/           Expo mobile client
  web/              Next.js web app
services/           Backend service workspaces
packages/           Shared code and Prisma assets
  database/         Prisma schema and generated client workspace
  shared/           Shared source helpers
  types/            Shared TypeScript model definitions
  ui/               Shared UI references/assets
  utils/            Shared API and utility helpers
scripts/            Admin, debug, seeding, and manual testing utilities
docs/               Active docs, deep dives, and archive
```

## Verification Snapshot

Verified during the April 9, 2026 audit:

- `npm run db:generate`
- `npm run build`
- `npx tsc -p apps/mobile/tsconfig.json --noEmit --pretty false`
- `./check-services.sh`

`./check-services.sh` is the quickest way to confirm what is actually running in your current local session.

## Read In This Order

1. [`docs/CURRENT_SITUATION.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/CURRENT_SITUATION.md)
2. [`docs/current/DEVELOPER_GUIDE.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/current/DEVELOPER_GUIDE.md)
3. [`docs/current/PROJECT_STATUS.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/current/PROJECT_STATUS.md)
4. [`docs/current/CURRENT_FEATURES.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/current/CURRENT_FEATURES.md)
5. [`docs/current/NEXT_IMPLEMENTATION.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/current/NEXT_IMPLEMENTATION.md)
6. [`docs/README.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/README.md) for subsystem deep dives

## Active Documentation

| Doc | Use it for |
|---|---|
| [`docs/CURRENT_SITUATION.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/CURRENT_SITUATION.md) | Verified current repo and API reality |
| [`docs/current/DEVELOPER_GUIDE.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/current/DEVELOPER_GUIDE.md) | Setup, repo layout, runtime map, common commands |
| [`docs/current/PROJECT_STATUS.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/current/PROJECT_STATUS.md) | What is live-verified, what is implemented, known gaps |
| [`docs/current/CURRENT_FEATURES.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/current/CURRENT_FEATURES.md) | High-signal feature matrix, separated by verification level |
| [`docs/current/NEXT_IMPLEMENTATION.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/current/NEXT_IMPLEMENTATION.md) | Current priorities based on the latest audit |
| [`docs/README.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/README.md) | Deep-dive docs by subsystem |

## Recent Completed Work

The English-name field implementation and name-order standardization (`English Last Name + English First Name`) is completed and archived here:

- [`docs/archive/completed-features/ENGLISH_NAME_FIELDS_IMPLEMENTATION_STATUS_2026-04-09.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/archive/completed-features/ENGLISH_NAME_FIELDS_IMPLEMENTATION_STATUS_2026-04-09.md)

## Useful Commands

```bash
./quick-start.sh
./start-all-services.sh
./stop-all-services.sh
./restart-all-services.sh
./check-services.sh

npm run build
npx tsc -p apps/mobile/tsconfig.json --noEmit --pretty false
```

## Recent Admin Performance Work

The March 22, 2026 optimization pass focused on making the web admin panel behave closer to the mobile app without changing working features.

- Admin navigation now gives immediate page-transition feedback and prefetches route bundles plus key page data
- School-management pages now reuse warmed frontend caches instead of cold-loading every time
- Several backend admin endpoints now use short-lived safe caches with invalidation after create, update, delete, promote, revoke, mark-attendance, and grade-write actions
- Timetable and grade analytics/reporting screens now rely more on aggregated backend responses instead of N+1 browser fetch patterns
- Claim codes and locations were optimized last with cached list and stats responses, debounced search, parallel loading, and lazy map embeds

Expected limitation:

- When backend services are deployed on Google Cloud Run free tier, the first request after idle can still be slow because services may scale to zero. The recent work improves normal in-app navigation and repeat page loads, not Cloud Run cold starts themselves.

## Notes

- Destructive database commands are intentionally guarded when `DATABASE_URL` points at Supabase. See [`docs/DATABASE_SAFETY.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/DATABASE_SAFETY.md).
- Historical planning notes and completed milestone docs were moved into [`docs/archive`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/archive).
- Core onboarding and status docs live in [`docs/current`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/current). Completed root plans are archived and the root `implementation_plan.md` now points to the archive location.
