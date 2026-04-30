# Play Store Release Build

Use an Android App Bundle (`.aab`) for Play Store releases. Do not upload the development APK or any artifact signed with the debug keystore.

## 1. Create or choose the upload key

The Play upload key has been created outside the repository:

```text
/Users/naingseiha/.stunity/keys/stunity-upload-key.jks
```

The private build passwords are stored locally with `chmod 600`:

```text
/Users/naingseiha/.stunity/keys/stunity-upload-key-passwords.txt
```

The public upload certificate is available for Play Console if requested:

```text
/Users/naingseiha/.stunity/keys/stunity-upload-certificate.pem
```

Upload key fingerprints:

```text
SHA-1:   62:E6:A7:62:C4:24:77:1C:9A:9A:50:E8:1F:72:FA:DD:C0:EC:F7:45
SHA-256: 4C:6B:6C:0A:E5:1C:96:9D:4C:B3:FA:84:D0:5A:43:D1:53:7E:94:8A:35:4E:E8:90:AD:F5:61:F0:C1:52:D3:96
```

## 2. Build the signed production bundle

```bash
set -a
source /Users/naingseiha/.stunity/keys/stunity-upload-key-passwords.txt
set +a

cd /Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/android
EXPO_PUBLIC_APP_ENV=production \
./gradlew bundleRelease
```

The Play Store file will be:

```text
/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/android/app/build/outputs/bundle/release/app-release.aab
```

## 3. Upload in Play Console

Create the app with package name `app.stunity.mobile`, enable Play App Signing, then upload `app-release.aab` to Internal testing first. After testing, promote the same release to Closed testing or Production.

## 4. Firebase Android app

Create a Firebase Android app for:

```text
app.stunity.mobile
```

Add the SHA-1 and SHA-256 fingerprints above, then download the new `google-services.json` and replace both files:

```text
/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/google-services.json
/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/mobile/android/app/google-services.json
```

## 5. Play Console privacy policy

Use this URL for Play Console privacy policy requirements:

```text
https://stunity.app/privacy
```

Use this URL for Play Console account/data deletion requirements:

```text
https://stunity.app/data-deletion
```

Before every new upload, increase `versionCode` in:

```text
apps/mobile/android/app/build.gradle
apps/mobile/app.json
```

Current release values:

```text
applicationId: app.stunity.mobile
versionCode: 8
versionName: 1.0.0
```
