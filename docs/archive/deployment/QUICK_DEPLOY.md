# ⚡ Quick Deploy - You Already Have Accounts!

Since you already have Vercel and Render accounts, here's the streamlined deployment process.

**Total Time: ~20 minutes**

---

## 🎯 Deployment Order

```
1. Neon (Database)     - 2 minutes  (if not done)
2. Render (Backend)    - 10 minutes
3. Vercel (Frontend)   - 5 minutes
4. Connect & Test      - 3 minutes
```

---

## 🗄️ Step 1: Neon Database (2 min)

### If You Already Have Your Neon Database

Skip to Step 2 - just have your connection string ready:
```
postgresql://username:password@ep-xxx.region.neon.tech/dbname?sslmode=require
```

### If You Need to Create It

1. Go to [console.neon.tech](https://console.neon.tech)
2. Click **"Create Project"**
3. Name: `school-management-prod`
4. Region: **Singapore** (closest to Cambodia)
5. **Copy the connection string** - you'll need it in 2 minutes

---

## 🔧 Step 2: Deploy Backend to Render (10 min)

### 2.1 Create Web Service

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Click **"Build and deploy from a Git repository"**
4. Click **"Connect"** next to your GitHub repository
5. Select repository: **`SchoolManagementApp`**

### 2.2 Configure Service

Fill in these settings:

| Setting | Value |
|---------|-------|
| **Name** | `school-management-api` (or your choice) |
| **Region** | Singapore |
| **Branch** | `main` |
| **Root Directory** | `api` |
| **Runtime** | Node |
| **Build Command** | `npm install && npx prisma generate && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Free |

### 2.3 Add Environment Variables

Click **"Advanced"** → Scroll to **"Environment Variables"** → Click **"Add Environment Variable"**

Add these **5 variables**:

```bash
# 1. Node Environment
NODE_ENV=production

# 2. Port
PORT=5001

# 3. Database URL (paste your Neon connection string)
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require

# 4. JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=paste-your-generated-secret-here

# 5. CORS (temporary - we'll update this after deploying frontend)
CORS_ORIGIN=*
```

**To generate JWT_SECRET:**
```bash
# Run this in your terminal:
openssl rand -base64 32

# Copy the output and paste as JWT_SECRET
```

### 2.4 Deploy

1. Click **"Create Web Service"**
2. Wait 5-10 minutes (watch the logs)
3. When it says **"Live"** → Click your service URL
4. **COPY THIS URL** - you'll need it for Vercel!

Example: `https://school-management-api-abc123.onrender.com`

### 2.5 Run Database Migration

1. In Render dashboard, go to your service
2. Click **"Shell"** tab (top right)
3. Run this command:
```bash
npx prisma migrate deploy
```

4. (Optional) Seed default data:
```bash
npx prisma db seed
```

### 2.6 Test Backend

Open in browser:
```
https://your-render-url.onrender.com/api/health
```

Should return success! ✅

---

## 🌐 Step 3: Deploy Frontend to Vercel (5 min)

### 3.1 Import Project

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Find your repository: **`SchoolManagementApp`**
4. Click **"Import"**

### 3.2 Configure Project

Vercel auto-detects Next.js - **DON'T CHANGE** these:

| Setting | Auto-Detected |
|---------|---------------|
| Framework Preset | Next.js |
| Root Directory | `./` |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Install Command | `npm install` |

### 3.3 Add Environment Variables

**IMPORTANT:** Add these **3 variables** before deploying!

Click **"Environment Variables"** section:

```bash
# 1. API URL (use YOUR Render URL from Step 2.4)
NEXT_PUBLIC_API_URL=https://school-management-api-abc123.onrender.com/api

# 2. App URL (leave as placeholder for now)
NEXT_PUBLIC_APP_URL=https://placeholder.vercel.app

# 3. App Name
NEXT_PUBLIC_APP_NAME=School Management System
```

**Replace** `school-management-api-abc123.onrender.com` with YOUR actual Render URL!

### 3.4 Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes
3. When done, click **"Visit"** or copy the URL
4. **COPY YOUR VERCEL URL** - you'll need it!

Example: `https://school-management-app.vercel.app`

---

## 🔗 Step 4: Connect Frontend & Backend (3 min)

### 4.1 Update Backend CORS

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click your **API service**
3. Go to **"Environment"** tab
4. Find **`CORS_ORIGIN`**
5. Click **Edit** and change from `*` to your **Vercel URL**:
```bash
CORS_ORIGIN=https://school-management-app.vercel.app
```
6. Click **"Save Changes"**
7. Render will **auto-redeploy** (~2 minutes)

### 4.2 Update Frontend App URL

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click your project
3. Go to **Settings** → **Environment Variables**
4. Find **`NEXT_PUBLIC_APP_URL`**
5. Click **Edit** and update to your **actual Vercel URL**:
```bash
NEXT_PUBLIC_APP_URL=https://school-management-app.vercel.app
```
6. Click **"Save"**
7. Go to **Deployments** tab → Click **"Redeploy"** (latest deployment)

---

## ✅ Step 5: Test Everything (2 min)

### 5.1 Test Backend

Open: `https://your-render-url.onrender.com/api/health`

✅ Should return health status

### 5.2 Test Frontend

1. Open: `https://your-vercel-url.vercel.app`
2. Should see login page
3. Open browser console (F12)
4. **Check for CORS errors** - should be NONE!

### 5.3 Test Login

Login with:
- Email: `admin@school.edu.kh`
- Password: `Admin@123`

✅ Should redirect to dashboard!

### 5.4 Test PWA

1. Open Chrome DevTools (F12)
2. Go to **Lighthouse** tab
3. Select **"Progressive Web App"**
4. Click **"Generate report"**
5. Should score **90+%** ✅

---

## 🎨 Optional: Update robots.txt (1 min)

### Update Your Code

```bash
# Edit public/robots.txt
User-agent: *
Allow: /

Sitemap: https://your-vercel-url.vercel.app/sitemap.xml
```

### Commit & Push

```bash
git add public/robots.txt
git commit -m "Update robots.txt with production URL"
git push origin main
```

Vercel will auto-deploy in ~2 minutes!

---

## 🎯 Your Production URLs

After deployment, save these:

```bash
# Frontend (Share this with users!)
https://school-management-app.vercel.app

# Backend API
https://school-management-api.onrender.com/api

# Admin Login
Email: admin@school.edu.kh
Password: Admin@123
```

**⚠️ IMPORTANT:** Change the admin password after first login!

---

## 🐛 Quick Troubleshooting

### CORS Error in Browser Console

**Symptom:** `Access to fetch at ... from origin ... has been blocked by CORS policy`

**Fix:**
1. Check `CORS_ORIGIN` in Render **EXACTLY** matches Vercel URL
2. Must include `https://`
3. NO trailing slash
4. Redeploy Render after changing

### API Requests Failing

**Check:**
1. Network tab in browser - what's the actual error?
2. Render service is running (dashboard shows "Live")
3. `NEXT_PUBLIC_API_URL` has `/api` at the end

### "Failed to fetch" Errors

**First request after Render sleep (15 min)?**
- This is normal! Free tier spins down
- First request: 30-60 seconds
- Subsequent requests: Fast

**Persistent failures?**
- Check Render logs: Dashboard → Your service → Logs
- Look for errors during startup

### Database Connection Errors

**Check:**
1. `DATABASE_URL` has `?sslmode=require` at the end
2. Neon database is active (not paused)
3. Run migrations: `npx prisma migrate deploy` in Render Shell

### Build Failures

**Render:**
- Check build logs in dashboard
- Common: Missing environment variables
- Test locally: `cd api && npm run build`

**Vercel:**
- Check deployment logs
- Common: `NEXT_PUBLIC_API_URL` not set
- Make sure you added env vars BEFORE deploying

---

## 📊 Monitor Your App

### First 24 Hours

Check these daily:

1. **Render Logs:** Dashboard → Your service → Logs
2. **Vercel Deployments:** Dashboard → Your project → Deployments
3. **Test key features:**
   - Login
   - Add a student
   - Enter grades
   - Generate a report

### Ongoing Monitoring

- **Render:** 750 hours/month (plenty, even with cold starts)
- **Vercel:** 100 GB bandwidth/month (very generous)
- **Neon:** 512 MB storage (check if you're approaching limit)

---

## 🔄 Deploying Updates

### Automatic (Recommended)

```bash
# Make your changes
git add .
git commit -m "Your update description"
git push origin main
```

**Both Vercel and Render auto-deploy on push!** (~2-3 minutes)

### Manual Redeploy

**Vercel:**
- Dashboard → Deployments → Three dots → Redeploy

**Render:**
- Dashboard → Manual Deploy → Deploy latest commit

---

## 💾 Database Migrations (When You Change Schema)

```bash
# 1. Make changes to api/prisma/schema.prisma locally

# 2. Create migration
cd api
npx prisma migrate dev --name your_migration_name

# 3. Commit and push
git add .
git commit -m "Database migration: your_migration_name"
git push origin main

# 4. In Render Shell, run:
npx prisma migrate deploy
```

---

## 🎊 You're Live!

Your School Management System is now in production! 🎉

**Next Steps:**

1. ✅ Test all features thoroughly
2. ✅ Add real students/teachers/classes
3. ✅ Change admin password
4. ✅ Share URL with your team
5. ✅ Monitor for any errors in first week
6. ✅ Create database backup (weekly)

---

## 📞 Need Help?

- **Detailed Guide:** `DEPLOYMENT_GUIDE.md`
- **Checklist:** `DEPLOYMENT_CHECKLIST.md`
- **PWA Testing:** `docs/PWA_TESTING_GUIDE.md`
- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs

---

## 💰 Free Tier Limits

You're on 100% free tier:

| Service | Limit | Enough For |
|---------|-------|------------|
| Render | 750 hours/month | 24/7 with buffer (but spins down) |
| Vercel | 100 GB bandwidth | ~50,000 page views/month |
| Neon | 512 MB storage | ~10,000 students |

**If you exceed:** Upgrade options available (~$7-20/month)

---

**Happy Deploying! 🚀**

*Your app will be live in ~20 minutes following these steps!*
