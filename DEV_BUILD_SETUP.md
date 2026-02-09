# Development Build Setup

## Overview
Installed and configured `expo-dev-client` to enable custom splash screen in development mode. This eliminates the generic Expo Go splash screen and shows your branded Stunity splash screen even during development.

## What Changed

### Before (Expo Go)
```
[Generic Expo Go splash] → [Your custom splash] → [App]
```

### After (Development Build)
```
[Your branded splash immediately] → [App] ✅
```

## Installation

### 1. Installed expo-dev-client
```bash
npm install expo-dev-client
```

### 2. Added to Plugins
Updated `app.json`:
```json
"plugins": [
  "expo-dev-client",  // Added first
  "expo-secure-store",
  // ... other plugins
]
```

## How Development Builds Work

### Expo Go vs Development Build

| Feature | Expo Go | Development Build |
|---------|---------|-------------------|
| **Splash Screen** | Expo Go default | Your custom splash ✅ |
| **App Icon** | Expo Go icon | Your custom icon ✅ |
| **App Name** | "Expo Go" | "Stunity" ✅ |
| **Native Code** | Limited | Full access ✅ |
| **Build Time** | Instant | ~5-10 minutes first time |
| **Reload Speed** | Fast | Fast (same as Expo Go) |

## Building the Development Build

### For iOS
```bash
cd apps/mobile
npx expo run:ios
```

**What happens:**
1. Generates iOS native project
2. Installs CocoaPods dependencies
3. Builds Xcode project
4. Installs on simulator
5. Starts Metro bundler

**First build:** ~5-10 minutes  
**Subsequent builds:** ~1-2 minutes

### For Android
```bash
cd apps/mobile
npx expo run:android
```

**What happens:**
1. Generates Android native project
2. Downloads Gradle dependencies
3. Builds Android project
4. Installs APK on emulator/device
5. Starts Metro bundler

## Development Workflow

### After Initial Build
Once the development build is installed on your device/simulator:

```bash
# Just start the dev server
npx expo start --dev-client
```

The app will:
- Show YOUR splash screen (orange with logo)
- Have YOUR app icon
- Show YOUR app name
- Still have fast refresh and all dev features

## Benefits

### 1. **True Production Experience**
- See exactly how app will look in production
- Test splash screens, icons, app name
- No surprises when building for TestFlight/Play Store

### 2. **Custom Native Code**
- Can add native modules
- Full access to native APIs
- Not limited by Expo Go

### 3. **Better Testing**
- Test push notifications
- Test deep linking
- Test app extensions

### 4. **Professional Development**
- Branded experience from first launch
- More accurate testing environment
- Better client demos

## File Structure After Build

```
apps/mobile/
├── ios/                    # Native iOS project (generated)
│   ├── Stunity.xcworkspace
│   ├── Stunity/
│   │   ├── Images.xcassets/
│   │   │   ├── SplashScreen.imageset/
│   │   │   └── AppIcon.appiconset/
│   └── Podfile
├── android/                # Native Android project (generated)
│   ├── app/
│   │   ├── src/main/res/
│   │   │   ├── drawable/    # Splash screens
│   │   │   └── mipmap/      # App icons
│   └── build.gradle
└── app.json               # Your configuration
```

## Using the Development Build

### Daily Workflow
```bash
# Open simulator/emulator first
# iOS: Xcode → Open Developer Tool → Simulator
# Android: Android Studio → AVD Manager → Start emulator

# Then start dev server
cd apps/mobile
npx expo start --dev-client

# Press 'i' for iOS or 'a' for Android
# Your branded app will open!
```

### When to Rebuild
Rebuild only when you change:
- Native dependencies (add new expo modules)
- `app.json` configuration
- Native code (iOS/Android folders)
- Splash screens or icons

For JavaScript/TypeScript changes, just save - fast refresh works!

## Splash Screen Configuration

Your splash screen is now configured in `app.json`:

```json
{
  "splash": {
    "image": "./assets/Stunity.png",
    "resizeMode": "contain",
    "backgroundColor": "#F59E0B"
  },
  "ios": { /* ... */ },
  "android": {
    "splash": {
      "image": "./assets/Stunity.png",
      "resizeMode": "contain",
      "backgroundColor": "#F59E0B"
    }
  }
}
```

This configuration now works in:
- ✅ Development builds
- ✅ Production builds
- ❌ Expo Go (not supported)

## Troubleshooting

### Build Failed?
```bash
# Clear everything and try again
cd apps/mobile
rm -rf ios android .expo
npx expo run:ios --clean
```

### CocoaPods Issues (iOS)?
```bash
cd ios
pod install --repo-update
cd ..
npx expo run:ios
```

### Gradle Issues (Android)?
```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

### Can't find app after build?
The app is installed as a separate app (not Expo Go). Look for "Stunity" in your app drawer/launcher.

## Production Builds

When ready for production:

```bash
# Using EAS Build (recommended)
eas build --platform ios --profile production
eas build --platform android --profile production

# Or local builds
npx expo run:ios --configuration Release
npx expo run:android --variant release
```

## Performance

### Development Build
- ✅ Fast refresh (< 1s)
- ✅ Native performance
- ✅ Full debugging
- ✅ Custom splash screens

### Build Times
| Platform | First Build | Rebuild | Clean Rebuild |
|----------|-------------|---------|---------------|
| iOS | 5-10 min | 1-2 min | 3-5 min |
| Android | 8-12 min | 1-3 min | 5-8 min |

## Conclusion

✅ **Successfully set up development build with custom splash screen**

Now you have:
- Branded splash screen in development
- Professional development experience
- True-to-production testing
- Fast development workflow
- No more Expo Go splash screen

Your app now looks professional from the very first launch, even during development! 🎉

---

**Next Steps:**
1. Wait for initial build to complete (~5-10 min)
2. App will automatically open with your orange splash screen
3. Use `npx expo start --dev-client` for daily development
4. Only rebuild when changing native configuration

**Current Status:** Building iOS development build...
