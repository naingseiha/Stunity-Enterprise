# Project Status

**Last Verified:** April 9, 2026

This status page reflects the current codebase, the March 22 live API smoke test, and the April 9 English-name implementation closeout.

## Audit Summary

The root documentation was previously overstating or mixing old release notes with current reality. The active top-level docs now live under [`docs/current`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/current), and the root [`README.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/README.md) is the single entrypoint.

Key corrections made during the audit:

- Root-level duplicate markdown files were moved out of the project root
- Active docs were rewritten to match the current repo structure
- Old version language like older service counts, Expo SDK 54, and Next.js 14 was removed from active root docs
- The shared dev credentials were updated to match the real current database

## Admin Web Performance Status

The latest implementation pass focused on the web admin panel, especially school management, timetable, attendance, grades, settings, claim codes, and locations.

Current shape:

- Admin navigation now reacts immediately on press and warms route bundles plus key page data before the target page finishes mounting
- School-management pages now share persistent frontend caches for common lists and academic-year resources instead of repeating cold requests on each page switch
- Several admin APIs now use short-lived backend caches with explicit invalidation after writes, so repeated reads are faster without leaving stale management data behind
- Master timetable and timetable builder now rely on aggregated backend responses instead of older per-class fanout request patterns
- Grade reports and grade analytics now use aggregated chart-ready/report-ready responses with cache reuse on both backend and web client
- Claim codes now support cached list and stats responses plus debounced search, and locations now lazy-load embedded maps instead of loading all iframes immediately

Deployment reality:

- These changes improve normal admin navigation and repeated page loads on web
- Google Cloud Run free tier can still add cold-start latency after idle because services scale to zero
- The code now reduces how often the admin panel wakes multiple services at once, but it does not remove Cloud Run cold starts entirely

## April 9, 2026 Closeout

English-name support is now treated as completed:

- Split fields (`englishFirstName`, `englishLastName`) are fully wired through student, teacher, and profile write paths with Zod validation
- Web and mobile edit forms show `English Last Name` before `English First Name`
- Display order for English-name surfaces is standardized to `Last + First` in students, teachers, attendance, profile, class member/grade views, and key feed/profile components
- Legacy combined `englishName` compatibility is intentionally retained in student/teacher custom fields for older readers

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
- Admin parent directory through `GET /auth/admin/parents`
- Dashboard teacher stats alignment through `GET /schools/:schoolId/academic-years/:yearId/stats`
- Isolated school registration and onboarding through the QA bootstrap flow in [`scripts/testing/manual/bootstrap-onboarding-test-school.js`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/scripts/testing/manual/bootstrap-onboarding-test-school.js)

## Implemented In Code

These areas are clearly present and wired in code, but were not all fully re-smoke-tested end to end in this documentation pass:

- Mobile classes and clubs flows under [`apps/mobile/src/screens/clubs`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/clubs)
- Mobile live quiz flows under [`apps/mobile/src/screens/live-quiz`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/live-quiz)
- Mobile password reset and password change screens under [`apps/mobile/src/screens/auth`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/auth) and [`apps/mobile/src/screens/profile/PasswordSecurityScreen.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/profile/PasswordSecurityScreen.tsx)
- Auth social login and 2FA routes in [`services/auth-service/src/routes`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services/auth-service/src/routes)
- Web super admin area in [`apps/web/src/app/[locale]/super-admin`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src/app/[locale]/super-admin)
- Analytics leaderboards and live quiz APIs in [`services/analytics-service/src/index.ts`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services/analytics-service/src/index.ts)
- Super-admin school deletion now clears dependent school data before deleting the school record in [`services/school-service/src/index.ts`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services/school-service/src/index.ts)
- Admin web performance optimizations now span navigation, school management, timetable, attendance, grades, claim codes, and locations across [`apps/web/src`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src) plus the related service packages under [`services`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services)

## Known Current Gaps

- The shared dev database no longer matches old `Test High School` examples from historical docs.
- Admin messaging access is now aligned in code and local smoke validation: `GET /conversations`, `GET /unread-count`, and `GET /parents` all returned `200` for the shared school-admin account even though its JWT has no `teacherId`.
- `Svaythom High School` is production-style shared data and should remain untouched during QA seeding. Full parent-linked messaging and onboarding regression coverage should use the isolated QA school instead.
- The admin teachers page now avoids depending on academic-year teacher linkage for its main list, but the `academicYearId` path on `GET /teachers/lightweight` is still linkage-dependent and should be treated carefully in shared datasets with incomplete teacher-class relations.
- `quick-start.sh` was previously printing stale credentials and has been aligned as part of this cleanup.
- Several deep-dive docs still contain older milestone language; the active current docs now avoid making those older claims the source of truth.
- First-hit latency after idle is still expected on Cloud Run free tier even with the latest admin optimization work.

## Current Platform Shape

- Web: active Next.js app
- Mobile: active Expo app
- Default local runtime: web plus 15 backend services
- Placeholder service folders present but not active by default: `search-service`, `storage-service`, `user-service`

## Recommended Next Work

1. Turn the isolated QA-school bootstrap plus admin messaging checks into a repeatable regression suite.
2. Add a lightweight admin performance smoke suite that times key page-switch and first-load API paths against the QA school.
3. Continue reducing first-load fanout on the heaviest web admin screens, especially large chart/report pages.
4. Investigate teacher-class linkage and homeroom linkage in the shared dataset for the current academic year.
5. Continue pruning stale milestone language from older subsystem deep-dive docs over time.
