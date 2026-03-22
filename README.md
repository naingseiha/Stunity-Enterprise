# Stunity Enterprise

**Last Verified:** March 22, 2026

This `README.md` is the single starting point for active project documentation. If you are onboarding, start here and use the linked docs below instead of older archived notes.

## What This Repo Contains

Stunity Enterprise combines:

- School management services for schools, students, teachers, classes, grades, attendance, and timetables
- Social and learning features for feed, quizzes, clubs, messaging, notifications, and analytics
- A web app in [`apps/web`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web)
- A mobile app in [`apps/mobile`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile)
- Shared Prisma database code in [`packages/database`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/packages/database)

## Quick Start

```bash
npm install
npm run db:generate
./quick-start.sh
```

Web runs at `http://localhost:3000`.

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
apps/
  mobile/           Expo mobile client
  web/              Next.js web app
services/           Backend service packages
packages/database/  Prisma schema and generated client
scripts/            Admin, debug, seeding, and manual testing utilities
docs/               Active docs, deep dives, and archive
```

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

## Notes

- Destructive database commands are intentionally guarded when `DATABASE_URL` points at Supabase. See [`docs/DATABASE_SAFETY.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/DATABASE_SAFETY.md).
- Historical planning notes and completed milestone docs were moved into [`docs/archive`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/archive).
- Root-level active markdown files were centralized into [`docs/current`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/current) so developers only need this README as the starting point.
