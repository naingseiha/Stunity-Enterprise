# v1 → v2 Migration Guide
**Stunity Enterprise - REST API Migration Strategy**

**Date:** January 29, 2026  
**Approach:** Copy & Enhance (REST API)  
**Timeline:** 4 weeks (~35-46 hours)

---

## 🎯 Migration Philosophy

**"Copy, don't rewrite"** - We're migrating proven, working code from v1 to v2 microservices.

### Key Principles:
1. **Keep REST API** - v1 works great with REST, no need for GraphQL now
2. **Add schoolId context** - Every operation scoped to a school
3. **Maintain functionality** - Don't break what works
4. **Test thoroughly** - Multi-tenancy must work perfectly
5. **Migrate incrementally** - One service at a time

---

## 📊 v1 API Analysis

### v1 Architecture
```
/api/
├── src/
│   ├── routes/          → 27 API route files
│   ├── controllers/     → Business logic
│   ├── services/        → Data access
│   ├── middleware/      → Auth, upload, etc.
│   └── server.ts        → Express app
```

### v2 Target Architecture
```
/services/
├── auth-service/        ✅ Port 3001 (Done)
├── school-service/      ✅ Port 3002 (Done)
├── student-service/     ⏳ Port 3003 (Week 1)
├── teacher-service/     ⏳ Port 3004 (Week 1)
├── class-service/       ⏳ Port 3005 (Week 1)
├── grade-service/       ⏳ Port 3006 (Week 2)
├── attendance-service/  ⏳ Port 3007 (Week 2)
├── subject-service/     ⏳ Port 3008 (Week 2)
├── feed-service/        ⏳ Port 3009 (Week 3)
├── notification-service/⏳ Port 3010 (Week 3)
├── profile-service/     ⏳ Port 3011 (Week 3)
├── dashboard-service/   ⏳ Port 3012 (Week 4)
├── parent-portal/       ⏳ Port 3013 (Week 4)
└── report-service/      ⏳ Port 3014 (Week 4)
```

---

## 🗺️ Complete Service Mapping

| v1 Route File | v2 Service | Lines | Complexity | Week |
|---------------|------------|-------|------------|------|
| auth.routes.ts | ✅ auth-service | 62 | Medium | Done |
| N/A | ✅ school-service | N/A | Medium | Done |
| student.routes.ts | student-service | 26 | Low | 1 |
| teacher.routes.ts | teacher-service | 29 | Low | 1 |
| class.routes.ts | class-service | 27 | Low | 1 |
| grade.routes.ts | grade-service | 140 | High | 2 |
| attendance.routes.ts | attendance-service | TBD | Medium | 2 |
| subject.routes.ts | subject-service | 33 | Low | 2 |
| feed.routes.ts | feed-service | 58 | High | 3 |
| notification.routes.ts | notification-service | TBD | Medium | 3 |
| profile.routes.ts | profile-service | 39 | Low | 3 |
| dashboard.routes.ts | dashboard-service | 31 | Medium | 4 |
| parent-portal.routes.ts | parent-portal-service | 38 | Low | 4 |
| report.routes.ts + export.routes.ts | report-service | 66 | Medium | 4 |
| social.routes.ts | (merge with feed-service) | 31 | Low | 3 |
| admin*.routes.ts | (admin dashboard - later) | ~200 | High | 5+ |
| achievements.routes.ts | (optional - later) | TBD | Low | 5+ |
| experiences.routes.ts | (optional - later) | TBD | Low | 5+ |
| projects.routes.ts | (optional - later) | 29 | Low | 5+ |
| recommendations.routes.ts | (optional - later) | TBD | Low | 5+ |
| skills.routes.ts | (optional - later) | TBD | Low | 5+ |

---

## 📋 Migration Checklist (4 Weeks)

### ✅ Week 0: Foundation (DONE)
- [x] Turborepo monorepo setup
- [x] Multi-tenant database schema
- [x] auth-service (JWT with school context)
- [x] school-service (registration with trials)
- [x] Web app landing page (bilingual)
- [x] Architecture decision (REST API)

**Status:** Infrastructure ready! 🚀

---

### ⏳ Week 1: Core User Management (6-8 hours)

#### Day 1-2: Student Service (2-3 hours)
```bash
cd ~/Documents/Stunity-Enterprise/services
mkdir -p student-service/src
cd student-service
npm init -y
npm install express cors prisma @prisma/client bcryptjs
```

**Endpoints to migrate:**
- `GET /students` - List all students (with schoolId filter)
- `GET /students/lightweight` - Fast list (id, name only)
- `GET /students/:id` - Get student details
- `POST /students` - Create student
- `POST /students/bulk` - Bulk import
- `PUT /students/:id` - Update student
- `DELETE /students/:id` - Delete student

**Migration steps:**
1. Copy from `v1/api/src/controllers/student.controller.ts`
2. Add `schoolId` filter to all queries:
   ```typescript
   // v1: prisma.student.findMany()
   // v2: prisma.student.findMany({ where: { schoolId: req.user.schoolId } })
   ```
3. Add auth middleware (JWT verification)
4. Test with both schools

**Changes needed:**
- Add `schoolId` to all Prisma queries
- Validate user has access to schoolId
- Check school usage limits before create
- Return school-scoped data only

---

#### Day 2-3: Teacher Service (1-2 hours)
Similar to student service but for teachers.

**Endpoints:**
- `GET /teachers`
- `GET /teachers/:id`
- `POST /teachers`
- `PUT /teachers/:id`
- `DELETE /teachers/:id`

**Copy from:** `v1/api/src/controllers/teacher.controller.ts`

---

#### Day 3-4: Class Service (1-2 hours)
**Endpoints:**
- `GET /classes`
- `GET /classes/:id`
- `POST /classes`
- `PUT /classes/:id`
- `DELETE /classes/:id`
- `POST /classes/:id/students` - Add students to class
- `POST /classes/:id/teachers` - Assign teachers

**Copy from:** `v1/api/src/controllers/class.controller.ts`

---

#### Day 4-5: Integration Testing (1 hour)
- Test student CRUD
- Test teacher CRUD
- Test class CRUD
- Test student → class assignments
- Test teacher → class assignments
- Verify schoolId isolation (can't access other school's data)
- Test with both existing schools

---

### ⏳ Week 2: Academic Core (8-11 hours)

#### Day 6-8: Grade Service (4-5 hours)
**Most complex service** - 140 lines in v1

**Endpoints:**
- `GET /grades` - List grades
- `GET /grades/student/:studentId` - Student grades
- `GET /grades/class/:classId` - Class grades
- `POST /grades` - Enter grade
- `POST /grades/bulk` - Bulk grade entry
- `PUT /grades/:id` - Update grade
- `DELETE /grades/:id` - Delete grade
- `GET /grades/report/:studentId` - Grade report
- `GET /grades/report/class/:classId` - Class report

**Copy from:** `v1/api/src/controllers/grade.controller.ts`

**Special considerations:**
- Complex calculations (GPA, averages, rankings)
- Report generation
- Academic year filtering
- Multi-subject grading

---

#### Day 8-10: Attendance Service (3-4 hours)
**Endpoints:**
- `GET /attendance` - List attendance
- `GET /attendance/date/:date` - Daily attendance
- `GET /attendance/student/:studentId` - Student attendance
- `POST /attendance` - Mark attendance
- `POST /attendance/bulk` - Bulk attendance
- `PUT /attendance/:id` - Update attendance
- `GET /attendance/report/:studentId` - Attendance report

**Copy from:** `v1/api/src/controllers/attendance.controller.ts`

---

#### Day 10-11: Subject Service (1-2 hours)
**Endpoints:**
- `GET /subjects` - List subjects
- `GET /subjects/:id` - Get subject
- `POST /subjects` - Create subject
- `PUT /subjects/:id` - Update subject
- `DELETE /subjects/:id` - Delete subject

**Copy from:** `v1/api/src/routes/subject.routes.ts`

---

### ⏳ Week 3: Social & Communication (9-13 hours)

#### Day 12-15: Feed Service (4-6 hours)
**Complex service** - All 15 post types + comments + reactions

**Endpoints:**
- `POST /posts` - Create post (15 types)
- `GET /posts` - Feed (paginated)
- `GET /posts/:id` - Get post
- `PUT /posts/:id` - Update post
- `DELETE /posts/:id` - Delete post
- `POST /posts/:id/like` - Like/unlike
- `POST /polls/:optionId/vote` - Vote on poll
- `GET /posts/:id/comments` - Get comments
- `POST /posts/:id/comments` - Add comment
- `PUT /comments/:id` - Edit comment
- `DELETE /comments/:id` - Delete comment
- `POST /comments/:id/react` - React to comment
- `GET /users/:id/posts` - User posts
- `GET /search/users` - Search for mentions
- `POST /posts/:id/view` - Track view
- `GET /posts/:id/analytics` - Get analytics

**Copy from:** `v1/api/src/controllers/feed.controller.ts`

**Special considerations:**
- All 15 post types already working in v1
- Image upload handling
- Poll voting logic
- Comment nesting (3 levels)
- Reaction system
- Analytics tracking

---

#### Day 15-17: Notification Service (3-4 hours)
**Endpoints:**
- `GET /notifications` - List notifications
- `GET /notifications/unread` - Unread count
- `POST /notifications/mark-read/:id` - Mark as read
- `POST /notifications/mark-all-read` - Mark all read
- `DELETE /notifications/:id` - Delete notification
- WebSocket support for real-time notifications

**Copy from:** `v1/api/src/controllers/notification.controller.ts`

---

#### Day 17-18: Profile Service (2-3 hours)
**Endpoints:**
- `GET /profile/:userId` - Get user profile
- `PUT /profile` - Update profile
- `POST /profile/avatar` - Upload avatar
- `GET /profile/:userId/activity` - User activity

**Copy from:** `v1/api/src/controllers/profile.controller.ts`

---

### ⏳ Week 4: Reports & Completion (12-17 hours)

#### Day 19-20: Dashboard Service (3-4 hours)
**Endpoints:**
- `GET /dashboard/stats` - Overall statistics
- `GET /dashboard/students/count` - Student count
- `GET /dashboard/teachers/count` - Teacher count
- `GET /dashboard/attendance/today` - Today's attendance
- `GET /dashboard/grades/recent` - Recent grades

**Copy from:** `v1/api/src/controllers/dashboard.controller.ts`

---

#### Day 20-21: Parent Portal Service (2-3 hours)
**Endpoints:**
- `GET /parent/children` - Get children
- `GET /parent/child/:id/grades` - Child's grades
- `GET /parent/child/:id/attendance` - Child's attendance
- `GET /parent/child/:id/feed` - Child's school feed

**Copy from:** `v1/api/src/controllers/parent-portal.controller.ts`

---

#### Day 21-22: Report & Export Service (3-4 hours)
**Endpoints:**
- `GET /reports/student/:id` - Student report card
- `GET /reports/class/:id` - Class report
- `GET /reports/attendance` - Attendance report
- `GET /export/students` - Export students CSV
- `GET /export/grades` - Export grades CSV
- `GET /export/attendance` - Export attendance CSV
- `POST /reports/pdf` - Generate PDF report

**Copy from:** 
- `v1/api/src/controllers/report.controller.ts`
- `v1/api/src/controllers/export.controller.ts`

---

#### Day 22-25: Final Integration (4-6 hours)
- [ ] Test all 14 services together
- [ ] Test cross-service communication
- [ ] Performance testing (load testing)
- [ ] Multi-tenancy verification
- [ ] Security audit
- [ ] Fix any bugs
- [ ] Update all documentation
- [ ] Create deployment scripts
- [ ] Deploy to staging
- [ ] User acceptance testing

---

## 🔧 Migration Pattern (Copy & Enhance)

### Standard Migration Template

**1. Create Service Structure:**
```bash
cd ~/Documents/Stunity-Enterprise/services
mkdir -p SERVICE_NAME/src
cd SERVICE_NAME
npm init -y
npm install express cors @prisma/client bcryptjs jsonwebtoken
```

**2. Create Service File:**
```typescript
// services/SERVICE_NAME/src/index.ts
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Auth middleware
const authenticateToken = (req, res, next) => {
  // JWT verification
  // Add req.user with { id, email, role, schoolId }
  next();
};

// Apply auth to all routes
app.use(authenticateToken);

// COPY ROUTES FROM v1 HERE
// Example: GET /students
app.get('/students', async (req, res) => {
  try {
    // v1 code: const students = await prisma.student.findMany();
    // v2 code: ADD schoolId filter
    const students = await prisma.student.findMany({
      where: { schoolId: req.user.schoolId }, // NEW: Multi-tenant
    });
    
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// More routes...

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`✅ SERVICE_NAME running on port ${PORT}`);
});
```

**3. Add to package.json:**
```json
{
  "scripts": {
    "start": "node src/index.ts",
    "dev": "nodemon src/index.ts"
  }
}
```

**4. Test:**
```bash
npm start

# In another terminal
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3003/students
```

---

## ⚡ Quick Win: Copy Pattern

### What to Copy (Keep as-is):
- ✅ Business logic
- ✅ Validation rules
- ✅ Error handling
- ✅ Response formats
- ✅ Prisma queries (structure)

### What to Change (Add multi-tenancy):
- 🔄 Add `schoolId` filter to ALL queries
- 🔄 Add auth middleware to extract schoolId from JWT
- 🔄 Validate user access to schoolId
- 🔄 Check usage limits (students, teachers, storage)
- 🔄 Update imports (use @prisma/client from packages/database)

### Example Transformation:

**v1 Code:**
```typescript
// v1/api/src/controllers/student.controller.ts
export const getAllStudents = async (req, res) => {
  const students = await prisma.student.findMany({
    include: {
      class: true,
      user: true,
    },
  });
  res.json({ success: true, data: students });
};
```

**v2 Code:**
```typescript
// v2/services/student-service/src/index.ts
app.get('/students', authenticateToken, async (req, res) => {
  try {
    const schoolId = req.user.schoolId; // From JWT
    
    const students = await prisma.student.findMany({
      where: { schoolId }, // NEW: Multi-tenant filter
      include: {
        class: true,
        user: true,
      },
    });
    
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Key Changes:**
1. Added `authenticateToken` middleware
2. Extract `schoolId` from `req.user` (JWT payload)
3. Added `where: { schoolId }` to Prisma query
4. Everything else stays the same!

---

## 🧪 Testing Strategy

### 1. Unit Testing (Per Service)
```bash
# Test each endpoint
curl -X GET http://localhost:3003/students \
  -H "Authorization: Bearer TEST_HIGH_SCHOOL_TOKEN"

curl -X POST http://localhost:3003/students \
  -H "Authorization: Bearer TEST_HIGH_SCHOOL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "classId": "..."
  }'
```

### 2. Multi-Tenancy Testing
```bash
# School 1: Create student
curl -X POST http://localhost:3003/students \
  -H "Authorization: Bearer SCHOOL_1_TOKEN" \
  -d '{"firstName": "Alice", ...}'

# School 2: Try to access School 1's student (should fail)
curl -X GET http://localhost:3003/students/ALICE_ID \
  -H "Authorization: Bearer SCHOOL_2_TOKEN"
# Expected: 404 or 403 (not found or forbidden)
```

### 3. Integration Testing
- Test student → class → teacher relationships
- Test grade entry flow (student + subject + teacher)
- Test attendance tracking across classes
- Test feed posts visible only to same school

### 4. Performance Testing
- Load test with 100+ concurrent requests
- Test query performance with schoolId filter
- Verify database indexes work correctly
- Check response times (<100ms for simple queries)

---

## 📊 Success Metrics

### Per Service:
- [ ] All v1 endpoints migrated
- [ ] schoolId filtering working
- [ ] Auth middleware working
- [ ] Multi-tenancy verified
- [ ] No cross-school data leakage
- [ ] Response format matches v1
- [ ] Error handling working
- [ ] Tests passing

### Overall:
- [ ] All 14 services deployed
- [ ] Complete feature parity with v1
- [ ] Multi-tenancy working perfectly
- [ ] Performance acceptable (<100ms avg)
- [ ] Security verified (no data leaks)
- [ ] Documentation updated
- [ ] Ready for production migration

---

## 🚨 Common Pitfalls & Solutions

### Pitfall 1: Forgot schoolId Filter
**Problem:** Query returns data from all schools
```typescript
// ❌ Wrong
const students = await prisma.student.findMany();

// ✅ Correct
const students = await prisma.student.findMany({
  where: { schoolId: req.user.schoolId }
});
```

### Pitfall 2: Usage Limit Not Checked
**Problem:** School exceeds student limit
```typescript
// ✅ Check limit before create
const school = await prisma.school.findUnique({
  where: { id: req.user.schoolId }
});

const currentStudents = await prisma.student.count({
  where: { schoolId: req.user.schoolId }
});

if (currentStudents >= school.maxStudents) {
  return res.status(403).json({
    success: false,
    error: 'Student limit reached for your subscription tier'
  });
}
```

### Pitfall 3: Forgot to Validate schoolId Access
**Problem:** User can access other school's data by changing schoolId
```typescript
// ❌ Wrong: Trust schoolId from request body
const { schoolId, ...data } = req.body;
const student = await prisma.student.create({
  data: { schoolId, ...data }
});

// ✅ Correct: Use schoolId from JWT (verified)
const student = await prisma.student.create({
  data: { 
    schoolId: req.user.schoolId, // From JWT, can't be faked
    ...data 
  }
});
```

### Pitfall 4: Cross-School Relations
**Problem:** Assigning student from School A to class in School B
```typescript
// ✅ Verify both belong to same school
const student = await prisma.student.findFirst({
  where: { 
    id: studentId,
    schoolId: req.user.schoolId // Verify ownership
  }
});

const classItem = await prisma.class.findFirst({
  where: { 
    id: classId,
    schoolId: req.user.schoolId // Verify ownership
  }
});

if (!student || !classItem) {
  return res.status(404).json({
    success: false,
    error: 'Student or class not found in your school'
  });
}
```

---

## 📚 Additional Resources

### Existing Documentation:
- `/REST_VS_GRAPHQL.md` - Why we chose REST API
- `/TESTING_GUIDE.md` - API testing guide
- `/SCHEMA_MIGRATION_PLAN.md` - Database design
- `/WEB_APP_IMPLEMENTATION_GUIDE.md` - Frontend guide

### v1 Codebase Reference:
- `/Users/naingseiha/Downloads/SchoolApp/SchoolManagementApp/api/`
- Look at `src/routes/*.ts` for endpoints
- Look at `src/controllers/*.ts` for business logic
- Look at `src/services/*.ts` for Prisma queries
- Look at `src/middleware/auth.middleware.ts` for JWT verification

---

## 🎯 Next Steps

1. **Read this guide completely** ✅
2. **Start with student-service** (Week 1, Day 1-2)
3. **Follow the migration pattern** (Copy & Enhance)
4. **Test thoroughly** (Multi-tenancy is critical)
5. **Commit often** (After each service)
6. **Move to next service** (Repeat pattern)

---

**Ready to start? Let's build student-service first! 🚀**
