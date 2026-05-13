# Deployment documentation index

**Purpose:** one place to find every deployment-related path in the repo. The **canonical end-to-end runbook** is [../DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md).

## Canonical runbook

| Document | Contents |
|----------|-----------|
| [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) | Supabase (pooler vs direct, migrations, RLS), Cloud Run (`deploy-cloud-run.sh`, selective deploy, env vars), GitHub Actions, Vercel, R2, Expo EAS, security summary |

## Scripts (repo root)

| Script | Use |
|--------|-----|
| `scripts/deploy-cloud-run.sh` | Build and deploy one or all Cloud Run services |
| `scripts/list-changed-cloud-run-services.sh` | Suggest which services to redeploy from a git range |
| `npm run deploy:list-changed-services` | npm wrapper for the list script |

## Environment templates

| App / layer | Example file |
|-------------|----------------|
| Web | `apps/web/.env.production.example` |
| Mobile | `apps/mobile` — see `eas.json`, `src/config/env.ts`, and mobile release guides |

## Supplemental notes (`docs/deployment-setup/`)

Operational notes from past rollouts (safety checks, R2, Prisma binary, image upload). Treat [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) as primary; use these for deep troubleshooting when something matches a past incident.

## Mobile release

| Document | Contents |
|----------|-----------|
| [../../apps/mobile/PRODUCTION_RELEASE_GUIDE.md](../../apps/mobile/PRODUCTION_RELEASE_GUIDE.md) | iOS / Android production checklist |
| [../../apps/mobile/PLAY_STORE_RELEASE.md](../../apps/mobile/PLAY_STORE_RELEASE.md) | Play Store–specific notes |
| [../../apps/mobile/INSTALL_APK.md](../../apps/mobile/INSTALL_APK.md) | Internal APK distribution |

## Service runbooks

| Service | Document |
|---------|-----------|
| Attendance | [../../services/attendance-service/PRODUCTION_RUNBOOK.md](../../services/attendance-service/PRODUCTION_RUNBOOK.md) |

## CI workflows

See `.github/workflows/` at repo root (for example feed-service paths are described in [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)).
