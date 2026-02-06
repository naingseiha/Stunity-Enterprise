# Next Implementation Roadmap

**Last Updated:** February 6, 2026  
**Status:** Course Service Complete - Ready for Next Phase

This document outlines the planned next steps for Stunity Enterprise development.

---

## ✅ Recently Completed (February 6, 2026)

### Phase 21: Course Service Backend ✅ NEW
- [x] Added 9 database models for courses and learning
- [x] Course CRUD API endpoints
- [x] Lesson management endpoints
- [x] Enrollment and progress tracking
- [x] Learning path endpoints
- [x] User learning statistics
- [x] 8 sample courses seeded with 40 lessons
- [x] 2 learning paths seeded
- [x] Frontend connected to real API
- [x] Enroll functionality working

### Phase 20.5: UI Redesign & Learn Hub ✅
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

See `PROJECT_STATUS.md` for complete feature history.

---

## 🎯 Priority 1: High Priority Features

### 1.1 Course Detail Page ⭐ RECOMMENDED NEXT
**Status:** Ready to implement  
**Estimated Effort:** 1 session

Create dedicated course detail page with lessons viewer.

**Features:**
- `/learn/course/[id]` - Course detail page
- Course info, instructor bio, syllabus
- Lesson list with progress indicators
- Lesson viewer with video/content
- Mark lesson as complete
- Course reviews section

**Files to create:**
```
apps/web/src/app/[locale]/learn/course/[id]/page.tsx
apps/web/src/app/[locale]/learn/course/[id]/lesson/[lessonId]/page.tsx
```

### 1.2 Course Creation UI (Instructors)
**Status:** Backend ready  
**Estimated Effort:** 1-2 sessions

Create course wizard for teachers to create their own courses.

**Features:**
- Multi-step course creation wizard
- Course info form (title, description, category, level)
- Lesson builder (reorder, add resources)
- Thumbnail upload
- Preview before publish
- Draft/Publish toggle

### 1.3 Stories/Status Updates
**Status:** Not started  
**Estimated Effort:** 2 sessions

24-hour ephemeral content like Instagram/WhatsApp stories.

**Backend:**
- Story model (mediaUrl, text, backgroundColor, expiresAt)
- StoryView model for tracking
- Story CRUD endpoints
- Auto-deletion cron job

**Frontend:**
- Story circles at top of feed
- Create story modal
- Story viewer with swipe navigation

---

## 🎯 Priority 2: Medium Priority

### 2.1 Advanced Notifications
- Enhanced triggers (follower, DM, event reminder, mentions)
- Email notification templates
- Notification preferences page

### 2.2 User Profiles Enhancement
- Education/Work history forms
- Skills/Interests tags
- Follow/Unfollow system
- Profile privacy settings

### 2.3 Mobile App (React Native)
- Full mobile app development
- Push notifications
- Offline support

---

## 📊 API Endpoints Available

### Course Service (Port 3010)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /courses | List published courses |
| GET | /courses/my-courses | User's enrolled courses |
| GET | /courses/featured | Featured courses |
| GET | /courses/categories | Categories with counts |
| GET | /courses/:id | Course details with lessons |
| POST | /courses/:id/enroll | Enroll in course |
| POST | /courses | Create course (instructor) |
| PUT | /courses/:id | Update course |
| POST | /courses/:id/publish | Publish course |
| GET | /courses/:courseId/lessons | Course lessons |
| GET | /courses/:courseId/lessons/:lessonId | Single lesson |
| POST | /courses/:courseId/lessons/:lessonId/progress | Update progress |
| POST | /courses/:courseId/lessons | Add lesson |
| GET | /learning-paths/paths | Learning paths |
| POST | /learning-paths/paths/:id/enroll | Enroll in path |
| GET | /courses/stats/my-learning | Learning statistics |

---

## 🧪 Test URLs

| URL | Description |
|-----|-------------|
| http://localhost:3000/en/learn | Learn Hub |
| http://localhost:3000/en/clubs | Study Clubs |
| http://localhost:3000/en/events | Events |
| http://localhost:3000/en/feed | Social Feed |
| http://localhost:3000/en/profile/me | Profile |

**Login Credentials:**
- Email: john.doe@testhighschool.edu
- Password: SecurePass123!

---

## 📚 Related Documentation

| Document | Description |
|----------|-------------|
| `PROJECT_STATUS.md` | Current project status |
| `docs/COMPLETE_SYSTEM_DOCUMENTATION.md` | Full system overview |
| `docs/MULTI_ACADEMIC_YEAR_SYSTEM.md` | Academic year management |
| `docs/ENHANCED_MANAGEMENT_SYSTEM.md` | Class & teacher management |

---

*Next Review: February 15, 2026*
