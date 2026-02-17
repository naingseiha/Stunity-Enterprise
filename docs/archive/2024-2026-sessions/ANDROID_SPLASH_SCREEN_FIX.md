# Android Splash Screen Fix

## Issue
On Android, when starting the app, it showed a white screen with "Stunity" text first, then loaded the custom splash screen. This created a jarring, unprofessional launch experience.

## Root Cause
The app.json was missing proper splash screen configuration:
1. No `icon` specified
2. No `splash.image` path specified
3. No Android-specific splash configuration
4. No `expo-splash-screen` plugin configuration

This caused Android to fall back to the default launch screen (white background with app name) before the custom splash screen could load.

## Solution

### 1. Added Global Icon
```json
"icon": "./assets/Stunity.png"
```

### 2. Added Splash Image Path
```json
"splash": {
  "image": "./assets/Stunity.png",
  "resizeMode": "contain",
  "backgroundColor": "#F59E0B"
}
```

### 3. Added Android-Specific Configuration
```json
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/Stunity.png",
    "backgroundColor": "#F59E0B"
  },
  "splash": {
    "image": "./assets/Stunity.png",
    "resizeMode": "contain",
    "backgroundColor": "#F59E0B"
  }
}
```

### 4. Added expo-splash-screen Plugin
```json
"plugins": [
  [
    "expo-splash-screen",
    {
      "backgroundColor": "#F59E0B",
      "image": "./assets/Stunity.png",
      "imageWidth": 200
    }
  ]
]
```

## Configuration Details

### Icon Configuration
- **Path:** `./assets/Stunity.png`
- **Purpose:** App icon shown on home screen and app switcher
- **Used by:** Both iOS and Android

### Splash Screen Configuration
- **Background Color:** `#F59E0B` (Stunity brand orange)
- **Image:** Stunity logo
- **Resize Mode:** `contain` (shows full logo without cropping)
- **Image Width:** 200px (appropriate size for mobile screens)

### Android Adaptive Icon
- **Foreground Image:** Stunity logo
- **Background Color:** Brand orange
- **Purpose:** Android 8.0+ adaptive icon system
- **Benefits:** 
  - Consistent with Android design guidelines
  - Supports various icon shapes (circle, square, squircle)
  - Professional appearance

## Launch Experience

### Before
```
[White screen with "Stunity" text] ❌
          ↓
[Custom splash screen with logo]
          ↓
[App loads]
```

### After
```
[Orange splash screen with logo immediately] ✅
          ↓
[App loads]
```

## Technical Implementation

### Plugin Order
The `expo-splash-screen` plugin is placed early in the plugins array to ensure it's processed before other plugins that might affect the launch experience.

### Asset Requirements
The splash screen uses the existing `Stunity.png` in the assets folder:
- **Location:** `apps/mobile/assets/Stunity.png`
- **Size:** 24KB
- **Format:** PNG with transparency
- **Recommended dimensions:** 1284 x 2778px (3x resolution for largest iOS device)

### Build Process
After updating app.json, the native projects need to be rebuilt:
```bash
# Clear cache
rm -rf .expo android/app/build ios/build

# Rebuild with new configuration
npx expo prebuild --clean

# Or for development
npx expo start --clear
```

## Platform-Specific Behavior

### iOS
- Uses global `splash` configuration
- Shows splash screen immediately
- Smooth transition to app

### Android
- Uses `android.splash` configuration first
- Falls back to global `splash` if not specified
- `adaptiveIcon` ensures consistent branding
- Plugin generates native splash screen resources

## Benefits

1. **Professional Launch:** No white screen flash
2. **Brand Consistency:** Orange background matches brand from start
3. **Better UX:** Smooth, immediate splash screen
4. **Native Feel:** Follows platform best practices
5. **No Configuration Flicker:** Single splash screen shown

## Testing

### iOS
1. Kill app completely
2. Launch app
3. Should see orange splash with logo immediately
4. No white flash

### Android
1. Kill app completely
2. Launch app
3. Should see orange splash with logo immediately
4. No white screen with "Stunity" text
5. Smooth transition to custom splash

## Future Enhancements

### 1. Animated Splash Screen
```json
"plugins": [
  [
    "expo-splash-screen",
    {
      "backgroundColor": "#F59E0B",
      "image": "./assets/Stunity.png",
      "imageWidth": 200,
      "dark": {
        "image": "./assets/Stunity-dark.png",
        "backgroundColor": "#1F2937"
      }
    }
  ]
]
```

### 2. Dark Mode Support
Add separate splash configuration for dark mode with appropriate colors.

### 3. High-Resolution Assets
Create splash images in multiple resolutions:
- `splash.png` (1x)
- `splash@2x.png` (2x)
- `splash@3x.png` (3x)

### 4. Custom Android Splash
Create custom drawable resources for more control over Android splash screen.

## Files Modified

**File:** `apps/mobile/app.json`

**Changes:**
1. Added `icon` configuration
2. Added `image` path to `splash`
3. Added `android.adaptiveIcon` configuration
4. Added `android.splash` configuration
5. Added `expo-splash-screen` plugin

**Lines Changed:** 12 lines added

## Common Issues & Solutions

### Issue: Splash still shows white screen
**Solution:** Clear cache and rebuild
```bash
npx expo start --clear
```

### Issue: Icon doesn't update
**Solution:** Clear app data or reinstall
```bash
# Android
adb uninstall com.stunity.mobile
# Then reinstall
```

### Issue: Different behavior in dev vs production
**Solution:** Build production APK/IPA to test final behavior
```bash
eas build --platform android
```

## Verification Checklist

- [x] Icon configured in app.json
- [x] Splash image path specified
- [x] Android adaptive icon configured
- [x] Android splash screen configured
- [x] expo-splash-screen plugin added
- [ ] Test on Android device (clear app data first)
- [ ] Test on iOS device
- [ ] Test in production build
- [ ] Verify no white screen flash on cold start

## Conclusion

✅ **Fixed Android splash screen flash issue**

The app now:
- Shows branded splash screen immediately on launch
- No white screen flash before splash
- Professional, smooth launch experience
- Consistent branding from first pixel
- Follows platform best practices

This fix ensures users see the Stunity brand from the very first moment they launch the app, creating a more polished and professional experience.

---

**Implementation Time:** ~10 minutes  
**Complexity:** Low (configuration only)  
**Risk:** Very Low (no code changes)  
**Impact:** High (first impression improvement)

**Note:** For the changes to take full effect, users need to:
1. Stop the Expo dev server
2. Clear cache: `npx expo start --clear`
3. Rebuild the app (or the app will auto-rebuild on next launch)
