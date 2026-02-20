# ✅ Stunity Enterprise — Current Features

**Version:** 22.0 | **Updated:** February 20, 2026

> This document lists all implemented and working features. For what's coming next, see NEXT_IMPLEMENTATION.md.

---

## 🔐 Authentication & Onboarding

- Email/password registration + login
- Role selection: Student, Teacher, Admin, Parent
- Claim code enrollment: `STNT-XXXX-XXXX` links users to a school
- JWT access tokens (1h) + refresh tokens (7 days)
- Parent portal with separate login (linked to student accounts)
- Forgot password / reset flow
- Profile setup screen (bio, avatar, interests)
- Enterprise SSO UI screens (Azure AD, Google Workspace) — backend pending

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
- 3-pool mixing: 60% relevance + 25% trending + 15% explore
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
- Grade notifications to parents (via push)

### Attendance
- Mark attendance by session (morning/afternoon/full-day)
- Attendance statuses: Present, Absent, Late, Excused
- Session management (create/close)
- Attendance report by student, class, date range
- Absence notifications to parents (via push)

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
- Social feed with SSE real-time (new post notification pill)
- 7 post type cards (Quiz shows badge; full quiz card UI coming in P1-B)
- Create posts: Text, Poll, Announcement, Question, Project (Quiz/Course/Exam forms coming in P2-C)
- Analytics modal (redesigned to match mobile)
- Timetable editor with drag-and-drop
- Student/teacher/grade/attendance management pages
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
