# Project Status

**Last Verified:** March 22, 2026

This status page reflects the current codebase and the live API smoke test completed during the March 22 audit.

## Audit Summary

The root documentation was previously overstating or mixing old release notes with current reality. The active top-level docs now live under [`docs/current`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/current), and the root [`README.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/README.md) is the single entrypoint.

Key corrections made during the audit:

- Root-level duplicate markdown files were moved out of the project root
- Active docs were rewritten to match the current repo structure
- Old version language like older service counts, Expo SDK 54, and Next.js 14 was removed from active root docs
- The shared dev credentials were updated to match the real current database

## Live-Verified Working Areas

These were checked against running local services and real API responses:

- Auth login through `POST /auth/login`
- Academic years through `GET /classes/academic-years`
- Class listing through `GET /classes/my`
- Class students through `GET /classes/:id/students`
- Class hub subresources through announcements, materials, and assignments endpoints
- Grade report retrieval through `GET /grades/class-report/:classId`
- Attendance summary through `GET /attendance/class/:classId/summary`
- Timetable retrieval through `GET /timetable/class/:classId`
- Club list retrieval through `GET /clubs?page=1&limit=5`

## Implemented In Code

These areas are clearly present and wired in code, but were not all fully re-smoke-tested end to end in this documentation pass:

- Mobile classes and clubs flows under [`apps/mobile/src/screens/clubs`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/clubs)
- Mobile live quiz flows under [`apps/mobile/src/screens/live-quiz`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/live-quiz)
- Mobile password reset and password change screens under [`apps/mobile/src/screens/auth`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/auth) and [`apps/mobile/src/screens/profile/PasswordSecurityScreen.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/profile/PasswordSecurityScreen.tsx)
- Auth social login and 2FA routes in [`services/auth-service/src/routes`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services/auth-service/src/routes)
- Web super admin area in [`apps/web/src/app/[locale]/super-admin`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src/app/[locale]/super-admin)
- Analytics leaderboards and live quiz APIs in [`services/analytics-service/src/index.ts`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services/analytics-service/src/index.ts)

## Known Current Gaps

- The shared dev database no longer matches old `Test High School` examples from historical docs.
- `GET /conversations` returned `403` for the tested admin account during the smoke test.
- `GET /teachers/lightweight` returned `0` for the tested academic year in the shared dataset.
- `quick-start.sh` was previously printing stale credentials and has been aligned as part of this cleanup.
- Several deep-dive docs still contain older milestone language; the active current docs now avoid making those older claims the source of truth.

## Current Platform Shape

- Web: active Next.js app
- Mobile: active Expo app
- Default local runtime: web plus 15 backend services
- Placeholder service folders present but not active by default: `search-service`, `storage-service`, `user-service`

## Recommended Next Work

1. Resolve messaging permissions and expected admin access for conversation APIs.
2. Investigate teacher linkage and empty lightweight teacher responses in the shared dataset.
3. Add repeatable automated smoke coverage for the verified school-management APIs.
4. Continue pruning stale milestone language from older subsystem deep-dive docs over time.
