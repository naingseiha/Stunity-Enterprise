# Recent Improvements - February 2026

This document summarizes the recent improvements made to the Stunity Enterprise platform.

---

## 1. Timetable System Enhancements

### 1.1 Saturday Support (6-Day Week)

Added full support for Saturday scheduling to accommodate Cambodian school schedules.

**Changes Made:**
- **Frontend** (`apps/web/src/app/[locale]/timetable/page.tsx`):
  - Updated days array from 5 to 6 days (Monday-Saturday)
  - Grid layout now displays Saturday column
  
- **Backend** (`services/timetable-service/src/index.ts`):
  - Updated slot calculations from `periods * 5` to `periods * 6`
  - Auto-assign algorithm now considers Saturday slots
  - Teacher availability checks include Saturday

### 1.2 Copy Class Timetable Feature

New endpoint and UI to copy an entire timetable from one class to another.

**API Endpoint:**
```
POST /timetable/copy-class
Body: {
  sourceClassId: string,
  targetClassId: string,
  academicYearId?: string
}
```

**Features:**
- Copies all timetable entries from source to target class
- Automatic conflict detection for teacher double-booking
- Skips entries that would cause conflicts (reports skipped count)
- Returns detailed results with entries copied and skipped

**Frontend:**
- "Copy Timetable" button in timetable page header
- Modal dialog to select source and target classes
- Success/error feedback with skipped entries count

### 1.3 Clear Class Timetable Feature

New endpoint and UI to clear all timetable entries for a class.

**API Endpoint:**
```
DELETE /timetable/clear-class/:classId?academicYearId=xxx
```

**Features:**
- Removes all timetable entries for specified class
- Optional academic year filter
- Returns count of deleted entries

**Frontend:**
- "Clear Timetable" button with confirmation dialog
- Prevents accidental data loss with user confirmation

### 1.4 Bug Fixes

- **TeacherSubjectAssignment Query**: Fixed filtering by schoolId (was querying wrong field)
- **Teacher Name Fields**: Removed invalid `firstNameLatin`/`lastNameLatin` fields (not in schema)
- **Slot Calculations**: Fixed multiple places using 5-day instead of 6-day calculations

---

## 2. Performance Optimizations

### 2.1 Loading States (Instant Feedback)

Added `loading.tsx` files to provide immediate visual feedback during navigation.

**Pages with Loading States:**
| Page | Type | Location |
|------|------|----------|
| Dashboard | dashboard | `/dashboard/loading.tsx` |
| Students | table | `/students/loading.tsx` |
| Teachers | table | `/teachers/loading.tsx` |
| Classes | cards | `/classes/loading.tsx` |
| Timetable | table | `/timetable/loading.tsx` |
| Grade Entry | form | `/grades/entry/loading.tsx` |
| Grade Reports | cards | `/grades/reports/loading.tsx` |
| Attendance | table | `/attendance/mark/loading.tsx` |
| Academic Years | table | `/settings/academic-years/loading.tsx` |
| Subjects | table | `/settings/subjects/loading.tsx` |
| Promotion | form | `/settings/promotion/loading.tsx` |
| Feed | cards | `/feed/loading.tsx` |
| Onboarding | form | `/onboarding/loading.tsx` |

**Benefits:**
- Users see skeleton loaders immediately when clicking navigation
- No more "frozen" UI during page transitions
- Consistent loading experience across all pages

### 2.2 Link Prefetching

Replaced `router.push()` with Next.js `<Link>` component for client-side navigation with prefetching.

**Components Updated:**
- `UnifiedNavigation.tsx`:
  - Main navigation items (Feed, School, Learn)
  - School sidebar menu items (12 links)
  - Mobile navigation menu
  - Profile dropdown links

- `ActionCard.tsx`:
  - Quick action cards on dashboard now use Link

**Benefits:**
- **Prefetching**: Pages pre-download when links become visible
- **Client-side Navigation**: No full page reload
- **Faster Perceived Performance**: Pages feel instant
- **Better Caching**: Shared layouts stay mounted

### 2.3 Before vs After

| Metric | Before | After |
|--------|--------|-------|
| Navigation Click | Blank screen → Load | Skeleton → Content |
| Page Transition | Full reload | Client-side swap |
| Prefetching | None | Automatic on hover/visible |
| User Feedback | Delayed | Immediate |

---

## 3. Files Changed

### Timetable Improvements
```
services/timetable-service/src/index.ts
apps/web/src/app/[locale]/timetable/page.tsx
apps/web/src/lib/api/timetable.ts
docs/TIMETABLE_SYSTEM.md
```

### Performance Optimizations
```
apps/web/src/components/UnifiedNavigation.tsx
apps/web/src/components/dashboard/ActionCard.tsx
apps/web/src/app/[locale]/dashboard/loading.tsx (new)
apps/web/src/app/[locale]/students/loading.tsx (new)
apps/web/src/app/[locale]/teachers/loading.tsx (new)
apps/web/src/app/[locale]/classes/loading.tsx (new)
apps/web/src/app/[locale]/timetable/loading.tsx (new)
apps/web/src/app/[locale]/grades/entry/loading.tsx (new)
apps/web/src/app/[locale]/grades/reports/loading.tsx (new)
apps/web/src/app/[locale]/attendance/mark/loading.tsx (new)
apps/web/src/app/[locale]/settings/academic-years/loading.tsx (new)
apps/web/src/app/[locale]/settings/subjects/loading.tsx (new)
apps/web/src/app/[locale]/settings/promotion/loading.tsx (new)
apps/web/src/app/[locale]/feed/loading.tsx (new)
apps/web/src/app/[locale]/onboarding/loading.tsx (new)
```

---

## 4. Git Commits

1. **feat(timetable): Add Saturday support, copy/clear functionality, and bug fixes**
   - Commit: `0f3121b`
   
2. **perf: Optimize page loading speed with loading states and Link prefetching**
   - Commit: `6169419`

---

## 5. Testing Checklist

### Timetable Features
- [ ] Verify Saturday column appears in timetable grid
- [ ] Test Copy Timetable: select source/target classes
- [ ] Verify conflict detection when copying (teacher double-booking)
- [ ] Test Clear Timetable with confirmation dialog
- [ ] Verify timetable entries are properly deleted

### Performance
- [ ] Click sidebar links - should see skeleton immediately
- [ ] Navigation should feel faster/smoother
- [ ] No blank screens during page transitions
- [ ] Hover over links - check Network tab for prefetch requests

---

## 6. Known Issues

### Pre-existing TypeScript Errors
The following TypeScript errors existed before these changes and are unrelated:
- `clearAccessToken` method naming inconsistency
- `schoolId` property access patterns
- Various type mismatches in settings pages

These should be addressed in a separate cleanup task.

---

*Last Updated: February 1, 2026*
