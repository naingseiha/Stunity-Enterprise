# 📚 Stunity Enterprise — Documentation

**Version:** 22.0 | **Updated:** March 2, 2026

> **New developer?** Start with the root-level docs, then come here for deep dives.

---

## 🚀 Start Here (Root-Level)

These four files at the project root give the full picture:

| File | Purpose |
|------|---------|
| [`/README.md`](../README.md) | Project overview + quick start |
| [`/PROJECT_STATUS.md`](../PROJECT_STATUS.md) | **What's done, what remains, service port map** |
| [`/DEVELOPER_GUIDE.md`](../DEVELOPER_GUIDE.md) | **Architecture, patterns, deployment — read this first** |
| [`/NEXT_IMPLEMENTATION.md`](../NEXT_IMPLEMENTATION.md) | **Prioritized roadmap with code examples** |
| [`/CURRENT_FEATURES.md`](../CURRENT_FEATURES.md) | Complete feature list |

---

## 📖 Technical Deep Dives

Reference these when working on a specific subsystem:

### Social Feed
| Doc | What it covers |
|-----|---------------|
| [`FEED_SYSTEM.md`](./FEED_SYSTEM.md) | Feed API, algorithm, post types, scoring formula |
| [`REALTIME_ARCHITECTURE.md`](./REALTIME_ARCHITECTURE.md) | Supabase Realtime + SSE patterns |
| [`FEED_MEDIA_UPLOAD.md`](./FEED_MEDIA_UPLOAD.md) | R2 upload flow, image handling |
| [`POLYGLOT_ARCHITECTURE_PLAN.md`](./POLYGLOT_ARCHITECTURE_PLAN.md) | Database architecture upgrade: Redis + pgvector + Typesense + TimescaleDB — phases, code, cost |
| [`AI_INTEGRATION.md`](./AI_INTEGRATION.md) | **AI-assisted post creation** — Gemini setup, API endpoints, mobile components, per-post-type guide |

### School Management ↔ Social Integration
| Doc | What it covers |
|-----|---------------|
| [`SCHOOL_SOCIAL_INTEGRATION.md`](./SCHOOL_SOCIAL_INTEGRATION.md) | How school data connects to social feed, notification bridges |
| [`TIMETABLE_SYSTEM.md`](./TIMETABLE_SYSTEM.md) | Timetable generation, shifts, constraints |
| [`MOBILE_API_INTEGRATION_GUIDE.md`](./MOBILE_API_INTEGRATION_GUIDE.md) | How mobile app calls all backend services |

### Admin & Permissions
| Doc | What it covers |
|-----|---------------|
| [`SUPER_ADMIN_AND_ENTERPRISE_FEATURES.md`](./SUPER_ADMIN_AND_ENTERPRISE_FEATURES.md) | Super Admin area, platform settings, feature flags, maintenance mode |
| [`admin-system/ADMIN_PERMISSION_SYSTEM.md`](./admin-system/ADMIN_PERMISSION_SYSTEM.md) | Role-based access control |
| [`admin-system/ADMIN_PERMISSION_QUICK_REFERENCE.md`](./admin-system/ADMIN_PERMISSION_QUICK_REFERENCE.md) | Quick reference card |

### Deployment & local dev
| Doc | What it covers |
|-----|---------------|
| [`DATABASE_SAFETY.md`](./DATABASE_SAFETY.md) | Blocked destructive DB commands when using real Supabase for local dev |
| [`LOCAL_DEVELOPMENT_AND_PRODUCTION.md`](./LOCAL_DEVELOPMENT_AND_PRODUCTION.md) | Prisma parity, frontend–backend parity, recent fixes (params, analytics, UI) |
| [`deployment-setup/R2_PRODUCTION_READY.md`](./deployment-setup/R2_PRODUCTION_READY.md) | Cloudflare R2 setup |
| [`deployment-setup/DEPLOYMENT_CHECKLIST.md`](./archive/deployment/DEPLOYMENT_CHECKLIST.md) | Step-by-step Cloud Run deploy |
| [`deployment-setup/PRISMA_BINARY_FIX.md`](./deployment-setup/PRISMA_BINARY_FIX.md) | Prisma in Docker fix |

### Vision & Long-Term Roadmap
| Doc | What it covers |
|-----|---------------|
| [`stunity-vision/VISION_AND_STRATEGY.md`](./stunity-vision/VISION_AND_STRATEGY.md) | Product vision |
| [`stunity-vision/TECHNICAL_ARCHITECTURE.md`](./stunity-vision/TECHNICAL_ARCHITECTURE.md) | Long-term architecture plan |
| [`future-implementation/`](./future-implementation/README.md) | Future features (SSO, multi-tenant, school websites) |

---

## 🗂️ Archive

Everything in [`archive/`](./archive/) is historical — completed implementation phases, session summaries, bug fix notes. You don't need to read these unless debugging a specific historical issue.

```
archive/
├── completed-phases/    ← PHASE*_COMPLETE.md, implementation summaries
├── 2024-2026-sessions/  ← Per-session work logs
├── deployment/          ← Old deployment guides (superseded by DEVELOPER_GUIDE.md)
├── fixes/               ← Bug fix notes
└── ...
```

---

## 🏗️ System at a Glance

```
Mobile (Expo SDK 54)        Web (Next.js 14)
        │                          │
        └──────────┬───────────────┘
                   │ HTTP + SSE
     ┌─────────────▼──────────────┐
     │     14 Microservices        │
     │  (auth, feed, school, ...)  │
     └─────────────┬──────────────┘
                   │ Prisma ORM
     ┌─────────────▼──────────────┐
     │   PostgreSQL (Supabase)     │
     │   + Realtime subscriptions  │
     └────────────────────────────┘
```

**Brand color:** `#0EA5E9` (sky blue) — used everywhere. Never use `#0066FF`.
