# 🔄 Complete Migration Guide - Enterprise Multi-School System

## Overview

This guide provides a **complete step-by-step** migration from the current single-school, single-year system to a full enterprise-grade multi-tenant platform supporting:

✅ **Multiple Academic Years** - Track student progression across years
✅ **Multiple Schools** - Complete multi-tenant architecture
✅ **Super Admin System** - Centralized school management
✅ **Student Progression** - Automated promotion between years
✅ **Historical Data** - Complete academic history tracking
✅ **Data Isolation** - Secure school-level data segregation

---

## 📊 Current System Baseline

### What We Have Now (v1.0)
```
✅ Single school (no school entity)
✅ Single academic year ("2024-2025" hardcoded)
✅ Students, Teachers, Classes, Subjects
✅ Grades, Attendance tracking
✅ Authentication (Admin, Teacher, Student)
✅ Reports and dashboard
```

### Current Limitations
```
❌ Cannot track students across multiple years
❌ Cannot manage multiple schools
❌ No student progression/promotion system
❌ No historical data access
❌ No super admin / centralized management
❌ No data isolation for multi-tenancy
```

---

## 🎯 Migration Strategy

### Core Principles
1. **Zero Downtime**: Existing features continue working during migration
2. **Backward Compatible**: No breaking changes for current users
3. **Incremental**: Small, testable steps
4. **Rollback Capable**: Can revert if needed
5. **Data Integrity**: No data loss at any stage

### Phase Overview (6 Phases, 24 Weeks)

```
Phase 0: Preparation (Week 1)
   ↓
Phase 1: Foundation - Multi-Year & Multi-School (Weeks 2-5)
   ↓
Phase 2: Production Multi-Tenancy (Weeks 6-8)
   ↓
Phase 3: Super Admin System (Weeks 9-12)
   ↓
Phase 4: Student Progression (Weeks 13-16)
   ↓
Phase 5: Social Features (Weeks 17-20)
   ↓
Phase 6: E-Learning Platform (Weeks 21-24)
```

---

## 📋 Phase 0: Preparation (Week 1)

### Goals
- Complete backup of all data
- Setup staging environment
- Document current system state
- Test rollback procedures

### Step 0.1: Complete Backup

```bash
# 1. Backup PostgreSQL database
pg_dump -h <host> -U <user> -d school_db > backup_$(date +%Y%m%d).sql
gzip backup_$(date +%Y%m%d).sql

# 2. Backup code repository
git archive --format=tar.gz -o backup_code_$(date +%Y%m%d).tar.gz HEAD

# 3. Backup environment variables
cp .env .env.backup
cp api/.env api/.env.backup

# 4. Store backups securely (minimum 3 locations)
# - Local backup drive
# - Cloud storage (S3/Google Cloud/Azure)
# - Offsite backup

# 5. Verify backups are restorable
gunzip -c backup_YYYYMMDD.sql.gz | psql -h localhost -U postgres school_db_test
```

### Step 0.2: Setup Staging Environment

```bash
# 1. Clone production database
pg_dump -h prod-host -U user school_db | \
  psql -h staging-host -U user school_db_staging

# 2. Create migration branch
git checkout -b migration/enterprise-system
git push -u origin migration/enterprise-system

# 3. Update package.json dependencies
cd api
npm install @prisma/client@latest redis ioredis
npm install --save-dev prisma@latest

cd ../
npm install zustand @tanstack/react-query

# 4. Setup Redis (required for multi-tenancy caching)
# macOS:
brew install redis
brew services start redis

# Linux (Ubuntu/Debian):
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis

# Verify Redis is running
redis-cli ping  # Should return "PONG"
```

### Step 0.3: Document Current State

```bash
# 1. Export current database schema
mkdir -p docs/migration/baseline
cd api
npx prisma db pull --schema=../docs/migration/baseline/schema-before.prisma

# 2. Count current records
psql -h localhost -U postgres school_db << 'EOF'
SELECT 'students' as table, count(*) FROM students
UNION ALL SELECT 'teachers', count(*) FROM teachers
UNION ALL SELECT 'classes', count(*) FROM classes
UNION ALL SELECT 'grades', count(*) FROM grades
UNION ALL SELECT 'attendance', count(*) FROM attendance;
EOF

# 3. Take screenshots of current system
# - Login screens
# - Dashboard
# - Grade entry
# - Reports
# (Save in docs/migration/baseline/screenshots/)

# 4. List all API endpoints
grep -r "app\.\(get\|post\|put\|delete\)" api/src/ > docs/migration/baseline/api-endpoints.txt
```

---

## 🔧 Phase 1: Foundation - Multi-Year & Multi-School (Weeks 2-5)

### Goal
Add multi-academic year and multi-school support **without breaking existing functionality**.

### Week 2: Academic Year Support

#### Step 1.1: Add AcademicYear Model

**Update `api/prisma/schema.prisma`:**

```prisma
// NEW: Academic Year Model
model AcademicYear {
  id         String    @id @default(cuid())
  name       String    @unique // "2024-2025", "2025-2026"
  startDate  DateTime  // 2024-11-01
  endDate    DateTime  // 2025-08-31
  isCurrent  Boolean   @default(false) // Only one can be current
  isActive   Boolean   @default(true)
  status     YearStatus @default(PLANNING)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  // Relations (will connect later)
  classes           Class[]
  grades            Grade[]
  attendance        Attendance[]
  studentEnrollments StudentEnrollment[]

  @@index([isCurrent, isActive])
  @@map("academic_years")
}

enum YearStatus {
  PLANNING    // Year is being planned
  ACTIVE      // Year is in progress
  CLOSED      // Year has ended
  ARCHIVED    // Year is archived
}

// NEW: Student Enrollment (track students per year)
model StudentEnrollment {
  id              String       @id @default(cuid())
  studentId       String
  classId         String
  academicYearId  String
  enrollmentDate  DateTime     @default(now())
  status          EnrollmentStatus @default(ACTIVE)

  // Year-end results
  finalGrade      String?      // "PASS", "FAIL", "INCOMPLETE"
  finalAverage    Float?       // Final average for the year
  classRank       Int?         // Rank in class
  promotedToGrade String?      // "GRADE_8", "GRADE_9"
  remarks         String?      // Additional notes

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  // Relations
  student         Student      @relation(fields: [studentId], references: [id], onDelete: Cascade)
  class           Class        @relation(fields: [classId], references: [id])
  academicYear    AcademicYear @relation(fields: [academicYearId], references: [id])

  @@unique([studentId, academicYearId])
  @@index([academicYearId])
  @@index([studentId])
  @@index([classId])
  @@map("student_enrollments")
}

enum EnrollmentStatus {
  ACTIVE
  PROMOTED
  HELD_BACK
  TRANSFERRED
  GRADUATED
  WITHDRAWN
}
```

**Create migration:**

```bash
cd api
npx prisma migrate dev --name add_academic_year_and_enrollment
```

**Seed default academic year:**

```typescript
// api/prisma/seeds/01-academic-year.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating default academic year...');

  // Create 2024-2025 academic year (current)
  const currentYear = await prisma.academicYear.create({
    data: {
      name: '2024-2025',
      startDate: new Date('2024-11-01'),
      endDate: new Date('2025-08-31'),
      isCurrent: true,
      isActive: true,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Created academic year:', currentYear.name);

  // Create enrollments for all existing students
  const students = await prisma.student.findMany({
    include: { class: true },
  });

  console.log(`Creating ${students.length} student enrollments...`);

  for (const student of students) {
    if (student.classId) {
      await prisma.studentEnrollment.create({
        data: {
          studentId: student.id,
          classId: student.classId,
          academicYearId: currentYear.id,
          status: 'ACTIVE',
        },
      });
    }
  }

  console.log('✅ All student enrollments created');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

**Run seed:**

```bash
npx ts-node prisma/seeds/01-academic-year.ts
```

#### Step 1.2: Add API Endpoints for Academic Years

**Create `api/src/controllers/academicYear.controller.ts`:**

```typescript
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/academic-years - List all academic years
export async function listAcademicYears(req: Request, res: Response) {
  try {
    const years = await prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        _count: {
          select: {
            classes: true,
            studentEnrollments: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: years,
    });
  } catch (error) {
    console.error('Error listing academic years:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list academic years',
    });
  }
}

// GET /api/academic-years/current - Get current academic year
export async function getCurrentAcademicYear(req: Request, res: Response) {
  try {
    const year = await prisma.academicYear.findFirst({
      where: { isCurrent: true, isActive: true },
    });

    if (!year) {
      return res.status(404).json({
        success: false,
        message: 'No current academic year found',
      });
    }

    return res.json({
      success: true,
      data: year,
    });
  } catch (error) {
    console.error('Error getting current year:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get current academic year',
    });
  }
}

// POST /api/academic-years - Create new academic year (Admin only)
export async function createAcademicYear(req: Request, res: Response) {
  try {
    const { name, startDate, endDate } = req.body;

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date',
      });
    }

    const year = await prisma.academicYear.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'PLANNING',
        isActive: true,
        isCurrent: false,
      },
    });

    return res.status(201).json({
      success: true,
      data: year,
      message: 'Academic year created successfully',
    });
  } catch (error: any) {
    console.error('Error creating academic year:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Academic year with this name already exists',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create academic year',
    });
  }
}

// PUT /api/academic-years/:id/activate - Set as current year (Admin only)
export async function activateAcademicYear(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Deactivate all other years
    await prisma.academicYear.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    });

    // Activate this year
    const year = await prisma.academicYear.update({
      where: { id },
      data: {
        isCurrent: true,
        isActive: true,
        status: 'ACTIVE',
      },
    });

    return res.json({
      success: true,
      data: year,
      message: `${year.name} is now the current academic year`,
    });
  } catch (error) {
    console.error('Error activating year:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to activate academic year',
    });
  }
}

// POST /api/academic-years/:id/close - Close academic year (Admin only)
export async function closeAcademicYear(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const year = await prisma.academicYear.update({
      where: { id },
      data: {
        status: 'CLOSED',
        isCurrent: false,
      },
    });

    return res.json({
      success: true,
      data: year,
      message: `Academic year ${year.name} has been closed`,
    });
  } catch (error) {
    console.error('Error closing year:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to close academic year',
    });
  }
}
```

**Create routes `api/src/routes/academicYear.routes.ts`:**

```typescript
import express from 'express';
import {
  listAcademicYears,
  getCurrentAcademicYear,
  createAcademicYear,
  activateAcademicYear,
  closeAcademicYear,
} from '../controllers/academicYear.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = express.Router();

// Public/authenticated routes
router.get('/', authenticate, listAcademicYears);
router.get('/current', authenticate, getCurrentAcademicYear);

// Admin-only routes
router.post('/', authenticate, requireRole('ADMIN'), createAcademicYear);
router.put('/:id/activate', authenticate, requireRole('ADMIN'), activateAcademicYear);
router.post('/:id/close', authenticate, requireRole('ADMIN'), closeAcademicYear);

export default router;
```

**Register routes in `api/src/server.ts`:**

```typescript
import academicYearRoutes from './routes/academicYear.routes';

app.use('/api/academic-years', academicYearRoutes);
```

### Week 3: Multi-School Support

#### Step 1.3: Add School Model

**Update `api/prisma/schema.prisma`:**

```prisma
// NEW: School Model (Multi-Tenancy)
model School {
  id                String     @id @default(cuid())
  code              String     @unique // "SCH-PP-001" (Phnom Penh School 001)

  // Basic Information
  name              String     // English name
  nameKh            String     // Khmer name
  nameEn            String?    // Alternative English name

  // Location
  province          String     // Province in Cambodia
  district          String?
  commune           String?
  village           String?
  address           String?

  // Contact
  phone             String?
  email             String?    @unique
  website           String?

  // School Information
  schoolType        SchoolType
  isPublic          Boolean    @default(true)
  principalName     String?
  vicePrincipalName String?
  foundedYear       Int?
  studentCapacity   Int?

  // Branding
  logo              String?    // Logo URL
  primaryColor      String?    // Hex color

  // System Settings
  status            SchoolStatus @default(ACTIVE)
  subscriptionTier  String     @default("FREE") // FREE, BASIC, PREMIUM
  subscriptionExpiry DateTime?
  isActive          Boolean    @default(true)

  // Customization (JSON fields)
  settings          Json?      // School-specific settings
  gradeScale        Json?      // Custom grading scale
  termStructure     Json?      // Terms, semesters

  // Timestamps
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
  activatedAt       DateTime?
  deactivatedAt     DateTime?

  // Relations
  academicYears     AcademicYear[]
  students          Student[]
  teachers          Teacher[]
  classes           Class[]
  subjects          Subject[]
  users             User[]
  grades            Grade[]
  attendance        Attendance[]

  @@index([province, district])
  @@index([status, isActive])
  @@index([code])
  @@map("schools")
}

enum SchoolType {
  PRIMARY         // Grade 1-6
  SECONDARY       // Grade 7-9
  HIGH_SCHOOL     // Grade 10-12
  COMPLETE        // Grade 1-12
}

enum SchoolStatus {
  PLANNING        // School is being setup
  ACTIVE          // School is operational
  SUSPENDED       // Temporarily suspended
  INACTIVE        // Deactivated
}
```

#### Step 1.4: Add schoolId to Existing Models

**Update existing models in `api/prisma/schema.prisma`:**

```prisma
// UPDATE: Student model
model Student {
  // ... existing fields ...
  schoolId  String?  // Nullable for migration

  // Add relation
  school    School?  @relation(fields: [schoolId], references: [id])

  // Add to existing fields
  enrollments StudentEnrollment[]

  @@index([schoolId])
}

// UPDATE: Teacher model
model Teacher {
  // ... existing fields ...
  schoolId  String?
  school    School?  @relation(fields: [schoolId], references: [id])
  @@index([schoolId])
}

// UPDATE: Class model
model Class {
  // ... existing fields ...
  schoolId       String?
  academicYearId String?

  school         School?       @relation(fields: [schoolId], references: [id])
  academicYear   AcademicYear? @relation(fields: [academicYearId], references: [id])
  enrollments    StudentEnrollment[]

  @@index([schoolId])
  @@index([academicYearId])
}

// UPDATE: Subject model
model Subject {
  // ... existing fields ...
  schoolId  String?
  school    School?  @relation(fields: [schoolId], references: [id])
  @@index([schoolId])
}

// UPDATE: User model
model User {
  // ... existing fields ...
  schoolId  String?
  school    School?  @relation(fields: [schoolId], references: [id])
  @@index([schoolId])
}

// UPDATE: Grade model
model Grade {
  // ... existing fields ...
  schoolId       String?
  academicYearId String?

  school         School?       @relation(fields: [schoolId], references: [id])
  academicYear   AcademicYear? @relation(fields: [academicYearId], references: [id])

  @@index([schoolId])
  @@index([academicYearId])
}

// UPDATE: Attendance model
model Attendance {
  // ... existing fields ...
  schoolId       String?
  academicYearId String?

  school         School?       @relation(fields: [schoolId], references: [id])
  academicYear   AcademicYear? @relation(fields: [academicYearId], references: [id])

  @@index([schoolId])
  @@index([academicYearId])
}
```

**Create migration:**

```bash
cd api
npx prisma migrate dev --name add_school_and_tenant_fields
```

#### Step 1.5: Seed Default School

```typescript
// api/prisma/seeds/02-default-school.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating default school...');

  const school = await prisma.school.create({
    data: {
      code: 'SCH-DEFAULT-001',
      name: 'Default School',
      nameKh: 'សាលាលំនាំដើម',
      province: 'Phnom Penh',
      schoolType: 'COMPLETE',
      isPublic: true,
      status: 'ACTIVE',
      isActive: true,
      subscriptionTier: 'FREE',
    },
  });

  console.log('✅ Created school:', school.name);

  // Update all existing records with school ID
  console.log('Updating existing records with school ID...');

  await prisma.$transaction([
    prisma.student.updateMany({
      where: { schoolId: null },
      data: { schoolId: school.id },
    }),
    prisma.teacher.updateMany({
      where: { schoolId: null },
      data: { schoolId: school.id },
    }),
    prisma.class.updateMany({
      where: { schoolId: null },
      data: { schoolId: school.id },
    }),
    prisma.subject.updateMany({
      where: { schoolId: null },
      data: { schoolId: school.id },
    }),
    prisma.user.updateMany({
      where: { schoolId: null },
      data: { schoolId: school.id },
    }),
    prisma.grade.updateMany({
      where: { schoolId: null },
      data: { schoolId: school.id },
    }),
    prisma.attendance.updateMany({
      where: { schoolId: null },
      data: { schoolId: school.id },
    }),
  ]);

  // Also connect classes to current academic year
  const currentYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
  });

  if (currentYear) {
    await prisma.class.updateMany({
      where: { academicYearId: null },
      data: { academicYearId: currentYear.id },
    });

    await prisma.grade.updateMany({
      where: { academicYearId: null },
      data: { academicYearId: currentYear.id },
    });

    await prisma.attendance.updateMany({
      where: { academicYearId: null },
      data: { academicYearId: currentYear.id },
    });
  }

  console.log('✅ All records updated with school and academic year');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

**Run seed:**

```bash
npx ts-node prisma/seeds/02-default-school.ts
```

### Week 4: Multi-Tenant Middleware & APIs

#### Step 1.6: Create Tenant Middleware

**Create `api/src/middleware/tenant.middleware.ts`:**

```typescript
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      schoolId?: string;
      academicYearId?: string;
      school?: any;
      academicYear?: any;
    }
  }
}

/**
 * Tenant Middleware
 * Identifies and attaches school and academic year context to request
 */
export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Get school ID from different sources (in priority order):
    // 1. Custom header (for API calls)
    // 2. User's school (for logged-in users)
    // 3. Subdomain (for future multi-domain support)
    // 4. Default school (fallback)

    let schoolId: string | undefined;

    // 1. Check custom header
    const headerSchoolId = req.headers['x-school-id'] as string;
    if (headerSchoolId) {
      schoolId = headerSchoolId;
    }

    // 2. Check authenticated user's school
    else if (req.user && req.user.schoolId) {
      schoolId = req.user.schoolId;
    }

    // 3. Future: Parse subdomain
    // const subdomain = req.hostname.split('.')[0];
    // school = await prisma.school.findFirst({ where: { subdomain } });

    // 4. Fallback to default school
    else {
      const defaultSchool = await prisma.school.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      schoolId = defaultSchool?.id;
    }

    if (!schoolId) {
      return res.status(500).json({
        success: false,
        message: 'No active school found',
      });
    }

    // Verify school exists and is active
    const school = await prisma.school.findFirst({
      where: {
        id: schoolId,
        isActive: true,
        status: 'ACTIVE',
      },
    });

    if (!school) {
      return res.status(403).json({
        success: false,
        message: 'School not found or inactive',
      });
    }

    // Get current academic year for this school
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        isCurrent: true,
        isActive: true,
      },
    });

    // Attach to request
    req.schoolId = school.id;
    req.school = school;
    req.academicYearId = academicYear?.id;
    req.academicYear = academicYear;

    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to identify school context',
    });
  }
}

/**
 * Require Tenant Middleware
 * Ensures school context is present (stricter than tenantMiddleware)
 */
export function requireTenant(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.schoolId) {
    return res.status(403).json({
      success: false,
      message: 'School context required',
    });
  }
  next();
}
```

**Apply middleware in `api/src/server.ts`:**

```typescript
import { tenantMiddleware } from './middleware/tenant.middleware';
import { authenticate } from './middleware/auth.middleware';

// Apply to all protected routes (after authentication)
app.use('/api', authenticate, tenantMiddleware);

// Routes that don't need tenant context (login, etc.)
app.use('/api/auth/login', authRoutes);
app.use('/api/auth/register', authRoutes);
```

#### Step 1.7: School Management APIs

**Create `api/src/controllers/school.controller.ts`:**

```typescript
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/schools - List schools (Super Admin only)
export async function listSchools(req: Request, res: Response) {
  try {
    const schools = await prisma.school.findMany({
      include: {
        _count: {
          select: {
            students: true,
            teachers: true,
            classes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: schools,
    });
  } catch (error) {
    console.error('Error listing schools:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list schools',
    });
  }
}

// GET /api/school/profile - Get current school profile
export async function getSchoolProfile(req: Request, res: Response) {
  try {
    if (!req.schoolId) {
      return res.status(400).json({
        success: false,
        message: 'School context not found',
      });
    }

    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      include: {
        _count: {
          select: {
            students: true,
            teachers: true,
            classes: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: school,
    });
  } catch (error) {
    console.error('Error getting school profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get school profile',
    });
  }
}

// POST /api/schools - Create new school (Super Admin only)
export async function createSchool(req: Request, res: Response) {
  try {
    const {
      code,
      name,
      nameKh,
      province,
      district,
      address,
      phone,
      email,
      schoolType,
      principalName,
    } = req.body;

    const school = await prisma.school.create({
      data: {
        code,
        name,
        nameKh,
        province,
        district,
        address,
        phone,
        email,
        schoolType,
        principalName,
        status: 'ACTIVE',
        isActive: true,
      },
    });

    return res.status(201).json({
      success: true,
      data: school,
      message: 'School created successfully',
    });
  } catch (error: any) {
    console.error('Error creating school:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'School code or email already exists',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create school',
    });
  }
}

// PUT /api/school/profile - Update current school profile (Admin only)
export async function updateSchoolProfile(req: Request, res: Response) {
  try {
    if (!req.schoolId) {
      return res.status(400).json({
        success: false,
        message: 'School context not found',
      });
    }

    const updates = req.body;

    // Don't allow changing critical fields via this endpoint
    delete updates.id;
    delete updates.code;
    delete updates.subscriptionTier;
    delete updates.status;

    const school = await prisma.school.update({
      where: { id: req.schoolId },
      data: updates,
    });

    return res.json({
      success: true,
      data: school,
      message: 'School profile updated successfully',
    });
  } catch (error) {
    console.error('Error updating school:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update school profile',
    });
  }
}
```

**Create `api/src/routes/school.routes.ts`:**

```typescript
import express from 'express';
import {
  listSchools,
  getSchoolProfile,
  createSchool,
  updateSchoolProfile,
} from '../controllers/school.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = express.Router();

// School Admin routes (current school)
router.get('/profile', authenticate, getSchoolProfile);
router.put('/profile', authenticate, requireRole('ADMIN'), updateSchoolProfile);

// Super Admin routes (all schools)
router.get('/', authenticate, requireRole('SUPER_ADMIN'), listSchools);
router.post('/', authenticate, requireRole('SUPER_ADMIN'), createSchool);

export default router;
```

### Week 5: Update All Controllers for Multi-Tenancy

**Pattern to apply to ALL existing controllers:**

```typescript
// BEFORE (api/src/controllers/student.controller.ts)
export async function getStudents(req: Request, res: Response) {
  const students = await prisma.student.findMany({
    where: { classId: req.query.classId as string },
  });
  return res.json(students);
}

// AFTER (with tenant isolation)
export async function getStudents(req: Request, res: Response) {
  const students = await prisma.student.findMany({
    where: {
      schoolId: req.schoolId, // ✅ Filter by school
      classId: req.query.classId as string,
    },
  });
  return res.json(students);
}
```

**Apply this pattern to:**
- `student.controller.ts` - All student queries
- `teacher.controller.ts` - All teacher queries
- `class.controller.ts` - All class queries
- `grade.controller.ts` - All grade queries
- `attendance.controller.ts` - All attendance queries
- `subject.controller.ts` - All subject queries
- `dashboard.controller.ts` - All dashboard queries

---

## ✅ Phase 1 Complete - Verification

After completing Phase 1:

```bash
# 1. Verify database schema
npx prisma db pull
npx prisma studio  # Visual inspection

# 2. Test existing features still work
npm run dev
# - Login as admin, teacher, student
# - Check dashboard loads
# - Enter grades
# - Mark attendance
# - Generate reports

# 3. Test new features
# - Create new academic year
# - View academic years list
# - Switch academic years
# - View school profile

# 4. Verify data isolation
# - All queries filter by schoolId
# - Cannot access other school's data
# - Academic year properly attached

# 5. Performance check
# - Page load times unchanged
# - Database queries use indexes
# - No N+1 query problems
```

---

## 🏢 Phase 2: Production Multi-Tenancy (Weeks 6-8)

### Goals
- Make multi-tenancy production-ready
- Add complete school onboarding
- Implement proper data isolation
- Add school-specific customization

### Week 6: Enhanced School Features

#### Step 2.1: School Settings & Customization

**Update School model to add settings:**

```prisma
model School {
  // ... existing fields ...

  // Settings (stored as JSON for flexibility)
  settings Json? @default("{}") // School configuration

  // Grading configuration
  gradeScale Json? // { "A": {"min": 85, "max": 100}, "B": {...} }
  passingGrade Float @default(50) // Minimum grade to pass

  // Term/Semester structure
  termStructure Json? // [{"name": "Term 1", "start": "...", "end": "..."}]

  // Attendance rules
  attendanceRules Json? // {"requiredRate": 80, "excusedAbsences": 5}
}
```

#### Step 2.2: School Template System

```prisma
// NEW: School Templates (for quick setup)
model SchoolTemplate {
  id              String    @id @default(cuid())
  name            String    // "Khmer Public School Template"
  description     String?
  type            String    // "SUBJECTS", "CLASSES", "COMPLETE"
  targetGrades    String[]  // ["GRADE_7", "GRADE_8", "GRADE_9"]
  schoolType      SchoolType // PRIMARY, SECONDARY, HIGH_SCHOOL
  data            Json      // Template data structure
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([type, isActive])
  @@map("school_templates")
}
```

#### Step 2.3: School Onboarding Wizard API

```typescript
// POST /api/super-admin/schools/onboard
export async function onboardSchool(req: Request, res: Response) {
  const {
    // Basic info
    code, name, nameKh, province, district,
    email, phone, schoolType,

    // Admin user
    adminName, adminEmail, adminPassword,

    // Template
    templateId,

    // Academic year
    academicYearName, startDate, endDate,
  } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create school
      const school = await tx.school.create({
        data: {
          code, name, nameKh, province, district,
          email, phone, schoolType,
          status: 'ACTIVE',
          isActive: true,
        },
      });

      // 2. Create admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const admin = await tx.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMIN',
          schoolId: school.id,
        },
      });

      // 3. Create academic year
      const academicYear = await tx.academicYear.create({
        data: {
          name: academicYearName,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isCurrent: true,
          isActive: true,
          status: 'ACTIVE',
        },
      });

      // 4. Apply template (if provided)
      if (templateId) {
        const template = await tx.schoolTemplate.findUnique({
          where: { id: templateId },
        });

        if (template && template.data) {
          const templateData = template.data as any;

          // Create subjects from template
          if (templateData.subjects) {
            for (const subject of templateData.subjects) {
              await tx.subject.create({
                data: {
                  ...subject,
                  schoolId: school.id,
                },
              });
            }
          }

          // Create classes from template
          if (templateData.classes) {
            for (const cls of templateData.classes) {
              await tx.class.create({
                data: {
                  ...cls,
                  schoolId: school.id,
                  academicYearId: academicYear.id,
                },
              });
            }
          }
        }
      }

      return { school, admin, academicYear };
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: 'School onboarded successfully',
    });
  } catch (error: any) {
    console.error('Onboarding error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to onboard school',
      error: error.message,
    });
  }
}
```

### Week 7: Data Isolation & Security

#### Step 2.4: Row-Level Security (RLS) Helpers

```typescript
// api/src/utils/tenant-query.ts
import { PrismaClient } from '@prisma/client';

/**
 * Tenant-aware Prisma client
 * Automatically adds schoolId to all queries
 */
export class TenantPrisma {
  constructor(
    private prisma: PrismaClient,
    private schoolId: string
  ) {}

  get student() {
    return {
      findMany: (args: any = {}) =>
        this.prisma.student.findMany({
          ...args,
          where: { ...args.where, schoolId: this.schoolId },
        }),

      findUnique: (args: any) =>
        this.prisma.student.findFirst({
          where: { ...args.where, schoolId: this.schoolId },
        }),

      create: (args: any) =>
        this.prisma.student.create({
          ...args,
          data: { ...args.data, schoolId: this.schoolId },
        }),

      // Add more methods as needed
    };
  }

  // Repeat for teacher, class, etc.
}

// Usage in controllers
export async function getStudents(req: Request, res: Response) {
  const tenantPrisma = new TenantPrisma(prisma, req.schoolId!);
  const students = await tenantPrisma.student.findMany({
    include: { class: true },
  });
  return res.json({ success: true, data: students });
}
```

#### Step 2.5: Security Audit

```typescript
// api/src/middleware/security-audit.middleware.ts
export async function securityAudit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log all data access for auditing
  const audit = {
    userId: req.user?.id,
    schoolId: req.schoolId,
    action: `${req.method} ${req.path}`,
    timestamp: new Date(),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };

  // Log to database or external service
  await prisma.auditLog.create({ data: audit });

  next();
}
```

### Week 8: Testing & Verification

**Create multi-tenant test scenarios:**

```typescript
// tests/multi-tenant.test.ts
describe('Multi-Tenant Isolation', () => {
  it('School A cannot access School B data', async () => {
    // Create two schools
    const schoolA = await createSchool({ code: 'SCH-A' });
    const schoolB = await createSchool({ code: 'SCH-B' });

    // Create student in School A
    const studentA = await createStudent({
      name: 'Student A',
      schoolId: schoolA.id,
    });

    // Try to access from School B context
    const response = await request(app)
      .get(`/api/students/${studentA.id}`)
      .set('x-school-id', schoolB.id)
      .set('Authorization', `Bearer ${schoolBToken}`);

    // Should fail
    expect(response.status).toBe(403);
  });

  it('Academic years are school-specific', async () => {
    // Test year switching per school
  });
});
```

---

## 👑 Phase 3: Super Admin System (Weeks 9-12)

### Goals
- Create Super Admin role and portal
- System-wide school management
- Analytics and monitoring
- Subscription management

### Week 9: Super Admin Foundation

#### Step 3.1: Add Super Admin Role & Models

**Update User model:**

```prisma
model User {
  // ... existing fields ...
  role UserRole @default(TEACHER)

  // Super Admin relation
  superAdminProfile SuperAdmin?
}

enum UserRole {
  STUDENT
  TEACHER
  ADMIN          // School admin
  SUPER_ADMIN    // Platform admin
  SUPPORT        // Support staff
}

// NEW: Super Admin Profile
model SuperAdmin {
  id              String     @id @default(cuid())
  userId          String     @unique
  level           AdminLevel @default(ADMIN)
  department      String?    // "Operations", "Support", "Sales"

  // Permissions
  canCreateSchool Boolean    @default(true)
  canDeleteSchool Boolean    @default(false)
  canViewAllData  Boolean    @default(true)
  canModifyUsers  Boolean    @default(true)
  canViewFinancials Boolean  @default(false)

  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  user            User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("super_admins")
}

enum AdminLevel {
  SUPER_ADMIN    // Full access
  ADMIN          // Standard admin
  SUPPORT        // Support only
  READ_ONLY      // View only
}
```

**Create migration:**

```bash
npx prisma migrate dev --name add_super_admin
```

#### Step 3.2: Super Admin Dashboard APIs

**Create `api/src/controllers/superAdmin.controller.ts`:**

```typescript
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/super-admin/dashboard/stats
export async function getDashboardStats(req: Request, res: Response) {
  try {
    // Get system-wide statistics
    const [
      totalSchools,
      activeSchools,
      totalStudents,
      totalTeachers,
      totalClasses,
    ] = await Promise.all([
      prisma.school.count(),
      prisma.school.count({ where: { status: 'ACTIVE' } }),
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.class.count(),
    ]);

    // Get schools by province
    const schoolsByProvince = await prisma.school.groupBy({
      by: ['province'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Get recent schools
    const recentSchools = await prisma.school.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        name: true,
        province: true,
        status: true,
        createdAt: true,
      },
    });

    // Get subscription distribution
    const subscriptionDistribution = await prisma.school.groupBy({
      by: ['subscriptionTier'],
      _count: { id: true },
    });

    return res.json({
      success: true,
      data: {
        overview: {
          totalSchools,
          activeSchools,
          inactiveSchools: totalSchools - activeSchools,
          totalStudents,
          totalTeachers,
          totalClasses,
        },
        schoolsByProvince,
        recentSchools,
        subscriptionDistribution,
      },
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get dashboard statistics',
    });
  }
}

// GET /api/super-admin/schools - List all schools with stats
export async function listAllSchools(req: Request, res: Response) {
  try {
    const {
      province,
      status,
      schoolType,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const where: any = {};

    if (province) where.province = province;
    if (status) where.status = status;
    if (schoolType) where.schoolType = schoolType;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { nameKh: { contains: search as string } },
        { code: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [schools, total] = await Promise.all([
      prisma.school.findMany({
        where,
        include: {
          _count: {
            select: {
              students: true,
              teachers: true,
              classes: true,
              users: true,
            },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.school.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        schools,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error listing schools:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list schools',
    });
  }
}

// GET /api/super-admin/schools/:id/analytics
export async function getSchoolAnalytics(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            students: true,
            teachers: true,
            classes: true,
            academicYears: true,
          },
        },
      },
    });

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    // Get student enrollment trends
    const enrollmentTrends = await prisma.studentEnrollment.groupBy({
      by: ['academicYearId'],
      where: { student: { schoolId: id } },
      _count: { id: true },
    });

    // Get grade distribution
    const gradeDistribution = await prisma.grade.groupBy({
      by: ['month'],
      where: { schoolId: id },
      _avg: { score: true },
      _count: { id: true },
    });

    // Get attendance rate
    const attendanceStats = await prisma.attendance.aggregate({
      where: { schoolId: id },
      _avg: { isPresent: true },
      _count: { id: true },
    });

    return res.json({
      success: true,
      data: {
        school,
        enrollmentTrends,
        gradeDistribution,
        attendanceRate: attendanceStats._avg.isPresent
          ? (attendanceStats._avg.isPresent * 100).toFixed(2)
          : 0,
      },
    });
  } catch (error) {
    console.error('Error getting school analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get school analytics',
    });
  }
}

// PUT /api/super-admin/schools/:id/status
export async function updateSchoolStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'INACTIVE'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const school = await prisma.school.update({
      where: { id },
      data: {
        status,
        isActive: status === 'ACTIVE',
        deactivatedAt: status !== 'ACTIVE' ? new Date() : null,
      },
    });

    return res.json({
      success: true,
      data: school,
      message: `School status updated to ${status}`,
    });
  } catch (error) {
    console.error('Error updating school status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update school status',
    });
  }
}
```

### Week 10: System Settings & Templates

#### Step 3.3: System Settings Model

```prisma
model SystemSettings {
  id          String   @id @default(cuid())
  key         String   @unique  // "subscription.free.maxStudents"
  value       Json                // { "limit": 500 }
  category    String              // "SUBSCRIPTION", "LIMITS", "FEATURES"
  description String?
  isEditable  Boolean  @default(true)
  updatedAt   DateTime @updatedAt
  updatedBy   String?  // User ID who last updated

  @@index([category])
  @@map("system_settings")
}
```

#### Step 3.4: School Templates API

```typescript
// GET /api/super-admin/templates
export async function listTemplates(req: Request, res: Response) {
  const templates = await prisma.schoolTemplate.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  return res.json({ success: true, data: templates });
}

// POST /api/super-admin/templates
export async function createTemplate(req: Request, res: Response) {
  const { name, description, type, targetGrades, schoolType, data } = req.body;

  const template = await prisma.schoolTemplate.create({
    data: {
      name,
      description,
      type,
      targetGrades,
      schoolType,
      data,
    },
  });

  return res.json({
    success: true,
    data: template,
    message: 'Template created successfully',
  });
}

// POST /api/super-admin/schools/:id/apply-template
export async function applyTemplateToSchool(req: Request, res: Response) {
  const { id } = req.params;
  const { templateId } = req.body;

  // Get template
  const template = await prisma.schoolTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    return res.status(404).json({
      success: false,
      message: 'Template not found',
    });
  }

  // Apply template data to school
  const templateData = template.data as any;

  // Create subjects
  if (templateData.subjects) {
    await prisma.subject.createMany({
      data: templateData.subjects.map((s: any) => ({
        ...s,
        schoolId: id,
      })),
      skipDuplicates: true,
    });
  }

  // Create classes
  if (templateData.classes) {
    const currentYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
    });

    await prisma.class.createMany({
      data: templateData.classes.map((c: any) => ({
        ...c,
        schoolId: id,
        academicYearId: currentYear?.id,
      })),
      skipDuplicates: true,
    });
  }

  return res.json({
    success: true,
    message: 'Template applied successfully',
  });
}
```

### Week 11: Audit Logging

#### Step 3.5: Enhanced Audit Log

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  userId      String
  schoolId    String?
  action      String   // "CREATE_SCHOOL", "UPDATE_USER", "DELETE_STUDENT"
  entityType  String   // "School", "Student", "Grade"
  entityId    String?
  changes     Json?    // { before: {...}, after: {...} }
  ipAddress   String?
  userAgent   String?
  timestamp   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])
  school      School?  @relation(fields: [schoolId], references: [id])

  @@index([userId, timestamp])
  @@index([schoolId, timestamp])
  @@index([action, timestamp])
  @@index([entityType, entityId])
  @@map("audit_logs")
}
```

**Audit middleware:**

```typescript
// api/src/middleware/audit.middleware.ts
export function auditLog(action: string, entityType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Capture original data before modification
    const originalJson = res.json;

    res.json = function (data: any) {
      // Log the action
      prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          schoolId: req.schoolId,
          action,
          entityType,
          entityId: req.params.id || data?.data?.id,
          changes: {
            request: req.body,
            response: data,
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      }).catch(console.error);

      return originalJson.call(this, data);
    };

    next();
  };
}

// Usage
router.post(
  '/schools',
  authenticate,
  requireRole('SUPER_ADMIN'),
  auditLog('CREATE_SCHOOL', 'School'),
  createSchool
);
```

### Week 12: Super Admin Portal UI

#### Step 3.6: Frontend Components

**Create Super Admin Layout:**

```typescript
// src/layouts/SuperAdminLayout.tsx
import { Sidebar, Header } from '@/components/super-admin';

export function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Super Admin Dashboard:**

```typescript
// src/pages/super-admin/Dashboard.tsx
import { useQuery } from '@tanstack/react-query';
import { Card, Chart } from '@/components/ui';

export function SuperAdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['super-admin', 'dashboard', 'stats'],
    queryFn: () => fetch('/api/super-admin/dashboard/stats').then(r => r.json()),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">System Dashboard</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <h3>Total Schools</h3>
          <p className="text-3xl font-bold">{stats?.data.overview.totalSchools}</p>
        </Card>
        <Card>
          <h3>Active Schools</h3>
          <p className="text-3xl font-bold">{stats?.data.overview.activeSchools}</p>
        </Card>
        <Card>
          <h3>Total Students</h3>
          <p className="text-3xl font-bold">{stats?.data.overview.totalStudents}</p>
        </Card>
        <Card>
          <h3>Total Teachers</h3>
          <p className="text-3xl font-bold">{stats?.data.overview.totalTeachers}</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="mb-4">Schools by Province</h3>
          <Chart type="bar" data={stats?.data.schoolsByProvince} />
        </Card>
        <Card>
          <h3 className="mb-4">Subscription Distribution</h3>
          <Chart type="pie" data={stats?.data.subscriptionDistribution} />
        </Card>
      </div>

      {/* Recent Schools */}
      <Card>
        <h3 className="mb-4">Recently Added Schools</h3>
        <SchoolsTable schools={stats?.data.recentSchools} />
      </Card>
    </div>
  );
}
```

---

## 🎓 Phase 4: Student Progression System (Weeks 13-16)

### Goals
- Automated year-end closing
- Student promotion between grades
- Historical data management
- Transcript generation

### Week 13: Year-End Closing

#### Step 4.1: Academic Year Closing Logic

```typescript
// api/src/services/yearEnd.service.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class YearEndService {
  /**
   * Close academic year and calculate final results
   */
  async closeAcademicYear(academicYearId: string) {
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId },
    });

    if (!academicYear) {
      throw new Error('Academic year not found');
    }

    if (academicYear.status === 'CLOSED') {
      throw new Error('Academic year is already closed');
    }

    // Process all student enrollments
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { academicYearId },
      include: {
        student: true,
        class: true,
      },
    });

    console.log(`Processing ${enrollments.length} student enrollments...`);

    for (const enrollment of enrollments) {
      // Calculate final average for this student
      const grades = await prisma.grade.findMany({
        where: {
          studentId: enrollment.studentId,
          academicYearId,
        },
        include: {
          subject: true,
        },
      });

      if (grades.length === 0) continue;

      // Calculate weighted average based on subject coefficients
      let totalWeightedScore = 0;
      let totalCoefficients = 0;

      for (const grade of grades) {
        const coefficient = grade.subject.coefficient || 1;
        totalWeightedScore += grade.score * coefficient;
        totalCoefficients += coefficient;
      }

      const finalAverage =
        totalCoefficients > 0 ? totalWeightedScore / totalCoefficients : 0;

      // Determine pass/fail (passing grade is 50 by default)
      const school = await prisma.school.findUnique({
        where: { id: enrollment.student.schoolId! },
      });
      const passingGrade = (school?.passingGrade as number) || 50;
      const finalGrade = finalAverage >= passingGrade ? 'PASS' : 'FAIL';

      // Determine promoted grade
      let promotedToGrade: string | null = null;
      if (finalGrade === 'PASS') {
        const currentGrade = enrollment.class.grade;
        const gradeNumber = parseInt(currentGrade);
        if (!isNaN(gradeNumber) && gradeNumber < 12) {
          promotedToGrade = `GRADE_${gradeNumber + 1}`;
        }
      }

      // Calculate class rank
      const classEnrollments = await prisma.studentEnrollment.findMany({
        where: {
          classId: enrollment.classId,
          academicYearId,
        },
        include: {
          student: true,
        },
      });

      // Calculate averages for all students and rank
      const averages = await Promise.all(
        classEnrollments.map(async (e) => {
          const studentGrades = await prisma.grade.findMany({
            where: {
              studentId: e.studentId,
              academicYearId,
            },
            include: { subject: true },
          });

          let total = 0;
          let coeffs = 0;
          for (const g of studentGrades) {
            const coeff = g.subject.coefficient || 1;
            total += g.score * coeff;
            coeffs += coeff;
          }
          return { enrollmentId: e.id, average: coeffs > 0 ? total / coeffs : 0 };
        })
      );

      averages.sort((a, b) => b.average - a.average);
      const classRank =
        averages.findIndex((a) => a.enrollmentId === enrollment.id) + 1;

      // Update enrollment with final results
      await prisma.studentEnrollment.update({
        where: { id: enrollment.id },
        data: {
          finalAverage,
          finalGrade,
          promotedToGrade,
          classRank,
          status: finalGrade === 'PASS' ? 'PROMOTED' : 'HELD_BACK',
        },
      });
    }

    // Close the academic year
    await prisma.academicYear.update({
      where: { id: academicYearId },
      data: {
        status: 'CLOSED',
        isCurrent: false,
      },
    });

    console.log(`✅ Academic year ${academicYear.name} closed successfully`);

    return {
      success: true,
      message: `Academic year ${academicYear.name} closed`,
      processedEnrollments: enrollments.length,
    };
  }
}
```

#### Step 4.2: Year-End Closing API

```typescript
// POST /api/academic-years/:id/close
export async function closeAcademicYear(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const yearEndService = new YearEndService();
    const result = await yearEndService.closeAcademicYear(id);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error closing academic year:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to close academic year',
    });
  }
}
```

### Week 14: Student Promotion

#### Step 4.3: Student Promotion Service

```typescript
// api/src/services/promotion.service.ts
export class StudentPromotionService {
  /**
   * Promote students to next academic year
   */
  async promoteStudents(options: {
    sourceYearId: string;
    targetYearId: string;
    schoolId: string;
    rules?: PromotionRules;
  }) {
    const { sourceYearId, targetYearId, schoolId, rules } = options;

    // Get all students who passed in source year
    const passedEnrollments = await prisma.studentEnrollment.findMany({
      where: {
        academicYearId: sourceYearId,
        finalGrade: 'PASS',
        status: 'PROMOTED',
        student: { schoolId },
      },
      include: {
        student: true,
        class: true,
      },
    });

    console.log(`Promoting ${passedEnrollments.length} students...`);

    const results = {
      promoted: 0,
      held: 0,
      errors: [] as any[],
    };

    for (const enrollment of passedEnrollments) {
      try {
        // Determine target grade
        const targetGrade = enrollment.promotedToGrade || this.calculateNextGrade(enrollment.class.grade);

        // Find or create appropriate class in target year
        let targetClass = await prisma.class.findFirst({
          where: {
            schoolId,
            academicYearId: targetYearId,
            grade: targetGrade,
            // Optional: try to keep students in same section
            section: enrollment.class.section,
          },
        });

        // If no matching class, find any class for that grade
        if (!targetClass) {
          targetClass = await prisma.class.findFirst({
            where: {
              schoolId,
              academicYearId: targetYearId,
              grade: targetGrade,
            },
          });
        }

        if (!targetClass) {
          results.errors.push({
            studentId: enrollment.studentId,
            error: `No class found for grade ${targetGrade}`,
          });
          continue;
        }

        // Create enrollment in new year
        await prisma.studentEnrollment.create({
          data: {
            studentId: enrollment.studentId,
            classId: targetClass.id,
            academicYearId: targetYearId,
            status: 'ACTIVE',
          },
        });

        // Update student's current class
        await prisma.student.update({
          where: { id: enrollment.studentId },
          data: { classId: targetClass.id },
        });

        results.promoted++;
      } catch (error: any) {
        results.errors.push({
          studentId: enrollment.studentId,
          error: error.message,
        });
      }
    }

    return results;
  }

  private calculateNextGrade(currentGrade: string): string {
    const gradeNumber = parseInt(currentGrade);
    if (!isNaN(gradeNumber) && gradeNumber < 12) {
      return `${gradeNumber + 1}`;
    }
    return currentGrade; // Fallback
  }

  /**
   * Manually promote/hold specific students
   */
  async manualPromotion(options: {
    enrollmentId: string;
    targetClassId: string;
    targetYearId: string;
    action: 'PROMOTE' | 'HOLD';
  }) {
    const { enrollmentId, targetClassId, targetYearId, action } = options;

    const enrollment = await prisma.studentEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { student: true, class: true },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (action === 'PROMOTE') {
      // Create enrollment in target year
      await prisma.studentEnrollment.create({
        data: {
          studentId: enrollment.studentId,
          classId: targetClassId,
          academicYearId: targetYearId,
          status: 'ACTIVE',
        },
      });

      // Update current enrollment
      await prisma.studentEnrollment.update({
        where: { id: enrollmentId },
        data: { status: 'PROMOTED' },
      });

      // Update student's current class
      await prisma.student.update({
        where: { id: enrollment.studentId },
        data: { classId: targetClassId },
      });
    } else if (action === 'HOLD') {
      // Create enrollment in same grade, new year
      const sameGradeClass = await prisma.class.findFirst({
        where: {
          grade: enrollment.class.grade,
          academicYearId: targetYearId,
          schoolId: enrollment.student.schoolId!,
        },
      });

      if (sameGradeClass) {
        await prisma.studentEnrollment.create({
          data: {
            studentId: enrollment.studentId,
            classId: sameGradeClass.id,
            academicYearId: targetYearId,
            status: 'HELD_BACK',
          },
        });
      }
    }

    return { success: true };
  }
}

interface PromotionRules {
  minimumAverage?: number;
  requiredSubjects?: string[];
  allowManualOverride?: boolean;
}
```

#### Step 4.4: Promotion APIs

```typescript
// POST /api/student-progression/promote
export async function promoteStudents(req: Request, res: Response) {
  try {
    const { sourceYearId, targetYearId, rules } = req.body;

    const promotionService = new StudentPromotionService();
    const results = await promotionService.promoteStudents({
      sourceYearId,
      targetYearId,
      schoolId: req.schoolId!,
      rules,
    });

    return res.json({
      success: true,
      data: results,
      message: `Promoted ${results.promoted} students successfully`,
    });
  } catch (error: any) {
    console.error('Promotion error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to promote students',
    });
  }
}

// POST /api/student-progression/manual
export async function manualPromotion(req: Request, res: Response) {
  try {
    const { enrollmentId, targetClassId, targetYearId, action } = req.body;

    const promotionService = new StudentPromotionService();
    await promotionService.manualPromotion({
      enrollmentId,
      targetClassId,
      targetYearId,
      action,
    });

    return res.json({
      success: true,
      message: `Student ${action.toLowerCase()}d successfully`,
    });
  } catch (error: any) {
    console.error('Manual promotion error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process manual promotion',
    });
  }
}
```

### Week 15: Historical Data & Transcripts

#### Step 4.5: Student History API

```typescript
// GET /api/students/:id/history
export async function getStudentHistory(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            class: true,
            academicYear: true,
          },
          orderBy: {
            academicYear: { startDate: 'asc' },
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Get grades for each year
    const historyWithGrades = await Promise.all(
      student.enrollments.map(async (enrollment) => {
        const grades = await prisma.grade.findMany({
          where: {
            studentId: id,
            academicYearId: enrollment.academicYearId,
          },
          include: {
            subject: true,
          },
        });

        return {
          ...enrollment,
          grades,
        };
      })
    );

    return res.json({
      success: true,
      data: {
        student,
        history: historyWithGrades,
      },
    });
  } catch (error) {
    console.error('Error getting student history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get student history',
    });
  }
}

// GET /api/students/:id/transcript
export async function generateTranscript(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        school: true,
        enrollments: {
          include: {
            class: true,
            academicYear: true,
          },
          orderBy: {
            academicYear: { startDate: 'asc' },
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Build complete academic transcript
    const transcript = {
      student: {
        id: student.id,
        studentId: student.studentId,
        khmerName: student.khmerName,
        englishName: student.englishName,
        dateOfBirth: student.dateOfBirth,
      },
      school: {
        name: student.school?.name,
        nameKh: student.school?.nameKh,
      },
      academicRecords: [] as any[],
    };

    for (const enrollment of student.enrollments) {
      const grades = await prisma.grade.findMany({
        where: {
          studentId: id,
          academicYearId: enrollment.academicYearId,
        },
        include: {
          subject: true,
        },
      });

      transcript.academicRecords.push({
        academicYear: enrollment.academicYear.name,
        class: `${enrollment.class.grade}${enrollment.class.section}`,
        grades: grades.map((g) => ({
          subject: g.subject.nameKh,
          subjectCode: g.subject.code,
          score: g.score,
          maxScore: g.subject.maxScore,
          percentage: ((g.score / g.subject.maxScore) * 100).toFixed(2),
        })),
        finalAverage: enrollment.finalAverage,
        finalGrade: enrollment.finalGrade,
        classRank: enrollment.classRank,
        remarks: enrollment.remarks,
      });
    }

    return res.json({
      success: true,
      data: transcript,
    });
  } catch (error) {
    console.error('Error generating transcript:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate transcript',
    });
  }
}
```

### Week 16: Testing & UI

**Promotion Wizard UI:**

```typescript
// src/pages/admin/PromotionWizard.tsx
export function PromotionWizard() {
  const [step, setStep] = useState(1);
  const [sourceYear, setSourceYear] = useState<string>();
  const [targetYear, setTargetYear] = useState<string>();
  const [previewData, setPreviewData] = useState<any>();

  const handlePromote = async () => {
    const response = await fetch('/api/student-progression/promote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceYearId: sourceYear,
        targetYearId: targetYear,
      }),
    });

    const result = await response.json();
    // Show results
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Student Promotion Wizard</h1>

      {step === 1 && (
        <SelectAcademicYears
          onSelect={(source, target) => {
            setSourceYear(source);
            setTargetYear(target);
            setStep(2);
          }}
        />
      )}

      {step === 2 && (
        <ConfigurePromotionRules onNext={() => setStep(3)} />
      )}

      {step === 3 && (
        <PreviewPromotions
          sourceYear={sourceYear}
          targetYear={targetYear}
          onConfirm={handlePromote}
        />
      )}
    </div>
  );
}
```

---

## ✅ Complete System Verification

After all phases are complete:

### Verification Checklist

```bash
# 1. Database Integrity
✅ All tables have schoolId
✅ All historical records have academicYearId
✅ No orphaned records
✅ Foreign keys intact
✅ Indexes created

# 2. Multi-Tenancy
✅ School A cannot access School B data
✅ All queries filter by schoolId
✅ Tenant middleware works correctly
✅ Super admin can access all schools

# 3. Academic Year Management
✅ Can create new academic years
✅ Can switch between years
✅ Historical data preserved
✅ Year-end closing works
✅ Student progression works

# 4. Super Admin
✅ Dashboard shows system stats
✅ Can create/manage schools
✅ Can view school analytics
✅ Audit logs working
✅ Templates working

# 5. Student Progression
✅ Year-end closing calculates finals
✅ Automated promotion works
✅ Manual promotion works
✅ Student history accessible
✅ Transcripts generate correctly

# 6. Performance
✅ Page load times < 2s
✅ API responses < 500ms
✅ Database queries optimized
✅ No N+1 queries
✅ Proper caching

# 7. Security
✅ Row-level security enforced
✅ Role-based access control works
✅ Audit logs capture all actions
✅ Sensitive data protected
✅ API authentication required
```

---

## 📊 Summary

### What We've Built

**Phase 1 (Weeks 2-5)**: Foundation
- ✅ Academic year support
- ✅ Multi-school support
- ✅ Student enrollment tracking
- ✅ Tenant middleware
- ✅ All existing features preserved

**Phase 2 (Weeks 6-8)**: Production Multi-Tenancy
- ✅ School onboarding
- ✅ School templates
- ✅ Enhanced data isolation
- ✅ School customization

**Phase 3 (Weeks 9-12)**: Super Admin
- ✅ Super admin role
- ✅ System dashboard
- ✅ School management
- ✅ Analytics & reporting
- ✅ Audit logging

**Phase 4 (Weeks 13-16)**: Student Progression
- ✅ Year-end closing
- ✅ Automated promotion
- ✅ Manual adjustments
- ✅ Historical data access
- ✅ Transcript generation

### Next Phases

**Phase 5 (Weeks 17-20)**: Social Features
- Posts, comments, feed
- Messaging system
- User profiles
- Groups & events

**Phase 6 (Weeks 21-24)**: E-Learning
- Course management
- Lessons & assignments
- Quizzes & tests
- Live classes

---

**Document Version**: 2.0
**Last Updated**: January 18, 2026
**Status**: Complete Enterprise Migration Guide
**Estimated Total Duration**: 16 weeks for Phases 1-4
