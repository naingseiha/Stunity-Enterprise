# 🎓 Stunity Enterprise - School Management + Social E-Learning Platform

**Version:** 5.2  
**Status:** Phase 29 - Mobile App Working ✅  
**Last Updated:** February 7, 2026

A comprehensive, multi-tenant school management SaaS platform with social feed features, parent portal, teacher-parent messaging, full academic year support, student progression tracking, and historical data management.

---

## 🚀 Quick Start

```bash
# Start all 12 services
./quick-start.sh

# Open browser
open http://localhost:3000

# Admin Login
Email: john.doe@testhighschool.edu
Password: SecurePass123!

# Parent Login
Phone: 012345678
Password: TestParent123!
```

### 📱 Mobile App (Expo Go)
```bash
cd apps/mobile
npx expo start --tunnel

# Scan QR code with Expo Go app
# Same login credentials as web
```

---

## 📊 System Architecture

### Microservices (12 Services)
| Port | Service | Description |
|------|---------|-------------|
| 3000 | Web | Next.js frontend application |
| 3001 | Auth | Authentication, authorization & notifications |
| 3002 | School | School & Academic Year management |
| 3003 | Student | Student management & transcripts |
| 3004 | Teacher | Teacher management & subject assignments |
| 3005 | Class | Class management & student enrollment |
| 3006 | Subject | Subject/curriculum management |
| 3007 | Grade | Grade entry & calculations |
| 3008 | Attendance | Attendance tracking |
| 3009 | Timetable | Schedule management |
| 3010 | Feed | Social feed posts, likes, comments |
| 3011 | Messaging | Teacher-parent messaging 🆕 |

### Mobile App
| Platform | Technology | Status |
|----------|------------|--------|
| iOS | React Native (Expo) | 🟢 Working |
| Android | React Native (Expo) | 🟢 Working |

### Tech Stack
- **Frontend:** Next.js 14, React, TypeScript, TailwindCSS
- **Mobile:** React Native, Expo SDK 54, Zustand
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL (Neon), Prisma ORM
- **Auth:** JWT tokens
- **Charts:** Recharts
- **PDF:** jsPDF
- **Architecture:** Microservices with multi-tenant design

---

## ✅ Features Implemented

### Core Platform (Phases 1-4)
- ✅ Multi-tenant school isolation
- ✅ JWT-based authentication
- ✅ Academic year management with status transitions
- ✅ Student promotion system with bulk operations
- ✅ Performance optimization (caching, connection pooling)

### School Management (Phases 5-9)
- ✅ Class management with drag-drop enrollment
- ✅ Teacher subject assignments
- ✅ Grade entry and analytics (charts, rankings)
- ✅ Attendance tracking with calendar view
- ✅ Timetable management with auto-scheduling
- ✅ PDF report card generation

### Attendance & Analytics (Phases 10-11)
- ✅ Monthly attendance reports with grids
- ✅ Grade analytics dashboard with charts
- ✅ Subject performance visualization
- ✅ Top performers table

### Parent & Social Features (Phases 12-14)
- ✅ **Parent Portal** - View children's grades, attendance, report cards
- ✅ **Parent Notifications** - Auto-notify on new grades/absences
- ✅ **Unified Login** - Single login page for all user types
- ✅ **Social Feed** - Posts, likes, comments (Facebook-style)

### Communication Features (Phase 15) 🆕
- ✅ **Teacher-Parent Messaging** - Direct messaging between teachers and parents
- ✅ **Conversation Management** - View, archive, search conversations
- ✅ **Real-time Updates** - Polling for new messages
- ✅ **Unread Count** - Badge indicators for unread messages

---

## 📁 Project Structure

```
Stunity-Enterprise/
├── apps/web/                  # Frontend (Next.js)
│   └── src/app/[locale]/
│       ├── dashboard/         # Admin dashboard
│       ├── feed/              # Social feed
│       ├── parent/            # Parent portal
│       ├── student/           # Student portal
│       └── auth/              # Login pages
├── services/
│   ├── auth-service/          # Port 3001 (+ notifications)
│   ├── school-service/        # Port 3002
│   ├── student-service/       # Port 3003
│   ├── teacher-service/       # Port 3004
│   ├── class-service/         # Port 3005
│   ├── subject-service/       # Port 3006
│   ├── grade-service/         # Port 3007
│   ├── attendance-service/    # Port 3008
│   ├── timetable-service/     # Port 3009
│   ├── feed-service/          # Port 3010
│   └── messaging-service/     # Port 3011 🆕
├── packages/database/         # Prisma schema
├── docs/                      # Documentation
├── quick-start.sh             # Start all services
└── PROJECT_STATUS.md          # Detailed status
```

---

## 🛠️ Commands

```bash
# Service Management
./quick-start.sh           # Start all 11 services
./stop-all-services.sh     # Stop all services
./restart-all-services.sh  # Restart all services
./check-services.sh        # Check status

# Database
cd packages/database
npm run seed              # Seed test data
npx prisma studio         # Open database GUI
npx prisma migrate dev    # Run migrations
```

---

## 🧪 Test Data

| Entity | Count |
|--------|-------|
| School | 1 (Test High School) |
| Academic Years | 3 (2024-2027) |
| Students | 105 |
| Teachers | 4 |
| Classes | 5 per year |
| Subjects | 30 (Cambodian curriculum) |

### Test Accounts

**Admin/Teacher Login:**
```
URL: http://localhost:3000/en/auth/login
Email: john.doe@testhighschool.edu
Password: SecurePass123!
```

**Parent Login:**
```
URL: http://localhost:3000/en/auth/login (use Phone tab)
Phone: 012345678
Password: TestParent123!
Child: Chanthy Kong (S9A-025)
```

---

## 🔮 Next Implementation (Phases 16+)

| Phase | Feature | Priority |
|-------|---------|----------|
| 16 | Media Attachments (images in posts) | Medium |
| 17 | Student Login & Portal | Medium |
| 18 | Real-time Features (WebSocket) | Medium |
| 19 | Mobile Optimization (PWA) | Low |
| 20 | Advanced Analytics Dashboard | Low |

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| `README.md` | Project overview (this file) |
| `PROJECT_STATUS.md` | Detailed feature status |
| `docs/ACADEMIC_YEAR_ARCHITECTURE.md` | Year system design |
| `docs/TIMETABLE_SYSTEM.md` | Timetable documentation |
| `docs/archive/` | Historical docs (55+ files) |

---

## 🔧 Troubleshooting

**Services won't start?**
```bash
./stop-all-services.sh
sleep 3
./quick-start.sh
```

**Login fails?**
```bash
cd packages/database && npm run seed
```

**Data not showing?**
- Check year selector in navigation
- Hard reload browser (Cmd+Shift+R)

**Feed not loading?**
- Check if feed-service is running: `curl http://localhost:3010/health`
- Restart: `cd services/feed-service && npm run dev`

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Web App                      │
│        Dashboard │ Feed │ Parent │ Student Portal       │
└───────────────────────────┬─────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  Auth (3001)  │  │  Feed (3010)  │  │ School (3002) │
└───────────────┘  └───────────────┘  └───────────────┘
        │
        ├── Student (3003)   ├── Grade (3007)
        ├── Teacher (3004)   ├── Attendance (3008)
        ├── Class (3005)     └── Timetable (3009)
        └── Subject (3006)
                            │
                            ▼
              ┌──────────────────────────┐
              │   PostgreSQL (Neon DB)   │
              └──────────────────────────┘
```

---

**System Status:** ✅ Production Ready  
**Current Version:** 5.0  
**Phases Complete:** 1-14
