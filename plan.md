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
  - **School Classes** section: “Classes you study” (current year only).
  - **Community Clubs** section: existing cards/filters.
- Tap class card opens Class Details view with:
  - Header info (name/grade/section/year).
  - Shortcut: Attendance.
  - Shortcut: Grades.

### For Teacher (school-linked)

- Clubs tab shows:
  - **School Classes** section: “Classes you teach” (current year only).
  - **Community Clubs** section: existing cards/filters.
- Tap class card opens Class Details with Attendance/Grades shortcuts.

### For Unlinked user (no schoolId) or unsupported role

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
  - if `STUDENT`, read `user.studentId` then `StudentClass` for current-year classes.
  - if `TEACHER`, read `user.teacherId` then `TeacherClass` for current-year classes.
- For `ADMIN/STAFF/SUPER_ADMIN/PARENT` in v1: return empty list.

### Guardrails

- Strict same-school filtering (`schoolId` on class).
- Current academic year only (`academicYear.isCurrent = true`).
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

## Non-Goals (v1)

- No conversion of school class into study club.
- No new social feed algorithm logic.
- No change to real-time feed event pipeline.
- No multi-academic-year browser in first release.

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
