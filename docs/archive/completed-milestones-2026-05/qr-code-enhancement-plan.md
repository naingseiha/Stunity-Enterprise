# QR Code Enhancement - Implementation Status

**Status:** Completed + Stabilized (April 11, 2026)

## Goal
Enhance claim code linking with QR support so school admins can share claim codes faster and users can link via camera scan instead of manual entry.

## Implementation Summary

### Web Admin Panel
- [x] Added QR rendering dependency: `react-qr-code`.
- [x] Added `QRCodeModal` with:
  - QR code display for the selected claim code
  - Print support
  - Download PNG support
- [x] Added a `QR` action button in claim code inventory rows (active/unclaimed/unrevoked codes only).
- [x] Wired modal state and open/close flow in the admin claim codes page.
- [x] Payload format implemented as **Option B (Deep Link URI)**:
  - `stunity://link-school?code=<url-encoded-claim-code>`

### Mobile App
- [x] Added `ScannerModal` using `expo-camera` (`CameraView` + `useCameraPermissions`).
- [x] Added graceful permission request flow and fallback UI.
- [x] Added QR scan parsing for:
  - raw claim code payloads
  - deep-link payloads containing `code=` query parameter
- [x] Added **Scan QR Code** button in `LinkSchoolCard`.
- [x] On successful scan, code is auto-filled and `validateClaimCode` starts immediately (no extra tap needed).
- [x] Added confirmation step displaying student's Full Name, Class, and Role before final linkage.

## Additional Fixes Applied During Verification
- Fixed a TypeScript regression caused by passing an async function with optional string param directly to React Native `onPress`.
- Hardened deep-link payload handling:
  - URL encoding when generating QR payload on web.
  - URL decoding when parsing scanned data on mobile.

## Post-Implementation Stabilization (April 11, 2026)

### Real Device Android (Development)
- Added stronger mobile API host auto-detection for Expo/dev-client runtime.
- Added automatic `adb reverse` setup for local microservice ports in `run-android.sh`.
- Added claim-code validation request guardrails (`timeout` + `X-No-Retry`) to avoid long "Validating..." waits.

### UX/Diagnostics Hardening
- Improved API debug logs to include base target URL for faster root-cause detection.
- Adjusted dev error logging behavior so expected 4xx cases (example: grades monthly summary `404`) no longer trigger misleading red console error overlays.

### Release Hygiene
- Removed deprecated Android storage permissions from `app.json` (`READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`).
- Updated EAS `preview` profile to use `staging` environment (`EXPO_PUBLIC_APP_ENV=staging`) while keeping `production` profile unchanged.

## Verification Results
- `npm run build --workspace @stunity/web` -> Passed
- `npm run lint --workspace @stunity/web` -> Passed (pre-existing warnings remain outside this scope)
- `npx tsc --noEmit -p apps/mobile/tsconfig.json` -> Passed
- `npx eas build --platform android --profile preview --non-interactive` -> Passed (`FINISHED`, internal APK artifact generated)

## Scope Notes
- Bulk QR export/print from batch generation was marked optional and is **not implemented** in this delivery.

## Primary Files Implemented
- `apps/web/src/components/claim-codes/QRCodeModal.tsx`
- `apps/web/app/[locale]/admin/claim-codes/page.tsx`
- `apps/web/package.json`
- `apps/mobile/src/screens/profile/components/ScannerModal.tsx`
- `apps/mobile/src/screens/profile/components/LinkSchoolCard.tsx`

## Stabilization Files Updated
- `apps/mobile/src/config/env.ts`
- `apps/mobile/scripts/run-android.sh`
- `apps/mobile/src/screens/auth/ClaimCodeSetupScreen.tsx`
- `apps/mobile/src/screens/auth/ParentRegisterScreen.tsx`
- `apps/mobile/src/stores/authStore.ts`
- `apps/mobile/src/api/client.ts`
- `apps/mobile/app.json`
- `apps/mobile/eas.json`
