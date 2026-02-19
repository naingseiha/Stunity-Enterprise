# 🚀 Enable Dynamic Network Detection with EAS Build

## Overview

You've implemented all Day 5 optimizations, but the **network quality detection** is currently disabled because `@react-native-community/netinfo` is a **native module** that requires rebuilding your development build.

This guide will help you:
1. Build a new development build with EAS
2. Enable dynamic network detection
3. Test adaptive network features

---

## 🎯 What You'll Gain

After building with EAS, you'll unlock:

### ✅ **Dynamic Network Detection**
- Auto-detects WiFi, 5G, 4G, 3G, 2G, offline
- Real-time network quality monitoring
- Switches between network types seamlessly

### ✅ **Adaptive Batch Sizes**
```typescript
Excellent (WiFi/5G): 20 posts/page  // Fast loading
Good (4G):           15 posts/page  // Balanced
Poor (3G/2G):        10 posts/page  // Data-conscious
Offline:             0 posts/page   // Use cache only
```

### ✅ **Smart Prefetch**
- Only prefetches on good networks
- Saves data on slow connections
- Respects user's data plan

### ✅ **Data-Conscious Features**
- No video autoplay on 4G
- Compressed images on 2G
- Shorter cache on poor networks

---

## 📋 Prerequisites

### 1. Install EAS CLI

```bash
npm install -g eas-cli
```

### 2. Login to Expo

```bash
eas login
```

**Don't have an Expo account?**
1. Go to https://expo.dev
2. Sign up for free
3. Run `eas login` again

### 3. Check Your Account

```bash
eas whoami
```

Should show your username.

---

## 🔨 Step 1: Build Development Build

### For iOS (Simulator)

```bash
cd /Users/naingseiha/Documents/Stunity-Enterprise/apps/mobile

# Build for iOS simulator (fast, local testing)
eas build --profile development --platform ios --local

# Or build on EAS servers (slower but reliable)
eas build --profile development --platform ios
```

**Build time:** 10-20 minutes

**What happens:**
- Installs all native dependencies (including netinfo)
- Compiles native modules for your architecture
- Creates a development build with all features

### For Android

```bash
cd /Users/naingseiha/Documents/Stunity-Enterprise/apps/mobile

# Build for Android
eas build --profile development --platform android --local
```

### For Both Platforms

```bash
eas build --profile development --platform all
```

---

## 📱 Step 2: Install the Build

### iOS (Simulator)

After build completes:

```bash
# Build creates a .tar.gz file
tar -xzf build-XXXXX.tar.gz

# Install to simulator
cd build-XXXXX
open Stunity.app
```

Or drag `Stunity.app` to your simulator.

### iOS (Device)

**Option A: TestFlight** (Recommended)
```bash
# Submit to TestFlight
eas submit --platform ios

# Then:
# 1. Wait for Apple review (~1-2 hours)
# 2. Install TestFlight app on your iPhone
# 3. Accept invitation email
# 4. Install Stunity from TestFlight
```

**Option B: Ad-Hoc Distribution**
```bash
# Build with ad-hoc profile
eas build --profile preview --platform ios

# Download .ipa file
# Install via Xcode or eas-cli
```

### Android (Device)

```bash
# Build completes → Download .apk file
# Transfer to Android device
# Install APK (enable "Install from Unknown Sources")
```

---

## ⚙️ Step 3: Enable Network Detection

After installing the new build, enable the network quality service:

### 1. Uncomment the Import

**File:** `apps/mobile/src/stores/feedStore.ts`

**Line 19-20:**
```typescript
// BEFORE (commented out)
// TEMPORARY: Disabled until native module rebuilt with EAS
// import { networkQualityService } from '@/services/networkQuality';

// AFTER (enabled)
import { networkQualityService } from '@/services/networkQuality';
```

### 2. Restore Network Config Usage

**File:** `apps/mobile/src/stores/feedStore.ts`

**Line 257:**
```typescript
// BEFORE (static)
const adaptiveBatchSize = 20; // networkQualityService.getConfig().batchSize;

// AFTER (dynamic)
const networkConfig = networkQualityService.getConfig();
const adaptiveBatchSize = networkConfig.batchSize;
```

**Line 263:**
```typescript
// BEFORE (static log)
console.log('📶 [FeedStore] Network: excellent (static) | Batch size:', limit);

// AFTER (dynamic log)
console.log('📶 [FeedStore] Network:', networkConfig.quality, '| Batch size:', limit);
```

### 3. Restore Prefetch Check

**File:** `apps/mobile/src/screens/feed/FeedScreen.tsx`

**Line 282:**
```typescript
// BEFORE (always prefetch)
// TEMPORARY: Always prefetch until native module rebuilt
// if (!networkQualityService.shouldPrefetch()) return;

// AFTER (smart prefetch)
if (!networkQualityService.shouldPrefetch()) return; // Only prefetch on good networks
```

---

## 🧪 Step 4: Test Network Detection

### 1. Start Metro Bundler

```bash
cd apps/mobile
npm start
```

### 2. Reload App

On your device with the new build:
- Shake device → Tap "Reload"
- Or just reopen the app

### 3. Check Logs

You should see:
```
✅ [NetworkQualityService] Initialized
📶 [FeedStore] Network: excellent | Batch size: 20
```

### 4. Test Network Changes

**On iOS Simulator:**
```
Settings → Developer → Status Bar → Network Type → 3G
```

Then reload feed:
```
📶 [FeedStore] Network: poor | Batch size: 10
```

**On Real Device:**
- Turn off WiFi → Logs show "good" (4G)
- Enable Airplane Mode → Logs show "offline"
- Turn on WiFi → Logs show "excellent"

### 5. Test Adaptive Loading

**WiFi Test:**
```bash
# Check logs while on WiFi
# Should load 20 posts per page
📶 [FeedStore] Network: excellent | Batch size: 20
📥 [FeedStore] Received 20 posts
```

**3G Test:**
```bash
# Switch to 3G
# Should load 10 posts per page (faster on slow network)
📶 [FeedStore] Network: poor | Batch size: 10
📥 [FeedStore] Received 10 posts
```

**Offline Test:**
```bash
# Enable Airplane Mode
# Should use cached posts
📶 [FeedStore] Network: offline | Using cached feed
```

---

## 🎨 Expected Behavior After Enabling

### On Excellent Network (WiFi/5G)
```json
{
  "quality": "excellent",
  "batchSize": 20,
  "prefetchEnabled": true,
  "videoAutoplay": true,
  "imageQuality": "high"
}
```

**User Experience:**
- Fast loading (20 posts)
- Proactive prefetch
- Videos autoplay
- High-quality images

### On Good Network (4G)
```json
{
  "quality": "good",
  "batchSize": 15,
  "prefetchEnabled": true,
  "videoAutoplay": false,
  "imageQuality": "high"
}
```

**User Experience:**
- Balanced loading (15 posts)
- Prefetch enabled
- No video autoplay (saves data)
- High-quality images

### On Poor Network (3G/2G)
```json
{
  "quality": "poor",
  "batchSize": 10,
  "prefetchEnabled": false,
  "videoAutoplay": false,
  "imageQuality": "medium"
}
```

**User Experience:**
- Small batches (10 posts = faster)
- No prefetch (data-conscious)
- No video autoplay
- Compressed images

### Offline
```json
{
  "quality": "offline",
  "batchSize": 0,
  "prefetchEnabled": false,
  "videoAutoplay": false,
  "imageQuality": "low"
}
```

**User Experience:**
- Shows cached posts
- No new content loading
- Graceful offline experience

---

## 🐛 Troubleshooting

### Build Fails

**Error:** "Please login to your Expo account"
```bash
eas logout
eas login
```

**Error:** "ENOENT: no such file or directory"
```bash
cd apps/mobile
npm install
```

**Error:** "iOS build requires macOS"
- Use EAS servers instead of `--local`
- Or use Android build

### Native Module Still Fails

**After installing build, still see errors:**

1. **Make sure you're using the NEW build**
   - Check app version in logs
   - Delete old app, reinstall from EAS

2. **Restart Metro bundler**
   ```bash
   npm start -- --clear
   ```

3. **Check import is uncommented**
   ```typescript
   import { networkQualityService } from '@/services/networkQuality';
   ```

### Network Detection Not Working

**Logs still show "static":**

1. **Check you uncommented all 3 locations**
   - feedStore.ts line 19 (import)
   - feedStore.ts line 257 (getConfig)
   - FeedScreen.tsx line 282 (shouldPrefetch)

2. **Clear Metro cache**
   ```bash
   npm start -- --clear
   ```

3. **Reload app**
   - Shake device → Reload
   - Or close and reopen

---

## 📊 Performance Comparison

### Static Mode (Current)
```
✅ Batch size: 20 (always)
❌ No network adaptation
❌ Always prefetch
❌ No data savings on 3G/2G
```

### Dynamic Mode (After EAS Build)
```
✅ Batch size: 10-20 (adaptive)
✅ Network quality detection
✅ Smart prefetch (good networks only)
✅ Automatic data savings on poor networks
✅ Better user experience on all networks
```

---

## 💰 EAS Build Costs

### Free Tier
- ✅ **Unlimited builds** for personal projects
- ✅ Build on EAS servers
- ✅ TestFlight distribution
- ⏱️ May queue during peak times

### Paid Plans
- **Production** ($29/month): Priority builds, faster
- **Enterprise** ($999/month): Dedicated infrastructure

**For your project:** Free tier is perfect! ✅

---

## ⏱️ Build Time Estimates

| Platform | Local Build | EAS Servers |
|----------|-------------|-------------|
| iOS Simulator | 10-15 min | 15-20 min |
| iOS Device | N/A | 20-30 min |
| Android | 15-20 min | 20-25 min |

**First build:** Longer (installs dependencies)  
**Subsequent builds:** Faster (cached)

---

## 🎯 Quick Start Commands

### Build for iOS Simulator (Fastest)
```bash
cd apps/mobile
eas build --profile development --platform ios --local
```

### Build for iOS Device (TestFlight)
```bash
cd apps/mobile
eas build --profile development --platform ios
eas submit --platform ios
```

### Build for Android
```bash
cd apps/mobile
eas build --profile development --platform android
```

---

## ✅ After EAS Build Checklist

- [ ] Build completed successfully
- [ ] Installed new build on device
- [ ] Uncommented network quality import
- [ ] Restored getConfig() usage
- [ ] Restored shouldPrefetch() check
- [ ] Cleared Metro cache
- [ ] Reloaded app
- [ ] See dynamic network logs
- [ ] Tested network switching
- [ ] Confirmed adaptive batch sizes

---

## 🎊 Success!

After completing these steps, you'll have:

✅ **Full Day 5 implementation** (100% complete)  
✅ **Dynamic network detection** (WiFi/5G/4G/3G/2G)  
✅ **Adaptive loading** (10-20 posts based on network)  
✅ **Smart prefetch** (only on good networks)  
✅ **Data-conscious** (respects slow connections)  
✅ **Better UX** (optimized for every network type)

**Your news feed now rivals TikTok, Facebook, and Instagram!** 🚀

---

## 📚 Additional Resources

- **EAS Documentation:** https://docs.expo.dev/build/introduction/
- **NetInfo Library:** https://github.com/react-native-netinfo/react-native-netinfo
- **Day 5 Implementation:** `DAY5_MOBILE_OPTIMIZATIONS.md`
- **Network Service Code:** `apps/mobile/src/services/networkQuality.ts`

---

**Ready to build?** Run:
```bash
cd apps/mobile
eas login
eas build --profile development --platform ios --local
```

**Questions?** Check the troubleshooting section above! 🔧

---

**Created:** 2026-02-19  
**Purpose:** Enable full dynamic network detection  
**Estimated time:** 30 minutes (including build)  
**Cost:** $0 (Free tier) ✅
