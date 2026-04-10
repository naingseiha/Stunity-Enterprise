# QR Code Enhancement - Implementation Status

**Status:** Completed (April 10, 2026)

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

## Additional Fixes Applied During Verification
- Fixed a TypeScript regression caused by passing an async function with optional string param directly to React Native `onPress`.
- Hardened deep-link payload handling:
  - URL encoding when generating QR payload on web.
  - URL decoding when parsing scanned data on mobile.

## Verification Results
- `npm run build --workspace @stunity/web` -> Passed
- `npm run lint --workspace @stunity/web` -> Passed (pre-existing warnings remain outside this scope)
- `npx tsc --noEmit -p apps/mobile/tsconfig.json` -> Passed

## Scope Notes
- Bulk QR export/print from batch generation was marked optional and is **not implemented** in this delivery.

## Primary Files Implemented
- `apps/web/src/components/claim-codes/QRCodeModal.tsx`
- `apps/web/src/app/[locale]/admin/claim-codes/page.tsx`
- `apps/web/package.json`
- `apps/mobile/src/screens/profile/components/ScannerModal.tsx`
- `apps/mobile/src/screens/profile/components/LinkSchoolCard.tsx`
