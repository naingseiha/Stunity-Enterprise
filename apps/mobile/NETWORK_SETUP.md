# 🌐 Network Setup Guide

## Problem
The mobile app can only connect to the backend when using your mobile hotspot because it's configured with a hardcoded IP address.

## Solution
We've made the API configuration flexible using environment variables.

---

## 🚀 Quick Setup

### Step 1: Find Your IP Address

Run this command:
```bash
cd apps/mobile && bash scripts/detect-ip.sh
```

Or manually find your IP:
- **macOS**: `ipconfig getifaddr en0`
- **Windows**: `ipconfig` (look for IPv4 Address)
- **Linux**: `hostname -I`

### Step 2: Create Configuration File

Create `apps/mobile/.env.local`:
```bash
# Copy the example file
cp apps/mobile/.env.local.example apps/mobile/.env.local
```

### Step 3: Set Your IP

Edit `.env.local` and add your IP:

**Option A: Using WiFi**
```
EXPO_PUBLIC_API_HOST=192.168.1.100
```

**Option B: Using Mobile Hotspot**
```
EXPO_PUBLIC_API_HOST=10.103.61.191
```

**Option C: Using Localhost (iOS Simulator)**
```
EXPO_PUBLIC_API_HOST=localhost
```

### Step 4: Restart Expo

```bash
# Stop the dev server (Ctrl+C)
# Then restart
npm start
```

---

## 📱 Different Scenarios

### Scenario 1: Testing on iOS Simulator
- Backend and simulator on same Mac
- **Use**: `EXPO_PUBLIC_API_HOST=localhost`

### Scenario 2: Testing on Physical iPhone/Android (Same WiFi)
- Both devices on same WiFi network
- **Use**: Your computer's WiFi IP (e.g., `192.168.1.100`)

### Scenario 3: Testing on Physical Device (Mobile Hotspot)
- Phone creating hotspot, computer connected to it
- **Use**: Your computer's hotspot IP (e.g., `10.103.61.191`)

### Scenario 4: Testing on Android Emulator
- Backend and emulator on same machine
- **Use**: `EXPO_PUBLIC_API_HOST=10.0.2.2` (Android's special alias for localhost)

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to API"

1. **Check if backend is running**
   ```bash
   curl http://localhost:3010/health
   ```

2. **Verify your IP**
   ```bash
   ping YOUR_IP
   ```

3. **Check firewall settings**
   - macOS: System Settings > Network > Firewall
   - Allow incoming connections for Node.js

4. **Verify ports are open**
   ```bash
   lsof -i :3010  # Should show your backend process
   ```

### Issue: "Works on hotspot but not WiFi"

This is normal! Different networks have different IP addresses.

**Solution**: Update `.env.local` with the correct IP for each network:

- At home WiFi: `EXPO_PUBLIC_API_HOST=192.168.1.100`
- At office WiFi: `EXPO_PUBLIC_API_HOST=10.0.0.50`
- On hotspot: `EXPO_PUBLIC_API_HOST=10.103.61.191`

### Issue: "Still using old IP"

1. Stop Expo dev server
2. Clear cache: `npm start -- --clear`
3. Or manually: `rm -rf node_modules/.cache`

---

## 💡 Pro Tips

### 1. Quick Switch Script

Create `apps/mobile/switch-network.sh`:
```bash
#!/bin/bash
case "$1" in
  wifi)
    echo "EXPO_PUBLIC_API_HOST=192.168.1.100" > .env.local
    ;;
  hotspot)
    echo "EXPO_PUBLIC_API_HOST=10.103.61.191" > .env.local
    ;;
  local)
    echo "EXPO_PUBLIC_API_HOST=localhost" > .env.local
    ;;
esac
npm start
```

Usage: `bash switch-network.sh wifi`

### 2. Use ngrok for Public URL

If you need a stable URL across networks:
```bash
# Install ngrok
brew install ngrok  # macOS
# or download from ngrok.com

# Start tunnel
ngrok http 3010

# Use the URL in .env.local
EXPO_PUBLIC_API_HOST=abc123.ngrok.io
```

### 3. Add to package.json

```json
{
  "scripts": {
    "find-ip": "bash scripts/detect-ip.sh",
    "start:wifi": "EXPO_PUBLIC_API_HOST=192.168.1.100 npm start",
    "start:hotspot": "EXPO_PUBLIC_API_HOST=10.103.61.191 npm start"
  }
}
```

---

## 🎯 Current Setup

After this fix:
- ✅ No hardcoded IP addresses
- ✅ Easy to switch between networks
- ✅ Works with any WiFi network
- ✅ Environment variable based
- ✅ Falls back to localhost by default

Just update `.env.local` when you switch networks! 🚀
