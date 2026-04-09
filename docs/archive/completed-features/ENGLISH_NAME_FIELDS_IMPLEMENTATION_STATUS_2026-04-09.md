# Implementation Status: English Name Fields

**Last Verified:** April 9, 2026

## Summary

This work is no longer just a proposal. The core English-name support is already implemented in the database, web app, mobile user profile flow, and the main student and teacher service write paths.

The display convention is now standardized as:

- `English Last Name + English First Name`

This order is applied in profile, student, teacher, attendance, class-member/class-grade views, and feed-facing profile components that render split English-name fields.

The current repo uses `englishFirstName` and `englishLastName` as the primary split fields for:

- `Student`
- `Teacher`
- `User`

The `Parent` model remains untouched by this change, which matches the original intent.

## What Is Implemented

### Database

The Prisma schema already includes:

- `Student.englishFirstName`
- `Student.englishLastName`
- `Teacher.englishFirstName`
- `Teacher.englishLastName`
- `User.englishFirstName`
- `User.englishLastName`

Confirmed in [`packages/database/prisma/schema.prisma`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/packages/database/prisma/schema.prisma).

### Student Service

Student create, update, lightweight list, and search now support the split English name fields.

Confirmed in [`services/student-service/src/index.ts`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services/student-service/src/index.ts).

Notes:

- The service now persists `englishFirstName` and `englishLastName` directly on the `Student` record.
- Request payload validation for student create/update now uses a dedicated Zod schema in [`services/student-service/src/validators/student.validator.ts`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services/student-service/src/validators/student.validator.ts).
- It still keeps a legacy combined `englishName` inside `customFields.regional` for backward compatibility with older readers.

### Teacher Service

Teacher create, update, lightweight list, and search now support the split English name fields.

Confirmed in [`services/teacher-service/src/index.ts`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services/teacher-service/src/index.ts).

Notes:

- The service now persists `englishFirstName` and `englishLastName` directly on the `Teacher` record.
- Request payload validation for teacher create/update now uses a dedicated Zod schema in [`services/teacher-service/src/validators/teacher.validator.ts`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services/teacher-service/src/validators/teacher.validator.ts).
- It still keeps a legacy combined `englishName` inside `customFields.regional` for backward compatibility.

### User Profile Service

User profile read and update flows already support the split English name fields.

Confirmed in [`services/feed-service/src/routes/profile.routes.ts`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services/feed-service/src/routes/profile.routes.ts).

Validation for profile updates now uses a dedicated Zod schema in [`services/feed-service/src/validators/profile.validator.ts`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services/feed-service/src/validators/profile.validator.ts).

### Web App

Implemented on the web side:

- Student create/edit form in [`apps/web/src/components/students/StudentModal.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src/components/students/StudentModal.tsx)
- Teacher create/edit form in [`apps/web/src/components/teachers/TeacherModal.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src/components/teachers/TeacherModal.tsx)
- User profile edit form in [`apps/web/src/app/[locale]/profile/[userId]/edit/page.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src/app/[locale]/profile/[userId]/edit/page.tsx)
- Display usage in student, teacher, attendance, and profile screens such as:
  - [`apps/web/src/app/[locale]/students/page.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src/app/[locale]/students/page.tsx)
  - [`apps/web/src/app/[locale]/teachers/page.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src/app/[locale]/teachers/page.tsx)
  - [`apps/web/src/app/[locale]/attendance/mark/page.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src/app/[locale]/attendance/mark/page.tsx)
  - [`apps/web/src/app/[locale]/profile/[userId]/page.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src/app/[locale]/profile/[userId]/page.tsx)
- Feed display updates for name-order consistency in:
  - [`apps/web/src/components/feed/CreatePostModal.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src/components/feed/CreatePostModal.tsx)
  - [`apps/web/src/components/feed/PostCard.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src/components/feed/PostCard.tsx)
  - [`apps/web/src/components/feed/TopContributorsWidget.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src/components/feed/TopContributorsWidget.tsx)
  - [`apps/web/src/components/feed/TrendingSection.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src/components/feed/TrendingSection.tsx)

### Mobile App

Implemented on mobile today:

- User profile edit form in [`apps/mobile/src/screens/profile/EditProfileScreen.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/profile/EditProfileScreen.tsx)
- User profile display in [`apps/mobile/src/screens/profile/ProfileScreen.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/profile/ProfileScreen.tsx)
- Dedicated student edit screen in [`apps/mobile/src/screens/clubs/EditStudentScreen.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/clubs/EditStudentScreen.tsx)
- Dedicated teacher edit screen in [`apps/mobile/src/screens/clubs/EditTeacherScreen.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/clubs/EditTeacherScreen.tsx)
- Additional display usage in class-related screens such as:
  - [`apps/mobile/src/screens/clubs/ClassMembersScreen.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/clubs/ClassMembersScreen.tsx)
  - [`apps/mobile/src/screens/clubs/ClassAttendanceScreen.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/clubs/ClassAttendanceScreen.tsx)
  - [`apps/mobile/src/screens/clubs/ClassGradesScreen.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/clubs/ClassGradesScreen.tsx)
- Feed/profile display-order updates in:
  - [`apps/mobile/src/screens/feed/FeedScreen.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/feed/FeedScreen.tsx)
  - [`apps/mobile/src/screens/feed/PostDetailScreen.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/feed/PostDetailScreen.tsx)
  - [`apps/mobile/src/screens/feed/CommentsScreen.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/feed/CommentsScreen.tsx)
  - [`apps/mobile/src/screens/feed/SearchScreen.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/feed/SearchScreen.tsx)
  - [`apps/mobile/src/screens/profile/UserCardScreen.tsx`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/src/screens/profile/UserCardScreen.tsx)

## Remaining Gaps

Current known gap:

- Student and teacher flows intentionally still maintain a legacy combined `englishName` value for compatibility with older data readers.

## Verification Run

Verified during the April 9, 2026 audit:

- `npm run --workspace @stunity/student-service build`
- `npm run --workspace @stunity/teacher-service build`
- `npm run --workspace @stunity/class-service build`
- `npm run --workspace feed-service build`
- `npm run build`
- `npx tsc -p apps/mobile/tsconfig.json --noEmit --pretty false`
- `npm run --workspace @stunity/web build`

## Conclusion

The original implementation plan should be treated as completed in broad terms, but the accurate current state is:

- Database: implemented
- Web student/teacher/user flows: implemented
- Mobile user profile flow: implemented
- Mobile student/teacher edit flows: implemented
- English display order (`Last + First`) across targeted web/mobile feed and profile surfaces: implemented
- Zod-based request validation for student/teacher/profile update paths: implemented
- Backward compatibility with legacy combined English name storage: still present by design
