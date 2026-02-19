# Metro Bundler Cache Issues

## Problem
When you add new files or make significant changes, Metro bundler may serve stale cached code, causing errors like:
```
ERROR  [ReferenceError: Property 'networkQualityService' doesn't exist]
```

Even though the file exists and is properly exported/imported.

## Why This Happens
Metro caches transformed JavaScript bundles for performance. When you:
- Create new files (like `networkQuality.ts`)
- Change exports/imports
- Refactor code structure

Metro may still serve the old cached version until you clear it.

## Solution: Always Clear Cache First

### Method 1: Clear on Startup (Recommended)
```bash
cd apps/mobile
npm start -- --clear
```

This clears the cache before starting the bundler.

### Method 2: Clear While Running
If Metro is already running:
1. Press `Ctrl+C` to stop Metro
2. Run: `npm start -- --clear`

### Method 3: Manual Clear
```bash
cd apps/mobile

# Clear Metro cache
rm -rf .expo
rm -rf node_modules/.cache

# Clear React Native cache
watchman watch-del-all  # If you have watchman

# Restart
npm start
```

### Method 4: Use the Script
```bash
cd apps/mobile
./clear-cache.sh
```

## When to Clear Cache

Clear cache whenever you see:
- ✅ `Property 'X' doesn't exist` errors
- ✅ New imports not working
- ✅ Changes not appearing in the app
- ✅ After adding new service files
- ✅ After significant refactoring

## Quick Reference

```bash
# Standard restart (uses cache)
npm start

# Fresh restart (clears cache) ✅ Use this when debugging
npm start -- --clear

# Nuclear option (complete reset)
rm -rf node_modules .expo && npm install && npm start -- --clear
```

## Why `--clear` Flag?

The `--clear` flag:
- Deletes Metro's JavaScript transform cache
- Forces Metro to rebuild all bundles from source
- Ensures latest code is bundled
- Takes ~1 minute longer but guarantees fresh code

**Rule of thumb:** Use `--clear` when:
- You've made structural changes
- You're debugging unexpected errors
- New code isn't being recognized

**Skip `--clear` when:**
- Making small tweaks to existing files
- Just fixing typos or styling
- Metro automatically detects changes (most of the time)

---

## Related Issues Fixed

1. **Transform Error** (`translateZ` doesn't exist)
   - See: `TRANSFORM_ERROR_FIX.md`
   
2. **Property Doesn't Exist** (networkQualityService)
   - See: This document
   
3. **Changes Not Appearing**
   - Clear cache, it's stale

---

**Created:** 2026-02-19  
**Part of:** Phase 1 Mobile Optimizations
