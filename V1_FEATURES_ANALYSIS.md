# V1 Features Analysis & V2 Migration Plan

**Date:** January 29, 2026  
**Source:** `/Users/naingseiha/Downloads/SchoolApp/SchoolManagementApp`  
**Target:** `/Users/naingseiha/Documents/Stunity-Enterprise`

---

## 📊 V1 Application Overview

### Architecture
- **Frontend:** Next.js 14 (Pages + App Router hybrid)
- **Backend:** Express.js API (Single monolithic service)
- **Database:** PostgreSQL (Neon) with Prisma 5.22.0
- **Authentication:** JWT-based
- **Features:** 30+ modules with comprehensive school management

---

## 🎯 Core Features in V1

### 1. **Authentication & Authorization** ✅ (Partially in V2)
**Status in V2:** Basic auth done, need RBAC expansion

**V1 Features:**
- `/api/src/controllers/auth.controller.ts`
- `/api/src/routes/auth.routes.ts`
- JWT-based authentication
- Role-based access control (Admin, Teacher, Student, Parent)
- Session management
- Password expiration policies

**V2 Status:**
- ✅ JWT authentication (auth-service)
- ✅ Login endpoint
- ✅ Token verification
- ⏳ RBAC implementation
- ⏳ Multi-role support
- ⏳ Password policies

---

### 2. **Student Management** ⏳ (Not in V2)
**Priority:** HIGH

**V1 Features:**
- `/src/app/students/page.tsx`
- `/src/app/admin/students/page.tsx`
- `/api/src/controllers/student.controller.ts`
- `/api/src/routes/student.routes.ts`

**Capabilities:**
- Create/Read/Update/Delete students
- Student profiles with photos
- Bulk import from Excel
- Student ID generation
- Search and filtering
- Assign to classes
- Academic year tracking
- Parent linking

**Components to migrate:**
- `/src/components/students/StudentForm.tsx`
- `/src/components/students/StudentList.tsx`
- `/src/components/students/StudentCard.tsx`

---

### 3. **Teacher Management** ⏳ (Not in V2)
**Priority:** HIGH

**V1 Features:**
- `/src/app/teachers/page.tsx`
- `/src/app/admin/teachers/page.tsx`
- `/api/src/controllers/teacher.controller.ts`
- `/api/src/routes/teacher.routes.ts`

**Capabilities:**
- Teacher profiles
- Subject assignments
- Class assignments
- Homeroom teacher designation
- Salary tracking
- Mobile/desktop views

**Components to migrate:**
- `/src/components/teachers/TeacherForm.tsx`
- `/src/components/teachers/TeacherList.tsx`
- `/src/components/teachers/TeacherCard.tsx`

---

### 4. **Class Management** ⏳ (Not in V2)
**Priority:** HIGH

**V1 Features:**
- `/src/app/classes/page.tsx`
- `/api/src/controllers/class.controller.ts`
- `/api/src/routes/class.routes.ts`

**Capabilities:**
- Create classes per academic year
- Track support (Science, Social, etc.)
- Grade levels (1-12)
- Student capacity
- Homeroom teacher assignment
- Class rosters

---

### 5. **Subject Management** ⏳ (Not in V2)
**Priority:** HIGH

**V1 Features:**
- `/src/app/subjects/page.tsx`
- `/api/src/controllers/subject.controller.ts`
- `/api/src/routes/subject.routes.ts`

**Capabilities:**
- Subject CRUD operations
- Coefficient (មេគុណ) settings
- Max score configuration
- Grade-level filtering
- Track-based subjects
- Core vs elective subjects

---

### 6. **Grade Entry & Management** ⏳ (Not in V2)
**Priority:** HIGH

**V1 Features:**
- `/src/app/grade-entry/page.tsx`
- `/api/src/controllers/grade.controller.ts`
- `/api/src/routes/grade.routes.ts`

**Capabilities:**
- Excel-like grid editor
- Real-time validation
- Auto-save functionality
- Bulk import from Excel
- Monthly grade tracking
- Subject-wise entry
- Automatic calculations (averages, ranks)
- Grade levels (A-F)

**Components to migrate:**
- `/src/components/grades/GradeGridEditor.tsx`
- `/src/components/grades/GradeCell.tsx`
- `/src/components/grades/FloatingSavePanel.tsx`
- `/src/components/grades/useAutoSave.ts`
- `/src/components/grades/useGradeSorting.ts`

---

### 7. **Attendance Management** ⏳ (Not in V2)
**Priority:** MEDIUM

**V1 Features:**
- `/src/app/attendance/page.tsx`
- `/api/src/controllers/attendance.controller.ts`
- `/api/src/routes/attendance.routes.ts`

**Capabilities:**
- Daily attendance tracking
- Grid-based entry
- Absence with/without permission
- Monthly summaries
- Class-wise tracking
- Export to reports

**Components to migrate:**
- `/src/components/attendance/AttendanceGridEditor.tsx`
- `/src/components/attendance/FloatingSavePanel.tsx`
- `/src/components/attendance/AttendanceReportPDF.tsx`

---

### 8. **Reporting System** ⏳ (Not in V2)
**Priority:** HIGH

**V1 Features:**
- `/src/app/reports/` (multiple pages)
- `/api/src/controllers/report.controller.ts`
- `/api/src/routes/report.routes.ts`

**Report Types:**

#### a. Monthly Reports (`/reports/monthly/`)
- Class performance summaries
- Student rankings
- Subject-wise analysis
- Print-ready format

#### b. Tracking Book (`/reports/tracking-book/`) ⭐
- Individual student progress
- Multi-month aggregation
- Subject grade levels
- Attendance integration
- A4 Landscape format
- Single/All student modes

#### c. Statistics (`/reports/statistics/`)
- Gender-based analysis
- Pass/fail rates
- Grade distribution (A-F)
- Subject performance
- Mobile-optimized views

#### d. Award Reports (`/reports/award/`)
- Top performers
- Achievement recognition
- Print certificates

**Components to migrate:**
- `/src/components/reports/StudentTranscript.tsx`
- `/src/components/reports/MonthlyReportTable.tsx`
- `/src/components/reports/StatisticsView.tsx`
- `/src/components/reports/PrintLayout.tsx`

---

### 9. **Social Feed System** ⏳ (Not in V2)
**Priority:** MEDIUM

**V1 Features:**
- `/src/app/feed/page.tsx`
- `/api/src/controllers/feed.controller.ts`
- `/api/src/routes/feed.routes.ts`

**Capabilities:**
- Create posts (text, images, polls)
- Comment system with threading
- Rich text editor
- Mentions (@username)
- Reactions/voting
- Real-time updates (Socket.io)
- Poll creation and voting
- Image uploads
- Edit/delete posts

**Components to migrate:**
- `/src/components/feed/PostCard.tsx`
- `/src/components/feed/PostForm.tsx`
- `/src/components/comments/CommentThread.tsx`
- `/src/components/comments/RichText.tsx`
- `/src/components/comments/MentionInput.tsx`

---

### 10. **Notification System** ⏳ (Not in V2)
**Priority:** MEDIUM

**V1 Features:**
- `/api/src/controllers/notification.controller.ts`
- `/api/src/routes/notification.routes.ts`
- `/src/components/notifications/NotificationBell.tsx`

**Capabilities:**
- Real-time notifications
- In-app notifications
- Notification preferences
- Mark as read/unread
- Delete notifications
- Socket.io integration

---

### 11. **Profile Management** ⏳ (Not in V2)
**Priority:** MEDIUM

**V1 Features:**
- `/src/app/profile/[userId]/page.tsx`
- `/src/app/profile/edit/page.tsx`
- `/api/src/controllers/profile.controller.ts`
- `/api/src/routes/profile.routes.ts`

**Capabilities:**
- View user profiles
- Edit profile information
- Upload profile photos
- Skills and achievements
- Projects and experiences
- Recommendations

**Components to migrate:**
- `/src/components/profile/ProfileCard.tsx`
- `/src/components/profile/ProfileEdit.tsx`

---

### 12. **Dashboard & Analytics** ⏳ (Not in V2)
**Priority:** HIGH

**V1 Features:**
- `/src/app/dashboard/page.tsx`
- `/src/app/dashboard/score-progress/page.tsx`
- `/api/src/controllers/dashboard.controller.ts`

**Capabilities:**
- Overview statistics
- Student performance charts
- Teacher activity
- Class summaries
- Recent activities
- Quick actions
- Score progress tracking

**Components to migrate:**
- `/src/components/dashboard/StatsCard.tsx`
- `/src/components/dashboard/RecentActivity.tsx`
- `/src/components/charts/BarChart.tsx`
- `/src/components/charts/LineChart.tsx`

---

### 13. **Schedule Management** ⏳ (Not in V2)
**Priority:** MEDIUM

**V1 Features:**
- `/src/app/schedule/page.tsx`
- `/src/app/schedule/master/page.tsx`
- `/src/app/schedule/teacher/page.tsx`

**Capabilities:**
- Master schedule creation
- Teacher schedules
- Class schedules
- Time slot management
- Room assignments

---

### 14. **Portal Systems** ⏳ (Not in V2)
**Priority:** MEDIUM

#### a. Student Portal (`/student-portal/`)
- Course viewing
- Grade checking
- Assignments
- Progress tracking

#### b. Teacher Portal (`/teacher-portal/`)
- Class management
- Grade entry
- Attendance marking
- Student lists

#### c. Parent Portal (`/parent-portal/`)
- Child progress viewing
- Grade monitoring
- Attendance tracking
- Communication

---

### 15. **Admin Management** ⏳ (Not in V2)
**Priority:** HIGH

**V1 Features:**
- `/src/app/admin/admins/page.tsx`
- `/src/app/admin/accounts/page.tsx`
- `/src/app/admin/security/page.tsx`
- `/api/src/controllers/admin.controller.ts`

**Capabilities:**
- Admin user management
- Account settings
- Security settings
- Password policies
- System configuration
- User activity logs

---

### 16. **Results & Statistics** ⏳ (Not in V2)
**Priority:** HIGH

**V1 Features:**
- `/src/app/results/page.tsx`
- `/src/app/statistics/page.tsx`

**Capabilities:**
- Exam results viewing
- Grade distributions
- Class comparisons
- Performance trends
- Mobile-optimized views

---

### 17. **Settings & Configuration** ⏳ (Not in V2)
**Priority:** LOW

**V1 Features:**
- `/src/app/settings/page.tsx`

**Capabilities:**
- User preferences
- Application settings
- Theme customization
- Notification settings

---

## 🏗️ V2 Architecture Differences

### What's Different in V2

1. **Microservices Architecture**
   - V1: Monolithic Express API
   - V2: Separate microservices (auth, school, student, grade, etc.)

2. **Multi-Tenancy**
   - V1: Single school instance
   - V2: Multi-tenant SaaS with School model

3. **Subscription Management**
   - V1: No subscription system
   - V2: 6 subscription tiers, trial periods, usage limits

4. **Internationalization**
   - V1: Mixed English/Khmer in code
   - V2: Proper i18n with next-intl

5. **Monorepo Structure**
   - V1: Single repository
   - V2: Turborepo with apps/, services/, packages/

---

## 📋 Migration Checklist

### Phase 1: Foundation (Complete ✅)
- ✅ Monorepo setup
- ✅ Database schema (multi-tenant)
- ✅ Auth service
- ✅ School registration service
- ✅ Web app foundation
- ⏳ Web app UI implementation

### Phase 2: Core Features (Next 2-3 weeks)

#### Week 1: User & Class Management
- [ ] Student service
  - [ ] CRUD operations
  - [ ] Bulk import
  - [ ] Search & filtering
  - [ ] Photo uploads
- [ ] Teacher service
  - [ ] CRUD operations
  - [ ] Subject assignments
  - [ ] Class assignments
- [ ] Class service
  - [ ] CRUD operations
  - [ ] Student enrollment
  - [ ] Teacher assignments

#### Week 2: Academic Management
- [ ] Subject service
  - [ ] CRUD operations
  - [ ] Coefficient management
  - [ ] Track filtering
- [ ] Grade service
  - [ ] Grade entry API
  - [ ] Calculations (average, rank)
  - [ ] Monthly tracking
  - [ ] Bulk import
- [ ] Attendance service
  - [ ] Daily tracking
  - [ ] Monthly summaries
  - [ ] Reports

#### Week 3: Reporting & Analytics
- [ ] Report service
  - [ ] Monthly reports
  - [ ] Tracking book
  - [ ] Statistics
  - [ ] Export functionality
- [ ] Dashboard service
  - [ ] Overview stats
  - [ ] Charts data
  - [ ] Recent activities

### Phase 3: Social Features (Week 4-5)
- [ ] Feed service
  - [ ] Posts CRUD
  - [ ] Comments
  - [ ] Reactions
  - [ ] Polls
- [ ] Notification service
  - [ ] Real-time notifications
  - [ ] WebSocket integration
  - [ ] Preferences

### Phase 4: Portal & Advanced Features (Week 6-7)
- [ ] Student portal
- [ ] Teacher portal
- [ ] Parent portal
- [ ] Schedule management
- [ ] Profile management

### Phase 5: Admin & Configuration (Week 8)
- [ ] Admin management
- [ ] Security settings
- [ ] System configuration
- [ ] Settings management

---

## 🎯 Immediate Next Steps

### 1. Complete Web App UI (Today - 2-3 hours)
Follow `WEB_APP_IMPLEMENTATION_GUIDE.md`:
- [ ] i18n setup
- [ ] Layout components
- [ ] Landing page
- [ ] Login page
- [ ] Dashboard

### 2. Student Service (Tomorrow - 4-6 hours)
- [ ] Create `services/student-service/`
- [ ] Student CRUD endpoints
- [ ] Integrate with web app
- [ ] Copy components from v1

### 3. Teacher & Class Services (Day 3 - 4-6 hours)
- [ ] Create `services/teacher-service/`
- [ ] Create `services/class-service/`
- [ ] Copy and adapt v1 logic

---

## 📦 Components to Copy from V1

### High Priority (Copy First)
1. **Layout Components**
   - `/src/components/layout/Sidebar.tsx`
   - `/src/components/layout/Navbar.tsx`
   - `/src/components/layout/MobileNav.tsx`

2. **UI Components**
   - `/src/components/ui/Button.tsx`
   - `/src/components/ui/Input.tsx`
   - `/src/components/ui/Select.tsx`
   - `/src/components/ui/Modal.tsx`
   - `/src/components/ui/Toast.tsx`

3. **Student Components**
   - `/src/components/students/` (entire directory)

4. **Grade Components**
   - `/src/components/grades/` (entire directory)

5. **Report Components**
   - `/src/components/reports/` (entire directory)

### Medium Priority
- Dashboard components
- Teacher components
- Class components
- Attendance components

### Low Priority
- Feed components
- Profile components
- Settings components

---

## 🔄 Adaptation Strategy

### For Each Feature:

1. **Service Layer**
   - Create microservice in `services/`
   - Add schoolId to all queries (multi-tenancy)
   - Implement usage limits checks
   - Add subscription validation

2. **API Layer**
   - RESTful endpoints
   - Input validation
   - Error handling
   - Rate limiting

3. **Frontend Layer**
   - Copy component from v1
   - Update API calls to new services
   - Add i18n support
   - Update styling to match v2 theme
   - Add school context

4. **Testing**
   - Test with multiple schools
   - Verify multi-tenancy
   - Check usage limits
   - Test subscription tiers

---

## 🎨 UI/UX Considerations

### Keep from V1:
- Excel-like grade entry grid
- Print-ready report layouts
- Mobile-responsive designs
- Khmer language support
- Icons and visual hierarchy

### Improve in V2:
- Modern Tailwind design system
- Consistent color scheme (Stunity brand)
- Better loading states
- Improved mobile navigation
- Cleaner typography

---

## 📈 Success Metrics

### Technical Goals:
- [ ] All v1 features migrated
- [ ] Multi-tenant architecture working
- [ ] Sub-300ms API response times
- [ ] Mobile-responsive (100% features)
- [ ] 100% test coverage for core features

### Business Goals:
- [ ] Support 100+ schools
- [ ] 10,000+ students tracked
- [ ] 1,000+ concurrent users
- [ ] 99.9% uptime
- [ ] Sub-2s page load times

---

## 🚨 Critical Considerations

1. **Data Migration**
   - V1 school data must be migrated carefully
   - Test with 2-3 new schools first
   - Backup before migration

2. **Backward Compatibility**
   - V1 continues running during v2 development
   - No breaking changes to v1
   - Parallel deployment strategy

3. **Performance**
   - Multi-tenant queries must be optimized
   - Add database indexes
   - Implement caching strategy

4. **Security**
   - Row-level security (schoolId filtering)
   - RBAC enforcement
   - Data isolation between schools

---

**Next Action:** Complete web app UI implementation, then start building Student service with components copied from v1.
