# Stunity Mobile Production Release Guide

This guide covers production release builds for the Stunity mobile app on Android and iOS.

## Current Store Identity

```text
App name: Stunity
Android package name: app.stunity.mobile
iOS bundle identifier: app.stunity.mobile
Production website: https://stunity.app
Privacy policy: https://stunity.app/privacy
Data deletion: https://stunity.app/data-deletion
```

## Pre-Release Checklist

Before building either platform:

1. Confirm the backend Cloud Run services are deployed and healthy.
2. Confirm the production web app is live at `https://stunity.app`.
3. Confirm the mobile app is using production mode:

```bash
EXPO_PUBLIC_APP_ENV=production
```

4. Confirm the Server Connection development override is not relied on for production.
5. Increase the store build number before every upload.
6. Build Android and iOS from a clean, committed Git state when possible.

## Android Release

### Android Version Fields

For a Play Store upload, the native Gradle value is what matters for the `.aab` file:

```text
apps/mobile/android/app/build.gradle
```

Before every Play Store upload, increase these native values:

```gradle
versionCode <next-play-store-build-number>
versionName "1.0.0"
```

Also keep Expo config aligned:

```text
apps/mobile/app.json
```

```text
"android": {
  "package": "app.stunity.mobile",
  "versionCode": <same-next-play-store-build-number>
}
```

`versionCode` must always be higher than the last uploaded Play Store build.

### Android Upload Key

The Play upload key is stored outside the repository:

```text
/Users/naingseiha/.stunity/keys/stunity-upload-key.jks
```

The password environment file is also outside the repository:

```text
/Users/naingseiha/.stunity/keys/stunity-upload-key-passwords.txt
```

Do not commit the keystore or password file.

### Build Android App Bundle

```bash
cd /Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/android

set -a
source /Users/naingseiha/.stunity/keys/stunity-upload-key-passwords.txt
set +a

EXPO_PUBLIC_APP_ENV=production ./gradlew bundleRelease
```

Upload this file to Play Console:

```text
/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/android/app/build/outputs/bundle/release/app-release.aab
```

### Android Play Console Steps

1. Open Google Play Console.
2. Select Stunity.
3. Go to `Test and release`.
4. Upload the `.aab` to Internal testing first.
5. Fix any Play Console errors.
6. Add testers in the `Testers` tab.
7. Test the opt-in link on a real Android device.
8. Promote to Closed testing or Production when ready.

### Android Firebase

Firebase Android app package:

```text
app.stunity.mobile
```

Upload key fingerprints:

```text
SHA-1:   62:E6:A7:62:C4:24:77:1C:9A:9A:50:E8:1F:72:FA:DD:C0:EC:F7:45
SHA-256: 4C:6B:6C:0A:E5:1C:96:9D:4C:B3:FA:84:D0:5A:43:D1:53:7E:94:8A:35:4E:E8:90:AD:F5:61:F0:C1:52:D3:96
```

Keep the downloaded Firebase config in both places:

```text
apps/mobile/google-services.json
apps/mobile/android/app/google-services.json
```

## iOS Release

### iOS Version Fields

For App Store Connect, the native Xcode project values matter:

```text
apps/mobile/ios/Stunity.xcodeproj/project.pbxproj
```

Current values:

```text
MARKETING_VERSION = 1.0.0
CURRENT_PROJECT_VERSION = 1
PRODUCT_BUNDLE_IDENTIFIER = app.stunity.mobile
```

Before every App Store Connect upload, increase:

```text
CURRENT_PROJECT_VERSION
```

Also keep Expo config aligned:

```text
apps/mobile/app.json
```

```text
"ios": {
  "bundleIdentifier": "app.stunity.mobile",
  "buildNumber": "<same-ios-build-number>"
}
```

`CURRENT_PROJECT_VERSION` / iOS build number must be higher than the last uploaded App Store Connect build for that version.

### Apple Developer Setup

In Apple Developer:

1. Register an explicit App ID.
2. Use bundle identifier:

```text
app.stunity.mobile
```

3. Use description:

```text
Stunity
```

4. Do not enable extra capabilities unless Xcode or the app requires them.

In App Store Connect:

1. Create the app.
2. Use bundle ID `app.stunity.mobile`.
3. Use SKU:

```text
stunity-ios
```

4. Use User Access: `Full Access`.

### Xcode Signing

Open the workspace:

```bash
open /Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/ios/Stunity.xcworkspace
```

In Xcode:

1. Select the `Stunity` project.
2. Select the `Stunity` target.
3. Open `Signing & Capabilities`.
4. Enable `Automatically manage signing`.
5. Select the Apple Developer Team.
6. Confirm bundle identifier is `app.stunity.mobile`.

### Build iOS Archive

Use Xcode for the first production upload:

1. Select `Any iOS Device`.
2. Choose `Product > Archive`.
3. Wait for Organizer to open.
4. Choose `Distribute App`.
5. Choose `App Store Connect`.
6. Upload.

After upload, wait for App Store Connect processing, then add the build to TestFlight.

### Command-Line Archive

After Apple signing is working in Xcode, this command can also create an archive:

```bash
cd /Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/ios

EXPO_PUBLIC_APP_ENV=production \
xcodebuild \
  -workspace Stunity.xcworkspace \
  -scheme Stunity \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath build/Stunity.xcarchive \
  archive
```

For the first upload, Xcode Organizer is easier and safer.

## Final Store Testing

Test both platforms before public production rollout:

1. Install Android from Play Internal testing.
2. Install iOS from TestFlight.
3. Sign in with a real account.
4. Confirm feed loads from production services.
5. Confirm profile, post creation, media upload, messaging, learning pages, and settings.
6. Confirm privacy policy opens at `https://stunity.app/privacy`.
7. Confirm data deletion opens at `https://stunity.app/data-deletion`.
8. Confirm no development server connection override is required.

## Common Problems

### Play Console says version already used

Increase Android `versionCode` in `apps/mobile/android/app/build.gradle`, rebuild, and upload the new `.aab`.

### App Store Connect says build number already used

Increase iOS `CURRENT_PROJECT_VERSION`, archive again, and upload the new build.

### Xcode cannot archive because signing is missing

Sign in to Xcode with the Apple Developer account, select the correct team, and enable automatic signing.

### Android Firebase does not work after package change

Confirm the Firebase Android app uses `app.stunity.mobile`, then redownload and replace `google-services.json`.
