# Hard Reload Instructions - Network Quality Service

## ⚠️ Your Device Is Running OLD Code

Even though Metro is restarted with fresh cache, your device/simulator is still running the **old bundle** that doesn't have the fixed code.

## 🔄 How to Fully Reload

### Option 1: Close and Reopen App (RECOMMENDED)

**On iOS:**
1. **Double-tap home button** (or swipe up on iPhone X+)
2. **Swipe up** on the Stunity app to close it completely
3. **Scan the QR code again** from terminal

**On Android:**
1. **Recent apps button** 
2. **Swipe away** the Stunity app
3. **Scan the QR code again** from terminal

### Option 2: Shake and Reload

1. **Shake your device** to open dev menu
2. Tap **"Reload"**
3. If error persists, do **Option 1**

### Option 3: Uninstall and Reinstall (Nuclear)

```bash
# On iOS Simulator
xcrun simctl uninstall booted host.exp.Exponent

# On Android Emulator  
adb uninstall host.exp.exponent

# Then rescan QR code
```

---

## ✅ What You Should See After Reload

**In the logs, you should see:**
```
📶 [FeedStore] Network: excellent | Batch size: 20
```

**You should NOT see:**
```
ERROR [ReferenceError: Property 'networkQualityService' doesn't exist] ❌
```

---

## 🔍 Why This Happened

The problem is **bundle caching at device level**, not Metro level:

1. ✅ Metro bundler cache was cleared
2. ✅ Code is fixed (TypeScript error resolved)
3. ✅ Dependencies are installed
4. ❌ **Your device is still running the OLD JavaScript bundle**

**The app needs to fetch the NEW bundle from Metro.**

---

## 📋 Current Status

- ✅ Metro running on port 8081 (fresh)
- ✅ All caches cleared (`.expo`, `node_modules/.cache`)
- ✅ Code fixed (`NetInfoStateType.wifi`)
- ✅ Dependencies installed (`@react-native-community/netinfo`)
- ⏳ **Waiting for device to reload with new bundle**

---

## 🎯 Action Required

1. **Close the app completely** on your device
2. **Scan the QR code** shown in your terminal
3. **Check logs** - you should see the `📶` emoji, no errors

---

## 🆘 If Still Broken

If you STILL see the error after closing app and rescanning:

**Check the file one more time:**
```bash
cd apps/mobile
cat src/services/networkQuality.ts | grep -A 3 "getDefaultConfig"
```

Should show:
```typescript
connectionType: NetInfoStateType.wifi,  // ✅
```

NOT:
```typescript
connectionType: 'wifi',  // ❌
```

**Check TypeScript compilation:**
```bash
npx tsc --noEmit src/services/networkQuality.ts
```

Should output nothing (no errors).

**If still errors, let me know!**

---

**Created:** 2026-02-19 17:51  
**Issue:** Device running stale bundle  
**Solution:** Close app completely and rescan QR code
