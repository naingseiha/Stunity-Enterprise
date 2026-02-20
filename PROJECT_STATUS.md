# 🎓 Stunity Enterprise — Project Status

**Last Updated:** February 20, 2026
**Version:** 22.0
**Status:** 97% Complete — Feed Optimized, School Integration Active 🚀

---

## 🏗️ What Is Stunity?

Stunity Enterprise is an **enterprise e-learning platform** that unifies **school management** (attendance, grades, timetables, student records) with a **social learning feed** (posts, quizzes, clubs, messaging) — designed for global multi-school deployment.

- **Mobile App:** React Native / Expo SDK 54 (iOS + Android)
- **Web App:** Next.js 14 (teachers, admin, parents)
- **Backend:** 14 microservices on Express.js + PostgreSQL (Supabase)
- **Infrastructure:** Google Cloud Run + Cloudflare R2 + Supabase Free Tier

---

## ✅ Completed Features (v22.0)

### 🔐 Authentication
- Email/password login + registration with role selection
- Claim code system (STNT-XXXX-XXXX) — school enrollment
- JWT access + refresh tokens (7-day refresh)
- Parent portal login (separate flow)
- Enterprise SSO UI ready (Azure AD, Google Workspace — backend pending)

### 📱 Mobile Social Feed (Complete + Optimized)
- **7 post types:** Text, Poll, Quiz, Course, Project, Question, Exam, Announcement
- **Real-time feed:** Supabase postgres_changes → "New Posts" pill (Twitter-style)
- **Feed algorithm:** 6-factor scoring (Engagement 25%, Relevance 25%, Quality 15%, Recency 15%, Social Proof 10%, Learning 10%) — 3-pool mixing (60% relevance + 25% trending + 15% explore)
- **Scroll performance:** FlashList, drawDistance=600, windowSize=7, removeClippedSubviews=Android-only
- **Optimistic UI:** Like, comment, repost update instantly before API confirms
- **Post visibility fix:** Two-query candidate pool (75 trending + 25 fresh/last-6h) so new posts always appear
- **Comments:** Real-time (Supabase), no double-display, DELETE handled in-state
- **Reactions/Likes:** Real-time counter updates via postgres_changes
- **Reposts:** Full repost + quote repost, notification to original author
- **Bookmarks, Search, Trending**
- **Stories** (24-hour expiry)
- **Notifications:** Bell badge via Supabase Realtime, SSE fallback

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
- Parent portal (grades, attendance, report cards, parent-to-teacher messages)
- Academic year promotion workflow
- Admin claim code generation + school templates

### 📚 Learning
- Course creation and enrollment (mobile + web)
- Course detail with lessons
- Live quiz (Kahoot-style): host, lobby, play, leaderboard, podium
- Assignments: create, submit, grade, submission list
- Clubs: create, join, post, members, events

### 💬 Messaging
- Direct messages (conversations list + chat)
- Real-time (Supabase Realtime channels)
- New message screen

### 🏆 Gamification
- XP system + leaderboard
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
1. **Web Feed: Quiz Post Card** — Web PostCard shows quiz label but no "Take Quiz" button or quiz stats (mobile has full card). Need to add quiz card UI to web PostCard.
2. **Web Feed: Course/Exam/Question/Project post forms** — CreatePostModal on web only supports Text, Poll, Announcement, Question, Project (no Quiz, Course, Exam with their full form UIs).
3. **Push Notifications (FCM)** — In-app bell works, but no push when app is closed.
4. **DB Migration: SHARE enum** — Run on production Supabase: `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SHARE';`

### 🟡 Priority 2 — Important Enhancements
5. **Web Feed: Repost button** — Mobile has full repost, web only has share (no repost-as-post)
6. **Web Feed: Real-time comments** — Web shows inline comments but no Supabase real-time subscription (needs `useEffect` + Supabase channel per postId)
7. **Enterprise SSO backend** — UI ready, Azure AD/Google Workspace integration not implemented
8. **Video post support** — Currently images only (R2 + image picker). Need video upload + HLS streaming.
9. **School-Feed notification bridge** — Grade published → notify student in-app via feed notification. Attendance absence → alert parent AND student via feed.

### 🟢 Priority 3 — Polish
10. **Web Profile page parity** — Mobile has rich ProfileScreen (activity, performance tabs, achievements). Web profile is simpler.
11. **Search service integration** — Search service (port 3016) exists but web search UI not fully built out.
12. **Admin portal** — apps/admin-portal exists but needs review of completeness.
13. **FeedRanker author-affinity sub-query** — Sequential 2 queries in getUserSignals (minor optimization).

---

## 📁 Repository Structure

```
Stunity-Enterprise/
├── apps/
│   ├── mobile/          # React Native + Expo SDK 54
│   ├── web/             # Next.js 14 (admin/teacher/parent web)
│   ├── admin-portal/    # Separate admin app (in progress)
│   └── docs/            # Documentation site
├── services/            # 14 microservices
├── packages/
│   └── database/        # Shared Prisma schema + client
├── docs/                # Architecture + feature docs
└── scripts/             # Deployment + seed scripts
```

---

## 🌐 Service Map

| Service | Port | Responsibility |
|---------|------|----------------|
| auth-service | 3001 | JWT auth, claim codes, SSO |
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

---

## 🔗 Quick Links
- **Developer Guide:** [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
- **Feature Roadmap:** [NEXT_IMPLEMENTATION.md](./NEXT_IMPLEMENTATION.md)
- **Architecture:** [docs/architecture/](./docs/architecture/)
