# 🚀 Production Deployment Guide - School Management System

## 📋 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PRODUCTION SETUP                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Frontend (Next.js PWA)          Backend (Express API)  │
│  ├─ Vercel                       ├─ Render.com         │
│  ├─ Free Tier                    ├─ Free Tier          │
│  ├─ Auto SSL (HTTPS)             ├─ Auto SSL (HTTPS)   │
│  ├─ Edge Network                 ├─ 512 MB RAM         │
│  └─ Instant deploys              └─ Spins down after   │
│                                      15 min inactivity  │
│                                                          │
│  Database (PostgreSQL)                                  │
│  ├─ Neon.tech                                          │
│  ├─ Free Tier                                          │
│  ├─ 512 MB storage                                     │
│  └─ Serverless Postgres                                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🆓 Free Tier Comparison

### Option 1: ✅ **RECOMMENDED** (Best for your use case)

| Service | Free Tier Limits | Best For |
|---------|------------------|----------|
| **Vercel** (Frontend) | 100 GB bandwidth/month, Unlimited projects | Next.js (optimized) |
| **Render** (Backend) | 750 hours/month, 512 MB RAM, Spins down after 15 min | Express APIs |
| **Neon** (Database) | 512 MB storage, 1 project | PostgreSQL |

**Total Cost: $0/month**

### Option 2: Alternative Backend Hosting

| Service | Free Tier | Pros | Cons |
|---------|-----------|------|------|
| **Railway** | $5 free credit/month (≈ 500 hours) | Doesn't spin down, easy setup | Credit expires |
| **Fly.io** | 3 VMs (256 MB each), 3 GB storage | Always-on, multiple regions | Complex setup |
| **Cyclic** | Unlimited apps, 1 GB RAM | Simple, doesn't spin down | Limited to AWS regions |

---

## 🎯 Recommended: Vercel + Render + Neon

**Why this combination?**
- ✅ **100% Free** (no credit card needed initially)
- ✅ **Auto HTTPS** (required for PWA)
- ✅ **Easy deployment** (Git-based)
- ✅ **Good performance** for school management
- ✅ **Generous free tiers**
- ⚠️ **Render spins down** after 15 min inactivity (acceptable for school hours usage)

---

## 📦 Pre-Deployment Checklist

### ✅ Before You Start

- [ ] GitHub account created
- [ ] Code pushed to GitHub repository
- [ ] Neon database created and connection string ready
- [ ] Vercel account (free - sign up with GitHub)
- [ ] Render account (free - sign up with GitHub)

---

## 🗄️ Step 1: Database Setup (Neon)

### If You Already Have Neon Database

1. **Get your connection string:**
   ```
   postgresql://username:password@host.neon.tech/dbname?sslmode=require
   ```

2. **Update Connection String Format:**
   ```
   # Neon provides this format - copy it exactly
   DATABASE_URL="postgresql://user:pass@ep-xxx.region.neon.tech/neondb?sslmode=require"
   ```

### If You Need to Create New Database

1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub (free)
3. Create new project: "school-management-prod"
4. Copy the connection string
5. Save it for Step 3 (Render deployment)

---

## 🔧 Step 2: Prepare Your Code

### 2.1 Create Production Environment Files

**Create `api/.env.production` (DO NOT COMMIT):**
```bash
# Database (from Neon)
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"

# JWT Secret (generate a strong one)
JWT_SECRET="your-super-secret-production-key-min-32-chars-random-string"
JWT_EXPIRES_IN=7d

# Server
PORT=5001
NODE_ENV=production

# CORS (will update after deploying frontend)
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

**Create `.env.production` in root (DO NOT COMMIT):**
```bash
# API URL (will update after deploying backend)
NEXT_PUBLIC_API_URL=https://your-render-app.onrender.com/api

# App URL (will update after deploying frontend)
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app

# App Configuration
NEXT_PUBLIC_APP_NAME="School Management System"
```

### 2.2 Update `.gitignore`

Make sure these are in your `.gitignore`:
```gitignore
# Environment variables
.env
.env.local
.env.production
.env*.local
api/.env
api/.env.production

# Dependencies
node_modules/
api/node_modules/

# Build outputs
.next/
dist/
api/dist/

# PWA
public/sw.js
public/workbox-*.js
```

### 2.3 Create `vercel.json` (Frontend Config)

**Create in ROOT directory:**
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["sin1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "@next_public_api_url",
    "NEXT_PUBLIC_APP_URL": "@next_public_app_url",
    "NEXT_PUBLIC_APP_NAME": "School Management System"
  }
}
```

### 2.4 Update `package.json` Scripts (Root)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "npm run generate:splash && next build",
    "start": "next start",
    "lint": "next lint",
    "generate:splash": "node scripts/generate-splash-screens.js",
    "generate:pwa-assets": "npm run generate:splash",
    "vercel-build": "npm run build"
  }
}
```

### 2.5 Create Render Configuration

**Create `api/render.yaml`:**
```yaml
services:
  - type: web
    name: school-management-api
    env: node
    region: singapore
    plan: free
    buildCommand: npm install && npm run prisma:generate && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: CORS_ORIGIN
        sync: false
      - key: PORT
        value: 5001
```

### 2.6 Commit and Push

```bash
# From root directory
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

---

## 🚀 Step 3: Deploy Backend to Render

### 3.1 Create New Web Service

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repository
5. Select your repo: `SchoolManagementApp`

### 3.2 Configure Service

**Basic Settings:**
- **Name:** `school-management-api`
- **Region:** Singapore (closest to Southeast Asia)
- **Branch:** `main`
- **Root Directory:** `api`
- **Runtime:** Node
- **Build Command:**
  ```bash
  npm install && npx prisma generate && npm run build
  ```
- **Start Command:**
  ```bash
  npm start
  ```

### 3.3 Set Environment Variables

Click **"Environment"** tab and add:

```bash
NODE_ENV=production
PORT=5001
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
JWT_SECRET=your-super-secret-production-key-min-32-chars
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
```

⚠️ **Important:** We'll update `CORS_ORIGIN` after deploying frontend

### 3.4 Deploy

1. Click **"Create Web Service"**
2. Wait 5-10 minutes for deployment
3. **Copy your API URL:**
   ```
   https://school-management-api.onrender.com
   ```
4. **Save this URL** - you'll need it for frontend

### 3.5 Run Database Migrations

After first deployment:

1. Go to **Shell** tab in Render dashboard
2. Run:
   ```bash
   npx prisma migrate deploy
   ```

---

## 🌐 Step 4: Deploy Frontend to Vercel

### 4.1 Import Project

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click **"Add New..."** → **"Project"**
4. Import your repository: `SchoolManagementApp`
5. Vercel auto-detects Next.js

### 4.2 Configure Project

**Framework Preset:** Next.js (auto-detected)

**Root Directory:** `.` (leave as root)

**Build Settings:**
- **Build Command:** `npm run build` (auto)
- **Output Directory:** `.next` (auto)
- **Install Command:** `npm install` (auto)

### 4.3 Set Environment Variables

Click **"Environment Variables"** and add:

```bash
# REQUIRED - Your Render API URL from Step 3.4
NEXT_PUBLIC_API_URL=https://school-management-api.onrender.com/api

# Will auto-generate, or set your custom domain
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app

# App name
NEXT_PUBLIC_APP_NAME=School Management System
```

**Important:** Replace `school-management-api.onrender.com` with YOUR actual Render URL!

### 4.4 Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes
3. **Copy your frontend URL:**
   ```
   https://school-management-app-xyz.vercel.app
   ```

---

## 🔗 Step 5: Connect Frontend & Backend

### 5.1 Update Backend CORS

Go back to **Render dashboard** → Your API service → **Environment**:

**Update:**
```bash
CORS_ORIGIN=https://school-management-app-xyz.vercel.app
```

Replace with YOUR actual Vercel URL!

**Click "Save Changes"** - Render will auto-redeploy

### 5.2 Update Frontend Environment Variables

Go to **Vercel dashboard** → Your project → **Settings** → **Environment Variables**:

**Update (if needed):**
```bash
NEXT_PUBLIC_APP_URL=https://school-management-app-xyz.vercel.app
```

Replace with YOUR actual Vercel URL!

### 5.3 Update `robots.txt`

**Update in your code:**
```bash
# In /public/robots.txt
User-agent: *
Allow: /

Sitemap: https://school-management-app-xyz.vercel.app/sitemap.xml
```

**Commit and push:**
```bash
git add public/robots.txt
git commit -m "Update robots.txt with production URL"
git push origin main
```

Vercel will auto-deploy!

---

## ✅ Step 6: Verify Deployment

### 6.1 Test Backend API

Open in browser:
```
https://school-management-api.onrender.com/api/health
```

Should return: `{"status": "ok"}` or similar

### 6.2 Test Frontend

Open:
```
https://school-management-app-xyz.vercel.app
```

Should load the login page!

### 6.3 Test Authentication

1. Try logging in with: `admin@school.edu.kh` / `Admin@123`
2. Check browser console (F12) for errors
3. Verify API calls are going to Render URL

### 6.4 Test PWA

**On Desktop (Chrome):**
1. Open your Vercel URL
2. F12 → Lighthouse → PWA Audit
3. Should score 90+%

**On Mobile:**
1. Open on iPhone Safari or Android Chrome
2. Add to Home Screen
3. Open as standalone app
4. Verify splash screens work (iOS)

---

## 🎨 Step 7: Custom Domain (Optional)

### 7.1 Add Custom Domain to Vercel

1. Vercel Dashboard → Your project → **Settings** → **Domains**
2. Add your domain: `schoolms.yourschool.edu.kh`
3. Follow DNS instructions
4. Vercel auto-configures SSL

### 7.2 Update Environment Variables

**Vercel:**
```bash
NEXT_PUBLIC_APP_URL=https://schoolms.yourschool.edu.kh
```

**Render:**
```bash
CORS_ORIGIN=https://schoolms.yourschool.edu.kh
```

---

## ⚙️ Ongoing Maintenance

### Deploying Updates

**Automatic (Recommended):**
```bash
git add .
git commit -m "Your changes"
git push origin main
```
Both Vercel and Render auto-deploy on push!

**Manual Redeploy:**
- Vercel: Dashboard → Deployments → Redeploy
- Render: Dashboard → Manual Deploy → Deploy latest commit

### Database Migrations

When you change Prisma schema:

1. Update `schema.prisma`
2. Generate migration locally:
   ```bash
   cd api
   npx prisma migrate dev --name your_migration_name
   ```
3. Commit and push
4. In Render Shell:
   ```bash
   npx prisma migrate deploy
   ```

### Monitoring

**Render:**
- View logs: Dashboard → Logs
- Check status: Dashboard → Events
- Free tier: 750 hours/month (enough for 24/7 with some buffer)

**Vercel:**
- View deployments: Dashboard → Deployments
- Analytics (if needed): Dashboard → Analytics
- Free tier: 100 GB bandwidth/month

**Neon:**
- Monitor usage: Dashboard → Your Project
- Free tier: 512 MB storage

---

## 🚨 Important Notes

### Render Free Tier Limitations

⚠️ **Service spins down after 15 minutes of inactivity**

**Impact:**
- First request after sleep: 30-60 second cold start
- Acceptable for school hours usage
- NOT suitable for 24/7 real-time apps

**Solutions if needed:**
1. **Keep-alive service** (ping every 14 minutes)
2. **Upgrade to paid** ($7/month for always-on)
3. **Switch to Railway** (doesn't spin down, has free credit)

### Database Backups

**Neon Free Tier:**
- Point-in-time restore: 7 days
- Manual backups: Use `pg_dump`

**Backup command:**
```bash
pg_dump "postgresql://user:pass@ep-xxx.neon.tech/neondb" > backup.sql
```

---

## 🐛 Troubleshooting

### Issue 1: CORS Errors

**Symptoms:** "CORS policy blocked" in browser console

**Solution:**
1. Check `CORS_ORIGIN` in Render matches Vercel URL exactly
2. Must include `https://`
3. No trailing slash

### Issue 2: API Not Connecting

**Check:**
1. Render service is running (Dashboard → Status)
2. API URL in Vercel env vars is correct
3. API URL has `/api` at the end

### Issue 3: Database Connection Failed

**Check:**
1. `DATABASE_URL` in Render has `?sslmode=require`
2. Neon database is not paused
3. Connection string is correct

### Issue 4: Build Fails

**Render:**
- Check logs: Dashboard → Logs
- Common: Missing dependencies, TypeScript errors
- Solution: Fix locally, test with `npm run build`, then push

**Vercel:**
- Check deployment logs
- Common: Environment variables missing
- Solution: Add required env vars in Settings

### Issue 5: Render Sleeping

**First request slow?**
- Normal for free tier
- Cold start: 30-60 seconds
- Subsequent requests: Fast

**Keep service awake (optional):**
```javascript
// Create a cron job or external service to ping every 14 min
setInterval(() => {
  fetch('https://school-management-api.onrender.com/api/health')
}, 14 * 60 * 1000)
```

---

## 💰 Cost Comparison

### Current Setup (Free)

| Service | Free Tier | Monthly Cost |
|---------|-----------|--------------|
| Vercel | 100 GB bandwidth | $0 |
| Render | 750 hours | $0 |
| Neon | 512 MB storage | $0 |
| **Total** | | **$0/month** |

### If You Need More (Paid)

| Service | Paid Tier | Monthly Cost |
|---------|-----------|--------------|
| Vercel Pro | Unlimited bandwidth | $20 |
| Render Starter | Always-on, 512 MB | $7 |
| Neon Pro | 10 GB storage | $19 |
| **Total** | | **$46/month** |

---

## 🎯 Alternative: All-in-One Platform

If you want simpler deployment (but less control):

### Vercel + Vercel Postgres + Edge Functions

**Pros:**
- ✅ Everything in one place
- ✅ No cold starts
- ✅ Simpler setup

**Cons:**
- ❌ More expensive at scale
- ❌ Vendor lock-in
- ❌ Less flexible for complex APIs

---

## 📚 Quick Reference

### Essential URLs (Update with yours)

```bash
# Frontend
https://school-management-app.vercel.app

# Backend API
https://school-management-api.onrender.com/api

# Database Dashboard
https://console.neon.tech

# Vercel Dashboard
https://vercel.com/dashboard

# Render Dashboard
https://dashboard.render.com
```

### Environment Variables Checklist

**Vercel (Frontend):**
- [x] `NEXT_PUBLIC_API_URL`
- [x] `NEXT_PUBLIC_APP_URL`
- [x] `NEXT_PUBLIC_APP_NAME`

**Render (Backend):**
- [x] `DATABASE_URL`
- [x] `JWT_SECRET`
- [x] `CORS_ORIGIN`
- [x] `NODE_ENV=production`
- [x] `PORT=5001`

---

## 🎓 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Production Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)

---

## ✅ Final Deployment Checklist

Before going live:

- [ ] Database migrations deployed to Neon
- [ ] Backend deployed to Render and running
- [ ] Frontend deployed to Vercel and accessible
- [ ] CORS configured correctly
- [ ] Environment variables set on both platforms
- [ ] `robots.txt` updated with production URL
- [ ] PWA tested on mobile devices (iOS + Android)
- [ ] Authentication working end-to-end
- [ ] Test CRUD operations (Create, Read, Update, Delete)
- [ ] Test reports generation
- [ ] Test offline mode
- [ ] Monitor for 24 hours for any errors
- [ ] Create database backup
- [ ] Document production URLs for team

---

**Last Updated:** December 2025
**Version:** 1.0.0
**Status:** Production Ready 🚀
