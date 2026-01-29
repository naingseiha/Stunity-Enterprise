# PWA Update Instructions - How to Clear Cache and See New Design

## What Was Fixed

### 1. Mobile Grades Summary Screen ✅

- **New Component**: `MobileGradeSummary.tsx` with modern, clean UI
- **Features**:
  - Gradient stat cards (average, highest, lowest, pass rate)
  - Collapsible filters to save screen space
  - Beautiful student cards with rankings
  - Import/Export functionality
  - Color-coded grade levels (A-F)

### 2. Grade Entry Fixes ✅

- Fixed API call to use proper `gradeApi.bulkSaveGrades()` method
- Added validation for empty scores
- Improved error messages in Khmer & English
- Better success feedback with count

### 3. PWA Cache Busting ✅

- Updated `manifest.json` version to `2.0.0`
- Updated `package.json` version to `2.0.0`
- These version bumps will force PWA update

---

## How to See the New Design on Mobile

### Method 1: Clear PWA Cache (RECOMMENDED)

#### For iPhone/Safari:

1. **Close the PWA app completely** (swipe up to close)
2. **Open Safari browser** (not the PWA app)
3. Go to: `Settings` → `Safari` → `Advanced` → `Website Data`
4. Search for your app domain (e.g., `schoolapp.vercel.app`)
5. **Swipe left and Delete** the website data
6. Close Safari completely
7. **Hard refresh Safari**:
   - Open Safari and go to your app URL
   - Pull down and hold to refresh
   - Or tap the refresh button multiple times
8. Now **re-install the PWA**:
   - Tap the Share button
   - Select "Add to Home Screen"
9. Open the new PWA app

#### For Android/Chrome:

1. **Close the PWA app** completely
2. **Open Chrome browser** (not the PWA app)
3. Go to: `Settings` → `Privacy and security` → `Clear browsing data`
4. Select:
   - ✅ Cached images and files
   - ✅ Cookies and site data
5. **Time range**: "All time"
6. Tap **Clear data**
7. Close Chrome completely
8. **Hard refresh Chrome**:
   - Open Chrome and go to your app URL
   - Pull down to refresh multiple times
9. Now **re-install the PWA**:
   - Tap the menu (⋮)
   - Select "Install app" or "Add to Home screen"
10. Open the new PWA app

---

### Method 2: Force Update Through Browser

#### For iPhone:

1. Close the PWA app completely
2. Open Safari browser
3. Go to your app URL directly in Safari
4. Force reload: **Hold Shift + tap Refresh** (if you have a keyboard)
   - Or clear Safari cache (Settings → Safari → Clear History and Website Data)
5. After the page loads with new design, re-add to home screen

#### For Android:

1. Close the PWA app completely
2. Open Chrome browser
3. Go to your app URL
4. Tap menu (⋮) → Settings → Privacy and security
5. Tap "Clear browsing data"
6. Select "Cached images and files" → Clear
7. Back to the app, pull down to refresh
8. Re-install PWA from Chrome

---

### Method 3: Developer Tools (Advanced)

#### On Desktop Chrome (for testing):

1. Open the app in Chrome
2. Press `F12` to open DevTools
3. Go to **Application** tab
4. On left sidebar, find:
   - **Service Workers** → Click "Unregister"
   - **Cache Storage** → Right-click each cache → Delete
   - **Local Storage** → Right-click → Clear
5. Close DevTools
6. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

#### On Mobile Chrome (for testing):

1. Open the app in mobile Chrome
2. Type in address bar: `chrome://serviceworker-internals/`
3. Find your app and click **Unregister**
4. Go back to app and refresh

---

## After Updating - What to Test

### ✅ Grade Entry (for Teachers)

**Path**: `/grade-entry` or tap "បញ្ចូលពិន្ទុ" from mobile nav

**Test:**

1. Select a class you teach
2. Select month and year
3. Navigate between students using arrows
4. Enter scores for subjects (should validate max score)
5. Tap "រក្សាទុក • Save All"
6. Should see success message with count: "រក្សាទុកបាន X ពិន្ទុ"

**Expected Behavior:**

- Only shows classes you teach
- All subjects displayed
- Can input scores 0 to max score
- Validates input (no negative, no exceed max)
- Shows total and average immediately
- Save shows success count

---

## Common Issues & Solutions

### Issue 1: Still seeing old design after clearing cache

**Solution:**

- Make sure you **completely closed** the PWA app (not just minimized)
- Try **airplane mode for 10 seconds**, then turn back on
- Restart your phone
- Delete the PWA app icon, clear browser cache, then re-install

### Issue 2: Grade entry not saving

**Solution:**

- Check internet connection
- Make sure you selected a class first
- Make sure you entered at least one score
- Check console for error messages
- Verify API backend is running

### Issue 3: PWA not showing update

**Solution:**

- The PWA uses `skipWaiting: true` which should auto-update
- If not, delete the app and re-install
- Clear ALL browser data for the domain
- Make sure Vercel deployment finished successfully

### Issue 4: Features not working

**Solution:**

- Check browser console (F12) for errors
- Verify you're on the latest deployment (check version in footer or settings)
- Try in regular browser first (not PWA) to isolate the issue
- Check API connection (should show in Network tab)

---

## Technical Details

### Changes Made:

1. **src/components/mobile/grades/MobileGradeSummary.tsx** - NEW FILE

   - Complete redesign with modern UI
   - Gradient cards, collapsible sections
   - Full feature parity with desktop

2. **src/app/grades/page.tsx** - UPDATED

   - Added device detection
   - Routes to mobile component on mobile devices

3. **src/components/mobile/grades/MobileGradeEntry.tsx** - FIXED

   - Now uses proper `gradeApi.bulkSaveGrades()` method
   - Better validation and error handling
   - Improved success messages

4. **public/manifest.json** - UPDATED

   - Version bumped to `2.0.0`

5. **package.json** - UPDATED
   - Version bumped to `2.0.0`

### Version Numbers:

- **App Version**: 2.0.0
- **PWA Manifest Version**: 2.0.0
- **Last Updated**: 2025-12-21

---

## Deployment Checklist

Before pushing to production:

- ✅ All TypeScript errors fixed
- ✅ Build succeeds (`npm run build`)
- ✅ Mobile responsive design tested
- ✅ Grade entry functionality tested
- ✅ Grades summary functionality tested
- ✅ Version numbers updated
- ✅ PWA manifest updated

After deploying to Vercel:

- ✅ Wait for deployment to complete (check Vercel dashboard)
- ✅ Open the app URL in browser (not PWA) to verify new version
- ✅ Check browser console for any errors
- ✅ Clear PWA cache on mobile devices
- ✅ Re-install PWA
- ✅ Test all functionality

---

## Support

If you continue to see the old design:

1. Check Vercel deployment status
2. Verify the build includes the new files
3. Check the browser console for errors
4. Try accessing via browser URL first (not PWA)
5. Use Chrome DevTools to inspect service worker status

For development testing:

- Use `npm run dev` locally
- PWA is disabled in development mode
- Use responsive mode in Chrome DevTools (F12 → Toggle device toolbar)

---

**Last Updated**: December 21, 2025
**Version**: 2.0.0
**Author**: School Management System Team
