# Account Status Display Fix

## Issue
Student list was showing all students as "បិទ" (inactive) even though 1010 students should be active.

## Root Cause
The lightweight API endpoint (`/api/students/lightweight`) was not including the `isAccountActive` field in the response.

## Solution

### Backend Fix (API)
**File:** `/api/src/controllers/student.controller.ts`

Added two fields to the `select` statement in `getStudentsLightweight` function:
```typescript
select: {
  // ... existing fields
  isAccountActive: true, // ✅ Added for account status display
  studentRole: true,     // ✅ Added for role display (bonus)
  // ... rest of fields
}
```

### Frontend Fix
**File:** `/src/app/admin/accounts/page.tsx`

1. **Added debug logging:**
```typescript
console.log("📊 Loaded students:", studentsData.data.length);
console.log("📊 Sample student data:", studentsData.data[0]);
```

2. **Improved status display logic:**
```typescript
{student.isAccountActive === true ? (
  // Green badge - Active
) : student.isAccountActive === false ? (
  // Red badge - Inactive
) : (
  // Gray badge - Undefined/Not set
)}
```

Changed from simple truthy check to explicit `=== true` and `=== false` checks to handle:
- `true` → សកម្ម (Active) - Green
- `false` → បិទ (Inactive) - Red  
- `undefined/null` → មិនទាន់កំណត់ (Not Set) - Gray

## Testing
1. API server needs to be restarted for backend changes
2. Clear browser cache or hard refresh
3. Check browser console for debug logs
4. Verify student status badges show correctly:
   - 1010 students should show green "សកម្ម"
   - Remaining should show red "បិទ"

## Next Steps
- Restart API server: `cd api && npm start`
- Refresh browser page
- Check console logs to verify data structure
- Confirm status badges display correctly

## Files Modified
- ✅ `/api/src/controllers/student.controller.ts` - Added isAccountActive to select
- ✅ `/src/app/admin/accounts/page.tsx` - Improved status display logic + debug logs
- ✅ Frontend build passed successfully
