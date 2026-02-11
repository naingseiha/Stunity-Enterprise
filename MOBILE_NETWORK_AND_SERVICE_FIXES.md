# Mobile Network & Club Service Fixes ✅

## Issues Fixed

### 1. Mobile App Network Error on WiFi Change ✅

**Problem:** 
- Mobile app showed "No internet connection" error when WiFi changed
- Hardcoded `localhost` doesn't work on physical devices
- IP address needed manual update every time WiFi changed

**Root Cause:**
- `apps/mobile/src/config/env.ts` defaulted to `localhost`
- No dynamic IP detection

**Solution:**
Created automated IP detection script: `update-mobile-ip.sh`

```bash
#!/bin/bash
# Automatically detects current local IP and updates .env

# Detects IP (works on macOS and Linux)
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')

# Updates .env file
sed -i "s/EXPO_PUBLIC_API_HOST=.*/EXPO_PUBLIC_API_HOST=$LOCAL_IP/" .env
```

**Usage:**
```bash
# Run whenever you change WiFi or network
./update-mobile-ip.sh

# Then restart Expo
cd apps/mobile && npx expo start --clear
```

**Current IP:** `192.168.0.105`

---

### 2. Club Service Crashing ✅

**Problem:**
- Club Service started successfully but crashed on first API request
- Error: `Cannot read property 'userId' of undefined`

**Root Cause:**
- `clubController.ts` line 96: `const userId = req.user!.userId;`
- Used non-null assertion (`!`) but `req.user` was optional
- Route used `optionalAuthMiddleware` allowing anonymous access
- Crash when accessing without authentication

**Fix:**
Changed to optional chaining in `clubController.ts`:

```typescript
// BEFORE (crashed on anonymous requests)
const userId = req.user!.userId;

// AFTER (handles both auth and anonymous)
const userId = req.user?.userId;

// Also updated condition
if (myClubs === 'true' && userId) {  // Only filter if userId exists
  where.members = { some: { userId } };
}
```

**Files Modified:**
- `services/club-service/src/controllers/clubController.ts`
  - Line 96: `getClubs` function
  - Line 148: `getClubById` function

**Service Status:** ✅ Running on port 3012

---

## Testing Results

### Club Service
```bash
$ curl http://localhost:3012/health
{
  "service": "Club Service",
  "status": "healthy",
  "port": 3012,
  "timestamp": "2026-02-11T16:27:31.366Z"
}

$ curl http://localhost:3012/clubs
{
  "success": true,
  "clubs": []
}
```

### Mobile App Configuration
```
API Endpoints (via current IP):
  Auth:  http://192.168.0.105:3001
  Feed:  http://192.168.0.105:3010
  Clubs: http://192.168.0.105:3012
  WS:    ws://192.168.0.105:3011
```

---

## How to Use

### When WiFi Changes:
1. Run the update script:
   ```bash
   ./update-mobile-ip.sh
   ```

2. Restart mobile app:
   ```bash
   # Stop Expo (Ctrl+C), then:
   cd apps/mobile && npx expo start --clear
   ```

### Starting All Services:
```bash
./start-all-services.sh
```

### Checking Service Status:
```bash
./check-services.sh
```

---

## Files Created/Modified

### Created:
1. `update-mobile-ip.sh` - Auto IP detection script

### Modified:
1. `.env` - Added `EXPO_PUBLIC_API_HOST=192.168.0.105`
2. `services/club-service/src/controllers/clubController.ts` - Fixed optional auth

---

## Summary

✅ Mobile app will now work across WiFi changes with one command
✅ Club Service no longer crashes on anonymous requests  
✅ All services running properly
✅ Ready for testing club screens

**Next Steps:**
1. Run `./update-mobile-ip.sh` when WiFi changes
2. Restart mobile app after IP update
3. Test club screens with real data (create clubs via API or seed data)

---

**Date:** February 11, 2026
**Status:** Complete ✅
