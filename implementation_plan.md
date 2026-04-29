# Mobile App Store Deployment Implementation Plan

## Objective
Prepare `apps/mobile` for production submission to the App Store and Play Store by resolving release blockers, validating production builds, and completing submission readiness checks.

## Current Readiness Snapshot
- Status: **Not release-ready yet**.
- `expo-doctor` result: **2 failing checks** (Metro config defaults + React Native Directory package health warnings).
- `npx tsc --noEmit`: pass.
- `npx expo config --type public`: pass.
- Production blockers identified in Android signing/versioning, iOS push entitlement, and Android permissions policy.

## Blockers to Resolve
1. Android release signing is using debug signing config in `apps/mobile/android/app/build.gradle`.
2. Android version mismatch (`app.json` has `versionCode: 6`, native gradle has `versionCode 5`).
3. iOS entitlement uses development push environment (`apps/mobile/ios/Stunity/Stunity.entitlements`).
4. Android manifest includes risky/legacy permissions (`SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`).

## Implementation Phases

### Phase 1: Release-blocking config fixes
1. Update Android release signing flow for production (EAS managed credentials or release keystore path only).
2. Align Android versioning strategy so one source of truth drives release increments.
3. Correct iOS push entitlement/provisioning for production/TestFlight compatibility.
4. Remove non-essential Android dangerous/legacy permissions and keep only feature-required permissions.

### Phase 2: Build health stabilization
5. Adjust `apps/mobile/metro.config.js` to preserve Expo default `watchFolders` behavior while retaining monorepo support.
6. Resolve or explicitly document/suppress non-blocking React Native Directory warnings in a controlled way.

### Phase 3: Release execution
7. Run validation checks:
   - `npx expo-doctor --verbose`
   - `npx tsc --noEmit`
   - `npx expo config --type public`
8. Produce production binaries:
   - `eas build --platform ios --profile production`
   - `eas build --platform android --profile production`
9. Perform real-device smoke tests (auth, feed, media upload, notifications, deep links, location check-in).
10. Submit to stores:
   - `eas submit --platform ios --profile production`
   - `eas submit --platform android --profile production`

## Task IDs (for tracking)
- `mobile-fix-android-signing`
- `mobile-align-versioning`
- `mobile-fix-ios-push-entitlement`
- `mobile-prune-android-permissions`
- `mobile-fix-metro-config`
- `mobile-resolve-doctor-package-warnings`
- `mobile-run-release-validation`
- `mobile-build-and-submit`

## Notes
- There are many existing, unrelated uncommitted changes in `apps/mobile/src/**`; deployment config fixes should be isolated from feature work.
- In this workspace, `apps/mobile/android` and `apps/mobile/ios` are not tracked by git. Release-critical native changes must be handled through a consistent Expo prebuild/EAS process to avoid local-only drift.
