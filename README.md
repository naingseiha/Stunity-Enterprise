# 🎓 Stunity Enterprise - School Management + Social E-Learning Platform

**Version:** 23.1  
**Status:** Production Ready 🚀 | 98% Complete  
**Last Updated:** March 2, 2026

An enterprise-grade school management + social e-learning platform. Combines **school management** (grades, attendance, timetables, enrollment) with a **social learning feed** (posts, quizzes, clubs, real-time messaging) — designed for global multi-school deployment.

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)** | 🚀 **Production deployment instructions (Cloud Run, Vercel, App Store)** |
| **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** | What's done, what remains, service map |
| **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** | Architecture, patterns, deployment — read first |
| **[CURRENT_FEATURES.md](./CURRENT_FEATURES.md)** | Complete feature inventory |
| **[NEXT_IMPLEMENTATION.md](./NEXT_IMPLEMENTATION.md)** | Prioritized roadmap with code examples |
| **[docs/SUPER_ADMIN_AND_ENTERPRISE_FEATURES.md](./docs/SUPER_ADMIN_AND_ENTERPRISE_FEATURES.md)** | Super Admin area, platform management, enterprise features |
| **[docs/](./docs/README.md)** | Technical deep dives (feed, realtime, school integration) |
| **[docs/DATABASE_SAFETY.md](./docs/DATABASE_SAFETY.md)** | Database safety when using real Supabase for local dev |
| **[docs/LOCAL_DEVELOPMENT_AND_PRODUCTION.md](./docs/LOCAL_DEVELOPMENT_AND_PRODUCTION.md)** | Prisma parity, local vs production, recent fixes |

---

## ✅ v23.1 Highlights (March 2026)

- 🎮 **Live Quiz (Kahoot) Web** — Join, Lobby, Play, Leaderboard, Results; Host from quiz posts
- 🔍 **Enhanced Search** — Post type filter (Article, Quiz, Poll, etc.) wired to feed-service
- 👩‍🏫 **Teachers Page Fix** — Resolved @/types/models import; useTeachers cache key; data display for school admins
- 👑 **Super Admin** — Content moderation, Platform health, Social KPIs, Maintenance mode
- 🏘️ **Web Clubs & Messaging** — Full handlers, FEED_SERVICE_URL config, PostCard analytics

### Recent updates (March 2026)

- **Database safety** — Destructive commands (`db:push`, `db:migrate`, seed, reset) are blocked when `DATABASE_URL` points at Supabase, so you can safely use real data for local dev. See [docs/DATABASE_SAFETY.md](./docs/DATABASE_SAFETY.md).
- **Prisma** — Same schema and generated client locally and in production; run `npm run db:generate` from repo root after clone. See [docs/LOCAL_DEVELOPMENT_AND_PRODUCTION.md](./docs/LOCAL_DEVELOPMENT_AND_PRODUCTION.md).
- **Web UI** — Login page redesigned; dashboard and school management pages (students, classes, teachers) updated for consistent layout, breadcrumbs, and card styling.
- **Analytics service** — Auth middleware and `req.user` typing fixed; CORS and Express types corrected so the service builds and runs.
- **Next.js params** — Students (and other `[locale]` pages) use `params` as a Promise with `React.use()` for compatibility with current and future Next.js.

**Full Feature List:** [CURRENT_FEATURES.md](./CURRENT_FEATURES.md)  
**What's Next:** [NEXT_IMPLEMENTATION.md](./NEXT_IMPLEMENTATION.md)

---

## 🚀 Quick Start

```bash
# Start all services (15 microservices + web)
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

**Status:** 95% Complete ✅  
**Screens:** 55+ fully implemented  
**Features:** Feed, Quiz, Clubs, Assignments, Profile, Messaging, Analytics  
**Design:** Instagram-inspired with enterprise polish  
**Integration:** Full backend connectivity operational

---

## 📊 System Architecture

### Microservices (15 Services)
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
| 3010 | Feed | Social feed posts, likes, comments, search |
| 3011 | Messaging | Teacher-parent messaging |
| 3012 | Club | Clubs, events, discussions |
| 3013 | Notification | Push notification delivery |
| 3014 | Analytics | Live quizzes, XP, achievements |
| 3020 | AI | AI features (optional) |

### Mobile App
| Platform | Technology | Status | Integration |
|----------|------------|--------|-------------|
| iOS | React Native (Expo SDK 54) | ✅ Production Ready | ✅ Complete |
| Android | React Native (Expo SDK 54) | ✅ Production Ready | ✅ Complete |

**Screens:** 55+ (Feed, Quiz, Clubs, Assignments, Profile, Messaging, Analytics)  
**Components:** 100+ reusable components with smooth animations  
**State Management:** Zustand stores with persistent storage  
**Documentation:** See [CURRENT_FEATURES.md](./CURRENT_FEATURES.md) for full details

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

## ✅ Key Features Implemented (95% Complete)

### Mobile App (React Native + Expo)
- ✅ **55+ Screens** - Complete app navigation
- ✅ **Authentication** - Email/password, biometric, claim codes
- ✅ **Feed System** - 7 post types, infinite scroll, filters
- ✅ **Quiz System** - Create, take, grade quizzes + live quiz mode
- ✅ **Study Clubs** - Create, join, assignments, grading
- ✅ **Messaging** - Real-time direct messages
- ✅ **Profile & Stats** - Gamification, achievements, leaderboards
- ✅ **Analytics** - Comprehensive insights & tracking

### Backend Services (15 Microservices)
- ✅ **Auth Service** - JWT tokens, claim codes, SSO-ready
- ✅ **Feed Service** - Posts, comments, likes, analytics
- ✅ **Club Service** - Clubs, assignments, submissions
- ✅ **School Services** - Student, Teacher, Class, Grade, Attendance
- ✅ **Messaging Service** - Real-time messaging (SSE/WebSocket)
- ✅ **Analytics Service** - User activity, performance tracking

### School Management
- ✅ Multi-tenant school isolation
- ✅ Academic year management
- ✅ Student/Teacher ID generation (3 formats)
- ✅ Claim code system
- ✅ Grade entry & analytics
- ✅ Attendance tracking
- ✅ Timetable management
- ✅ Parent portal

### Social & Learning
- ✅ **7 Post Types** - Article, Quiz, Question, Poll, Course, Project, Announcement
- ✅ **Interactive Quizzes** - 4 question types, auto-grading, analytics
- ✅ **Live Quiz Mode** - Real-time multiplayer quizzes
- ✅ **Study Clubs** - Collaborative learning groups
- ✅ **Assignments** - Create, submit, grade, feedback
- ✅ **Gamification** - Points, badges, leaderboards
- ✅ **Real-time Messaging** - Direct messages with SSE
- ✅ **Cloud Storage** - R2 for media uploads

**See complete list:** [CURRENT_FEATURES.md](./CURRENT_FEATURES.md)

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
./quick-start.sh           # Start all 15 services + web
./stop-all-services.sh     # Stop all services
./restart-all-services.sh  # Restart all services
./check-services.sh        # Check status

# Database
npm run db:generate       # Generate Prisma client (run once after clone / before running services locally)
cd packages/database
npm run seed              # Seed test data (blocked when DATABASE_URL is Supabase — see docs/DATABASE_SAFETY.md)
npx prisma studio         # Open database GUI
npm run db:migrate        # Run migrations from repo root (blocks production URL unless ALLOW_PRODUCTION_DB=1)
npm run db:push           # Push schema (also protected by db-safety-check)
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

## 🚀 Next Implementation (Priority Roadmap)

### Priority 1 (Critical - 2-3 weeks)
- 🔔 **Push Notifications (Web)** - Web push (mobile has Expo Push)
- ⚡ **Performance Optimization** - Caching, lazy loading, bundle splitting

### Priority 2 (High Value - 1-2 weeks)
- 💾 **Offline Mode** - Local caching, sync
- ♿ **Accessibility** - Screen reader support, ARIA, focus management

### Priority 3 (New Features - 2-4 weeks)
- 📹 **Live Streaming Classes** - Video conferencing
- 🎮 **Enhanced Gamification** - More achievements
- 🌍 **Multi-Language** - Full i18n support
- 💻 **PWA** - Installable web app, service worker

> ✅ *Done:* Video upload & playback, Enhanced Search (post type filter), Dark Mode, Parent Portal App

**Full Roadmap:** [NEXT_IMPLEMENTATION.md](./NEXT_IMPLEMENTATION.md)

---

## 📚 Documentation

### Main Documentation
| Document | Description |
|----------|-------------|
| **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** | What's done, what remains, service map |
| **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** | Architecture, patterns, deployment |
| **[CURRENT_FEATURES.md](./CURRENT_FEATURES.md)** | Complete feature inventory |
| **[NEXT_IMPLEMENTATION.md](./NEXT_IMPLEMENTATION.md)** | Prioritized roadmap with code examples |
| **[docs/DATABASE_SAFETY.md](./docs/DATABASE_SAFETY.md)** | Database safety (blocked destructive commands when using Supabase) |
| **[docs/LOCAL_DEVELOPMENT_AND_PRODUCTION.md](./docs/LOCAL_DEVELOPMENT_AND_PRODUCTION.md)** | Prisma parity, local vs production, recent fixes |

### Technical Deep Dives
| Location | Description |
|----------|-------------|
| **[docs/](./docs/README.md)** | Feed system, realtime, school integration, deployment |
| `docs/admin-system/` | Role-based permission system |
| `docs/stunity-vision/` | Long-term product vision |
| `docs/future-implementation/` | Planned enterprise features |
| `docs/archive/` | Historical docs (completed phases, session logs) |

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

**System Status:** ✅ 95% Complete - Production Ready  
**Current Version:** 23.1  
**Mobile App:** 55+ screens, fully operational  
**Backend:** 15 services (Auth, School, Student, Teacher, Class, Subject, Grade, Attendance, Timetable, Feed, Messaging, Club, Notification, Analytics, AI)  
**Database:** 90+ models, optimized

---

## 👨‍💻 For Developers

**New to the project?**
1. Read [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Complete setup guide
2. Run `npm run db:generate` from repo root (once after clone) so Prisma client is available to all services
3. Review [CURRENT_FEATURES.md](./CURRENT_FEATURES.md) - Understand what exists
4. See [docs/LOCAL_DEVELOPMENT_AND_PRODUCTION.md](./docs/LOCAL_DEVELOPMENT_AND_PRODUCTION.md) - Prisma parity, database safety, local vs production
5. Check [NEXT_IMPLEMENTATION.md](./NEXT_IMPLEMENTATION.md) - See what's next
6. Follow quick start above to run the project

**Need API docs?** Check `docs/api/` or service endpoints:
- Auth: `http://localhost:3001/api-docs`
- Feed: `http://localhost:3010/api-docs`
- Club: `http://localhost:3012/api-docs`

---

*Last updated: March 2, 2026*
