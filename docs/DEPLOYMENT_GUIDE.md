# 🚀 Stunity Enterprise - Production Deployment Guide

This guide ensures a smooth transition from development to production on Google Cloud Run, Vercel, and App Stores.

## 📋 Infrastructure Requirements

| Component | Target Platform | Tier |
|-----------|------------------|------|
| **Database** | Supabase | Free / Pro |
| **Backend** | Google Cloud Run | Free Tier (minScale: 0) |
| **Frontend** | Vercel | Hobby / Pro |
| **Media** | CloudFlare R2 | S3 Compatible |
| **Mobile** | App Store / Play Store | Production Build |

---

## 1. Database Setup (Supabase)

1. **Enable Connection Pooling**: Go to Project Settings > Database > Connection Pooler.
2. **Copy Connection Strings**:
   - **Transaction Mode (Pooler, Port 6543)**: Use for `DATABASE_URL`.
   - **Session Mode (Direct, Port 5432)**: Use for `DIRECT_URL` (migrations).
3. **Important**: Add `?pgbouncer=true` to your `DATABASE_URL`.

---

## 2. Backend Deployment (Google Cloud Run)

We have standardized Dockerfiles for all backend microservices (the current deployment script includes 15 services).

### Automated Deployment
1. Ensure `gcloud` CLI is authenticated: `gcloud auth login`
2. **Deploy All Services** (standard):
   ```bash
   ./scripts/deploy-cloud-run.sh
   ```
3. **Selective Deployment** (faster for updates):
   ```bash
   # Deploy only specific services
   ./scripts/deploy-cloud-run.sh auth-service feed-service
   ```
   *This script builds images via Cloud Build and deploys with `minScale: 0` to stay in the free tier. Selective deployment skips rebuilding unchanged services.*
4. **When backend microservices change (recommended production flow):**
   ```bash
   # Example: detect changed services from your current branch
   git --no-pager diff --name-only origin/main...HEAD services/ | cut -d/ -f2 | sort -u
   ```
   - Deploy only changed services first with `./scripts/deploy-cloud-run.sh <service...>`.
   - If a shared package change affects multiple services, deploy all impacted services together.
   - If Cloud Run URL changes for any service, update corresponding `NEXT_PUBLIC_*_SERVICE_URL` values in Vercel.
5. **Validate each deployed service** in Cloud Run logs/health checks before deploying frontend updates.

### Backend Change Rollout Checklist (Required)
When a backend service is updated, complete this checklist before closing release:

1. **Apply DB migrations first** (if schema changed):
   ```bash
   npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
   ```
2. **Deploy only changed backend services** to Cloud Run:
   ```bash
   ./scripts/deploy-cloud-run.sh attendance-service
   ```
3. **Verify Cloud Run revision health**:
   - Check service logs in GCP
   - Confirm endpoint health (for example `/health`)
4. **Confirm mobile/web integration** against deployed backend endpoints.
5. **Auth provisioning sanity check (when auth/school user creation changed):**
   - Verify password-based `ADMIN` / `SUPER_ADMIN` users are created with `accountType=SCHOOL_ONLY`.
   - If legacy rows still use `SOCIAL_ONLY`, backfill before release to avoid login `401`.

### Environment Variables
For each service in Cloud Run, set the following:
- `DATABASE_URL`: Your Supabase pooler URL.
- `JWT_SECRET`: A long random string.
- `CORS_ORIGIN`: Your frontend domain (e.g., `https://stunity.com`).
- `NODE_ENV`: `production`

---

## 3. Continuous Integration (CI/CD)

For maximum efficiency, set up **Google Cloud Build Triggers**:

1. **Connect Repository**: In GCP, go to Cloud Build > Triggers and connect your GitHub repo.
2. **Create Triggers**: Create a trigger for each service (e.g., `deploy-auth`).
3. **Configuration**:
   - **Event**: Push to a branch (`main`).
   - **Included Files Filter**: `services/auth-service/**`
   - **Build Configuration**: Use the existing `Dockerfile` or a `cloudbuild.yaml`.
4. **Benefit**: Only the service you modified will automatically redeploy when you push code.

---

## 4. Web Frontend Deployment (Vercel)

1. **Connect Repository**: Link your GitHub repo to Vercel.
2. **Root Directory**: Select `apps/web`.
3. **Environment Variables**: Copy variables from `apps/web/.env.production.example`.
4. **Deploy**: Build triggers automatically from GitHub push (recommended branch: `main`).
5. **If backend endpoints changed**: update Vercel `NEXT_PUBLIC_*` service URLs, then trigger redeploy.

### Vercel Build Notes (March 2026)
- Keep these versions aligned in `apps/web/package.json`:
  - `next` 15.x with `eslint-config-next` 15.x
  - `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` on matching major/minor
  - `react`/`react-dom` 18.3.x with matching `@types/react`/`@types/react-dom`
- For App Router dynamic segments, use Next.js async params pattern (`params: Promise<...>`).
- Current lint policy for production builds keeps `@typescript-eslint/no-explicit-any` and `react/no-unescaped-entities` disabled in `apps/web/.eslintrc.json` to avoid blocking deploys on legacy pages while cleanup continues.

---

## 4. Mobile App Deployment (App Stores)

### Production Configuration
1. Check `apps/mobile/src/config/env.ts` and ensure `getEnvironment()` returns `'production'`.
2. Update production URLs to match your Cloud Run endpoints.

### Build via EAS (Expo Application Services)
```bash
cd apps/mobile
eas build --platform ios --profile production
eas build --platform android --profile production
```

---

## 🔒 Security Best Practices

1. **Secret Management**: Never commit actual `.env` files. Use Google Secret Manager or Vercel Environment Variables.
2. **CORS Policy**: Restrict `CORS_ORIGIN` to your actual domains.
3. **RLS (Row Level Security)**: Ensure Supabase RLS policies are enabled on all tables in production.
4. **SSL**: Cloud Run and Vercel handle SSL automatically via HTTPS.

---

*Last updated: March 11, 2026*
