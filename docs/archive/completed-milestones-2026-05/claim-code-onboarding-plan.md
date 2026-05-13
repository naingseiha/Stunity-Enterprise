# Claim-Code-First Onboarding & Digital QR ID System

## Status: Fully Implemented ✅

This system has been successfully deployed to the mobile and web platforms, providing a seamless onboarding experience and a robust digital identity system for schools.

## Latest Stabilization Updates (April 11, 2026)

- **Admin reject workflow completed**: Web admin panel now supports both **Approve** and **Reject** for profile change requests (with optional rejection reason).
- **Claim-code registration contract aligned**: Mobile + auth-service now support registration using **email OR phone** after claim-code validation.
- **Android real-device reliability hardened (development mode)**:
  - Improved API host detection in mobile runtime config.
  - Added automatic `adb reverse` mapping for local service ports in Android run script.
  - Added explicit claim-code validation timeout/no-retry in onboarding flows so UI does not stay on "Validating..." for long network waits.
- **Grades summary red error overlay fixed in dev**:
  - Expected 4xx API responses (including monthly summary `404`) now log as warnings, preventing misleading React Native red error screens.
  - Behavior remains correct: missing monthly summary is treated as "no data yet", not as a fatal app error.

## 1. Onboarding & Registration (Mobile)

### Magic Onboarding Flow
Traditional 4-step registration is replaced by a "Magic" 3-step flow for school-affiliated users:
- **Step 1: Validation**: Users enter a 12-digit code or scan a school-generated QR code.
- **Step 2: Instant Confirmation**: The system displays the user's **Full Name**, **School**, and **Class/Grade** (e.g., "Welcome, John Doe from Class 10A"). This prevents accidental account linking.
- **Step 3: Quick Setup**: Users only need to provide an email/phone and a password. Names and roles are inherited automatically from school records.

### UI/UX Refinements
- **Sign Up "Fast Track"**: The "I have a Claim Code" option is placed on the first step of the manual Sign Up screen. This allows users to switch to the magic flow *before* typing their info manually.
- **Design Standard**: All primary buttons use the Premium "LG" size (56px height, fully rounded pill shape) for high-end aesthetics and easy touch targets.

## 2. Digital Identity System ("My QR Card")

Every linked student and teacher has a digital identity card accessible from their Profile or the Sidebar.

### Identity Features
- **Role-Based Design**: Premium gradients for Students (Sky Blue), Teachers (Indigo), and Admins (Emerald).
- **Instant Scan**: Large, high-contrast QR code optimized for hardware scanners and smartphone cameras.

### Architecture & Security (QR Payload)
The QR code encodes a compressed JSON object containing:
- `userId`: Internal UUID for identity verification.
- `role`: (STUDENT/TEACHER/ADMIN) to trigger different UI states on the scanning device.
- `schoolId`: To ensure the user belongs to the scanning school's database.
- `v`: Versioning for future payload updates.

## 3. Advanced QR Scanning Features

### Crash-Free Decoding Engine
- **Pure-JS Decoding**: Built with a 100% JavaScript engine (`jsqr` + `upng-js` + `jpeg-js`) to ensure zero crashes in Expo Go or custom development builds.
- **Self-Healing**: Safely bypasses missing native modules while maintaining high performance.

### Gallery Integration
- **Browse from Photos**: Users can upload a screenshot of their Claim Code QR from their gallery to link their account.
- **Optimized Pre-processing**: Uses `expo-file-system` and Base64 conversion to efficiently read image data into the JS-based decoder.

### Camera Experience
- **Premium Overlay**: Semi-transparent black overlay with branding-colored corner markers.
- **Torch Support**: Toggleable flashlight for low-light scanning environments.

## 4. Admin Management (Web)

### Claim Code Distribution
- **QR Modal**: Admins generate QR codes in the web panel.
- **Identity Labels**: The modal displays the user's **Full Name**, **Role**, and **Class** alongside the QR, ensuring easy distribution to students.
- **Bulk Export**: Support for printing codes in bulk for classroom distribution.

### Verified Identity Locking
- **Profile Locking**: Admins can "Lock" a user's identity once verified. When locked, name fields are disabled on mobile with a "Locked by Admin" status.
- **Approval Workflow**: Manual name changes on mobile trigger a `ProfileChangeRequest` which admins can explicitly **approve or reject** in the Web Panel.
- **Reject Reason Support**: Admins can enter an optional rejection reason in the reject dialog for audit/history.

## 5. Environment Notes (Dev vs Production)

- **Development (local backend)**:
  - Mobile may use LAN host or USB reverse path depending on setup.
  - For Android USB testing, local API access is supported via `adb reverse` port mapping.
  - Some resources (e.g., monthly summary) may legitimately return `404` until data exists for that month.
- **Production builds**:
  - App targets production Cloud Run service URLs from `apps/mobile/src/config/env.ts`.
  - `localhost`/LAN/`adb reverse` are not part of production runtime behavior.

---

## Technical Mapping

### Mobile Application
- **Onboarding**: `apps/mobile/src/screens/auth/ClaimCodeSetupScreen.tsx`
- **Digital ID**: `apps/mobile/src/screens/profile/MyQRCardScreen.tsx`
- **QR Engine**: `apps/mobile/src/utils/qrDecoder.ts`
- **Signup Entry**: `apps/mobile/src/screens/auth/RegisterScreen.tsx`
- **API Host Resolution**: `apps/mobile/src/config/env.ts`
- **Android Local Port Bridge**: `apps/mobile/scripts/run-android.sh`

### Web Admin Panel
- **Approval UI**: `apps/web/src/app/[locale]/admin/claim-codes/page.tsx`
- **Lock Toggle**: `apps/web/src/app/[locale]/students/[id]/page.tsx`
- **QR Distribution**: `apps/web/src/components/claim-codes/QRCodeModal.tsx`
- **Profile Change APIs**: `apps/web/src/lib/api/auth.ts`

### Backend Services
- **Auth Logic**: `services/auth-service/src/index.ts`
- **Grade Summary Endpoint**: `services/grade-service/src/index.ts`
- **Database**: Prisma models for `ClaimCode`, `ProfileChangeRequest`, and `isProfileLocked`.
