# Stunity Course / Learn Feature — Complete Documentation

> **Purpose:** Developer reference for the Course & Learn feature.  
> **Scope:** Database schema, backend API, Web frontend, Mobile frontend, UX architecture, and future roadmap.  
> **Audience:** All engineers working on the Stunity platform.

---

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [Current Architecture (As-Built)](#2-current-architecture-as-built)
   - 2.1 [Database Schema](#21-database-schema)
   - 2.2 [Backend APIs](#22-backend-apis)
   - 2.3 [Web Frontend](#23-web-frontend)
   - 2.4 [Mobile Frontend](#24-mobile-frontend)
3. [Gap Analysis vs. Udemy / Coursera](#3-gap-analysis-vs-udemy--coursera)
4. [Architecture Decision: Learner vs. Instructor vs. Admin](#4-architecture-decision-learner-vs-instructor-vs-admin)
5. [Proposed Target Architecture](#5-proposed-target-architecture)
6. [Restructuring Roadmap (Phase Plan)](#6-restructuring-roadmap-phase-plan)
7. [API Surface Reference](#7-api-surface-reference)
8. [Key Decisions Record](#8-key-decisions-record)

---

## 1. Feature Overview

The Course/Learn feature in Stunity is a **platform-wide, global learning community** — completely separate from the School Management side of the product.

**Core Philosophy:**
- **Anyone** who has a Stunity account can become an Instructor and create courses.
- **Anyone** can browse and enroll in courses — regardless of their school affiliation.
- The platform is like an internal Udemy/Coursera embedded inside an education super-app.

**What is already working:**
- Instructors can create courses with sections and lessons ✅
- Students can enroll, track progress, and complete items (lessons/quizzes) ✅
- Learning Paths (curated sequences of courses) exist ✅
- A combined `/learn-hub` API endpoint serves all data in a single round-trip (Unified in Mobile & Web) ✅
- Mobile/Web have full Explore / My Courses / Created / Paths tabs ✅
- Dedicated **Instructor Dashboard** with analytics and growth charts ✅

---

## 2. Current Architecture (As-Built)

### 2.1 Database Schema

**File:** `packages/database/prisma/schema.prisma`

The schema has been upgraded to a **robust 3-level hierarchy**: Course → Section → Item (Polymorphic). This aligns with enterprise standards used by platforms like Udemy and Coursera.

#### Core Models

```
Course
  id, title, description, thumbnail
  category, level (CourseLevel enum)
  duration (hours), lessonsCount (cached)
  price, isFree, isFeatured, isPublished
  instructorId → User
  rating (cached), reviewsCount (cached), enrolledCount (cached)
  tags: String[]
  createdAt, updatedAt
  ↳ lessons: Lesson[]
  ↳ enrollments: Enrollment[]
  ↳ reviews: CourseReview[]
  ↳ pathCourses: LearningPathCourse[]

Lesson
  id, courseId → Course
  title, description, content (markdown/text)
  videoUrl, duration (minutes)
  order, isFree, isPublished
  ↳ resources: LessonResource[]
  ↳ progress: LessonProgress[]

LessonResource
  id, lessonId, title
  type (ResourceType enum: FILE, LINK, VIDEO)
  url, size

Enrollment
  id, userId → User, courseId → Course
  progress (0-100 float)
  enrolledAt, lastAccessedAt, completedAt
  certificateUrl

LessonProgress
  id, userId, lessonId
  completed (boolean), watchTime (seconds)
  completedAt, updatedAt
  ← UNIQUE(userId, lessonId)

CourseReview
  id, userId, courseId
  rating (1-5 int), comment
  isHelpful (upvote count)
  createdAt, updatedAt
  ← UNIQUE(userId, courseId)

LearningPath
  id, title, description, thumbnail
  level, isFeatured, isPublished
  creatorId → User
  totalDuration, coursesCount, enrolledCount
  ↳ courses: LearningPathCourse[]
  ↳ enrollments: PathEnrollment[]

LearningPathCourse
  id, pathId → LearningPath, courseId → Course
  order
  ← UNIQUE(pathId, courseId)

PathEnrollment
  id, userId, pathId
  progress (0-100 float)
  enrolledAt
  ← UNIQUE(userId, pathId)
```

#### Enums Used

```prisma
enum CourseLevel {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  ALL_LEVELS
}

enum ResourceType {
  FILE
  LINK
  VIDEO
}
```

#### Schema Strengths
- Well-indexed for all primary query patterns.
- Cached counters (`enrolledCount`, `lessonsCount`) on the Course model avoid expensive COUNT queries.
- Clean `UNIQUE(userId, courseId)` constraints on Enrollment and Review.
- `LessonProgress` tracks both `completed` status AND `watchTime` for video analytics.

#### Schema Weaknesses (vs. Enterprise Standard)
| Feature | Current | Udemy/Coursera |
|---|---|---|
| Curriculum hierarchy | Course → Lesson (2 levels) | Course → Section → Item (3 levels) |
| Content types per lesson | Only video/text (implicit) | VIDEO, ARTICLE, QUIZ, ASSIGNMENT (typed) |
| Q&A / Discussions | ❌ Not in schema | Per-lesson threaded Q&A |
| Course status | `isPublished: Boolean` only | DRAFT → IN_REVIEW → PUBLISHED workflow |
| Co-instructors | Single `instructorId` | Many-to-many instructor join table |
| Note-taking | ❌ Not in schema | Per-lesson timestamped notes |
| Announcements | ❌ Not in schema | Broadcast from instructor to enrolled students |
| Certificates | `certificateUrl` string only | Generated PDF with course/user metadata |

---

### 2.2 Backend APIs (Learn Service)

The course logic has been extracted into a dedicated **`learn-service`** (Port 3018). This ensures domain isolation and enables independent scaling of learning features.

**File:** `services/learn-service/src/controllers/`

#### Available Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/courses` | Optional | List all published courses (pagination, search, filter) |
| `GET` | `/courses/learn-hub` | Optional | Single-request hub: courses + myCourses + myCreated + paths + stats |
| `GET` | `/courses/instructor/stats` | Required | Instructor analytics: revenue, student growth, course performance |
| `GET` | `/courses/my-courses` | Required | User's enrolled courses with progress |
| `GET` | `/courses/my-created` | Required | Courses created by the current user |
| `GET` | `/courses/:id` | Optional | Course detail with sections, lessons and enrollment state |
| `POST` | `/courses/:id/enroll` | Required | Enroll in a course |
| `POST` | `/courses` | Required | Create a new course |
| `GET` | `/courses/:courseId/sections` | Optional | List sections and items |
| `GET` | `/courses/:courseId/items/:itemId` | Required | Get single lesson/quiz + progress |
| `POST` | `/courses/:courseId/items/:itemId/progress` | Required | Save progress + mark complete |

#### Performance Design: `/learn-hub`
The `/learn-hub` endpoint is a high-performance aggregation endpoint:
- Fires 8 database queries in **parallel** using `Promise.all`.
- Uses `prismaRead` (read replica) for all SELECT queries.
- Two batch follow-up queries resolve N+1s (completed lessons map, enrolled paths set).
- Returns: `{ courses, myCourses, myCreated, paths, stats }` in a single response.

#### Authorization Pattern
- Ownership check: `course.instructorId !== userId && req.user?.role !== 'ADMIN'`
- Access control on lessons: locks `videoUrl` for unenrolled users on non-free lessons.
- Publishing requires at least 1 lesson.

---

### 2.3 Web Frontend

#### Learn Hub Page
**File:** `apps/web/src/app/[locale]/learn/page.tsx` (1,473 lines)

**Tabs:**
- `explore` — Browse all published courses; search + category + level filter
- `my-courses` — Enrolled courses with progress bars
- `curriculum` — School subjects + student grades (integrated with Subject/Grade services)
- `paths` — Learning paths marketplace
- `my-created` — Courses the logged-in user has created

**Notable Implementation Details:**
- Uses a 2-minute `routeDataCache` to prevent redundant refetches on tab switches.
- Falls back to `SAMPLE_COURSES` hardcoded data if the API is unavailable (useful for dev).
- Course cards link to `/${locale}/learn/course/${id}` for detail.
- Resume Learning links to `/${locale}/learn/course/${courseId}/lesson/${lessonId}`.

**Data Flow:**
```
loadAll() → parallel fetch:
  fetchCourses()         → GET /courses
  fetchEnrolledCourses() → GET /courses/my-courses
  fetchCreatedCourses()  → GET /courses/my-created
  fetchLearningPaths()   → GET /learning-paths/paths (wrong URL — bug: should be /courses/paths)
  fetchLearningStats()   → GET /courses/stats/my-learning
  fetchSubjects()        → GET subject-service/subjects
  fetchGrades()          → GET grade-service/grades/student/:id
```

> ⚠️ **Bug:** The web page makes 7 separate API calls on load, while the mobile app makes 1 (`/courses/learn-hub`). The web page should be updated to use `/learn-hub` for the same performance profile.

#### Course Creation Page
**File:** `apps/web/src/app/[locale]/learn/create/page.tsx` (712 lines)

A 4-step wizard:
1. **Basic Info** — Title, Description, Category, Level
2. **Media & Tags** — Thumbnail URL, Tags
3. **Lessons** — Add/remove lessons with title, description, duration, free-preview toggle
4. **Review** — Preview card + validation + Publish / Save Draft buttons

**Limitations:**
- Thumbnail input only accepts a URL string — no actual file upload integration.
- No ability to add video URL per lesson.
- No drag-and-drop reordering of lessons.
- Uses browser `alert()` for success/error — not a toast system.

#### Course Detail Page
**File:** `apps/web/src/app/[locale]/learn/course/[id]/` (directory exists, no files listed — needs investigation)

---

### 2.4 Mobile Frontend

#### Learn Hub Screen
**File:** `apps/mobile/src/screens/learn/LearnScreen.tsx` (1,658 lines)

The main entry point for the Learn feature on mobile. High performance implementation.

**Tabs:**
```
explore  → Filtered course list from API
enrolled → My enrolled courses with progress
created  → My created courses
paths    → Learning paths
```

**Architecture Highlights:**
- Uses `FlashList` (not `ScrollView`) for virtualized performance.
- `getItemType` bucketing prevents wrong-height recycling.
- `overrideItemLayout` pre-computes heights to eliminate scroll jitter.
- All handlers in `handlersRef` to avoid re-renders in `renderItem`.
- Single API call: `learnApi.getLearnHub()` with 30-second in-memory cache.
- `useFocusEffect` + `hasFetched` guard prevents double-fetching during navigation.

**Featured Cards:**
- Top 2 courses by score formula: `isFeatured × 120000 + isNew × 25000 + rating × 1000 + enrolledCount`
- Horizontally scrollable with snap behavior.
- Themed with 3 rotating color palettes.

#### Course Detail Screen
**File:** `apps/mobile/src/screens/learn/CourseDetailScreen.tsx` (828 lines)

Two-tab detail view:
- **Overview tab:** Progress widget, stat grid (Lessons/Completed/Duration/Price), tags
- **Curriculum tab:** Flat lesson list with lock/complete/free indicators

**Smart Navigation:**
- If course is already prefetched (`learnApi.getCachedCourseDetail`), shows data instantly while background-refreshing.
- Floating Action Panel at bottom: **Enroll Now** for visitors, **Continue Learning** for enrolled students.
- `nextLesson` computed: finds first incomplete, unlocked lesson.

#### Create Course Screen
**File:** `apps/mobile/src/screens/learn/CreateCourseScreen.tsx` (804 lines)

Single-page form (no wizard steps on mobile):
- Category chip selector (horizontal scroll)
- Level grid (2×2)
- Lesson cards with title, description, duration, free-preview toggle
- Draft / Publish buttons in header
- Uses `learnApi.bulkCreateCourse()` → single atomic transaction on backend

#### Lesson Viewer Screen
**File:** `apps/mobile/src/screens/learn/LessonViewerScreen.tsx` (17,236 bytes)

The actual lesson consumption screen. Handles video playback and progress tracking.

---

## 3. Gap Analysis vs. Udemy / Coursera

### Feature Parity Scorecard

| Feature | Stunity Now | Udemy | Coursera | Priority |
|---|---|---|---|---|
| Course creation (basic) | ✅ | ✅ | ✅ | — |
| Lesson management | ✅ | ✅ | ✅ | — |
| Enrollment | ✅ | ✅ | ✅ | — |
| Progress tracking | ✅ | ✅ | ✅ | — |
| Learning Paths | ✅ | ✅ | ✅ | — |
| Course reviews/ratings | ✅ schema | ✅ | ✅ | UI needed |
| Search & filter | ✅ | ✅ | ✅ | — |
| **Section / Module hierarchy** | ✅ | ✅ | ✅ | Done |
| **Drag-and-drop curriculum builder** | ✅ | ✅ | ✅ | Done |
| **Typed content (video/article/quiz/assignment)** | ✅ | ✅ | ✅ | Done |
| **Q&A / discussion threads per lesson** | ❌ | ✅ | ✅ | 🔴 High |
| **Instructor analytics dashboard** | ✅ | ✅ | ✅ | Done |
| **Dedicated Instructor Mode / Dashboard** | ✅ | ✅ | ✅ | Done |
| **Course moderation / approval queue** | ❌ | ✅ | ✅ | 🟡 Medium |
| **Note-taking per lesson** | ❌ | ✅ | ✅ | 🟡 Medium |
| **Instructor announcements** | ❌ | ✅ | ✅ | 🟡 Medium |
| **Certificate generation** | ❌ schema stub | ✅ | ✅ | 🟡 Medium |
| **Promotional video** | ❌ | ✅ | ✅ | 🟡 Medium |
| **Co-instructors** | ❌ | ✅ | ✅ | 🟢 Low |
| **Coupon / discount system** | ❌ | ✅ | ❌ | 🟢 Low |
| **Subtitles / captions** | ❌ | ✅ | ✅ | 🟢 Low |
| **Mobile offline download** | ❌ | ✅ | ✅ | 🟢 Low |

---

## 4. Architecture Decision: Learner vs. Instructor vs. Admin

This is the most important UX architecture decision for the course feature.

### The Core Question
> Should the course management (instructor) UI live in the **same screen as the learner UI** (just showing different UI based on ownership), or should it be a **completely separate dashboard/route**?

### How Udemy Does It
Udemy makes a very clear, hard separation:

```
udemy.com/          → Learner experience (Browse, My Learning, Wishlist)
udemy.com/instructor/ → Instructor Studio (completely separate layout, navigation, branding)
```

When you click "Instructor" in the header dropdown, the entire layout changes. The standard learner navigation disappears. You see a completely different sidebar with: Courses, Communication, Performance, Tools.

### How Coursera Does It
Coursera also separates contexts, but calls it **"Coursera for Instructors"** and separates it even at the subdomain level for enterprise. Individual creators use a separate "Your Content" portal.

### Our Recommendation for Stunity

**We should follow the Udemy model with a context-switch approach:**

```
LEARNER CONTEXT  →  Route: /[locale]/learn
                     Nav:   Standard Stunity nav (Feed, Clubs, Events, Learn)
                     View:  Marketplace browsing, My Courses, Learning Paths

INSTRUCTOR CONTEXT → Route: /[locale]/instructor
                     Nav:   Instructor sidebar (My Courses, Curriculum Builder, Analytics, Communications)
                     View:  Course management, student management, performance data
```

**The Context Switch UI:**
- In the main top navbar (web) or sidebar (mobile), add a **"Teach"** or **"Instructor Dashboard"** button.
- Clicking it navigates to `/instructor` with a completely different layout.
- Inside `/instructor`, a persistent **"← Back to Learning"** button returns to `/learn`.
- On Mobile, "Instructor Mode" lives as a menu item in the slide-out sidebar.

**Why NOT the "same page, different UI" approach:**
1. It creates messy conditional rendering — the instructor's toolset (analytics, curriculum builder) is fundamentally different from the learner's toolset.
2. Instructors think differently from learners. Mixing the UX confuses both audiences.
3. As the feature grows, the "same page" approach becomes unmaintainable.
4. Enterprise platforms (Udemy, Coursera, Teachable, Thinkific) **all** separate these contexts.

### Role Levels in Course Management

```
SUPER_ADMIN
  → Can view/edit/delete any course
  → Moderates the course marketplace (approve/reject submissions)
  → Views platform-wide analytics
  → Can feature/unfeature courses

INSTRUCTOR (any authenticated user who has created a course)
  → Full control over their own courses only
  → Access to /instructor dashboard
  → Sees: enrollment counts, student progress, Q&A, announcements
  → Cannot see other instructors' private data

LEARNER (any authenticated user)
  → Can browse and enroll in published courses
  → Tracks their own progress
  → Can submit reviews and Q&A questions

STUDENT (school-linked user)
  → Same as Learner PLUS access to school Curriculum tab
  → Can see their grades from school subjects integrated in the Learn page
```

---

## 5. Proposed Target Architecture

### 5.1 New Route Structure (Web)

```
/[locale]/learn                    → Learner Marketplace hub (existing, keep)
/[locale]/learn/course/[id]        → Course detail / enrollment / player (existing, enhance)
/[locale]/learn/course/[id]/lesson/[lessonId] → Lesson player with sidebar nav

/[locale]/instructor               → Instructor Dashboard home (NEW)
/[locale]/instructor/courses       → List of instructor's courses
/[locale]/instructor/courses/new   → Create course (move from /learn/create)
/[locale]/instructor/courses/[id]  → Edit course overview
/[locale]/instructor/courses/[id]/curriculum → Drag-and-drop curriculum builder (NEW)
/[locale]/instructor/courses/[id]/students   → Enrolled students list (NEW)
/[locale]/instructor/courses/[id]/analytics  → Performance charts (NEW)
/[locale]/instructor/courses/[id]/qa         → Q&A moderation (NEW)
/[locale]/instructor/courses/[id]/announcements → Send announcements (NEW)

/[locale]/admin/courses            → Super admin moderation queue (NEW)
/[locale]/admin/courses/[id]/review → Approve/reject a submitted course (NEW)
```

### 5.2 New Screen Structure (Mobile)

```
LearnHub (existing, enhance)
  Tabs: Explore | My Courses | Paths

Instructor Mode (accessible from sidebar)
  MyCoursesScreen (list of created courses)
  CourseEditorScreen (edit overview of one course)
  CurriculumScreen (add/reorder sections + lessons)
  CourseAnalyticsScreen (enrollments, completion, ratings)
  CourseQAScreen (reply to student questions)
```

### 5.3 Database Schema Additions Needed

```prisma
// NEW: Sections/Modules within a course
model CourseSection {
  id          String       @id @default(cuid())
  courseId    String
  title       String
  description String?
  order       Int
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  course      Course       @relation(fields: [courseId], references: [id], onDelete: Cascade)
  items       CourseItem[]

  @@index([courseId])
  @@map("course_sections")
}

// NEW: Generic content item within a section
model CourseItem {
  id          String           @id @default(cuid())
  sectionId   String
  type        CourseItemType   // VIDEO | ARTICLE | QUIZ | ASSIGNMENT
  title       String
  description String?
  content     String?          // Markdown for articles
  videoUrl    String?
  duration    Int              @default(0)
  order       Int
  isFree      Boolean          @default(false)
  isPublished Boolean          @default(true)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  section     CourseSection    @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  resources   CourseItemResource[]
  progress    CourseItemProgress[]
  qaThreads   CourseQAThread[]

  @@index([sectionId])
  @@map("course_items")
}

enum CourseItemType {
  VIDEO
  ARTICLE
  QUIZ
  ASSIGNMENT
}

// NEW: Q&A threads per course item
model CourseQAThread {
  id        String          @id @default(cuid())
  courseId  String
  itemId    String?         // Optional: tied to a specific lesson
  userId    String
  title     String
  body      String
  isResolved Boolean        @default(false)
  upvotes   Int             @default(0)
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt
  answers   CourseQAAnswer[]

  @@index([courseId])
  @@map("course_qa_threads")
}

model CourseQAAnswer {
  id        String         @id @default(cuid())
  threadId  String
  userId    String
  body      String
  isInstructor Boolean     @default(false)
  upvotes   Int            @default(0)
  createdAt DateTime       @default(now())
  thread    CourseQAThread @relation(fields: [threadId], references: [id], onDelete: Cascade)

  @@index([threadId])
  @@map("course_qa_answers")
}

// NEW: Course status for moderation workflow
// Add to Course model:
//   status CourseStatus @default(DRAFT)
enum CourseStatus {
  DRAFT
  IN_REVIEW
  PUBLISHED
  REJECTED
  ARCHIVED
}

// NEW: Instructor announcements
model CourseAnnouncement {
  id        String   @id @default(cuid())
  courseId  String
  authorId  String
  title     String
  body      String
  sentAt    DateTime @default(now())

  @@index([courseId])
  @@map("course_announcements")
}

// NEW: Learner notes per item
model CourseNote {
  id        String   @id @default(cuid())
  userId    String
  itemId    String
  content   String
  timestamp Int?     // video timestamp in seconds
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, itemId])
  @@map("course_notes")
}
```

### 5.4 New Backend Service

Extract course logic from `feed-service` into a dedicated `learn-service`:

```
services/learn-service/
  src/
    index.ts            → Express app, middleware, route mounting
    context.ts          → Prisma client
    routes/
      courses.routes.ts    → Course CRUD
      sections.routes.ts   → Section management
      items.routes.ts      → Course item management
      enrollment.routes.ts → Enroll, progress, certificates
      qa.routes.ts         → Q&A threads and answers
      analytics.routes.ts  → Instructor performance data
      paths.routes.ts      → Learning paths
    services/
      progress.service.ts  → Progress calculation logic
      certificate.service.ts → PDF certificate generation
    middleware/
      auth.middleware.ts
      courseOwner.middleware.ts
```

---

## 6. Restructuring Roadmap (Phase Plan)

### Phase 1 — Foundation (Sprint 1-2)
**Goal:** Fix immediate issues without breaking anything.

- [ ] Fix web page to use `/courses/learn-hub` instead of 7 separate API calls
- [ ] Fix broken URL in web page: `learning-paths/paths` → `courses/paths`
- [ ] Add Course Detail page to web (`/learn/course/[id]/page.tsx`) — currently appears to be missing
- [ ] Replace browser `alert()` in course creation with toast notifications
- [ ] Add file upload support for course thumbnails (integrate with storage-service)

### Phase 2 — Instructor Mode (Sprint 3-4)
**Goal:** Separate instructor and learner contexts.

- [ ] Create `/instructor` layout with dedicated sidebar navigation (Web)
- [ ] Move course creation to `/instructor/courses/new`
- [ ] Add "Teach" button in the top nav that switches to instructor context
- [ ] Build `Instructor Dashboard` home screen (web) with course list + stats summary
- [ ] Add Instructor Mode to mobile sidebar

### Phase 3 — Schema & Curriculum Builder (Sprint 5-6)
**Goal:** Upgrade to 3-level hierarchy.

- [ ] Write Prisma migration: add `CourseSection`, `CourseItem`, `CourseQAThread`, `CourseQAAnswer`, `CourseNote`, `CourseAnnouncement`
- [ ] Migrate existing `Lesson` data: create a "Default Section" per course, move lessons to `CourseItem`
- [ ] Build drag-and-drop Curriculum Builder (web) using `@dnd-kit/core`
- [ ] Update mobile `CourseDetailScreen` to render Sections → Items hierarchy
- [ ] Update `LessonViewerScreen` to handle different `CourseItemType` rendering

### Phase 4 — Microservice Extraction (Sprint 7-8)
**Goal:** Correct the architectural violation.

- [ ] Bootstrap `services/learn-service` with full route surface
- [ ] Mirror all existing course endpoints from `feed-service` into `learn-service`
- [ ] Update API gateway / env vars in all frontends to point to `learn-service`
- [ ] Smoke test all frontends, then remove course code from `feed-service`

### Phase 5 — Q&A, Analytics, Certificates (Sprint 9-10)
**Goal:** Match enterprise MOOC feature set.

- [ ] Build Q&A UI (web lesson player + mobile lesson viewer)
- [ ] Build Instructor Analytics dashboard (enrollment trends, completion rates, ratings chart)
- [ ] Implement certificate generation service (PDF with course data, QR code for verification)
- [ ] Build admin course moderation queue in super-admin panel

---

## 7. API Surface Reference

### Current API Base URL
All course endpoints currently served at:  
`FEED_SERVICE_URL/courses` (e.g., `http://localhost:3010/courses`)

### Request/Response Examples

#### GET /courses/learn-hub
Returns a single compound response for the Learn Hub.

**Response:**
```json
{
  "courses": [...],        // Published courses (marketplace)
  "myCourses": [...],      // User's enrolled courses with progress
  "myCreated": [...],      // Courses created by the user
  "paths": [...],          // Published learning paths
  "stats": {
    "enrolledCourses": 3,
    "completedCourses": 1,
    "completedLessons": 42,
    "hoursLearned": 12,
    "currentStreak": 5,
    "totalPoints": 280,
    "level": 3
  }
}
```

#### POST /courses/bulk
Atomically create a course with all lessons.

**Request:**
```json
{
  "title": "Course Title",
  "description": "...",
  "category": "Programming",
  "level": "BEGINNER",
  "thumbnail": "https://...",
  "tags": ["python", "beginner"],
  "lessons": [
    {
      "title": "Lesson 1",
      "description": "...",
      "duration": 10,
      "isFree": true,
      "content": "...",
      "videoUrl": "https://..."
    }
  ],
  "publish": false
}
```

#### POST /courses/:courseId/lessons/:lessonId/progress
Save lesson watch progress and mark complete.

**Request:**
```json
{
  "completed": true,
  "watchTime": 540
}
```

**Response:**
```json
{
  "courseProgress": 45.5,
  "completedLessons": 5,
  "totalLessons": 11
}
```

---

## 8. Key Decisions Record

| # | Decision | Rationale | Date |
|---|---|---|---|
| 1 | Course feature is **global** (not school-scoped) | Enables cross-school knowledge sharing; any user can teach or learn | Architecture design |
| 2 | **Anyone** can create courses (no special role required) | Democratizes knowledge; lowers barrier to becoming an instructor | Open platform policy |
| 3 | Use **dedicated Instructor Dashboard** (`/instructor`) separate from Learner Hub (`/learn`) | Industry standard (Udemy/Coursera model); cleaner UX; scalable separation of concerns | Architecture decision |
| 4 | Course APIs will eventually move to a dedicated **`learn-service`** | Decouples learning domain from social/feed domain; enables independent scaling | Technical debt |
| 5 | Mobile uses `/courses/learn-hub` (1 request); Web uses separate calls | Discovered during audit; web must be updated to match mobile pattern | Bug/improvement |
| 6 | Current flat schema (Course → Lesson) is **v1 acceptable** | Migration to Section → Item hierarchy is planned but not blocking launch | Schema evolution |

---

> **Last Updated:** April 2026  
> **Maintained by:** Engineering Team  
> **Related Docs:** `COURSE_ARCHITECTURE.md`, `SYSTEM_FLEXIBILITY_AND_ONBOARDING.md`
