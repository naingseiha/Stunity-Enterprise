# 🧪 Mobile App Testing Guide

**Image Slider & Network Handling Features**  
**Date:** February 9, 2026

---

## 📱 Quick Testing Checklist

### 1. Image Slider Testing

#### Test with Posts Containing Multiple Images

**Steps:**
1. Open the mobile app
2. Navigate to Feed screen
3. Find or create a post with 2+ images
4. Test the following:

**Expected Results:**
- [ ] ✅ Images display in carousel format
- [ ] ✅ Swipe left/right to change images
- [ ] ✅ Dot indicators at bottom show position (● • •)
- [ ] ✅ Counter badge shows "1/3", "2/3", etc.
- [ ] ✅ Smooth snapping to each image
- [ ] ✅ Spring animations feel natural
- [ ] ✅ Tap image opens full-screen view

**Single Image Posts:**
- [ ] ✅ Shows full image without carousel
- [ ] ✅ No dots or counter badge
- [ ] ✅ Tap to view detail still works

---

### 2. Network Handling Testing

#### Test Offline/Online Detection

**Test 1: Start Offline**
1. Turn OFF WiFi on your device
2. Open the mobile app
3. **Expected:** Red banner appears: "No internet connection"
4. Turn ON WiFi
5. **Expected:** Green banner appears: "Back online! 🎉"
6. **Expected:** Banner auto-hides after 2 seconds
7. **Expected:** Feed refreshes automatically

**Test 2: WiFi Switching**
1. Connect to WiFi A (working internet)
2. Switch to WiFi B (no internet)
3. **Expected:** Red banner appears within 1 second
4. Switch to WiFi C (working internet)
5. **Expected:** Green banner appears
6. **Expected:** Feed data loads successfully

**Test 3: Retry Button**
1. Turn OFF WiFi
2. **Expected:** Red banner with "Retry" button appears
3. Tap "Retry" button
4. **Expected:** App attempts to refresh
5. Turn ON WiFi
6. Tap "Retry" button again
7. **Expected:** Feed refreshes successfully

**Test 4: Mobile Data Switch**
1. Start on WiFi
2. Turn OFF WiFi (mobile data enabled)
3. **Expected:** Brief red banner, then switches to mobile data
4. **Expected:** App continues working normally

---

## 🎯 Detailed Test Scenarios

### Image Carousel Tests

#### Scenario 1: Post with 2 Images
```
1. Create/find post with 2 images
2. Verify:
   - Dots: ● •
   - Counter: "1/2"
3. Swipe left
4. Verify:
   - Dots: • ●
   - Counter: "2/2"
5. Swipe right
6. Verify returns to first image
```

#### Scenario 2: Post with 4 Images
```
1. Create/find post with 4 images
2. Verify:
   - Dots: ● • • •
   - Counter: "1/4"
3. Swipe through all 4 images
4. Verify smooth transitions
5. Test rapid swiping
6. Verify no lag or stuttering
```

#### Scenario 3: Post with 1 Image
```
1. Create/find post with single image
2. Verify:
   - Image fills width
   - No dots visible
   - No counter badge
   - No carousel behavior
```

#### Scenario 4: Interactive Testing
```
1. Find post with multiple images
2. Tap first image
3. Verify full-screen view opens
4. Swipe through images in viewer
5. Close viewer
6. Verify carousel state maintained
```

---

### Network Status Tests

#### Scenario 1: Complete Offline Experience
```
1. Turn OFF WiFi + Mobile Data (Airplane mode)
2. Open app
3. Verify:
   - Red banner appears
   - Text: "No internet connection"
   - Retry button visible
4. Tap "Retry"
5. Verify:
   - Loading indicator appears
   - Error handled gracefully
6. Turn ON connectivity
7. Verify:
   - Green banner appears
   - Text: "Back online! 🎉"
   - Auto-hides after 2 seconds
   - Feed refreshes
```

#### Scenario 2: Intermittent Connection
```
1. Toggle WiFi ON/OFF rapidly 5 times
2. Verify:
   - Banner responds to each change
   - No crashes
   - No duplicate banners
   - Smooth state transitions
3. Leave WiFi ON
4. Verify:
   - App stabilizes
   - Banner hides properly
   - Feed loads normally
```

#### Scenario 3: Poor Connection
```
1. Connect to weak WiFi signal
2. Navigate through app
3. Verify:
   - No false "offline" alerts
   - Data loads eventually
   - Timeout handled gracefully
4. If timeout occurs:
   - Error message is clear
   - Retry option available
```

#### Scenario 4: VPN Connection
```
1. Connect to VPN
2. Open app
3. Verify:
   - No false offline detection
   - App works normally
   - Network banner doesn't appear
4. Disconnect VPN
5. Verify:
   - Brief connection change detected
   - No disruption to user
```

---

## 📊 Performance Checks

### Image Carousel Performance

**Metrics to Observe:**
- [ ] Smooth 60 FPS scrolling
- [ ] No jank or stuttering
- [ ] Fast image loading (< 2s)
- [ ] Memory usage stays reasonable
- [ ] No crashes with many images

**How to Check:**
1. Enable "Show Performance Monitor" in Expo
2. Swipe through images rapidly
3. Watch frame rate (should stay ~60 FPS)
4. Monitor memory usage
5. Test with 5+ image posts

### Network Detection Performance

**Metrics to Observe:**
- [ ] Detection latency < 1 second
- [ ] Banner animation smooth
- [ ] No UI lag during transitions
- [ ] Battery usage minimal

**How to Check:**
1. Use stopwatch
2. Turn OFF WiFi
3. Time until banner appears (should be < 1s)
4. Check device battery settings
5. Verify app not draining battery

---

## 🐛 Bug Testing

### Edge Cases to Test

#### Image Carousel Edge Cases
- [ ] Empty mediaUrls array
- [ ] Broken image URLs
- [ ] Very large images (> 5MB)
- [ ] Different aspect ratios
- [ ] Screen rotation during swipe
- [ ] Background app → Foreground
- [ ] Memory warnings

#### Network Status Edge Cases
- [ ] App start while offline
- [ ] Network change during API call
- [ ] Multiple rapid network changes
- [ ] VPN connect/disconnect
- [ ] Hotspot connection
- [ ] Ethernet → WiFi (if testing on tablet)

---

## ✅ Final Verification

### Before Declaring Success

**Image Slider:**
- [ ] Works with 1 image
- [ ] Works with 2-4 images
- [ ] Works with 5+ images
- [ ] Smooth animations
- [ ] Dot indicators correct
- [ ] Counter badge accurate
- [ ] Touch interactions work
- [ ] No performance issues

**Network Handling:**
- [ ] Detects offline immediately
- [ ] Shows red banner when offline
- [ ] Retry button works
- [ ] Detects online immediately
- [ ] Shows green banner when online
- [ ] Auto-hides after 2 seconds
- [ ] WiFi switching works
- [ ] Mobile data works
- [ ] No false positives

**Integration:**
- [ ] Both features work together
- [ ] No conflicts or crashes
- [ ] UI looks polished
- [ ] User experience smooth
- [ ] Feed refreshes correctly
- [ ] Posts display properly
- [ ] Navigation works

---

## 🎥 Demo Script

### Quick 2-Minute Demo

**Setup:**
1. Device with app installed
2. WiFi available
3. Sample posts with images

**Script:**
```
1. "Here's the new image carousel feature"
   → Open post with multiple images
   → Swipe through images
   → Point out dots and counter

2. "Watch the smooth animations"
   → Swipe rapidly
   → Show snapping behavior

3. "Now for network handling"
   → Turn OFF WiFi
   → Show red banner appearing
   → Tap "Retry" button

4. "And automatic recovery"
   → Turn ON WiFi
   → Show green banner
   → Wait for auto-hide
   → Show feed refreshing

5. "Everything works smoothly"
   → Navigate through app
   → Show it all working together
```

---

## 📝 Test Results Template

### Test Session Results

**Date:** _____________  
**Tester:** _____________  
**Device:** _____________  
**OS Version:** _____________

#### Image Carousel Results
- Single image: ⬜ PASS ⬜ FAIL ⬜ N/A
- Multiple images: ⬜ PASS ⬜ FAIL ⬜ N/A
- Swipe gestures: ⬜ PASS ⬜ FAIL ⬜ N/A
- Dot indicators: ⬜ PASS ⬜ FAIL ⬜ N/A
- Counter badge: ⬜ PASS ⬜ FAIL ⬜ N/A
- Performance: ⬜ PASS ⬜ FAIL ⬜ N/A

**Notes:** _____________________________________________

#### Network Handling Results
- Offline detection: ⬜ PASS ⬜ FAIL ⬜ N/A
- Online detection: ⬜ PASS ⬜ FAIL ⬜ N/A
- Banner display: ⬜ PASS ⬜ FAIL ⬜ N/A
- Retry button: ⬜ PASS ⬜ FAIL ⬜ N/A
- Auto-hide: ⬜ PASS ⬜ FAIL ⬜ N/A
- WiFi switching: ⬜ PASS ⬜ FAIL ⬜ N/A

**Notes:** _____________________________________________

#### Overall Assessment
⬜ Ready for Production  
⬜ Minor Issues (list below)  
⬜ Major Issues (list below)

**Issues Found:**
1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

**Recommendations:**
_____________________________________________

---

## 🚀 Quick Test (30 seconds)

**Fastest way to verify both features:**

```
1. Open app → See feed ✅
2. Find post with 2+ images ✅
3. Swipe left/right → Carousel works ✅
4. Turn OFF WiFi → Red banner appears ✅
5. Turn ON WiFi → Green banner appears ✅
6. Wait 2 seconds → Banner hides ✅
7. Swipe carousel again → Still smooth ✅
```

**If all ✅ → Features working correctly!**

---

## 📞 Support

**Issues or Questions?**
- Check console logs for errors
- Verify backend services running (ports 3001, 3010)
- Ensure Expo Go app is latest version
- Clear app cache if images not loading
- Restart Expo server if network not detecting

**Common Solutions:**
- Images not loading? → Check mediaUrls in API response
- Network not detecting? → Ensure NetInfo installed correctly
- Carousel not swiping? → Check ScrollView dimensions
- Banner not showing? → Verify NetworkStatus rendered in tree

---

**Status:** 🟢 Ready for Testing  
**Last Updated:** February 9, 2026  
**Version:** 1.0
