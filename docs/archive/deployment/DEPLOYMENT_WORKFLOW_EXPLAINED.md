# 🚀 YOUR DEPLOYMENT WORKFLOW - Simple Guide

## 📋 What You Need to Do

Since you deploy via **GitHub → Vercel/Render**, here are your options:

---

## ✅ OPTION 1: Use the Automated Script (EASIEST)

**What it does:**
```
1. Backs up Neon database
2. Runs migration on Neon
3. Commits code to Git
4. Pushes to GitHub
5. Vercel + Render auto-deploy from GitHub
```

**Command:**
```bash
export DATABASE_URL="your-production-neon-url"
./deploy-production.sh
```

**The script will ask you at each step:**
- ✅ Create backup? → YES
- ✅ Deploy migration? → YES (if safe)
- ✅ Commit and push? → YES
- ✅ Push to GitHub? → YES

**Then automatically:**
- Vercel deploys frontend (from GitHub)
- Render deploys API (from GitHub)

---

## ✅ OPTION 2: Manual Step-by-Step (MORE CONTROL)

If you prefer your existing workflow, do this:

### Step 1: Migrate Database (Neon) FIRST
```bash
# Set your production database URL
export DATABASE_URL="postgresql://your-neon-url..."

# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Run migration
cd api
npx prisma migrate deploy

# Verify
npx prisma migrate status
```

### Step 2: Push Code to GitHub (Same as Always)
```bash
cd ..
git add .
git commit -m "feat: add student login system"
git push origin main
```

### Step 3: Vercel & Render Auto-Deploy (Same as Always)
- ✅ Vercel detects GitHub push → deploys frontend
- ✅ Render detects GitHub push → deploys API
- ✅ You can monitor in their dashboards

---

## 🎯 RECOMMENDED WORKFLOW FOR YOU

Since you're familiar with **Git → GitHub → Auto-deploy**, I recommend:

### **Option 2B: Safest Manual Approach**

```bash
# === STEP 1: BACKUP DATABASE (MANDATORY) ===
export DATABASE_URL="your-production-neon-url"
pg_dump $DATABASE_URL > backup_student_login_$(date +%Y%m%d).sql
# ✅ Verify backup file exists and has content

# === STEP 2: RUN MIGRATION ON NEON ===
cd api
npx prisma migrate deploy
# ✅ Check output - should say "migration successful"

# === STEP 3: VERIFY MIGRATION ===
npx prisma migrate status
# ✅ Should show all migrations applied

# === STEP 4: SET DEFAULT VALUES ===
# (Optional but recommended for existing students)
npx ts-node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.student.updateMany({
  data: { isAccountActive: true, studentRole: 'GENERAL' }
}).then(r => console.log('Updated:', r.count))
  .finally(() => prisma.$disconnect());
"

# === STEP 5: DEPLOY CODE (YOUR NORMAL WORKFLOW) ===
cd ..
git status
git add .
git commit -m "feat: add student login system with account management"
git push origin main

# === STEP 6: MONITOR AUTO-DEPLOYMENTS ===
# - Go to Vercel dashboard → Watch frontend deploy
# - Go to Render dashboard → Watch API deploy
# - Usually takes 2-5 minutes each
```

---

## ⚠️ CRITICAL ORDER

**ALWAYS do in this order:**

1. **BACKUP DATABASE** ← Do this FIRST!
2. **MIGRATE DATABASE** ← Then this
3. **PUSH TO GITHUB** ← Then this
4. **AUTO-DEPLOY** ← Happens automatically

**WHY this order?**
- If you push code first, Render will deploy new code to old database schema = ERROR
- Migration must happen BEFORE code deploy

---

## 🚨 WHAT IF SOMETHING GOES WRONG?

### If Migration Fails:
```bash
# Restore from backup
psql $DATABASE_URL < backup_student_login_YYYYMMDD.sql
```

### If Render Deploy Fails:
```bash
# In Render dashboard:
# 1. Go to your service
# 2. Click "Manual Deploy"
# 3. Select previous deployment
# 4. Click "Rollback"
```

### If Vercel Deploy Fails:
```bash
# In Vercel dashboard:
# 1. Go to your project
# 2. Click "Deployments"
# 3. Find previous working deployment
# 4. Click "..." → "Promote to Production"
```

---

## 📝 QUICK CHECKLIST

**Before pushing to GitHub:**
- [ ] ✅ Database backup created
- [ ] ✅ Migration successful on Neon
- [ ] ✅ Migration verified with `prisma migrate status`
- [ ] ✅ Tested locally (optional but recommended)

**After pushing to GitHub:**
- [ ] ✅ Watch Render deployment logs
- [ ] ✅ Watch Vercel deployment logs
- [ ] ✅ Test teacher login (should work unchanged)
- [ ] ✅ Test API health endpoint

---

## 🎯 TL;DR - Quick Commands

```bash
# 1. Backup (do this first!)
pg_dump $DATABASE_URL > backup.sql

# 2. Migrate Neon
cd api && npx prisma migrate deploy && cd ..

# 3. Your normal workflow
git add .
git commit -m "feat: student login"
git push origin main

# 4. Monitor dashboards
# Vercel: auto-deploys
# Render: auto-deploys
```

---

## ❓ YOUR QUESTION ANSWERED

**Q:** "Only run ./deploy-production.sh for Neon only?"

**A:** No, the script does:
1. ✅ Neon migration
2. ✅ Git commit + push
3. ✅ Triggers Vercel/Render (via GitHub push)

**BUT** you can do it manually if you prefer:
1. Migrate Neon manually
2. Push to GitHub manually (your normal way)
3. Vercel/Render auto-deploy as usual

**Choose what you're comfortable with!**

---

## 🎉 RECOMMENDATION

Since you're experienced with Git workflow:

**Use Manual Option (Option 2B)** - gives you full control at each step.

The script is there if you want automation + safety checks.

---

**Any questions? Ready to proceed?**
