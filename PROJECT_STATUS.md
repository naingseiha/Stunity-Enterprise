# 🎓 Stunity Enterprise — Project Status

**Last Updated:** March 17, 2026
**Version:** 23.6
**Status:** 99% Complete — Mobile Reliability + Settings Polish 🚀

---

## 🏗️ What Is Stunity?

Stunity Enterprise is an **enterprise e-learning platform** that unifies **school management** (attendance, grades, timetables, student records) with a **social learning feed** (posts, quizzes, clubs, messaging) — designed for global multi-school deployment.

- **Mobile App:** React Native / Expo SDK 54 (iOS + Android)
- **Web App:** Next.js 14 (teachers, admin, parents)
- **Backend:** 14 microservices on Express.js + PostgreSQL (Supabase)
- **Infrastructure:** Google Cloud Run + Cloudflare R2 + Supabase Free Tier

---

## ✅ Completed Features (v23.6)

### ⚡ Latest Platform Updates (Mar 17, 2026)
- **Attendance GPS retry reliability (mobile)**
  - Tapping the attendance top GPS card now re-checks permissions/services and performs a stronger manual location refresh (high-accuracy + longer timeout).
  - Added better recovery UX for denied/disabled location (Settings shortcut + clearer fallback status handling).
  - Attendance submit flow now re-validates location permission/services before check-in/check-out requests.
- **Genesis Premium Aesthetic Rollout (Web)**
  - Transformed core administrative screens with a high-fidelity "Genesis" dark mode aesthetic.
  - **Academic Ledger (Grades Entry)**: Redesigned as a pro-grade data entry grid with glassmorphism, sticky blurred headers, real-time save status indicators, and integrated performance analytics.
  - **Attendance Dashboard**: Refined with premium visual hierarchy, glassmorphism cards, and enhanced filtering.
  - **Classes & Subjects Management**: Applied consistent Genesis styling across administrative registry modules.
  - **Platform-wide Polish**: Resolved layout inconsistencies and JSX structural errors on core management pages.
- **Settings screen completion + API alignment (mobile)**
  - Added real **Password & Security** screen and wired it to authenticated `POST /auth/change-password` flow.
  - Wired previously dead-end actions (Achievements quick action, support/help/privacy links, blocked-user support escalation).
  - Synced settings toggles with real persistence:
    - `profileVisibility` now updates via `PUT /users/me/profile` with rollback on API failure.
    - biometric preference now loads/saves through secure token service storage.
    - online status now updates local user state consistently for UI.
- **Saved Posts navigation state fix (mobile)**
  - Fixed issue where Saved Posts could remain the visible screen when user expected Profile.
  - Sidebar profile shortcut now routes to `Profile` directly.
  - Bookmarks back/empty-state actions now use stack-aware fallbacks to Profile/Feed instead of blind `goBack()`.

### ⚡ Previous Platform Updates (Mar 16, 2026)
- **Local Development Environment Fixes**
  - Resolved hardcoded absolute paths in startup shell scripts (`quick-start.sh`, `start-all-services.sh`, etc.) to use the correct project directory structure.
  - Configured `apps/web/.env.local` to correctly map `NEXT_PUBLIC_*` service URLs to localhost ports, fixing web app 404 auth errors during local development.
- **Feed widget activation + reliability improvements (web + feed-service)**
  - Learning Spotlight now loads real featured courses from API, with working navigation and fallback behavior.
  - Create Event flow now uses authenticated submission, stricter validation/error handling, and includes school context in payload.
  - Upcoming event filtering now includes same-day all-day and in-progress events (not only future `startDate` values).
- **Study Clubs + Top Contributors polish (web)**
  - Study club avatars now guarantee visible color variety with per-card palette rotation.
  - Top Contributors widget now uses `/users/leaderboard` API with loading/error/empty states.
  - Added dedicated leaderboard page at `/${locale}/leaderboard` and wired widget CTA navigation.
- **Learn Explore redesign (mobile)**
  - Restored PlayStore-style two-column colorful category cards with predefined categories and live API counts.
  - Categories now default to top 6 with `View all` / `View less` toggle and `All courses` reset.
  - Refined spacing, fully rounded search/enroll controls, and visual polish for category cards/header.
- **Learn Course detail/progress redesign (mobile)**
  - Course Detail and Lesson Viewer received upgraded progress presentation (progress cards/bars), richer stat cards, and better lesson state styling.
  - Updated app bars/safe areas to match Feed/Learn light header standard (removed heavy dark header look).

### ⚡ Earlier Platform Updates (Mar 14, 2026)
- **Web language parity + feed localization (web)**
  - Completed Khmer/English language switching behavior on web with locale cookie persistence and safe locale-path replacement.
  - Localized major feed surfaces (feed page, create-post modal, post card, analytics/activity/insights, and right sidebar widgets) with `next-intl` message keys in both `en` and `km`.
  - Added fallback handling for `profile.viewProfile` key-shaped values in feed profile card to prevent raw key rendering in UI.
- **Web runtime recovery for missing vendor chunk**
  - Diagnosed `Cannot find module './vendor-chunks/@formatjs.js'` as stale/corrupted Next build output.
  - Resolved by clearing `apps/web/.next` and rebuilding web output; compiled locale page load now succeeds.
- **Translation management UX + access parity (web + auth-service)**
  - Redesigned `/[locale]/admin/language` into a management console with app/locale/namespace/screen filters and grouped screen/page editing.
  - Added unsaved-change tracking with row-level save and bulk-save workflows for faster translation maintenance.
  - Extended translation admin APIs to allow both `ADMIN` and `SUPER_ADMIN`, and exposed Language Management directly in super-admin sidebar navigation.
  - Reduced web OTA translation revalidation window from 300s to 60s for faster visibility of admin-edited translation updates.
- **Enterprise OTA translation management (web admin + mobile runtime)**
  - Added Super Admin language management page to edit translation keys for `web`, `mobile`, and `global`.
  - Added auth-service translation routes for admin CRUD/sync and app-level runtime fetch (`/auth/translations/:app/:locale`).
  - Mobile i18n now merges OTA translations correctly for nested keys across screens and parent attendance flows.
- **Translation performance optimization (mobile + auth-service)**
  - Mobile translation sync now prioritizes active locale first, then syncs remaining locales in parallel.
  - Added per-locale ETag persistence in mobile and conditional requests via `If-None-Match`.
  - Auth-service now returns `ETag` and supports `304 Not Modified` responses for unchanged translation payloads.
  - Translation merge precedence is deterministic (`global` first, app-specific last) so app overrides always win.
- **Teacher online permission workflow (mobile + attendance service)**
  - Added `POST /attendance/teacher/permission-request` for session-based permission requests without geofence enforcement.
  - Added mobile permission request actions in attendance check-in screen (morning/afternoon) with reason modal.
  - Teacher report now includes permission totals and permission-aware status rendering in check-in history.
- **Attendance Recording UI polish (mobile)**
  - Upgraded permission card + modal visuals with stronger hierarchy, badges, and polished CTAs.
  - Refreshed check-in history cards with status-tinted date badges and improved morning/afternoon icon color treatment.
- **Attendance date rendering accuracy fix (mobile)**
  - Fixed timezone day mismatch in Attendance Recording cards by grouping/rendering from actual event timestamps (`timeIn`/`timeOut`) instead of normalized server date only.

### ⚡ Prior Platform Updates (Mar 11, 2026)
- **Teacher attendance session accuracy (mobile + backend)**
  - Fixed issue where tapping **Start AFTERNOON** could still be recorded as morning due to server-side hour inference.
  - Attendance service now persists explicit session intent (`MORNING` / `AFTERNOON`) from mobile check-in/check-out requests.
  - `/attendance/teacher/today` now maps records by stored session (not by inferred check-in hour).
  - Supabase migration was applied safely with non-destructive backfill and historical data preserved.
- **Facebook-style persistent login hardening (mobile)**
  - Session restore on app boot now avoids unnecessary auto-logout on transient verify/refresh failures.
  - Refresh recovery path added before clearing session; session is cleared only on terminal token rejection.
  - Token retrieval now falls back to last known token when refresh is temporarily unavailable.

### ⚡ Earlier Platform Updates (Mar 10, 2026)
- **Mobile startup performance tuning**
  - Login-to-feed path optimized with auth-time feed prewarm
  - First-feed load hardened for Cloud Run free-tier cold starts (fallback + bounded retry + cache-first behavior)
- **Mobile splash UX refresh**
  - Native splash now uses the Stunity wordmark asset at larger size
  - JS transition splash updated to modern single-wordmark animation
  - White flash between native splash and feed removed
- **Android dev reliability**
  - Added project scripts to auto-restore SDK config after `expo prebuild --clean`
  - `npm run android` now bootstraps `android/local.properties` before build
- **Auth login hardening**
  - Auth service now safely handles social-only/invalid password-hash accounts during password login
  - Prevents backend 500s and returns user-safe auth errors instead

### 🔐 Authentication & Enterprise Security
- **Email OR phone** — Register and login with either (like Facebook); at least one required
- **Organization optional** — Registration step 2; users can skip if not applicable
- **Session persists until logout** — No "Remember me" checkbox; tokens persist like Facebook
- Email/password login + registration with role selection
- Claim code system (STNT-XXXX-XXXX) — school enrollment
- JWT access tokens (30d) + refresh tokens (365d), bcrypt 12 rounds
- Parent portal login (separate flow) + **Parent Portal mobile app** (grades, attendance, report cards)
- Enterprise SSO fully integrated (Azure AD, Google Workspace) with auto-provisioning
- **Security headers** — Helmet + HPP on auth-service + feed-service
- **Rate limiting** — 6 endpoint-specific limiters (global, auth, register, reset, 2FA, feed writes/uploads)
- **Brute force protection** — progressive lockout (5/10/15 attempts → 15min/30min/1hr)
- **Password policy** — 8+ chars, complexity rules, common password block, history check
- **Password reset flow** — Resend email (prod) / console.log (dev), crypto tokens
- **OAuth2 social login** — Google, Apple, Facebook, LinkedIn (backend ready)
- **2FA/MFA** — TOTP + 10 backup codes (Google Authenticator compatible)
- **DB models**: SocialAccount, TwoFactorSecret, LoginAttempt (Prisma schema)
- **Mobile screens**: ForgotPasswordScreen, ResetPasswordScreen, TwoFactorScreen
- **Web pages**: forgot-password, reset-password (with strength indicators), social login buttons

### 📱 Mobile Social Feed (Complete + Optimized)
- **7 post types:** Text, Poll, Quiz, Course, Project, Question, Exam, Announcement
- **Real-time feed:** Supabase postgres_changes → "New Posts" pill (Twitter-style); **Optimized background/foreground lifecycle** (auto-recon on resume)
- **Feed algorithm:** 6-factor scoring with **author affinity** (0–0.4 boost) — 3-pool mixing (60% relevance + 25% trending + 15% explore)
- **Scroll performance:** FlashList, drawDistance=800, `React.memo()` on PostCard with deep equality checks, removeClippedSubviews=Android-only
- **Optimistic UI:** Like, comment, repost update instantly before API confirms
- **Post visibility fix:** Two-query candidate pool (75 trending + 25 fresh/last-6h) so new posts always appear
- **Comments:** Real-time (Supabase), no double-display, DELETE handled in-state
- **Reactions/Likes:** Real-time counter updates via postgres_changes
- **Reposts:** Full repost + quote repost, notification to original author
- **Bookmarks, Search, Trending**
- **Stories** (24-hour expiry)
- **Video Post Support**: 50MB video uploads, R2 storage optimization bypass, inline VideoPlayer
- **Notifications:** Bell badge via Supabase Realtime, SSE fallback
- **Push notifications** — Expo Push (FCM/APNs) for background/closed app
- **School→Feed notification bridge** — grade/attendance events → student in-app notifications

### 🧠 Quiz System (Complete)
- Create quiz posts with questions, time limit, passing score, shuffle
- Take quiz with timer, progress grid, auto-submit
- Results screen with score, pass/fail, points earned
- Quiz detail screen shows full info + Start Quiz / Retake Quiz button
- Previous attempt result displayed (score %, passed badge)
- userAttempt included in GET /posts/:id response

### 📊 Analytics (Optimized)
- Post analytics modal: gradient header (brand sky-blue), period toggle (24h/7d/30d), skeleton loading
- Backend uses DB-level COUNT/aggregate — no memory bloat for viral posts
- Algorithm relevance score with factor breakdown (clamped to 100%)
- 7-day bar chart with today highlighted
- Traffic source breakdown with inline progress bars

### 💬 Comments & Reposts
- Real-time comments (Supabase postgres_changes per postId)
- Own comment skips re-fetch (no double-display)
- DELETE removes from state without round-trip
- Repost notification: SHARE enum in NotificationType, notification + SSE to original author

### 🏫 School Management (Web + Mobile)
- Multi-school support with academic years
- Student enrollment with auto-generated IDs, bulk CSV import
- Teacher management + subject/class assignment
- Class sections with rosters
- Timetable generation (shifts, constraints, drag-drop on web)
- Grade entry (GPA scales, exam types, subject averages)
- Attendance marking with session management
- Teacher geofenced attendance now respects explicitly selected session on mobile (morning/afternoon) end-to-end
- **Parent portal mobile app** — ParentHomeScreen, ParentChildScreen, ParentChildGradesScreen, ParentChildAttendanceScreen, ParentChildReportCardScreen; login with phone; RootNavigator routes PARENT role to ParentNavigator
- Parent portal web (grades, attendance, report cards, parent-to-teacher messages)
- Academic year promotion workflow
- Admin claim code generation + school templates

### 👑 Super Admin & Platform Management
- **Super Admin area** (`/[locale]/super-admin`) — Dashboard, Schools, Users, Audit Logs, Settings, Analytics
- **Feature flags** — Platform-wide; create, toggle; public check API; `MAINTENANCE_MODE` for maintenance overlay
- **Platform announcements** — Create, edit, delete; `AnnouncementBanner` for all users
- **Platform audit logging** — School/User actions logged with actor, resource, details
- See [SUPER_ADMIN_AND_ENTERPRISE_FEATURES.md](./docs/SUPER_ADMIN_AND_ENTERPRISE_FEATURES.md) for full details

### 📚 Learning
- Course creation and enrollment (mobile + web)
- Course detail with lessons
- Mobile Learn Explore now supports API-backed preset categories with top-6 default + view-all toggle
- Mobile Learn UI refreshed with colorful category/stat cards and rounded controls
- Course Detail + Lesson Viewer progress UX upgraded (progress cards/bars, richer lesson status visuals)
- Live quiz (Kahoot-style): host, lobby, play, leaderboard, podium
- Assignments: create, submit, grade, submission list
- Clubs: create, join, post, members, events

### 💬 Messaging
- Direct messages (conversations list + chat)
- Real-time (Supabase Realtime channels)
- New message screen

### 🏆 Gamification
- XP system + Reputation Leaderboard (Premium Podium UI)
- Achievement badges (academic + social milestones)
- Streaks (learning, attendance)
- Challenge system (quiz duels)

### 🚀 Production Ready
- CORS env var (ALLOWED_ORIGINS) for multi-domain
- PORT from env (Cloud Run compatibility)
- Background jobs gated (DISABLE_BACKGROUND_JOBS=true for scaled deployments)
- keepAliveTimeout=620s (Cloud Run LB)
- Docker build from monorepo root
- Redis SCAN (not KEYS), createMany for batch inserts
- ETag/304 for feed caching

---

## ⚠️ Remaining Work (Priority Order)

### 🔴 Priority 1 — Blocking Features
1. ~~**Web Feed: Quiz Post Card**~~ ✅ Web PostCard shows quiz label/badge
2. ~~**Web Feed: Course/Exam post forms**~~ ✅ CreatePostModal now has Course + Exam builders
3. ~~**Push Notifications (FCM)**~~ ✅ Expo Push fully implemented (FCM/APNs)
4. **DB Migration: SHARE enum** — Run on production Supabase: `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SHARE';`

### 🟡 Priority 2 — Important Enhancements
5. ~~**Web Feed: Repost button**~~ ✅ Already implemented (full repost-as-post)
6. ~~**Web Feed: Real-time comments**~~ ✅ Already working via SSE
7. ~~**Enterprise SSO backend**~~ ✅ Azure AD + Google Workspace (passport-azure-ad, passport-google-oauth20)
8. ~~**Video post support (Web)**~~ ✅ CreatePostModal accepts video; MediaGallery renders video playback
9. ~~**School-Feed notification bridge**~~ ✅ `/notifications/student` + `/notifications/batch`, grade/attendance services notify students

### 🟢 Priority 3 — Polish
10. ~~**Web Profile page parity**~~ ✅ Activity tab: XP, Level, Streak, Learning Hours, completeness bar
11. ~~**Search**~~ ✅ Web search at `/[locale]/search` uses feed-service `/users/search` and `/posts?search=` (no separate search-service)
12. ~~**Super Admin area**~~ ✅ Fully implemented in web app at `/[locale]/super-admin` (Dashboard, Schools, Users, Audit Logs, Settings, Analytics)
13. ~~**FeedRanker author-affinity**~~ ✅ Full 6-factor model with interaction history

### 🆕 Next Up
14. ~~**Web video post support**~~ ✅ CreatePostModal accepts video, MediaGallery renders video playback
15. ~~**Enterprise SSO**~~ ✅ Backend integrated (Azure AD, Google Workspace via passport)
16. **DB Migration: SHARE enum** — Run on production: `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SHARE';`
17. **Audit logging dashboard** — Audit logs exist; dedicated analytics UI (optional polish)

---

## 📁 Repository Structure

```
Stunity-Enterprise/
├── apps/
│   ├── mobile/          # React Native + Expo SDK 54
│   └── web/             # Next.js 14 (admin/teacher/parent/super-admin)
├── services/            # 15 microservices
├── packages/
│   └── database/        # Shared Prisma schema + client
├── docs/                # Architecture + feature docs
└── scripts/             # Deployment + seed scripts
```

---

## 🌐 Service Map

| Service | Port | Responsibility |
|---------|------|----------------|
| auth-service | 3001 | JWT auth, claim codes, OAuth2, 2FA, password reset |
| school-service | 3002 | School reg, templates, claim codes |
| student-service | 3003 | Student profiles, enrollment, IDs |
| teacher-service | 3004 | Teacher profiles, assignments |
| class-service | 3005 | Classes, sections, rosters |
| subject-service | 3006 | Subject definitions, curriculum |
| grade-service | 3007 | Grades, GPA, analytics |
| attendance-service | 3008 | Attendance tracking |
| timetable-service | 3009 | Schedule generation |
| feed-service | 3010 | Social feed, posts, media, quizzes, profiles |
| messaging-service | 3011 | Direct messages |
| club-service | 3012 | Clubs, events, discussions |
| notification-service | 3013 | Push notification delivery |
| analytics-service | 3014 | Live quizzes, XP, achievements, leaderboards |
| ai-service | 3020 | AI features (optional) |

---

## 🔗 Quick Links
- **Developer Guide:** [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
- **Feature Roadmap:** [NEXT_IMPLEMENTATION.md](./NEXT_IMPLEMENTATION.md)
- **Architecture:** [docs/architecture/](./docs/architecture/)
