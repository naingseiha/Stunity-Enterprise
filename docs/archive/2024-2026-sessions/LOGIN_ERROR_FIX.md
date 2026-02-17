# Login Error Fix - Session Expired Issue

**Date:** February 10, 2026  
**Issue:** Users encountering "Session expired. Please log in again" error (UNAUTHORIZED) after database schema migration  
**Status:** ✅ FULLY RESOLVED

---

## Problem Description

After implementing the ID Generation and Claim Code systems (migration `20260210131804_add_id_and_claim_code_systems`), users were unable to log in OR register with new credentials. The mobile app displayed:

### Error 1: Login
```json
{
  "code": "UNAUTHORIZED",
  "message": "Session expired. Please log in again."
}
```

### Error 2: Register
```
ERROR ❌ [API] POST /auth/register - 404
```

**Error Logs:**
```
LOG  🚀 [API] POST /auth/login
ERROR  Failed to refresh token: [Error: No refresh token available]
ERROR  ❌ [API] POST /auth/login - 401
ERROR  Login error: {"code": "UNAUTHORIZED", "message": "Session expired. Please log in again."}
```

**Error Location:** `authStore.ts:189:24` (login function)

---

## Root Causes Identified

### 1. Token Refresh Loop (Critical)
The API client was attempting to refresh tokens **even for login/register requests**, creating an infinite loop:
- User tries to login → Gets 401 error
- API interceptor catches 401 → Tries to refresh token
- No valid refresh token exists → Fails
- Returns UNAUTHORIZED error → Repeat

### 2. Missing Register Endpoint (Critical)
The auth service only had `/auth/register/with-claim-code` but the mobile app was calling `/auth/register`:
- Regular registration (without claim code) returned 404
- Users couldn't create social-only accounts
- Only claim code registration was possible

### 3. Stale Cached Tokens (User-Specific)
After database schema migration, old JWT tokens in AsyncStorage became invalid.

---

## Solutions Implemented

### Fix 1: Exclude Auth Endpoints from Token Refresh

**File:** `apps/mobile/src/api/client.ts`

Added logic to skip token refresh for authentication endpoints:

```typescript
// Handle 401 - Token expired
// Skip token refresh for auth endpoints (login, register, refresh)
const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                      originalRequest.url?.includes('/auth/register') ||
                      originalRequest.url?.includes('/auth/refresh');

if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
  originalRequest._retry = true;
  // ... token refresh logic
}
```

**Benefits:**
- Breaks the infinite token refresh loop
- Login/register requests go directly to server
- Only authenticated endpoints trigger token refresh

---

### Fix 2: Added Basic Register Endpoint

**File:** `services/auth-service/src/index.ts`

Created `/auth/register` endpoint for social-only users (119 lines):

```typescript
app.post(
  '/auth/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
  ],
  async (req: Request, res: Response) => {
    // Check if user exists
    // Hash password
    // Create user with accountType: 'SOCIAL_ONLY'
    // Generate JWT tokens
    // Return user + tokens
  }
);
```

**Features:**
- Creates SOCIAL_ONLY accounts (no school affiliation)
- Full social features enabled
- Returns access + refresh tokens
- Email uniqueness validation
- Password hashing with bcrypt

---

### Fix 3: Enhanced Error Handling

**File:** `apps/mobile/src/stores/authStore.ts`

Added automatic token cleanup on auth errors:

```typescript
} catch (error: any) {
  console.error('Login error:', error);
  
  // If session expired or unauthorized, clear tokens
  if (error?.response?.status === 401 || error?.response?.data?.code === 'UNAUTHORIZED') {
    await tokenService.clearTokens();
    set({
      user: null,
      isAuthenticated: false,
    });
  }
  
  const message = error?.response?.data?.message || error.message || 'An error occurred during login';
  set({
    isLoading: false,
    error: message,
  });
  return false;
}
```

---

### Fix 4: Developer Clear Cache Button

**File:** `apps/mobile/src/screens/auth/LoginScreen.tsx`

Added dev-only button to clear AsyncStorage:

```typescript
{__DEV__ && (
  <TouchableOpacity
    onPress={async () => {
      await AsyncStorage.clear();
      await logout();
      Alert.alert('Success', 'Cache cleared!');
    }}
    style={styles.clearCacheButton}
  >
    <Text>Clear Cache & Logout (Dev)</Text>
  </TouchableOpacity>
)}
```

---

## Testing Results

### ✅ All Tests Passing

| Test | Status | Details |
|------|--------|---------|
| Auth service compilation | ✅ Pass | No TypeScript errors |
| Register new account | ✅ Pass | Created testuser5@example.com |
| Login with new account | ✅ Pass | Returns valid tokens |
| Token refresh exclusion | ✅ Pass | No loop on auth endpoints |
| Claim code registration | ✅ Pass | Existing endpoint works |
| Clear cache button | ✅ Pass | Only visible in dev mode |

### Test Commands:
```bash
# Register
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"test123","firstName":"Test","lastName":"User","role":"STUDENT"}'

# Response:
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "testuser@example.com", ... },
    "tokens": { "accessToken": "...", "refreshToken": "..." }
  }
}

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"test123"}'

# Response: { "success": true, ... }
```

---

## User Resolution Steps

### Quick Fix: Just Register or Login!

**The issue is now completely fixed!** You can now:

1. **Register a new account:**
   - Tap "Create Account" on Welcome screen
   - Fill in your details
   - Works with OR without claim code

2. **Login with test account:**
   - Email: `testuser5@example.com`
   - Password: `test123`

3. **Clear old cache (if needed):**
   - Look for "Clear Cache & Logout (Dev)" button at bottom of login screen
   - Tap it to remove old tokens

---

## Files Modified

| File | Changes | Lines | Commits |
|------|---------|-------|---------|
| `apps/mobile/src/api/client.ts` | Skip token refresh for auth endpoints | +5 | bb4b7a6, e45bfd4 |
| `apps/mobile/src/stores/authStore.ts` | Enhanced error handling, auto token cleanup | +8 | bb4b7a6 |
| `apps/mobile/src/screens/auth/LoginScreen.tsx` | Added clear cache button, import AsyncStorage | +35 | bb4b7a6 |
| `services/auth-service/src/index.ts` | Added `/auth/register` endpoint | +119 | e45bfd4 |
| `LOGIN_ERROR_FIX.md` | Complete fix documentation | - | bb4b7a6, e45bfd4 |

---

## API Endpoints Available

### Authentication Endpoints:
- ✅ `POST /auth/login` - Login with email/password
- ✅ `POST /auth/register` - Register new account (social-only)
- ✅ `POST /auth/register/with-claim-code` - Register with school claim code
- ✅ `POST /auth/login/claim-code` - First-time login with claim code

### Both Registration Methods Work:
1. **Social-Only** (new): For general users, no school affiliation
2. **Claim Code** (existing): For students/teachers with school codes

---

## Testing Checklist

- [x] TypeScript compilation passes with no errors
- [x] Clear cache button only visible in dev mode
- [x] Auto token cleanup on UNAUTHORIZED errors
- [x] Token refresh loop fixed
- [x] Register endpoint returns 201 with tokens
- [x] Login endpoint returns 200 with tokens
- [x] Both registration methods work
- [x] Auth service running on port 3001
- [x] Changes committed and pushed to GitHub

---

## Production Deployment Notes

### Environment:
- Auth service must be running on port 3001
- Database migrations must be applied
- JWT_SECRET environment variable required

### What's Different in Production:
- Clear cache button won't show (only in `__DEV__`)
- Users must reinstall app for fresh start
- Consider adding app version check for cache invalidation

---

## Related Documentation

- [STUDENT_TEACHER_ID_SYSTEM.md](./STUDENT_TEACHER_ID_SYSTEM.md) - ID generation system
- [CLAIM_CODE_API_IMPLEMENTATION.md](./CLAIM_CODE_API_IMPLEMENTATION.md) - Claim code endpoints
- [MOBILE_INTEGRATION_COMPLETE.md](./MOBILE_INTEGRATION_COMPLETE.md) - Mobile app integration
- [GIT_COMMIT_SUMMARY.md](./GIT_COMMIT_SUMMARY.md) - v2.4.0 commit details

---

## Git Commits

### bb4b7a6 - Initial fix (Token cleanup)
- Enhanced authStore error handling
- Added clear cache button to LoginScreen
- Created LOGIN_ERROR_FIX.md

### e45bfd4 - Complete fix (Register endpoint + Token refresh)
- Added `/auth/register` endpoint in auth service
- Fixed token refresh loop in API client
- Excluded auth endpoints from token refresh interceptor

---

## Status

✅ **FULLY RESOLVED** - All issues fixed and tested  
📦 **Committed** - 2 commits pushed to GitHub  
🚀 **Ready for Use** - Users can now login and register successfully  
🎉 **No More Token Loops** - API client properly handles auth requests
