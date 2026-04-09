# Current Features

**Last Verified:** April 9, 2026

This is a high-signal feature matrix. It is intentionally shorter than older milestone docs and separates `live-verified` from `implemented in code`.

## Status Legend

- `Live-verified`: checked against running local services during the March 22 audit
- `Implemented in code`: present and wired in the repo, but not fully re-tested in this doc pass
- `Known issue`: present but currently has a verified caveat

## Feature Matrix

| Area | Status | Notes |
|---|---|---|
| Auth login | Live-verified | `POST /auth/login` works with current shared admin |
| Password reset/change | Implemented in code | Routes and mobile/web screens exist |
| 2FA | Implemented in code | Auth routes and client calls are present |
| Social login | Implemented in code | Google, Apple, Facebook, LinkedIn routes exist |
| Academic years | Live-verified | Class-facing academic year endpoint returned current data |
| Classes list | Live-verified | `/classes/my` returned live class data |
| Class students | Live-verified | Student roster endpoint returned expected records |
| Class announcements/materials/assignments | Live-verified | Endpoints responded successfully |
| Grades | Live-verified | Class report endpoint returned results |
| Attendance summary | Live-verified | Summary endpoint responded successfully |
| Timetable | Live-verified | Class timetable endpoint returned periods |
| Clubs list | Live-verified | Club listing endpoint returned current clubs |
| School registration and onboarding | Live-verified | Isolated QA-school onboarding was completed end to end without touching production school data |
| Admin parent management | Live-verified | School-admin parent directory, linked students, and admin password reset flow were verified on the QA school |
| Web admin navigation responsiveness | Implemented in code | Sidebar navigation now prefetches target routes and key data and shows immediate transition feedback |
| Web school-management performance | Implemented in code | Students, teachers, classes, subjects, dashboard, and academic-year settings now reuse warmed caches and lighter API paths |
| Web timetable performance | Implemented in code | Master timetable and timetable builder now use aggregated API responses instead of older per-class fanout loading |
| Web grades performance | Implemented in code | Reports and analytics now use cached aggregated responses and less client-side recomputation |
| Claim codes and locations performance | Implemented in code | Claim codes now use cached list and stats responses with search support, and locations lazy-load map embeds |
| Mobile clubs/classes UX | Implemented in code | Screens, APIs, and navigation are wired |
| Feed and post interactions | Implemented in code | Feed store, feed screens, and service routes are present |
| Live quiz | Implemented in code | Mobile screens and analytics-service routes exist |
| Leaderboards | Implemented in code | Mobile clients and analytics endpoints exist |
| Web super admin area | Implemented in code | Dashboard, schools, users, analytics, health, settings pages exist |
| Messaging conversations | Live-verified | Admin messaging access works, and seeded QA-school admin-parent messaging was validated without modifying `Svaythom High School` |
| English split-name data model | Implemented in code | `englishFirstName`/`englishLastName` are wired in Student, Teacher, and User flows with validation in service write paths |
| English name display order standard | Implemented in code | Targeted web/mobile surfaces now render English names as `Last + First` |
| Dashboard teacher stats | Live-verified | Dashboard teacher count now matches the school-wide teacher total instead of requiring teacher-class links |
| Teacher lightweight API path | Known issue | The admin teachers page no longer relies on the academic-year filtered path, but `academicYearId` filtering still depends on linked `teacherClasses` |
| Cloud Run free-tier cold starts | Known issue | First-hit latency after idle can still affect web admin screens even after code-level optimizations |

## Confirmed Code Anchors

- Mobile classes client: [`apps/mobile/src/api/classes.ts`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/api/classes.ts)
- Mobile clubs client: [`apps/mobile/src/api/clubs.ts`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/api/clubs.ts)
- Mobile clubs screen: [`apps/mobile/src/screens/clubs/ClubsScreen.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/clubs/ClubsScreen.tsx)
- Mobile live quiz service: [`apps/mobile/src/services/liveQuiz.ts`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/services/liveQuiz.ts)
- Web super admin area: [`apps/web/src/app/[locale]/super-admin`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src/app/[locale]/super-admin)
- Auth routes: [`services/auth-service/src/index.ts`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services/auth-service/src/index.ts)
- Class routes: [`services/class-service/src/index.ts`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services/class-service/src/index.ts)
- Messaging routes: [`services/messaging-service/src/index.ts`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services/messaging-service/src/index.ts)
- Analytics routes: [`services/analytics-service/src/index.ts`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services/analytics-service/src/index.ts)

## Use This With

- [`PROJECT_STATUS.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/current/PROJECT_STATUS.md) for the latest verified gaps
- [`NEXT_IMPLEMENTATION.md`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/docs/current/NEXT_IMPLEMENTATION.md) for what to work on next
