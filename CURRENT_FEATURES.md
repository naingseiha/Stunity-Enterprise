# ✅ Stunity Enterprise — Current Features

**Version:** 23.0 | **Updated:** February 21, 2026

> This document lists all implemented and working features. For what's coming next, see NEXT_IMPLEMENTATION.md.

---

## 🔐 Authentication & Security (Enterprise-Grade)

### Core Auth
- Email/password registration + login
- Role selection: Student, Teacher, Admin, Parent
- Claim code enrollment: `STNT-XXXX-XXXX` links users to a school
- JWT access tokens (1h) + refresh tokens (7 days), bcrypt 12 rounds
- Parent portal with separate login (linked to student accounts)
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
- Real-time "New Posts" pill (Twitter-style) via Supabase postgres_changes
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

### Grades
- Enter grades by subject, exam type (midterm, final, quiz, assignment, project)
- GPA calculation (4.0 scale or custom scale)
- Subject average computation
- Grade analytics (class average, distribution)
- Transcript generation
- Grade notifications to parents AND students (via push + feed notification bridge)

### Attendance
- Mark attendance by session (morning/afternoon/full-day)
- Attendance statuses: Present, Absent, Late, Excused
- Session management (create/close)
- Attendance report by student, class, date range
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

---

## 🏆 Gamification

- XP points for activities (posts, likes, quizzes, attendance)
- Level progression
- Achievement badges (academic + social milestones)
- Learning streaks
- Attendance streaks
- Leaderboard by school/global
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
- **Repost button** — full repost-as-post (parity with mobile)
- **Real-time comments** via SSE with exponential backoff reconnection
- Analytics modal (redesigned to match mobile)
- Timetable editor with drag-and-drop
- Student/teacher/grade/attendance management pages
- **Auth flows:** Login with social buttons, forgot-password page, reset-password page (with strength indicators)
- **Profile page:** Activity tab with XP, Level, Streak, Learning Hours, profile completeness bar
- Internationalization (next-intl, multi-locale routing)
- Dark mode support

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
