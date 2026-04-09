# Developer Guide

**Last Verified:** April 9, 2026

Use this document for day-to-day development setup and repo orientation. For the latest reality check, read [`../CURRENT_SITUATION.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/CURRENT_SITUATION.md) first.

## Setup

Prerequisites:

- Node.js `>= 20`
- npm `>= 10`

Bootstrap:

```bash
npm install
npm run db:generate
./quick-start.sh
```

Useful local commands:

```bash
./check-services.sh
./stop-all-services.sh
./restart-all-services.sh
npm run build
npx tsc -p apps/mobile/tsconfig.json --noEmit --pretty false
```

These commands were re-run during the April 9, 2026 audit.

## Repo Layout

```text
apps/mobile           Expo mobile client
apps/web              Next.js web app
services/*            Backend service workspaces
packages/database     Prisma schema and generated client workspace
packages/shared       Shared source helpers
packages/types        Shared TypeScript model definitions
packages/ui           Shared UI references/assets
packages/utils        Shared API and utility helpers
scripts/admin         Admin and repair utilities
scripts/debug         Data inspection and debugging helpers
scripts/seeding       Seeding helpers
scripts/testing       Manual verification scripts
docs/current          Active top-level project docs
docs/archive          Historical notes and completed plans
```

## Runtime Map

The default local startup scripts use these ports:

| Port | Package | Role |
|---|---|---|
| 3000 | `apps/web` | Web app |
| 3001 | `auth-service` | Auth, tokens, password flows, 2FA, social login |
| 3002 | `school-service` | Schools, academic years, promotion, templates |
| 3003 | `student-service` | Student records |
| 3004 | `teacher-service` | Teacher data |
| 3005 | `class-service` | Classes, rosters, class hub APIs |
| 3006 | `subject-service` | Subjects and curriculum |
| 3007 | `grade-service` | Grades and reports |
| 3008 | `attendance-service` | Attendance APIs |
| 3009 | `timetable-service` | Timetables |
| 3010 | `feed-service` | Feed, posts, comments, search, social APIs |
| 3011 | `messaging-service` | Conversations and messages |
| 3012 | `club-service` | Clubs and membership |
| 3013 | `notification-service` | Notifications |
| 3014 | `analytics-service` | Live quiz, leaderboards, gamification |
| 3020 | `ai-service` | Optional AI service |

Three folders exist in [`services`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services) but are not part of the default local runtime today:

- `search-service`
- `storage-service`
- `user-service`

Each currently contains only a placeholder `Dockerfile`.

## App Reality

- Mobile currently uses Expo `~52.0.7` from [`apps/mobile/package.json`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/package.json).
- Web currently uses Next `^15.0.0` from [`apps/web/package.json`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/package.json).
- The shared database in active use is Supabase/PostgreSQL through Prisma in [`packages/database`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/packages/database).

## Where To Work

Common areas:

- Mobile screens and API clients: [`apps/mobile/src`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src)
- Web routes and API helpers: [`apps/web/src`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src)
- Service entrypoints: [`services`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services)
- Prisma schema: [`packages/database/prisma/schema.prisma`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/packages/database/prisma/schema.prisma)

Examples confirmed during this audit:

- Mobile classes API: [`apps/mobile/src/api/classes.ts`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/api/classes.ts)
- Mobile clubs screen: [`apps/mobile/src/screens/clubs/ClubsScreen.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/clubs/ClubsScreen.tsx)
- Class service routes: [`services/class-service/src/index.ts`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services/class-service/src/index.ts)
- Auth password and 2FA routes: [`services/auth-service/src/index.ts`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services/auth-service/src/index.ts)
- Super admin web area: [`apps/web/src/app/[locale]/super-admin`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src/app/[locale]/super-admin)

## Working Rules

- Run `npm run db:generate` after clone or Prisma schema changes.
- Treat [`../DATABASE_SAFETY.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/DATABASE_SAFETY.md) as required reading before running database mutation commands.
- Prefer [`README.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/README.md) as the entrypoint and avoid using archived docs as source of truth.
- When documenting status, separate `live-verified` from `implemented in code but not re-tested`.
