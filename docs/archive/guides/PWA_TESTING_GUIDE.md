# PWA Testing Guide - School Management System

## 📋 Table of Contents

- [Pre-Testing Checklist](#pre-testing-checklist)
- [Desktop Testing (Chrome/Edge)](#desktop-testing-chromeedge)
- [Android Testing](#android-testing)
- [iOS Testing](#ios-testing)
- [Offline Testing](#offline-testing)
- [Performance Testing](#performance-testing)
- [Common Issues & Solutions](#common-issues--solutions)

---

## Pre-Testing Checklist

Before testing, ensure you have:

- ✅ Built the application: `npm run build`
- ✅ Generated iOS splash screens: `npm run generate:splash`
- ✅ Updated `.env.local` with proper URLs (for production testing)
- ✅ Tested on HTTPS (required for service workers in production)
- ✅ Cleared browser cache and service workers from previous tests

---

## Desktop Testing (Chrome/Edge)

### 1. Initial Setup

```bash
# Build the app
npm run build
npm start

# Or for development (PWA disabled in dev mode)
npm run dev
```

### 2. Lighthouse PWA Audit

1. Open Chrome DevTools (F12)
2. Go to **Lighthouse** tab
3. Select:
   - ✅ Progressive Web App
   - ✅ Performance
   - ✅ Accessibility
4. Click **"Generate report"**

**Expected Results:**
- PWA Score: ≥ 90
- Performance: ≥ 80
- Accessibility: ≥ 90

### 3. Service Worker Testing

1. Open DevTools → **Application** tab
2. Click **Service Workers**
3. Verify:
   - ✅ Service worker is **activated and running**
   - ✅ Status shows "activated"
   - ✅ "Update on reload" is available

### 4. Cache Inspection

1. DevTools → **Application** → **Cache Storage**
2. Check for these caches:
   - `workbox-precache-v2`
   - `static-assets`
   - `static-image-assets`
   - `static-font-assets`
   - `google-fonts-stylesheets` (if applicable)
   - `google-fonts-webfonts` (if applicable)

### 5. Manifest Testing

1. DevTools → **Application** → **Manifest**
2. Verify:
   - ✅ Name: "School Management System - ប្រព័ន្ធគ្រប់គ្រងសាលារៀន"
   - ✅ Short name: "School MS"
   - ✅ Start URL: "/"
   - ✅ Display: "standalone"
   - ✅ Theme color: "#6366f1"
   - ✅ Icons: 12 icons loaded
   - ✅ Shortcuts: 3 shortcuts (Grade Entry, Attendance, Reports)

### 6. Install App

1. Look for **install icon** in address bar (⊕ or install icon)
2. Click to install
3. Verify:
   - ✅ Install dialog appears
   - ✅ App icon is correct
   - ✅ App name is displayed
4. Click **"Install"**
5. Desktop app should open in standalone window
6. Check:
   - ✅ No browser UI (address bar, tabs)
   - ✅ App icon in taskbar/dock
   - ✅ Window title shows "School MS"

### 7. Install Prompt Component

1. If not installed, wait 3 seconds
2. Verify:
   - ✅ Install prompt banner appears at bottom-right
   - ✅ "Install" button works
   - ✅ "Not now" button dismisses banner
   - ✅ X button closes banner
   - ✅ Banner doesn't reappear for 7 days after dismissal

---

## Android Testing

### Prerequisites
- Android device (physical or emulator)
- Chrome browser installed
- Connected to same network (for local testing) OR deployed to HTTPS

### 1. Access the App

**Option A: Local Testing**
```
1. Find your computer's local IP: ipconfig (Windows) or ifconfig (Mac/Linux)
2. On Android Chrome, navigate to: http://YOUR_IP:3000
```

**Option B: Production Testing**
```
Navigate to your production URL (must be HTTPS)
```

### 2. Install App on Android

1. Open the app in Chrome
2. Look for **"Add to Home Screen"** prompt
   - Should appear automatically after 3 seconds
3. Alternative: Chrome menu (⋮) → **"Add to Home Screen"** or **"Install app"**
4. Tap **"Add"** or **"Install"**

### 3. Verify Installation

1. Check home screen for app icon
2. App icon should be:
   - ✅ Clear and visible
   - ✅ 192×192 or 512×512 (sharp, not blurry)
   - ✅ Maskable icons work correctly (no clipping)

3. Long-press app icon → **App info**
   - ✅ App name: "School Management System" or "School MS"
   - ✅ Storage shows app is installed

### 4. Launch App

1. Tap app icon from home screen
2. Verify:
   - ✅ Splash screen appears (white screen is a fail)
   - ✅ Theme color in status bar (#6366f1 - indigo)
   - ✅ App opens in full screen (no browser UI)
   - ✅ Status bar is visible with theme color

### 5. Test App Shortcuts (Android 7.1+)

1. Long-press app icon
2. Verify shortcuts appear:
   - ✅ Grade Entry
   - ✅ Attendance
   - ✅ Reports
3. Tap a shortcut → should navigate to that page directly

### 6. Test Theme Color

1. Open app
2. Check status bar color:
   - ✅ Should be indigo (#6366f1)
   - ✅ Changes with system theme (light/dark) if configured

### 7. Test Standalone Mode

In the installed app:
- ✅ No Chrome address bar
- ✅ No Chrome tabs
- ✅ No browser navigation buttons
- ✅ App behaves like a native app

---

## iOS Testing

### Prerequisites
- iPhone or iPad (iOS 11.3+)
- Safari browser (PWA only works in Safari on iOS)

### 1. Access the App

**For Local Testing:**
```
1. Find your computer's local IP
2. In Safari, navigate to: http://YOUR_IP:3000
```

**For Production:**
```
Navigate to your HTTPS URL (required for iOS PWA)
```

### 2. Install App on iOS

1. Open the app in Safari
2. **Option A:** Use the install prompt (appears after 3 seconds)
   - Follow the on-screen instructions

3. **Option B:** Manual installation
   - Tap the **Share button** (square with up arrow) at bottom of Safari
   - Scroll down and tap **"Add to Home Screen"**
   - Tap **"Add"** in the top right

### 3. Verify Home Screen Icon

1. Check home screen for app icon
2. Icon should be:
   - ✅ 180×180 PNG (sharp and clear)
   - ✅ No Safari border/badge
   - ✅ Proper padding (not cut off)

### 4. Launch App

1. Tap app icon from home screen
2. **CRITICAL CHECK - Splash Screen:**
   - ✅ Custom splash screen appears (indigo background with centered icon)
   - ❌ White screen = splash screens not working
3. After splash:
   - ✅ App loads in full screen
   - ✅ Status bar visible with default style

### 5. Test Standalone Mode

In the installed app:
- ✅ No Safari address bar
- ✅ No Safari navigation buttons
- ✅ No Safari toolbar at bottom
- ✅ Status bar shows app title "School MS"

### 6. Test Device Rotation (iPad)

1. Rotate device to landscape
2. Verify:
   - ✅ Landscape splash screen loads (if applicable)
   - ✅ App rotates properly
   - ✅ Layout adapts to landscape mode

### 7. Test Multiple Devices

Test on various iOS devices to verify splash screens:
- ✅ iPhone SE (640×1136)
- ✅ iPhone 8 (750×1334)
- ✅ iPhone X/11 Pro (1125×2436)
- ✅ iPhone 12/13/14 (1170×2532)
- ✅ iPhone 14 Pro Max (1290×2796)
- ✅ iPad (various sizes)

### 8. iOS-Specific Issues

**Common iOS PWA Limitations:**
- ❌ No push notifications (not supported on iOS)
- ❌ No background sync (not supported on iOS)
- ⚠️ Service worker limitations (basic caching only)
- ⚠️ Camera/media access may require permissions dialog
- ✅ Offline mode works (with limitations)

---

## Offline Testing

### 1. Test Offline Functionality

**Method 1: DevTools (Desktop)**
1. Open DevTools → **Network** tab
2. Change throttling to **"Offline"**
3. Reload page
4. Verify:
   - ✅ App loads from cache
   - ✅ Cached pages are accessible
   - ✅ Error message for uncached pages
   - ✅ Offline page appears for navigation failures

**Method 2: Airplane Mode (Mobile)**
1. Install the app
2. Enable **Airplane mode**
3. Open the app
4. Verify:
   - ✅ App launches successfully
   - ✅ Previously cached pages load
   - ✅ Offline page shown when navigating to uncached routes
   - ✅ "You're Offline" page appears with helpful message

### 2. Test Cache Strategy

**Static Assets (StaleWhileRevalidate)**
1. Load the app online
2. Go offline
3. Reload page
4. Expected:
   - ✅ CSS/JS loads from cache
   - ✅ Images load from cache
   - ✅ Fonts load from cache

**API Calls (NetworkOnly)**
1. Load a page with API data
2. Go offline
3. Try to fetch new data
4. Expected:
   - ❌ API calls fail (expected behavior)
   - ✅ Offline page or error message shown
   - ✅ Cached data may still be visible (if app implements local storage)

### 3. Test Offline Fallback Page

1. Go offline
2. Navigate to an uncached page
3. Verify:
   - ✅ `/offline` page loads
   - ✅ Shows WiFi off icon
   - ✅ "You're Offline" message in English and Khmer
   - ✅ "Try Again" button present
   - ✅ Helpful reconnection tips displayed

### 4. Test Online Recovery

1. While offline, try to use the app
2. Re-enable internet connection
3. Click **"Try Again"** on offline page
4. Expected:
   - ✅ App detects connection
   - ✅ Navigates back to requested page
   - ✅ Service worker syncs/updates cache
   - ✅ Full functionality restored

---

## Performance Testing

### 1. Lighthouse Performance Audit

Run Lighthouse with Performance category:
- **Target Scores:**
  - First Contentful Paint: < 1.5s
  - Time to Interactive: < 3.5s
  - Speed Index: < 4.0s
  - Total Blocking Time: < 300ms
  - Cumulative Layout Shift: < 0.1

### 2. Network Speed Testing

Test on various network speeds:
1. DevTools → Network → Throttling
2. Test with:
   - ✅ Fast 3G
   - ✅ Slow 3G
   - ✅ Offline
3. Verify app remains usable on slow connections

### 3. Cache Performance

1. First visit (no cache):
   - Measure load time
   - Check network requests

2. Second visit (with cache):
   - Should be significantly faster
   - Fewer network requests
   - Resources served from cache

---

## Common Issues & Solutions

### Issue 1: Service Worker Not Registering

**Symptoms:**
- No service worker in DevTools
- PWA install prompt doesn't appear

**Solutions:**
```bash
# Check if you're in development mode (PWA disabled)
# Build and run production mode
npm run build
npm start

# Clear browser cache and service workers
# DevTools → Application → Clear storage → Clear site data
```

### Issue 2: iOS Splash Screens Not Showing

**Symptoms:**
- White screen during app launch on iOS
- No custom splash screen

**Solutions:**
```bash
# Regenerate splash screens
npm run generate:splash

# Rebuild the app
npm run build

# Check that splash screens exist
ls -la public/splash/

# Verify meta tags in layout.tsx
# Make sure all apple-touch-startup-image links are present
```

### Issue 3: Install Prompt Not Appearing

**Symptoms:**
- No install banner/button
- Browser doesn't show install option

**Solutions:**
1. **Check PWA criteria:**
   - ✅ Served over HTTPS (or localhost)
   - ✅ Manifest file is valid
   - ✅ Service worker is registered
   - ✅ Has valid icons

2. **Check local storage:**
   ```javascript
   // Open DevTools Console
   localStorage.getItem('pwa-install-dismissed')
   // If set, remove it:
   localStorage.removeItem('pwa-install-dismissed')
   ```

3. **Check if already installed:**
   - PWA won't prompt if already installed
   - Uninstall and try again

### Issue 4: Icons Not Loading

**Symptoms:**
- Broken icon images
- Default browser icon shown

**Solutions:**
```bash
# Verify icons exist
ls -la public/icons/

# Check icon sizes match manifest.json
# Regenerate icons if needed

# Check icon paths in manifest.json
# Should be /icons/icon-XXxXX.png (not ./icons/)
```

### Issue 5: Offline Mode Not Working

**Symptoms:**
- App doesn't work offline
- Service worker not caching properly

**Solutions:**
1. **Rebuild service worker:**
   ```bash
   # Delete old service worker
   rm public/sw.js public/workbox-*.js

   # Rebuild
   npm run build
   ```

2. **Check cache strategies in next.config.js**
3. **Verify fallback document is set to '/offline'**
4. **Check Network panel for cache hits**

### Issue 6: Update Not Showing

**Symptoms:**
- App doesn't update after deployment
- Old version still showing

**Solutions:**
1. **Unregister old service worker:**
   ```javascript
   // DevTools Console
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(reg => reg.unregister())
   })
   ```

2. **Hard refresh:**
   - Windows/Linux: Ctrl + Shift + R
   - Mac: Cmd + Shift + R

3. **Clear cache:**
   - DevTools → Application → Clear storage

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Update `NEXT_PUBLIC_APP_URL` in `.env` to production URL
- [ ] Update `NEXT_PUBLIC_API_URL` in `.env` to production API
- [ ] Update `robots.txt` sitemap URL
- [ ] Verify all icons are generated and optimized
- [ ] Run `npm run generate:splash` for iOS splash screens
- [ ] Test on HTTPS (required for service workers)
- [ ] Run Lighthouse audit (scores > 90)
- [ ] Test on multiple devices (iOS, Android, Desktop)
- [ ] Verify offline functionality works
- [ ] Test install flow on all platforms
- [ ] Check manifest.json is accessible at `/manifest.json`
- [ ] Verify service worker is registered at `/sw.js`

---

## Testing Checklist

### Desktop
- [ ] PWA installable from browser
- [ ] Service worker registered and active
- [ ] Manifest file valid
- [ ] Icons display correctly
- [ ] Offline mode works
- [ ] Cache strategies work
- [ ] Install prompt appears
- [ ] App runs in standalone mode after install

### Android
- [ ] Add to Home Screen works
- [ ] App icon appears on home screen
- [ ] Splash screen shows (not white screen)
- [ ] Theme color in status bar
- [ ] Standalone mode (no browser UI)
- [ ] App shortcuts work
- [ ] Maskable icons work
- [ ] Offline mode works

### iOS
- [ ] Add to Home Screen from Safari works
- [ ] App icon appears on home screen (180×180)
- [ ] **Critical:** Custom splash screens show (not white)
- [ ] Splash screens for all device sizes
- [ ] Status bar style correct
- [ ] Standalone mode (no Safari UI)
- [ ] App title shows in status bar
- [ ] Offline mode works (with limitations)
- [ ] Landscape orientation works (iPad)

---

## Useful Commands

```bash
# Generate iOS splash screens
npm run generate:splash

# Build for production
npm run build

# Start production server
npm start

# Development mode (PWA disabled)
npm run dev

# Check service worker in browser console
navigator.serviceWorker.getRegistrations()

# Unregister all service workers
navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()))

# Check if app is in standalone mode
window.matchMedia('(display-mode: standalone)').matches

# Check cache storage
caches.keys()
```

---

## Browser DevTools Shortcuts

**Chrome/Edge:**
- F12: Open DevTools
- Ctrl+Shift+P (Cmd+Shift+P on Mac): Command palette
- Ctrl+Shift+Delete: Clear browsing data

**Safari (iOS):**
1. Settings → Safari → Advanced → Web Inspector: ON
2. Connect iPhone to Mac
3. Safari on Mac → Develop → [Your iPhone] → [Your Page]

---

## Additional Resources

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [iOS PWA Support](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- [Android PWA Documentation](https://web.dev/customize-install/)

---

**Last Updated:** December 2025
**Version:** 1.0.0
