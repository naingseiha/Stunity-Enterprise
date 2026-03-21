## Clubs + School Classes Integration Plan (Full Feature Spec)

## Goal

Make the mobile **Clubs** tab represent both systems clearly and correctly:

- **School-management classes** for users linked to a school by claim code.
- **Community/user-created clubs** for social learning.

This must preserve existing feed algorithm behavior and real-time reliability.

## Confirmed Product Decisions

1. School Classes default scope: **Current academic year only**.
2. Class card tap action (v1): **Open class details with shortcuts**.
3. Shortcuts required in class details: **Attendance** + **Grades** entry points.
4. Community Clubs behavior remains intact (`all`, `joined`, `discover`, create, join, leave).

## Current Verified Reality

1. `StudyClub` and school `Class` are separate entities today (no direct mapping table).
2. Clubs mobile screen currently consumes only `/clubs` and has no class feed.
3. Class-service already has tenant-safe `schoolId` filtering and class relationships:
   - `StudentClass` for student enrollment.
   - `TeacherClass` for teacher teaching assignments.
4. Mobile config currently has `clubUrl`, `studentUrl`, `gradeUrl`, `attendanceUrl`, but no `classUrl`.

## Target UX (After Implementation)

### For Student (school-linked)

- Clubs tab shows:
  - **School Classes** section: “Classes you study” (current year default, with option to view past years).
  - **Community Clubs** section: existing cards/filters.
- Tap class card opens Class Details view with:
  - Header info (name/grade/section/year).
  - Shortcut: Attendance.
  - Shortcut: Grades.
  - **New:** Class Announcements/Feed (strictly isolated from the public community feed).
  - **New:** Materials/Resources Hub (persistent storage for syllabus, PDFs, links).
  - **New:** Assignment Tracker with statuses (To Do, Pending, Graded) and deep-links to specific Quizzes/Courses.
  - **New:** Members List.

### For Teacher (school-linked)

- Clubs tab shows:
  - **School Classes** section: “Classes you teach” (current year default, with option to view past years).
  - **Community Clubs** section: existing cards/filters.
- Tap class card opens Class Details with actionable Attendance/Grades shortcuts, Class Announcements to broadcast updates (strictly isolated), Assignment management (with status tracking and deep-links to quizzes/courses), and a Materials/Resources Hub.

### For Parent (school-linked)

- Clubs tab shows:
  - **School Classes** section: "Your child's classes" (current year default).
  - **Community Clubs** section: existing cards/filters.
- Tap class card opens Class Details with:
  - Header info.
  - Read-only shortcuts for Attendance, Grades, and Assignments/Announcements.
  - **New:** Secure "Message Teacher" deep-link for direct, in-app communication.

### For Admin/Staff (school-linked)

- Clubs tab shows:
  - **School Classes** section: Searchable directory of all classes in the school.
- Full read-only or override access to class details.

### For Unlinked user (no schoolId)

- Clubs tab remains clubs-only (current experience).
- No School Classes lane shown.

## Backend Plan (Class Service)

### New endpoint

- `GET /classes/my`

### Input / auth

- Uses JWT from existing class-service auth middleware:
  - `req.user.userId`
  - `req.user.role`
  - `req.user.schoolId`

### Output (normalized)

- Returns array of summaries:
  - `id`
  - `name`
  - `grade`
  - `section`
  - `academicYear: { id, name, isCurrent }`
  - `studentCount` (active students)
  - `myRole` (`STUDENT` | `TEACHER`)
  - `isHomeroom` (teacher only)

### Role resolution

- Resolve linked profile from `User`:
  - if `STUDENT`, read `user.studentId` then `StudentClass` (default to current year, enable past year queries).
  - if `TEACHER`, read `user.teacherId` then `TeacherClass` (default to current year, enable past year queries).
  - if `PARENT`, read linked children's `studentId` then fetch their `StudentClass` records.
  - if `ADMIN/STAFF/SUPER_ADMIN`, enable viewing and searching all classes within the `schoolId`.

### Guardrails & Multi-Tenant Architecture

- **Strict Same-School Filtering (`schoolId`)**: Every query, fetch, and action is strictly scoped to the `req.user.schoolId`. Data from one school cannot bleed into another.
- **Multi-School Support**: If a user is registered to multiple schools (e.g., teaching at two campuses, or a parent with kids in different schools), the mobile client will support context-switching to ensure feeds and classes strictly match the selected active school profile.
- **Multi-Academic Year Handling**: 
  - API defaults to `academicYear.isCurrent = true` for active operations.
  - A year-selector will allow historical queries. Past academic years will automatically enter a read-only mode to prevent accidental edits to archived grades/attendance.
- Empty list for missing links (no `studentId`/`teacherId`), not hard error.

## Mobile Plan

### API layer

1. Add `classUrl` in `apps/mobile/src/config/env.ts`:
   - dev: `http://${API_HOST}:3005`
   - staging: staging class-service domain
   - production: cloud run class-service URL
2. Add `classApi` in `apps/mobile/src/api/client.ts`.
3. Add `apps/mobile/src/api/classes.ts`:
   - `getMyClasses({ force?: boolean })`
   - 30s in-memory cache + invalidation helper.

### Screen integration

1. Update `ClubsScreen.tsx`:
   - Load class data in parallel with clubs data.
   - Render School Classes section above Community Clubs when available.
   - Keep existing club pagination and filters unchanged.
2. Add class card UI + empty state for linked users with no classes.
3. Add new Class Details screen in Clubs stack:
   - Display class summary + shortcut tiles.
   - Shortcut routes:
     - Attendance -> existing attendance flow.
     - Grades -> existing academic/grades flow (`AcademicProfile` in v1 until dedicated class-grade screen is introduced).

### Navigation/types

- Extend clubs navigation types for:
  - `ClassDetails` screen.
- Wire route in `MainNavigator` clubs stack.

## Strict Design Constraints

- No conversion of school class into study club.
- **Data Isolation:** Class announcements, assignments, and discussions remain STRICTLY internal to the class and will NOT appear in the main/public community feed. The public feed is for sharing public knowledge, whereas class features are specific only to the school.
- No change to real-time feed event pipeline for the community feed.

## Verification Plan

1. Build/type checks:
   - `services/class-service`: `npm run build`
   - `apps/mobile`: `npx tsc -p apps/mobile/tsconfig.json --noEmit --pretty false`
2. Functional checks:
   - Student linked account sees only own current-year classes.
   - Teacher linked account sees taught current-year classes.
   - Unlinked user sees only community clubs.
   - Club create/join/leave/discover still works.
3. Regression checks:
   - Feed ranking/scoring untouched.
   - Feed real-time publish paths untouched.

## Implementation Todo Mapping (SQL)

- `clubs-classes-api` → backend endpoint + role-safe class resolution.
- `mobile-class-api-client` → config + client + classes API cache.
- `clubs-screen-dual-section` → UI integration + class details + shortcuts.
- `clubs-regression-verify` → build/type-check + smoke regression.

## Previously Completed (Context)

- Feed visibility/tenancy hardening.
- `CLASS` visibility validator alignment.
- Mobile school/social notification routing improvements.
- Verified feed algorithm and real-time hooks remained intact.

## Implementation Update (Completed)

### 1) Clubs + School Classes integration shipped

- Added backend endpoint: `GET /classes/my` in `services/class-service/src/index.ts`.
- Added mobile class API wiring:
  - `apps/mobile/src/config/env.ts` (class/teacher/timetable URLs)
  - `apps/mobile/src/api/client.ts` + `apps/mobile/src/api/index.ts`
  - New `apps/mobile/src/api/classes.ts`
- Added class details experience:
  - New `apps/mobile/src/screens/clubs/ClassDetailsScreen.tsx`
  - Navigation wiring in `apps/mobile/src/navigation/types.ts` and `apps/mobile/src/navigation/MainNavigator.tsx`
  - `apps/mobile/src/screens/clubs/index.ts` export
- Updated `apps/mobile/src/screens/clubs/ClubsScreen.tsx`:
  - School-linked student/teacher sees **School Classes** + **Community Clubs**
  - Non-school users remain clubs-only

### 2) Feed “only 1 event” regression fixed safely

- Root cause: personalized candidate generation was too sparse for low-volume datasets due to recent-window constraints.
- Fix in `services/feed-service/src/feedRanker.ts`:
  - Keep current ranking behavior
  - Backfill older visible posts when recent candidates are insufficient
  - Preserve visibility/tenancy constraints

### 3) Realtime reliability hardening

- User reported realtime silence despite `SUBSCRIBED`.
- Added resilient fallback in `apps/mobile/src/stores/feedStore.ts`:
  - If no events after 30s, start safe polling of `/posts/feed?mode=RECENT`
  - Deduplicate and push new items to `pendingPosts` (“New Posts” pill)
  - Auto-stop fallback when realtime events resume
  - Cleanup timers/subscriptions on unsubscribe/reset

## Verification Completed

- `npm run -w services/feed-service build` ✅
- `npx tsc -p apps/mobile/tsconfig.json --noEmit --pretty false` ✅

### 4) Enterprise Class Hub Expansion (Shipped)
- Redesigned `ClassDetailsScreen.tsx` into an immersive Enterprise Dashboard.
- Introduced a dynamic Hero Card for immediate class context.
- Implemented an 8-item Bento-Box Shortcut Grid for instant navigation to: Announcements, Assignments, Materials, Attendance, Scores, Quizzes, Members, and Messaging.
- Built dedicated, deep-navigable stack screens for Class Announcements, Assignments, Materials, and Members.
- Upgraded the `class-service` `GET /classes/my` endpoint to successfully resolve teacher classes strictly via `homeroomTeacherId`, `TeacherClass` pivots, and deep `TimetableEntry` relations.
- Verified tight `schoolId` and active `academicYearId` scoping across all new endpoints to guarantee multi-tenant data isolation.

### 5) Score Import & Management Tools (Shipped)
- Implemented a complete `ClassGradesScreen.tsx` for teachers to import and save student scores in batch.
- **Score Import UI & Validation**:
  - Introduced a polished UI with student avatars, real-time rank badging, and dynamic visual states for active/saved input fields.
  - Implemented strict frontend validation limiting inputs to positive numbers and automatically capping at `subject.maxScore`.
  - Upgraded month picker to support strict academic calendar months synced with `grade-service`.
- **Teacher Tools**:
  - Added creation modals and "Floating Action Buttons" (FAB) restricted to the `TEACHER` role across `ClassAnnouncementsScreen`, `ClassMaterialsScreen`, and `ClassAssignmentsScreen`.
  - Integrated `POST` endpoints inside `classHubStore` and `classHubApi` to orchestrate new content creation seamlessly.
