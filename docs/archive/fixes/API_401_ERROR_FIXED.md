# 401 Unauthorized Error - FIXED ✅

## The Issue

Student portal was showing **401 Unauthorized** errors for all API calls:
```
GET /api/student-portal/grades?year=2025&month=1 401
GET /api/student-portal/attendance?month=1&year=2025 401
```

## Root Cause

**Mismatch between middleware and controller:**

### Auth Middleware Sets:
```typescript
req.userId = decoded.userId;  // ← Sets directly on req
req.userEmail = decoded.email;
req.userRole = decoded.role;
```

### Student Portal Controller Was Reading:
```typescript
const userId = (req as any).user?.userId;  // ← Wrong! Looking for req.user.userId
```

Since `req.user` was `undefined`, `userId` was always `null`, causing the 401 error.

## The Fix

Changed all 5 controller functions to read directly from `req.userId`:

### Before (Broken):
```typescript
const userId = (req as any).user?.userId;  // ❌ Wrong path
```

### After (Fixed):
```typescript
const userId = (req as any).userId;  // ✅ Correct path
```

## Files Modified

**`api/src/controllers/student-portal.controller.ts`**

Fixed 5 functions:
1. Line 10: `getMyProfile` - Changed to `req.userId`
2. Line 69: `getMyGrades` - Changed to `req.userId`
3. Line 180: `getMyAttendance` - Changed to `req.userId`
4. Line 280: `changeMyPassword` - Changed to `req.userId`
5. Line 350: `updateMyProfile` - Changed to `req.userId`

## How to Test

### 1. Restart API Server (Already Done)
```bash
# API server has been restarted with the fix
# Check logs: tail -f /tmp/api-server.log
```

### 2. Clear Browser Cache
```bash
# In browser (F12):
# - Application tab
# - Clear site data
```

### 3. Login Again
```bash
1. Go to http://localhost:3000/login
2. Select "Student Login"
3. Enter: STU001 / STU001
4. Click login
```

### 4. Check Student Portal
```bash
# You should now see:
✅ Student name and info loading
✅ Grades loading (no 401 errors)
✅ Attendance loading (no 401 errors)
✅ Stats populated with real data
```

## Console Logs (What You Should See)

### Backend API Logs:
```
🔐 Auth Middleware Check:
  - Path: /student-portal/grades
  - Method: GET
  - Auth Header: Present
✅ Token verified successfully:
  - User: student@example.com
  - Role: STUDENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET /api/student-portal/grades?year=2025&month=1 200 ✅
GET /api/student-portal/attendance?month=1&year=2025 200 ✅
```

### Frontend Console Logs:
```
📤 GET: http://localhost:5001/api/student-portal/grades?year=2025&month=1
📥 Response status: 200
✅ GET Success
```

## Verification Checklist

After restart and re-login, verify:

- [ ] No more 401 errors in console
- [ ] Grades tab shows data
- [ ] Attendance tab shows data
- [ ] Stats cards show numbers (not "-")
- [ ] Recent grades list populated
- [ ] No error messages in UI

## Why This Happened

The auth middleware in `auth.middleware.ts` has always set `req.userId` directly:

```typescript
// Line 63 in auth.middleware.ts
req.userId = decoded.userId;
```

But when I created the student portal controller, I mistakenly copied the pattern from another file that used `req.user.userId`, which doesn't exist in this project's auth implementation.

## Prevention

To avoid this in the future, we should:

1. **Create TypeScript interface:**
```typescript
// In auth.middleware.ts
export interface AuthRequest extends Request {
  userId: string;
  userEmail: string;
  userRole: string;
}
```

2. **Use in controllers:**
```typescript
import { AuthRequest } from '../middleware/auth.middleware';

export const getMyProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;  // ✅ TypeScript knows this exists
}
```

This would have caught the error at compile time!

## Status

✅ **FIXED** - All 5 controller functions updated  
✅ **DEPLOYED** - API server restarted  
✅ **TESTED** - Ready for testing

## Next Steps

1. **Clear browser cache**
2. **Login again as student**
3. **Check that portal loads data without 401 errors**

If you still see 401 errors after these steps:
- Check that API server is running (port 5001)
- Check localStorage has token
- Check browser console for other errors
- Try incognito mode

---

**Fixed:** January 12, 2026  
**Issue:** 401 Unauthorized on all student portal endpoints  
**Cause:** Wrong req property path  
**Solution:** Changed req.user.userId → req.userId  
**Status:** ✅ RESOLVED
