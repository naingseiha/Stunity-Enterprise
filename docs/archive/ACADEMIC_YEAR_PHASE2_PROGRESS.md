# 🚀 Phase 2: Year Selector & Data Scoping - IN PROGRESS

**Date:** January 30, 2026  
**Status:** 🚧 Implementation Started

---

## ✅ What's Been Completed

### 1. Academic Year Context (Already Existed ✅)
- **File:** `/contexts/AcademicYearContext.tsx`
- Provides: `currentYear`, `selectedYear`, `allYears`, `setSelectedYear`, `loading`
- Persists selection in localStorage
- Auto-loads on app start

### 2. New Year Selector Component (Created ✅)
- **File:** `/components/AcademicYearSelector.tsx`
- Professional dropdown with:
  - Current year indicator
  - Status badges (ACTIVE, PLANNING, ENDED, ARCHIVED)
  - Date ranges
  - Checkmark for selected year
  - "Manage Academic Years" link

### 3. Integrated into Navigation (Already Done ✅)
- **File:** `/components/UnifiedNavigation.tsx`
- Year selector appears in top navigation
- Shows selected year name
- "Current" badge for active year

### 4. Students Page Updated (Complete ✅)
- **File:** `/app/[locale]/students/page.tsx`
- Added `selectedYear` to useEffect dependencies
- Passes `academicYearId` to API
- Auto-refreshes when year changes

### 5. Students API Updated (Complete ✅)
- **File:** `/lib/api/students.ts`
- Added `academicYearId` parameter to `getStudents()`
- Sends academicYearId query param to backend

---

## 🚧 What's In Progress / TODO

### Classes Page (TODO)
- [ ] Add `selectedYear` to fetch logic
- [ ] Update `getClasses()` API to accept `academicYearId`
- [ ] Refresh when year changes

### Teachers Page (TODO)
- [ ] Add `selectedYear` to fetch logic
- [ ] Update `getTeachers()` API to accept `academicYearId`
- [ ] Refresh when year changes

### Dashboard (TODO)
- [ ] Update stats to show year-specific data
- [ ] Filter counts by selected year
- [ ] Show year indicator

---

## 🎯 How It Works

### User Flow
1. User logs in → Default to current year (2025-2026)
2. User clicks year selector dropdown
3. Dropdown shows all years with status badges
4. User selects different year (e.g., 2024-2025)
5. **All pages auto-refresh with selected year data:**
   - Students list filters to that year
   - Classes list filters to that year
   - Teachers list filters to that year
   - Dashboard shows stats for that year

### Technical Flow
```
AcademicYearContext (Global State)
        ↓
  selectedYear changes
        ↓
  useEffect detects change
        ↓
  API called with academicYearId
        ↓
  Backend filters data by year
        ↓
  UI updates with year-specific data
```

---

## 🧪 Testing Phase 2

### Test Scenario 1: Year Selector Visibility
1. Login to system
2. ✅ Year selector visible in top navigation
3. ✅ Shows "2025-2026 (Current)"
4. ✅ Click dropdown → shows all years

### Test Scenario 2: Switch Years
1. Click year selector
2. Select "2024-2025" (if exists)
3. ✅ Dropdown closes
4. ✅ Selector shows "2024-2025"
5. ✅ Students page refreshes
6. ✅ Shows students from 2024-2025

### Test Scenario 3: Create New Year and Select
1. Go to Academic Years settings
2. Create "2026-2027" year
3. Go back to Students page
4. Click year selector
5. ✅ "2026-2027" appears in dropdown
6. Select it
7. ✅ Students page shows empty (no students yet)

### Test Scenario 4: Persistence
1. Select "2024-2025" year
2. Navigate to Classes page
3. ✅ Year selector still shows "2024-2025"
4. ✅ Classes filtered by 2024-2025
5. Refresh browser
6. ✅ Year selection persists (saved in localStorage)

---

## 📝 Files Modified (Phase 2)

```
✅ apps/web/src/components/AcademicYearSelector.tsx
   - Complete redesign
   - Better UI/UX
   - Status indicators

✅ apps/web/src/lib/api/students.ts
   - Added academicYearId parameter
   - Sends to backend in query string

✅ apps/web/src/app/[locale]/students/page.tsx
   - Uses selectedYear from context
   - Passes to getStudents()
   - Refreshes on year change

⏳ apps/web/src/lib/api/classes.ts (TODO)
   - Add academicYearId parameter

⏳ apps/web/src/app/[locale]/classes/page.tsx (TODO)
   - Integrate selected year

⏳ apps/web/src/lib/api/teachers.ts (TODO)
   - Add academicYearId parameter

⏳ apps/web/src/app/[locale]/teachers/page.tsx (TODO)
   - Integrate selected year

⏳ apps/web/src/app/[locale]/dashboard/page.tsx (TODO)
   - Show year-specific stats
```

---

## 🐛 Backend Requirements

The backend services need to support filtering by academic year:

### Student Service (Port 3003)
```
GET /students/lightweight?academicYearId=xxx
```
**Status:** ⏳ Needs implementation (currently ignores academicYearId)

### Class Service (Port 3005)
```
GET /classes?academicYearId=xxx
```
**Status:** ⏳ Needs implementation

### Teacher Service (Port 3004)
```
GET /teachers?academicYearId=xxx
```
**Status:** ⏳ Needs implementation

### Recommended Backend Changes
1. Add `academic_year_id` foreign key to:
   - `students` table (or class_enrollments)
   - `classes` table
   - `teacher_class_assignments` table

2. Update API endpoints to filter by `academicYearId` query param

3. Default to current year if no `academicYearId` provided

---

## 🎯 Next Steps

### Immediate (Continue Phase 2)
1. Update Classes page (similar to Students)
2. Update Teachers page (similar to Students)
3. Update Dashboard with year-specific stats
4. Test year switching across all pages

### Backend (Required for Full Functionality)
1. Add database support for year scoping
2. Update Student service to filter by year
3. Update Class service to filter by year
4. Update Teacher service to filter by year

### Phase 3 (After Phase 2)
1. Implement Promotion Wizard
2. Build year transition workflow
3. Add historical data views

---

## 💡 Design Decisions

### Why Context Instead of URL Params?
- ✅ Global state persists across navigation
- ✅ Simpler component code
- ✅ Works with client-side routing
- ✅ Saved in localStorage (survives refresh)

### Why Separate Selector Component?
- ✅ Reusable across pages
- ✅ Consistent UI/UX
- ✅ Easy to maintain
- ✅ Can be shown/hidden per page

### Why Auto-Refresh on Change?
- ✅ Better UX (no manual refresh needed)
- ✅ Data always in sync with selected year
- ✅ Prevents stale data confusion

---

## ✅ Phase 2 Progress: 40% Complete

- [x] Context (already existed)
- [x] Year Selector Component
- [x] Integrated into Navigation
- [x] Students Page Updated
- [ ] Classes Page (in progress)
- [ ] Teachers Page (todo)
- [ ] Dashboard (todo)
- [ ] Backend Support (todo)

**Next:** Complete Classes and Teachers pages, then move to Phase 3!
