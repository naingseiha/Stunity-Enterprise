# ✅ WiFi Network Auto-Configuration Fix

## Problem

When you switch WiFi networks, the mobile app shows `ERR_NETWORK` errors because:
1. Your computer's IP address changes (e.g., `10.103.61.191` → `192.168.0.105`)
2. The app is still configured for the old IP
3. The app can't reach your backend services

**Error you see:**
```
❌ [API] POST /auth/login - ERR_NETWORK
Login error: {"code": "NETWORK_ERROR", "message": "No internet connection..."}
```

## Root Cause

When testing on a **physical device** (iPhone 17):
- The device needs your **computer's WiFi IP** to access backend services
- When you change WiFi networks, your IP changes
- The `.env.local` file still has the old IP

**Your IPs:**
- Old: `10.103.61.191` (mobile internet)
- Current: `192.168.0.105` (current WiFi)

---

## Solution 1: Manual Update (Quick Fix)

### Step 1: Get Your Current IP
```bash
cd apps/mobile
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'
# Output: 192.168.0.105
```

### Step 2: Update .env.local
Edit `apps/mobile/.env.local`:
```bash
EXPO_PUBLIC_API_HOST=192.168.0.105  # ← Change this
```

### Step 3: Restart Expo
```bash
# Stop current server (Ctrl+C)
npm start

# On your iPhone:
# Shake device → Reload
```

✅ **Done! App should now connect**

---

## Solution 2: Automatic Update (Permanent Fix)

I created a script that **automatically detects and updates your IP**!

### Usage

**Whenever you switch WiFi networks:**
```bash
cd apps/mobile
./update-ip.sh
```

**Output:**
```
🌐 Detecting Network Configuration
Current IP: 192.168.0.105

✅ Updated .env.local

API endpoints:
  Auth:  http://192.168.0.105:3001
  Feed:  http://192.168.0.105:3010
  Club:  http://192.168.0.105:3012

⚠️  Restart Expo to apply changes
```

### What It Does
1. ✅ Detects your current WiFi IP
2. ✅ Updates `.env.local` automatically
3. ✅ Keeps history of previous IPs
4. ✅ Shows you the updated endpoints

### Make It Easier

Add to your workflow:
```bash
# Before starting mobile development:
cd apps/mobile
./update-ip.sh && npm start
```

Or create an alias in your `~/.zshrc`:
```bash
alias stunity-mobile="cd ~/Documents/Stunity-Enterprise/apps/mobile && ./update-ip.sh && npm start"
```

Then just run:
```bash
stunity-mobile
```

---

## Solution 3: Network Service Enhancement

The network service I created will now:
1. ✅ Detect when network changes
2. ✅ Queue failed requests
3. ✅ Auto-retry when network stabilizes
4. ✅ Handle brief disconnects during WiFi switch

**But it can't change the IP configuration** - that still needs to be updated in `.env.local`.

---

## Why This Happens

### iOS Simulator vs Physical Device

**iOS Simulator:**
- Can use `localhost` directly
- Shares network with your Mac

**Physical Device (iPhone 17):**
- Separate network device
- Needs your Mac's IP address
- IP changes with different WiFi networks

### Network Scenarios

| Network | Your Mac IP | What to Update |
|---------|-------------|----------------|
| Home WiFi | 192.168.0.105 | `.env.local` → `192.168.0.105` |
| Office WiFi | 10.103.61.191 | `.env.local` → `10.103.61.191` |
| Mobile Hotspot | 172.20.10.2 | `.env.local` → `172.20.10.2` |

---

## Complete Workflow

### When You Switch Networks:

```bash
# 1. Update IP configuration
cd apps/mobile
./update-ip.sh

# 2. Restart Expo (if already running)
# Press Ctrl+C to stop
npm start

# 3. Reload app on device
# Shake iPhone → Reload
```

### To Avoid This Issue:

**Option A: Use USB Connection**
```bash
# Connect iPhone via USB
# Expo will use USB connection instead of WiFi
# No IP configuration needed!
```

**Option B: Static IP**
Configure your router to give your Mac a static IP:
- Then you only configure once
- Same IP on every connection

---

## Verification

### Check Services Are Running
```bash
lsof -ti:3001 && echo "✅ Auth" || echo "❌ Auth not running"
lsof -ti:3010 && echo "✅ Feed" || echo "❌ Feed not running"  
lsof -ti:3012 && echo "✅ Club" || echo "❌ Club not running"
```

### Test Connection from Device
```bash
# From your iPhone Safari:
http://192.168.0.105:3001/health
# Should show: {"service":"auth-service","status":"healthy"...}
```

### Check Expo Console
After updating IP, you should see:
```
✅ [API] POST /auth/login - 200
```

---

## Common Issues

### Issue 1: Still Getting ERR_NETWORK

**Check:**
1. Is your Mac and iPhone on the **same WiFi**?
2. Did you **restart Expo** after updating .env.local?
3. Did you **reload the app** on device?
4. Is your Mac's **firewall blocking connections**?

**Fix firewall (if needed):**
```bash
# System Settings → Network → Firewall
# Allow incoming connections for Node
```

### Issue 2: Circular Dependency Warning

This is a **warning**, not an error. It happens because:
- React Native is detecting import cycles
- But with lazy loading, it works fine
- You can safely ignore it

To fix if it bothers you:
```typescript
// Instead of importing networkService in client.ts
// Use dynamic import when needed
const { networkService } = await import('@/services/network');
```

### Issue 3: IP Keeps Changing

**Solutions:**
1. Use the `update-ip.sh` script (fastest)
2. Set static IP on your router
3. Use USB connection instead of WiFi
4. Use ngrok/tunnel for development (advanced)

---

## Files

### Created
1. ✅ `apps/mobile/update-ip.sh` - Auto IP update script

### Modified  
2. ✅ `apps/mobile/.env.local` - Updated to `192.168.0.105`

---

## Summary

**The Problem:**
- WiFi change → IP change → App can't connect

**The Fix:**
```bash
cd apps/mobile
./update-ip.sh  # ← Run this when WiFi changes
npm start       # ← Restart Expo
# Reload app on device
```

**Current Configuration:**
- ✅ IP updated to: `192.168.0.105`
- ✅ Auto-update script created
- ✅ Network service will handle reconnection

**Try logging in again - it should work now!** 🚀
