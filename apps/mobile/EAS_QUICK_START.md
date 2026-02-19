# 🚀 Quick Start: EAS Build for Network Detection

## ⚡ 5-Minute Setup

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Login
```bash
eas login
```

### 3. Build (Choose One)

**iOS Simulator (Fastest - 10 mins)**
```bash
cd apps/mobile
eas build --profile development --platform ios --local
```

**iOS Device (TestFlight - 20 mins)**
```bash
cd apps/mobile
eas build --profile development --platform ios
```

**Android (20 mins)**
```bash
cd apps/mobile
eas build --profile development --platform android
```

---

## ⚙️ After Build: Enable Network Detection

### Uncomment 3 Lines

**1. Import** (`apps/mobile/src/stores/feedStore.ts` line 19)
```typescript
import { networkQualityService } from '@/services/networkQuality';
```

**2. Get Config** (`feedStore.ts` line 257)
```typescript
const networkConfig = networkQualityService.getConfig();
const adaptiveBatchSize = networkConfig.batchSize;
console.log('📶 [FeedStore] Network:', networkConfig.quality, '| Batch size:', limit);
```

**3. Prefetch Check** (`FeedScreen.tsx` line 282)
```typescript
if (!networkQualityService.shouldPrefetch()) return;
```

### Reload App
```bash
npm start -- --clear
```

Then shake device → Reload

---

## ✅ Success Indicators

**You'll see in logs:**
```
✅ [NetworkQualityService] Initialized
📶 [FeedStore] Network: excellent | Batch size: 20
```

**Test by switching networks:**
- WiFi → "excellent" (20 posts)
- 4G → "good" (15 posts)
- 3G → "poor" (10 posts)
- Airplane → "offline" (cached)

---

## 🎯 What You Get

| Network | Batch Size | Prefetch | Video Autoplay |
|---------|------------|----------|----------------|
| WiFi/5G | 20 posts | ✅ Yes | ✅ Yes |
| 4G | 15 posts | ✅ Yes | ❌ No |
| 3G/2G | 10 posts | ❌ No | ❌ No |
| Offline | 0 (cache) | ❌ No | ❌ No |

---

## 📚 Full Guide

See `ENABLE_NETWORK_DETECTION.md` for detailed instructions, troubleshooting, and examples.

---

## 💰 Cost

**FREE** ✅ (Expo free tier includes unlimited builds)

---

**Time:** 30 minutes total (build + setup)  
**Difficulty:** Easy (just follow steps above)  
**Result:** Professional network adaptation like TikTok! 🎉
