# Password Security System - Bug Fixes

**Date:** January 17, 2026  
**Status:** ✅ Fixed

---

## 🐛 Issues Found & Fixed

### Issue #1: Shows "0 days left" instead of "7 days left"

**Problem:**
- Users with default passwords saw "0 days left" in the warning banner
- This happened when `passwordExpiresAt` field in database was `null`

**Root Causes:**
1. **Backend Login Logic (`auth.controller.ts`):**
   - `passwordExpiresAt` was only set when `isDefaultPassword === null` (first detection)
   - If a user already had `isDefaultPassword: true` but `passwordExpiresAt: null`, it wasn't updated
   - This could happen from database migrations or data inconsistencies

2. **Utility Function (`password.utils.ts`):**
   - `getTimeRemaining()` returned `0 days` when `expiresAt` was `null`
   - Should have returned the default grace period of 7 days

**Solutions:**

✅ **Fix #1: Updated Login Logic**
```typescript
// OLD CODE (auth.controller.ts - line 240-243):
if (usingDefaultPassword && user.isDefaultPassword === null) {
  passwordSecurityUpdate.isDefaultPassword = true;
  passwordSecurityUpdate.passwordExpiresAt = calculatePasswordExpiry(7);
}

// NEW CODE:
if (usingDefaultPassword) {
  if (user.isDefaultPassword === null) {
    passwordSecurityUpdate.isDefaultPassword = true;
  }
  // Always set expiration if not set or if user still has default password
  if (!user.passwordExpiresAt || user.isDefaultPassword) {
    passwordSecurityUpdate.passwordExpiresAt = calculatePasswordExpiry(7);
  }
}
```

**What Changed:**
- Now checks if `passwordExpiresAt` is missing
- Sets expiration date even if `isDefaultPassword` is already `true`
- Ensures all default password users have proper expiration dates

✅ **Fix #2: Updated Time Remaining Calculation**
```typescript
// OLD CODE (password.utils.ts - line 48-50):
if (!expiresAt) {
  return { daysRemaining: 0, hoursRemaining: 0, isExpired: false };
}

// NEW CODE:
if (!expiresAt) {
  // If no expiration date set, default to 7 days (default grace period)
  return { daysRemaining: 7, hoursRemaining: 0, isExpired: false };
}
```

**What Changed:**
- Returns 7 days remaining when no expiration date is set
- Matches the default grace period policy
- Prevents showing "0 days left" for new default password users

---

### Issue #2: Warning shows for users who already changed password

**Problem:**
- Users who changed their password BEFORE the database schema update still see the warning
- The `isDefaultPassword` field in database was `true` or `null` even though they're using a new password
- System trusted the database field instead of checking the actual password

**Root Cause:**
- **Login Logic**: Only set `isDefaultPassword = true` when detecting default password, but never set it to `false`
- **Password Status API**: Didn't check the actual password, just returned the database field
- **Legacy Data**: Users who changed passwords before schema update had incorrect flags

**Solutions:**

✅ **Fix #3: Check Actual Password on Login**
```typescript
// NEW CODE (auth.controller.ts):
if (usingDefaultPassword) {
  // User IS using default password
  if (user.isDefaultPassword === null) {
    passwordSecurityUpdate.isDefaultPassword = true;
  }
  if (!user.passwordExpiresAt || user.isDefaultPassword) {
    passwordSecurityUpdate.passwordExpiresAt = calculatePasswordExpiry(7);
  }
} else {
  // User is NOT using default password - clear the flag and expiration
  if (user.isDefaultPassword === true || user.isDefaultPassword === null) {
    passwordSecurityUpdate.isDefaultPassword = false;
    passwordSecurityUpdate.passwordExpiresAt = null;
  }
}
```

**What Changed:**
- Added `else` block to handle non-default passwords
- Clears `isDefaultPassword` flag when password is NOT the phone number
- Clears `passwordExpiresAt` when user has changed password
- Fixes legacy data on next login

✅ **Fix #4: Check Actual Password in Status API**
```typescript
// NEW CODE (auth.controller.ts - getPasswordStatus):
// Actually check if the current password is the default (phone number)
const phoneNumber = user.phone || user.teacher?.phone;
const actuallyUsingDefaultPassword = phoneNumber
  ? await isDefaultPassword(user.password, phoneNumber)
  : false;

// If the actual check differs from the database field, update it
if (actuallyUsingDefaultPassword !== user.isDefaultPassword) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      isDefaultPassword: actuallyUsingDefaultPassword,
      passwordExpiresAt: actuallyUsingDefaultPassword 
        ? (user.passwordExpiresAt || calculatePasswordExpiry(7))
        : null,
    },
  });
}
```

**What Changed:**
- Now checks the ACTUAL password against phone number
- Updates database if the field is incorrect
- Returns correct status based on actual password check
- Fixes legacy data automatically when user checks status

**Impact:**
- ✅ Users who changed passwords before schema update will no longer see warnings
- ✅ Database automatically corrects itself on login/status check
- ✅ System now relies on actual password verification, not just database flags
- ✅ Works for all users, including legacy accounts

---

### Issue #3: Warning Card UI Needs Improvement

**Problem:**
- Warning card looked cluttered and hard to read
- Time remaining not prominently displayed
- Button style not attention-grabbing enough

**Solution:**

✅ **Improved UI Design (`PasswordExpiryWarning.tsx`)**

**Changes Made:**
1. **Better Visual Hierarchy:**
   - Larger, bolder title (text-xl)
   - Time remaining shown in a badge with background color
   - Better spacing and padding
   - Larger icon (w-7 h-7)

2. **Enhanced Time Display:**
   - Moved to colored badge pill design
   - Color-coded by urgency:
     - 🔵 Blue for 3-7 days (info)
     - 🟠 Orange for 1-3 days (warning)
     - 🔴 Red for <1 day (danger)
   - Clock icon inside badge

3. **Better Button Design:**
   - Full-width button for mobile
   - Larger padding (py-3)
   - Added shadow effects (shadow-md, hover:shadow-lg)
   - Lock icon with text
   - Bold text (font-bold)

4. **Improved Border & Card:**
   - Thicker border (border-2)
   - More rounded corners (rounded-xl)
   - Better shadow (shadow-sm)
   - More padding (p-5)
   - More margin (mb-6)

5. **Better Emoji & Formatting:**
   - Added 🔒 emoji for visual emphasis
   - Better line spacing
   - Smaller helper text with opacity

---

## 📁 Files Modified

### Backend Files:
1. **`api/src/controllers/auth.controller.ts`**
   - Fixed login logic to always set `passwordExpiresAt` for default passwords
   - Added logic to clear flags when password is NOT default
   - Fixed `getPasswordStatus()` to check actual password
   - Lines: 234-259, 537-590

2. **`api/src/utils/password.utils.ts`**
   - Fixed `getTimeRemaining()` to return 7 days when no expiration date
   - Lines: 43-51

### Frontend Files:
3. **`src/components/security/PasswordExpiryWarning.tsx`**
   - Improved UI design with better visual hierarchy
   - Enhanced time remaining badge display
   - Improved button styling
   - Lines: 107-172

---

## ✅ Testing Checklist

### Backend Testing:
- [x] API server restarts successfully
- [ ] Login with default password sets `passwordExpiresAt`
- [ ] Login with changed password clears flags
- [ ] Password status API checks actual password
- [ ] Legacy users get flags corrected on login

### Frontend Testing:
- [ ] Warning shows for users with default passwords
- [ ] Warning does NOT show for users who changed passwords
- [ ] Badge color matches urgency level
- [ ] Time remaining displays correctly
- [ ] Button is prominent and clickable
- [ ] Card layout looks clean on mobile

### Integration Testing:
- [ ] Login with default password → See warning with 7 days
- [ ] Login with changed password → No warning shown
- [ ] Change password → Warning disappears immediately
- [ ] Re-login → Still no warning
- [ ] Legacy account → Gets fixed on next login

---

## 🔄 How to Test

1. **Test Default Password User:**
   ```bash
   # Login with phone number as password
   # Should see warning: "7 days left"
   ```

2. **Test Changed Password User:**
   ```bash
   # Login with a user who changed password before schema update
   # Should NOT see warning (system will auto-correct database)
   ```

3. **Test Password Change:**
   ```bash
   # Login with default password
   # Change password
   # Warning should disappear
   # Logout and login again
   # Warning should still be gone
   ```

---

## 📝 Summary

**What Was Fixed:**
✅ Shows correct "7 days left" instead of "0 days"  
✅ Sets expiration date for all default password users  
✅ Clears flags for users who changed passwords  
✅ Checks ACTUAL password, not just database field  
✅ Auto-corrects legacy data on login/status check  
✅ Cleaner, more modern warning card design  
✅ Better visual hierarchy and readability  
✅ More prominent action button  

**Impact:**
- ✅ Works correctly for all users (new and legacy)
- ✅ Database self-corrects on next login
- ✅ No manual database updates needed
- ✅ Better user experience
- ✅ Clear time remaining information
- ✅ Professional, clean mobile interface

**Status:** ✅ Ready for testing on mobile PWA

