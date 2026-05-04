# Attendance — full-stack production runbook

Operational checklist for shipping **school attendance** end-to-end: **attendance-service**, **web** (`NEXT_PUBLIC_ATTENDANCE_SERVICE_URL`), and **mobile** (`Config.attendanceUrl`). Club/class attendance in **club-service** is a separate product; do not mix metrics.

### Required environment (attendance-service)

| Variable | Production | Notes |
|----------|------------|--------|
| `JWT_SECRET` | **Required** | No insecure default at runtime in prod. |
| `DATABASE_URL` | **Required** | Prisma connection string. |
| `CORS_ORIGIN` | Recommended | Comma-separated allowed web origins, or `*` (use with care). |
| `PORT` / `ATTENDANCE_SERVICE_PORT` | Optional | Defaults to `3008`. |
| `AUTH_SERVICE_URL` | Optional | For parent/student notifications; defaults to `http://localhost:3001`. |
| `ATTENDANCE_TIMETABLE_ENFORCE` | Optional | Set to `0` to disable timetable gate for teacher check-in. |

Copy `services/attendance-service/.env.example` as a starting point (do not commit secrets).

### Health checks

- `GET /health` — Liveness (process up; **no** DB call).
- `GET /health/ready` — Readiness (runs `SELECT 1` on the database; **503** if DB unreachable).

Point load balancers / Cloud Run at `/health/ready` for traffic, or `/health` for cheap pings only.

### Rate limits

- Global: ~200 requests / 15 minutes per IP (general API).
- Teacher **check-in** and **permission-request**: stricter per-IP window (see `teacherAttendanceWriteLimiter` in `src/index.ts`).

---

## 1. Configuration & networking

- **Web** (`apps/web`): Set `NEXT_PUBLIC_ATTENDANCE_SERVICE_URL` for every environment (`apps/web/src/lib/api/config.ts`). Avoid relying on `localhost:3008` in production.
- **Mobile** (`apps/mobile`): Build flavors must set **HTTPS** attendance base URL for each env; align with the same backend the web app uses.
- **Browser**: Confirm **CORS** (and any cookie rules) on this service allow your deployed web origins.
- Upstream **auth** and any service that embeds **school** context in JWT must be reachable and consistent across environments.

---

## 2. Service secrets & boot

- **JWT**: Require `JWT_SECRET` (or equivalent) in production; no default secret.
- **Database**: Run migrations; set connection pool limits for expected concurrency.
- **Caching**: Know TTL and invalidation paths for school summary (and related) caches when attendance rows change.

---

## 3. Authorization (server-side)

Verify **every** sensitive handler — UI checks are insufficient.

- **School ops** (`ADMIN`, `STAFF`, `SUPER_ADMIN`): School dashboard, audit export, bulk/school routes — enforce role **and** **schoolId** scoping from the token (see `requireSchoolAttendanceOpsRole` / `SCHOOL_ATTENDANCE_OPS_ROLES` in this service).
- **`GET /attendance/teacher/:teacherId/summary`**: Only that teacher’s linked user **or** school ops — see `assertCanViewTeacherAttendanceSummary`.
- **`GET /attendance/student/:studentId/summary`**: Student (own record), parent (linked `StudentParent`), teacher (class/homeroom), or school ops — see `assertCanViewStudentAttendanceSummary`.
- **Teachers**: Check-in, permission request — scoped to authenticated teacher + school.
- Re-check other routes that take **IDs in the URL** (`classId`, etc.) for **IDOR** on future changes.

---

## 4. API behavior

- Document stable JSON: `success`, `data`, `message`, optional `code` (e.g. timetable gates). Clients (mobile) depend on these for branching.
- **Rate limits**: Global + teacher mutation limits are enabled in `src/index.ts`.
- **Timezone / “today”**: Document whether server TZ, school TZ, or client `localDate` drives session boundaries; fix ambiguity before production.

---

## 5. Web surfaces (smoke)

With **non-admin** user: expect **403** or redirect away from ops-only pages. With **admin/staff**: expect success.

- `/{locale}/attendance/dashboard` — uses `schoolId` / academic context.
- Audit export — `GET .../attendance/school/audit-export` (via `apps/web/src/lib/attendance/auditExport.ts`).
- Other callers of this service: admin activity, attendance reports, locations, parent child attendance — all must use the configured base URL and valid Bearer tokens.

---

## 6. Mobile

- **Check-in**: GPS, off-schedule acknowledgement, timeouts — validate on staging with real geofence/locations where applicable.
- **Summary/report**: Same API base as web; confirm refresh and error paths when `success` is false or network fails.

---

## 7. Observability & incidents

- Structured logs and correlation on **5xx** and slow paths.
- Optional: align web `reportClientOperationalError` usage on all attendance-heavy pages; optional mobile crash/error pipeline.

---

## 8. Privacy & i18n

- **Audit CSV / exports**: Align retention and PII policy with your compliance owner.
- **Locales**: Complete `en` / `km` (and others) for user-visible attendance strings on web and mobile.

---

## 9. Testing & release gate

- **Typecheck this service**: From repo root, `cd services/attendance-service && npm test` (runs `tsc --noEmit`).
- **Automated smoke**: Run `npm run test:attendance-ops-smoke` from repo root, or `node scripts/testing/manual/attendance-ops-api-smoke.mjs` (requires `ATTENDANCE_SMOKE_ADMIN_EMAIL`, `ATTENDANCE_SMOKE_ADMIN_PASSWORD`; optional teacher env for 403 checks). Prefer wiring into CI with secrets.
- **Manual matrix** (minimum): teacher AM/PM check-in, permission request, student summary, parent view (if enabled), admin dashboard + export, wrong-role access denied.
- **Rollback**: Version this service independently; plan DB migrations for backward compatibility during rollout.

---

## Quick reference — repo touchpoints

| Layer | Location |
|--------|----------|
| Production env + JWT resolution | `services/attendance-service/src/env.ts` |
| Service entry / guards | `services/attendance-service/src/index.ts` |
| Web attendance URL | `apps/web/src/lib/api/config.ts` (`ATTENDANCE_SERVICE_URL`) |
| Web admin role alignment | `apps/web/src/lib/permissions/schoolAttendance.ts` |
| Mobile client | `apps/mobile/src/services/attendance.ts` (`Config.attendanceUrl`) |
| Manual API smoke | `scripts/testing/manual/attendance-ops-api-smoke.mjs` |
