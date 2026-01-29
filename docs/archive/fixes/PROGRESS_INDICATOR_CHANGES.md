# Progress Indicator for Partial Monthly Scores

## Summary
Added visual indicators to show when monthly scores are "In Progress" (partial) vs "Complete" in the Student Portal Profile's Academic Year card.

## Problem
- Students with partial scores for current month (e.g., 2 out of 10 subjects) saw "No data yet"
- No way to distinguish between "no data" and "partial data"
- Dashboard showed "in progress" but Profile tab didn't

## Solution
Show months with partial scores using:
- 🟡 Amber background color
- ⟳ Animated spinning loader icon
- "In Progress • X/Y" status (e.g., "In Progress • 2/10")
- Partial average score displayed

## Files Changed

### Backend
**api/src/controllers/student-portal.controller.ts**
- Added `subjectCount`: Number of subjects with scores
- Added `totalSubjects`: Total subjects for the class
- Added `isComplete`: Boolean flag when all subjects have scores
- Logic: `isComplete = (subjectCount >= totalSubjects) && (totalSubjects > 0)`

### Frontend
**src/lib/api/student-portal.ts**
- Updated `MonthlySummaryResponse` interface with new fields

**src/components/mobile/student-portal/tabs/StudentProfileTab.tsx**
- Updated `MonthlyStats` interface
- Added `Clock` and `Loader2` icon imports
- Added progress detection: `inProgress = hasData && !isComplete`
- Visual styling:
  - Amber background for in-progress: `bg-amber-50 border-amber-300`
  - Spinner icon: `<Loader2 className="animate-spin" />`
  - Status text: `In Progress • ${subjectCount}/${totalSubjects}`
  - Amber score color for partial data

## Visual Example

### Before
```
មករា (January)
No data yet          —
```

### After
```
⟳ មករា (January)
In Progress • 2/10   23.5/50
[Amber background with spinner]
```

## Testing
1. Restart API server: `cd api && npm run dev`
2. Rebuild frontend: `npm run build`
3. Start app: `npm start` or `npm run dev`
4. Login as student with partial January scores
5. Navigate to Profile tab > Academic Year section
6. Verify January shows "In Progress • X/Y" with amber styling

## Notes
- PWA may cache old version - hard refresh or unregister service worker
- Changes work for any month with partial data, not just January
- Complete months still show green/blue with "Score Available"
