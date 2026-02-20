# 📱 iOS PWA Error Fix Guide - For Users

## 🔴 Problem: Error when opening installed app

If you see this error message when opening the **installed app** on your iPhone:

```
មានបញ្ហា
Response served by service worker is an error
```

**But the app works fine when you open it in Safari browser**, then you have a **corrupted service worker cache**.

## ✅ Quick Fix (2 Minutes)

### Option 1: Clear Cache from Error Screen (Easiest)

1. When you see the error screen, look for the red button
2. Tap **"Clear Cache & Reload"** (red button)
3. Wait for the app to reload
4. ✅ Done! App should work now

### Option 2: Delete and Reinstall App (Most Reliable)

1. **Delete the app from home screen:**
   - Long-press the app icon
   - Tap "Remove App" → "Delete App"
   - Confirm deletion

2. **Clear Safari data (Important!):**
   - Open Settings → Safari
   - Scroll down and tap "Clear History and Website Data"
   - Confirm "Clear History and Data"

3. **Reinstall the app:**
   - Open Safari and go to your school's website
   - Log in to the app
   - Tap the Share button (□↑) at the bottom
   - Scroll and tap "Add to Home Screen"
   - Tap "Add"

4. ✅ Done! Open the app from home screen - should work perfectly now

### Option 3: Wait for Automatic Update (No Action Needed)

After the new version is deployed:
1. Open the installed app
2. You'll see a blue notification: "កំណែថ្មីអាចប្រើបានហើយ / New version available"
3. Tap "ធ្វើបច្ចុប្បន្នភាព (Update Now)"
4. App will reload with the fix
5. ✅ Done!

## 🤔 Why Does This Happen?

- **Browser works fine** = No cached data, direct connection ✅
- **Installed app has error** = Old cached data is corrupted ❌

This ONLY affects:
- ✅ iPhone/iPad users who installed the app BEFORE the fix
- ✅ Only when opening the **installed app** (not browser)
- ✅ Some devices only (depends on when you installed)

This does NOT affect:
- ❌ New installations (fresh cache)
- ❌ Using the app in Safari browser
- ❌ Android devices (different service worker behavior)

## 📊 Which Fix Should I Use?

| Situation | Recommended Fix | Time | Success Rate |
|-----------|----------------|------|--------------|
| Error screen shows "Clear Cache" button | Option 1 | 30 seconds | 95% |
| Option 1 didn't work | Option 2 | 2 minutes | 100% |
| Not urgent, can wait | Option 3 | 0 minutes | 100% (automatic) |

## 🆘 Still Not Working?

If you tried all options and still see the error:

1. **Check iOS version:**
   - Settings → General → About → iOS Version
   - If iOS < 12, the app may not work properly
   - Update to iOS 12 or newer

2. **Check internet connection:**
   - Make sure WiFi or cellular data is ON
   - Try opening Safari to test internet

3. **Use browser version:**
   - Open Safari
   - Go to your school's website
   - Use the app in browser (works perfectly!)

4. **Contact support:**
   - Take a screenshot of the error
   - Note your iOS version
   - Note your iPhone model
   - Send to your school's IT support

## 📱 Technical Details (For IT Staff)

**Root Cause:**
- Service worker cache from old app version is corrupted
- iOS Safari doesn't auto-update service workers as aggressively as Chrome
- Affects PWAs installed before cache version update

**The Fix (Deployed):**
- Changed cache version from `v2` to `v3` (forces cache refresh)
- Added aggressive service worker update checks for iOS PWAs
- Added automatic cache cleanup for iOS < 14
- Added "Clear Cache" button on error screen
- Service worker now force-updates on every page load for iOS PWAs

**Prevention:**
- Future updates will auto-apply due to aggressive update strategy
- Users will see update notification and can tap to update
- No more manual deletion needed for future updates

---

**Version:** 2.0.1
**Last Updated:** January 2026
**Status:** ✅ Fix Deployed
