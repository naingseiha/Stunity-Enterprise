# 🎓 Stunity Enterprise - School Management System

**Version:** 2.0  
**Status:** Phase 2 Complete ✅  
**Last Updated:** January 31, 2026

A comprehensive, multi-tenant school management SaaS platform with full academic year support and historical data tracking.

---

## 🚀 Quick Start

```bash
# Start all services
./quick-start.sh

# Open browser
open http://localhost:3000

# Login
Email: john.doe@testhighschool.edu
Password: SecurePass123!
```

---

## 📊 System Architecture

### Microservices (Ports)
- **Web** (3000) - Next.js frontend
- **Auth** (3001) - Authentication
- **School** (3002) - School & Academic Years
- **Student** (3003) - Student management
- **Teacher** (3004) - Teacher management
- **Class** (3005) - Class management

### Tech Stack
- **Frontend:** Next.js 14, React, TypeScript, TailwindCSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL, Prisma ORM
- **Auth:** JWT tokens

---

## ✅ Features Implemented

### Phase 1: Academic Year Management
- ✅ Create, edit, delete academic years
- ✅ Set current year
- ✅ Archive old years
- ✅ Status management (PLANNING → ACTIVE → ENDED → ARCHIVED)

### Phase 2: Year-Based Data Scoping
- ✅ Global year context
- ✅ Year selector in navigation
- ✅ All data filtered by selected year
- ✅ Students, Teachers, Classes pages year-aware
- ✅ Historical data preservation

---

## 📁 Project Structure

```
Stunity-Enterprise/
├── apps/web/              # Frontend
├── services/              # Backend microservices
│   ├── auth-service/
│   ├── school-service/
│   ├── student-service/
│   ├── teacher-service/
│   └── class-service/
├── packages/database/     # Prisma schema
├── docs/                  # Documentation
├── quick-start.sh         # Start services
└── stop-all-services.sh   # Stop services
```

---

## 🛠️ Commands

```bash
# Service Management
./quick-start.sh           # Start all
./stop-all-services.sh     # Stop all
./restart-all-services.sh  # Restart all
./check-services.sh        # Check status

# Database
cd packages/database
npm run seed              # Seed test data
npx prisma studio         # Open database GUI
npx prisma migrate dev    # Run migrations
```

---

## 🧪 Test Data

**School:** Test High School  
**Academic Year:** 2025-2026 (Nov 2025 - Sep 2026)  
**Students:** 12  
**Teachers:** 4  
**Classes:** 3  

**Admin Login:**
```
Email: john.doe@testhighschool.edu
Password: SecurePass123!
```

---

## 🎯 Next: Phase 3

**Student Promotion System**
- Promotion wizard
- Bulk student transitions
- Year-to-year tracking
- Failed student management

---

## 📚 Documentation

- **QUICK_START.md** - Quick reference
- **docs/ACADEMIC_YEAR_ARCHITECTURE.md** - System design
- **docs/PHASE2_COMPLETE.md** - Implementation details
- **docs/archive/** - Historical docs

---

## 🔧 Troubleshooting

**Services won't start?**
```bash
./stop-all-services.sh
./quick-start.sh
```

**Login fails?**
```bash
cd packages/database
npm run seed
```

**Data not showing?**
- Check year selector (should show 2025-2026)
- Hard reload browser (Cmd+Shift+R)

---

**System Status:** ✅ Production Ready  
**Current Phase:** Phase 2 Complete  
**Next Phase:** Student Promotion
