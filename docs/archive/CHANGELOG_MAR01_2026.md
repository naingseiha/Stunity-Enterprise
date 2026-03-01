# Changelog — March 1, 2026

## Parent Portal Mobile App

### New Features
- **Parent Portal mobile app** — Dedicated flow for parents to view children's academic progress
- **ParentLoginScreen** — Phone + password login for parents (POST /auth/parent/login)
- **ParentNavigator** — Stack: ParentHome → ParentChild → ParentChildGrades / ParentChildAttendance / ParentChildReportCard
- **ParentHomeScreen** — Children list, school info, quick actions (grades, attendance, report)
- **ParentChildScreen** — Child overview with links to grades, attendance, report card
- **ParentChildGradesScreen** — View grades by subject (GET /grades/student/{studentId})
- **ParentChildAttendanceScreen** — View attendance by month (GET /attendance/student/{studentId})
- **ParentChildReportCardScreen** — Report card view with share (GET /grades/report-card/{studentId})
- **RootNavigator** — Shows ParentNavigator when user.role === 'PARENT'
- **Auth verify** — `/auth/verify` now returns `children` for PARENT users (persists on app restart)

### Welcome Screen
- **Parent Portal** and **Enterprise SSO** buttons — Card-style layout with icons and subtitles
- **ScrollView** — Content scrolls on small screens; fits on one screen on larger devices
- **Layout optimization** — Reduced top spacing (logo, margins) for single-screen fit
- **Back button** — Parent Portal login uses standard chevron-back, white bg, shadow (matches Register/Login)

---

## Auth & Registration Enhancements

### Session Persistence (Facebook-style)
- **Remember me removed** — Session persists until logout; no checkbox needed
- **Mobile + Web** — Tokens stored in SecureStore (mobile) / localStorage (web) until explicit logout

### Email OR Phone (Facebook-style)
- **Registration** — Users can register with email only, phone only, or both (at least one required)
- **Login** — Single "Email or Phone" field; backend detects and finds user by either
- **Backend** — `POST /auth/register` and `POST /auth/login` accept email or phone
- **Mobile** — RegisterScreen: Email + Phone inputs (optional each); LoginScreen: "Email or Phone"
- **Web** — Login page: single "Email or Phone" field (toggle removed)

### Organization Optional
- **Registration Step 2** — Organization name is optional when not using claim code
- **Default** — Users can leave organization blank; no longer required
- **Claim code** — Email still required when using claim code (backend dependency)

---

## Files Changed

### Mobile
- `apps/mobile/src/screens/auth/WelcomeScreen.tsx` — Parent Portal/SSO buttons, ScrollView, layout
- `apps/mobile/src/screens/auth/LoginScreen.tsx` — Email or Phone, remember me removed
- `apps/mobile/src/screens/auth/RegisterScreen.tsx` — Organization optional, Email OR Phone
- `apps/mobile/src/screens/auth/ParentLoginScreen.tsx` — Back button standard, chevron-back
- `apps/mobile/src/screens/parent/*` — ParentHomeScreen, ParentChildScreen, ParentChildGradesScreen, ParentChildAttendanceScreen, ParentChildReportCardScreen
- `apps/mobile/src/navigation/ParentNavigator.tsx` — Parent stack
- `apps/mobile/src/navigation/RootNavigator.tsx` — Parent role routing
- `apps/mobile/src/navigation/types.ts` — ParentStackParamList, ParentLogin, Parent screen
- `apps/mobile/src/navigation/AuthNavigator.tsx` — ParentLogin screen
- `apps/mobile/src/stores/authStore.ts` — parentLogin, login with email/phone
- `apps/mobile/src/types/index.ts` — LoginCredentials (email?, phone?), RegisterData (email?, phone?)

### Web
- `apps/web/src/app/[locale]/auth/login/page.tsx` — Single Email or Phone field
- `apps/web/src/lib/api/auth.ts` — LoginCredentials (email?, phone?)

### Backend
- `services/auth-service/src/index.ts` — Register: email OR phone; Login: email OR phone; Verify: children for PARENT
