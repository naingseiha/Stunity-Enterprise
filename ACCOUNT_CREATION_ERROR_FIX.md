# Account Creation Error Fix

**Date:** February 12, 2026  
**Issue:** Animated outputRange errors during account creation  
**Status:** ✅ Fixed

---

## Problem

When trying to create a new account, users encountered the following errors:

```
Require cycles are allowed, but can result in uninitialized values. 
Consider refactoring to remove the need for a cycle.

ERROR [Invariant Violation: outputRange must contain color or value with numeric component]
```

---

## Root Cause

### Error 1: Animated Interpolation with Colors
**Location:** `apps/mobile/src/components/common/Input.tsx`

The Input component was using `Animated.interpolate()` with color objects that had conflicting definitions:

```typescript
// BEFORE (Broken)
const borderColor = focusAnimation.interpolate({
  inputRange: [0, 1],
  outputRange: [
    error ? Colors.error.main : Colors.gray[300],  // Problem: Colors.primary is defined twice
    error ? Colors.error.main : Colors.primary[500],
  ],
});
```

The issue was that `Colors.primary` was defined as both:
1. An object with shades: `Colors.primary[500]`
2. A string value: `Colors.primary = '#F59E0B'`

This caused the interpolation to fail because it couldn't determine the proper color value.

### Error 2: String Percentage in outputRange
**Location:** `apps/mobile/src/screens/quiz/TakeQuizScreen.tsx`

The progress bar was using string percentage values in outputRange:

```typescript
// BEFORE (Broken)
width: progressAnim.interpolate({
  inputRange: [0, 100],
  outputRange: ['0%', '100%'],  // ❌ Strings not allowed in outputRange
}),
```

React Native's Animated API doesn't support string percentage values in `outputRange`. It requires numeric values.

---

## Solution

### Fix 1: Input Component - Use Hardcoded Color Strings
**File:** `apps/mobile/src/components/common/Input.tsx`

Changed interpolation to use explicit color hex codes:

```typescript
// AFTER (Fixed)
const borderColor = focusAnimation.interpolate({
  inputRange: [0, 1],
  outputRange: [
    error ? '#EF4444' : '#D1D5DB', // Colors.error.main : Colors.gray[300]
    error ? '#EF4444' : '#F59E0B', // Colors.error.main : Colors.primary[500]
  ],
});
```

**Benefits:**
- ✅ No color object conflicts
- ✅ Clear, explicit color values
- ✅ Works with Animated interpolation
- ✅ Maintains the same visual appearance

### Fix 2: TakeQuizScreen - Use Flex Interpolation
**File:** `apps/mobile/src/screens/quiz/TakeQuizScreen.tsx`

Changed from width percentage to flex-based approach:

```typescript
// BEFORE (Broken)
<RNAnimated.View
  style={[
    styles.progressBarFill,
    {
      width: progressAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
      }),
    },
  ]}
/>

// AFTER (Fixed)
<RNAnimated.View
  style={[
    styles.progressBarFill,
    {
      flex: progressAnim.interpolate({
        inputRange: [0, 100],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
    },
  ]}
/>
```

**Style Changes:**
```typescript
progressBarBg: {
  height: 6,
  backgroundColor: '#E5E7EB',
  borderRadius: 3,
  overflow: 'hidden',
  marginBottom: 8,
  flexDirection: 'row',  // Added for flex layout
},
progressBarFill: {
  height: '100%',
  backgroundColor: '#6366F1',
  borderRadius: 3',
  // Removed width: '100%' - now controlled by flex
},
```

**Benefits:**
- ✅ Works with numeric interpolation
- ✅ Smooth animation
- ✅ Proper flex layout
- ✅ No string percentage issues

---

## Testing

### Before Fix
- ❌ Account creation crashed with Invariant Violation error
- ❌ Input fields threw errors when focusing
- ❌ Progress bar didn't animate in quiz screen

### After Fix
- ✅ Account creation works smoothly
- ✅ Input fields focus/blur without errors
- ✅ Progress bar animates correctly
- ✅ All animations work as expected

---

## Technical Notes

### Animated API Limitations

**React Native Animated API only supports:**
- Numeric values (0, 1, 100, etc.)
- Color hex strings ('#FFFFFF', '#000000', etc.)
- NOT string percentages ('0%', '100%')
- NOT complex objects

**Best Practices:**
1. Use numeric values for width/height animations
2. Use flex for responsive layouts
3. Use hardcoded color strings for color interpolation
4. Always set `useNativeDriver: false` for non-transform properties

### Flex vs Width for Progress Bars

**Flex Approach (Recommended):**
```typescript
flex: interpolate([0, 100], [0, 1])
container: { flexDirection: 'row' }
```

**Benefits:**
- Works with Animated API
- Responsive to container size
- Smooth interpolation
- No percentage string issues

**Transform Approach (Alternative):**
```typescript
transform: [{ scaleX: interpolate([0, 100], [0, 1]) }]
transformOrigin: 'left'
```

**Benefits:**
- Can use `useNativeDriver: true`
- Better performance
- Runs on GPU

**Drawback:**
- Requires `transformOrigin` which may not work on all platforms

---

## Files Modified

1. **apps/mobile/src/components/common/Input.tsx**
   - Fixed borderColor interpolation with hardcoded color values
   - Lines changed: 75-81

2. **apps/mobile/src/screens/quiz/TakeQuizScreen.tsx**
   - Changed progress bar from width percentage to flex
   - Updated container and fill styles
   - Lines changed: 201-219, 469-478

---

## Related Issues

### Require Cycle Warning

The "Require cycles" warning is a separate, non-critical issue related to circular imports in the codebase. It doesn't cause the app to crash but should be addressed in a future refactoring:

**Common Causes:**
- Component A imports Component B
- Component B imports Component A
- Both export through index.ts

**Not Fixed Yet (Low Priority):**
- Warning appears but doesn't affect functionality
- Can be addressed in code cleanup phase
- Use tools like `madge` to find circular dependencies

---

## Summary

✅ **Account Creation Fixed**
- Removed color object conflicts in Input interpolation
- Changed progress bar to flex-based animation
- All Animated API calls now use proper numeric values

✅ **No Breaking Changes**
- Visual appearance unchanged
- Same user experience
- Better code reliability

✅ **Tested**
- Account creation works
- Input focus animations work
- Quiz progress bar animates smoothly

**Commit:** `1338f3e` - "fix: Resolve Animated outputRange errors"

---

## Prevention

To avoid similar issues in the future:

1. **Always use numeric values in outputRange**
   - ✅ `outputRange: [0, 1]`
   - ❌ `outputRange: ['0%', '100%']`

2. **Be careful with color object definitions**
   - Don't define the same color key as both object and string
   - Use explicit hex codes in interpolations

3. **Test animations during development**
   - Check console for Invariant Violation errors
   - Test on both iOS and Android

4. **Use TypeScript strictly**
   - Properly type color definitions
   - Avoid `as const` conflicts

---

**Ready for Production** ✅
