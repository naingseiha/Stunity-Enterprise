# 🏢 Multi-Tenant Architecture & Data Isolation

## 📖 Overview

This document defines the **core architectural principles** for building a secure, scalable multi-tenant, multi-year school management platform where multiple schools operate independently with complete data isolation.

**Version**: 1.0  
**Status**: 🔥 CRITICAL - Foundation Architecture  
**Priority**: HIGHEST

---

## 🎯 Architecture Principles

### Core Requirements

```
┌─────────────────────────────────────────────────────────┐
│                   MULTI-TENANT SYSTEM                   │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  School A    │  │  School B    │  │  School C    │ │
│  │              │  │              │  │              │ │
│  │ • Users      │  │ • Users      │  │ • Users      │ │
│  │ • Classes    │  │ • Classes    │  │ • Classes    │ │
│  │ • Grades     │  │ • Grades     │  │ • Grades     │ │
│  │ • Data       │  │ • Data       │  │ • Data       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                 │                 │          │
│         └─────────────────┴─────────────────┘          │
│                           │                            │
│                  COMPLETE ISOLATION                    │
│            No Cross-School Data Access                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🏫 1. Multi-Tenant (Multiple Schools)

### Overview

Every school operates as an **independent tenant** with complete data isolation. Schools share the same application infrastructure but have **zero visibility** into other schools' data.

### 1.1 Database Design

#### Every Model MUST Have `schoolId`

```prisma
model User {
  id              String   @id @default(cuid())
  schoolId        String   // ← REQUIRED: Tenant isolation
  email           String
  name            String
  role            Role
  
  school          School   @relation(fields: [schoolId], references: [id])
  
  @@unique([schoolId, email])  // Email unique per school
  @@index([schoolId])           // Fast tenant queries
}

model Class {
  id              String   @id @default(cuid())
  schoolId        String   // ← REQUIRED: Tenant isolation
  academicYearId  String   // ← REQUIRED: Year isolation
  name            String
  grade           Int
  
  school          School       @relation(fields: [schoolId], references: [id])
  academicYear    AcademicYear @relation(fields: [academicYearId], references: [id])
  
  @@unique([schoolId, academicYearId, name])
  @@index([schoolId, academicYearId])
}

model Grade {
  id              String   @id @default(cuid())
  schoolId        String   // ← REQUIRED: Tenant isolation
  studentId       String
  subjectId       String
  monthlyScore    Float?
  semesterScore   Float?
  
  school          School   @relation(fields: [schoolId], references: [id])
  
  @@index([schoolId, studentId])
  @@index([schoolId, subjectId])
}
```

#### Critical Rules

✅ **MUST DO:**
- Every model (except `School`) MUST have `schoolId`
- Every query MUST filter by `schoolId`
- Every create operation MUST include `schoolId`
- Every update/delete MUST verify `schoolId` matches

❌ **NEVER DO:**
- Query without `schoolId` filter
- Allow cross-school data access
- Trust client-provided `schoolId` (use JWT)
- Expose other schools' data in any API

### 1.2 Query Patterns

#### ✅ Correct: School-Scoped Queries

```typescript
// Get students for current school ONLY
const students = await prisma.user.findMany({
  where: {
    schoolId: req.schoolId,  // From JWT token
    role: 'STUDENT'
  }
});

// Get class with school verification
const classData = await prisma.class.findFirst({
  where: {
    id: classId,
    schoolId: req.schoolId  // CRITICAL: Prevent cross-school access
  }
});

// Create with school context
const newStudent = await prisma.user.create({
  data: {
    schoolId: req.schoolId,  // From authenticated context
    email: 'student@example.com',
    name: 'Student Name',
    role: 'STUDENT'
  }
});
```

#### ❌ Wrong: Unscoped Queries (SECURITY RISK)

```typescript
// DANGER: Returns data from ALL schools
const students = await prisma.user.findMany({
  where: { role: 'STUDENT' }  // ❌ Missing schoolId filter
});

// DANGER: Can access other schools' classes
const classData = await prisma.class.findUnique({
  where: { id: classId }  // ❌ No school verification
});

// DANGER: Can modify other schools' data
await prisma.user.update({
  where: { id: userId },  // ❌ No schoolId check
  data: { name: 'New Name' }
});
```

### 1.3 Row-Level Security Helper

```typescript
// lib/tenant-security.ts

/**
 * Ensures all queries are school-scoped
 */
export class TenantSecurity {
  /**
   * Wrap Prisma query to enforce school isolation
   */
  static scopeToSchool<T>(schoolId: string, query: any): any {
    if (!schoolId) {
      throw new Error('School context is required');
    }
    
    return {
      ...query,
      where: {
        ...query?.where,
        schoolId  // Always add school filter
      }
    };
  }
  
  /**
   * Verify resource belongs to school before access
   */
  static async verifySchoolOwnership(
    prisma: PrismaClient,
    model: string,
    resourceId: string,
    schoolId: string
  ): Promise<boolean> {
    const resource = await (prisma as any)[model].findUnique({
      where: { id: resourceId },
      select: { schoolId: true }
    });
    
    if (!resource) {
      throw new Error('Resource not found');
    }
    
    if (resource.schoolId !== schoolId) {
      throw new Error('Access denied: Resource belongs to different school');
    }
    
    return true;
  }
}

// Usage in API routes
export async function GET(req: NextRequest) {
  const schoolId = req.schoolId; // From middleware
  
  // Safe: Automatically school-scoped
  const students = await prisma.user.findMany(
    TenantSecurity.scopeToSchool(schoolId, {
      where: { role: 'STUDENT' }
    })
  );
  
  return Response.json(students);
}
```

### 1.4 Super Admin Access

Super admins can manage **all schools** but must explicitly specify which school to operate on.

```typescript
interface JWTPayload {
  userId: string;
  role: 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'STUDENT';
  schoolId?: string;  // Optional for super admin
  superAdmin?: boolean;
}

// Middleware handles super admin context
export function withSchoolContext(handler: Function) {
  return async (req: NextRequest) => {
    const token = getTokenFromRequest(req);
    const payload = verifyJWT(token);
    
    if (payload.superAdmin) {
      // Super admin MUST specify target school in query/body
      const targetSchoolId = 
        req.nextUrl.searchParams.get('schoolId') || 
        req.body?.schoolId;
      
      if (!targetSchoolId) {
        return Response.json(
          { error: 'Super admin must specify schoolId' },
          { status: 400 }
        );
      }
      
      req.schoolId = targetSchoolId;
      req.isSuperAdmin = true;
    } else {
      // Regular users: use their own school
      req.schoolId = payload.schoolId;
      req.isSuperAdmin = false;
    }
    
    return handler(req);
  };
}
```

---

## 📅 2. Multi-Year (Multiple Academic Years)

### Overview

Each school manages **multiple academic years** simultaneously:
- Historical data (past years)
- Current active year
- Future planning (upcoming years)

Students progress through years, and data is preserved for historical reporting.

### 2.1 Academic Year Model

```prisma
model AcademicYear {
  id          String    @id @default(cuid())
  schoolId    String    // Each school has its own years
  name        String    // "2024-2025", "2025-2026"
  startDate   DateTime
  endDate     DateTime
  status      YearStatus @default(ACTIVE)
  isCurrent   Boolean   @default(false)  // Only one current per school
  
  school      School    @relation(fields: [schoolId], references: [id])
  classes     Class[]
  grades      Grade[]
  enrollments Enrollment[]
  
  @@unique([schoolId, name])
  @@unique([schoolId, isCurrent])  // Ensure only one current
  @@index([schoolId, status])
}

enum YearStatus {
  PLANNING   // Future year, not started
  ACTIVE     // Currently ongoing
  CLOSED     // Completed, read-only
}
```

### 2.2 Year-Scoped Models

Models tied to specific academic years:

```prisma
model Class {
  id              String   @id @default(cuid())
  schoolId        String
  academicYearId  String   // ← Year context
  name            String
  grade           Int
  section         String?
  
  academicYear    AcademicYear @relation(fields: [academicYearId], references: [id])
  
  @@unique([schoolId, academicYearId, name])
}

model Enrollment {
  id              String   @id @default(cuid())
  schoolId        String
  academicYearId  String   // ← Year context
  studentId       String
  classId         String
  enrollDate      DateTime
  
  academicYear    AcademicYear @relation(fields: [academicYearId], references: [id])
  
  @@unique([schoolId, academicYearId, studentId])  // One enrollment per year
}

model Grade {
  id              String   @id @default(cuid())
  schoolId        String
  academicYearId  String   // ← Year context (optional for current year)
  studentId       String
  subjectId       String
  monthlyScore    Float?
  
  @@index([schoolId, academicYearId, studentId])
}
```

### 2.3 Query Patterns for Multi-Year

#### Get Current Year Data

```typescript
// Get current academic year for school
const currentYear = await prisma.academicYear.findFirst({
  where: {
    schoolId: req.schoolId,
    isCurrent: true
  }
});

// Get classes for current year
const classes = await prisma.class.findMany({
  where: {
    schoolId: req.schoolId,
    academicYearId: currentYear.id
  }
});

// Get student's current enrollment
const enrollment = await prisma.enrollment.findFirst({
  where: {
    schoolId: req.schoolId,
    studentId: studentId,
    academicYearId: currentYear.id
  },
  include: {
    class: true
  }
});
```

#### Get Historical Data

```typescript
// Get student's grades across all years
const gradeHistory = await prisma.grade.findMany({
  where: {
    schoolId: req.schoolId,
    studentId: studentId
  },
  include: {
    academicYear: true,
    subject: true
  },
  orderBy: {
    academicYear: { startDate: 'desc' }
  }
});

// Get student progression
const enrollmentHistory = await prisma.enrollment.findMany({
  where: {
    schoolId: req.schoolId,
    studentId: studentId
  },
  include: {
    academicYear: true,
    class: true
  },
  orderBy: {
    academicYear: { startDate: 'asc' }
  }
});
```

#### Year Transitions

```typescript
/**
 * Close current year and open next year
 */
export async function transitionToNextYear(
  schoolId: string,
  nextYearData: { name: string; startDate: Date; endDate: Date }
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Close current year
    const currentYear = await tx.academicYear.findFirst({
      where: { schoolId, isCurrent: true }
    });
    
    if (currentYear) {
      await tx.academicYear.update({
        where: { id: currentYear.id },
        data: { 
          isCurrent: false,
          status: 'CLOSED'
        }
      });
    }
    
    // 2. Create and activate next year
    const nextYear = await tx.academicYear.create({
      data: {
        schoolId,
        ...nextYearData,
        isCurrent: true,
        status: 'ACTIVE'
      }
    });
    
    // 3. Calculate final grades for closed year
    await calculateFinalGrades(tx, schoolId, currentYear.id);
    
    // 4. Promote students to next grade
    await promoteStudents(tx, schoolId, currentYear.id, nextYear.id);
    
    return nextYear;
  });
}
```

---

## 🔒 3. Data Isolation & Security

### 3.1 Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                     Security Layers                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Layer 1: JWT Token Validation                         │
│  ↓ Extract schoolId from verified JWT                  │
│                                                         │
│  Layer 2: Middleware School Context                    │
│  ↓ Attach schoolId to request object                   │
│                                                         │
│  Layer 3: API Route School Verification                │
│  ↓ Verify req.schoolId is present                      │
│                                                         │
│  Layer 4: Database Query School Filter                 │
│  ↓ Every query filtered by schoolId                    │
│                                                         │
│  Layer 5: Database Indexes                             │
│  ↓ Ensure (schoolId, ...) indexes exist                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 JWT Token Structure

```typescript
interface SchoolJWTPayload {
  userId: string;
  email: string;
  role: 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
  schoolId: string;         // ← CRITICAL: School context
  academicYearId?: string;  // Current academic year context
  superAdmin?: boolean;     // Super admin flag
  permissions?: string[];   // Fine-grained permissions
}

// Token generation
export function generateSchoolToken(user: User, school: School) {
  const payload: SchoolJWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    schoolId: school.id,
    superAdmin: user.role === 'SUPER_ADMIN'
  };
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '7d',
    issuer: 'school-management-system'
  });
}
```

### 3.3 Middleware Implementation

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  try {
    const payload = verifyJWT(token);
    
    // Attach school context to headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-school-id', payload.schoolId);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-role', payload.role);
    
    if (payload.superAdmin) {
      requestHeaders.set('x-super-admin', 'true');
    }
    
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*']
};
```

### 3.4 API Route Guards

```typescript
// lib/api-guards.ts

export function requireSchoolContext(req: NextRequest): string {
  const schoolId = req.headers.get('x-school-id');
  
  if (!schoolId) {
    throw new Error('School context is required');
  }
  
  return schoolId;
}

export function requireRole(req: NextRequest, allowedRoles: string[]): void {
  const role = req.headers.get('x-user-role');
  
  if (!role || !allowedRoles.includes(role)) {
    throw new Error('Insufficient permissions');
  }
}

export function isSuperAdmin(req: NextRequest): boolean {
  return req.headers.get('x-super-admin') === 'true';
}

// Usage in API routes
export async function GET(req: NextRequest) {
  const schoolId = requireSchoolContext(req);
  requireRole(req, ['SCHOOL_ADMIN', 'TEACHER']);
  
  // Query is automatically school-scoped
  const students = await prisma.user.findMany({
    where: {
      schoolId,  // From authenticated context
      role: 'STUDENT'
    }
  });
  
  return Response.json(students);
}
```

### 3.5 Database-Level Security

#### PostgreSQL Row-Level Security (RLS)

```sql
-- Enable RLS on all tenant tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Class" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Grade" ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their school's data
CREATE POLICY school_isolation_policy ON "User"
  USING (school_id = current_setting('app.current_school_id')::text);

CREATE POLICY school_isolation_policy ON "Class"
  USING (school_id = current_setting('app.current_school_id')::text);

-- Set school context for each request
SET app.current_school_id = 'school_abc123';
```

#### Prisma Extension for Automatic Filtering

```typescript
// lib/prisma-tenant.ts
import { PrismaClient } from '@prisma/client';

export function createTenantPrisma(schoolId: string) {
  return new PrismaClient().$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, schoolId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, schoolId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...args.data, schoolId };
          return query(args);
        },
        async update({ args, query }) {
          args.where = { ...args.where, schoolId };
          return query(args);
        },
        async delete({ args, query }) {
          args.where = { ...args.where, schoolId };
          return query(args);
        }
      }
    }
  });
}

// Usage
const prisma = createTenantPrisma(req.schoolId);

// All queries are automatically school-scoped
const students = await prisma.user.findMany({
  where: { role: 'STUDENT' }  // schoolId added automatically
});
```

---

## 🚨 Common Security Pitfalls

### ❌ Pitfall 1: Client-Side schoolId

```typescript
// DANGER: Client can fake schoolId
export async function POST(req: NextRequest) {
  const { schoolId, name } = await req.json();  // ❌ NEVER trust client
  
  const student = await prisma.user.create({
    data: { schoolId, name, role: 'STUDENT' }  // ❌ Security breach
  });
}

// ✅ FIX: Use authenticated schoolId
export async function POST(req: NextRequest) {
  const schoolId = req.headers.get('x-school-id');  // ✅ From JWT
  const { name } = await req.json();
  
  const student = await prisma.user.create({
    data: { schoolId, name, role: 'STUDENT' }  // ✅ Safe
  });
}
```

### ❌ Pitfall 2: Unscoped Relations

```typescript
// DANGER: Loading relations without school filter
const student = await prisma.user.findUnique({
  where: { id: studentId },  // ❌ No school check
  include: {
    grades: true  // ❌ Could expose other schools' grades
  }
});

// ✅ FIX: Verify school ownership first
const student = await prisma.user.findFirst({
  where: { 
    id: studentId,
    schoolId: req.schoolId  // ✅ School verification
  },
  include: {
    grades: {
      where: { schoolId: req.schoolId }  // ✅ Explicit filter
    }
  }
});
```

### ❌ Pitfall 3: Aggregate Queries

```typescript
// DANGER: Aggregates across all schools
const totalStudents = await prisma.user.count({
  where: { role: 'STUDENT' }  // ❌ Counts ALL schools
});

// ✅ FIX: School-scoped aggregates
const totalStudents = await prisma.user.count({
  where: { 
    schoolId: req.schoolId,  // ✅ Only current school
    role: 'STUDENT'
  }
});
```

---

## ✅ Implementation Checklist

### Database Schema
- [ ] Every model (except `School`) has `schoolId` field
- [ ] Every model has `@@index([schoolId])` or composite index
- [ ] Academic year models have `academicYearId` field
- [ ] Unique constraints include `schoolId` where appropriate
- [ ] Foreign key constraints reference school-scoped models

### Authentication & Authorization
- [ ] JWT tokens include `schoolId` claim
- [ ] JWT tokens include `role` claim
- [ ] Super admin tokens have special flag
- [ ] Token verification middleware extracts school context
- [ ] API routes validate school context before processing

### API Implementation
- [ ] All queries filtered by `schoolId`
- [ ] All creates include `schoolId` from auth context
- [ ] All updates/deletes verify `schoolId` ownership
- [ ] Relation queries explicitly filter by `schoolId`
- [ ] Aggregate queries scoped to `schoolId`

### Security Testing
- [ ] Test cross-school data access is blocked
- [ ] Test users cannot modify other schools' data
- [ ] Test academic year isolation works correctly
- [ ] Test super admin can access all schools
- [ ] Test JWT tampering is detected

### Performance
- [ ] Database indexes on `schoolId` for all models
- [ ] Composite indexes: `(schoolId, academicYearId, ...)`
- [ ] Query plans verified for school-scoped queries
- [ ] Caching includes school context in keys

---

## 📊 Monitoring & Auditing

### Audit Log Requirements

```typescript
model AuditLog {
  id          String   @id @default(cuid())
  schoolId    String   // ← Track per school
  userId      String
  action      String   // CREATE, UPDATE, DELETE, VIEW
  resource    String   // User, Class, Grade, etc.
  resourceId  String
  changes     Json?    // What changed
  ipAddress   String?
  userAgent   String?
  timestamp   DateTime @default(now())
  
  @@index([schoolId, timestamp])
  @@index([schoolId, userId])
  @@index([schoolId, resource])
}

// Log all sensitive operations
export async function auditLog(
  schoolId: string,
  userId: string,
  action: string,
  resource: string,
  resourceId: string,
  changes?: any
) {
  await prisma.auditLog.create({
    data: {
      schoolId,
      userId,
      action,
      resource,
      resourceId,
      changes
    }
  });
}
```

### Metrics to Track

- **Cross-school access attempts** (should be ZERO)
- **Queries without schoolId filter** (should be ZERO)
- **Failed school ownership verifications**
- **Super admin actions** (for compliance)
- **Academic year transitions**

---

## 🎓 Best Practices

### 1. Always Think Multi-Tenant First
Every feature must consider: "Can this leak data between schools?"

### 2. Default to Deny
If school context is missing, reject the request.

### 3. Explicit Over Implicit
Always explicitly filter by `schoolId`, never rely on implicit context.

### 4. Test Data Isolation
Every feature must have tests proving cross-school access is blocked.

### 5. Audit Everything
Log all cross-school operations by super admins.

---

## 📚 Related Documentation

- **SCHOOL_REGISTRATION_SUBSCRIPTION.md** - School registration & subscriptions
- **MIGRATION_GUIDE.md** - Implementation steps
- **QUICK_START.md** - Developer onboarding
- **DATABASE_SCHEMA_COMPLETE.prisma** - Complete schema reference
- **ARCHITECTURE_OVERVIEW.md** - System architecture

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-18 | Initial documentation |

---

**⚠️ CRITICAL REMINDER**: Data isolation is not optional. Every query MUST be school-scoped. Security of student data depends on it.
