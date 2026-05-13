# Stunity Enterprise Course Management Master Guide

Last verified against the repository on 2026-04-18.

This document is the current-state implementation guide for Stunity's Learn feature. It reflects what is actually present in the codebase today, calls out compatibility layers, and separates shipped behavior from backlog items.

## 1. What Exists Today

Stunity's course system is implemented as a dedicated `learn-service` running on port `3018`, with learner experiences on both web and mobile and instructor tooling on web plus a lighter mobile instructor dashboard.

The current experience supports:

- Hierarchical courses with `Course -> CourseSection -> Lesson`
- Polymorphic lesson payloads for quizzes, assignments, and coding exercises
- Media text tracks for captions, subtitles, and transcripts
- Learner enrollment and per-lesson progress tracking
- Course reviews
- Lesson/course Q&A
- Completion certificates with public verification
- Assignment submission and instructor grading
- Web course creation and web curriculum management
- Mobile draft/publish course creation through a bulk API

## 2. Current Delivery Status

### Fully implemented

- Dedicated `learn-service` with authenticated course APIs
- Prisma schema for hierarchical courses and interactive lesson payloads
- Web learner course detail and lesson viewer
- Mobile learner course detail and lesson viewer
- Quiz delivery on web and mobile
- Assignment submission on web and mobile
- Instructor grading dashboard on web
- Course certificates and public verification
- Direct client upload flow for assignment/curriculum files through presigned URLs
- Course/section/lesson/assignment localization fields with generic locale-key support, plus first-class `en`/`km` authoring shortcuts
- First-class text, document/PDF/file, image, video, audio, quiz, assignment, practice, case-study, and coding exercise lesson types
- Batch reorder endpoints for sections and items
- Course announcements on web and mobile course detail screens
- Learner lesson notes on web and mobile
- Web authoring surfaces now show multilingual translation coverage for supported course languages
- Web learner pages now support course-content language switching independent of the app shell locale

### Implemented with limits

- Web curriculum builder uses `@dnd-kit` and now persists section order and same-section lesson order through existing update endpoints
- Web curriculum builder supports create/delete/reorder, plus lesson metadata editing with localized lesson-resource editing in the modal
- Course creation supports both sectioned courses on web and flat/legacy lesson creation through the mobile bulk-create flow
- Announcements currently live inside the course detail experience rather than a broader instructor communications center
- Lesson notes are editable on web and mobile, but they are still plain text and not yet timestamp-assisted or exportable

### Not fully implemented yet

- Cross-section drag-and-drop movement in the web curriculum builder
- Dedicated nested update endpoints such as `PUT /courses/items/:itemId/quiz`
- Full creator-side rich editing for every lesson payload (quiz/assignment/exercise/content editors) inside the curriculum builder side panel
- Mobile embedded code execution for exercises
- Course announcement notifications/push delivery

## 3. Real Architecture

### Services and routing

- Learn backend: `services/learn-service`
- Web learner/instructor UI: `apps/web`
- Mobile learner/instructor UI: `apps/mobile`
- Database schema: `packages/database/prisma/schema.prisma`

The learn service is mounted with auth on:

- `/courses`
- `/learning-paths`
- `/media`

The certificate verification endpoint is public:

- `GET /certificates/verify/:code`

## 4. Actual Data Model

The real schema is broader than the earlier draft version. The course layer includes marketplace metadata, publishing state, reviews, QA, certificates, and learning-path relations.

### Core models in use

- `Course`
- `CourseSection`
- `Lesson`
- `Enrollment`
- `LessonProgress`
- `CourseReview`
- `CourseQAThread`
- `CourseQAAnswer`
- `CourseCertificate`
- `CourseNote`
- `LessonResource`
- `LessonTextTrack`

### Polymorphic lesson payloads in use

- `CourseQuiz`
- `CourseQuizQuestion`
- `CourseQuizOption`
- `CourseAssignment`
- `AssignmentSubmission`
- `CourseCodingExercise`
- `LessonTextTrack`

### Important schema details

- `Lesson` stores both `courseId` and optional `sectionId`
- Flat lessons without a section are still supported for backward compatibility
- `Course` includes `status`, `isPublished`, `isFree`, `price`, `rating`, `reviewsCount`, `enrolledCount`, `duration`, and `lessonsCount`
- `Course` now also tracks `sourceLocale` and `supportedLocales` so authoring can distinguish the original course language from translated learner-facing languages
- Course locale metadata is no longer capped to `en`/`km` in the learn service; normalized locale tags such as `es`, `fr`, `pt-BR`, `th`, or `zh` are accepted
- `Lesson` includes `description`, `content`, `videoUrl`, `duration`, `isFree`, and `isPublished`
- `LessonResource` now tracks `locale` and `isDefault` so document/file/link resources can be authored per language with a deterministic fallback
- Assignment grading is tied to `passingScore` and can auto-complete the lesson on pass

### Current lesson types in the enum

```prisma
enum CourseItemType {
  VIDEO
  ARTICLE
  DOCUMENT
  PDF
  FILE
  IMAGE
  QUIZ
  ASSIGNMENT
  EXERCISE
  PRACTICE
  CASE_STUDY
  AUDIO
}
```

## 5. Web Surfaces

### Learner-facing routes

- `apps/web/src/app/[locale]/learn/page.tsx`
- `apps/web/src/app/[locale]/learn/course/[id]/page.tsx`
- `apps/web/src/app/[locale]/learn/course/[id]/lesson/[lessonId]/page.tsx`
- `apps/web/src/app/[locale]/learn/course/[id]/submissions/page.tsx`

### Instructor-facing routes

- `apps/web/src/app/[locale]/learn/create/page.tsx`
- `apps/web/src/app/[locale]/instructor/course/[id]/curriculum/page.tsx`

### Actual instructor experience

The instructor tooling is split into two flows:

1. `learn/create`
   Creates a course, creates sections, creates section items, uploads curriculum files, and can publish the course.

2. `instructor/course/[id]/curriculum`
   Manages structure after creation. It currently supports:
   - Dragging sections
   - Dragging lessons within the same section
   - Creating sections
   - Creating items
   - Deleting sections
   - Deleting items

The curriculum page does not yet provide the full "dynamic right-side editor" described in older planning notes.

The create/edit authoring flows now support a source language plus dynamic additional course locales, so multilingual authoring is no longer structurally limited to English and Khmer even though those two still have dedicated fast-entry fields.

### Actual learner lesson shell

The lesson viewer is a dynamic switch driven by `lesson.type` and currently renders:

- `VIDEO` and `AUDIO` -> `VideoPlayer`
- `QUIZ` -> `QuizRunner`
- `ASSIGNMENT` -> assignment submission widget
- `EXERCISE` -> `CodePlayground`
- `ARTICLE` and `CASE_STUDY` -> rich text/article layout
- `Q&A` -> `QAThreadList`
- `My Notes` -> synced learner note editor on web and mobile

Learners on web can also switch the active course content language per course/lesson, which affects localized titles/descriptions/content, transcript selection, and localized lesson resources.

## 6. Mobile Surfaces

Relevant screens live under `apps/mobile/src/screens/learn`.

### Shipped mobile screens

- `LearnScreen`
- `CourseDetailScreen`
- `LessonViewerScreen`
- `CourseQAScreen`
- `CertificateScreen`
- `CreateCourseScreen`
- `instructor/InstructorDashboardScreen`

### Actual mobile behavior

- Quizzes use a custom mobile quiz widget, not `FlashList`
- Assignments support text plus real file attachment uploads via `expo-document-picker`
- Coding exercises are intentionally downgraded to "open on web" guidance
- Certificates use `react-native-confetti-cannon` on the certificate screen
- Q&A is supported through dedicated course/lesson discussion screens
- Course announcements are available on mobile course detail for enrolled learners and instructors
- Instructors can post announcements from mobile and web course detail views

## 7. Learn Service API: Current Contract

These are the routes currently implemented in `services/learn-service/src/routes/courses.routes.ts`.

### Course management

- `GET /courses`
- `GET /courses/learn-hub`
- `POST /courses`
- `POST /courses/bulk`
- `GET /courses/stats/instructor`
- `POST /courses/:courseId/publish`
- `GET /courses/:id`

### Sections

- `GET /courses/:courseId/sections`
- `POST /courses/:courseId/sections`
- `PUT /courses/:courseId/sections/reorder`
- `PUT /courses/sections/:id`
- `DELETE /courses/sections/:id`

### Items

- `POST /courses/sections/:sectionId/items`
- `PUT /courses/:courseId/items/reorder`
- `PUT /courses/items/:id`
- `DELETE /courses/items/:id`

### Enrollment and learning hub

- `POST /courses/:courseId/enroll`
- `GET /courses/my-courses`
- `GET /courses/stats/my-learning`
- `GET /courses/my-created`
- `POST /courses/paths/:pathId/enroll`
- `GET /courses/paths`

### Lessons and progress

- `GET /courses/:courseId/lessons`
- `GET /courses/:courseId/lessons/:lessonId`
- `POST /courses/:courseId/lessons/:lessonId/progress`
- `POST /courses/:courseId/lessons/:lessonId/assignment/submit`
- `GET /courses/:courseId/lessons/:lessonId/submissions`
- `PATCH /courses/submissions/:submissionId/grade`

### Q&A, reviews, and certificates

- `GET /courses/:courseId/qa`
- `POST /courses/:courseId/qa`
- `GET /courses/qa/:threadId`
- `POST /courses/qa/:threadId/answers`
- `GET /courses/:courseId/reviews`
- `POST /courses/:courseId/reviews`
- `GET /courses/:courseId/certificate`
- `GET /certificates/verify/:code`

### Media upload

- `POST /media`

## 8. Important Compatibility Notes

These are easy places for future contributors to get confused:

- The schema supports both sectioned courses and legacy flat lessons
- Web creation is section-first
- Mobile bulk course creation is currently flat-lesson-first
- Learner course detail returns both `sections` and `lessons` for compatibility
- Publishing is course-level; lessons themselves are also individually flaggable with `isPublished`
- Web and mobile Learn requests should pass `locale=en|km`; the backend resolves localized course, section, lesson, and assignment text with fallback to English/default content
- Web and mobile lesson viewers now also resolve localized `LessonResource[]` with fallback order: locale match -> `isDefault` resource(s) -> any available resource

## 9. What I Corrected During Verification

While validating this guide against the repo, the following implementation gaps were fixed:

- Added `POST /courses/bulk` so the mobile create-course flow has a real backend target
- Added `POST /courses/:courseId/publish` so web/mobile publish flows have a real backend target
- Updated item create/update handling so lesson `description` is persisted
- Made the web curriculum builder persist section reorder and same-section lesson reorder
- Enabled real section/item deletion from the web curriculum builder
- Added enum/API/viewer support for `DOCUMENT`, `PDF`, `FILE`, and `IMAGE` lesson items
- Fixed the web course creation item endpoint to use `/courses/sections/:sectionId/items`
- Updated mobile Learn API calls to request the active app language so localized course content is returned
- Added `LessonTextTrack` support for subtitles/captions/transcripts on media lessons
- Added batch reorder endpoints for sections/items and switched the web curriculum builder to use them
- Added localized lesson-resource metadata (`locale`, `isDefault`) plus creator UI and learner fallback rendering for document/text/mixed courses
- Added curriculum-builder lesson modal support for localized lesson-resource editing after course creation
- Added locale-aware transcript selection in web/mobile lesson viewers when multiple transcript languages are present
- Added publish validation for `DOCUMENT`/`PDF`/`FILE` lessons requiring a default localized resource (or legacy file URL fallback)

## 10. Recommended Next Improvements

If we want the implementation to match the original enterprise vision more closely, the next highest-value work is:

1. Add cross-section lesson drag-and-drop persistence
2. Add inline curriculum editing for lesson title, description, content/file URL, media URL, quiz, assignment, and exercise payloads
3. Add note-taking APIs/UI completion for `CourseNote`
4. Add richer publish validation and creator workflow states for `DRAFT -> IN_REVIEW -> PUBLISHED`
5. Add upload-side transcript tooling and caption-management polish for video/audio lessons

## 11. Source Files to Read First

If you are onboarding into this area, start here:

- `packages/database/prisma/schema.prisma`
- `services/learn-service/src/routes/courses.routes.ts`
- `services/learn-service/src/controllers/courses.controller.ts`
- `services/learn-service/src/controllers/lesson.controller.ts`
- `services/learn-service/src/controllers/items.controller.ts`
- `apps/web/src/app/[locale]/learn/create/page.tsx`
- `apps/web/src/app/[locale]/instructor/course/[id]/curriculum/page.tsx`
- `apps/web/src/components/instructor/CurriculumBuilder.tsx`
- `apps/web/src/app/[locale]/learn/course/[id]/lesson/[lessonId]/page.tsx`
- `apps/mobile/src/screens/learn/LessonViewerScreen.tsx`
- `apps/mobile/src/api/learn.ts`
