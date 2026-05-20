# Documentation index

**Last verified:** May 13, 2026

Use the root [README.md](../README.md) as the main entrypoint. This file indexes deeper material under `docs/`.

## Current status (read first)

| Document | Purpose |
|----------|---------|
| [CURRENT_SITUATION.md](CURRENT_SITUATION.md) | Verified repo and API reality |
| [current/DEVELOPER_GUIDE.md](current/DEVELOPER_GUIDE.md) | Local setup, ports, repo orientation |
| [current/PROJECT_STATUS.md](current/PROJECT_STATUS.md) | Verified vs partial vs gaps |
| [current/CURRENT_FEATURES.md](current/CURRENT_FEATURES.md) | Feature matrix |
| [current/NEXT_IMPLEMENTATION.md](current/NEXT_IMPLEMENTATION.md) | Roadmap |

## Deployment and operations

| Document | Purpose |
|----------|---------|
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | **Primary** production runbook: Supabase, Cloud Run, Vercel, R2, EAS, CI, RLS |
| [deployment/README.md](deployment/README.md) | Index of deploy scripts, mobile runbooks, and supplemental setup notes |
| [DATABASE_SAFETY.md](DATABASE_SAFETY.md) | Guards around destructive DB commands |
| [DEV_TO_PRODUCTION_WORKFLOW.md](DEV_TO_PRODUCTION_WORKFLOW.md) | **រលំហូរពេញ:** dev commands → feature work → deploy production |
| [PRODUCTION_ARCHITECTURE_LONG_TERM.md](PRODUCTION_ARCHITECTURE_LONG_TERM.md) | **Long-term prod strategy:** one Supabase, service consolidation, phases |
| [MICROSERVICES_CONNECTION_AUDIT.md](MICROSERVICES_CONNECTION_AUDIT.md) | **DB connections, Prisma pools, resource audit** |
| [LOCAL_DEV.md](LOCAL_DEV.md) | **Supabase pooler, quick-start-lite, connection limits** |
| [LOCAL_DEVELOPMENT_AND_PRODUCTION.md](LOCAL_DEVELOPMENT_AND_PRODUCTION.md) | Local vs production conventions |

## Domain guides (product reference)

Long-form guides live in **[guides/](guides/README.md)** (education model, onboarding flexibility, Cambodia reporting blueprint, course/learn architecture).

## Deep dives (by subsystem)

### Social and learning

- [FEED_SYSTEM.md](FEED_SYSTEM.md)
- [REALTIME_ARCHITECTURE.md](REALTIME_ARCHITECTURE.md)
- [FEED_MEDIA_UPLOAD.md](FEED_MEDIA_UPLOAD.md)
- [AI_INTEGRATION.md](AI_INTEGRATION.md)
- [deep-dives/learn-service.md](deep-dives/learn-service.md)

### School management

- [MOBILE_API_INTEGRATION_GUIDE.md](MOBILE_API_INTEGRATION_GUIDE.md)
- [SCHOOL_SOCIAL_INTEGRATION.md](SCHOOL_SOCIAL_INTEGRATION.md)
- [TIMETABLE_SYSTEM.md](TIMETABLE_SYSTEM.md)

### Admin and enterprise

- [SUPER_ADMIN_AND_ENTERPRISE_FEATURES.md](SUPER_ADMIN_AND_ENTERPRISE_FEATURES.md)
- [admin-system/ADMIN_PERMISSION_SYSTEM.md](admin-system/ADMIN_PERMISSION_SYSTEM.md)
- [admin-system/ADMIN_PERMISSION_QUICK_REFERENCE.md](admin-system/ADMIN_PERMISSION_QUICK_REFERENCE.md)

### Planning (active)

- [POLYGLOT_ARCHITECTURE_PLAN.md](POLYGLOT_ARCHITECTURE_PLAN.md) — long-term i18n / polyglot direction

## Vision and future implementation

- [stunity-vision/README.md](stunity-vision/README.md)
- [future-implementation/README.md](future-implementation/README.md)

## Archive

Historical notes, session summaries, and completed milestones: [archive/](archive/). Recent moves from root/`docs` are summarized in [archive/completed-milestones-2026-05/README.md](archive/completed-milestones-2026-05/README.md).

Do not use archived docs as source of truth unless you are researching history on purpose.
