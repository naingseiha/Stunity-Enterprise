# NetworkQuality Service Fix

## The Problem

After creating `networkQuality.ts`, the app crashed with:
```
ERROR [ReferenceError: Property 'networkQualityService' doesn't exist]
```

Even after clearing Metro cache, the error persisted.

## Root Cause

**Two issues:**

1. **Missing npm dependency** - `@react-native-community/netinfo` was in `package.json` but not installed in `node_modules`
2. **TypeScript error** - Used string literal `'wifi'` instead of enum `NetInfoStateType.wifi`

### Why This Happens

When you work in a monorepo with workspaces:
- Dependencies can be installed at root level OR package level
- If `npm install` wasn't run after adding the dependency, it won't exist
- TypeScript compilation errors prevent Metro from bundling the file
- The error message "Property doesn't exist" is misleading - it's actually a compilation failure

## The Fix

### Step 1: Install Dependencies
```bash
cd apps/mobile
npm install
```

This installed `@react-native-community/netinfo@11.4.1` (18 packages added).

### Step 2: Fix TypeScript Error

**Before (❌ WRONG):**
```typescript
private getDefaultConfig(): NetworkConfig {
  return {
    quality: 'good',
    connectionType: 'wifi',  // ❌ String literal
    isConnected: true,
    // ...
  };
}
```

**After (✅ CORRECT):**
```typescript
private getDefaultConfig(): NetworkConfig {
  return {
    quality: 'good',
    connectionType: NetInfoStateType.wifi,  // ✅ Enum value
    isConnected: true,
    // ...
  };
}
```

### Step 3: Verify TypeScript Compilation
```bash
cd apps/mobile
npx tsc --noEmit src/services/networkQuality.ts
```

Should produce NO errors.

### Step 4: Restart Metro with Cache Clear
```bash
npm start -- --clear
```

## NetInfoStateType Values

The correct enum values from `@react-native-community/netinfo`:

```typescript
enum NetInfoStateType {
  unknown = "unknown",
  none = "none",
  cellular = "cellular",
  wifi = "wifi",           // ✅ Use NetInfoStateType.wifi
  bluetooth = "bluetooth",
  ethernet = "ethernet",
  wimax = "wimax",
  vpn = "vpn",
  other = "other"
}
```

## Debugging Steps for Similar Issues

When you see "Property doesn't exist" errors:

1. **Check if file exists:**
   ```bash
   ls -la src/services/networkQuality.ts
   ```

2. **Check for TypeScript errors:**
   ```bash
   npx tsc --noEmit src/services/networkQuality.ts
   ```

3. **Check if dependencies are installed:**
   ```bash
   npm ls @react-native-community/netinfo
   ```

4. **Check node_modules:**
   ```bash
   # Root level (monorepo)
   ls node_modules/@react-native-community/netinfo
   
   # Package level
   ls apps/mobile/node_modules/@react-native-community/netinfo
   ```

5. **Install missing dependencies:**
   ```bash
   npm install
   ```

6. **Clear Metro cache:**
   ```bash
   npm start -- --clear
   ```

## Key Learnings

1. **"Property doesn't exist" ≠ "File doesn't exist"**
   - Usually means TypeScript compilation failed
   - Check TypeScript errors first

2. **Dependencies in package.json ≠ Installed**
   - Always run `npm install` after pulling changes
   - Especially in monorepos with workspaces

3. **Use Enums, Not String Literals**
   - When a library exports an enum, use the enum
   - Don't use string literals that happen to match
   - TypeScript will catch this if you compile

4. **Check TypeScript Before Metro**
   - Run `npx tsc --noEmit` to catch errors
   - Faster than waiting for Metro to fail
   - Better error messages

## Files Fixed

- ✅ `apps/mobile/src/services/networkQuality.ts` - Line 35 changed from `'wifi'` to `NetInfoStateType.wifi`
- ✅ `apps/mobile/node_modules/` - Added 18 packages including `@react-native-community/netinfo`

## Testing

After fix, you should see in logs:
```
📶 [FeedStore] Network: excellent | Batch size: 20
```

No more `ReferenceError: Property 'networkQualityService' doesn't exist`.

---

**Fixed:** 2026-02-19 17:39  
**Issue:** TypeScript compilation error + missing dependencies  
**Solution:** Install dependencies + use enum instead of string literal
