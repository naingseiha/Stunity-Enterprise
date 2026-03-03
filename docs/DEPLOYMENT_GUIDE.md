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

We have standardized Dockerfiles for all 18 microservices.

### Automated Deployment
1. Ensure `gcloud` CLI is authenticated: `gcloud auth login`
2. Run the deployment script:
   ```bash
   ./scripts/deploy-cloud-run.sh
   ```
   *This script builds images via Cloud Build and deploys with `minScale: 0` to stay in the free tier.*

### Environment Variables
For each service in Cloud Run, set the following:
- `DATABASE_URL`: Your Supabase pooler URL.
- `JWT_SECRET`: A long random string.
- `CORS_ORIGIN`: Your frontend domain (e.g., `https://stunity.com`).
- `NODE_ENV`: `production`

---

## 3. Web Frontend Deployment (Vercel)

1. **Connect Repository**: Link your GitHub repo to Vercel.
2. **Root Directory**: Select `apps/web`.
3. **Environment Variables**: Copy variables from `apps/web/.env.production.example`.
4. **Deploy**: Build will trigger automatically.

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

*Last updated: March 3, 2026*
