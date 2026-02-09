# Mobile App Network Troubleshooting Guide

## Problem: API Timeout Errors on iOS Simulator

If you see timeout errors like:
```
❌ [API] GET /posts - ECONNABORTED
TIMEOUT_ERROR: Server is taking too long to respond
```

This means the mobile app can't connect to your backend server.

## Quick Fix

### 1. Update Your IP Address

When you switch WiFi networks or restart your Mac, your IP address changes. Update it:

```bash
# From the root of the project
./scripts/update-mobile-ip.sh
```

Or manually:

1. Find your IP address:
   ```bash
   ipconfig getifaddr en0
   ```

2. Update `apps/mobile/.env.local`:
   ```env
   EXPO_PUBLIC_API_HOST=YOUR_IP_ADDRESS
   ```

3. **Important:** Restart Expo dev server:
   - Press `Ctrl+C` to stop the server
   - Run `npm start` again
   - Press `r` in the terminal to reload the app

### 2. Verify Backend is Running

Make sure your backend servers are running:

```bash
# Check feed service
curl http://localhost:3010/health

# Should return: {"status":"ok"}
```

### 3. Check Firewall

If still not working, check your Mac's firewall:
- System Settings → Network → Firewall
- Make sure Node.js is allowed

## Why This Happens

### iOS Simulator vs Physical Device

- **iOS Simulator:** Runs on your Mac but in a separate environment
  - `localhost` refers to the simulator, not your Mac
  - Must use your Mac's IP address (e.g., `192.168.1.100`)

- **Physical Device:** Runs on separate hardware
  - Must use your Mac's IP address
  - Both devices must be on the same WiFi network

### When IP Changes

Your Mac's IP address changes when:
- You switch WiFi networks
- You restart your Mac
- Your router assigns a new IP (DHCP)
- You switch from WiFi to Ethernet

## Network Configuration

### Development Setup

The app uses these environment variables (from `.env.local`):

```env
EXPO_PUBLIC_API_HOST=10.103.61.191  # Your Mac's IP
```

This gets used in `src/config/env.ts`:

```typescript
const API_HOST = process.env.EXPO_PUBLIC_API_HOST || 'localhost';

const development = {
  feedUrl: `http://${API_HOST}:3010`,
  authUrl: `http://${API_HOST}:3001`,
  // ...
};
```

### Port Reference

- **3001** - Auth Service
- **3010** - Feed Service  
- **3011** - WebSocket Service

## Testing Connection

### From Your Mac

```bash
# Test feed service
curl http://10.103.61.191:3010/health

# Test with your IP
curl http://$(ipconfig getifaddr en0):3010/health
```

### From the App

The app logs API requests. Check the Expo console:
```
🚀 [API] GET /posts
✅ [API] GET /posts - 200
```

If you see timeouts, the IP is wrong or backend isn't running.

## Common Scenarios

### Scenario 1: Working Yesterday, Not Today
**Cause:** IP address changed  
**Fix:** Run `./scripts/update-mobile-ip.sh`

### Scenario 2: Works on Web, Not Mobile
**Cause:** Web uses `localhost`, mobile needs IP  
**Fix:** Update `.env.local` and restart Expo

### Scenario 3: Works on WiFi, Not on Mobile Hotspot
**Cause:** Different network = different IP  
**Fix:** Update IP for each network you use

## Advanced: Using ngrok (Optional)

For a stable URL that doesn't change:

```bash
# Install ngrok
brew install ngrok

# Expose your backend
ngrok http 3010

# Use the ngrok URL in .env.local
EXPO_PUBLIC_API_HOST=abc123.ngrok.io
```

## Automation (Recommended)

Add to your workflow:

```bash
# In package.json scripts
{
  "mobile:dev": "cd apps/mobile && npm start",
  "mobile:update-ip": "./scripts/update-mobile-ip.sh"
}
```

Run before starting mobile development:
```bash
npm run mobile:update-ip && npm run mobile:dev
```

## Still Not Working?

1. Check backend logs for incoming requests
2. Verify firewall settings
3. Try restarting the Expo dev server
4. Clear Expo cache: `npx expo start -c`
5. Restart the iOS Simulator

## Need Help?

Check the logs:
- Backend: Look for incoming requests
- Mobile: Check Expo console for API logs
- Network: Use `curl` to test connectivity
