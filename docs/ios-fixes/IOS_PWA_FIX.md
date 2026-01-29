# iOS PWA Service Worker Error Fix

## Problem Summary

Some iOS devices (specifically iPhone users) were experiencing an error when using the installed PWA app:

```
មានបញ្ហា (Error)
Response served by service worker is an error
```

The app worked fine in the browser but failed when installed as a PWA (Progressive Web App) on the home screen.

## Root Cause

The issue was caused by the default service worker fallback function returning `Response.error()` when it couldn't find cached resources or when network requests failed. iOS Safari's PWA mode doesn't handle `Response.error()` properly, causing the error message shown to users.

**Technical Details:**
- The default next-pwa fallback returns `Response.error()` as a last resort
- iOS Safari interprets this as an actual error and shows it to the user
- The error occurred intermittently depending on network conditions and cache state
- Different iOS versions handle service worker errors differently, causing inconsistent behavior

## Solution

### 1. Created Custom Service Worker Fallback (`worker/index.js`)

A custom service worker fallback function that **NEVER** returns `Response.error()`. Instead, it returns proper HTTP responses:

- **Navigation requests (HTML pages)**: Returns a user-friendly offline page with a retry button
- **API requests**: Returns JSON error response with 503 status
- **Images**: Returns a transparent 1x1 PNG placeholder
- **Fonts**: Returns empty 503 response (falls back to system fonts)
- **Scripts/CSS**: Returns empty content with proper content-type
- **Other requests**: Returns empty 503 response with proper headers

### 2. Updated Cache Version (v4 → v5)

Changed cache version from `school-ms-v4` to `school-ms-v5` to force all devices to refresh their service worker and clear old problematic caches.

**Files updated:**
- `next.config.js`: Updated `cacheId: 'school-ms-v5'`
- `public/sw-register.js`: Updated cache cleanup logic
- `public/sw-handler.js`: Updated iOS-specific cache cleanup

### 3. Files Modified

#### Created:
- `worker/index.js` - Custom iOS-compatible service worker fallback

#### Modified:
- `next.config.js` - Updated cache version to v5
- `public/sw-register.js` - Updated cache version reference
- `public/sw-handler.js` - Updated cache version reference
- `package.json` - Ensured build script is clean

## How It Works

1. During build, next-pwa detects the custom `worker/index.js` file
2. It compiles it to `/public/worker-[hash].js`
3. The main service worker (`sw.js`) imports this custom worker
4. When errors occur, the custom `self.fallback()` function is called
5. It returns proper HTTP responses instead of `Response.error()`
6. iOS Safari handles these responses correctly without showing errors

## Testing

### To Deploy and Test:

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Verify the build output shows:**
   ```
   ✓ (pwa) Found a custom worker implementation at worker/index.js
   ✓ (pwa) Building the custom worker to public/worker-[hash].js
   ```

3. **Deploy the built app to production**

4. **Test on iOS devices:**
   - Open the app in Safari
   - Add to Home Screen
   - Open the installed PWA app
   - Test with various network conditions (online, offline, slow network)
   - Verify no error messages appear

### Expected Behavior:

- **When online**: App works normally with fast loading from cache
- **When offline**:
  - Navigation shows friendly "You're Offline" page with retry button
  - API calls fail gracefully with proper error messages
  - Cached content continues to work
- **No error messages** like "Response served by service worker is an error"

## Monitoring

After deployment, monitor:

1. **Service Worker Registration**: Check browser console for service worker logs
2. **Cache Version**: Verify old `school-ms-v4` caches are deleted
3. **Error Reports**: Watch for any remaining service worker errors

## Key Files

```
/worker/index.js                  # Custom iOS-compatible fallback
/next.config.js                   # PWA configuration with cache v5
/public/sw.js                     # Generated service worker (imports custom worker)
/public/sw-register.js            # Service worker registration logic
/public/worker-[hash].js          # Compiled custom worker (generated during build)
```

## Technical Notes

### Why Response.error() Fails on iOS:

`Response.error()` creates a network error response with `type: "error"`. While this is valid in the Service Worker spec, iOS Safari's PWA mode treats it as a fatal error and displays it to users, rather than handling it gracefully like other browsers.

### Why Our Solution Works:

By returning proper HTTP responses (with status codes like 200, 503) instead of error responses, iOS Safari can handle them correctly:
- 200 OK: Content is available (even if it's a fallback/offline page)
- 503 Service Unavailable: Service temporarily unavailable (graceful degradation)

These responses don't trigger iOS's error UI and allow the app to continue functioning.

## Rollback Plan

If issues arise, you can rollback by:

1. Reverting `next.config.js` cache version back to `v4`
2. Removing the `worker/index.js` file
3. Rebuilding the app

However, this will bring back the original iOS error issue.

## Future Improvements

- Monitor iOS service worker logs for any new issues
- Consider adding offline indicators in the UI
- Add analytics to track offline usage patterns
- Implement background sync for offline actions

---

**Date Fixed**: 2026-01-19
**Affected Versions**: iOS Safari PWA mode (all versions)
**Resolution**: Custom service worker fallback implementation
