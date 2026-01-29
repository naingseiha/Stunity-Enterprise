# 🚀 Quick Deployment Checklist

## ✅ Pre-Deployment (Do Once)

### Setup Accounts (Free)
- [ ] Create [GitHub](https://github.com) account
- [ ] Create [Vercel](https://vercel.com) account (sign up with GitHub)
- [ ] Create [Render](https://render.com) account (sign up with GitHub)
- [ ] Create [Neon](https://neon.tech) account (sign up with GitHub)

### Prepare Database
- [ ] Create new Neon project: "school-management-prod"
- [ ] Copy database connection string
- [ ] Save connection string securely (you'll need it for Render)

### Prepare Code
- [ ] Push all code to GitHub
- [ ] Ensure `.gitignore` excludes sensitive files
- [ ] Generate strong JWT secret: `openssl rand -base64 32`

---

## 🗄️ Step 1: Deploy Backend (Render)

### Deploy API
- [ ] Go to [Render Dashboard](https://dashboard.render.com)
- [ ] Click "New +" → "Web Service"
- [ ] Connect GitHub repository
- [ ] Select repository: `SchoolManagementApp`

### Configure Service
- [ ] **Name:** `school-management-api`
- [ ] **Region:** Singapore
- [ ] **Root Directory:** `api`
- [ ] **Build Command:** `npm install && npx prisma generate && npm run build`
- [ ] **Start Command:** `npm start`

### Set Environment Variables
```bash
NODE_ENV=production
PORT=5001
DATABASE_URL=<paste-your-neon-connection-string>
JWT_SECRET=<paste-your-generated-secret>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
```

- [ ] Add all environment variables
- [ ] Click "Create Web Service"
- [ ] Wait for deployment (~5-10 minutes)
- [ ] **SAVE YOUR API URL:** `https://school-management-api-xxx.onrender.com`

### Run Database Migration
- [ ] Go to Shell tab in Render
- [ ] Run: `npx prisma migrate deploy`
- [ ] Verify: `npx prisma db seed` (optional - seed data)

### Test Backend
- [ ] Open: `https://your-api-url.onrender.com/api/health`
- [ ] Should return health status

---

## 🌐 Step 2: Deploy Frontend (Vercel)

### Deploy App
- [ ] Go to [Vercel Dashboard](https://vercel.com/dashboard)
- [ ] Click "Add New..." → "Project"
- [ ] Import repository: `SchoolManagementApp`
- [ ] Vercel auto-detects Next.js (no changes needed)

### Set Environment Variables
```bash
NEXT_PUBLIC_API_URL=<your-render-url>/api
NEXT_PUBLIC_APP_URL=<will-be-generated>
NEXT_PUBLIC_APP_NAME=School Management System
```

**Example:**
```bash
NEXT_PUBLIC_API_URL=https://school-management-api-xxx.onrender.com/api
NEXT_PUBLIC_APP_URL=https://school-management-app.vercel.app
NEXT_PUBLIC_APP_NAME=School Management System
```

- [ ] Add environment variables
- [ ] Click "Deploy"
- [ ] Wait for deployment (~2-3 minutes)
- [ ] **SAVE YOUR FRONTEND URL:** `https://school-management-app-xxx.vercel.app`

### Test Frontend
- [ ] Open your Vercel URL
- [ ] Should see login page
- [ ] Try logging in (admin@school.edu.kh / Admin@123)

---

## 🔗 Step 3: Connect Frontend & Backend

### Update Backend CORS
- [ ] Go to Render Dashboard → Your API → Environment
- [ ] Update `CORS_ORIGIN` to your Vercel URL:
  ```bash
  CORS_ORIGIN=https://school-management-app-xxx.vercel.app
  ```
- [ ] Click "Save Changes"
- [ ] Wait for auto-redeploy (~2 minutes)

### Update Frontend URL (if needed)
- [ ] Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- [ ] Update `NEXT_PUBLIC_APP_URL` if it changed
- [ ] Redeploy: Deployments → Latest → Redeploy

### Update robots.txt
- [ ] Edit `public/robots.txt` in your code:
  ```
  Sitemap: https://your-vercel-url.vercel.app/sitemap.xml
  ```
- [ ] Commit and push:
  ```bash
  git add public/robots.txt
  git commit -m "Update production URLs"
  git push origin main
  ```
- [ ] Vercel auto-deploys

---

## ✅ Step 4: Verify Everything Works

### Test Backend
- [ ] API health check works
- [ ] Can create/read/update/delete data
- [ ] Authentication works
- [ ] Check Render logs for errors

### Test Frontend
- [ ] App loads correctly
- [ ] Login works
- [ ] Dashboard displays
- [ ] Can navigate to all pages
- [ ] API calls work (check Network tab)
- [ ] No CORS errors in console

### Test PWA Features
- [ ] Run Lighthouse audit (should score 90+)
- [ ] iOS: Add to Home Screen → Check splash screen
- [ ] Android: Install app → Check splash screen
- [ ] Test offline mode
- [ ] Verify install prompt appears

### Test Full Workflow
- [ ] Add a student
- [ ] Add a class
- [ ] Enter grades
- [ ] Mark attendance
- [ ] Generate a report
- [ ] Export data

---

## 🎨 Step 5: Optional - Custom Domain

### Add Domain to Vercel
- [ ] Vercel → Settings → Domains
- [ ] Add your domain
- [ ] Update DNS records (follow Vercel instructions)
- [ ] Wait for SSL certificate (automatic)

### Update Environment Variables
- [ ] Vercel: Update `NEXT_PUBLIC_APP_URL` to custom domain
- [ ] Render: Update `CORS_ORIGIN` to custom domain
- [ ] Update `robots.txt` with custom domain
- [ ] Redeploy both services

---

## 📊 Post-Deployment Monitoring

### First 24 Hours
- [ ] Monitor Render logs for errors
- [ ] Check Vercel deployment logs
- [ ] Test on multiple devices
- [ ] Verify database connections stable
- [ ] Check for any performance issues

### Ongoing
- [ ] Create database backup (weekly)
- [ ] Monitor Render usage (750 hours/month limit)
- [ ] Monitor Vercel bandwidth (100 GB/month limit)
- [ ] Monitor Neon storage (512 MB limit)

---

## 🐛 Troubleshooting Quick Reference

### CORS Errors
✅ Check `CORS_ORIGIN` in Render matches Vercel URL exactly
✅ Include `https://`, no trailing slash
✅ Redeploy backend after changing

### API Not Connecting
✅ Render service is running (check dashboard)
✅ `NEXT_PUBLIC_API_URL` has `/api` at the end
✅ Check Network tab in browser for actual error

### Database Connection Failed
✅ `DATABASE_URL` has `?sslmode=require`
✅ Neon database is not paused
✅ Run `npx prisma generate` in Render Shell

### Build Fails
✅ Check deployment logs
✅ Test build locally: `npm run build`
✅ Ensure all environment variables are set

### Render Sleeping (Cold Start)
✅ Normal for free tier
✅ First request: 30-60 seconds
✅ Subsequent requests: fast
✅ Consider keep-alive service or upgrade

---

## 📞 Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Render Docs:** https://render.com/docs
- **Neon Docs:** https://neon.tech/docs
- **Deployment Guide:** See DEPLOYMENT_GUIDE.md
- **PWA Testing:** See docs/PWA_TESTING_GUIDE.md

---

## ✨ You're Done!

Your School Management System is now live in production! 🎉

**Share these URLs with your team:**
- Frontend: `https://your-app.vercel.app`
- Admin Login: `admin@school.edu.kh` / `Admin@123`

**Remember:**
- Render free tier spins down after 15 min inactivity
- First request after sleep may be slow (30-60 sec)
- Perfect for school hours usage
- Consider upgrading if you need 24/7 availability

---

**Deployed:** [Date]
**Status:** ✅ Production Live
**Next:** Monitor for 24 hours, then celebrate! 🎊
