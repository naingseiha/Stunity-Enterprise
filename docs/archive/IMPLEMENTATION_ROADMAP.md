# 🚀 Implementation Roadmap - Multi-Tenant School Management System

## Quick Reference Guide

This document provides a step-by-step implementation guide for developers to upgrade the School Management System to support multi-academic years and multi-tenancy.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: Multi-Academic Year (Weeks 1-6)](#phase-1-multi-academic-year)
3. [Phase 2: Multi-Tenant Architecture (Weeks 7-14)](#phase-2-multi-tenant-architecture)
4. [Phase 3: Super Admin System (Weeks 15-20)](#phase-3-super-admin-system)
5. [Phase 4: Migration Tools (Weeks 21-24)](#phase-4-migration-tools)
6. [Testing Checklist](#testing-checklist)
7. [Deployment Checklist](#deployment-checklist)

---

## Prerequisites

### Development Environment Setup

```bash
# 1. Update dependencies
npm install --save-dev prisma@latest @prisma/client@latest
npm install redis ioredis bull zod

# 2. Install additional tools
npm install @sentry/node pino pino-pretty
npm install -D jest @types/jest supertest

# 3. Setup Redis (for caching)
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt-get install redis-server
sudo systemctl start redis

# 4. Backup current database
pg_dump school_management > backup_before_upgrade.sql
```

### Project Structure Updates

```
SchoolManagementApp/
├── api/
│   ├── prisma/
│   │   ├── schema.prisma (UPDATED)
│   │   ├── migrations/
│   │   └── seeds/
│   │       ├── seed-schools.ts (NEW)
│   │       ├── seed-academic-years.ts (NEW)
│   │       └── seed-templates.ts (NEW)
│   ├── src/
│   │   ├── config/
│   │   │   ├── redis.ts (NEW)
│   │   │   └── tenant.ts (NEW)
│   │   ├── middleware/
│   │   │   ├── tenant.middleware.ts (NEW)
│   │   │   └── academic-year.middleware.ts (NEW)
│   │   ├── services/
│   │   │   ├── academic-year.service.ts (NEW)
│   │   │   ├── school.service.ts (NEW)
│   │   │   ├── student-progression.service.ts (NEW)
│   │   │   └── template.service.ts (NEW)
│   │   ├── controllers/
│   │   │   ├── academic-year.controller.ts (NEW)
│   │   │   ├── school.controller.ts (NEW)
│   │   │   └── super-admin.controller.ts (NEW)
│   │   ├── routes/
│   │   │   ├── academic-year.routes.ts (NEW)
│   │   │   ├── school.routes.ts (NEW)
│   │   │   └── super-admin.routes.ts (NEW)
│   │   └── utils/
│   │       ├── tenant-context.ts (NEW)
│   │       └── prisma-extensions.ts (NEW)
├── src/
│   ├── context/
│   │   ├── AcademicYearContext.tsx (NEW)
│   │   └── SchoolContext.tsx (NEW)
│   ├── components/
│   │   ├── academic-year/
│   │   │   ├── YearSelector.tsx (NEW)
│   │   │   ├── YearTransitionWizard.tsx (NEW)
│   │   │   └── YearManager.tsx (NEW)
│   │   └── super-admin/
│   │       ├── SchoolDashboard.tsx (NEW)
│   │       ├── SchoolOnboarding.tsx (NEW)
│   │       └── TemplateManager.tsx (NEW)
│   └── app/
│       ├── super-admin/ (NEW)
│       │   ├── dashboard/
│       │   ├── schools/
│       │   └── templates/
│       └── admin/
│           └── academic-years/ (NEW)
└── docs/
    ├── ENTERPRISE_UPGRADE_PLAN.md
    ├── DATABASE_SCHEMA_COMPLETE.prisma
    ├── IMPLEMENTATION_ROADMAP.md (this file)
    └── API_DOCUMENTATION.md (NEW)
```

---

## Phase 1: Multi-Academic Year

### Week 1-2: Database Schema & Backend Foundation

#### Step 1.1: Update Prisma Schema

```bash
# 1. Copy new schema
cp docs/DATABASE_SCHEMA_COMPLETE.prisma api/prisma/schema.prisma

# 2. Create migration
cd api
npx prisma migrate dev --name add_academic_year_support

# 3. Generate Prisma Client
npx prisma generate
```

#### Step 1.2: Create Academic Year Service

**File: `api/src/services/academic-year.service.ts`**

```typescript
import { PrismaClient, YearStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class AcademicYearService {
  /**
   * Create new academic year
   */
  async create(schoolId: string, data: {
    name: string;
    startDate: Date;
    endDate: Date;
  }) {
    // Check for overlapping years
    const existing = await prisma.academicYear.findFirst({
      where: {
        schoolId,
        OR: [
          {
            startDate: { lte: data.endDate },
            endDate: { gte: data.startDate }
          }
        ],
        status: { not: YearStatus.ARCHIVED }
      }
    });

    if (existing) {
      throw new Error('Overlapping academic year exists');
    }

    return prisma.academicYear.create({
      data: {
        ...data,
        schoolId,
        status: YearStatus.PLANNING
      }
    });
  }

  /**
   * Get all academic years for a school
   */
  async findAll(schoolId: string) {
    return prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' }
    });
  }

  /**
   * Get current active year
   */
  async getCurrent(schoolId: string) {
    return prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true }
    });
  }

  /**
   * Activate academic year
   */
  async activate(schoolId: string, yearId: string) {
    // Deactivate current year
    await prisma.academicYear.updateMany({
      where: { schoolId, isCurrent: true },
      data: { isCurrent: false }
    });

    // Activate new year
    return prisma.academicYear.update({
      where: { id: yearId },
      data: {
        isCurrent: true,
        isActive: true,
        status: YearStatus.ACTIVE,
        activatedAt: new Date()
      }
    });
  }

  /**
   * Close academic year (year-end)
   */
  async close(schoolId: string, yearId: string) {
    // Calculate statistics
    const stats = await this.calculateYearEndStats(schoolId, yearId);

    // Update year status
    return prisma.academicYear.update({
      where: { id: yearId },
      data: {
        status: YearStatus.CLOSED,
        closedAt: new Date(),
        totalStudents: stats.totalStudents,
        totalTeachers: stats.totalTeachers,
        totalClasses: stats.totalClasses
      }
    });
  }

  /**
   * Calculate year-end statistics
   */
  private async calculateYearEndStats(schoolId: string, yearId: string) {
    const [students, teachers, classes] = await Promise.all([
      prisma.studentEnrollment.count({
        where: { schoolId, academicYearId: yearId }
      }),
      prisma.teacherAssignment.count({
        where: { schoolId, academicYearId: yearId }
      }),
      prisma.class.count({
        where: { schoolId, academicYearId: yearId }
      })
    ]);

    return {
      totalStudents: students,
      totalTeachers: teachers,
      totalClasses: classes
    };
  }
}

export default new AcademicYearService();
```

#### Step 1.3: Create Academic Year Routes & Controller

**File: `api/src/controllers/academic-year.controller.ts`**

```typescript
import { Request, Response } from 'express';
import academicYearService from '../services/academic-year.service';

export class AcademicYearController {
  async create(req: Request, res: Response) {
    try {
      const { schoolId } = req;
      const year = await academicYearService.create(schoolId, req.body);
      res.status(201).json(year);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const { schoolId } = req;
      const years = await academicYearService.findAll(schoolId);
      res.json(years);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getCurrent(req: Request, res: Response) {
    try {
      const { schoolId } = req;
      const year = await academicYearService.getCurrent(schoolId);
      res.json(year);
    } catch (error) {
      res.status(404).json({ error: 'No active academic year found' });
    }
  }

  async activate(req: Request, res: Response) {
    try {
      const { schoolId } = req;
      const { id } = req.params;
      const year = await academicYearService.activate(schoolId, id);
      res.json(year);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async close(req: Request, res: Response) {
    try {
      const { schoolId } = req;
      const { id } = req.params;
      const year = await academicYearService.close(schoolId, id);
      res.json(year);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

export default new AcademicYearController();
```

**File: `api/src/routes/academic-year.routes.ts`**

```typescript
import { Router } from 'express';
import controller from '../controllers/academic-year.controller';
import { authenticate } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/role.middleware';

const router = Router();

router.use(authenticate);

router.post('/', isAdmin, controller.create);
router.get('/', controller.findAll);
router.get('/current', controller.getCurrent);
router.put('/:id/activate', isAdmin, controller.activate);
router.post('/:id/close', isAdmin, controller.close);

export default router;
```

#### Step 1.4: Update Server Routes

**File: `api/src/server.ts`**

```typescript
import academicYearRoutes from './routes/academic-year.routes';

// Add route
app.use('/api/academic-years', academicYearRoutes);
```

### Week 3-4: Frontend Implementation

#### Step 3.1: Create Academic Year Context

**File: `src/context/AcademicYearContext.tsx`**

```typescript
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: string;
}

interface AcademicYearContextType {
  currentYear: AcademicYear | null;
  allYears: AcademicYear[];
  selectedYear: AcademicYear | null;
  setSelectedYear: (year: AcademicYear) => void;
  refreshYears: () => Promise<void>;
  loading: boolean;
}

const AcademicYearContext = createContext<AcademicYearContextType>({
  currentYear: null,
  allYears: [],
  selectedYear: null,
  setSelectedYear: () => {},
  refreshYears: async () => {},
  loading: true
});

export const useAcademicYear = () => useContext(AcademicYearContext);

export function AcademicYearProvider({ children }: { children: React.ReactNode }) {
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [allYears, setAllYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchYears = async () => {
    try {
      const response = await fetch('/api/academic-years', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const years = await response.json();
        setAllYears(years);
        
        const current = years.find((y: AcademicYear) => y.isCurrent);
        setCurrentYear(current || null);
        setSelectedYear(current || years[0] || null);
      }
    } catch (error) {
      console.error('Failed to fetch academic years:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  return (
    <AcademicYearContext.Provider
      value={{
        currentYear,
        allYears,
        selectedYear,
        setSelectedYear,
        refreshYears: fetchYears,
        loading
      }}
    >
      {children}
    </AcademicYearContext.Provider>
  );
}
```

#### Step 3.2: Create Year Selector Component

**File: `src/components/academic-year/YearSelector.tsx`**

```typescript
'use client';

import { useAcademicYear } from '@/context/AcademicYearContext';
import { Calendar } from 'lucide-react';

export default function YearSelector() {
  const { allYears, selectedYear, setSelectedYear, loading } = useAcademicYear();

  if (loading) return <div>Loading...</div>;

  return (
    <div className="relative inline-block">
      <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <select
          value={selectedYear?.id || ''}
          onChange={(e) => {
            const year = allYears.find(y => y.id === e.target.value);
            if (year) setSelectedYear(year);
          }}
          className="bg-transparent border-none outline-none cursor-pointer"
        >
          {allYears.map(year => (
            <option key={year.id} value={year.id}>
              {year.name} {year.isCurrent ? '(Current)' : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

#### Step 3.3: Create Year Management Page

**File: `src/app/admin/academic-years/page.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Plus, Check, X } from 'lucide-react';

export default function AcademicYearsPage() {
  const [years, setYears] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  const fetchYears = async () => {
    const response = await fetch('/api/academic-years');
    if (response.ok) {
      const data = await response.json();
      setYears(data);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  const handleCreate = async (data: any) => {
    const response = await fetch('/api/academic-years', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      fetchYears();
      setShowCreate(false);
    }
  };

  const handleActivate = async (yearId: string) => {
    const response = await fetch(`/api/academic-years/${yearId}/activate`, {
      method: 'PUT'
    });

    if (response.ok) {
      fetchYears();
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Academic Years</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Create New Year
        </button>
      </div>

      <div className="grid gap-4">
        {years.map((year: any) => (
          <div
            key={year.id}
            className="bg-white border rounded-lg p-4 flex justify-between items-center"
          >
            <div>
              <h3 className="font-semibold">{year.name}</h3>
              <p className="text-sm text-gray-500">
                {new Date(year.startDate).toLocaleDateString()} -{' '}
                {new Date(year.endDate).toLocaleDateString()}
              </p>
              <div className="flex gap-2 mt-2">
                {year.isCurrent && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    Current
                  </span>
                )}
                <span className={`text-xs px-2 py-1 rounded ${
                  year.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                  year.status === 'CLOSED' ? 'bg-gray-100 text-gray-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {year.status}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {!year.isCurrent && year.status === 'PLANNING' && (
                <button
                  onClick={() => handleActivate(year.id)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  Activate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal would go here */}
    </div>
  );
}
```

### Week 5-6: Student Enrollment System

#### Step 5.1: Create Student Enrollment Service

**File: `api/src/services/student-enrollment.service.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class StudentEnrollmentService {
  /**
   * Enroll student in a class for academic year
   */
  async enroll(data: {
    schoolId: string;
    studentId: string;
    classId: string;
    academicYearId: string;
  }) {
    return prisma.studentEnrollment.create({
      data: {
        ...data,
        status: 'ACTIVE',
        enrollmentDate: new Date()
      },
      include: {
        student: true,
        class: true,
        academicYear: true
      }
    });
  }

  /**
   * Get student's enrollment history
   */
  async getHistory(schoolId: string, studentId: string) {
    return prisma.studentEnrollment.findMany({
      where: { schoolId, studentId },
      include: {
        class: true,
        academicYear: true
      },
      orderBy: { academicYear: { startDate: 'desc' } }
    });
  }

  /**
   * Get current enrollment
   */
  async getCurrent(schoolId: string, studentId: string) {
    const currentYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true }
    });

    if (!currentYear) return null;

    return prisma.studentEnrollment.findFirst({
      where: {
        schoolId,
        studentId,
        academicYearId: currentYear.id,
        status: 'ACTIVE'
      },
      include: {
        class: true,
        academicYear: true
      }
    });
  }
}

export default new StudentEnrollmentService();
```

---

## Phase 2: Multi-Tenant Architecture

### Week 7-8: Database Migration

#### Step 7.1: Add schoolId to Existing Data

```sql
-- Migration script: add-school-id-to-existing-data.sql

-- 1. Create default school for existing data
INSERT INTO schools (
  id, "schoolId", name, "nameKh", province, address, 
  "schoolType", status, "isActive", "createdAt", "updatedAt"
) VALUES (
  'default-school-001',
  'SCH-PP-001',
  'Default School',
  'សាលាមូលដ្ឋាន',
  'Phnom Penh',
  'Phnom Penh, Cambodia',
  'HIGH_SCHOOL',
  'ACTIVE',
  true,
  NOW(),
  NOW()
);

-- 2. Create default academic year
INSERT INTO academic_years (
  id, "schoolId", name, "startDate", "endDate",
  "isActive", "isCurrent", status, "createdAt", "updatedAt"
) VALUES (
  'default-year-001',
  'default-school-001',
  '2024-2025',
  '2024-09-01',
  '2025-06-30',
  true,
  true,
  'ACTIVE',
  NOW(),
  NOW()
);

-- 3. Update existing records with schoolId
UPDATE students SET "schoolId" = 'default-school-001';
UPDATE teachers SET "schoolId" = 'default-school-001';
UPDATE classes SET "schoolId" = 'default-school-001', "academicYearId" = 'default-year-001';
UPDATE subjects SET "schoolId" = 'default-school-001';
UPDATE grades SET "schoolId" = 'default-school-001', "academicYearId" = 'default-year-001';
UPDATE attendance SET "schoolId" = 'default-school-001', "academicYearId" = 'default-year-001';
UPDATE users SET "schoolId" = 'default-school-001';

-- 4. Create enrollments for existing students
INSERT INTO student_enrollments ("schoolId", "studentId", "classId", "academicYearId", status, "enrollmentDate", "createdAt", "updatedAt")
SELECT 
  'default-school-001',
  id,
  "classId",
  'default-year-001',
  'ACTIVE',
  NOW(),
  NOW(),
  NOW()
FROM students
WHERE "classId" IS NOT NULL;
```

#### Step 7.2: Apply Migration

```bash
cd api

# Create custom migration
npx prisma migrate dev --name add_school_context --create-only

# Edit the migration file to include the SQL above
# Then apply
npx prisma migrate deploy
```

### Week 9-10: Tenant Middleware

#### Step 9.1: Create Tenant Middleware

**File: `api/src/middleware/tenant.middleware.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      schoolId: string;
      school: any;
      academicYearId?: string;
    }
  }
}

/**
 * Tenant context middleware
 * Extracts and validates school context from request
 */
export const tenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get schoolId from various sources
    let schoolId = 
      req.headers['x-school-id'] as string ||
      req.user?.schoolId ||
      req.query.schoolId as string;

    if (!schoolId) {
      return res.status(403).json({
        error: 'School context required',
        message: 'Please provide school identifier'
      });
    }

    // Verify school exists and is active
    const school = await prisma.school.findUnique({
      where: { id: schoolId }
    });

    if (!school) {
      return res.status(404).json({
        error: 'School not found'
      });
    }

    if (!school.isActive) {
      return res.status(403).json({
        error: 'School is not active'
      });
    }

    // Check subscription
    if (school.subscriptionExpiry && new Date(school.subscriptionExpiry) < new Date()) {
      return res.status(403).json({
        error: 'School subscription expired'
      });
    }

    // Attach to request
    req.schoolId = schoolId;
    req.school = school;

    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({
      error: 'Failed to establish school context'
    });
  }
};

/**
 * Academic year context middleware
 */
export const academicYearMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const schoolId = req.schoolId;
    
    // Get academic year from header or use current
    let academicYearId = req.headers['x-academic-year-id'] as string;

    if (!academicYearId) {
      // Get current year
      const currentYear = await prisma.academicYear.findFirst({
        where: {
          schoolId,
          isCurrent: true
        }
      });

      if (currentYear) {
        academicYearId = currentYear.id;
      }
    }

    req.academicYearId = academicYearId;
    next();
  } catch (error) {
    console.error('Academic year middleware error:', error);
    next(); // Continue even if no academic year found
  }
};
```

#### Step 9.2: Create Prisma Extension for Auto-Filtering

**File: `api/src/utils/prisma-extensions.ts`**

```typescript
import { Prisma } from '@prisma/client';

/**
 * Prisma extension for automatic tenant filtering
 */
export function createTenantPrisma(schoolId: string) {
  return prisma.$extends({
    query: {
      // Apply to all models
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, schoolId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, schoolId };
          return query(args);
        },
        async findUnique({ args, query }) {
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
        },
        async count({ args, query }) {
          args.where = { ...args.where, schoolId };
          return query(args);
        },
      },
    },
  });
}
```

#### Step 9.3: Update Server to Use Middleware

**File: `api/src/server.ts`**

```typescript
import { tenantMiddleware, academicYearMiddleware } from './middleware/tenant.middleware';

// Apply tenant middleware to all routes except auth and super-admin
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth') || req.path.startsWith('/super-admin')) {
    return next();
  }
  tenantMiddleware(req, res, next);
});

app.use('/api', academicYearMiddleware);
```

### Week 11-12: Update All Services

#### Step 11.1: Update Services to Use schoolId

Example for StudentService:

```typescript
// Before
async findAll() {
  return prisma.student.findMany();
}

// After
async findAll(schoolId: string) {
  return prisma.student.findMany({
    where: { schoolId }
  });
}
```

Repeat for all services:
- ✅ Student Service
- ✅ Teacher Service
- ✅ Class Service
- ✅ Subject Service
- ✅ Grade Service
- ✅ Attendance Service
- ✅ User Service

---

## Phase 3: Super Admin System

### Week 15-16: Super Admin Backend

#### Step 15.1: Create School Service

**File: `api/src/services/school.service.ts`**

```typescript
import { PrismaClient, SchoolType, SchoolStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class SchoolService {
  /**
   * Register new school
   */
  async create(data: {
    name: string;
    nameKh: string;
    province: string;
    address: string;
    email: string;
    phone?: string;
    schoolType: SchoolType;
  }) {
    // Generate school ID
    const schoolId = await this.generateSchoolId(data.province);

    const school = await prisma.school.create({
      data: {
        ...data,
        schoolId,
        status: SchoolStatus.PENDING
      }
    });

    // Create default academic year
    await this.createDefaultAcademicYear(school.id);

    // Apply default template
    await this.applyDefaultTemplate(school.id, data.schoolType);

    return school;
  }

  /**
   * Generate unique school ID
   */
  private async generateSchoolId(province: string): Promise<string> {
    const provinceCode = this.getProvinceCode(province);
    const count = await prisma.school.count({
      where: { province }
    });
    const number = String(count + 1).padStart(3, '0');
    return `SCH-${provinceCode}-${number}`;
  }

  /**
   * Get province code
   */
  private getProvinceCode(province: string): string {
    const codes: Record<string, string> = {
      'Phnom Penh': 'PP',
      'Siem Reap': 'SR',
      'Battambang': 'BB',
      'Kandal': 'KD',
      // Add more provinces
    };
    return codes[province] || 'XX';
  }

  /**
   * Create default academic year
   */
  private async createDefaultAcademicYear(schoolId: string) {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    return prisma.academicYear.create({
      data: {
        schoolId,
        name: `${currentYear}-${nextYear}`,
        startDate: new Date(`${currentYear}-09-01`),
        endDate: new Date(`${nextYear}-06-30`),
        isCurrent: true,
        isActive: true,
        status: 'ACTIVE'
      }
    });
  }

  /**
   * Apply default template
   */
  private async applyDefaultTemplate(schoolId: string, schoolType: SchoolType) {
    // Get default template
    const template = await prisma.schoolTemplate.findFirst({
      where: {
        isDefault: true,
        targetSchoolType: schoolType
      }
    });

    if (!template) return;

    // Apply template data
    // This would create default subjects, classes, etc.
    // Implementation depends on template structure
  }

  /**
   * List all schools
   */
  async findAll(filters?: {
    province?: string;
    status?: SchoolStatus;
    schoolType?: SchoolType;
  }) {
    return prisma.school.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get school by ID
   */
  async findById(id: string) {
    return prisma.school.findUnique({
      where: { id },
      include: {
        academicYears: true,
        _count: {
          select: {
            students: true,
            teachers: true,
            classes: true
          }
        }
      }
    });
  }

  /**
   * Update school
   */
  async update(id: string, data: Partial<any>) {
    return prisma.school.update({
      where: { id },
      data
    });
  }

  /**
   * Activate school
   */
  async activate(id: string) {
    return prisma.school.update({
      where: { id },
      data: {
        status: SchoolStatus.ACTIVE,
        isActive: true,
        activatedAt: new Date()
      }
    });
  }

  /**
   * Deactivate school
   */
  async deactivate(id: string, reason?: string) {
    return prisma.school.update({
      where: { id },
      data: {
        status: SchoolStatus.INACTIVE,
        isActive: false,
        deactivatedAt: new Date()
      }
    });
  }
}

export default new SchoolService();
```

### Week 17-18: Super Admin Frontend

#### Step 17.1: Create Super Admin Dashboard

**File: `src/app/super-admin/dashboard/page.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { School, Users, BookOpen, TrendingUp } from 'lucide-react';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalSchools: 0,
    activeSchools: 0,
    totalStudents: 0,
    totalTeachers: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const response = await fetch('/api/super-admin/dashboard/stats');
    if (response.ok) {
      const data = await response.json();
      setStats(data);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Super Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<School className="w-6 h-6" />}
          title="Total Schools"
          value={stats.totalSchools}
          subtitle={`${stats.activeSchools} active`}
          color="blue"
        />
        <StatCard
          icon={<Users className="w-6 h-6" />}
          title="Total Students"
          value={stats.totalStudents.toLocaleString()}
          color="green"
        />
        <StatCard
          icon={<BookOpen className="w-6 h-6" />}
          title="Total Teachers"
          value={stats.totalTeachers.toLocaleString()}
          color="purple"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          title="Growth"
          value="+12%"
          subtitle="This month"
          color="orange"
        />
      </div>

      {/* More dashboard content */}
    </div>
  );
}

function StatCard({ icon, title, value, subtitle, color }: any) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className={`w-12 h-12 rounded-lg ${colors[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
```

---

## Phase 4: Migration Tools

### Week 21-22: Student Progression System

**File: `api/src/services/student-progression.service.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class StudentProgressionService {
  /**
   * Promote students to next academic year
   */
  async promoteStudents(config: {
    schoolId: string;
    sourceYearId: string;
    targetYearId: string;
    rules: {
      minimumAverage: number;
      requiredSubjects: string[];
      autoPromote: boolean;
    };
  }) {
    // Get all students from source year
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        schoolId: config.schoolId,
        academicYearId: config.sourceYearId,
        status: 'ACTIVE'
      },
      include: {
        student: true,
        class: true
      }
    });

    const results = {
      promoted: [] as string[],
      retained: [] as string[],
      errors: [] as any[]
    };

    for (const enrollment of enrollments) {
      try {
        // Calculate final average
        const average = await this.calculateFinalAverage(
          config.schoolId,
          config.sourceYearId,
          enrollment.studentId
        );

        // Check promotion criteria
        const shouldPromote = average >= config.rules.minimumAverage;

        if (shouldPromote) {
          // Promote student
          await this.promoteStudent(
            config.schoolId,
            enrollment.studentId,
            config.sourceYearId,
            config.targetYearId,
            enrollment.class.grade
          );
          results.promoted.push(enrollment.studentId);
        } else {
          // Retain student
          await this.retainStudent(
            config.schoolId,
            enrollment.studentId,
            config.sourceYearId,
            config.targetYearId,
            enrollment.classId
          );
          results.retained.push(enrollment.studentId);
        }

        // Create history record
        await this.createHistoryRecord(
          config.schoolId,
          enrollment,
          average,
          shouldPromote ? 'PROMOTED' : 'RETAINED'
        );
      } catch (error) {
        results.errors.push({
          studentId: enrollment.studentId,
          error: error.message
        });
      }
    }

    return results;
  }

  private async calculateFinalAverage(
    schoolId: string,
    academicYearId: string,
    studentId: string
  ) {
    const summary = await prisma.studentMonthlySummary.findFirst({
      where: {
        schoolId,
        academicYearId,
        studentId
      },
      orderBy: { monthNumber: 'desc' }
    });

    return summary?.average || 0;
  }

  private async promoteStudent(
    schoolId: string,
    studentId: string,
    sourceYearId: string,
    targetYearId: string,
    currentGrade: string
  ) {
    // Calculate next grade
    const nextGrade = this.getNextGrade(currentGrade);

    // Find appropriate class in target year
    const targetClass = await prisma.class.findFirst({
      where: {
        schoolId,
        academicYearId: targetYearId,
        grade: nextGrade
      }
    });

    if (!targetClass) {
      throw new Error(`No class found for grade ${nextGrade}`);
    }

    // Close source enrollment
    await prisma.studentEnrollment.updateMany({
      where: {
        schoolId,
        studentId,
        academicYearId: sourceYearId
      },
      data: {
        status: 'COMPLETED',
        promotionStatus: 'PROMOTED',
        promotedToGrade: nextGrade,
        promotionDate: new Date()
      }
    });

    // Create new enrollment
    await prisma.studentEnrollment.create({
      data: {
        schoolId,
        studentId,
        classId: targetClass.id,
        academicYearId: targetYearId,
        status: 'ACTIVE',
        enrollmentType: 'REGULAR'
      }
    });

    // Update student's current class
    await prisma.student.update({
      where: { id: studentId },
      data: {
        classId: targetClass.id,
        currentGrade: nextGrade
      }
    });
  }

  private async retainStudent(
    schoolId: string,
    studentId: string,
    sourceYearId: string,
    targetYearId: string,
    currentClassId: string
  ) {
    // Find same grade class in target year
    const currentClass = await prisma.class.findUnique({
      where: { id: currentClassId }
    });

    const targetClass = await prisma.class.findFirst({
      where: {
        schoolId,
        academicYearId: targetYearId,
        grade: currentClass.grade
      }
    });

    // Close source enrollment
    await prisma.studentEnrollment.updateMany({
      where: {
        schoolId,
        studentId,
        academicYearId: sourceYearId
      },
      data: {
        status: 'COMPLETED',
        promotionStatus: 'RETAINED'
      }
    });

    // Create new enrollment in same grade
    await prisma.studentEnrollment.create({
      data: {
        schoolId,
        studentId,
        classId: targetClass.id,
        academicYearId: targetYearId,
        status: 'ACTIVE'
      }
    });
  }

  private getNextGrade(currentGrade: string): string {
    const gradeMap: Record<string, string> = {
      'GRADE_7': 'GRADE_8',
      'GRADE_8': 'GRADE_9',
      'GRADE_9': 'GRADE_10',
      'GRADE_10': 'GRADE_11',
      'GRADE_11': 'GRADE_12',
      'GRADE_12': 'GRADUATED'
    };

    return gradeMap[currentGrade] || currentGrade;
  }

  private async createHistoryRecord(
    schoolId: string,
    enrollment: any,
    average: number,
    status: string
  ) {
    return prisma.studentHistory.create({
      data: {
        schoolId,
        studentId: enrollment.studentId,
        academicYearId: enrollment.academicYearId,
        classId: enrollment.classId,
        enrollmentId: enrollment.id,
        grade: enrollment.class.grade,
        section: enrollment.class.section,
        finalAverage: average,
        status,
        totalDaysPresent: enrollment.totalDaysPresent || 0,
        totalDaysAbsent: enrollment.totalDaysAbsent || 0,
        totalDaysLate: enrollment.totalDaysLate || 0,
        attendanceRate: enrollment.attendanceRate || 0
      }
    });
  }
}

export default new StudentProgressionService();
```

---

## Testing Checklist

### Unit Tests
- [ ] Academic year service tests
- [ ] Student enrollment tests
- [ ] School service tests
- [ ] Student progression tests
- [ ] Tenant middleware tests

### Integration Tests
- [ ] API endpoint tests
- [ ] Database transaction tests
- [ ] Multi-tenant isolation tests
- [ ] Authentication flow tests

### E2E Tests
- [ ] School onboarding workflow
- [ ] Academic year creation and activation
- [ ] Student enrollment process
- [ ] Year-end transition
- [ ] Multi-school data isolation

---

## Deployment Checklist

### Pre-Deployment
- [ ] Backup production database
- [ ] Test migrations on staging
- [ ] Review security settings
- [ ] Update environment variables
- [ ] Prepare rollback plan

### Deployment Steps
1. [ ] Maintenance mode ON
2. [ ] Backup database
3. [ ] Run migrations
4. [ ] Deploy backend
5. [ ] Deploy frontend
6. [ ] Run smoke tests
7. [ ] Maintenance mode OFF

### Post-Deployment
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify data integrity
- [ ] Test critical workflows
- [ ] Notify stakeholders

---

## Support & Resources

### Documentation
- [Enterprise Upgrade Plan](./ENTERPRISE_UPGRADE_PLAN.md)
- [Database Schema](./DATABASE_SCHEMA_COMPLETE.prisma)
- [API Documentation](./API_DOCUMENTATION.md)

### Contact
- Technical Lead: [Email]
- Project Manager: [Email]
- Support: [Email]

---

**Document Version:** 1.0
**Last Updated:** January 12, 2026
**Status:** Ready for Implementation
