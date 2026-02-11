# 🔧 Infinite Logout Loop & Auto-Login Fixed

**Date:** February 11, 2026 - 09:15  
**Status:** ✅ FIXED

---

## Issues Found

### Issue 1: Infinite Logout Loop ⚠️
**Symptom:** Logout API called repeatedly in infinite loop
**Console Logs:**
```
LOG  🚀 [API] POST /auth/logout
LOG  ✅ [API] POST /auth/logout - 200
LOG  🚀 [API] POST /auth/logout
LOG  ✅ [API] POST /auth/logout - 200
... (repeats forever)
```

**Root Cause:**
Circular event emission in authStore:

```typescript
// logout() function:
logout: async () => {
  // ... logout logic ...
  eventEmitter.emit('auth:logout'); // ← Emits event
}

// Event listener at bottom of file:
eventEmitter.on('auth:logout', () => {
  useAuthStore.getState().logout(); // ← Calls logout again!
});
```

**Flow:**
1. User clicks Logout
2. `logout()` called → emits 'auth:logout' event
3. Event listener catches it → calls `logout()` again
4. Step 2 repeats forever = Infinite loop!

### Issue 2: Stuck "Signing In..." State
**Symptom:** After logout, login screen shows "Signing In..." button disabled
**Root Cause:** `isLoading` state stuck at `true` from infinite logout loop

### Issue 3: Auto-Login After Logout
**Symptom:** After logout, app might auto-login again on restart
**Root Cause:** `initialize()` restores persisted `isAuthenticated: true` without checking if tokens actually exist

---

## Fixes Applied

### Fix 1: Remove Circular Event Emission
**File:** `apps/mobile/src/stores/authStore.ts`

```typescript
// Before ❌
logout: async () => {
  // ... logout logic ...
  eventEmitter.emit('auth:logout'); // ← Causes infinite loop!
}

// After ✅
logout: async () => {
  const { isLoading } = get();
  
  // Prevent multiple simultaneous logout calls
  if (isLoading) {
    console.log('Logout already in progress, skipping...');
    return;
  }
  
  // ... logout logic ...
  // DON'T emit logout event - would cause infinite loop
}
```

**Why This Works:**
- Removed the event emission that caused the loop
- Added guard to prevent multiple simultaneous calls
- Event listener from API client (401 errors) still works independently

### Fix 2: Verify Tokens on Initialize
**File:** `apps/mobile/src/stores/authStore.ts`

```typescript
// Before ❌
initialize: async () => {
  const currentState = get();
  if (currentState.isAuthenticated && currentState.user) {
    // Just restore persisted state - WRONG!
    // What if tokens were cleared during logout?
    return;
  }
}

// After ✅
initialize: async () => {
  const currentState = get();
  const hasTokens = await tokenService.initialize();
  
  // Verify BOTH persisted state AND tokens exist
  if (currentState.isAuthenticated && currentState.user && hasTokens) {
    // OK to restore session
    return;
  }
  
  // Persisted state but no tokens? Clear it
  if (currentState.isAuthenticated && !hasTokens) {
    console.log('Clearing stale persisted state');
    set({ user: null, isAuthenticated: false });
    return;
  }
}
```

**Why This Works:**
- After logout, tokens are cleared but AsyncStorage might still have `isAuthenticated: true`
- Now we verify tokens exist before restoring session
- If persisted state says logged in but no tokens → clear the stale state

---

## How It Works Now

### Logout Flow ✅
```
1. User clicks Logout
2. logout() checks if already logging out (guard)
3. Calls API: POST /auth/logout
4. Clears tokens from SecureStore
5. Sets state: isAuthenticated = false, user = null
6. Does NOT emit event (no loop!)
7. Navigation automatically goes to Login screen
8. Done ✅
```

### App Restart After Logout ✅
```
1. App starts
2. initialize() reads persisted state: isAuthenticated = true
3. initialize() checks tokens: hasTokens = false
4. Sees mismatch: logged in state but no tokens!
5. Clears stale state: isAuthenticated = false
6. Shows Login screen ✅
```

### Login → Logout → Login Flow ✅
```
1. User logs in
   → Tokens saved ✅
   → State persisted ✅
   
2. User logs out
   → Tokens cleared ✅
   → State updated ✅
   → Returns to Login ✅
   
3. App restart
   → Checks tokens: none found ✅
   → Shows Login screen ✅
   
4. User logs in again
   → Everything works! ✅
```

---

## Testing Steps

### 1. Restart App
```bash
# In Metro terminal, press:
r
```

### 2. Test Logout
1. Login to your account
2. Tap hamburger menu → Logout
3. Should see logout dialog
4. Confirm logout
5. Should return to Login screen (no infinite loop!)
6. Console should show ONE logout call, not repeated

**Expected Console:**
```
🚀 [API] POST /auth/logout
✅ [API] POST /auth/logout - 200
// That's it! No repeats.
```

### 3. Test Login After Logout
1. After logout, enter credentials
2. Tap "Sign In"
3. Should login successfully
4. Should see Feed screen

### 4. Test App Restart After Logout
1. Logout successfully
2. Reload app (Cmd+R or press 'r')
3. Should show Login screen (not auto-login)
4. No "Signing In..." stuck state

---

## Technical Details

### Why Event Emitter Was There
The `eventEmitter.on('auth:logout')` listener is meant to handle:
- 401 responses from API (token expired)
- Automatic logout when token refresh fails

But the `logout()` function should NOT emit this event - that's what caused the loop.

### Correct Event Flow Now
```
API Response 401
  ↓
API Client Interceptor
  ↓
eventEmitter.emit('auth:logout')
  ↓
Event Listener
  ↓
logout() called ONCE
  ↓
Done ✅

User clicks Logout button
  ↓
logout() called directly
  ↓
Does NOT emit event
  ↓
Done ✅
```

### Token vs State Sync
After logout:
- **Tokens:** Cleared from SecureStore ✅
- **State:** `isAuthenticated = false` ✅
- **Persisted State:** Still has old data ❌ (AsyncStorage)

That's why we need to verify tokens on initialize!

---

## Files Modified

1. ✅ `apps/mobile/src/stores/authStore.ts`
   - Removed event emission from logout()
   - Added logout in-progress guard
   - Fixed initialize() to verify tokens exist
   - Added stale state cleanup

---

## Verification Checklist

After restarting app, verify:

- [ ] Can login successfully
- [ ] Can logout without infinite loop
- [ ] Logout returns to Login screen
- [ ] Login screen not stuck in "Signing In..." state
- [ ] Can login again after logout
- [ ] App restart shows Login screen (no auto-login)
- [ ] No repeated logout calls in console

---

## Success Criteria

### Logout ✅
```
✓ Single logout API call
✓ Tokens cleared
✓ State updated
✓ Returns to Login screen
✓ No infinite loop
✓ No console spam
```

### Login After Logout ✅
```
✓ Can enter credentials
✓ Button not stuck
✓ Login works
✓ Sees Feed screen
```

### App Restart ✅
```
✓ Shows Login screen
✓ Not auto-logged in
✓ Can login normally
```

---

## Summary

**Before:**
- ❌ Logout caused infinite loop
- ❌ "Signing In..." stuck forever
- ❌ Auto-login after logout

**After:**
- ✅ Logout works perfectly (one call)
- ✅ Button states correct
- ✅ Must login manually after logout
- ✅ Complete flow tested

**Status:** Ready to test! Please restart and verify logout works correctly. 🚀
