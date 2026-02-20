# 👨‍💻 Stunity Enterprise — Developer Guide

**Version:** 22.0 | **Updated:** February 20, 2026

> Complete reference for developers working on Stunity Enterprise. Read this before writing any code.

---

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Service Reference](#service-reference)
4. [Mobile App Structure](#mobile-app-structure)
5. [Web App Structure](#web-app-structure)
6. [Feed System](#feed-system)
7. [Real-time System](#real-time-system)
8. [State Management](#state-management)
9. [Database & Prisma](#database--prisma)
10. [Media & Storage](#media--storage)
11. [Authentication](#authentication)
12. [School Management Integration](#school-management-integration)
13. [Deployment](#deployment)
14. [Common Tasks](#common-tasks)
15. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker (for local services)

### Setup
```bash
# Install all workspace dependencies
npm install

# Generate Prisma client
cd packages/database && npx prisma generate && cd ../..

# Start all 14 microservices
./start-all-services.sh

# Mobile dev (new terminal)
cd apps/mobile && npx expo start

# Web dev (new terminal)
cd apps/web && npm run dev
```

### Check all services are healthy
```bash
./check-services.sh
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTS                              │
│   Mobile (Expo SDK 54)      Web (Next.js 14)            │
└──────────────┬──────────────────────────┬───────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────────────────────────────────────┐
│              14 MICROSERVICES (Express.js)                │
│  auth│school│student│teacher│class│subject│grade│...     │
└────────────────────────┬─────────────────────────────────┘
                         │
               ┌─────────▼─────────┐
               │  PostgreSQL        │
               │  (Supabase)        │
               │  + Realtime        │
               └───────────────────┘
```

### Key Technology Decisions
| Decision | Choice | Why |
|----------|--------|-----|
| Mobile framework | React Native + Expo SDK 54 | Cross-platform, OTA updates |
| List component | FlashList (Shopify) | 10× faster than FlatList for feeds |
| State management | Zustand | Simple, no boilerplate, selector support |
| Real-time (primary) | Supabase Realtime (postgres_changes) | Zero infra, instant row-level subscriptions |
| Real-time (secondary) | SSE (Server-Sent Events) | Server-push for feed-service events |
| ORM | Prisma | Type-safe, monorepo shared schema |
| DB hosting | Supabase free tier | PostgreSQL + Realtime included |
| Object storage | Cloudflare R2 | S3-compatible, free egress |
| Deployment | Google Cloud Run | Serverless containers, free tier |
| Monorepo | Turborepo | Shared `packages/database` across all services |

---

## Service Reference

### Port Map
```
3001  auth-service        — JWT auth, users, claim codes, notifications
3002  school-service      — Schools, templates, enrollment
3003  student-service     — Student profiles, academic records
3004  teacher-service     — Teacher profiles, qualifications
3005  class-service       — Classes, sections, rosters
3006  subject-service     — Subjects, curriculum mapping
3007  grade-service       — Grades, GPA, transcripts
3008  attendance-service  — Attendance sessions, reports
3009  timetable-service   — Schedule generation, timetables
3010  feed-service        — ALL social: posts, likes, comments, stories,
                            quizzes, analytics, profiles, search, clubs,
                            DMs, calendar, notifications, courses
3011  messaging-service   — Direct message conversations + real-time
3012  club-service        — Clubs, members, events
3013  notification-service — Push notification delivery (FCM/APNs)
3014  analytics-service   — Live quiz (Kahoot), XP, achievements, leaderboards
```

### feed-service is the Core Social Service
Almost all social features live inside `feed-service`. Its route files:
```
services/feed-service/src/
├── routes/
│   ├── posts.routes.ts       ← Feed API: GET /posts/feed, POST /posts, view tracking
│   ├── postActions.routes.ts ← Like, comment, repost, GET /posts/:id, GET /posts/:id/analytics
│   ├── analytics.routes.ts   ← Full analytics endpoint with period breakdown
│   ├── userProfile.routes.ts ← User profiles, follow/unfollow
│   └── ...
├── feedRanker.ts             ← 6-factor scoring + 3-pool feed generation
├── redis.ts                  ← In-memory LRU + optional Redis + SSE EventPublisher
├── index.ts                  ← Entry point, middleware, background jobs
└── Dockerfile                ← Cloud Run production build
```

---

## Mobile App Structure

```
apps/mobile/src/
├── screens/
│   ├── feed/
│   │   ├── FeedScreen.tsx          ← Main social feed (FlashList)
│   │   ├── PostDetailScreen.tsx    ← Full post view + quiz card + analytics
│   │   ├── CommentsScreen.tsx      ← Real-time comments
│   │   ├── SearchScreen.tsx        ← Search (posts, users, clubs)
│   │   ├── CreatePostScreen.tsx    ← 7 post type creation
│   │   └── NotificationsScreen.tsx
│   ├── school/                     ← School management screens
│   ├── quiz/
│   │   ├── TakeQuizScreen.tsx      ← Quiz taking with timer
│   │   └── LiveQuizScreen.tsx      ← Kahoot-style
│   ├── profile/
│   └── messaging/
├── components/
│   ├── feed/
│   │   ├── PostCard.tsx            ← 7 post type cards, all actions
│   │   ├── PostAnalyticsModal.tsx  ← Gradient header, period toggle, skeleton
│   │   └── StoryViewer.tsx
│   └── common/
├── stores/
│   ├── feedStore.ts     ← All feed state + Supabase subscriptions
│   ├── authStore.ts     ← User session, JWT
│   └── notificationStore.ts
├── services/
│   ├── feedApi.ts       ← HTTP client for feed-service
│   └── mediaService.ts  ← R2 upload/download
└── navigation/
    └── AppNavigator.tsx ← All route definitions
```

### Brand Colors (Never Use Other Blues)
```ts
Primary: '#0EA5E9'   // Sky blue — brand color
Hover:   '#0284C7'   // Darker sky blue for gradients
Text:    '#0369A1'   // Dark sky blue for text links
BG:      '#F0F9FF'   // Sky blue tint background
```
⚠️ Many older components incorrectly use `#0066FF`. Replace with `#0EA5E9` when touching those files.

---

## Web App Structure

```
apps/web/src/
├── app/[locale]/
│   ├── feed/page.tsx      ← Social feed (SSE real-time, 7 post types)
│   ├── dashboard/         ← School admin dashboard
│   ├── students/          ← Student management pages
│   ├── teachers/
│   ├── grades/
│   ├── attendance/
│   ├── timetable/
│   └── profile/
├── components/
│   ├── feed/
│   │   ├── PostCard.tsx         ← Web post card (missing quiz card UI — see Remaining Work)
│   │   ├── PostAnalyticsModal.tsx
│   │   ├── CreatePostModal.tsx  ← Supports: Text, Poll, Announcement, Question, Project
│   │   └── ...
│   └── UnifiedNavigation.tsx
├── hooks/
│   └── useEventStream.ts        ← SSE hook for real-time events
└── lib/
    └── api/                     ← API clients for all services
```

### Web Feature Gaps (vs Mobile)
- Quiz post cards: web shows label badge only, no quiz card with questions/start button
- Repost: web has "share" link, no repost-as-post functionality  
- CreatePostModal: missing QUIZ, COURSE, EXAM post type forms with their special fields
- Comments: inline in PostCard but no Supabase Realtime subscription (no live updates)

---

## Feed System

### How the Feed Algorithm Works
```
GET /posts/feed
  → feedRanker.generateFeed(userId)
    → 3 parallel pools:
        Pool 1 (60%): relevance — posts matching user interests/school
        Pool 2 (25%): trending — high trendingScore posts
        Pool 3 (15%): explore  — diverse/outside network
    → merged + deduplicated
    → 6-factor score computed per post:
        engagement     × 0.25  (likes, comments, shares rate)
        relevance      × 0.25  (tag match, school match)
        quality        × 0.15  (completeness, media, length)
        recency        × 0.15  (exponential decay, half-life = 6h)
        social_proof   × 0.10  (author followers, interaction history)
        learning       × 0.10  (quiz, course, achievement context)
    → sorted by finalScore DESC
    → stripToMinimal() → 76% payload reduction
    → ETag header → 304 if unchanged
```

### Candidate Pool Fix (new posts always appear)
`getCandidates` uses a two-query strategy:
- Query 1: 75 posts with `trendingScore > 0` (established posts)
- Query 2: 25 posts created within last 6 hours (fresh posts, score=0 allowed)
- Merged + deduplicated by ID

This ensures new posts ALWAYS enter the feed even before background scoring runs.

### View Tracking (Batch + Sampled)
- Client batches viewed post IDs for 60 seconds, then calls `POST /feed/track-views`
- Server uses `prisma.postView.createMany({ skipDuplicates: true })` — single bulk insert
- 20% probabilistic sampling on `trendingScore` update to reduce write pressure

### Cache Layers
1. In-memory LRU: 100 feeds, 15-minute TTL (per-user)
2. Redis (optional): same key structure, connect via `REDIS_URL` env var
3. ETag/304: client-side cache using `feedCache.ts` in mobile

---

## Real-time System

### Primary: Supabase Realtime (postgres_changes)
Used for all mobile real-time events:

```ts
// Feed: new posts
supabase.channel('feed-posts')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Post' })
  .subscribe(payload => { /* → pendingPosts → "New Posts" pill */ })

// Comments: per-post
supabase.channel(`comments-${postId}`)
  .on('postgres_changes', { event: 'INSERT', table: 'Comment', filter: `postId=eq.${postId}` })
  .subscribe()

// Notifications: per-user
supabase.channel(`notifications-${userId}`)
  .on('postgres_changes', { event: 'INSERT', table: 'Notification', filter: `recipientId=eq.${userId}` })
  .subscribe()
```

⚠️ **Prisma field names are camelCase in Supabase too** — use `postId`, `recipientId`, `authorId` (NOT `post_id`). No `@map` annotations in schema.

### Secondary: SSE (Server-Sent Events)
Used as a secondary channel from feed-service for events that Supabase doesn't capture:
```
GET /events/stream  → long-lived SSE connection
Events: NEW_POST, NEW_LIKE, NEW_COMMENT, NEW_NOTIFICATION
```
Web app uses `useEventStream` hook to listen to SSE.

### Own-action skip pattern
```ts
// In CommentsScreen subscription handler:
if (payload.new.authorId === user?.id) return; // skip own INSERT (already optimistic)
```
Always skip re-fetch for own-INSERT events to prevent duplicate optimistic state.

---

## State Management

### Zustand Stores (Mobile)
- `feedStore` — all feed state (posts, comments, likes, feed cursor, real-time subs)
- `authStore` — user session, JWT tokens
- `notificationStore` — bell badge count, notification list

### Selector Pattern (Critical for Performance)
```ts
// ❌ BAD — re-renders FeedScreen on ANY store change:
const { posts, isLoading, ... } = useFeedStore();

// ✅ GOOD — each selector only re-renders when that value changes:
const posts = useFeedStore(s => s.posts);
const isLoading = useFeedStore(s => s.isLoading);
const fetchFeed = useFeedStore(s => s.fetchFeed);
```

### Outside Component State Update
```ts
import { feedStore } from '@/stores';  // raw store, NOT the hook
feedStore.setState({ posts: [...] });   // use in callbacks/effects
```

---

## Database & Prisma

### Shared Schema
All services use the same schema at `packages/database/prisma/schema.prisma`. After any change:
```bash
cd packages/database
npx prisma generate       # regenerate client (dev)
npx prisma migrate dev    # apply + generate (dev with migration file)
npx prisma migrate deploy # apply only (production CI)
```

### Key Models
```
User, Post, Comment, Like, Bookmark, Follow, Notification
Quiz, QuizQuestion, QuizAttempt, QuizParticipant
Poll, PollOption, PollVote
School, Student, Teacher, Class, Subject, Grade, Attendance, Timetable
Club, ClubMember, Course, CourseEnrollment, Assignment, Submission
Story, StoryView, UserFeedSignal, PostView
```

### Notification Types (Enum)
```
LIKE, COMMENT, FOLLOW, QUIZ_ATTEMPT, ACHIEVEMENT, MENTION,
BOOKMARK, REPOST (legacy), SHARE (new — repost notification),
GRADE_UPDATE, ATTENDANCE_ALERT, ASSIGNMENT_DUE, SYSTEM
```

### Critical: Production DB Migration Needed
After adding `SHARE` enum value, run once on Supabase production:
```sql
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SHARE';
```

### Performance Rules
- Never call `prisma.model.count()` on large tables without a WHERE with indexed field
- Use `prisma.createMany({ skipDuplicates: true })` for bulk inserts (PostView, etc.)
- Use DB-level aggregates (`_count`, `aggregate`) for analytics — never fetch all rows into Node.js
- Use `Promise.all([query1, query2, query3])` for independent queries — never sequential `await`

---

## Media & Storage

### Cloudflare R2 Setup
- Bucket: configured in `.env` as `CLOUDFLARE_R2_BUCKET`
- Images uploaded via storage-service (multipart) or directly from mobile via presigned URL
- Images served via `CLOUDFLARE_R2_PUBLIC_URL` (set a Cloudflare Worker for CDN caching)

### Image Best Practices
- Always strip to minimal on feed list: `mediaUrls` (all URLs, no `.slice(0,1)` — was a bug, now fixed)
- Use `FastImage` on mobile for caching headers
- R2 egress is free — use it for all static assets

---

## Authentication

### JWT Structure
```json
{
  "id": "user_id",
  "email": "...",
  "role": "STUDENT | TEACHER | ADMIN | PARENT | SUPER_ADMIN",
  "schoolId": "school_id_or_null",
  "iat": ...,
  "exp": ...
}
```

### Claim Code Flow
1. Admin generates claim codes via school-service
2. User enters `STNT-XXXX-XXXX` during registration
3. auth-service validates + assigns `schoolId` + `role` to user

### Feed-Service Auth Middleware
`req.user` is populated from JWT by `services/feed-service/src/middleware/auth.ts`. The middleware type-augments Express `Request` with `{ id, email, role, schoolId }`.

---

## School Management Integration

### How School Data Connects to Social Feed
- `Post.authorSchoolId` → school-scoped feed pool (Pool 1)
- `User.schoolId` → determines which schools' posts appear in relevance pool
- `Post.classId`, `Post.subjectId` → subject/class-scoped announcements

### Grade Service → Notification Flow
1. Teacher submits grade → `grade-service` calls `auth-service/notifications/parent`
2. auth-service creates `Notification` row + fires push to parent device
3. Supabase Realtime delivers to parent's app in real-time

### Attendance Service → Notification Flow
Same pattern: absence/late marked → parent notified via push.

### Planned: School Events → Feed Posts
These bridges are NOT yet implemented but are the next integration milestone:
- Grade published → create a `Notification` record visible in student's bell
- Assignment deadline → create system `Post` reminder in student's school feed
- Attendance streak → create `Achievement` + trigger badge in feed

---

## Deployment

### Google Cloud Run (feed-service)

**Build from monorepo root:**
```bash
docker build -f services/feed-service/Dockerfile -t gcr.io/YOUR_PROJECT/feed-service .
docker push gcr.io/YOUR_PROJECT/feed-service
```

**Required Environment Variables:**
```
NODE_ENV=production
DATABASE_URL=postgresql://...  (Supabase pooler URL)
DIRECT_URL=postgresql://...    (Supabase direct URL for migrations)
JWT_SECRET=<strong-secret>
PORT=8080                      (set by Cloud Run automatically)
ALLOWED_ORIGINS=https://your-domain.com,https://app.your-domain.com
CLOUDFLARE_R2_BUCKET=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_ENDPOINT=...
CLOUDFLARE_R2_PUBLIC_URL=...
DISABLE_BACKGROUND_JOBS=true   (run jobs via Cloud Scheduler instead)
REDIS_URL=redis://...          (optional — Upstash for production)
```

**Cloud Run Configuration:**
- Request timeout: **3600 seconds** (required for SSE long-lived connections)
- Min instances: 0 (free tier) → 1 (when SSE reliability needed)
- Max instances: 10 (start conservative)
- Memory: 512MB minimum

**Background Jobs (when DISABLE_BACKGROUND_JOBS=true):**
Create a Cloud Scheduler job calling `POST /internal/refresh-scores` every 5 minutes.

### Free Tier Scale Limits
| Resource | Free Limit | Hits at |
|----------|-----------|---------|
| Cloud Run | 2M req/month | ~100 DAU |
| Supabase DB | 500MB | ~50K posts |
| Supabase MAU | 50K | Year 1 |
| R2 | 1M Class A ops | ~10K uploads |
| Supabase Realtime | 200 concurrent | ~200 online |

---

## Common Tasks

### Add a new notification type
1. Add to `NotificationType` enum in `packages/database/prisma/schema.prisma`
2. Run `npx prisma generate` from `packages/database/`
3. Run on production DB: `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_TYPE';`
4. Create notification in service: `prisma.notification.create({ data: { type: 'NEW_TYPE', ... } })`

### Add a new post type
1. Add value to `PostType` enum in schema.prisma
2. Add `case 'NEW_TYPE':` in `PostCard.tsx` (mobile) + `PostCard.tsx` (web)
3. Add creation form in `CreatePostScreen.tsx` (mobile) + `CreatePostModal.tsx` (web)
4. Add to feed `stripToMinimal` if it has special fields
5. Add to `feedRanker.ts` `getLearningContextScore` if learning-related

### Debug real-time not working
1. Check Supabase table has Realtime enabled (Dashboard → Database → Replication)
2. Check column filter uses camelCase: `postId=eq.${id}` not `post_id`
3. Check the subscription is created inside a `useEffect` with proper cleanup (`.unsubscribe()`)
4. Check the Supabase client is initialized with the correct `SUPABASE_URL` + `SUPABASE_ANON_KEY`

### Debug feed not showing posts
- New posts may take up to 5 minutes to score (background job). They appear immediately in the "fresh" slot (last 6h, 25 slots).
- Check `trendingScore` in DB: `SELECT id, "trendingScore", "createdAt" FROM "Post" ORDER BY "createdAt" DESC LIMIT 10;`

---

## Troubleshooting

### "Cannot find module @prisma/client"
```bash
cd packages/database && npx prisma generate
```

### Service won't start (port in use)
```bash
./kill-port.sh 3010  # replace with blocked port
```

### FlashList scroll jank on iOS
- Never set `removeClippedSubviews={true}` on iOS — causes Core Animation jank
- Use `removeClippedSubviews={Platform.OS === 'android'}` (already applied in FeedScreen)

### Analytics modal showing wrong brand color
Replace any `#0066FF` → `#0EA5E9` (sky blue). This was a legacy color used before brand finalization.

### TypeScript errors in mockData.ts / NetworkStatus.tsx
These are pre-existing errors unrelated to feed changes. They do not affect runtime. Do not fix unless explicitly tasked.

### Docker build fails (can't find packages/database)
Build context must be monorepo root:
```bash
# ✅ Correct:
docker build -f services/feed-service/Dockerfile -t feed-service .
# ❌ Wrong:
cd services/feed-service && docker build .
```
