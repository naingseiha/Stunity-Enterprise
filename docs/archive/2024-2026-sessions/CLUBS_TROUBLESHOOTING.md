# Clubs Screen Troubleshooting Guide

## Issue: Blank Clubs Screen

### Root Cause ✅ FIXED
The backend API returns:
```json
{
  "success": true,
  "clubs": [...]
}
```

But the mobile app was expecting just the array directly:
```json
[...]
```

### Fix Applied
Updated `apps/mobile/src/api/clubs.ts`:
```typescript
// Before (broken)
return response.data;

// After (fixed)
return response.data.clubs || response.data;
```

This handles both response formats safely.

---

## How to Test the Fix

### 1. Reload the Mobile App
**Option A: Using Terminal**
- Find the terminal running Expo
- Press `r` to reload

**Option B: Using Device/Simulator**
- Shake device (physical phone)
- Tap "Reload" in the menu
- OR press `Cmd+R` (iOS Simulator)

### 2. Navigate to Clubs
- Open the sidebar (tap menu icon)
- Tap "Clubs"

### 3. Expected Result ✅
You should see:
- 10 club cards
- Each with name, description, member count, creator
- Filter tabs at top (All, My Clubs, Discover)
- Type filters (Study Groups, Classes, Projects, Exam Prep)

### 4. Pull to Refresh
- Pull down on the list
- Should refresh and show same 10 clubs

---

## If Still Blank

### Check 1: Backend Service Running
```bash
curl http://192.168.18.73:3012/clubs
```

**Expected:** JSON response with `success: true, clubs: [...]`

**If fails:** Start the club service:
```bash
cd services/club-service
npm start
```

### Check 2: Mobile App Logs
Look for:
```
🚀 [API] GET /clubs
```

**If you see error:** Check the error message
- `ECONNABORTED` = Network timeout (check WiFi)
- `404` = Service not running (start backend)
- `401` = Not authenticated (login again)

### Check 3: Network Connection
Ensure mobile app and backend are on same WiFi network:
```bash
# Get current IP
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Should match the IP in Expo console.

### Check 4: Data in Database
```bash
cd services/club-service
node seed-clubs.js
```

Should output:
```
✅ Created club: Advanced Mathematics Study Group
✅ Created club: Physics 101 - Spring 2026
...
🎉 Successfully seeded 10 clubs!
```

---

## Quick Test Commands

### Test API Directly
```bash
# Get all clubs
curl http://192.168.18.73:3012/clubs | python3 -m json.tool | head -50

# Check response structure
curl -s http://192.168.18.73:3012/clubs | python3 -c "import json, sys; data=json.load(sys.stdin); print('Keys:', list(data.keys())); print('Club count:', len(data.get('clubs', [])))"
```

**Expected output:**
```
Keys: ['success', 'clubs']
Club count: 10
```

### Verify Service Health
```bash
# Check if service is running
lsof -i :3012

# Check service logs (if started with script)
tail -f /tmp/club-service.log
```

---

## Mobile App Debug Steps

### 1. Enable React DevTools
In Expo:
- Press `d` to open developer menu
- Enable "Debug Remote JS"
- Open Chrome DevTools

### 2. Check Network Tab
- Open React DevTools Network tab
- Navigate to Clubs screen
- Should see: `GET /clubs` request
- Check response body

### 3. Add Console Logs
Temporary debug in `ClubsScreen.tsx`:
```typescript
const fetchClubs = useCallback(async () => {
  try {
    console.log('📱 Fetching clubs...');
    const data = await clubsApi.getClubs(params);
    console.log('📱 Clubs data:', data);
    console.log('📱 Clubs count:', data?.length);
    setClubs(data);
  } catch (err) {
    console.error('📱 Error:', err);
  }
}, []);
```

---

## Common Issues & Solutions

### Issue: Empty Array Returned
**Cause:** Database has no clubs  
**Fix:** Run seed script
```bash
cd services/club-service && node seed-clubs.js
```

### Issue: "Cannot read property 'clubs'"
**Cause:** API response structure changed  
**Fix:** Already applied - reload app

### Issue: Network timeout
**Cause:** WiFi changed or backend not running  
**Fix:** 
1. Check backend running: `lsof -i :3012`
2. Restart backend: `cd services/club-service && npm start`
3. Wait 5-15s for auto-recovery

### Issue: 401 Unauthorized
**Cause:** Token expired or invalid  
**Fix:** 
1. Logout and login again
2. OR pull to refresh (triggers token refresh)

---

## Success Checklist

After reloading, you should see:

- [x] Clubs screen loads without errors
- [x] 10 clubs visible in list
- [x] Each club shows name, description, members
- [x] Creator name displays (e.g., "Test User")
- [x] Type badges show correct colors
- [x] Filter tabs are tappable
- [x] Type filters work
- [x] Pull to refresh works
- [x] Join buttons appear on each card
- [x] Tapping card navigates to details (may be blank if not implemented)

---

## API Response Format (Reference)

### Correct Format (Current)
```json
{
  "success": true,
  "clubs": [
    {
      "id": "cmlis8uj90001hgp39t7ml80z",
      "name": "Advanced Mathematics Study Group",
      "description": "Weekly study sessions...",
      "type": "CASUAL_STUDY_GROUP",
      "mode": "PUBLIC",
      "creator": {
        "id": "...",
        "firstName": "Test",
        "lastName": "User",
        "profilePictureUrl": null
      },
      "memberCount": 1,
      "tags": ["Mathematics", "Calculus"],
      "isActive": true,
      "createdAt": "2026-02-12T01:31:12.401Z",
      "updatedAt": "2026-02-12T01:31:12.401Z"
    }
  ]
}
```

### Mobile App Expects
```typescript
Club[] = [
  {
    id: string,
    name: string,
    description: string,
    type: 'CASUAL_STUDY_GROUP' | 'STRUCTURED_CLASS' | 'PROJECT_GROUP' | 'EXAM_PREP',
    mode: 'PUBLIC' | 'INVITE_ONLY' | 'APPROVAL_REQUIRED',
    creator: { ... },
    memberCount: number,
    ...
  }
]
```

### The Fix
```typescript
// Extracts clubs array from response wrapper
return response.data.clubs || response.data;
```

---

## Need More Help?

1. Check console logs in both:
   - Metro bundler (mobile logs)
   - Backend terminal (API logs)

2. Verify all services running:
   ```bash
   cd /path/to/project
   ./health-check.sh
   ```

3. Re-seed database if needed:
   ```bash
   cd services/club-service
   node seed-clubs.js
   ```

4. Restart everything:
   ```bash
   ./restart-all-services.sh
   ```

---

**Last Updated:** February 12, 2026  
**Status:** ✅ Fixed in commit `399cafe`  
**Action Required:** Reload mobile app (`r` in terminal or shake device)
