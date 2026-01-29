# 📊 Database Schema Comparison - Current vs Future

## Overview

This document compares the **current production schema** with the **future complete schema** to help plan the migration and implementation roadmap.

---

## Schema Statistics

| Metric | Current (Production) | Future (Complete) | Delta |
|--------|---------------------|-------------------|-------|
| **Models** | 13 | 22 | +9 models |
| **Lines of Code** | 392 | 1,189 | +797 lines |
| **Complexity** | Single-tenant | Multi-tenant | Major upgrade |
| **Academic Years** | Single year | Multi-year | Major feature |
| **Schools** | Single school | Multi-school | Major feature |

---

## Current Production Models (13)

Located in: `/api/prisma/schema.prisma`

### Core Models ✅ Implemented
1. **Student** - Student profiles and information
2. **Teacher** - Teacher profiles and information
3. **Class** - Classes and sections
4. **Grade** - Individual grades and scores
5. **Attendance** - Daily attendance tracking
6. **User** - Authentication and user accounts
7. **TeacherClass** - Teacher-class assignments
8. **StudentMonthlySummary** - Monthly grade summaries
9. **MonthlyAttendance** - Monthly attendance summaries
10. **Notification** - System notifications
11. **Job** - Background job processing
12. **MonthlyGrade** - Monthly grade records
13. **ScoreImprovement** - Score tracking and improvements

---

## Future Complete Models (22)

Located in: `/docs/future-implementation/database/DATABASE_SCHEMA_COMPLETE.prisma`

### Additional Models Needed (9 new)

14. **School** 🆕 - Multi-tenant school management
15. **AcademicYear** 🆕 - Multi-year support
16. **Subject** 🆕 - Subject/course management
17. **Schedule** 🆕 - Class scheduling system
18. **Assignment** 🆕 - Homework and assignments
19. **Exam** 🆕 - Exam management
20. **ExamResult** 🆕 - Exam scores and results
21. **Parent** 🆕 - Parent portal access
22. **Event** 🆕 - School events and calendar

---

## Key Differences

### 1. Multi-Tenant Architecture 🏢

**Current**: Single school hardcoded
```prisma
// No School model
// Everything belongs to one school
```

**Future**: Full multi-tenant support
```prisma
model School {
  id                String    @id @default(cuid())
  schoolId          String    @unique // "SCH-PP-001"
  name              String
  nameKh            String
  // ... 50+ fields for complete school management
}
```

### 2. Multi-Academic Year Support 📅

**Current**: Single year ("2024-2025" hardcoded)
```prisma
model Class {
  academicYear String @default("2024-2025")
}
```

**Future**: Dynamic multi-year system
```prisma
model AcademicYear {
  id        String   @id @default(cuid())
  schoolId  String
  yearCode  String   // "2024-2025", "2025-2026"
  startDate DateTime
  endDate   DateTime
  isCurrent Boolean
  school    School   @relation(fields: [schoolId], references: [id])
}
```

### 3. Enhanced Educational Features 🎓

**Current**: Basic grades and attendance
- Simple grade tracking
- Basic attendance
- Limited reporting

**Future**: Comprehensive learning management
- Full assignment system
- Exam management
- Subject/course structure
- Class scheduling
- Parent portal
- Event management

### 4. Data Relationships 🔗

**Current**: Flat structure
```
Student -> Class -> Grade
Student -> Attendance
```

**Future**: Rich relational model
```
School -> AcademicYear -> Class -> Schedule -> Subject
        -> Student -> Grade -> Exam -> ExamResult
        -> Teacher -> Assignment
        -> Parent (via Student)
        -> Event
```

---

## Migration Path

### Phase 1: Add Multi-Tenant Foundation ✅
**Priority**: CRITICAL
**Timeline**: 1-2 months

**Changes Needed**:
1. Add `School` model
2. Add `schoolId` to all existing models
3. Update all queries to be school-scoped
4. Add school selection UI
5. Migrate existing data to default school

**Impact**: BREAKING - Requires data migration

### Phase 2: Add Multi-Year Support 📅
**Priority**: HIGH
**Timeline**: 1 month

**Changes Needed**:
1. Add `AcademicYear` model
2. Add `academicYearId` to relevant models
3. Add year progression logic
4. Add historical data views
5. Migrate existing data to current year

**Impact**: Medium - Backward compatible with proper defaults

### Phase 3: Add Subject & Schedule 📚
**Priority**: MEDIUM
**Timeline**: 2-3 months

**Changes Needed**:
1. Add `Subject` model
2. Add `Schedule` model
3. Link classes to subjects
4. Add timetable generation
5. Update grading system for subjects

**Impact**: Low - New features, existing data unaffected

### Phase 4: Add Assignment System 📝
**Priority**: MEDIUM
**Timeline**: 2 months

**Changes Needed**:
1. Add `Assignment` model
2. Add submission tracking
3. Add grading workflow
4. Add file upload system
5. Integrate with existing grades

**Impact**: Low - New features only

### Phase 5: Add Exam Management 📊
**Priority**: MEDIUM
**Timeline**: 2 months

**Changes Needed**:
1. Add `Exam` model
2. Add `ExamResult` model
3. Add exam scheduling
4. Add result entry workflow
5. Integrate with gradebook

**Impact**: Low - New features only

### Phase 6: Add Parent Portal 👨‍👩‍👧
**Priority**: MEDIUM
**Timeline**: 1 month

**Changes Needed**:
1. Add `Parent` model
2. Link parents to students
3. Add parent authentication
4. Add parent views
5. Add parent notifications

**Impact**: Low - New features only

### Phase 7: Add Event System 📆
**Priority**: LOW
**Timeline**: 1 month

**Changes Needed**:
1. Add `Event` model
2. Add calendar UI
3. Add event notifications
4. Add RSVP system

**Impact**: Low - New features only

---

## Data Model Enhancements

### Enhanced Student Model

**Current**:
```prisma
model Student {
  id          String   @id @default(cuid())
  studentId   String   @unique
  name        String
  grade       String
  // ... basic fields
}
```

**Future**:
```prisma
model Student {
  id          String   @id @default(cuid())
  schoolId    String   // ← Multi-tenant
  studentId   String   @unique
  name        String
  nameKh      String   // ← Localization
  nameEn      String?
  gender      Gender
  dateOfBirth DateTime
  // ... 30+ additional fields
  
  // Rich relationships
  school      School   @relation(fields: [schoolId], references: [id])
  parents     Parent[]
  grades      Grade[]
  attendance  Attendance[]
  assignments Assignment[]
  exams       ExamResult[]
}
```

### Enhanced Class Model

**Current**:
```prisma
model Class {
  id           String @id @default(cuid())
  name         String
  grade        String
  academicYear String @default("2024-2025")
}
```

**Future**:
```prisma
model Class {
  id              String      @id @default(cuid())
  schoolId        String      // ← Multi-tenant
  academicYearId  String      // ← Multi-year
  classCode       String      @unique
  name            String
  nameKh          String
  gradeLevel      GradeLevel
  section         String?
  track           String?     // Science, Social, etc.
  capacity        Int?
  
  // Rich relationships
  school          School      @relation(fields: [schoolId], references: [id])
  academicYear    AcademicYear @relation(fields: [academicYearId], references: [id])
  students        Student[]
  subjects        Subject[]
  schedules       Schedule[]
  homeroomTeacher Teacher?
}
```

---

## API Endpoints Impact

### Current Endpoints (13 models × ~5 endpoints = 65 endpoints)

**Example**: `/api/students`
- GET /api/students
- GET /api/students/:id
- POST /api/students
- PUT /api/students/:id
- DELETE /api/students/:id

### Future Endpoints (22 models × ~5 endpoints = 110+ endpoints)

**New Endpoints Needed**:
- `/api/schools/*` (10+ endpoints)
- `/api/academic-years/*` (10+ endpoints)
- `/api/subjects/*` (10+ endpoints)
- `/api/schedules/*` (10+ endpoints)
- `/api/assignments/*` (15+ endpoints)
- `/api/exams/*` (15+ endpoints)
- `/api/parents/*` (10+ endpoints)
- `/api/events/*` (10+ endpoints)
- `/api/multi-tenant/*` (school switching, etc.)

**Updated Endpoints** (all existing endpoints need school context):
- `/api/students` → `/api/schools/:schoolId/students`
- `/api/classes` → `/api/schools/:schoolId/academic-years/:yearId/classes`
- `/api/grades` → `/api/schools/:schoolId/students/:studentId/grades`

---

## Database Size Estimation

### Current Database (Single School, 500 students)

| Table | Rows | Size |
|-------|------|------|
| students | 500 | 100 KB |
| teachers | 50 | 10 KB |
| classes | 20 | 5 KB |
| grades | 15,000 | 3 MB |
| attendance | 50,000 | 10 MB |
| **Total** | ~65,570 | ~13 MB |

### Future Database (100 Schools, 50,000 students)

| Table | Rows | Size |
|-------|------|------|
| schools | 100 | 50 KB |
| academic_years | 500 | 100 KB |
| students | 50,000 | 10 MB |
| teachers | 5,000 | 1 MB |
| classes | 2,000 | 500 KB |
| subjects | 1,000 | 200 KB |
| grades | 1,500,000 | 300 MB |
| attendance | 5,000,000 | 1 GB |
| assignments | 50,000 | 100 MB |
| exams | 10,000 | 50 MB |
| exam_results | 500,000 | 100 MB |
| schedules | 20,000 | 10 MB |
| events | 5,000 | 2 MB |
| **Total** | ~7,643,500 | ~1.5 GB |

**Growth Rate**: ~115× increase in rows, ~115× increase in size

---

## Performance Considerations

### Indexing Strategy

**Current**: Basic indexes
```prisma
@@index([studentId])
@@index([classId])
```

**Future**: Comprehensive indexing
```prisma
@@index([schoolId])                        // Multi-tenant queries
@@index([schoolId, academicYearId])        // Year-scoped queries
@@index([schoolId, studentId])             // Student lookup
@@index([academicYearId, classId])         // Class queries
@@index([date, status])                    // Time-based queries
@@index([createdAt, updatedAt])            // Audit queries
// ... 30+ strategic indexes
```

### Query Optimization

**Current**: Simple queries
```sql
SELECT * FROM students WHERE grade = 'GRADE_10';
```

**Future**: Scoped queries
```sql
SELECT * FROM students 
WHERE schoolId = 'school-123' 
  AND academicYearId = 'ay-2024-2025'
  AND grade = 'GRADE_10'
  AND isActive = true;
```

### Caching Strategy

**Current**: Minimal caching
- In-memory cache for user sessions

**Future**: Multi-layer caching
- Redis for school data (1 hour TTL)
- Redis for academic year data (1 day TTL)
- CDN for static assets
- Browser cache for student data (5 min TTL)
- Query result cache (Prisma cache)

---

## Security Enhancements

### Row-Level Security

**Current**: Application-level only
```typescript
// Check in code
if (user.role !== 'ADMIN') throw new Error('Unauthorized');
```

**Future**: Database-level + Application
```sql
-- PostgreSQL RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY school_isolation ON students
FOR ALL TO authenticated_user
USING (schoolId = current_setting('app.current_school')::text);
```

### Data Isolation

**Current**: Single school - no isolation needed

**Future**: Complete tenant isolation
- School-level data separation
- Cross-school query prevention
- Super admin access controls
- School admin boundaries
- Teacher access restrictions
- Student data privacy

---

## Backup & Recovery

### Current Strategy
- Daily full backups
- 7-day retention
- Single restore point

### Future Strategy
- Hourly incremental backups
- Daily full backups
- Per-school restore capability
- Point-in-time recovery
- 90-day retention
- Cross-region replication
- Disaster recovery plan

---

## Testing Requirements

### Current Tests
- 50 unit tests
- 20 integration tests
- Basic API tests

### Future Tests Needed
- 200+ unit tests (all new models)
- 100+ integration tests (multi-tenant flows)
- 50+ E2E tests (full user journeys)
- Multi-tenant isolation tests
- Performance tests (100 schools)
- Load tests (10,000 concurrent users)
- Security tests (tenant isolation)
- Migration tests (data integrity)

---

## Documentation Needs

### ✅ Already Documented
- [x] README.md - Main documentation index
- [x] ARCHITECTURE_OVERVIEW.md - System architecture
- [x] MASTER_VISION.md - Vision and roadmap
- [x] CURRENT_SYSTEM_BASELINE.md - Current state
- [x] MIGRATION_GUIDE.md - Migration overview

### ⚠️ Missing Database Docs (NEEDED)

1. **DATABASE_MIGRATION_PHASES.md** 🆕 NEEDED
   - Step-by-step migration for each phase
   - SQL migration scripts
   - Data transformation logic
   - Rollback procedures

2. **DATABASE_OPTIMIZATION.md** 🆕 NEEDED
   - Performance tuning
   - Index strategy
   - Query optimization
   - Monitoring queries

3. **DATABASE_SEEDING.md** 🆕 NEEDED
   - Test data generation
   - Demo school setup
   - Realistic data volumes
   - Multi-tenant test data

4. **DATABASE_BACKUP_STRATEGY.md** 🆕 NEEDED
   - Backup procedures
   - Restore procedures
   - DR planning
   - RTO/RPO targets

5. **DATABASE_RELATIONSHIPS.md** 🆕 NEEDED
   - Entity relationship diagrams
   - Data flow diagrams
   - Cascade delete rules
   - Referential integrity

### ⚠️ Missing API Docs (NEEDED)

1. **API_MIGRATION_GUIDE.md** 🆕 NEEDED
   - Breaking changes
   - Deprecated endpoints
   - New endpoints
   - Migration timeline

2. **API_MULTI_TENANT.md** 🆕 NEEDED
   - School selection flow
   - Tenant context handling
   - School switching
   - Super admin APIs

3. **API_AUTHENTICATION.md** 🆕 NEEDED
   - OAuth2 implementation
   - JWT token structure
   - School-scoped tokens
   - Permission system

4. **API_RATE_LIMITING.md** 🆕 NEEDED
   - Rate limit policies
   - Per-school limits
   - API quotas
   - Throttling strategies

### ⚠️ Missing Feature Docs (NEEDED)

1. **ASSIGNMENT_SYSTEM.md** 🆕 NEEDED
   - Assignment creation
   - Submission workflow
   - Grading process
   - Late submission handling

2. **EXAM_MANAGEMENT.md** 🆕 NEEDED
   - Exam scheduling
   - Result entry
   - Grade calculation
   - Report generation

3. **PARENT_PORTAL.md** 🆕 NEEDED
   - Parent registration
   - Student linking
   - Access permissions
   - Communication features

4. **SCHEDULE_SYSTEM.md** 🆕 NEEDED
   - Timetable creation
   - Class scheduling
   - Teacher assignment
   - Room allocation

---

## Recommendations

### Immediate Actions (This Week) 🔥

1. ✅ **Move DATABASE_SCHEMA_COMPLETE.prisma** to correct location
   - [x] Moved to `/docs/future-implementation/database/`
   - [x] Added header comments

2. ✅ **Create this comparison document**
   - [x] Document all differences
   - [x] Explain migration path
   - [x] Identify gaps

3. 📝 **Create missing database docs**
   - [ ] DATABASE_MIGRATION_PHASES.md
   - [ ] DATABASE_OPTIMIZATION.md
   - [ ] DATABASE_SEEDING.md
   - [ ] DATABASE_BACKUP_STRATEGY.md
   - [ ] DATABASE_RELATIONSHIPS.md

### Short-term Actions (This Month) 📅

4. 📝 **Create missing API docs**
   - [ ] API_MIGRATION_GUIDE.md
   - [ ] API_MULTI_TENANT.md
   - [ ] API_AUTHENTICATION.md
   - [ ] API_RATE_LIMITING.md

5. 📝 **Create missing feature docs**
   - [ ] ASSIGNMENT_SYSTEM.md
   - [ ] EXAM_MANAGEMENT.md
   - [ ] PARENT_PORTAL.md
   - [ ] SCHEDULE_SYSTEM.md

6. 🔍 **Review and enhance existing docs**
   - [ ] Add code examples
   - [ ] Add screenshots/diagrams
   - [ ] Add troubleshooting sections
   - [ ] Add FAQ sections

### Long-term Actions (Next Quarter) 🎯

7. 🧪 **Create test documentation**
   - [ ] Testing strategy
   - [ ] Test data setup
   - [ ] E2E test scenarios
   - [ ] Performance benchmarks

8. 📊 **Create operational docs**
   - [ ] Deployment procedures
   - [ ] Monitoring setup
   - [ ] Incident response
   - [ ] Scaling procedures

9. 👥 **Create user documentation**
   - [ ] Admin user guide
   - [ ] Teacher user guide
   - [ ] Student user guide
   - [ ] Parent user guide

---

## Summary

### What We Have ✅
- Comprehensive vision and architecture docs
- Clear roadmap and phases
- Current system baseline
- Migration overview

### What We Need 🆕
- **5 Database docs** (migrations, optimization, seeding, backup, relationships)
- **4 API docs** (migration, multi-tenant, auth, rate limiting)
- **4 Feature docs** (assignments, exams, parent portal, scheduling)
- **13 additional docs** total needed

### Priority Assessment

**CRITICAL** 🔥 (Do Now):
- DATABASE_MIGRATION_PHASES.md
- API_MULTI_TENANT.md
- DATABASE_RELATIONSHIPS.md

**HIGH** ⚡ (Do This Month):
- DATABASE_OPTIMIZATION.md
- API_AUTHENTICATION.md
- ASSIGNMENT_SYSTEM.md
- EXAM_MANAGEMENT.md

**MEDIUM** 📋 (Do This Quarter):
- DATABASE_SEEDING.md
- API_RATE_LIMITING.md
- PARENT_PORTAL.md
- SCHEDULE_SYSTEM.md

**LOW** 📝 (Do When Ready):
- DATABASE_BACKUP_STRATEGY.md
- API_MIGRATION_GUIDE.md
- User guides

---

## Conclusion

The `docs/future-implementation/` directory has **excellent foundation documentation** but needs **more technical implementation details**, especially around:

1. **Database migrations** - Detailed step-by-step guides
2. **API design** - Multi-tenant patterns and authentication
3. **Feature implementations** - Assignment, exam, parent, schedule systems

Creating these additional **13 documents** will complete the documentation and provide developers with everything they need to implement the full system.

**Status**: 60% Complete - Good foundation, needs tactical details

---

## Document Information

**Created**: January 18, 2026
**Author**: System Documentation Team
**Status**: Living Document
**Next Review**: Weekly until all gaps filled
**Priority**: HIGH

