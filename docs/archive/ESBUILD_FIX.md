# 🔧 ESBuild Architecture Fix & Service Management

**Issue:** esbuild installed for wrong architecture + services hard to manage

---

## 🚨 The Problem

Your Mac is Apple Silicon (ARM64) but esbuild was installed under Rosetta 2 (x86). This causes services to fail.

---

## ✅ Quick Solution (Use This!)

### Step 1: Run Quick Start Script

```bash
cd /Users/naingseiha/Documents/Stunity-Enterprise
./quick-start.sh
```

**What it does:**
- Stops all running services
- Starts services in correct order
- Waits for each to be ready
- Shows status

**Wait 20-30 seconds** for all services to start.

---

## 🧪 Test the System

1. **Open browser:** http://localhost:3000
2. **Login with:**
   - Email: `john.doe@testhighschool.edu`
   - Password: `SecurePass123!`
3. **Check pages:**
   - Students (should see 12)
   - Teachers (should see 4)
   - Classes (should see 3)
4. **Academic Year:** Should show "2025-2026"

---

## 📊 Check Service Status

```bash
# Quick status check
for port in 3001 3002 3003 3004 3005 3000; do
  lsof -ti:$port > /dev/null 2>&1 && echo "✅ $port" || echo "❌ $port"
done
```

**Expected:**
```
✅ 3001 (Auth)
✅ 3002 (School)
✅ 3003 (Student)
✅ 3004 (Teacher)
✅ 3005 (Class)
✅ 3000 (Web)
```

---

## 📝 View Service Logs

```bash
# Auth service
tail -f /tmp/auth.log

# School service
tail -f /tmp/school.log

# Student service
tail -f /tmp/student.log

# All services at once
tail -f /tmp/*.log
```

---

## 🛑 Stop All Services

```bash
cd /Users/naingseiha/Documents/Stunity-Enterprise
./stop-all-services.sh
```

---

## 🐛 If Services Don't Start

### 1. Check Logs for Errors

```bash
grep -i error /tmp/auth.log
grep -i error /tmp/school.log
grep -i error /tmp/student.log
```

### 2. Verify Database Seed

```bash
cd /Users/naingseiha/Documents/Stunity-Enterprise/packages/database
npm run seed
```

Should show:
- ✅ 2 schools created
- ✅ 2 academic years (2025-2026)
- ✅ 3 classes
- ✅ 12 students
- ✅ 4 teachers

### 3. Manual Service Start (for debugging)

Start each service individually to see errors:

```bash
# Auth
cd services/auth-service
npm start

# In new terminal - School
cd services/school-service  
npm start

# Continue for each service...
```

---

## 🔧 Permanent Fix (If Needed)

Only do this if quick-start.sh doesn't work:

```bash
# Navigate to project
cd /Users/naingseiha/Documents/Stunity-Enterprise

# Remove all node_modules
rm -rf node_modules package-lock.json
rm -rf apps/*/node_modules
rm -rf services/*/node_modules
rm -rf packages/*/node_modules

# Reinstall everything (takes 5-10 minutes)
npm install

# Start services
./quick-start.sh
```

---

## 📋 Service Ports

| Service | Port | Logs |
|---------|------|------|
| Web | 3000 | /tmp/web.log |
| Auth | 3001 | /tmp/auth.log |
| School | 3002 | /tmp/school.log |
| Student | 3003 | /tmp/student.log |
| Teacher | 3004 | /tmp/teacher.log |
| Class | 3005 | /tmp/class.log |

---

## 🎯 Quick Commands

```bash
# Start all services
./quick-start.sh

# Stop all services
./stop-all-services.sh

# Check status
./check-services.sh

# Re-seed database
cd packages/database && npm run seed

# Open web app
open http://localhost:3000
```

---

## ✅ Test Data

**School:** Test High School  
**Academic Year:** 2025-2026 (Nov 2025 - Sep 2026)  
**Students:** 12  
**Teachers:** 4  
**Classes:** 3 (Grade 10A, 11B, 12A)

**Login:**
- john.doe@testhighschool.edu
- SecurePass123!

---

## 🎊 Success Checklist

- [ ] Ran `./quick-start.sh`
- [ ] All 6 services showing ✅
- [ ] Opened http://localhost:3000
- [ ] Logged in successfully
- [ ] Year selector shows "2025-2026"
- [ ] Students page shows 12 students
- [ ] Teachers page shows 4 teachers
- [ ] Classes page shows 3 classes

---

**Just use `./quick-start.sh` and everything should work!** 🚀
