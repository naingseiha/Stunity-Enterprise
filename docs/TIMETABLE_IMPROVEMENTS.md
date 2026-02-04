# Timetable Module Improvements

## Overview

This document describes the enhancements made to the timetable module to improve user experience, performance, and functionality. The improvements focus on making drag-and-drop operations instant and providing better visual feedback for scheduling conflicts.

## Changes Made

### 1. Optimistic Updates (Instant UI Response)

**Problem:** Previously, when dragging a teacher to a time slot, the UI would show a loading state and only display the entry after the API call completed. This felt slow and unresponsive.

**Solution:** Implemented optimistic updates pattern:
- UI updates **immediately** when user drops a teacher/entry
- API call runs in the **background**
- If API fails, UI automatically **rolls back** to previous state

**Files Modified:**
- `apps/web/src/app/[locale]/timetable/page.tsx`

**Key Code Changes:**
```typescript
// Before: Wait for API then update UI
setSaving(true);
await timetableAPI.createEntry({...});
loadClassTimetable(selectedClassId); // Full reload
setSaving(false);

// After: Update UI immediately, API in background
setTimetableData(prev => {
  // Update grid immediately
  const newGrid = { ...prev.grid };
  newGrid[day][periodId] = newEntry;
  return { ...prev, grid: newGrid };
});

// API call in background with rollback on error
timetableAPI.createEntry({...})
  .catch(() => loadClassTimetable(selectedClassId)); // Rollback
```

### 2. Cross-Class Teacher Conflict Detection

**Problem:** When dragging a teacher to a time slot, the system didn't show if the teacher was already teaching another class at that time. Users could accidentally create double-booking conflicts.

**Solution:** 
- Fetch teacher's complete schedule when drag starts
- Show "Busy" indicator on ALL slots where teacher is occupied
- Block drops on busy slots with clear error message

**How It Works:**
1. On `handleDragStart`, call `timetableAPI.getTeacherSchedule(teacherId)`
2. Build a Set of busy slot keys: `"${day}-${periodOrder}"`
3. Pass `isTeacherBusy` prop to each `DroppableCell`
4. Cell shows red "Busy" overlay and disables drop

**Visual Indicators:**
- 🔴 **Busy** - Teacher is teaching another class at this time
- 🟡 **Swap** - Hovering over another entry (can swap)
- 🔵 **Replace Teacher** - Dropping teacher on existing entry
- 🟢 **Drop here** - Empty slot available

### 3. Entry Swapping

**Feature:** Drag one entry onto another to swap their positions.

**Implementation:**
- Detect when dragging entry over another entry
- Show "Swap" indicator overlay
- Call `timetableAPI.swapEntries(entryId1, entryId2)` on drop
- Optimistic UI update for instant feedback

### 4. Entry Moving

**Feature:** Drag entry to an empty slot to move it.

**Implementation:**
- Optimistic update removes entry from old slot, adds to new slot
- Background API: delete old entry, create new entry
- Rollback on failure

### 5. Auto-Dismiss Messages

**Feature:** Success and error messages now auto-dismiss.

- ✅ Success messages: 3 seconds
- ❌ Error messages: 5 seconds

```typescript
useEffect(() => {
  if (error) {
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }
}, [error]);
```

### 6. Improved Type Safety

**Changes:**
- Added `periodId` to `TimetableEntry` type in `types.ts`
- Removed unused `useTimetableOptimistic.ts` hook
- Fixed all TypeScript errors

---

## State Variables Added

```typescript
// Track which teacher is being dragged
const [draggedTeacherId, setDraggedTeacherId] = useState<string | null>(null);

// Set of busy slot keys for the dragged teacher
const [draggedTeacherBusySlots, setDraggedTeacherBusySlots] = useState<Set<string>>(new Set());

// Track pending operations for visual feedback
const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
```

---

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /timetable/teacher/:teacherId/schedule` | Fetch teacher's complete schedule across all classes |
| `POST /timetable/entries` | Create new timetable entry |
| `PUT /timetable/entries/:id` | Update existing entry |
| `DELETE /timetable/entries/:id` | Delete entry |
| `POST /timetable/swap` | Swap two entries |

---

## User Experience Flow

### Dragging a Teacher Card

1. **Drag Start:**
   - Fetch teacher's schedule from API
   - Calculate all busy slots
   - Show visual indicators on grid

2. **During Drag:**
   - Empty available slots: Show blue "Drop here" on hover
   - Busy slots: Show red "Busy" indicator
   - Existing entries: Show "Replace Teacher" on hover

3. **Drop:**
   - **On empty slot:** Create entry (optimistic)
   - **On existing entry:** Replace teacher (optimistic)
   - **On busy slot:** Show error message, cancel drop

### Dragging an Entry

1. **Drag Start:**
   - If entry has teacher, fetch their schedule
   - Show busy slots for that teacher

2. **During Drag:**
   - Empty slots: Show "Move here"
   - Other entries: Show "Swap"
   - Busy slots (for teacher): Show "Busy"

3. **Drop:**
   - **On empty slot:** Move entry (optimistic)
   - **On another entry:** Swap entries (optimistic)

---

## Future Improvements

### Not Yet Implemented

1. **Room Conflict Detection**
   - Track room assignments
   - Show conflicts when same room is double-booked

2. **PDF Export**
   - Export timetable as PDF for printing
   - Include school header and formatting

3. **Bulk Operations**
   - Select multiple entries
   - Move/delete in bulk

4. **Undo/Redo**
   - Track operation history
   - Allow undoing recent changes

5. **Template System**
   - Save timetable as template
   - Apply template to other classes

---

## File Changes Summary

### Modified Files

| File | Changes |
|------|---------|
| `apps/web/src/app/[locale]/timetable/page.tsx` | Optimistic updates, busy slot detection, swapping, error messages |
| `apps/web/src/components/timetable/TimetableCell.tsx` | Added busy/swap/pending visual states |
| `apps/web/src/components/timetable/types.ts` | Added `periodId` to TimetableEntry |

### Deleted Files

| File | Reason |
|------|--------|
| `apps/web/src/hooks/useTimetableOptimistic.ts` | Unused, functionality moved to page component |

---

## Testing Checklist

- [x] Drag teacher to empty slot - instant update
- [x] Drag teacher to busy slot - shows "Busy", blocks drop
- [x] Drag teacher to existing entry - replaces teacher
- [x] Drag entry to empty slot - moves entry
- [x] Drag entry to another entry - swaps entries
- [x] API failure - UI rolls back
- [x] Error messages auto-dismiss
- [x] Success messages auto-dismiss
- [x] Cross-class conflicts detected

---

## Technical Notes

### Optimistic Update Pattern

```typescript
// 1. Update UI immediately
setTimetableData(prev => ({
  ...prev,
  grid: updatedGrid
}));

// 2. Make API call
apiCall()
  .then(() => {
    // Success - optionally reload for fresh data
    setSuccessMessage('Done!');
  })
  .catch((err) => {
    // Failure - rollback
    setError(err.message);
    loadClassTimetable(classId); // Reload from server
  });
```

### Busy Slot Key Format

```typescript
// Format: "DAY-PERIOD_ORDER"
// Examples: "MONDAY-1", "TUESDAY-3", "FRIDAY-5"
const slotKey = `${entry.dayOfWeek}-${periodOrder}`;
busySlots.add(slotKey);
```

### Checking if Teacher is Busy

```typescript
const slotKey = `${dropData.day}-${dropData.period}`;
if (draggedTeacherBusySlots.has(slotKey)) {
  setError(`${teacherName} is already teaching another class at this time slot`);
  return;
}
```

---

## Dependencies

No new dependencies were added. The implementation uses:
- `@dnd-kit/core` - Existing drag and drop library
- `lucide-react` - Icons (Ban, ArrowRightLeft already available)
- React hooks - useState, useEffect, useCallback

---

## Performance Considerations

1. **Teacher schedule fetch:** Only called on drag start, not on every hover
2. **Optimistic updates:** Eliminate wait time for API responses
3. **Set for busy slots:** O(1) lookup for checking availability
4. **Minimal re-renders:** Only affected grid cells update

---

*Last Updated: February 4, 2026*
