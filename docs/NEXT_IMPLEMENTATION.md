# Next Implementation Roadmap

**Last Updated:** February 6, 2026  
**Status:** Ready for Next Phase

This document outlines the planned next steps for Stunity Enterprise development.

---

## ✅ Recently Completed (February 6, 2026)

### Phase 20.5: UI Redesign & Learn Hub ✅ NEW
- [x] Clubs & Events pages redesigned with clean 3-column layout
- [x] Profile page updated with "Open to Learn" terminology
- [x] Lighter color scheme (amber-100/orange-100 gradients)
- [x] **Learn Hub** - Comprehensive learning platform with 4 modes:
  - Explore Courses (Udemy/Coursera style)
  - My Courses (progress tracking)
  - Learning Paths (curated journeys)
  - My Curriculum (school subjects - students only)
- [x] Course cards, Learning Path cards, Subject cards
- [x] Weekly goals, achievements, study streak widgets
- [x] Grade service health endpoint fix

### Phase 20: Study Clubs Full Features ✅
- [x] Club list and detail page redesign
- [x] Event pages with FeedZoomLoader
- [x] Feed sidebar widgets with real API data
- [x] Fixed slideInUp animation issue

### Phase 19.6: Achievement Badges ✅
- [x] Verified badges, level badges
- [x] Achievement icons on profile and feed

See `PROJECT_STATUS.md` for complete feature history.

---

## 🎯 Priority 1: High Priority Features

### 1.1 Course Service (Backend for Learn Hub) ⭐ RECOMMENDED NEXT
**Status:** Ready to implement  
**Estimated Effort:** 1-2 sessions

The Learn Hub UI is complete with sample data. Next step is building the backend.

**New Database Models Needed:**
```prisma
model Course {
  id            String   @id @default(cuid())
  title         String
  description   String
  thumbnail     String?
  category      String
  level         CourseLevel
  duration      Int      // hours
  price         Float    @default(0)
  isFree        Boolean  @default(true)
  isFeatured    Boolean  @default(false)
  isPublished   Boolean  @default(false)
  instructorId  String
  instructor    User     @relation(fields: [instructorId], references: [id])
  lessons       Lesson[]
  enrollments   Enrollment[]
  reviews       CourseReview[]
  tags          String[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Lesson {
  id          String   @id @default(cuid())
  courseId    String
  course      Course   @relation(fields: [courseId], references: [id])
  title       String
  description String?
  content     String?  // Rich text or markdown
  videoUrl    String?
  duration    Int      // minutes
  order       Int
  isFree      Boolean  @default(false)  // Preview lesson
  progress    LessonProgress[]
  createdAt   DateTime @default(now())
}

model Enrollment {
  id           String   @id @default(cuid())
  userId       String
  courseId     String
  course       Course   @relation(fields: [courseId], references: [id])
  progress     Float    @default(0)
  completedAt  DateTime?
  enrolledAt   DateTime @default(now())
  
  @@unique([userId, courseId])
}

model LessonProgress {
  id          String   @id @default(cuid())
  userId      String
  lessonId    String
  lesson      Lesson   @relation(fields: [lessonId], references: [id])
  completed   Boolean  @default(false)
  watchTime   Int      @default(0)  // seconds
  completedAt DateTime?
  
  @@unique([userId, lessonId])
}

model LearningPath {
  id            String   @id @default(cuid())
  title         String
  description   String
  thumbnail     String?
  level         String
  isFeatured    Boolean  @default(false)
  courses       LearningPathCourse[]
  enrollments   PathEnrollment[]
  createdAt     DateTime @default(now())
}
```

**New API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/courses` | List courses (with filters) |
| GET | `/courses/:id` | Course details with lessons |
| POST | `/courses` | Create course (instructors) |
| PUT | `/courses/:id` | Update course |
| POST | `/courses/:id/enroll` | Enroll in course |
| GET | `/courses/:id/lessons` | Get course lessons |
| POST | `/lessons/:id/progress` | Update lesson progress |
| GET | `/my-courses` | User's enrolled courses |
| GET | `/learning-paths` | List learning paths |
| POST | `/learning-paths/:id/enroll` | Enroll in path |

### 1.2 Stories/Status Updates
**Status:** Planning  
**Estimated Effort:** 2 sessions

24-hour ephemeral content like Instagram/WhatsApp stories.

Features:
- [ ] Story model (mediaUrl, text, backgroundColor, expiresAt)
- [ ] StoryView model for tracking
- [ ] Create/view stories
- [ ] Story circles at top of feed
- [ ] Auto-delete after 24 hours

### 1.3 Advanced Notifications
**Status:** Planning  
**Estimated Effort:** 2 sessions

Features:
- [ ] New follower notifications
- [ ] Event reminders
- [ ] Course updates
- [ ] Mention in post/comment
- [ ] Notification preferences page

---

## 🔧 Priority 2: System Improvements

### 2.1 PDF Export Enhancements
- [ ] Attendance report PDF export
- [ ] Analytics charts PDF export
- [ ] Bulk PDF generation (all students)
- [ ] Custom report templates

### 2.2 Data Import/Export
- [ ] Excel import for student data
- [ ] Excel import for grades
- [ ] CSV export for all data types
- [ ] Backup/restore functionality

### 2.3 Mobile Responsiveness
- [ ] Optimize charts for mobile
- [ ] Touch-friendly attendance marking
- [ ] Mobile-optimized navigation

---

## 📊 Priority 3: Advanced Features

### 3.1 Timetable Enhancements
- [ ] Drag-and-drop schedule editing
- [ ] Conflict detection and resolution
- [ ] Substitute teacher assignment
- [ ] Room availability management

### 3.2 Communication Module
- [ ] Teacher-parent messaging
- [ ] Announcement system
- [ ] Event calendar
- [ ] SMS integration (future)

### 3.3 Financial Module (Future)
- [ ] Fee management
- [ ] Payment tracking
- [ ] Invoice generation
- [ ] Financial reports

---

## 📅 Recommended Implementation Order

### Sprint 1 (Week 1-2): Parent Portal - Core
1. Database schema for Parent model
2. Parent registration and authentication
3. Parent-student linking
4. Parent dashboard with children list

### Sprint 2 (Week 3): Parent Portal - Views
1. View child's grades (read-only)
2. View child's attendance history
3. Download report card PDFs
4. Mobile-responsive parent UI

### Sprint 3 (Week 4): Analytics Dashboard
1. School-wide statistics API
2. Enrollment trends chart
3. Performance comparison views
4. Export to PDF functionality

### Sprint 4 (Week 5-6): Polish & Testing
1. Error handling improvements
2. Loading state optimizations
3. Unit and integration tests
4. Documentation updates

---

## 🛠️ Technical Debt to Address

| Issue | Priority | Estimated Time |
|-------|----------|----------------|
| Add comprehensive TypeScript types for all APIs | Medium | 4 hours |
| Implement proper error boundaries | Medium | 2 hours |
| Add API rate limiting | Low | 2 hours |
| Database query optimization | Low | 4 hours |
| Add request logging/monitoring | Low | 2 hours |

---

## 📝 Environment Setup for New Features

### For Parent Portal
```bash
# Add new environment variables
PARENT_JWT_SECRET=your-parent-jwt-secret
PARENT_SESSION_EXPIRY=7d

# Run database migration
cd packages/database
npx prisma migrate dev --name add_parent_portal
npx prisma generate
```

### For Email Notifications (Future)
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@school.edu
SMTP_PASS=your-smtp-password
EMAIL_FROM="Stunity <notifications@school.edu>"
```

---

## 📚 Related Documentation

| Document | Description |
|----------|-------------|
| `docs/PHASE9-11_REPORTS_ANALYTICS.md` | Reports & Analytics implementation |
| `docs/PHASE8_PERFORMANCE_OPTIMIZATION.md` | Performance optimizations |
| `docs/COMPLETE_SYSTEM_DOCUMENTATION.md` | Full system overview |
| `docs/MULTI_ACADEMIC_YEAR_SYSTEM.md` | Academic year management |
| `docs/ENHANCED_MANAGEMENT_SYSTEM.md` | Class & teacher management |
| `PROJECT_STATUS.md` | Current project status |

---

*Next Review: February 15, 2026*
