# Deploy iOS PWA Fix

## Quick Fix for Users Experiencing Errors

### Option 1: Force Service Worker Update (Recommended)
Tell affected users to:
1. **Delete the PWA app** from their home screen
2. **Clear Safari cache**: Settings → Safari → Clear History and Website Data
3. **Reinstall the PWA** by visiting the website in Safari and "Add to Home Screen"

This forces iOS to download the new service worker (v5) with the fix.

### Option 2: Wait for Auto-Update (Takes 24-48 hours)
The new service worker will automatically update when users:
- Open the app multiple times
- Connect to stable internet for a few minutes
- The aggressive update check kicks in

## Deployment Steps

### 1. Check Your Current Branch
```bash
git status
```

You're currently on `improve_profile` branch. The fix is in the `main` branch.

### 2. Deploy to Production

#### If using Vercel:
```bash
# Merge your changes to main
git checkout main
git merge improve_profile

# Push to trigger deployment
git push origin main
```

#### If using manual deployment:
```bash
# Build the app
npm run build

# Deploy the /public folder contents to your server
# Make sure these files are deployed:
# - /public/sw.js (service worker v5)
# - /public/worker-3a6b661964fc955b.js (custom iOS fallback)
# - /public/sw-register.js (registration script)
```

### 3. Verify Deployment

After deployment, check:
```bash
# Visit your production URL
# Open browser console (F12)
# Look for these messages:

[SW Register] Service worker registered: /
[Custom SW] iOS-compatible service worker loaded
[Custom SW] Fallback function defined - will never return Response.error()
```

### 4. Test on iOS Device

1. Open Safari on iOS
2. Clear website data: Settings → Safari → Advanced → Website Data → Remove All
3. Visit your site
4. Add to Home Screen
5. Open the PWA app
6. Should work without errors

## What Changed

- ✅ **Cache version**: Updated from `school-ms-v4` to `school-ms-v5`
- ✅ **Custom fallback**: Never returns `Response.error()` - uses proper HTTP responses
- ✅ **Aggressive update**: Forces iOS devices to update service worker
- ✅ **Offline page**: Returns friendly HTML instead of errors

## Monitoring After Deployment

Check for these in production:
1. Service worker registration success
2. Old cache (v4) being deleted
3. New cache (v5) being created
4. No more "Response served by service worker is an error" messages

## Emergency Rollback

If issues occur (unlikely):
```bash
# Revert to previous commit
git revert <commit-hash>
git push origin main
```

## User Support Message (Khmer/English)

Send to affected users:

---

**ជូនជ្រាបអ្នកប្រើប្រាស់ iOS**

យើងបានដោះស្រាយបញ្ហាកំហុសលើឧបករណ៍ iPhone/iPad មួយចំនួនរួចហើយ។ 

សូមធ្វើដូចខាងក្រោម:
1. លុបកម្មវិធីពីអេក្រង់ Home
2. Settings → Safari → Clear History and Website Data
3. បើកគេហទំព័រនិងបញ្ចូល "Add to Home Screen" ម្តងទៀត

**For iOS Users**

We've fixed the error issue affecting some iPhone/iPad devices.

Please:
1. Delete the app from your Home Screen
2. Settings → Safari → Clear History and Website Data  
3. Re-visit the website and "Add to Home Screen"

---

## Timeline

- ✅ Fix developed: Jan 19, 2026
- ⏳ **Deploy to production**: Do this now
- ⏳ Users update: 24-48 hours after deployment
