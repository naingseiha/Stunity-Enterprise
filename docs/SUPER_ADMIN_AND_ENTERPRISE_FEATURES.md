# Super Admin & Enterprise Features

**Last Updated:** February 28, 2026

This document describes the Super Admin platform management area and enterprise features implemented in Stunity Enterprise.

---

## Table of Contents

1. [Completed Features](#completed-features)
2. [Remaining Features (Roadmap)](#remaining-features-roadmap)
3. [API Reference](#api-reference)
4. [Database Models](#database-models)

---

## Completed Features

### 1. Super Admin Area

The Super Admin area (`/[locale]/super-admin`) is a protected platform-wide management interface for platform administrators.

#### 1.1 Dashboard
- **Path:** `/[locale]/super-admin`
- **Features:**
  - Platform stats: Total schools, active schools, total users, total classes
  - Schools by subscription tier
  - Recent schools list
  - Quick actions: Schools, Users, Platform Analytics (placeholder)

#### 1.2 Schools Management
- **Path:** `/[locale]/super-admin/schools`
- **Features:**
  - List schools with pagination, search, and status filter (all, pending, active, inactive)
  - **Pending registrations:** Approve/Reject buttons for self-service registrations
  - Inline Activate/Deactivate toggle
  - Export CSV
  - Add School modal (create school + admin user)
  - View school detail
- **Detail Page:** `/[locale]/super-admin/schools/[id]`
  - Edit school info
  - Manage subscription (tier, end date)
  - Activate/Deactivate
  - Delete school (with confirmation)

#### 1.3 Users Management
- **Path:** `/[locale]/super-admin/users`
- **Features:**
  - List users with pagination, search, school filter, role filter
  - Inline Activate/Deactivate toggle
  - Link to user detail
- **Detail Page:** `/[locale]/super-admin/users/[id]`
  - View user info (name, email, phone, role, school, status)
  - Activate/Deactivate button
  - Last login and joined date

#### 1.4 Audit Logs
- **Path:** `/[locale]/super-admin/audit-logs`
- **Features:**
  - Platform-wide audit trail of super admin actions
  - Filters: Resource type (School, User), Action
  - Pagination
  - Columns: Time, Actor, Action, Resource, Details
  - **Retention Policy:** Configurable via `AUDIT_LOG_RETENTION_DAYS` (default 90)
  - **Manual Cleanup:** "Run cleanup" button to delete logs older than retention period
  - **Automated Cleanup:** Daily cleanup (disabled when `DISABLE_BACKGROUND_JOBS=true`)

#### 1.5 Platform Settings
- **Path:** `/[locale]/super-admin/settings`
- **Tabs:**
  - **Feature Flags:** Create, edit (description/enabled), delete, list, toggle platform-wide feature flags
  - **Announcements:** Create, edit, delete platform announcements
  - **Subscription Tiers:** Read-only display of tiers and limits (billing integration coming soon)
  - **Coming Soon:** Billing Integration, Notifications, Localization
  - **Maintenance Mode:** Implemented via `MAINTENANCE_MODE` feature flag (see §6)

#### 1.6 Platform Analytics
- **Path:** `/[locale]/super-admin/analytics`
- **Features:**
  - Schools and users created per month (bar charts)
  - Top schools by student count
  - Summary stats (total schools, users, active schools)
  - Month range selector (6, 12, 24 months)

### 2. Platform Audit Logging

- **Model:** `PlatformAuditLog`
- **Logged Actions:**
  - `SCHOOL_CREATE`
  - `SCHOOL_UPDATE`
  - `SCHOOL_DELETE`
  - `USER_ACTIVATE`
  - `USER_DEACTIVATE`
- **Fields:** actorId, action, resourceType, resourceId, details (JSON), ipAddress, createdAt

### 3. Feature Flags

- **Model:** `FeatureFlag`
- **Scope:** Platform-wide (schoolId = null) or per-school
- **Fields:** key, description, enabled, schoolId
- **Usage:** Super admins manage flags in Platform Settings; frontend can check flags for feature gating

### 4. Platform Announcements

- **Model:** `PlatformAnnouncement`
- **Fields:** title, content, priority (INFO, WARNING, URGENT), isActive, startAt, endAt
- **Display:** `AnnouncementBanner` component at top of app layout
- **Behavior:** Active announcements shown to all users; users can dismiss per session

### 5. Feature Flag Check API
- **Endpoint:** `GET /api/feature-flags/check?key=KEY` (public, no auth)
- **Response:** `{ data: { key: string, enabled: boolean } }` for single key; `{ data: Record<string, boolean> }` for `?keys=KEY1,KEY2`
- **Usage:** Frontend feature gating, maintenance mode check

### 6. Self-Service School Registration
- **Public page:** `/[locale]/register-school` — Schools can register without super admin (no auth required)
- **Workflow:** Registration creates school with `registrationStatus=PENDING`, `isActive=false`
- **Super admin:** Approve (sets APPROVED + isActive) or Reject (sets REJECTED) from Schools list
- **Link:** "Register your school" on login page
- **Backend:** `POST /schools/register` creates pending schools; super admin approves via `POST /super-admin/schools/:id/approve`

### 7. Maintenance Mode
- **Feature Flag:** `MAINTENANCE_MODE` — when enabled, non–super-admin users see full-screen maintenance overlay
- **Super admins:** Bypass maintenance overlay
- **Component:** `MaintenanceOverlay` in `ClientProviders`

### 8. School Dashboard & API Config

- **Dashboard** (`/[locale]/dashboard`): Stats (students, teachers, classes) are loaded from `GET /schools/:schoolId/academic-years/:yearId/stats` for the current academic year. Quick actions use locale-prefixed links. Current academic year and "Manage Academic Years" come from `AcademicYearContext`. Recent activity and today’s attendance show placeholders until those features are wired.
- **API config:** `apps/web/src/lib/api/config.ts` centralizes service URLs: `SCHOOL_SERVICE_URL`, `STUDENT_SERVICE_URL`, `CLASS_SERVICE_URL`, `MESSAGING_SERVICE_URL` (env with localhost fallbacks). Frontend fetch calls use these instead of hardcoded hosts.

### 9. Fixes Applied

- Added missing `handleRevoke` in admin claim codes page
- Fixed super admin layout nav item typing for optional `disabled` property

---

## Remaining Features (Roadmap)

### P1 — Critical

| Feature | Description | Status |
|---------|-------------|--------|
| **Billing / Subscriptions** | Stripe (or similar) integration for plans, invoices, upgrades | Not started |
| **Audit Log Retention** | Policy and automated cleanup for old logs | ✅ Implemented |

### P2 — High

| Feature | Description | Status |
|---------|-------------|--------|
| **Self-Service Registration** | Public school signup and approval workflow | ✅ Implemented |
| **Billing Integration** | Manage tiers, limits, pricing with Stripe | Coming soon section |

### P3 — Medium

| Feature | Description | Status |
|---------|-------------|--------|
| **User Impersonation** | Super admin impersonate school users for support | Documented, not implemented |
| **RBAC Refinement** | Structured permissions table vs. JSON `User.permissions` | Partial |
| **Export/Backup** | Full data export, backup workflows | Partial (reports exist) |
| **Compliance Reports** | Dedicated compliance views | Partial |

### P4 — Lower

| Feature | Description | Status |
|---------|-------------|--------|
| **Localization Settings** | Manage languages and regional settings | Coming soon section |
| **Notifications Settings** | Configure system notifications and alerts | Coming soon section |
| **Data Retention Policy** | Automated cleanup, retention rules | Not started |

---

## API Reference

### Super Admin Endpoints (require super admin JWT)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/super-admin/schools` | List schools (status: all, pending, active, inactive) |
| GET | `/super-admin/schools/:schoolId` | School detail |
| POST | `/super-admin/schools/:schoolId/approve` | Approve pending registration |
| POST | `/super-admin/schools/:schoolId/reject` | Reject pending registration |
| PATCH | `/super-admin/schools/:schoolId` | Update school |
| DELETE | `/super-admin/schools/:schoolId` | Delete school |
| POST | `/super-admin/schools` | Create school |
| GET | `/super-admin/users` | List users |
| GET | `/super-admin/users/:userId` | User detail |
| PATCH | `/super-admin/users/:userId` | Update user (e.g. isActive) |
| GET | `/super-admin/dashboard/stats` | Platform stats |
| GET | `/super-admin/audit-logs` | Audit logs |
| GET | `/super-admin/audit-logs/retention-policy` | Retention policy (days, count older than retention) |
| POST | `/super-admin/audit-logs/cleanup` | Delete logs older than retention (optional `?olderThanDays=N`) |
| GET | `/super-admin/feature-flags` | List feature flags |
| POST | `/super-admin/feature-flags` | Create feature flag |
| PATCH | `/super-admin/feature-flags/:id` | Update feature flag (enabled, description) |
| DELETE | `/super-admin/feature-flags/:id` | Delete feature flag |
| GET | `/super-admin/analytics` | Platform analytics (schools/users per month, top schools) |
| GET | `/super-admin/announcements` | List announcements |
| POST | `/super-admin/announcements` | Create announcement |
| PATCH | `/super-admin/announcements/:id` | Update announcement |
| DELETE | `/super-admin/announcements/:id` | Delete announcement |

### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/schools/register` | Self-service school registration (creates PENDING) |
| GET | `/api/feature-flags/check` | Check platform-wide feature flag(s) (no auth) |
| GET | `/api/announcements/active` | Active platform announcements (no auth) |

---

## Database Models

### PlatformAuditLog
```
id, actorId, action, resourceType, resourceId, details (Json), ipAddress, createdAt
```

### FeatureFlag
```
id, key (unique), description, enabled, schoolId (null = platform-wide), metadata, createdAt, updatedAt
```

### PlatformAnnouncement
```
id, title, content, priority (INFO|WARNING|URGENT), isActive, startAt, endAt, createdAt, updatedAt
```

---

## Seed Super Admin

To promote a user to super admin:

```bash
npm run seed:super-admin [email]
```

---

## Multi-Tenancy & Security

When many schools use the system, data is isolated by school:

- **School service:** Non–super-admin users can only access their own school. Routes under `/schools/:schoolId` and `/schools/:id` require `req.user.schoolId === params.schoolId` (super admins bypass this).
- **Class service:** All queries use `req.user.schoolId`. The unassigned-students endpoint validates that `academicYearId` belongs to the same school before returning data.
- **Student service:** All queries use `req.user.schoolId` from the JWT. Student list and promotion are scoped to the authenticated school.
- **JWT:** Issued by auth-service and includes `schoolId` and `isSuperAdmin`. Never trust client-provided school IDs for authorization; use JWT claims and server-side validation.

### Re-running student promotion

Once promotion from a source year (e.g. 2024–2025) to a target year (e.g. 2025–2026) has been run, that source year is marked **promotion done** (`isPromotionDone`). Re-running promotion from the same source year is **blocked**:

- **Backend:** `POST .../promote-students` returns `400` with *"Students have already been promoted for this year"* if the source year has `isPromotionDone === true`. No records are created or updated.
- **Frontend:** The promotion wizard shows a notice when the selected source year already has promotion done, disables "Load preview" on the main promotion page, and on the year-specific promote page shows an "Promotion already completed" message and does not allow proceeding.

So running promotion again from 2024–2025 to 2025–2026 after it has already been done will not break or override data; the action is refused and no changes are made.

---

## Relevant Paths

- **Auth:** `services/auth-service/src/index.ts` — JWT includes `isSuperAdmin`
- **Backend:** `services/school-service/src/index.ts` — Super admin endpoints, promotion, academic years
- **Frontend:** `apps/web/src/app/[locale]/super-admin/` — Layout, pages; `apps/web/src/app/[locale]/dashboard/` — School dashboard
- **API Client:** `apps/web/src/lib/api/super-admin.ts` — Super admin API; `apps/web/src/lib/api/config.ts` — Service URLs
- **Schema:** `packages/database/prisma/schema.prisma` — Models
