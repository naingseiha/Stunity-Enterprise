# Stunity Security Improvements & Recommendations

This document summarizes the security assessment and improvements made to the Stunity Enterprise platform (social media + school management).

## Summary of Implemented Fixes

### 1. JWT Secret Production Safety (Critical)
- **Issue:** Hardcoded JWT fallback (`stunity-enterprise-secret-2026`) in 20+ service files allowed insecure startup in production.
- **Fix:** Added startup validation in all services (auth, feed, school, club, teacher, student, class, grade, subject, timetable, attendance, analytics, messaging) that **throws and refuses to start** if `JWT_SECRET` is unset when `NODE_ENV=production`.
- **Auth route files** (sso, socialAuth, passwordReset, twoFactor) inherit this check via auth-service startup.

### 2. XSS Protection – Lesson Content (High)
- **Issue:** `dangerouslySetInnerHTML` in the lesson page rendered unsanitized `lesson.content` from the database.
- **Fix:** Added `isomorphic-dompurify` and sanitize content with an allowlist of safe HTML tags before rendering.
- **Location:** `apps/web/src/app/[locale]/learn/course/[id]/lesson/[lessonId]/page.tsx`

### 3. XSS Defense – StudentModal Toasts (Medium)
- **Issue:** Toast notifications used `innerHTML` with static strings (low risk but poor practice).
- **Fix:** Replaced with `createElement` + `textContent` for XSS-safe rendering.
- **Location:** `packages/ui/reference/components/students/StudentModal.tsx`

### 4. School Service Security Hardening (High)
- **Issue:** `school-service` lacked Helmet and rate limiting, unlike auth and feed services.
- **Fix:** Added Helmet security headers and rate limiting:
  - Global: 200 req/15 min
  - School registration: 10 req/hour (prevents spam)
- **Location:** `services/school-service/src/index.ts`

### 5. All Services Security Hardening (Completed)
- **Fix:** Added Helmet + rate limiting (200 req/15 min) to: club, teacher, student, class, grade, subject, timetable, attendance, analytics, messaging, notification services.
- **Fix:** Added JWT_SECRET production check to all services listed above.

### 6. JWT Revocation / Token Blacklist (Completed)
- **Issue:** Refresh tokens remained valid after logout; compromised tokens could be reused.
- **Fix:** In-memory refresh token blacklist in auth-service:
  - `POST /auth/logout` accepts `refreshToken` in body and blacklists it for up to 1 year.
  - `POST /auth/refresh` checks blacklist before issuing new tokens; returns 401 if revoked.
- **Client integration:**
  - **Web:** `TokenManager.logout()` calls `/auth/logout` with refresh token, then clears local storage. All handleLogout flows updated to use `await TokenManager.logout()`.
  - **Mobile:** `authStore.logout` sends refresh token to `/auth/logout` before clearing tokens.
- **Location:** `services/auth-service/src/utils/tokenBlacklist.ts`, `apps/web/src/lib/api/auth.ts`, `apps/mobile/src/stores/authStore.ts`

---

## Remaining Recommendations (By Priority)

### Critical
1. ~~**SSO token in URL**~~ – ✅ Done. Replaced with code exchange flow:
   - SSO success redirects with `?code=...&sso=success` (no tokens in URL).
   - Client POSTs code to `POST /auth/sso/exchange`, receives tokens in JSON body.
   - Code is short-lived (5 min), single-use.
   - **Location:** `services/auth-service/src/utils/ssoCodeStore.ts`, `routes/sso.routes.ts`, `apps/web/.../auth/login/page.tsx`

### High
2. ~~**Request schema validation**~~ – ✅ Done. Zod validation added to:
   - **Feed service:** `POST /posts` (content, visibility, postType, mediaUrls, pollOptions, quizData, etc.), `POST /posts/:id/comments` (content, parentId). Max lengths: content 50K, comments 5K.
   - **School service:** `POST /schools/register` (schoolName, email, adminPassword min 8, etc.).
   - **Auth service:** Already uses express-validator for login and register.
3. **Post/comment content validation** – Enforce length limits and sanitization on storage for feed content.

### Medium
4. **Reduce feed-service JSON limit** – Current 5MB may enable DoS; consider scoping or reducing.
5. **CAPTCHA** – Consider for `/schools/register` and other public write endpoints.
6. **CSRF** – Evaluate for cookie-based or future session flows.

### Low
7. **CSP** – Enable Content-Security-Policy in Helmet where feasible.
8. **Startup env validation** – Fail if required env vars (DATABASE_URL, etc.) are missing.
9. **Token blacklist persistence** – In-memory blacklist resets on restart; for multi-instance production, consider Redis-backed blacklist.

---

## Services Security Matrix (Current State)

| Service           | Helmet | Rate Limit | JWT Prod Check |
|-------------------|--------|------------|----------------|
| auth-service      | ✅     | ✅         | ✅             |
| feed-service      | ✅     | ✅         | ✅             |
| school-service    | ✅     | ✅         | ✅             |
| ai-service        | ✅     | ✅         | -              |
| notification-svc  | ✅     | ✅         | -              |
| club-service      | ✅     | ✅         | ✅             |
| teacher-service   | ✅     | ✅         | ✅             |
| student-service   | ✅     | ✅         | ✅             |
| class-service     | ✅     | ✅         | ✅             |
| grade-service     | ✅     | ✅         | ✅             |
| subject-service   | ✅     | ✅         | ✅             |
| timetable-service | ✅     | ✅         | ✅             |
| attendance-svc    | ✅     | ✅         | ✅             |
| analytics-service | ✅     | ✅         | ✅             |
| messaging-service | ✅     | ✅         | ✅             |

---

## Production Checklist

- [ ] Set `JWT_SECRET` (strong, random, 32+ chars) in all deployment environments
- [ ] Set `NODE_ENV=production` for production
- [ ] Run `npm audit` and address critical/high findings
- [ ] Configure `ALLOWED_ORIGINS` for CORS in production
- [ ] Use HTTPS everywhere
- [ ] Rotate secrets periodically
- [ ] Enable database connection pooling and prepared statements (Prisma handles this)
