# ✅ Stunity Enterprise — Current Features

**Version:** 23.8 | **Updated:** March 18, 2026

> This document lists all implemented and working features. For what's coming next, see NEXT_IMPLEMENTATION.md.

---

## ⚡ Latest Rollout (Mar 18, 2026)

- **Mobile release hardening pass (P0/P1, chat intentionally excluded)**
  - Removed self-service **Delete Account** action from mobile settings to align with school-managed account policy.
  - Replaced hardcoded user IDs in achievements/challenge/stats screens with authenticated user IDs.
  - Parent Login now keeps only real portal actions (placeholder social/biometric actions removed).
  - Edit Post toolbar now supports real camera capture and no longer shows unwired media actions.

- **Push notification production readiness (mobile)**
  - `expo-notifications` plugin enabled in app config.
  - Notification runtime gate switched on for production push registration flow.
  - Android Firebase config validated with real `google-services.json` package mapping.

- **Performance optimization pass beyond Feed (mobile)**
  - ProfileScreen optimized with memoized profile-post derivation and stable handlers.
  - Fixed ProfileScreen hook-order render crash (`Rendered more hooks than during the previous render`).
  - Conversations and New Message screens tuned with memoized list rendering + FlatList virtualization settings.

- **Android app icon branding update + build outcome**
  - Official Android icons wired through tracked Expo assets (`android.icon`, adaptive foreground image) for EAS persistence.
  - Android EAS production build completed successfully (`.aab` generated).

## ⚡ Previous Rollout (Mar 17, 2026)

- **Mobile Clubs Screen Redesign**
  - Complete redesign of `ClubsScreen.tsx` to match the app's white / flat-border card aesthetic.
  - Club cards now use `backgroundColor: #FFFFFF`, `borderRadius: 16`, `borderColor: #E2E8F0` — identical to the Profile Performance tab card style.
  - Card layout: icon chip + title in header row with "View →" link, description body, stacked member avatars + count, teal "Join Now →" pill, and a branded progress bar.
  - All horizontal margins reduced from 20 px → 12 px to align with the social feed card spacing.
  - `CLUB_TYPE_META` updated with per-type background tints and gradient icon colors.

- **Mobile Create Club Screen Redesign**
  - Full rewrite of `CreateClubScreen.tsx` with a modern teal gradient top bar, premium section cards, and a live preview.
  - Club Type picker: 2×2 grid with gradient icon boxes (blue, teal, amber, purple) and checkmark overlay on selection.
  - Privacy picker: Radio-button rows with colored icon circles and inner-dot radio indicators.
  - Tags field: Live tag-pill previews below input.
  - Live Preview card mirrors the real club card layout (icon, title, type badge, privacy badge, progress bar).
  - Sticky Create button with solid teal gradient (`#0D9488 → #0F766E`) and disabled grey state.

- **Mobile Browse Quizzes Screen Redesign**
  - `BrowseQuizzesScreen.tsx` converted from dark purple glassmorphism to a light white card theme matching the rest of the app.
  - Background changed to `#F6F8FB`; all purple/violet accents replaced with Stunity brand teal (`#09CFF7 / #06A8CC`).
  - Card margins reduced from `paddingHorizontal: 16` (container) to `marginHorizontal: 12` on each card — matching PostCard feed pattern.
  - Category filter chips: white with flat border, teal fill when active.
  - Quiz cards: white `#FFFFFF` background, `borderRadius: 16`, `borderColor: #E2E8F0`, teal start-quiz gradient button.

- **Education Card Hub + sidebar-first profile actions (mobile)**
  - Added a premium **My Education Card** screen with independent **design** and **color theme** selection, front/back switching, and horizontal/vertical layouts.
  - Rolled out four polished templates (`luxe`, `wave`, `prism`, `classic`) with updated front/back visuals and cleaner premium hierarchy.
  - Upgraded color customization to a swatch-only picker (Canva-like interaction) with curated vibrant palettes, including expanded pink options.
  - Vertical card style was redesigned to match horizontal premium language and standardized to CR80 ratio sizing.
  - Front/back card surfaces now keep identical fixed heights per orientation for stable transitions.
  - Sidebar now acts as a card-first hub with quick menu actions under the card (including teacher attendance and quiz studio), and preview now mirrors selected design/style/orientation from the card page.
  - Sidebar preview polish includes stronger visual clarity on iOS, full-width alignment with action buttons, single-border treatment, thicker card edge, and larger preview avatar framing.
  - Mobile Events is fully implemented (calendar list, event detail, RSVP) using feed-service calendar APIs.
  - Attendance/settings navigation flow was hardened so back actions no longer reopen stale attendance screens.

- **Attendance GPS reliability + recovery (mobile)**
  - Tapping the top GPS section now performs robust manual re-location (permission/service re-check + high-accuracy refresh).
  - Better denied/disabled handling with Settings shortcut and clearer fallback states before attendance verification.
- **Genesis Premium Aesthetic (Web)**
  - Full rollout of high-fidelity "Genesis" dark mode aesthetic across core modules.
  - **Grades Entry (Academic Ledger)**: Professional data entry grid with glassmorphism, real-time sync indicators, and integrated class analytics.
  - **Attendance Dashboard**: Redesigned with premium cards, enhanced filtering, and glassmorphism.
  - **Subjects & Classes**: Refined registry UI for consistent platform-wide branding.
- **Settings screen completion (mobile)**
  - Added a functional **Password & Security** flow using authenticated `POST /auth/change-password`.
  - Replaced dead-end actions with working navigation/links (Achievements, Help Center, Privacy Policy, Contact Support).
  - Settings persistence aligned with existing APIs/services:
    - `profileVisibility` toggle persists via `PUT /users/me/profile` with rollback on failure.
    - biometric toggle persists via secure token service storage.
    - online-status toggle now updates local auth user state consistently.
- **Saved Posts navigation fix (mobile)**
  - Fixed back-navigation state issue where Saved Posts could reappear when returning to profile.
  - Sidebar profile shortcut now opens Profile directly, and Saved Posts back/empty CTA now use stack-aware fallback navigation.

- **Web feed widgets are now fully live**
  - Learning Spotlight now loads featured courses from API with working links/fallback states.
  - Top Contributors widget now uses `/users/leaderboard` with loading/error/empty UX.
  - Added dedicated web leaderboard page at `/${locale}/leaderboard`.
- **Create Event reliability improvements (web + feed-service)**
  - Event creation now uses authenticated submission with stronger validation/error handling.
  - Upcoming calendar logic now includes same-day all-day and in-progress events.
- **Mobile Learn redesign + UX polish**
  - PlayStore-style two-column colorful categories, API-backed counts, top-6 default, and View all toggle.
  - Rounded search/enroll controls and polished category/stat cards.
  - Course Detail + Lesson Viewer redesigned with richer progress cards/bars and lighter feed-standard app bars/safe-area treatment.

---

## 🔐 Authentication & Security (Enterprise-Grade)

### Core Auth
- **Email OR phone** — Register and login with either (at least one required); single "Email or Phone" field on mobile and web
- **Organization optional** — Registration step 2; users can skip organization name
- **Session persists until logout** — No Remember me checkbox; tokens persist like Facebook
- **Login persistence hardening** — Mobile app now keeps persisted session during transient verify/refresh failures and only clears on terminal token rejection
- Email/password registration + login
- Role selection: Student, Teacher, Admin, Parent
- Claim code enrollment: `STNT-XXXX-XXXX` links users to a school
- JWT access tokens (30d) + refresh tokens (365d), bcrypt 12 rounds
- Parent portal with separate login (linked to student accounts)
- **Parent Portal mobile app** — ParentLoginScreen, ParentNavigator, ParentHomeScreen, ParentChildScreen, grades/attendance/report-card screens
- Profile setup screen (bio, avatar, interests)

### Security Foundation
- **Helmet** security headers on auth-service + feed-service
- **HPP** (HTTP Parameter Pollution) protection
- **Rate limiting** — 6 different limiters:
  - Global: 100 req/15min (auth), 100 req/min (feed)
  - Auth-specific: 10 login attempts/15min (skip successful)
  - Register: 5/hour, Password reset: 3/hour, 2FA: 5/5min
  - Feed writes: 30/min, Uploads: 20/5min
- **Brute force protection** — progressive lockout (5/10/15 failed attempts → 15min/30min/1hr lock)
- **Password policy** — 8+ chars, uppercase, lowercase, number, special char, common password block, password history check
- **JWT hardening** — short expiry, `passwordChangedAt` invalidation

### Password Reset Flow
- `POST /auth/forgot-password` — sends reset email (Resend in prod, console.log in dev)
- `POST /auth/reset-password` — validates crypto token, enforces password policy
- `POST /auth/change-password` — authenticated password change with history check
- **Mobile:** ForgotPasswordScreen + ResetPasswordScreen (full UI with validation)
- **Web:** `/auth/forgot-password` + `/auth/reset-password` pages with strength indicators

### OAuth2 Social Login (Backend Ready)
- **4 providers:** Google, Apple, Facebook, LinkedIn
- Unified `handleSocialLogin()` handler with automatic account linking
- Account link/unlink endpoints for managing connected social accounts
- Graceful 501 response when provider env vars not configured
- **Mobile:** OAuth-ready buttons (Google + Apple) — activate by adding env vars
- **Web:** Social login icon buttons on login page (Google, Apple, Facebook, LinkedIn)
- **Env vars needed:** `GOOGLE_CLIENT_ID`, `APPLE_SERVICE_ID`, `FACEBOOK_APP_ID`/`FACEBOOK_APP_SECRET`, `LINKEDIN_CLIENT_ID`/`LINKEDIN_CLIENT_SECRET`

### Two-Factor Authentication (2FA)
- **TOTP-based** (compatible with Google Authenticator, Authy, etc.)
- `POST /auth/2fa/setup` — generates QR code + secret
- `POST /auth/2fa/verify-setup` — enables 2FA, returns 10 backup codes
- `POST /auth/2fa/verify` — login challenge (TOTP or backup code)
- `POST /auth/2fa/disable` — disable with TOTP verification
- Backup codes: 10 one-time codes, individually bcrypt-hashed
- **Mobile:** TwoFactorScreen — 6-digit input with paste support + backup code toggle
- **Web:** Auth API functions (setup2FA, verifySetup2FA, verify2FA, disable2FA)

### Database Models (Prisma)
- `SocialAccount` — stores linked social provider accounts per user
- `TwoFactorSecret` — stores encrypted TOTP secret + hashed backup codes
- `LoginAttempt` — audit trail for login attempts (IP, user agent, success/failure)

---

## 👑 Super Admin & Platform Management

Platform-wide management area for super administrators. See [SUPER_ADMIN_AND_ENTERPRISE_FEATURES.md](./docs/SUPER_ADMIN_AND_ENTERPRISE_FEATURES.md) for full details.

### Super Admin Area (`/[locale]/super-admin`)
- **Dashboard** — Platform stats (schools, users, classes), schools by tier, recent schools, quick actions
- **Schools** — List with pagination/search/status filter, create, detail, edit, delete, activate/deactivate
- **Users** — List with pagination/search/school/role filter, detail, activate/deactivate
- **Audit Logs** — Platform-wide trail with filters (resource type, action)
- **Platform Settings** — Feature Flags, Announcements, Subscription Tiers (read-only), Coming Soon tab
- **Analytics** — Schools/users per month charts, top schools, month range selector (6/12/24)
- **Language Management (OTA translations)** — `ADMIN` and `SUPER_ADMIN` can edit `web`, `mobile`, and `global` translation keys from Admin UI and publish changes without app rebuilds
- **Translation management console redesign (web)** — Added app/locale/namespace/screen filters, grouped screen/page sections, unsaved-change tracking, row-level save, and bulk-save workflow
- **Translation sync performance hardening** — Mobile sync now prioritizes active locale, uses per-locale ETag caching (`If-None-Match`), and backend serves `ETag`/`304` with deterministic global→app override precedence

### Khmer Typography (Web + Mobile)
- Locale-aware Khmer typography is now centralized for both apps when language is `km`.
- **Koulen** is used for headings/titles, profile-name style text, and button labels.
- **Battambang** remains the default for Khmer body text and form text.
- **Metal** is reserved for short quotes/notes.
- Mobile globally injects Khmer font roles through text rendering hooks (`Text`/`TextInput`) while preserving explicit custom component fonts.
- Numeric-only text (for example ring counters like `1`, `95%`) stays in Latin/system digits and is not forced into Khmer display fonts.

### Enterprise Features
- **Feature Flags** — Platform-wide or per-school; create, toggle, check via public API
- **Platform Announcements** — Create, edit, delete; shown in `AnnouncementBanner`; priority levels (INFO/WARNING/URGENT)
- **Maintenance Mode** — `MAINTENANCE_MODE` feature flag; non–super-admin users see full-screen overlay; super admins bypass
- **Platform Audit Logging** — SCHOOL_CREATE/UPDATE/DELETE, USER_ACTIVATE/DEACTIVATE

### Seed Super Admin
```bash
npm run seed:super-admin [email]
```

---

## 📱 Social Feed (Mobile — Fully Optimized)

### Post Creation
- 7 post types: **Text, Poll, Quiz, Course, Project, Question, Exam, Announcement**
- Image upload (multiple images per post) via Cloudflare R2
- Post visibility: Public, School, Class, Followers Only
- Tag support with autocomplete

### Feed Display & Algorithm
- Personalized feed with 6-factor scoring algorithm:
  - Engagement (25%), Relevance (25%), Quality (15%), Recency (15%), Social Proof (10%), Learning Context (10%)
- **Author affinity** — 0–0.4 boost based on interaction history (likes, comments, follows)
- 3-pool mixing: 60% relevance + 25% trending + 15% explore
- Diversity enforcement across post types
- New posts always appear (two-query candidate pool: 75 trending + 25 fresh/last-6h)
- Real-time "New Posts" pill (Twitter-style) via Supabase postgres_changes; **Background/Foreground lifecycle aware**
- ETag/304 caching (saves bandwidth on unchanged feeds)
- Cursor-based pagination (no offset, scales to billions of posts)
- Feed payload reduced 76% via `stripToMinimal` field projection

### Post Cards (7 types rendered correctly)
- Text posts with inline media gallery (all images shown)
- Quiz posts with: question count, time limit, pass %, "Take Quiz" / "Retake Quiz" button
- Previous quiz attempt result shown (score %, pass/fail badge)
- Poll posts with live vote percentages + tap to vote
- Announcement posts with school badge
- Course, Project, Exam, Question posts with type-specific styling
- Multi-image carousel (all images, no blur — was a bug, now fixed)

### Interactions
- **Like / Reaction:** Optimistic UI, real-time counter via Supabase
- **Comment:** Real-time (Supabase postgres_changes), no double-display, optimistic add
- **Repost / Quote Repost:** Creates new post referencing original
- **Bookmark:** Save posts for later
- **Share:** Deep link sharing

### Notifications (Real-time)
- Bell badge updates instantly via Supabase Realtime
- Notification types: Like, Comment, Follow, Repost (SHARE), Quiz Attempt, Achievement, Grade Update, System
- SSE fallback for non-Supabase events
- **Push notifications** (Expo Push with FCM/APNs) — works when app is closed
- **School→Feed notification bridge**: grade/attendance events → student in-app notifications

### Feed Performance (Optimized for Scale)
- FlashList (RecyclerView-backed, not FlatList)
- `drawDistance=600`, `windowSize=7`, `maxToRenderPerBatch=8`
- `removeClippedSubviews={Platform.OS === 'android'}` (iOS false — prevents Core Animation jank)
- `hasPrefetched` as `useRef` (zero re-renders during scroll)
- Granular Zustand selectors (prevent full FeedScreen re-render on single state change)
- Memoized SVG performance rings (no recompute on scroll)
- 500ms throttled scroll handler

### Backend Performance (Optimized for Scale)
- All user-data queries parallelized with `Promise.all`
- Redis SCAN (not KEYS) — prevents Redis blocking at scale
- `createMany({ skipDuplicates: true })` for bulk view inserts
- No `COUNT(*)` on paginated feed (uses `hasMore` boolean)
- DB-level `COUNT/_count/aggregate` for analytics (no memory OOM on viral posts)
- Background scoring job gated via `DISABLE_BACKGROUND_JOBS=true` env var

---

## 🔍 Search

- Search posts by text, type, tags
- Search users by name
- Search clubs
- Quiz card rendering in search results (questions, time, score, "Take Quiz")
- Poll preview in search results
- Recent searches history

---

## 🧠 Quiz System

- Create quiz posts (questions, options, correct answer, time limit, passing score, shuffle)
- Take quiz: timer, progress grid, question navigation, auto-submit on time
- Results: score %, pass/fail, points earned
- Quiz detail screen: full info, "Start Quiz" / "Retake Quiz" button
- Previous attempt result displayed in detail view
- Live Quiz (Kahoot-style): create room, lobby wait, real-time leaderboard, podium (via analytics-service)

---

## 📊 Post Analytics

- Views, unique viewers, engagement rate, avg watch time
- Period toggle: Last 24h / 7d / 30d
- 7-day bar chart (today highlighted in solid sky-blue)
- Traffic source breakdown with progress bars
- Algorithm relevance score with factor breakdown
- Skeleton loading state
- Redesigned UI: sky-blue gradient header (`#0EA5E9 → #0284C7`), consistent branding

---

## 💬 Comments

- Full-screen comments sheet
- Real-time new comments (Supabase postgres_changes per postId)
- Reply threading
- Comment like
- Delete own comment (instant state update, no round-trip)
- Own INSERT skip (no duplicate after optimistic add)

---

## 📖 Stories

- 24-hour expiry stories with image/text
- Story viewer with progress bar
- School stories and personal stories
- View tracking

---

## 🏫 School Management

### Admin
- Create school profile (name, logo, type, grade level, address)
- School templates (grade scales, timetable configs)
- Generate claim codes for bulk enrollment
- Academic year management (create, set active, promote students)
- View enrollment + student statistics

### Student Management
- Add students individually or bulk CSV import
- Auto-generate student IDs
- Link students to classes and academic years
- View student profile (grades, attendance, assignments)
- Print/export student report cards

### Teacher Management
- Add/edit teacher profiles with qualifications
- Assign teachers to subjects and classes
- Teacher dashboard with class overview

### Class & Subject
- Create classes (section, grade level, academic year)
- Define subjects with credit hours and curriculum
- Assign subjects to classes
- View class roster with student list
- **Bug Fix**: Fixed 500 error on `GET /classes/:id/students` caused by invalid `khmerName` Prisma query, and actively deduplicates `StudentClass` records.

### Grades
- Enter grades by subject, exam type (midterm, final, quiz, assignment, project)
- GPA calculation (4.0 scale or custom scale)
- Subject average computation
- Grade analytics (class average, distribution)
- Transcript generation
- Grade notifications to parents AND students (via push + feed notification bridge)

### Attendance
- Mark attendance by session (morning/afternoon/full-day)
- Attendance statuses: Present, Absent, Late, Excused, Permission
- Session management (create/close)
- Attendance report by student, class, date range
- Teacher geofenced check-in/check-out now stores explicit selected session (MORNING/AFTERNOON) to prevent afternoon actions being auto-recorded as morning
- Teacher can submit **online permission requests from anywhere** (outside geofence) for MORNING/AFTERNOON sessions directly in mobile attendance
- Teacher **Attendance Recording** screen now surfaces permission clearly with improved status badges/icons and polished session cards
- Attendance Recording date labels now use event timestamps (time-in/time-out) to avoid timezone day-shift mismatches on mobile
- Absence notifications to parents AND students (via push + feed notification bridge)

### Timetable
- Create timetable with periods and breaks
- Assign subjects/teachers to time slots
- Support for shifts (morning/afternoon)
- Conflict detection
- Drag-and-drop editing on web
- Export/print timetable

### Parent Portal
- View child's grades and GPA
- View child's attendance record
- View report card
- Receive push notifications (grade updates, absences)
- Message teachers directly

---

## 📚 Courses & Learning

- Create course posts with lessons
- Course enrollment (join/leave)
- Course detail view with lesson list
- Lesson completion tracking
- Course progress display
- Learn Explore categories are dynamic from API with preset colorful tiles, top-6 default, and View all/View less toggle
- Learn Explore has improved visual hierarchy (header, stat cards, and polished rounded controls)
- Course Detail screen now includes upgraded progress card + colorful overview stat cards
- Lesson Viewer now includes per-course progress summary card and improved playlist visuals

---

## 🏆 Gamification

- XP points for activities (posts, likes, quizzes, attendance)
- Level progression
- Achievement badges (academic + social milestones)
- Learning streaks
- Attendance streaks
- Reputation Leaderboard (Top Scholars podium UI and global ranking)
- Quiz challenge duels

---

## 👥 Clubs

- Create and join clubs
- Club feed (posts scoped to club)
- Club events
- Member management
- Club announcements

---

## 💬 Direct Messaging

- Conversation list
- Real-time chat (Supabase Realtime channels)
- New message screen
- Message read receipts
- Teacher-to-parent messaging (via parent portal)

---

## 🌐 Web App (Next.js)

- Full school management interface (all CRUD operations)
- Social feed with SSE real-time (new post notification pill + real-time comments)
- 7 post type cards (Quiz shows badge; full quiz card UI coming)
- Create posts: Text, Poll, Announcement, Question, Project, **Course, Exam** (all with full builder UIs)
- **Web Khmer/English language switch parity** — Robust locale switching with persisted `NEXT_LOCALE` cookie and query-preserving route updates
- **Feed localization parity (web)** — Feed page, create-post modal, post card, analytics/activity/insights, and core feed widgets now use `next-intl` keys for `en`/`km`
- **Translation fallback hardening** — Feed profile card safely falls back when OTA payload returns key-shaped values (e.g., `profile.viewProfile`)
- **Translation settings UX redesign** — Admin language page now supports filtering by app target, locale, namespace, and screen/page with grouped editing and bulk save
- **Feed widgets + leaderboard rollout** — Learning Spotlight and Top Contributors widgets are API-backed with proper loading/error states; dedicated leaderboard page added
- **Event create/upcoming robustness** — Web create-event flow hardened and upcoming event visibility expanded for same-day all-day/in-progress events
- **Repost button** — full repost-as-post (parity with mobile)
- **Real-time comments** via SSE with exponential backoff reconnection
- Analytics modal (redesigned to match mobile)
- Timetable editor with drag-and-drop
- Student/teacher/grade/attendance management pages
- **Auth flows:** Login with social buttons, forgot-password page, reset-password page (with strength indicators)
- **Profile page:** Activity tab with XP, Level, Streak, Learning Hours, profile completeness bar
- Internationalization (next-intl, multi-locale routing)
- **Dark mode** — Theme toggle in nav bar (Moon/Sun icon), persists to localStorage, respects system preference as default

---

## 🔧 Infrastructure

- Turborepo monorepo — shared `packages/database` (Prisma)
- 14 Express.js microservices
- PostgreSQL via Supabase (free tier: 500MB, 50K MAU)
- Cloudflare R2 object storage (free egress)
- Google Cloud Run ready (PORT env, CORS env, keepAliveTimeout 620s, Dockerfile fixed)
- In-memory LRU + optional Redis feed cache
- ETag/304 response caching
- **Helmet + HPP** security headers on auth-service + feed-service
- **Rate limiting** — 6 endpoint-specific limiters (auth + feed)
- **Composite DB indexes** for school feed query performance
- **Pluggable email** — Resend in production (free 3K/month), console.log in development
