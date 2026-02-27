# Super Admin & Enterprise Features

**Last Updated:** February 27, 2026

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
  - List schools with pagination, search, and status filter (active/inactive)
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

#### 1.5 Platform Settings
- **Path:** `/[locale]/super-admin/settings`
- **Tabs:**
  - **Feature Flags:** Create, list, toggle platform-wide feature flags
  - **Announcements:** Create, edit, delete platform announcements
  - **Coming Soon:** Placeholders for Subscription Tiers, Notifications, Localization, Maintenance Mode

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

### 5. Fixes Applied

- Added missing `handleRevoke` in admin claim codes page
- Fixed super admin layout nav item typing for optional `disabled` property

---

## Remaining Features (Roadmap)

### P1 — Critical

| Feature | Description | Status |
|---------|-------------|--------|
| **Billing / Subscriptions** | Stripe (or similar) integration for plans, invoices, upgrades | Not started |
| **Feature Flag Check API** | Public or authenticated endpoint to check flag state for frontend | Planned |
| **Audit Log Retention** | Policy and automated cleanup for old logs | Not started |

### P2 — High

| Feature | Description | Status |
|---------|-------------|--------|
| **Platform Analytics** | Charts, reports, usage trends in super admin | Placeholder link |
| **Self-Service Registration** | Public school signup and approval workflow | Not started |
| **Subscription Tiers UI** | Manage tiers, limits, pricing in Platform Settings | Coming soon section |
| **Maintenance Mode** | Global maintenance banner / downtime mode | Coming soon section |

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
| GET | `/super-admin/schools` | List schools |
| GET | `/super-admin/schools/:schoolId` | School detail |
| PATCH | `/super-admin/schools/:schoolId` | Update school |
| DELETE | `/super-admin/schools/:schoolId` | Delete school |
| POST | `/super-admin/schools` | Create school |
| GET | `/super-admin/users` | List users |
| GET | `/super-admin/users/:userId` | User detail |
| PATCH | `/super-admin/users/:userId` | Update user (e.g. isActive) |
| GET | `/super-admin/dashboard/stats` | Platform stats |
| GET | `/super-admin/audit-logs` | Audit logs |
| GET | `/super-admin/feature-flags` | List feature flags |
| POST | `/super-admin/feature-flags` | Create feature flag |
| PATCH | `/super-admin/feature-flags/:id` | Update feature flag |
| GET | `/super-admin/announcements` | List announcements |
| POST | `/super-admin/announcements` | Create announcement |
| PATCH | `/super-admin/announcements/:id` | Update announcement |
| DELETE | `/super-admin/announcements/:id` | Delete announcement |

### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
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

## Relevant Paths

- **Auth:** `services/auth-service/src/index.ts` — JWT includes `isSuperAdmin`
- **Backend:** `services/school-service/src/index.ts` — Super admin endpoints
- **Frontend:** `apps/web/src/app/[locale]/super-admin/` — Layout, pages
- **API Client:** `apps/web/src/lib/api/super-admin.ts` — API functions
- **Schema:** `packages/database/prisma/schema.prisma` — Models
