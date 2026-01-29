# 🚀 Deployment Commands - Copy & Paste

## ✅ Database Migration: COMPLETE ✓

## 📦 Now Deploy Code to Production:

```bash
# 1. Stage all changes
git add .

# 2. Commit with descriptive message
git commit -m "feat: add student login system with account management

- Add student authentication (login with studentCode/email/phone)
- Add admin account management (deactivate/activate bulk operations)
- Add student roles (CLASS_LEADER, VICE_LEADER_1, VICE_LEADER_2)
- Add admin dashboard for account statistics
- Add login UI toggle between teacher/student modes
- Add comprehensive API documentation
- Database migration: add studentRole, isAccountActive fields
- Safety: All migrations tested and backward compatible"

# 3. Push to GitHub (triggers Vercel + Render auto-deploy)
git push origin main
```

## 🔍 After Push - Monitor:

**Render (API):**
- Go to: https://dashboard.render.com
- Watch deployment logs
- Should complete in 2-5 minutes

**Vercel (Frontend):**
- Go to: https://vercel.com/dashboard
- Watch deployment logs
- Should complete in 1-3 minutes

## ✅ Post-Deployment Verification:

```bash
# 1. Test API health
curl https://your-api.onrender.com/api/health

# 2. Test teacher login (should work unchanged)
# Go to: https://your-app.vercel.app/login
# Click "គ្រូ" tab
# Use existing teacher credentials

# 3. Test admin statistics (requires admin account)
curl -X GET https://your-api.onrender.com/api/admin/accounts/statistics \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 4. Create student accounts (run locally)
cd api
npx ts-node scripts/create-student-accounts.ts

# 5. Test student login
# Go to: https://your-app.vercel.app/login
# Click "សិស្ស" tab
# Use student code (e.g., STU001)
# Password: Same as student code
```

## 📊 What's Deployed:

✅ Database: Migrated with new fields
✅ API: New endpoints ready
✅ Frontend: New login UI
✅ Admin: Account management system
✅ Docs: Complete guides

## 🆘 If Something Goes Wrong:

**Rollback Render:**
- Render Dashboard → Your Service → Manual Deploy → Select previous version

**Rollback Vercel:**
- Vercel Dashboard → Deployments → Previous deployment → Promote to Production

**Rollback Database:**
```bash
psql $DATABASE_URL < backup.sql
```

---

**Status:** ✅ Ready to push!
**Risk:** 🟢 LOW (tested migration, backward compatible)
**Time:** ~5-10 minutes total
