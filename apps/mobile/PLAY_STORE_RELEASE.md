# Play Store release (Android)

Use an **Android App Bundle (`.aab`)** for production. Do not upload a debug-signed APK.

---

## Wrong signing key (Play Console vs EAS)

If Play Console says the bundle is signed with the **wrong key**, compare SHA-1 fingerprints:

| Source | Meaning |
|--------|--------|
| **Play Console “expected” SHA-1** | The **upload key** currently registered for `app.stunity.mobile` (Google Play App Signing). |
| **SHA-1 of the file you uploaded** | Whatever keystore **actually** signed that `.aab`. |

This repo’s **intended** Play upload certificate (local keystore, not in git) is:

```text
SHA-1: 62:E6:A7:62:C4:24:77:1C:9A:9A:50:E8:1F:72:FA:DD:C0:EC:F7:45
```

If **EAS** built the AAB, Expo uses **Expo-managed credentials** unless you upload your own keystore. A managed keystore will **not** match the fingerprint above unless you configure it.

### Fix A (recommended): Use the same `.jks` in EAS as on Play Console

1. Use the keystore that matches **62:E6:A7:…** (see paths under [Create or choose the upload key](#1-create-or-choose-the-upload-key) below).
2. From `apps/mobile` run:

   ```bash
   eas credentials
   ```

3. **Android** → **production** (or the profile you use for store builds) → **Keystore** → **Update** / **Set up** → **Upload an existing keystore**.
4. Enter the path to `stunity-upload-key.jks`, key alias, store password, and key password (from your local secrets file).
5. Rebuild:

   ```bash
   eas build --platform android --profile production
   ```

6. Upload the new `.aab` to Play Console.

To confirm a keystore’s SHA-1 before uploading:

```bash
keytool -list -v -keystore /path/to/your-upload-key.jks -alias YOUR_ALIAS
```

Look for **SHA1:** in the output; it must match Play’s **expected** fingerprint.

### Fix B: Keep the EAS key and change what Play expects

If you **do not** have the `62:E6:…` keystore anymore but want to keep signing with EAS’s current key (`92:66:…` or whatever EAS shows):

1. In **Google Play Console** → your app → **Test and release** → **App integrity** (or **Setup** → **App signing**).
2. Use **Request upload key reset** (wording may vary). Google will ask for a **PEM certificate** for the **new** upload key.
3. In Expo: **expo.dev** → project → **Credentials** → Android → download or copy the **upload certificate** for the production keystore, and follow Play’s reset flow.

After Google approves the reset, future uploads must use that **new** upload keystore consistently.

---

## 1. Create or choose the upload key

The Play upload key has been created outside the repository:

```text
~/.stunity/keys/stunity-upload-key.jks
```

The private build passwords are stored locally with `chmod 600`:

```text
~/.stunity/keys/stunity-upload-key-passwords.txt
```

The public upload certificate is available for Play Console if requested:

```text
~/.stunity/keys/stunity-upload-certificate.pem
```

Upload key fingerprints:

```text
SHA-1:   62:E6:A7:62:C4:24:77:1C:9A:9A:50:E8:1F:72:FA:DD:C0:EC:F7:45
SHA-256: 4C:6B:6C:0A:E5:1C:96:9D:4C:B3:FA:84:D0:5A:43:D1:53:7E:94:8A:35:4E:E8:90:AD:F5:61:F0:C1:52:D3:96
```

---

## 2a. Build with EAS (Play Store `.aab`, **correct upload key**)

Play Console expects the certificate with SHA-1 **`62:E6:A7:…`** (see above). EAS “managed” keystores use a **different** cert unless you configure signing.

### One-time setup (this repo)

1. **`apps/mobile/credentials.json`** (gitignored) points at `stunity-upload-key.jks` and the passwords from `stunity-upload-key-passwords.txt`. Copy from **`credentials.example.json`** and fill in real values, or generate from your secrets file.
2. **`eas.json`** defines profile **`production-android`**: same env as `production`, but **`"credentialsSource": "local"`** so EAS signs with `credentials.json`.

### Every Play Store build

```bash
cd apps/mobile
eas build --platform android --profile production-android
```

Do **not** use `--profile production` for Play uploads unless you have also [uploaded the same keystore to Expo](https://docs.expo.dev/app-signing/syncing-credentials/) remote credentials; the default remote keystore will not match **`62:E6:…`**.

After the build finishes, download the `.aab` and upload it to Play Console.


---

## 2b. Build locally with Gradle (alternative)

```bash
set -a
source ~/.stunity/keys/stunity-upload-key-passwords.txt
set +a

cd apps/mobile/android
EXPO_PUBLIC_APP_ENV=production \
./gradlew bundleRelease
```

The Play Store file will be:

```text
apps/mobile/android/app/build/outputs/bundle/release/app-release.aab
```

---

## 3. Upload in Play Console

Create the app with package name `app.stunity.mobile`, enable **Play App Signing**, then upload the `.aab` to **Internal testing** first. After testing, promote to **Production**.

---

## 4. Firebase Android app

Create a Firebase Android app for:

```text
app.stunity.mobile
```

Add the SHA-1 and SHA-256 fingerprints above, then download the new `google-services.json` and replace:

```text
apps/mobile/google-services.json
apps/mobile/android/app/google-services.json
```

---

## 5. Play Console privacy policy

- Privacy policy: `https://stunity.app/privacy`
- Data deletion: `https://stunity.app/data-deletion`

---

## 6. Version codes

Before every new upload, bump **`expo.android.versionCode`** in `app.json` (and Gradle if you use local release builds). EAS `production` with `autoIncrement` bumps the native version for managed workflow.

Do not commit keystore files or password files to git.
