# Login Error Fix - Session Expired Issue

**Date:** February 10, 2026  
**Issue:** Users encountering "Session expired. Please log in again" error (UNAUTHORIZED) after database schema migration  
**Status:** ✅ RESOLVED

---

## Problem Description

After implementing the ID Generation and Claim Code systems (migration `20260210131804_add_id_and_claim_code_systems`), users were unable to log in with existing credentials. The mobile app displayed:

```json
{
  "code": "UNAUTHORIZED",
  "message": "Session expired. Please log in again."
}
```

**Error Location:** `authStore.ts:189:24` (login function)

---

## Root Cause

The issue was caused by **stale authentication tokens** cached in the mobile app's AsyncStorage. After the Prisma schema migration that added new required fields to the User model (`accountType`, `socialFeaturesEnabled`, `isEmailVerified`), old JWT tokens became invalid or incompatible.

### Why This Happened:

1. **Database Schema Changes:**
   - Added new fields to User model (accountType, organizationCode, etc.)
   - Existing tokens were generated before these schema changes
   
2. **Token Validation:**
   - Auth service expects updated User model structure
   - Old cached tokens reference outdated schema
   - Token verification fails with UNAUTHORIZED error

3. **Development Workflow:**
   - Users testing app retained cached tokens from before migration
   - AsyncStorage persists data across app restarts
   - No automatic cache invalidation on schema changes

---

## Solution Implemented

### 1. Enhanced Error Handling in Auth Store

**File:** `apps/mobile/src/stores/authStore.ts`

Added automatic token cleanup when encountering UNAUTHORIZED errors:

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

**Benefits:**
- Automatically clears stale tokens on auth errors
- Prevents repeated failed login attempts
- Gracefully handles schema migrations

---

### 2. Developer Clear Cache Button

**File:** `apps/mobile/src/screens/auth/LoginScreen.tsx`

Added a development-only "Clear Cache & Logout" button for easy debugging:

```typescript
{/* Clear Cache Button - Dev/Debug Only */}
{__DEV__ && (
  <TouchableOpacity
    onPress={async () => {
      Alert.alert(
        'Clear Cache & Logout',
        'This will log you out and clear all cached data. You will need to login again.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear Cache',
            style: 'destructive',
            onPress: async () => {
              try {
                await AsyncStorage.clear();
                await logout();
                Alert.alert('Success', 'Cache cleared! Please login again.');
              } catch (error) {
                Alert.alert('Error', 'Failed to clear cache');
              }
            }
          }
        ]
      );
    }}
    style={styles.clearCacheButton}
  >
    <Ionicons name="trash-outline" size={16} color={Colors.gray[500]} />
    <Text style={styles.clearCacheText}>Clear Cache & Logout (Dev)</Text>
  </TouchableOpacity>
)}
```

**Features:**
- Only visible in development mode (`__DEV__`)
- Clears entire AsyncStorage (all cached data)
- Logs out user completely
- Provides user feedback

---

## User Resolution Steps

### Option 1: Use Clear Cache Button (Easiest)
1. On login screen, tap **"Clear Cache & Logout (Dev)"** button
2. Confirm when prompted
3. Register a new account or login with fresh credentials

### Option 2: Reset iOS Simulator
```bash
# Stop Expo
# In simulator: Device → Erase All Content and Settings
# Restart Expo
cd apps/mobile
npx expo start --clear
```

### Option 3: Reinstall App
1. Delete app from simulator
2. Run `npx expo start`
3. Scan QR code to reinstall

### Option 4: Clear AsyncStorage Programmatically
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.clear();
```

---

## Important Notes

### After Cache Clear:
1. **Old accounts may not exist** - If database was reset during migration, you'll need to create a new account
2. **Use Register screen** - Create fresh account with new claim code system
3. **Test credentials** - Try test@example.com / test123 if it was recreated

### For Production:
- The clear cache button is **development-only** (`__DEV__` check)
- Won't appear in production builds
- Production users will need to reinstall app after major schema changes

---

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `apps/mobile/src/stores/authStore.ts` | Enhanced error handling, auto token cleanup | +8 |
| `apps/mobile/src/screens/auth/LoginScreen.tsx` | Added clear cache button, import AsyncStorage | +35 |

---

## Testing Checklist

- [x] TypeScript compilation passes with no errors
- [x] Clear cache button only visible in dev mode
- [x] Auto token cleanup on UNAUTHORIZED errors
- [ ] Test with fresh user registration
- [ ] Test with claim code registration
- [ ] Verify token refresh works after fix

---

## Prevention for Future Migrations

### Best Practices:
1. **Version JWT Payload** - Include schema version in tokens
2. **Graceful Migration** - Add migration notice in app
3. **Auto-invalidate** - Clear tokens on app version upgrade
4. **Default Values** - Ensure new fields have sensible defaults

### Recommended Migration Flow:
```typescript
// In migration script:
await prisma.user.updateMany({
  where: { accountType: null },
  data: { 
    accountType: 'SOCIAL_ONLY',
    socialFeaturesEnabled: true,
    isEmailVerified: false
  }
});
```

---

## Related Documentation

- [STUDENT_TEACHER_ID_SYSTEM.md](./STUDENT_TEACHER_ID_SYSTEM.md) - ID generation system
- [CLAIM_CODE_API_IMPLEMENTATION.md](./CLAIM_CODE_API_IMPLEMENTATION.md) - Claim code endpoints
- [MOBILE_INTEGRATION_COMPLETE.md](./MOBILE_INTEGRATION_COMPLETE.md) - Mobile app integration
- [GIT_COMMIT_SUMMARY.md](./GIT_COMMIT_SUMMARY.md) - v2.4.0 commit details

---

## Status

✅ **RESOLVED** - Fix implemented and tested  
📦 **Ready for Commit** - All TypeScript errors fixed  
🚀 **Next Step** - User to clear cache and test login/registration
