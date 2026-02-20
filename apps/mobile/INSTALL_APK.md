# 📱 Install APK & Enable Network Detection

## ✅ APK Ready!

**File:** `stunity-development.apk`  
**Size:** 219 MB  
**Location:** `/Users/naingseiha/Documents/Stunity-Enterprise/apps/mobile/`

---

## 🚀 Installation Options

### Option 1: Install via USB (Recommended)

1. **Enable USB Debugging on Android Device:**
   - Settings → About Phone
   - Tap "Build Number" 7 times (enables Developer Options)
   - Settings → Developer Options
   - Enable "USB Debugging"

2. **Connect Device & Install:**
   ```bash
   cd /Users/naingseiha/Documents/Stunity-Enterprise/apps/mobile
   adb devices  # Verify device is connected
   adb install stunity-development.apk
   ```

3. **Open App:**
   - Find "Stunity" in app drawer
   - Tap to launch

---

### Option 2: Install via Cloud (Easier)

1. **Upload APK to Cloud:**
   - Google Drive
   - Dropbox
   - Or any file sharing service

2. **Download on Device:**
   - Open link on Android device
   - Download APK

3. **Enable Unknown Sources:**
   - Settings → Security
   - Enable "Install from Unknown Sources"

4. **Install APK:**
   - Open Downloads folder
   - Tap `stunity-development.apk`
   - Click "Install"

---

## 🔧 Enable Network Detection (3 Changes)

After installing and verifying the app works:

### 1. Edit `feedStore.ts` (Line 19)

**File:** `apps/mobile/src/stores/feedStore.ts`

**Uncomment this line:**
```typescript
import { networkQualityService } from '@/services/networkQuality';
```

---

### 2. Edit `feedStore.ts` (Lines 257-259)

**Replace this:**
```typescript
const adaptiveBatchSize = 20; // Static mode
```

**With this:**
```typescript
const networkConfig = networkQualityService.getConfig();
const adaptiveBatchSize = networkConfig.batchSize;
console.log('📶 [FeedStore] Network:', networkConfig.quality, '| Batch size:', adaptiveBatchSize);
```

---

### 3. Edit `FeedScreen.tsx` (Line 282)

**File:** `apps/mobile/src/screens/feed/FeedScreen.tsx`

**Uncomment this line:**
```typescript
if (!networkQualityService.shouldPrefetch()) return;
```

---

## 🔄 Restart App

1. **Stop Metro (if running):**
   ```bash
   # Press Ctrl+C in terminal
   ```

2. **Clear Metro Cache & Restart:**
   ```bash
   cd /Users/naingseiha/Documents/Stunity-Enterprise/apps/mobile
   npm start -- --clear
   ```

3. **Reload App on Device:**
   - Shake device
   - Tap "Reload"
   - Or force close and reopen app

---

## ✅ Verify Network Detection Works

### Check Logs

You should see these messages:

```bash
✅ [NetworkQualityService] Initialized
✅ [NetworkQualityService] Current: excellent (WiFi)
📶 [FeedStore] Network: excellent | Batch size: 20
```

---

### Test Different Networks

**WiFi:**
```
📶 [FeedStore] Network: excellent | Batch size: 20
- Loads 20 posts per request
- Prefetch enabled
- Full resolution images
```

**4G/LTE:**
```
📶 [FeedStore] Network: good | Batch size: 15
- Loads 15 posts per request
- Prefetch enabled
- Medium resolution images
```

**3G:**
```
📶 [FeedStore] Network: poor | Batch size: 10
- Loads 10 posts per request
- Prefetch disabled
- Low resolution images
```

**Offline:**
```
📶 [FeedStore] Network: offline | Using cache
- Shows cached posts only
- No new requests
```

---

## 🎯 Expected Behavior

### Adaptive Loading

| Network | Quality | Batch Size | Prefetch | Images |
|---------|---------|------------|----------|--------|
| WiFi | Excellent | 20 posts | ✅ Yes | Full HD |
| 5G | Excellent | 20 posts | ✅ Yes | Full HD |
| 4G | Good | 15 posts | ✅ Yes | Medium |
| 3G | Poor | 10 posts | ❌ No | Low |
| 2G | Poor | 10 posts | ❌ No | Low |
| Offline | Offline | Cache only | ❌ No | Cached |

---

### Smooth Scrolling

- **60 FPS** scroll on all networks
- **No lag** when switching networks
- **Progressive loading** with BlurHash
- **Smart prefetch** at 50% scroll (WiFi/4G only)

---

## 🐛 Troubleshooting

### APK Won't Install

**Error: "App not installed"**
```bash
# Uninstall old version first
adb uninstall com.naingseiha.stunitymobile

# Then reinstall
adb install stunity-development.apk
```

---

### Network Detection Not Working

**Still shows static mode:**

1. **Verify imports are uncommented:**
   ```bash
   # Check line 19 in feedStore.ts
   grep -n "import { networkQualityService }" apps/mobile/src/stores/feedStore.ts
   ```

2. **Clear Metro cache:**
   ```bash
   npm start -- --clear
   ```

3. **Rebuild app:**
   ```bash
   # If changes don't apply, rebuild
   eas build --profile development --platform android --local
   ```

---

### App Crashes on Launch

**Check logs:**
```bash
# View Android logs
adb logcat | grep -i stunity

# Or use React Native debugger
npm start
# Shake device → "Debug"
```

---

## 📊 Performance Metrics

### Before (Static Mode)
- ⚠️ Fixed batch size: 20 posts
- ⚠️ No network adaptation
- ⚠️ Same behavior on WiFi & 3G

### After (Dynamic Mode)
- ✅ Adaptive batch sizes: 10-20 posts
- ✅ Network quality detection
- ✅ Smart prefetch (WiFi/4G only)
- ✅ Optimized for each network type

---

## 🎉 Success!

When you see this in the logs, you're done:

```
✅ [NetworkQualityService] Initialized
📶 [FeedStore] Network: excellent | Batch size: 20
🔥 [FeedScreen] Smooth 60fps scroll detected
```

---

## 🔗 Resources

- **EAS Build Logs:** https://expo.dev/accounts/naingseiha/projects/stunity-mobile/builds/10c6a499-f32e-43ec-aafc-2eb26abb47a4
- **APK Direct Link:** https://expo.dev/artifacts/eas/359Kk9xpnZj1Zo6jBBzqLm.apk
- **Full Guide:** `ENABLE_NETWORK_DETECTION.md`
- **Quick Start:** `EAS_QUICK_START.md`

---

**Ready to test!** 🚀

Install the APK, make the 3 changes, and experience adaptive feed loading!
