# 🌐 Network Switching Issue - Complete Solution

**Problem:** App shows network errors when switching WiFi/Internet  
**Cause:** Backend server IP address changes with network  
**Solution:** Automatic IP detection and update  
**Status:** ✅ Fixed with helper script

---

## 🔍 **Understanding the Problem**

### Why This Happens

When you're developing a mobile app locally:

1. **Backend runs on your computer** at IP address like `192.168.18.73`
2. **Mobile app connects** to that IP address
3. **When you switch WiFi**, your computer gets a NEW IP like `10.103.61.191`
4. **Mobile app still tries** the OLD IP → ❌ **Network error!**

### Example of IP Changes

```
Your Home WiFi:      192.168.1.100
Your Work WiFi:      10.0.1.50
Mobile Hotspot:      10.103.61.191
Coffee Shop WiFi:    172.16.0.25
```

**Each network gives your computer a different IP!**

---

## ✅ **The Solution: Automatic IP Detection**

I've created a helper script that:
1. ✅ Detects your current IP automatically
2. ✅ Updates `.env.local` with new IP
3. ✅ Tests if backend services are reachable
4. ✅ Shows clear instructions

---

## 🚀 **How to Use**

### When You Switch Networks:

```bash
# 1. Run the fix script
./fix-network.sh

# 2. Restart Expo (in mobile terminal)
# Press 'r' to reload

# 3. That's it! App should work now ✅
```

### What the Script Does:

```bash
🔍 Detecting your current network IP...
✅ Current IP: 10.103.61.191
📝 Updating apps/mobile/.env.local...
✅ Updated IP to: 10.103.61.191

🔍 Testing connection:
   ✅ Auth Service (3001): Reachable
   ✅ Feed Service (3010): Reachable

📱 Next steps:
   1. Restart Expo: Press 'r' in the terminal
```

---

## 📋 **Step-by-Step Fix (When You Get Network Error)**

### Symptoms:
```
ERROR ❌ [API] GET /posts - ERR_NETWORK
ERROR Failed to fetch posts: Network error
```

### Quick Fix (30 seconds):

1. **Run the script:**
   ```bash
   ./fix-network.sh
   ```

2. **Go to mobile app terminal**
   - Press `r` to reload

3. **Test:**
   - Feed should load ✅
   - Posts should appear ✅
   - Images should load ✅

---

## 🔧 **Manual Fix (If Script Doesn't Work)**

### Step 1: Find Your IP

**On Mac:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**On Windows:**
```bash
ipconfig | findstr "IPv4"
```

**Look for something like:**
```
192.168.1.100    (Home WiFi)
10.103.61.191    (Mobile hotspot)
172.16.0.50      (Work WiFi)
```

### Step 2: Update `.env.local`

Open `apps/mobile/.env.local` and change:

```bash
# From (old IP):
EXPO_PUBLIC_API_HOST=192.168.18.73

# To (new IP you found):
EXPO_PUBLIC_API_HOST=10.103.61.191
```

### Step 3: Restart Expo

```bash
# In mobile app terminal, press:
r
```

---

## 🎯 **Common Network Scenarios**

### Scenario 1: Working from Home
```bash
# Your IP: 192.168.1.100
EXPO_PUBLIC_API_HOST=192.168.1.100
```

### Scenario 2: Mobile Hotspot
```bash
# Your IP: 10.103.61.191
EXPO_PUBLIC_API_HOST=10.103.61.191
```

### Scenario 3: Coffee Shop
```bash
# Your IP: 172.16.0.25
EXPO_PUBLIC_API_HOST=172.16.0.25
```

### Scenario 4: Office Network
```bash
# Your IP: 10.0.1.50
EXPO_PUBLIC_API_HOST=10.0.1.50
```

---

## 🤔 **Why Can't It Auto-Detect?**

**Q:** Why doesn't the app automatically detect the IP?

**A:** For security reasons:
- React Native apps use hardcoded API URLs
- This prevents malicious servers from being used
- In production, you'll use a fixed domain like `api.stunity.com`

**Development vs Production:**

| Environment | Configuration |
|-------------|---------------|
| **Development** | Dynamic IP (changes with WiFi) |
| **Production** | Fixed domain (api.stunity.com) |

---

## 💡 **Pro Tips**

### Tip 1: Keep Script Handy
```bash
# Add alias to your .zshrc or .bashrc
alias fix-network='cd ~/Documents/Stunity-Enterprise && ./fix-network.sh'

# Now just run:
fix-network
```

### Tip 2: Check Before Starting Work
```bash
# Every morning or when switching locations:
./fix-network.sh
npm start
```

### Tip 3: Use Stable WiFi for Development
- Home WiFi usually keeps same IP
- Mobile hotspots change IP frequently
- Office networks usually stable

### Tip 4: Backend Must Be Running
The script checks if backend is reachable. If you see:
```
⚠️  Auth Service (3001): Not responding
```

Then start backend:
```bash
./quick-start.sh
```

---

## 🔍 **Troubleshooting**

### Problem: Script Says "Could not detect IP"

**Cause:** No network connection

**Solution:**
1. Check WiFi is connected
2. Try: `ifconfig | grep "inet "`
3. Manually set IP in `.env.local`

---

### Problem: "Auth Service Not Reachable"

**Cause:** Backend services not running

**Solution:**
```bash
./quick-start.sh
# Wait for all services to start
./fix-network.sh
```

---

### Problem: Still getting network errors after fix

**Cause:** Expo hasn't reloaded

**Solution:**
1. Close Expo app completely
2. Run: `npm start`
3. Reload app

---

### Problem: Works on WiFi but not mobile hotspot

**Cause:** Firewall blocking mobile network

**Solution:**
- Check firewall settings
- Allow Node.js through firewall
- Or use WiFi for development

---

## 📊 **Network Error Codes Explained**

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `ERR_NETWORK` | Cannot reach server | Run `./fix-network.sh` |
| `ECONNABORTED` | Request timeout | Check backend is running |
| `500` | Server error | Check backend logs |
| `401` | Not authenticated | Login again |
| `404` | Endpoint not found | Check API version |

---

## 🎓 **How Production Will Work**

In production, you'll use a fixed domain:

```bash
# Development (local)
API_HOST=192.168.1.100  # Changes with WiFi ❌

# Production (deployed)
API_HOST=api.stunity.com  # Never changes ✅
```

**Configuration:**
```typescript
// config/env.ts
const production = {
  apiBaseUrl: 'https://api.stunity.com',  // Fixed!
  authUrl: 'https://auth.stunity.com',
  feedUrl: 'https://feed.stunity.com',
}
```

**No more network switching issues!** 🎉

---

## 📝 **Summary**

### The Problem:
- WiFi switch → IP changes → App can't connect

### The Solution:
- Run `./fix-network.sh` → IP auto-updated → App works

### Best Practice:
```bash
# Whenever you switch networks:
./fix-network.sh
# Press 'r' in Expo
```

---

## ✅ **Quick Reference Card**

```
🔴 Getting Network Errors?

1. Run: ./fix-network.sh
2. Press 'r' in mobile terminal
3. Done! ✅

🔍 Still not working?

1. Check backend: ./health-check.sh
2. Restart backend: ./restart-all-services.sh
3. Restart Expo: npm start

💡 Prevention:

- Run fix-network.sh when switching WiFi
- Keep backend services running
- Use stable network for development
```

---

**Status:** 🟢 Problem understood and fixed!  
**Helper Script:** `./fix-network.sh`  
**Time to Fix:** < 30 seconds  

Now you can switch networks without issues! 🎉
