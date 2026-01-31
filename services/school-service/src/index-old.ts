import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient, SubscriptionTier, SchoolType } from '@prisma/client';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import {
  CAMBODIAN_SUBJECTS_HIGH_SCHOOL,
  getCambodianHolidays,
  STANDARD_GRADING_SCALE,
  DEFAULT_EXAM_TYPES,
  DEFAULT_TERMS,
  getSchoolTypeConfig,
} from './utils/default-templates';

dotenv.config();

const app = express();
const PORT = process.env.SCHOOL_SERVICE_PORT || 3002;
const prisma = new PrismaClient();

// Fix BigInt JSON serialization
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// Middleware - CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'school-service',
    port: PORT,
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

// API info endpoint
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    service: 'Stunity Enterprise - School Management Service',
    version: '2.0.0',
    description: 'Self-service school registration and management',
    endpoints: {
      health: '/health',
      register: '/schools/register (POST)',
      getSchool: '/schools/:id (GET)',
      updateSchool: '/schools/:id (PATCH)',
      getSubscription: '/schools/:id/subscription (GET)',
    },
  });
});

// Enhanced School registration endpoint with full onboarding setup
app.post('/schools/register', async (req: Request, res: Response) => {
  try {
    const {
      schoolName,
      email,
      phone,
      address,
      adminFirstName,
      adminLastName,
      adminEmail,
      adminPhone,
      adminPassword,
      trialMonths = 1, // 1 or 3
      schoolType = 'HIGH_SCHOOL', // PRIMARY_SCHOOL, MIDDLE_SCHOOL, HIGH_SCHOOL, COMPLETE_SCHOOL, INTERNATIONAL
    } = req.body;

    // Validation
    if (!schoolName || !email || !adminFirstName || !adminLastName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    if (![1, 3].includes(trialMonths)) {
      return res.status(400).json({
        success: false,
        error: 'Trial months must be 1 or 3',
      });
    }

    // Check if school email already exists
    const existingSchool = await prisma.school.findUnique({
      where: { email },
    });

    if (existingSchool) {
      return res.status(409).json({
        success: false,
        error: 'School email already registered',
      });
    }

    // Generate slug
    const baseSlug = slugify(schoolName, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (await prisma.school.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Determine subscription tier and limits
    const tier = trialMonths === 1 ? SubscriptionTier.FREE_TRIAL_1M : SubscriptionTier.FREE_TRIAL_3M;
    const maxStudents = trialMonths === 1 ? 100 : 300;
    const maxTeachers = trialMonths === 1 ? 10 : 20;
    const maxStorage = trialMonths === 1 ? 1073741824 : 2147483648; // 1GB or 2GB

    // Calculate subscription end date
    const subscriptionStart = new Date();
    const subscriptionEnd = new Date();
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + trialMonths);

    // Hash admin password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Get school type configuration
    const schoolConfig = getSchoolTypeConfig(schoolType);

    console.log(`🏫 Registering new school: ${schoolName} (${schoolType})`);

    // Create school with complete setup in transaction (with extended timeout)
    const result = await prisma.$transaction(async (tx) => {
      // Ensure transaction is fresh
      await tx.$queryRaw`SELECT 1`;
      // 1. Create School
      const school = await tx.school.create({
        data: {
          name: schoolName,
          slug,
          email,
          phone,
          address,
          schoolType: schoolType as SchoolType,
          gradeRange: schoolConfig.grades.length > 0 
            ? `${schoolConfig.grades[0]}-${schoolConfig.grades[schoolConfig.grades.length - 1]}`
            : '7-12',
          workingDays: [1, 2, 3, 4, 5], // Monday to Friday
          subscriptionTier: tier,
          subscriptionStart,
          subscriptionEnd,
          isTrial: true,
          isActive: true,
          maxStudents,
          maxTeachers,
          maxStorage,
          setupCompleted: false,
          onboardingStep: 1, // Just registered
        },
      });

      console.log('✅ School created');

      // 2. Create Academic Year
      const currentYear = new Date().getFullYear();
      const academicYear = await tx.academicYear.create({
        data: {
          schoolId: school.id,
          name: `${currentYear}-${currentYear + 1}`,
          startDate: new Date(`${currentYear}-09-01`), // September start
          endDate: new Date(`${currentYear + 1}-08-31`), // August end
          isCurrent: true,
          status: 'PLANNING',
        },
      });

      console.log('✅ Academic year created');

      // 3. Create Academic Terms (Semesters)
      await tx.academicTerm.createMany({
        data: DEFAULT_TERMS.map(term => ({
          academicYearId: academicYear.id,
          name: term.name,
          termNumber: term.termNumber,
          startDate: new Date(`${currentYear}-${String(term.startMonth).padStart(2, '0')}-${String(term.startDay).padStart(2, '0')}`),
          endDate: term.endMonth <= 8
            ? new Date(`${currentYear + 1}-${String(term.endMonth).padStart(2, '0')}-${String(term.endDay).padStart(2, '0')}`)
            : new Date(`${currentYear}-${String(term.endMonth).padStart(2, '0')}-${String(term.endDay).padStart(2, '0')}`),
        })),
      });

      console.log('✅ Academic terms created (2 semesters)');

      // 4. Create Exam Types
      await tx.examType.createMany({
        data: DEFAULT_EXAM_TYPES.map(exam => ({
          academicYearId: academicYear.id,
          name: exam.name,
          weight: exam.weight,
          maxScore: exam.maxScore,
          order: exam.order,
        })),
      });

      console.log('✅ Exam types created (3 types)');

      // 5. Create Grading Scale
      const gradingScale = await tx.gradingScale.create({
        data: {
          academicYearId: academicYear.id,
          name: 'Standard Grading Scale',
          isDefault: true,
        },
      });

      await tx.gradeRange.createMany({
        data: STANDARD_GRADING_SCALE.map((range, index) => ({
          gradingScaleId: gradingScale.id,
          grade: range.grade,
          minScore: range.minScore,
          maxScore: range.maxScore,
          gpa: range.gpa,
          description: range.description,
          color: range.color,
          order: index,
        })),
      });

      console.log('✅ Grading scale created (A-F, 6 ranges)');

      // 6. Create Academic Calendar
      const calendar = await tx.academicCalendar.create({
        data: {
          academicYearId: academicYear.id,
          name: 'School Calendar',
        },
      });

      // Add Cambodian public holidays
      const holidays = getCambodianHolidays(currentYear);
      await tx.calendarEvent.createMany({
        data: holidays.map(holiday => ({
          calendarId: calendar.id,
          type: holiday.type,
          title: holiday.title,
          startDate: new Date(holiday.date),
          endDate: holiday.endDate ? new Date(holiday.endDate) : new Date(holiday.date),
          isSchoolDay: false,
          isPublic: true,
        })),
      });

      console.log(`✅ Calendar created with ${holidays.length} holidays`);

      // 7. Create Default Subjects
      await tx.subject.createMany({
        data: CAMBODIAN_SUBJECTS_HIGH_SCHOOL.map(subject => ({
          schoolId: school.id,
          name: subject.name,
          nameKh: subject.nameKh,
          code: `${subject.code}-${school.slug}`, // Make code unique per school
          category: subject.category,
          coefficient: subject.coefficient,
          grade: subject.gradeLevel.toString(),
          isActive: true,
        })),
      });

      console.log(`✅ Subjects created (${CAMBODIAN_SUBJECTS_HIGH_SCHOOL.length} subjects)`);

      // 8. Create OnboardingChecklist
      await tx.onboardingChecklist.create({
        data: {
          schoolId: school.id,
          registrationDone: true,
          schoolInfoDone: false,
          calendarDone: true, // Pre-configured
          subjectsDone: true, // Pre-loaded
          teachersAdded: false,
          classesCreated: false,
          studentsAdded: false,
          currentStep: 2, // Move to school info step
          totalSteps: 7,
          completionPercent: 42.86, // 3/7 steps done (registration, calendar, subjects)
        },
      });

      console.log('✅ Onboarding checklist created');

      // 9. Create SchoolSettings
      await tx.schoolSettings.create({
        data: {
          schoolId: school.id,
          defaultAcademicYearStart: '09-01',
          defaultAcademicYearEnd: '08-31',
          defaultTermCount: 2,
          defaultClassCapacity: schoolConfig.defaultClassCapacity,
          defaultSections: schoolConfig.defaultSections,
          passingGrade: 50,
          usesGPA: true,
          emailNotifications: true,
          smsNotifications: false,
        },
      });

      console.log('✅ School settings created');

      // 10. Create Admin User
      const adminUser = await tx.user.create({
        data: {
          schoolId: school.id,
          firstName: adminFirstName,
          lastName: adminLastName,
          email: adminEmail,
          phone: adminPhone,
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true,
          isDefaultPassword: false,
          isSuperAdmin: false,
        },
      });

      console.log('✅ Admin user created');

      return { school, academicYear, adminUser };
    }, {
      maxWait: 20000, // 20 seconds max wait
      timeout: 30000, // 30 seconds timeout
    });

    console.log(`🎉 School registration complete: ${schoolName}`);

    res.status(201).json({
      success: true,
      message: 'School registered successfully with complete setup!',
      data: {
        school: {
          id: result.school.id,
          name: result.school.name,
          slug: result.school.slug,
          email: result.school.email,
          schoolType: schoolType,
          subscriptionTier: result.school.subscriptionTier,
          subscriptionEnd: result.school.subscriptionEnd,
          isTrial: result.school.isTrial,
          setupProgress: {
            currentStep: 2,
            totalSteps: 7,
            completionPercent: 42.86,
            completedSteps: ['registration', 'calendar', 'subjects'],
          },
        },
        admin: {
          id: result.adminUser.id,
          firstName: result.adminUser.firstName,
          lastName: result.adminUser.lastName,
          email: result.adminUser.email,
        },
        academicYear: {
          id: result.academicYear.id,
          name: result.academicYear.name,
          terms: 2,
          examTypes: 3,
          gradingScale: 'Standard (A-F)',
        },
        defaults: {
          subjects: CAMBODIAN_SUBJECTS_HIGH_SCHOOL.length,
          holidays: getCambodianHolidays(new Date().getFullYear()).length,
          gradeRanges: STANDARD_GRADING_SCALE.length,
        },
        nextSteps: {
          onboardingUrl: `/onboarding/${result.school.slug}`,
          dashboard: `/dashboard`,
          setupGuide: `/setup/guide`,
        },
      },
    });
  } catch (error: any) {
    console.error('❌ School registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register school',
      details: error.message,
    });
  }
});

// Get school by ID
app.get('/schools/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        academicYears: {
          where: { isCurrent: true },
        },
        _count: {
          select: {
            users: true,
            academicYears: true,
          },
        },
      },
    });

    if (!school) {
      return res.status(404).json({
        success: false,
        error: 'School not found',
      });
    }

    res.json({
      success: true,
      data: school,
    });
  } catch (error: any) {
    console.error('Get school error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get school',
      details: error.message,
    });
  }
});

// ===========================
// Academic Year Management Endpoints
// ===========================

// Get all academic years for a school
app.get('/schools/:schoolId/academic-years', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;

    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' },
    });

    res.json({
      success: true,
      data: academicYears,
    });
  } catch (error: any) {
    console.error('Get academic years error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get academic years',
      details: error.message,
    });
  }
});

// Get current academic year for a school
app.get('/schools/:schoolId/academic-years/current', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;

    const currentYear = await prisma.academicYear.findFirst({
      where: { 
        schoolId,
        isCurrent: true,
      },
    });

    if (!currentYear) {
      return res.status(404).json({
        success: false,
        error: 'No current academic year found',
      });
    }

    res.json({
      success: true,
      data: currentYear,
    });
  } catch (error: any) {
    console.error('Get current academic year error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current academic year',
      details: error.message,
    });
  }
});

// Create new academic year
app.post('/schools/:schoolId/academic-years', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const { name, startDate, endDate, setAsCurrent } = req.body;

    // Validation
    if (!name || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, startDate, endDate',
      });
    }

    // Check if academic year name already exists for this school
    const existing = await prisma.academicYear.findFirst({
      where: {
        schoolId,
        name,
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Academic year "${name}" already exists for this school`,
      });
    }

    // If setAsCurrent is true, unset other years first
    if (setAsCurrent) {
      await prisma.academicYear.updateMany({
        where: { schoolId },
        data: { isCurrent: false },
      });
    }

    // Create new academic year
    const academicYear = await prisma.academicYear.create({
      data: {
        schoolId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent: setAsCurrent || false,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Academic year created successfully',
      data: academicYear,
    });
  } catch (error: any) {
    console.error('Create academic year error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create academic year',
      details: error.message,
    });
  }
});

// Update academic year
app.put('/schools/:schoolId/academic-years/:id', async (req: Request, res: Response) => {
  try {
    const { schoolId, id } = req.params;
    const { name, startDate, endDate } = req.body;

    // Verify academic year belongs to school
    const existing = await prisma.academicYear.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Academic year not found',
      });
    }

    // Update academic year
    const academicYear = await prisma.academicYear.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
      },
    });

    res.json({
      success: true,
      message: 'Academic year updated successfully',
      data: academicYear,
    });
  } catch (error: any) {
    console.error('Update academic year error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update academic year',
      details: error.message,
    });
  }
});

// Set academic year as current
app.put('/schools/:schoolId/academic-years/:id/set-current', async (req: Request, res: Response) => {
  try {
    const { schoolId, id } = req.params;

    // Verify academic year belongs to school
    const academicYear = await prisma.academicYear.findFirst({
      where: { id, schoolId },
    });

    if (!academicYear) {
      return res.status(404).json({
        success: false,
        error: 'Academic year not found',
      });
    }

    // Unset all other years as current
    await prisma.academicYear.updateMany({
      where: { schoolId },
      data: { isCurrent: false },
    });

    // Set this year as current
    const updatedYear = await prisma.academicYear.update({
      where: { id },
      data: { isCurrent: true },
    });

    res.json({
      success: true,
      message: `Academic year "${updatedYear.name}" set as current`,
      data: updatedYear,
    });
  } catch (error: any) {
    console.error('Set current academic year error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set current academic year',
      details: error.message,
    });
  }
});

// Get single academic year with detailed statistics
app.get('/schools/:schoolId/academic-years/:id', async (req: Request, res: Response) => {
  try {
    const { schoolId, id } = req.params;

    // Get academic year with all related data
    const academicYear = await prisma.academicYear.findFirst({
      where: { id, schoolId },
      include: {
        classes: {
          include: {
            studentClasses: {
              where: { status: 'ACTIVE' },
            },
            _count: {
              select: { studentClasses: true },
            },
          },
          orderBy: [{ grade: 'asc' }, { section: 'asc' }],
        },
        _count: {
          select: { 
            classes: true,
            progressionsTo: true,
          },
        },
      },
    });

    if (!academicYear) {
      return res.status(404).json({
        success: false,
        error: 'Academic year not found',
      });
    }

    // Calculate statistics
    const totalStudents = academicYear.classes.reduce((sum: number, cls: any) => sum + cls._count.studentClasses, 0);
    const totalClasses = academicYear._count.classes;
    const totalPromotions = academicYear._count.progressionsTo;

    // Group students by grade
    const studentsByGrade: Record<number, number> = {};
    academicYear.classes.forEach((cls: any) => {
      if (!studentsByGrade[cls.grade]) {
        studentsByGrade[cls.grade] = 0;
      }
      studentsByGrade[cls.grade] += cls._count.studentClasses;
    });

    // Format class data
    const classes = academicYear.classes.map((cls: any) => ({
      id: cls.id,
      name: cls.name,
      grade: cls.grade,
      section: cls.section,
      track: cls.track,
      capacity: cls.capacity,
      studentCount: cls._count.studentClasses,
      isAtCapacity: cls._count.studentClasses >= cls.capacity,
    }));

    res.json({
      success: true,
      data: {
        id: academicYear.id,
        name: academicYear.name,
        startDate: academicYear.startDate,
        endDate: academicYear.endDate,
        isCurrent: academicYear.isCurrent,
        status: academicYear.status,
        copiedFromYearId: academicYear.copiedFromYearId,
        createdAt: academicYear.createdAt,
        updatedAt: academicYear.updatedAt,
        statistics: {
          totalStudents,
          totalClasses,
          totalPromotions,
          studentsByGrade,
        },
        classes,
      },
    });
  } catch (error: any) {
    console.error('Get academic year detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get academic year details',
      details: error.message,
    });
  }
});

// Delete academic year (only if no classes use it)
app.delete('/schools/:schoolId/academic-years/:id', async (req: Request, res: Response) => {
  try {
    const { schoolId, id } = req.params;

    // Verify academic year belongs to school
    const academicYear = await prisma.academicYear.findFirst({
      where: { id, schoolId },
      include: {
        _count: {
          select: { classes: true },
        },
      },
    });

    if (!academicYear) {
      return res.status(404).json({
        success: false,
        error: 'Academic year not found',
      });
    }

    // Check if there are classes using this academic year
    if (academicYear._count.classes > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete academic year "${academicYear.name}" because it has ${academicYear._count.classes} class(es) associated with it`,
      });
    }

    // Delete academic year
    await prisma.academicYear.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: `Academic year "${academicYear.name}" deleted successfully`,
    });
  } catch (error: any) {
    console.error('Delete academic year error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete academic year',
      details: error.message,
    });
  }
});

// ===========================
// Settings Rollover / Copy Endpoints
// ===========================

// Get copy preview - shows what will be copied from previous year
app.get('/schools/:schoolId/academic-years/:yearId/copy-preview', async (req: Request, res: Response) => {
  try {
    const { schoolId, yearId } = req.params;

    // Verify academic year belongs to school
    const academicYear = await prisma.academicYear.findFirst({
      where: { id: yearId, schoolId },
    });

    if (!academicYear) {
      return res.status(404).json({
        success: false,
        error: 'Academic year not found',
      });
    }

    // Get all subjects (subjects are school-wide, not year-specific)
    const subjects = await prisma.subject.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        nameKh: true,
        coefficient: true,
        grade: true,
      },
    });

    // Get all teachers from this school
    const teachers = await prisma.teacher.findMany({
      where: { schoolId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        khmerName: true,
      },
    });

    // Note: Teachers don't have isActive field, so all are considered active
    const activeTeachers = teachers;
    const inactiveTeachers: typeof teachers = [];

    // Get all classes for this academic year
    const classes = await prisma.class.findMany({
      where: {
        schoolId,
        academicYearId: yearId,
      },
      select: {
        id: true,
        name: true,
        grade: true,
        section: true,
        capacity: true,
      },
    });

    // Generate warnings
    const warnings = [];
    if (subjects.length === 0) {
      warnings.push('No subjects found to copy');
    }
    if (classes.length === 0) {
      warnings.push('No classes found to copy');
    }

    res.json({
      success: true,
      data: {
        sourceYear: {
          id: academicYear.id,
          name: academicYear.name,
        },
        preview: {
          subjects: {
            total: subjects.length,
            items: subjects.slice(0, 5), // Preview first 5
          },
          teachers: {
            total: activeTeachers.length,
            active: activeTeachers.length,
            inactive: inactiveTeachers.length,
            items: activeTeachers.slice(0, 5), // Preview first 5
          },
          classes: {
            total: classes.length,
            items: classes.slice(0, 5), // Preview first 5
          },
        },
        warnings,
      },
    });
  } catch (error: any) {
    console.error('Get copy preview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get copy preview',
      details: error.message,
    });
  }
});

// Execute settings copy to new year
app.post('/schools/:schoolId/academic-years/:fromYearId/copy-settings', async (req: Request, res: Response) => {
  try {
    const { schoolId, fromYearId } = req.params;
    const { toAcademicYearId, copySettings } = req.body;

    // Validation
    if (!toAcademicYearId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: toAcademicYearId',
      });
    }

    // Verify both years belong to school
    const [fromYear, toYear] = await Promise.all([
      prisma.academicYear.findFirst({ where: { id: fromYearId, schoolId } }),
      prisma.academicYear.findFirst({ where: { id: toAcademicYearId, schoolId } }),
    ]);

    if (!fromYear || !toYear) {
      return res.status(404).json({
        success: false,
        error: 'One or both academic years not found',
      });
    }

    const results = {
      subjects: 0,
      teachers: 0,
      classes: 0,
    };

    // Copy subjects (if requested)
    if (copySettings?.subjects) {
      const existingSubjects = await prisma.subject.findMany({
        where: { isActive: true },
      });

      // Subjects are school-wide, not year-specific in current schema
      // Just count them as "already available"
      results.subjects = existingSubjects.length;
    }

    // Copy teachers (if requested)
    if (copySettings?.teachers) {
      const teachers = await prisma.teacher.findMany({
        where: { 
          schoolId,
        },
      });

      // Teachers are also school-wide, count as available
      results.teachers = teachers.length;
    }

    // Copy class structure (if requested)
    if (copySettings?.classes) {
      const sourceClasses = await prisma.class.findMany({
        where: {
          schoolId,
          academicYearId: fromYearId,
        },
        select: {
          classId: true,
          name: true,
          grade: true,
          section: true,
          track: true,
          capacity: true,
        },
      });

      // Create classes for new year (generate new IDs, keep structure)
      for (const sourceClass of sourceClasses) {
        await prisma.class.create({
          data: {
            schoolId,
            academicYearId: toAcademicYearId,
            // Don't copy classId, let Prisma generate new cuid
            name: sourceClass.name,
            grade: sourceClass.grade,
            section: sourceClass.section,
            track: sourceClass.track,
            capacity: sourceClass.capacity,
          },
        });
        results.classes++;
      }
    }

    // Update toYear with copiedFromYearId
    await prisma.academicYear.update({
      where: { id: toAcademicYearId },
      data: {
        copiedFromYearId: fromYearId,
      },
    });

    res.json({
      success: true,
      message: 'Settings copied successfully',
      data: {
        fromYear: {
          id: fromYear.id,
          name: fromYear.name,
        },
        toYear: {
          id: toYear.id,
          name: toYear.name,
        },
        copied: results,
      },
    });
  } catch (error: any) {
    console.error('Copy settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to copy settings',
      details: error.message,
    });
  }
});

// TODO: School registration endpoint (will add in next session)
// POST /schools/register

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   🏫 School Service - Stunity Enterprise v2.0    ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 API info: http://localhost:${PORT}/api/info`);
  console.log('');
  console.log('📋 Features (Coming next):');
  console.log('   - School self-registration');
  console.log('   - Trial management (1 or 3 months)');
  console.log('   - Subscription tracking');
  console.log('   - Usage limits enforcement');
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
});

// ===========================
// Onboarding Management Endpoints
// ===========================

// Get onboarding status for a school
app.get('/schools/:schoolId/onboarding/status', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        onboardingChecklist: true,
        schoolSettings: true,
      },
    });

    if (!school) {
      return res.status(404).json({
        success: false,
        error: 'School not found',
      });
    }

    res.json({
      success: true,
      data: {
        school: {
          id: school.id,
          name: school.name,
          setupCompleted: school.setupCompleted,
          setupCompletedAt: school.setupCompletedAt,
          onboardingStep: school.onboardingStep,
        },
        checklist: school.onboardingChecklist,
        settings: school.schoolSettings,
      },
    });
  } catch (error: any) {
    console.error('Get onboarding status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get onboarding status',
      details: error.message,
    });
  }
});

// Update onboarding step
app.put('/schools/:schoolId/onboarding/step', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const { step, stepName, skipStep = false } = req.body;

    if (!step || !stepName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: step, stepName',
      });
    }

    // Update school onboarding step
    await prisma.school.update({
      where: { id: schoolId },
      data: { onboardingStep: step },
    });

    // Update checklist
    const updateData: any = {
      currentStep: step,
    };

    // Mark step as completed
    if (stepName === 'schoolInfo') updateData.schoolInfoDone = true;
    if (stepName === 'calendar') updateData.calendarDone = true;
    if (stepName === 'subjects') updateData.subjectsDone = true;
    if (stepName === 'teachers') updateData.teachersAdded = true;
    if (stepName === 'classes') updateData.classesCreated = true;
    if (stepName === 'students') updateData.studentsAdded = true;

    // Handle skipped steps
    if (skipStep) {
      const checklist = await prisma.onboardingChecklist.findUnique({
        where: { schoolId },
      });
      
      if (checklist) {
        const skippedSteps = checklist.skippedSteps || [];
        if (!skippedSteps.includes(stepName)) {
          skippedSteps.push(stepName);
          updateData.skippedSteps = skippedSteps;
        }
      }
    }

    const updatedChecklist = await prisma.onboardingChecklist.update({
      where: { schoolId },
      data: updateData,
    });

    // Calculate completion percentage
    const completedCount = [
      updatedChecklist.registrationDone,
      updatedChecklist.schoolInfoDone,
      updatedChecklist.calendarDone,
      updatedChecklist.subjectsDone,
      updatedChecklist.teachersAdded,
      updatedChecklist.classesCreated,
      updatedChecklist.studentsAdded,
    ].filter(Boolean).length;

    const completionPercent = (completedCount / updatedChecklist.totalSteps) * 100;

    await prisma.onboardingChecklist.update({
      where: { schoolId },
      data: { completionPercent },
    });

    res.json({
      success: true,
      message: 'Onboarding step updated',
      data: {
        currentStep: step,
        completionPercent,
        checklist: updatedChecklist,
      },
    });
  } catch (error: any) {
    console.error('Update onboarding step error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update onboarding step',
      details: error.message,
    });
  }
});

// Complete onboarding
app.post('/schools/:schoolId/onboarding/complete', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;

    const completedAt = new Date();

    // Update school
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        setupCompleted: true,
        setupCompletedAt: completedAt,
        onboardingStep: 7,
      },
    });

    // Update checklist
    await prisma.onboardingChecklist.update({
      where: { schoolId },
      data: {
        completedAt,
        completionPercent: 100,
      },
    });

    res.json({
      success: true,
      message: 'Onboarding completed successfully! 🎉',
      data: {
        completedAt,
      },
    });
  } catch (error: any) {
    console.error('Complete onboarding error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete onboarding',
      details: error.message,
    });
  }
});

