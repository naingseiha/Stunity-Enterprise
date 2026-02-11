import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient, SubscriptionTier, SchoolType } from '@prisma/client';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import ClaimCodeGenerator from './utils/claimCodeGenerator';
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

// ✅ Singleton pattern to prevent multiple Prisma instances
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Keep database connection warm to avoid Neon cold starts
let isDbWarm = false;
const warmUpDb = async () => {
  if (isDbWarm) return;
  try {
    await prisma.$queryRaw`SELECT 1`;
    isDbWarm = true;
    console.log('✅ School Service - Database ready');
  } catch (error) {
    console.error('⚠️ School Service - Database warmup failed');
  }
};
warmUpDb();
setInterval(() => { isDbWarm = false; warmUpDb(); }, 4 * 60 * 1000); // Every 4 minutes

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

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

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
    name: 'School Service',
    version: '2.0.0',
    description: 'Multi-tenant school management with complete onboarding',
    endpoints: [
      'POST /schools/register - Register new school with complete setup',
      'GET /schools/:schoolId/onboarding/status - Get onboarding status',
      'PUT /schools/:schoolId/onboarding/step - Update onboarding step',
      'POST /schools/:schoolId/onboarding/complete - Mark onboarding complete',
    ],
  });
});

// SIMPLIFIED REGISTRATION ENDPOINT - Using nested writes for better performance
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
      adminPassword,
      adminPhone,
      schoolType = SchoolType.HIGH_SCHOOL,
      trialMonths = 3,
    } = req.body;

    // Validation
    if (!schoolName || !email || !adminFirstName || !adminLastName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    if (trialMonths !== 1 && trialMonths !== 3) {
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
    const currentYear = new Date().getFullYear();
    const holidays = getCambodianHolidays(currentYear);

    console.log(`🏫 Registering new school: ${schoolName} (${schoolType})`);

    // Use smaller, nested transaction for core data
    const school = await prisma.school.create({
      data: {
        name: schoolName,
        slug,
        email,
        phone,
        address,
        schoolType,
        gradeRange: schoolType === SchoolType.PRIMARY_SCHOOL
          ? '1-6'
          : schoolType === SchoolType.MIDDLE_SCHOOL
          ? '7-9'
          : schoolType === SchoolType.HIGH_SCHOOL
          ? '10-12'
          : schoolType === SchoolType.COMPLETE_SCHOOL
          ? '1-12'
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

    // Create Academic Year with nested related data
    const academicYear = await prisma.academicYear.create({
      data: {
        schoolId: school.id,
        name: `${currentYear}-${currentYear + 1}`,
        startDate: new Date(`${currentYear}-09-01`),
        endDate: new Date(`${currentYear + 1}-08-31`),
        isCurrent: true,
        status: 'PLANNING',
        // Create terms inline
        terms: {
          create: DEFAULT_TERMS.map(term => ({
            name: term.name,
            termNumber: term.termNumber,
            startDate: new Date(`${currentYear}-${String(term.startMonth).padStart(2, '0')}-${String(term.startDay).padStart(2, '0')}`),
            endDate: term.endMonth <= 8
              ? new Date(`${currentYear + 1}-${String(term.endMonth).padStart(2, '0')}-${String(term.endDay).padStart(2, '0')}`)
              : new Date(`${currentYear}-${String(term.endMonth).padStart(2, '0')}-${String(term.endDay).padStart(2, '0')}`),
          })),
        },
        // Create exam types inline
        examTypes: {
          create: DEFAULT_EXAM_TYPES.map(exam => ({
            name: exam.name,
            weight: exam.weight,
            maxScore: exam.maxScore,
            order: exam.order,
          })),
        },
        // Create grading scale with ranges inline
        gradingScales: {
          create: {
            name: 'Standard Grading Scale',
            isDefault: true,
            ranges: {
              create: STANDARD_GRADING_SCALE.map((range, index) => ({
                grade: range.grade,
                minScore: range.minScore,
                maxScore: range.maxScore,
                gpa: range.gpa,
                description: range.description,
                color: range.color,
                order: index,
              })),
            },
          },
        },
        // Create calendar with events inline
        calendars: {
          create: {
            name: 'School Calendar',
            events: {
              create: holidays.map(holiday => ({
                type: holiday.type,
                title: holiday.title,
                startDate: new Date(holiday.date),
                endDate: holiday.endDate ? new Date(holiday.endDate) : new Date(holiday.date),
                isSchoolDay: false, // holidays are not school days
              })),
            },
          },
        },
      },
    });

    console.log('✅ Academic year created with terms, exams, grading, and calendar');

    // Create subjects
    await prisma.subject.createMany({
      data: CAMBODIAN_SUBJECTS_HIGH_SCHOOL.map(subject => ({
        name: subject.name,
        nameKh: subject.nameKh,
        code: `${subject.code}-${slug}`,
        grade: schoolType === SchoolType.HIGH_SCHOOL ? '10-12' : '1-12',
        category: subject.category,
        coefficient: subject.coefficient,
        isActive: true,
      })),
    });

    console.log('✅ Subjects created (15)');

    // Create onboarding checklist
    await prisma.onboardingChecklist.create({
      data: {
        schoolId: school.id,
        currentStep: 3, // Registration, calendar, subjects done
        totalSteps: 7,
        completionPercent: 42.86,
        registrationDone: true,
        calendarDone: true,
        subjectsDone: true,
        skippedSteps: [],
      },
    });

    console.log('✅ Onboarding checklist created');

    // Create school settings
    await prisma.schoolSettings.create({
      data: {
        schoolId: school.id,
        defaultAcademicYearStart: '09-01',
        defaultAcademicYearEnd: '08-31',
        defaultTermCount: 2,
        defaultClassCapacity: 40,
        defaultSections: ['A', 'B', 'C'],
        passingGrade: 50,
        usesGPA: true,
        emailNotifications: true,
        smsNotifications: false,
      },
    });

    console.log('✅ School settings created');

    // Create admin user
    const adminUser = await prisma.user.create({
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
    console.log(`🎉 School registration complete: ${schoolName}`);

    res.status(201).json({
      success: true,
      message: 'School registered successfully with complete setup!',
      data: {
        school: {
          id: school.id,
          name: school.name,
          slug: school.slug,
          email: school.email,
          schoolType: schoolType,
          subscriptionTier: school.subscriptionTier,
          subscriptionEnd: school.subscriptionEnd,
          isTrial: school.isTrial,
          setupProgress: {
            currentStep: 2,
            totalSteps: 7,
            completionPercent: 42.86,
            completedSteps: ['registration', 'calendar', 'subjects'],
          },
        },
        admin: {
          id: adminUser.id,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          email: adminUser.email,
        },
        academicYear: {
          id: academicYear.id,
          name: academicYear.name,
          terms: 2,
          examTypes: 3,
          gradingScale: 'Standard (A-F)',
        },
        defaults: {
          subjects: CAMBODIAN_SUBJECTS_HIGH_SCHOOL.length,
          holidays: holidays.length,
          gradeRanges: STANDARD_GRADING_SCALE.length,
        },
        nextSteps: {
          onboardingUrl: `/onboarding/${school.slug}`,
          dashboard: `/dashboard`,
          setupGuide: `/setup/guide`,
        },
      },
    });
  } catch (error: any) {
    console.error('❌ School registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to register school',
      details: error.message,
    });
  }
});

// Get onboarding status
app.get('/schools/:schoolId/onboarding/status', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        setupCompleted: true,
        onboardingStep: true,
        setupCompletedAt: true,
      },
    });

    if (!school) {
      return res.status(404).json({
        success: false,
        error: 'School not found',
      });
    }

    const checklist = await prisma.onboardingChecklist.findUnique({
      where: { schoolId },
    });

    const settings = await prisma.schoolSettings.findUnique({
      where: { schoolId },
    });

    res.json({
      success: true,
      data: {
        school,
        checklist,
        settings,
      },
    });
  } catch (error: any) {
    console.error('Error fetching onboarding status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch onboarding status',
    });
  }
});

// Update onboarding step
app.put('/schools/:schoolId/onboarding/step', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const { step, completed, skipped } = req.body;

    const checklist = await prisma.onboardingChecklist.findUnique({
      where: { schoolId },
    });

    if (!checklist) {
      return res.status(404).json({
        success: false,
        error: 'Onboarding checklist not found',
      });
    }

    let skippedSteps = checklist.skippedSteps || [];

    if (skipped && !skippedSteps.includes(step)) {
      skippedSteps.push(step);
    }

    // Update specific step based on the step name
    const stepUpdates: any = {
      currentStep: checklist.currentStep + 1,
      skippedSteps,
    };

    if (step === 'registration') stepUpdates.registrationDone = completed;
    if (step === 'schoolInfo') stepUpdates.schoolInfoDone = completed;
    if (step === 'calendar') stepUpdates.calendarDone = completed;
    if (step === 'subjects') stepUpdates.subjectsDone = completed;
    if (step === 'teachers') stepUpdates.teachersAdded = completed;
    if (step === 'classes') stepUpdates.classesCreated = completed;
    if (step === 'students') stepUpdates.studentsAdded = completed;

    // Calculate completion percentage
    const completedCount = [
      checklist.registrationDone,
      checklist.schoolInfoDone,
      checklist.calendarDone,
      checklist.subjectsDone,
      checklist.teachersAdded,
      checklist.classesCreated,
      checklist.studentsAdded,
    ].filter(Boolean).length;

    stepUpdates.completionPercent = (completedCount / checklist.totalSteps) * 100;

    const updated = await prisma.onboardingChecklist.update({
      where: { schoolId },
      data: stepUpdates,
    });

    // Update school onboarding step
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        onboardingStep: checklist.currentStep + 1,
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating onboarding step:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update onboarding step',
    });
  }
});

// Complete onboarding
app.post('/schools/:schoolId/onboarding/complete', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;

    const updated = await prisma.onboardingChecklist.update({
      where: { schoolId },
      data: {
        completionPercent: 100,
        currentStep: 7,
      },
    });

    await prisma.school.update({
      where: { id: schoolId },
      data: {
        setupCompleted: true,
        setupCompletedAt: new Date(),
        onboardingStep: 7,
      },
    });

    res.json({
      success: true,
      message: 'Onboarding completed successfully!',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error completing onboarding:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete onboarding',
    });
  }
});

// ============================================================
// ACADEMIC YEAR ENDPOINTS
// ============================================================

// GET /schools/:schoolId/academic-years - Get all academic years for a school
app.get('/schools/:schoolId/academic-years', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;

    const years = await prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' },
    });

    res.json({
      success: true,
      data: years,
    });
  } catch (error: any) {
    console.error('Error fetching academic years:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch academic years',
      message: error.message,
    });
  }
});

// POST /schools/:schoolId/academic-years - Create new academic year
app.post('/schools/:schoolId/academic-years', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const { name, startDate, endDate, copiedFromYearId } = req.body;

    // Validation
    if (!name || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, startDate, endDate',
      });
    }

    // Check if name already exists for this school
    const existing = await prisma.academicYear.findUnique({
      where: {
        schoolId_name: { schoolId, name },
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'An academic year with this name already exists',
      });
    }

    // Create the academic year
    const year = await prisma.academicYear.create({
      data: {
        schoolId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        copiedFromYearId: copiedFromYearId || null,
        status: 'PLANNING',
        isCurrent: false,
      },
    });

    res.json({
      success: true,
      data: year,
    });
  } catch (error: any) {
    console.error('Error creating academic year:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create academic year',
      message: error.message,
    });
  }
});

// PUT /schools/:schoolId/academic-years/:yearId - Update academic year
app.put('/schools/:schoolId/academic-years/:yearId', async (req: Request, res: Response) => {
  try {
    const { schoolId, yearId } = req.params;
    const { name, startDate, endDate } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);

    const year = await prisma.academicYear.update({
      where: {
        id: yearId,
        schoolId,
      },
      data: updateData,
    });

    res.json({
      success: true,
      data: year,
    });
  } catch (error: any) {
    console.error('Error updating academic year:', error);
    res.status(404).json({
      success: false,
      error: 'Academic year not found or failed to update',
      message: error.message,
    });
  }
});

// PUT /schools/:schoolId/academic-years/:yearId/set-current - Set as current year
app.put('/schools/:schoolId/academic-years/:yearId/set-current', async (req: Request, res: Response) => {
  try {
    const { schoolId, yearId } = req.params;

    // Use transaction to ensure only one current year
    await prisma.$transaction([
      // Set all years for this school to not current
      prisma.academicYear.updateMany({
        where: { schoolId },
        data: { isCurrent: false },
      }),
      // Set the specified year as current and ACTIVE
      prisma.academicYear.update({
        where: {
          id: yearId,
          schoolId,
        },
        data: {
          isCurrent: true,
          status: 'ACTIVE',
        },
      }),
    ]);

    const year = await prisma.academicYear.findUnique({
      where: { id: yearId },
    });

    res.json({
      success: true,
      data: year,
    });
  } catch (error: any) {
    console.error('Error setting current year:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set current year',
      message: error.message,
    });
  }
});

// PUT /schools/:schoolId/academic-years/:yearId/archive - Archive year
app.put('/schools/:schoolId/academic-years/:yearId/archive', async (req: Request, res: Response) => {
  try {
    const { schoolId, yearId } = req.params;

    const year = await prisma.academicYear.update({
      where: {
        id: yearId,
        schoolId,
      },
      data: {
        status: 'ARCHIVED',
        isCurrent: false,
      },
    });

    res.json({
      success: true,
      data: year,
    });
  } catch (error: any) {
    console.error('Error archiving year:', error);
    res.status(404).json({
      success: false,
      error: 'Academic year not found or failed to archive',
      message: error.message,
    });
  }
});

// DELETE /schools/:schoolId/academic-years/:yearId - Delete academic year
app.delete('/schools/:schoolId/academic-years/:yearId', async (req: Request, res: Response) => {
  try {
    const { schoolId, yearId } = req.params;

    // Check if year has data (classes, etc.)
    const classCount = await prisma.class.count({
      where: { academicYearId: yearId },
    });

    if (classCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete year with existing classes. Archive instead.',
      });
    }

    await prisma.academicYear.delete({
      where: {
        id: yearId,
        schoolId,
      },
    });

    res.json({
      success: true,
      message: 'Academic year deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting year:', error);
    res.status(404).json({
      success: false,
      error: 'Academic year not found or failed to delete',
      message: error.message,
    });
  }
});

// GET /schools/:schoolId/academic-years/:yearId/stats - Get year statistics
app.get('/schools/:schoolId/academic-years/:yearId/stats', async (req: Request, res: Response) => {
  try {
    const { schoolId, yearId } = req.params;

    // Get counts for this academic year
    const [classCount, studentCount, teacherCount] = await Promise.all([
      prisma.class.count({
        where: { 
          schoolId,
          academicYearId: yearId,
        },
      }),
      // Students count via class enrollments
      prisma.student.count({
        where: {
          schoolId,
          class: {
            academicYearId: yearId,
          },
        },
      }),
      // Teachers count via class assignments
      prisma.teacher.count({
        where: {
          schoolId,
          teacherClasses: {
            some: {
              class: {
                academicYearId: yearId,
              },
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        classes: classCount,
        students: studentCount,
        teachers: teacherCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching year stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch year statistics',
      message: error.message,
    });
  }
});

// GET /schools/:schoolId/academic-years/current - Get current academic year
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
    console.error('Error fetching current year:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current year',
      message: error.message,
    });
  }
});

// GET /schools/:schoolId/academic-years/:yearId/copy-preview - Preview copy settings
app.get('/schools/:schoolId/academic-years/:yearId/copy-preview', async (req: Request, res: Response) => {
  try {
    const { schoolId, yearId } = req.params;

    // Get source year with related data
    const sourceYear = await prisma.academicYear.findUnique({
      where: {
        id: yearId,
        schoolId,
      },
      include: {
        terms: true,
        examTypes: true,
        gradingScales: true,
        calendars: true,
      },
    });

    if (!sourceYear) {
      return res.status(404).json({
        success: false,
        error: 'Source academic year not found',
      });
    }

    // Count subjects (all active subjects - not year-specific)
    const subjectsCount = await prisma.subject.count({
      where: { isActive: true }
    });

    // Count teachers assigned to classes in this year
    const teacherClassRecords = await prisma.teacherClass.findMany({
      where: {
        class: { academicYearId: yearId }
      },
      select: { teacherId: true },
      distinct: ['teacherId']
    });
    const teachersCount = teacherClassRecords.length;

    // Count classes in this year
    const classesCount = await prisma.class.count({
      where: { academicYearId: yearId }
    });

    // Return preview of what will be copied
    res.json({
      success: true,
      data: {
        sourceYear: {
          id: sourceYear.id,
          name: sourceYear.name,
        },
        // Counts for UI cards
        subjectsCount,
        teachersCount,
        classesCount,
        // Legacy structure for backwards compatibility
        willCopy: {
          subjects: subjectsCount,
          teachers: teachersCount,
          classes: classesCount,
          terms: sourceYear.terms?.length || 0,
          examTypes: sourceYear.examTypes?.length || 0,
          gradingScales: sourceYear.gradingScales?.length || 0,
          holidays: sourceYear.calendars?.filter((c: any) => c.type === 'HOLIDAY').length || 0,
        },
        preview: {
          terms: sourceYear.terms || [],
          examTypes: sourceYear.examTypes || [],
          gradingScales: sourceYear.gradingScales || [],
          holidays: sourceYear.calendars?.filter((c: any) => c.type === 'HOLIDAY') || [],
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching copy preview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch copy preview',
      message: error.message,
    });
  }
});

// POST /schools/:schoolId/academic-years/:yearId/copy-settings - Copy settings to another year
app.post('/schools/:schoolId/academic-years/:yearId/copy-settings', async (req: Request, res: Response) => {
  try {
    const { schoolId, yearId: fromYearId } = req.params;
    const { toAcademicYearId, copySettings } = req.body;

    console.log('Copy settings request:', { fromYearId, toAcademicYearId, copySettings });

    if (!toAcademicYearId) {
      return res.status(400).json({
        success: false,
        error: 'Target academic year ID is required',
      });
    }

    // Verify both years exist
    const [sourceYear, targetYear] = await Promise.all([
      prisma.academicYear.findUnique({
        where: { id: fromYearId, schoolId },
      }),
      prisma.academicYear.findUnique({
        where: { id: toAcademicYearId, schoolId },
      }),
    ]);

    if (!sourceYear) {
      return res.status(404).json({
        success: false,
        error: 'Source academic year not found',
      });
    }

    if (!targetYear) {
      return res.status(404).json({
        success: false,
        error: 'Target academic year not found',
      });
    }

    const results: any = {
      subjects: 0,
      teachers: 0,
      classes: 0,
      errors: [],
    };

    // Copy Classes (with grade incrementation)
    if (copySettings.classes) {
      try {
        const sourceClasses = await prisma.class.findMany({
          where: {
            schoolId,
            academicYearId: fromYearId,
          },
        });

        console.log(`Found ${sourceClasses.length} classes to copy`);

        for (const sourceClass of sourceClasses) {
          // Check if class with same name already exists in target year
          const existingClass = await prisma.class.findFirst({
            where: {
              schoolId,
              academicYearId: toAcademicYearId,
              name: sourceClass.name,
            },
          });

          if (!existingClass) {
            // Create new class in target year
            await prisma.class.create({
              data: {
                schoolId,
                name: sourceClass.name,
                grade: sourceClass.grade,
                section: sourceClass.section,
                track: sourceClass.track,
                capacity: sourceClass.capacity,
                academicYearId: toAcademicYearId,
              },
            });
            results.classes++;
          }
        }
      } catch (error: any) {
        console.error('Error copying classes:', error);
        results.errors.push({ type: 'classes', error: error.message });
      }
    }

    // Copy Teacher Assignments
    if (copySettings.teachers) {
      try {
        // Get all teacher-class assignments from source year
        const sourceTeacherClasses = await prisma.teacherClass.findMany({
          where: {
            class: {
              schoolId,
              academicYearId: fromYearId,
            },
          },
          include: {
            class: true,
            teacher: true,
          },
        });

        console.log(`Found ${sourceTeacherClasses.length} teacher assignments to copy`);

        for (const assignment of sourceTeacherClasses) {
          // Find corresponding class in target year (by name)
          const targetClass = await prisma.class.findFirst({
            where: {
              schoolId,
              academicYearId: toAcademicYearId,
              name: assignment.class.name,
            },
          });

          if (targetClass) {
            // Check if assignment already exists
            const existingAssignment = await prisma.teacherClass.findFirst({
              where: {
                teacherId: assignment.teacherId,
                classId: targetClass.id,
              },
            });

            if (!existingAssignment) {
              await prisma.teacherClass.create({
                data: {
                  teacherId: assignment.teacherId,
                  classId: targetClass.id,
                },
              });
              results.teachers++;
            }
          }
        }
      } catch (error: any) {
        console.error('Error copying teacher assignments:', error);
        results.errors.push({ type: 'teachers', error: error.message });
      }
    }

    // Note: Subjects are school-wide, not year-specific, so we don't copy them
    if (copySettings.subjects) {
      results.subjects = 0; // Subjects exist at school level, already available
    }

    res.json({
      success: true,
      data: {
        message: 'Settings copied successfully',
        results,
      },
    });
  } catch (error: any) {
    console.error('Error copying settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to copy settings',
      message: error.message,
    });
  }
});

// ============================================================
// STUDENT PROMOTION ENDPOINTS
// ============================================================

// GET /schools/:schoolId/academic-years/:yearId/promotion/eligible-students
app.get('/schools/:schoolId/academic-years/:yearId/promotion/eligible-students', async (req: Request, res: Response) => {
  try {
    const { schoolId, yearId } = req.params;

    // Verify academic year exists
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: yearId, schoolId },
    });

    if (!academicYear) {
      return res.status(404).json({
        success: false,
        error: 'Academic year not found',
      });
    }

    // Get all classes for this year with students
    const classes = await prisma.class.findMany({
      where: {
        schoolId,
        academicYearId: yearId,
      },
      include: {
        students: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            khmerName: true,
            gender: true,
            dateOfBirth: true,
          },
        },
      },
      orderBy: [
        { grade: 'asc' },
        { section: 'asc' },
      ],
    });

    // Group students by class
    const eligibleStudents = classes.map((cls: any) => ({
      class: {
        id: cls.id,
        name: cls.name,
        grade: cls.grade,
        section: cls.section,
      },
      studentCount: cls.students.length,
      students: cls.students,
    }));

    // Calculate totals
    const totalStudents = classes.reduce((sum: number, cls: any) => sum + cls.students.length, 0);

    res.json({
      success: true,
      data: {
        academicYear: {
          id: academicYear.id,
          name: academicYear.name,
          status: academicYear.status,
        },
        totalClasses: classes.length,
        totalStudents,
        classesByGrade: eligibleStudents,
      },
    });
  } catch (error: any) {
    console.error('Error fetching eligible students:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch eligible students',
      message: error.message,
    });
  }
});

// POST /schools/:schoolId/academic-years/:yearId/promotion/preview
app.post('/schools/:schoolId/academic-years/:yearId/promotion/preview', async (req: Request, res: Response) => {
  try {
    const { schoolId, yearId } = req.params;
    const { toAcademicYearId } = req.body;

    if (!toAcademicYearId) {
      return res.status(400).json({
        success: false,
        error: 'Target academic year ID is required',
      });
    }

    // Get source and target years
    const [fromYear, toYear] = await Promise.all([
      prisma.academicYear.findUnique({ where: { id: yearId, schoolId } }),
      prisma.academicYear.findUnique({ where: { id: toAcademicYearId, schoolId } }),
    ]);

    if (!fromYear || !toYear) {
      return res.status(404).json({
        success: false,
        error: 'Academic year not found',
      });
    }

    // Get all classes from source year
    const fromClasses = await prisma.class.findMany({
      where: {
        schoolId,
        academicYearId: yearId,
      },
      include: {
        students: true,
      },
      orderBy: { grade: 'asc' },
    });

    // Get all classes from target year
    const toClasses = await prisma.class.findMany({
      where: {
        schoolId,
        academicYearId: toAcademicYearId,
      },
      orderBy: { grade: 'asc' },
    });

    // Helper function to get next grade
    const getNextGrade = (currentGrade: string): string | null => {
      const grade = parseInt(currentGrade);
      if (isNaN(grade)) return null;
      if (grade >= 12) return null; // Grade 12 graduates
      return String(grade + 1);
    };

    // Build promotion preview
    const promotionPreview = fromClasses.map(fromClass => {
      const nextGrade = getNextGrade(fromClass.grade);
      const targetClasses = nextGrade 
        ? toClasses.filter(c => c.grade === nextGrade)
        : [];

      return {
        fromClass: {
          id: fromClass.id,
          name: fromClass.name,
          grade: fromClass.grade,
          section: fromClass.section,
        },
        studentCount: fromClass.students.length,
        nextGrade,
        targetClasses: targetClasses.map(c => ({
          id: c.id,
          name: c.name,
          grade: c.grade,
          section: c.section,
          capacity: c.capacity,
        })),
        willGraduate: fromClass.grade === '12',
      };
    });

    const totalStudents = fromClasses.reduce((sum, cls) => sum + cls.students.length, 0);
    const graduatingStudents = fromClasses
      .filter(cls => cls.grade === '12')
      .reduce((sum, cls) => sum + cls.students.length, 0);

    res.json({
      success: true,
      data: {
        fromYear: {
          id: fromYear.id,
          name: fromYear.name,
        },
        toYear: {
          id: toYear.id,
          name: toYear.name,
        },
        preview: promotionPreview,
        summary: {
          totalClasses: fromClasses.length,
          totalStudents,
          graduatingStudents,
          promotingStudents: totalStudents - graduatingStudents,
        },
      },
    });
  } catch (error: any) {
    console.error('Error generating promotion preview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate promotion preview',
      message: error.message,
    });
  }
});

// POST /schools/:schoolId/academic-years/:yearId/promote-students
app.post('/schools/:schoolId/academic-years/:yearId/promote-students', async (req: Request, res: Response) => {
  try {
    const { schoolId, yearId } = req.params;
    const { toAcademicYearId, promotions, promotedBy } = req.body;

    // Validation
    if (!toAcademicYearId || !promotions || !Array.isArray(promotions)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: toAcademicYearId, promotions array',
      });
    }

    // Verify years exist
    const [fromYear, toYear] = await Promise.all([
      prisma.academicYear.findUnique({ where: { id: yearId, schoolId } }),
      prisma.academicYear.findUnique({ where: { id: toAcademicYearId, schoolId } }),
    ]);

    if (!fromYear || !toYear) {
      return res.status(404).json({
        success: false,
        error: 'Academic year not found',
      });
    }

    // Check if promotion already done
    if (fromYear.isPromotionDone) {
      return res.status(400).json({
        success: false,
        error: 'Students have already been promoted for this year',
      });
    }

    const promotionDate = new Date();
    const results = {
      promoted: 0,
      repeated: 0,
      graduated: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Pre-fetch all required data outside transaction for validation
    const studentIds = promotions.map((p: any) => p.studentId);
    const toClassIds = Array.from(new Set(promotions.map((p: any) => p.toClassId)));
    const fromClassIds = Array.from(new Set(promotions.map((p: any) => p.fromClassId)));

    // Batch fetch students
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true },
    });
    const studentIdSet = new Set(students.map(s => s.id));

    // Batch fetch target classes
    const targetClasses = await prisma.class.findMany({
      where: { id: { in: toClassIds } },
      select: { id: true, academicYearId: true },
    });
    const targetClassMap = new Map(targetClasses.map(c => [c.id, c]));

    // Batch fetch from classes (for graduation check)
    const fromClasses = await prisma.class.findMany({
      where: { id: { in: fromClassIds } },
      select: { id: true, grade: true },
    });
    const fromClassMap = new Map(fromClasses.map(c => [c.id, c]));

    // Batch check existing enrollments
    const existingEnrollments = await prisma.studentClass.findMany({
      where: {
        studentId: { in: studentIds },
        status: 'ACTIVE',
        class: {
          academicYearId: toAcademicYearId,
        },
      },
      select: { studentId: true },
    });
    const alreadyEnrolledSet = new Set(existingEnrollments.map(e => e.studentId));

    // Prepare valid promotions
    const validPromotions: any[] = [];
    for (const promotion of promotions) {
      const { studentId, fromClassId, toClassId } = promotion;

      if (!studentIdSet.has(studentId)) {
        results.errors.push({ studentId, error: 'Student not found' });
        results.failed++;
        continue;
      }

      if (!targetClassMap.has(toClassId)) {
        results.errors.push({ studentId, error: 'Target class not found' });
        results.failed++;
        continue;
      }

      if (alreadyEnrolledSet.has(studentId)) {
        results.errors.push({ studentId, error: 'Student already enrolled in this academic year' });
        results.failed++;
        continue;
      }

      validPromotions.push(promotion);
    }

    // Process valid promotions in transaction with batched operations
    if (validPromotions.length > 0) {
      await prisma.$transaction(async (tx) => {
        // Batch create StudentClass enrollments
        await tx.studentClass.createMany({
          data: validPromotions.map(p => ({
            studentId: p.studentId,
            classId: p.toClassId,
            academicYearId: toAcademicYearId,
            status: 'ACTIVE',
          })),
          skipDuplicates: true,
        });

        // Batch deactivate old enrollments
        await tx.studentClass.updateMany({
          where: {
            studentId: { in: validPromotions.map(p => p.studentId) },
            classId: { in: validPromotions.map(p => p.fromClassId) },
            status: 'ACTIVE',
          },
          data: { status: 'INACTIVE' },
        });

        // Batch create progression records
        await tx.studentProgression.createMany({
          data: validPromotions.map(p => ({
            studentId: p.studentId,
            fromAcademicYearId: yearId,
            toAcademicYearId: toAcademicYearId,
            fromClassId: p.fromClassId,
            toClassId: p.toClassId,
            promotionType: p.promotionType || 'AUTOMATIC',
            promotionDate,
            promotedBy: promotedBy || 'SYSTEM',
            notes: p.notes || null,
          })),
          skipDuplicates: true,
        });

        // Update students' current class (batched per target class)
        for (const toClassId of toClassIds) {
          const studentsForClass = validPromotions
            .filter(p => p.toClassId === toClassId)
            .map(p => p.studentId);
          
          if (studentsForClass.length > 0) {
            await tx.student.updateMany({
              where: { id: { in: studentsForClass } },
              data: { classId: toClassId },
            });
          }
        }

        // Count results
        for (const p of validPromotions) {
          if (p.promotionType === 'REPEAT') {
            results.repeated++;
          } else {
            const fromClass = fromClassMap.get(p.fromClassId);
            if (fromClass?.grade === '12') {
              results.graduated++;
            } else {
              results.promoted++;
            }
          }
        }

        // Mark year as promotion done
        await tx.academicYear.update({
          where: { id: yearId },
          data: {
            isPromotionDone: true,
            promotionDate,
            status: 'ENDED',
          },
        });
      }, {
        maxWait: 30000,
        timeout: 120000, // 2 minutes for large batches
      });
    }

    res.json({
      success: true,
      message: 'Student promotion completed',
      data: {
        fromYear: { id: fromYear.id, name: fromYear.name },
        toYear: { id: toYear.id, name: toYear.name },
        promotionDate,
        results,
      },
    });
  } catch (error: any) {
    console.error('Error promoting students:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to promote students',
      message: error.message,
    });
  }
});

// POST /schools/:schoolId/academic-years/:yearId/promotion/undo
app.post('/schools/:schoolId/academic-years/:yearId/promotion/undo', async (req: Request, res: Response) => {
  try {
    const { schoolId, yearId } = req.params;

    // Get academic year
    const year = await prisma.academicYear.findUnique({
      where: { id: yearId, schoolId },
    });

    if (!year) {
      return res.status(404).json({
        success: false,
        error: 'Academic year not found',
      });
    }

    if (!year.isPromotionDone) {
      return res.status(400).json({
        success: false,
        error: 'No promotion to undo',
      });
    }

    // Check if promotion was recent (within 24 hours)
    if (year.promotionDate) {
      const hoursSincePromotion = (Date.now() - year.promotionDate.getTime()) / (1000 * 60 * 60);
      if (hoursSincePromotion > 24) {
        return res.status(400).json({
          success: false,
          error: 'Cannot undo promotion after 24 hours',
        });
      }
    }

    // Get all progressions from this year
    const progressions = await prisma.studentProgression.findMany({
      where: { fromAcademicYearId: yearId },
    });

    let undoneCount = 0;

    // Undo promotions in transaction
    await prisma.$transaction(async (tx) => {
      for (const progression of progressions) {
        // Revert student to original class
        await tx.student.update({
          where: { id: progression.studentId },
          data: { classId: progression.fromClassId },
        });

        // Delete progression record
        await tx.studentProgression.delete({
          where: { id: progression.id },
        });

        undoneCount++;
      }

      // Update year status
      await tx.academicYear.update({
        where: { id: yearId },
        data: {
          isPromotionDone: false,
          promotionDate: null,
        },
      });
    });

    res.json({
      success: true,
      message: 'Promotion undone successfully',
      data: {
        undoneCount,
      },
    });
  } catch (error: any) {
    console.error('Error undoing promotion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to undo promotion',
      message: error.message,
    });
  }
});

// GET /schools/:schoolId/academic-years/:yearId/promotion/report
app.get('/schools/:schoolId/academic-years/:yearId/promotion/report', async (req: Request, res: Response) => {
  try {
    const { schoolId, yearId } = req.params;

    // Get academic year
    const year = await prisma.academicYear.findUnique({
      where: { id: yearId, schoolId },
    });

    if (!year) {
      return res.status(404).json({
        success: false,
        error: 'Academic year not found',
      });
    }

    if (!year.isPromotionDone) {
      return res.status(404).json({
        success: false,
        error: 'No promotion has been done for this year',
      });
    }

    // Get all progressions
    const progressions = await prisma.studentProgression.findMany({
      where: { fromAcademicYearId: yearId },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
          },
        },
        fromClass: {
          select: {
            name: true,
            grade: true,
          },
        },
        toClass: {
          select: {
            name: true,
            grade: true,
          },
        },
      },
    });

    // Calculate statistics
    const stats = {
      total: progressions.length,
      promoted: progressions.filter(p => p.promotionType === 'AUTOMATIC' || p.promotionType === 'MANUAL').length,
      repeated: progressions.filter(p => p.promotionType === 'REPEAT').length,
      transferred: progressions.filter(p => p.promotionType === 'TRANSFER_OUT').length,
    };

    res.json({
      success: true,
      data: {
        academicYear: {
          id: year.id,
          name: year.name,
          promotionDate: year.promotionDate,
        },
        statistics: stats,
        progressions,
      },
    });
  } catch (error: any) {
    console.error('Error fetching promotion report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch promotion report',
      message: error.message,
    });
  }
});

// ============================================================
// PHASE 4: Year Comparison & Analytics APIs
// ============================================================

// GET /schools/:schoolId/analytics/year-comparison
// Compare statistics between two academic years
app.get('/schools/:schoolId/analytics/year-comparison', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const { yearId1, yearId2 } = req.query;

    if (!yearId1 || !yearId2) {
      return res.status(400).json({
        success: false,
        error: 'Both yearId1 and yearId2 are required',
      });
    }

    // Fetch both years
    const [year1, year2] = await Promise.all([
      prisma.academicYear.findUnique({
        where: { id: String(yearId1), schoolId },
        include: {
          classes: {
            include: {
              _count: { select: { students: true } },
            },
          },
        },
      }),
      prisma.academicYear.findUnique({
        where: { id: String(yearId2), schoolId },
        include: {
          classes: {
            include: {
              _count: { select: { students: true } },
            },
          },
        },
      }),
    ]);

    if (!year1 || !year2) {
      return res.status(404).json({
        success: false,
        error: 'One or both academic years not found',
      });
    }

    // Get student counts by grade for each year
    const getYearStats = async (yearId: string) => {
      const studentClasses = await prisma.studentClass.groupBy({
        by: ['classId'],
        where: { academicYearId: yearId, status: { in: ['ACTIVE', 'INACTIVE'] } },
        _count: { studentId: true },
      });

      const classes = await prisma.class.findMany({
        where: { academicYearId: yearId },
        select: { id: true, grade: true, name: true },
      });

      const byGrade: Record<string, number> = {};
      for (const cls of classes) {
        const count = studentClasses.find(sc => sc.classId === cls.id)?._count.studentId || 0;
        byGrade[cls.grade] = (byGrade[cls.grade] || 0) + count;
      }

      const totalStudents = Object.values(byGrade).reduce((a, b) => a + b, 0);
      const totalClasses = classes.length;

      return { totalStudents, totalClasses, byGrade };
    };

    const [stats1, stats2] = await Promise.all([
      getYearStats(String(yearId1)),
      getYearStats(String(yearId2)),
    ]);

    // Get teacher counts
    const [teachers1, teachers2] = await Promise.all([
      prisma.teacherClass.groupBy({
        by: ['teacherId'],
        where: { class: { academicYearId: String(yearId1) } },
      }),
      prisma.teacherClass.groupBy({
        by: ['teacherId'],
        where: { class: { academicYearId: String(yearId2) } },
      }),
    ]);

    // Calculate changes
    const studentChange = stats2.totalStudents - stats1.totalStudents;
    const studentChangePercent = stats1.totalStudents > 0 
      ? ((studentChange / stats1.totalStudents) * 100).toFixed(1) 
      : 0;

    const classChange = stats2.totalClasses - stats1.totalClasses;
    const teacherChange = teachers2.length - teachers1.length;

    res.json({
      success: true,
      data: {
        year1: {
          id: year1.id,
          name: year1.name,
          status: year1.status,
          statistics: {
            totalStudents: stats1.totalStudents,
            totalClasses: stats1.totalClasses,
            totalTeachers: teachers1.length,
            studentsByGrade: stats1.byGrade,
          },
        },
        year2: {
          id: year2.id,
          name: year2.name,
          status: year2.status,
          statistics: {
            totalStudents: stats2.totalStudents,
            totalClasses: stats2.totalClasses,
            totalTeachers: teachers2.length,
            studentsByGrade: stats2.byGrade,
          },
        },
        comparison: {
          studentChange,
          studentChangePercent: `${studentChangePercent}%`,
          classChange,
          teacherChange,
          gradeComparison: Object.keys({ ...stats1.byGrade, ...stats2.byGrade }).map(grade => ({
            grade,
            year1Count: stats1.byGrade[grade] || 0,
            year2Count: stats2.byGrade[grade] || 0,
            change: (stats2.byGrade[grade] || 0) - (stats1.byGrade[grade] || 0),
          })).sort((a, b) => a.grade.localeCompare(b.grade)),
        },
      },
    });
  } catch (error: any) {
    console.error('Error comparing years:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare years',
      message: error.message,
    });
  }
});

// GET /schools/:schoolId/analytics/enrollment-trends
// Get enrollment trends across multiple years
app.get('/schools/:schoolId/analytics/enrollment-trends', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;

    // Get all years for school
    const years = await prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'asc' },
      select: { id: true, name: true, status: true },
    });

    // Get student counts per year
    const trends = await Promise.all(
      years.map(async (year) => {
        const studentCount = await prisma.studentClass.count({
          where: { academicYearId: year.id, status: { in: ['ACTIVE', 'INACTIVE'] } },
        });

        const classCount = await prisma.class.count({
          where: { academicYearId: year.id },
        });

        const teacherCount = await prisma.teacherClass.groupBy({
          by: ['teacherId'],
          where: { class: { academicYearId: year.id } },
        });

        return {
          yearId: year.id,
          yearName: year.name,
          status: year.status,
          students: studentCount,
          classes: classCount,
          teachers: teacherCount.length,
        };
      })
    );

    // Calculate growth rates
    const withGrowth = trends.map((t, i) => ({
      ...t,
      studentGrowth: i > 0 && trends[i - 1].students > 0
        ? (((t.students - trends[i - 1].students) / trends[i - 1].students) * 100).toFixed(1) + '%'
        : 'N/A',
    }));

    res.json({
      success: true,
      data: {
        trends: withGrowth,
        summary: {
          totalYears: years.length,
          earliestYear: years[0]?.name || 'N/A',
          latestYear: years[years.length - 1]?.name || 'N/A',
          totalStudentsAllTime: trends.reduce((sum, t) => sum + t.students, 0),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching enrollment trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch enrollment trends',
      message: error.message,
    });
  }
});

// GET /schools/:schoolId/students/:studentId/history
// Get a student's complete academic history
app.get('/schools/:schoolId/students/:studentId/history', async (req: Request, res: Response) => {
  try {
    const { schoolId, studentId } = req.params;

    // Get student basic info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: {
          select: { id: true, name: true, grade: true },
        },
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
      });
    }

    // Get enrollment history from StudentClass
    const enrollments = await prisma.studentClass.findMany({
      where: { studentId },
      include: {
        class: {
          include: {
            academicYear: { select: { id: true, name: true, status: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    // Get progression history
    const progressions = await prisma.studentProgression.findMany({
      where: { studentId },
      include: {
        fromAcademicYear: { select: { id: true, name: true } },
        toAcademicYear: { select: { id: true, name: true } },
        fromClass: { select: { id: true, name: true, grade: true } },
        toClass: { select: { id: true, name: true, grade: true } },
      },
      orderBy: { promotionDate: 'desc' },
    });

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          studentId: student.studentId,
          name: `${student.firstName} ${student.lastName}`,
          khmerName: student.khmerName,
          gender: student.gender,
          dateOfBirth: student.dateOfBirth,
          createdAt: student.createdAt,
          currentClass: student.class,
        },
        enrollmentHistory: enrollments.map(e => ({
          academicYear: e.class.academicYear,
          class: {
            id: e.class.id,
            name: e.class.name,
            grade: e.class.grade,
            section: e.class.section,
          },
          status: e.status,
          enrolledAt: e.enrolledAt,
        })),
        progressionHistory: progressions.map(p => ({
          fromYear: p.fromAcademicYear,
          toYear: p.toAcademicYear,
          fromClass: p.fromClass,
          toClass: p.toClass,
          promotionType: p.promotionType,
          promotionDate: p.promotionDate,
          notes: p.notes,
        })),
        summary: {
          totalYearsEnrolled: enrollments.length,
          currentGrade: student.class?.grade || 'N/A',
          promotions: progressions.filter(p => p.promotionType === 'AUTOMATIC' || p.promotionType === 'MANUAL').length,
          repeats: progressions.filter(p => p.promotionType === 'REPEAT').length,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching student history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student history',
      message: error.message,
    });
  }
});

// GET /schools/:schoolId/teachers/:teacherId/history
// Get a teacher's assignment history across years
app.get('/schools/:schoolId/teachers/:teacherId/history', async (req: Request, res: Response) => {
  try {
    const { schoolId, teacherId } = req.params;

    // Get teacher basic info
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        hireDate: true,
        role: true,
        position: true,
      },
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: 'Teacher not found',
      });
    }

    // Get class assignments
    const assignments = await prisma.teacherClass.findMany({
      where: { teacherId },
      include: {
        class: {
          include: {
            academicYear: { select: { id: true, name: true, status: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by year
    const byYear = assignments.reduce((acc: any, a) => {
      const yearId = a.class.academicYear.id;
      if (!acc[yearId]) {
        acc[yearId] = {
          academicYear: a.class.academicYear,
          classes: [],
        };
      }
      acc[yearId].classes.push({
        id: a.class.id,
        name: a.class.name,
        grade: a.class.grade,
        section: a.class.section,
        assignedAt: a.createdAt,
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        teacher: {
          id: teacher.id,
          name: `${teacher.firstName} ${teacher.lastName}`,
          email: teacher.email,
          phone: teacher.phoneNumber,
          hireDate: teacher.hireDate,
          role: teacher.role,
          position: teacher.position,
        },
        assignmentHistory: Object.values(byYear),
        summary: {
          totalYearsActive: Object.keys(byYear).length,
          totalClassesTaught: assignments.length,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching teacher history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teacher history',
      message: error.message,
    });
  }
});

// ==============================================
// COMPREHENSIVE ACADEMIC YEAR DETAIL ENDPOINT
// ==============================================

// GET /schools/:schoolId/academic-years/:yearId/comprehensive - Get full year details with all stats
app.get('/schools/:schoolId/academic-years/:yearId/comprehensive', async (req: Request, res: Response) => {
  try {
    const { schoolId, yearId } = req.params;

    // Get academic year with all related data
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: yearId, schoolId },
      include: {
        terms: { orderBy: { termNumber: 'asc' } },
        examTypes: { orderBy: { order: 'asc' } },
        gradingScales: { include: { ranges: { orderBy: { order: 'asc' } } } },
        calendars: { include: { events: { orderBy: { startDate: 'asc' } } } },
      },
    });

    if (!academicYear) {
      return res.status(404).json({ success: false, error: 'Academic year not found' });
    }

    // Get class statistics with student counts
    const classes = await prisma.class.findMany({
      where: { schoolId, academicYearId: yearId },
      include: {
        _count: { select: { students: true } },
        homeroomTeacher: { select: { id: true, firstName: true, lastName: true, khmerName: true } },
      },
      orderBy: [{ grade: 'asc' }, { section: 'asc' }],
    });

    // Get teacher assignments for this year
    const teacherAssignments = await prisma.teacherClass.findMany({
      where: { class: { academicYearId: yearId, schoolId } },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, khmerName: true, position: true } },
        class: { select: { id: true, name: true, grade: true } },
      },
    });

    // Get unique teachers
    const uniqueTeachers = [...new Map(teacherAssignments.map(ta => [ta.teacher.id, ta.teacher])).values()];

    // Get promotion statistics (students promoted FROM this year)
    const promotionsOut = await prisma.studentProgression.findMany({
      where: { fromAcademicYearId: yearId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, khmerName: true, gender: true } },
        fromClass: { select: { name: true, grade: true } },
        toClass: { select: { name: true, grade: true } },
        toAcademicYear: { select: { id: true, name: true } },
      },
    });

    // Get promotion statistics (students promoted INTO this year)
    const promotionsIn = await prisma.studentProgression.findMany({
      where: { toAcademicYearId: yearId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, khmerName: true, gender: true } },
        fromClass: { select: { name: true, grade: true } },
        toClass: { select: { name: true, grade: true } },
        fromAcademicYear: { select: { id: true, name: true } },
      },
    });

    // Calculate statistics
    const totalStudents = classes.reduce((sum, c) => sum + c._count.students, 0);
    const totalClasses = classes.length;
    const totalTeachers = uniqueTeachers.length;

    // Students by grade
    const studentsByGrade: Record<string, number> = {};
    classes.forEach(c => {
      studentsByGrade[c.grade] = (studentsByGrade[c.grade] || 0) + c._count.students;
    });

    // Students by gender
    const genderCounts = await prisma.student.groupBy({
      by: ['gender'],
      where: { class: { academicYearId: yearId, schoolId } },
      _count: { id: true },
    });
    const studentsByGender = genderCounts.reduce((acc, g) => {
      acc[g.gender] = g._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Promotion statistics
    const promotionStats = {
      promotedOut: promotionsOut.filter(p => p.promotionType === 'AUTOMATIC').length,
      repeated: promotionsOut.filter(p => p.promotionType === 'REPEAT').length,
      graduated: promotionsOut.filter(p => p.promotionType === 'MANUAL' && p.toClass.grade === '12').length,
      transferredOut: promotionsOut.filter(p => p.promotionType === 'TRANSFER_OUT').length,
      newAdmissions: promotionsIn.filter(p => p.promotionType === 'NEW_ADMISSION').length,
      transferredIn: promotionsIn.filter(p => p.promotionType === 'TRANSFER_IN').length,
      promotedIn: promotionsIn.filter(p => p.promotionType === 'AUTOMATIC').length,
    };

    // Attendance summary (if available)
    const attendanceSummary = await prisma.attendance.groupBy({
      by: ['status'],
      where: { class: { academicYearId: yearId, schoolId } },
      _count: { id: true },
    });

    // Grade summary (if available)
    const gradeSummary = await prisma.grade.aggregate({
      where: { class: { academicYearId: yearId, schoolId } },
      _avg: { score: true },
      _count: { id: true },
    });

    res.json({
      success: true,
      data: {
        academicYear: {
          id: academicYear.id,
          name: academicYear.name,
          startDate: academicYear.startDate,
          endDate: academicYear.endDate,
          isCurrent: academicYear.isCurrent,
          status: academicYear.status,
          isPromotionDone: academicYear.isPromotionDone,
          promotionDate: academicYear.promotionDate,
          copiedFromYearId: academicYear.copiedFromYearId,
          createdAt: academicYear.createdAt,
          updatedAt: academicYear.updatedAt,
        },
        statistics: {
          totalStudents,
          totalClasses,
          totalTeachers,
          studentsByGrade,
          studentsByGender,
          promotionStats,
          attendance: attendanceSummary.reduce((acc, a) => {
            acc[a.status] = a._count.id;
            return acc;
          }, {} as Record<string, number>),
          grades: {
            averageScore: gradeSummary._avg.score,
            totalGradeEntries: gradeSummary._count.id,
          },
        },
        classes: classes.map(c => ({
          id: c.id,
          name: c.name,
          grade: c.grade,
          section: c.section,
          track: c.track,
          capacity: c.capacity,
          studentCount: c._count.students,
          isAtCapacity: c.capacity ? c._count.students >= c.capacity : false,
          homeroomTeacher: c.homeroomTeacher ? {
            id: c.homeroomTeacher.id,
            name: c.homeroomTeacher.khmerName || `${c.homeroomTeacher.firstName} ${c.homeroomTeacher.lastName}`,
          } : null,
        })),
        teachers: uniqueTeachers.map(t => ({
          id: t.id,
          name: t.khmerName || `${t.firstName} ${t.lastName}`,
          position: t.position,
          classCount: teacherAssignments.filter(ta => ta.teacher.id === t.id).length,
        })),
        terms: academicYear.terms,
        examTypes: academicYear.examTypes,
        gradingScales: academicYear.gradingScales,
        calendar: academicYear.calendars[0] || null,
        promotionHistory: {
          promotedOut: promotionsOut.slice(0, 20).map(p => ({
            studentId: p.student.id,
            studentName: p.student.khmerName || `${p.student.firstName} ${p.student.lastName}`,
            gender: p.student.gender,
            fromClass: p.fromClass.name,
            toClass: p.toClass.name,
            toYear: p.toAcademicYear.name,
            type: p.promotionType,
            date: p.promotionDate,
          })),
          promotedIn: promotionsIn.slice(0, 20).map(p => ({
            studentId: p.student.id,
            studentName: p.student.khmerName || `${p.student.firstName} ${p.student.lastName}`,
            gender: p.student.gender,
            fromClass: p.fromClass.name,
            toClass: p.toClass.name,
            fromYear: p.fromAcademicYear.name,
            type: p.promotionType,
            date: p.promotionDate,
          })),
          totalPromotedOut: promotionsOut.length,
          totalPromotedIn: promotionsIn.length,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching comprehensive year details:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch year details', message: error.message });
  }
});

// GET /schools/:schoolId/academic-years/:yearId/calendar - Get academic calendar
app.get('/schools/:schoolId/academic-years/:yearId/calendar', async (req: Request, res: Response) => {
  try {
    const { schoolId, yearId } = req.params;

    const calendar = await prisma.academicCalendar.findFirst({
      where: { academicYearId: yearId },
      include: {
        events: { orderBy: { startDate: 'asc' } },
        academicYear: { select: { name: true, startDate: true, endDate: true } },
      },
    });

    if (!calendar) {
      // Return empty calendar if none exists
      return res.json({
        success: true,
        data: {
          id: null,
          name: 'No calendar',
          events: [],
          academicYear: null,
        },
      });
    }

    res.json({ success: true, data: calendar });
  } catch (error: any) {
    console.error('Error fetching calendar:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch calendar' });
  }
});

// POST /schools/:schoolId/academic-years/:yearId/calendar/events - Add calendar event
app.post('/schools/:schoolId/academic-years/:yearId/calendar/events', async (req: Request, res: Response) => {
  try {
    const { schoolId, yearId } = req.params;
    const { type, title, description, startDate, endDate, isSchoolDay, isPublic } = req.body;

    // Get or create calendar
    let calendar = await prisma.academicCalendar.findFirst({
      where: { academicYearId: yearId },
    });

    if (!calendar) {
      calendar = await prisma.academicCalendar.create({
        data: {
          academicYearId: yearId,
          name: 'School Calendar',
        },
      });
    }

    const event = await prisma.calendarEvent.create({
      data: {
        calendarId: calendar.id,
        type: type || 'SPECIAL_EVENT',
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate || startDate),
        isSchoolDay: isSchoolDay !== false,
        isPublic: isPublic !== false,
      },
    });

    res.json({ success: true, data: event });
  } catch (error: any) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, error: 'Failed to create event' });
  }
});

// DELETE /schools/:schoolId/academic-years/:yearId/calendar/events/:eventId - Delete event
app.delete('/schools/:schoolId/academic-years/:yearId/calendar/events/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    await prisma.calendarEvent.delete({ where: { id: eventId } });

    res.json({ success: true, message: 'Event deleted' });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    res.status(500).json({ success: false, error: 'Failed to delete event' });
  }
});

// ============================================================
// 📅 NEW YEAR SETUP WIZARD API
// ============================================================

// GET /schools/:schoolId/academic-years/:yearId/template - Get year as template for copying
app.get('/schools/:schoolId/academic-years/:yearId/template', async (req: Request, res: Response) => {
  try {
    const { schoolId, yearId } = req.params;

    const year = await prisma.academicYear.findFirst({
      where: { id: yearId, schoolId },
      include: {
        terms: { orderBy: { termNumber: 'asc' } },
        examTypes: { orderBy: { order: 'asc' } },
        gradingScales: {
          include: { ranges: { orderBy: { order: 'asc' } } }
        },
        classes: {
          include: { teacherClasses: { include: { teacher: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } } } },
          orderBy: [{ grade: 'asc' }, { section: 'asc' }]
        },
        calendars: {
          include: { events: { orderBy: { startDate: 'asc' } } }
        }
      }
    });

    if (!year) {
      return res.status(404).json({ success: false, error: 'Academic year not found' });
    }

    // Calculate next year suggestion
    const currentYearMatch = year.name.match(/(\d{4})/);
    let suggestedName = '';
    let suggestedStartDate = new Date(year.startDate);
    let suggestedEndDate = new Date(year.endDate);
    
    if (currentYearMatch) {
      const currentYearNum = parseInt(currentYearMatch[1]);
      if (year.name.includes('-')) {
        // Format: 2024-2025
        suggestedName = `${currentYearNum + 1}-${currentYearNum + 2}`;
      } else {
        // Format: 2024
        suggestedName = `${currentYearNum + 1}`;
      }
    }
    
    // Move dates forward by 1 year
    suggestedStartDate.setFullYear(suggestedStartDate.getFullYear() + 1);
    suggestedEndDate.setFullYear(suggestedEndDate.getFullYear() + 1);

    res.json({
      success: true,
      data: {
        sourceYear: year,
        suggested: {
          name: suggestedName,
          startDate: suggestedStartDate.toISOString().split('T')[0],
          endDate: suggestedEndDate.toISOString().split('T')[0]
        },
        copyOptions: {
          terms: year.terms?.length || 0,
          examTypes: year.examTypes?.length || 0,
          gradingScales: year.gradingScales?.length || 0,
          classes: year.classes?.length || 0,
          holidays: year.calendars?.[0]?.events?.filter((e: any) => e.type === 'HOLIDAY').length || 0
        }
      }
    });
  } catch (error: any) {
    console.error('Error getting year template:', error);
    res.status(500).json({ success: false, error: 'Failed to get year template' });
  }
});

// POST /schools/:schoolId/academic-years/wizard - Create new year with wizard
app.post('/schools/:schoolId/academic-years/wizard', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const {
      // Basic info
      name,
      startDate,
      endDate,
      copyFromYearId,
      // Copy options
      copyTerms = true,
      copyExamTypes = true,
      copyGradingScales = true,
      copyClasses = true,
      copyHolidays = true,
      // Custom config (if not copying)
      terms,
      examTypes,
      gradingScales,
      classes,
      holidays
    } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Name, start date, and end date are required' });
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the academic year
      const newYear = await tx.academicYear.create({
        data: {
          schoolId,
          name,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: 'PLANNING',
          isCurrent: false,
          copiedFromYearId: copyFromYearId || null
        }
      });

      let sourceYear: any = null;
      if (copyFromYearId) {
        sourceYear = await tx.academicYear.findUnique({
          where: { id: copyFromYearId },
          include: {
            terms: { orderBy: { termNumber: 'asc' } },
            examTypes: { orderBy: { order: 'asc' } },
            gradingScales: { include: { ranges: { orderBy: { order: 'asc' } } } },
            classes: { orderBy: [{ grade: 'asc' }, { section: 'asc' }] },
            calendars: { include: { events: true } }
          }
        });
      }

      // 2. Create terms
      let createdTerms: any[] = [];
      if (copyTerms && sourceYear?.terms?.length) {
        // Calculate date offset
        const sourceStart = new Date(sourceYear.startDate);
        const newStart = new Date(startDate);
        const dayOffset = Math.round((newStart.getTime() - sourceStart.getTime()) / (1000 * 60 * 60 * 24));

        for (const term of sourceYear.terms) {
          const termStart = new Date(term.startDate);
          const termEnd = new Date(term.endDate);
          termStart.setDate(termStart.getDate() + dayOffset);
          termEnd.setDate(termEnd.getDate() + dayOffset);

          createdTerms.push(await tx.academicTerm.create({
            data: {
              academicYearId: newYear.id,
              name: term.name,
              termNumber: term.termNumber,
              startDate: termStart,
              endDate: termEnd
            }
          }));
        }
      } else if (terms?.length) {
        for (const term of terms) {
          createdTerms.push(await tx.academicTerm.create({
            data: {
              academicYearId: newYear.id,
              name: term.name,
              termNumber: term.termNumber,
              startDate: new Date(term.startDate),
              endDate: new Date(term.endDate)
            }
          }));
        }
      }

      // 3. Create exam types
      let createdExamTypes: any[] = [];
      if (copyExamTypes && sourceYear?.examTypes?.length) {
        for (const examType of sourceYear.examTypes) {
          // Map to new term if applicable
          let newTermId = null;
          if (examType.termId && createdTerms.length) {
            const sourceTerm = sourceYear.terms.find((t: any) => t.id === examType.termId);
            if (sourceTerm) {
              const newTerm = createdTerms.find(t => t.termNumber === sourceTerm.termNumber);
              if (newTerm) newTermId = newTerm.id;
            }
          }

          createdExamTypes.push(await tx.examType.create({
            data: {
              academicYearId: newYear.id,
              termId: newTermId,
              name: examType.name,
              weight: examType.weight,
              maxScore: examType.maxScore,
              order: examType.order
            }
          }));
        }
      } else if (examTypes?.length) {
        for (const et of examTypes) {
          createdExamTypes.push(await tx.examType.create({
            data: {
              academicYearId: newYear.id,
              name: et.name,
              weight: et.weight,
              maxScore: et.maxScore || 100,
              order: et.order || 0
            }
          }));
        }
      }

      // 4. Create grading scales
      let createdGradingScales: any[] = [];
      if (copyGradingScales && sourceYear?.gradingScales?.length) {
        for (const scale of sourceYear.gradingScales) {
          const newScale = await tx.gradingScale.create({
            data: {
              academicYearId: newYear.id,
              name: scale.name,
              isDefault: scale.isDefault
            }
          });

          for (const range of scale.ranges) {
            await tx.gradeRange.create({
              data: {
                gradingScaleId: newScale.id,
                grade: range.grade,
                minScore: range.minScore,
                maxScore: range.maxScore,
                gpa: range.gpa,
                description: range.description,
                color: range.color,
                order: range.order
              }
            });
          }

          createdGradingScales.push(newScale);
        }
      } else if (gradingScales?.length) {
        for (const gs of gradingScales) {
          const newScale = await tx.gradingScale.create({
            data: {
              academicYearId: newYear.id,
              name: gs.name,
              isDefault: gs.isDefault || false
            }
          });

          if (gs.ranges?.length) {
            for (const range of gs.ranges) {
              await tx.gradeRange.create({
                data: {
                  gradingScaleId: newScale.id,
                  grade: range.grade,
                  minScore: range.minScore,
                  maxScore: range.maxScore,
                  gpa: range.gpa,
                  description: range.description,
                  color: range.color || '#10B981',
                  order: range.order || 0
                }
              });
            }
          }

          createdGradingScales.push(newScale);
        }
      }

      // 5. Create classes (without students - they need to be promoted separately)
      let createdClasses: any[] = [];
      if (copyClasses && sourceYear?.classes?.length) {
        for (const cls of sourceYear.classes) {
          createdClasses.push(await tx.class.create({
            data: {
              schoolId,
              academicYearId: newYear.id,
              name: cls.name,
              grade: cls.grade,
              section: cls.section,
              capacity: cls.capacity
            }
          }));
        }
      } else if (classes?.length) {
        for (const cls of classes) {
          createdClasses.push(await tx.class.create({
            data: {
              schoolId,
              academicYearId: newYear.id,
              name: cls.name,
              grade: String(cls.gradeLevel || cls.grade),
              section: cls.section,
              capacity: cls.capacity || 40
            }
          }));
        }
      }

      // 6. Create calendar with holidays
      const newCalendar = await tx.academicCalendar.create({
        data: {
          academicYearId: newYear.id,
          name: 'School Calendar'
        }
      });

      let createdHolidays: any[] = [];
      if (copyHolidays && sourceYear?.calendars?.[0]?.events?.length) {
        // Calculate date offset
        const sourceStart = new Date(sourceYear.startDate);
        const newStart = new Date(startDate);
        const dayOffset = Math.round((newStart.getTime() - sourceStart.getTime()) / (1000 * 60 * 60 * 24));

        for (const event of sourceYear.calendars[0].events) {
          const eventStart = new Date(event.startDate);
          const eventEnd = new Date(event.endDate);
          eventStart.setDate(eventStart.getDate() + dayOffset);
          eventEnd.setDate(eventEnd.getDate() + dayOffset);

          createdHolidays.push(await tx.calendarEvent.create({
            data: {
              calendarId: newCalendar.id,
              type: event.type,
              title: event.title,
              description: event.description,
              startDate: eventStart,
              endDate: eventEnd,
              isSchoolDay: event.isSchoolDay,
              isPublic: event.isPublic
            }
          }));
        }
      } else if (holidays?.length) {
        for (const h of holidays) {
          createdHolidays.push(await tx.calendarEvent.create({
            data: {
              calendarId: newCalendar.id,
              type: h.type || 'HOLIDAY',
              title: h.title,
              description: h.description,
              startDate: new Date(h.startDate),
              endDate: new Date(h.endDate),
              isSchoolDay: h.isSchoolDay ?? false,
              isPublic: h.isPublic ?? true
            }
          }));
        }
      }

      return {
        year: newYear,
        stats: {
          terms: createdTerms.length,
          examTypes: createdExamTypes.length,
          gradingScales: createdGradingScales.length,
          classes: createdClasses.length,
          holidays: createdHolidays.length
        }
      };
    });

    res.status(201).json({
      success: true,
      data: result,
      message: `Academic year "${name}" created successfully with all configurations`
    });
  } catch (error: any) {
    console.error('Error creating year with wizard:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create academic year' });
  }
});

// GET /schools/:schoolId/setup-templates - Get default templates for new year setup
app.get('/schools/:schoolId/setup-templates', async (req: Request, res: Response) => {
  try {
    // Return default templates that can be used for new year setup
    res.json({
      success: true,
      data: {
        defaultTerms: DEFAULT_TERMS,
        defaultExamTypes: DEFAULT_EXAM_TYPES,
        defaultGradingScale: STANDARD_GRADING_SCALE,
        cambodianHolidays: getCambodianHolidays(new Date().getFullYear())
      }
    });
  } catch (error: any) {
    console.error('Error getting setup templates:', error);
    res.status(500).json({ success: false, error: 'Failed to get setup templates' });
  }
});

// ============================================================
// 📊 YEAR-OVER-YEAR COMPARISON API
// ============================================================

// GET /schools/:schoolId/academic-years/comparison - Compare multiple years
app.get('/schools/:schoolId/academic-years/comparison', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const { yearIds } = req.query; // Comma-separated year IDs or 'all'

    // Get years to compare
    let years;
    if (yearIds === 'all') {
      years = await prisma.academicYear.findMany({
        where: { schoolId },
        orderBy: { startDate: 'desc' },
        take: 5 // Last 5 years
      });
    } else if (yearIds) {
      const ids = (yearIds as string).split(',');
      years = await prisma.academicYear.findMany({
        where: { id: { in: ids }, schoolId },
        orderBy: { startDate: 'desc' }
      });
    } else {
      years = await prisma.academicYear.findMany({
        where: { schoolId },
        orderBy: { startDate: 'desc' },
        take: 3 // Default to last 3 years
      });
    }

    // Gather stats for each year
    const yearComparisons = await Promise.all(years.map(async (year) => {
      // Get classes for this year
      const classesForYear = await prisma.class.findMany({
        where: { schoolId, academicYearId: year.id },
        select: { id: true, grade: true }
      });
      const classIds = classesForYear.map(c => c.id);

      // Student counts - count studentClasses in classes for this year
      const studentClassEntries = await prisma.studentClass.findMany({
        where: { classId: { in: classIds } },
        distinct: ['studentId'],
        select: { studentId: true }
      });
      const students = studentClassEntries.length;

      // Teacher counts - teachers assigned to classes in this year
      const teacherAssignments = await prisma.teacherClass.findMany({
        where: { classId: { in: classIds } },
        distinct: ['teacherId'],
        select: { teacherId: true }
      });
      const teacherCount = teacherAssignments.length;

      const homeroomClasses = await prisma.class.findMany({
        where: { schoolId, academicYearId: year.id, homeroomTeacherId: { not: null } },
        distinct: ['homeroomTeacherId'],
        select: { homeroomTeacherId: true }
      });

      const teachers = Math.max(teacherCount, homeroomClasses.length);

      // Class counts
      const classCount = classesForYear.length;

      // Class breakdown by grade
      const classesByGrade: Record<string, number> = {};
      classesForYear.forEach(c => {
        const key = `Grade ${c.grade}`;
        classesByGrade[key] = (classesByGrade[key] || 0) + 1;
      });

      // Student counts by gender
      const enrolledStudentIds = studentClassEntries.map(e => e.studentId);
      
      let studentsByGender: Record<string, number> = {};
      if (enrolledStudentIds.length > 0) {
        const studentGenders = await prisma.student.groupBy({
          by: ['gender'],
          where: { id: { in: enrolledStudentIds } },
          _count: true
        });
        studentGenders.forEach(g => {
          studentsByGender[g.gender || 'Unknown'] = g._count;
        });
      }

      // Promotion stats (if year ended)
      const promotionStats = await prisma.studentProgression.groupBy({
        by: ['promotionType'],
        where: { fromAcademicYearId: year.id },
        _count: true
      });

      const promotions: Record<string, number> = {};
      promotionStats.forEach(p => {
        promotions[p.promotionType] = p._count;
      });

      // Subject count
      const subjects = await prisma.subject.count({
        where: {}
      });

      return {
        year: {
          id: year.id,
          name: year.name,
          startDate: year.startDate,
          endDate: year.endDate,
          status: year.status,
          isCurrent: year.isCurrent
        },
        stats: {
          totalStudents: students,
          totalTeachers: teachers,
          totalClasses: classCount,
          totalSubjects: subjects,
          studentsByGender,
          classesByGrade,
          promotions
        }
      };
    }));

    // Calculate trends (compare with previous year)
    const trends = yearComparisons.map((current, index) => {
      if (index === yearComparisons.length - 1) {
        return { yearId: current.year.id, changes: null };
      }
      const previous = yearComparisons[index + 1];
      return {
        yearId: current.year.id,
        changes: {
          students: {
            value: current.stats.totalStudents - previous.stats.totalStudents,
            percentage: previous.stats.totalStudents > 0 
              ? ((current.stats.totalStudents - previous.stats.totalStudents) / previous.stats.totalStudents * 100).toFixed(1)
              : null
          },
          teachers: {
            value: current.stats.totalTeachers - previous.stats.totalTeachers,
            percentage: previous.stats.totalTeachers > 0
              ? ((current.stats.totalTeachers - previous.stats.totalTeachers) / previous.stats.totalTeachers * 100).toFixed(1)
              : null
          },
          classes: {
            value: current.stats.totalClasses - previous.stats.totalClasses,
            percentage: previous.stats.totalClasses > 0
              ? ((current.stats.totalClasses - previous.stats.totalClasses) / previous.stats.totalClasses * 100).toFixed(1)
              : null
          }
        }
      };
    });

    res.json({
      success: true,
      data: {
        years: yearComparisons,
        trends,
        summary: {
          totalYearsCompared: yearComparisons.length,
          latestYear: yearComparisons[0]?.year.name || null,
          oldestYear: yearComparisons[yearComparisons.length - 1]?.year.name || null
        }
      }
    });
  } catch (error: any) {
    console.error('Error comparing years:', error);
    res.status(500).json({ success: false, error: 'Failed to compare academic years' });
  }
});

// ============================================================================
// CLAIM CODE MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * POST /schools/:id/claim-codes/generate
 * Generate claim codes for students or teachers
 * Supports bulk generation
 */
app.post('/schools/:id/claim-codes/generate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, count = 1, studentIds, teacherIds, expiresInDays = 365 } = req.body;

    // Validate type
    if (!type || !['STUDENT', 'TEACHER', 'STAFF', 'PARENT'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Valid claim code type is required (STUDENT, TEACHER, STAFF, or PARENT)',
      });
    }

    // Check if school exists
    const school = await prisma.school.findUnique({
      where: { id },
    });

    if (!school) {
      return res.status(404).json({
        success: false,
        error: 'School not found',
      });
    }

    const codes = [];

    // Generate codes for specific students
    if (type === 'STUDENT' && studentIds && Array.isArray(studentIds)) {
      for (const studentId of studentIds) {
        const student = await prisma.student.findUnique({
          where: { id: studentId },
        });

        if (!student || student.schoolId !== id) {
          continue; // Skip invalid students
        }

        const code = ClaimCodeGenerator.generateCode(type);
        const expiresAt = ClaimCodeGenerator.generateExpirationDate(expiresInDays);

        const claimCode = await prisma.claimCode.create({
          data: {
            code,
            type,
            schoolId: id,
            studentId,
            expiresAt,
            verificationData: {
              firstName: student.firstName,
              lastName: student.lastName,
              dateOfBirth: student.dateOfBirth,
            },
          },
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        codes.push(claimCode);
      }
    }
    // Generate codes for specific teachers
    else if (type === 'TEACHER' && teacherIds && Array.isArray(teacherIds)) {
      for (const teacherId of teacherIds) {
        const teacher = await prisma.teacher.findUnique({
          where: { id: teacherId },
        });

        if (!teacher || teacher.schoolId !== id) {
          continue; // Skip invalid teachers
        }

        const code = ClaimCodeGenerator.generateCode(type);
        const expiresAt = ClaimCodeGenerator.generateExpirationDate(expiresInDays);

        const claimCode = await prisma.claimCode.create({
          data: {
            code,
            type,
            schoolId: id,
            teacherId,
            expiresAt,
            verificationData: {
              firstName: teacher.firstName,
              lastName: teacher.lastName,
              dateOfBirth: teacher.dateOfBirth,
            },
          },
          include: {
            teacher: {
              select: {
                id: true,
                teacherId: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        codes.push(claimCode);
      }
    }
    // Generate generic codes (not linked to specific people)
    else {
      for (let i = 0; i < count; i++) {
        const code = ClaimCodeGenerator.generateCode(type);
        const expiresAt = ClaimCodeGenerator.generateExpirationDate(expiresInDays);

        const claimCode = await prisma.claimCode.create({
          data: {
            code,
            type,
            schoolId: id,
            expiresAt,
          },
        });

        codes.push(claimCode);
      }
    }

    res.status(201).json({
      success: true,
      message: `Generated ${codes.length} claim code(s)`,
      data: {
        codes,
        count: codes.length,
      },
    });
  } catch (error: any) {
    console.error('Generate claim codes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate claim codes',
      details: error.message,
    });
  }
});

/**
 * POST /schools/:id/claim-codes/bulk-upload
 * Bulk upload students from CSV and generate claim codes
 * Supports email detection and auto-send
 */
app.post('/schools/:id/claim-codes/bulk-upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type = 'STUDENT', expiresInDays = 30, sendEmails = 'true' } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is required',
      });
    }

    // Check if school exists
    const school = await prisma.school.findUnique({
      where: { id },
    });

    if (!school) {
      return res.status(404).json({
        success: false,
        error: 'School not found',
      });
    }

    // Parse CSV
    const csvContent = file.buffer.toString('utf-8');
    let records: any[];
    
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseError: any) {
      return res.status(400).json({
        success: false,
        error: 'Invalid CSV format',
        details: parseError.message,
      });
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is empty',
      });
    }

    // Process each record
    const codes = [];
    const emailList = [];
    const manualList = [];
    const errors = [];

    for (const record of records) {
      try {
        const firstName = record.firstName || record.first_name || '';
        const lastName = record.lastName || record.last_name || '';
        const email = record.email || '';
        const phone = record.phone || record.phoneNumber || record.phone_number || '';
        const grade = record.grade || '';
        const studentId = record.studentId || record.student_id || '';

        if (!firstName || !lastName) {
          errors.push({
            row: records.indexOf(record) + 2, // +2 for header and 0-index
            error: 'Missing first name or last name',
          });
          continue;
        }

        if (!email && !phone) {
          errors.push({
            row: records.indexOf(record) + 2,
            error: 'Missing both email and phone',
            name: `${firstName} ${lastName}`,
          });
          continue;
        }

        // Generate code
        const code = ClaimCodeGenerator.generateCode(type);
        const expiresAt = ClaimCodeGenerator.generateExpirationDate(expiresInDays);

        // Create claim code in database
        const claimCode = await prisma.claimCode.create({
          data: {
            code,
            type,
            schoolId: id,
            expiresAt,
            isActive: true,
            verificationData: JSON.stringify({
              firstName,
              lastName,
              email: email || null,
              phone: phone || null,
              grade: grade || null,
              studentId: studentId || null,
            }),
          },
        });

        codes.push(claimCode);

        // Categorize for distribution
        if (email) {
          emailList.push({
            name: `${firstName} ${lastName}`,
            email,
            code: claimCode.code,
            grade,
          });
        } else if (phone) {
          manualList.push({
            name: `${firstName} ${lastName}`,
            phone,
            code: claimCode.code,
            grade,
          });
        }
      } catch (error: any) {
        errors.push({
          row: records.indexOf(record) + 2,
          error: error.message,
        });
      }
    }

    // Prepare response
    const response: any = {
      success: true,
      message: `Processed ${codes.length} codes from ${records.length} records`,
      data: {
        total: codes.length,
        distribution: {
          emailSent: emailList.length,
          manualRequired: manualList.length,
          failed: errors.length,
        },
        codes,
        emailList: sendEmails === 'true' ? emailList : [],
        manualList,
        errors: errors.length > 0 ? errors : undefined,
      },
    };

    // TODO: Send emails here if sendEmails is true
    // For now, we'll just prepare the list
    if (sendEmails === 'true' && emailList.length > 0) {
      response.data.emailNote = 'Email sending will be implemented in next phase';
    }

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process bulk upload',
      details: error.message,
    });
  }
});

/**
 * GET /schools/:id/claim-codes
 * List claim codes for a school
 * Supports filtering by type, status (active, claimed, expired)
 */
app.get('/schools/:id/claim-codes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, status, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      schoolId: id,
    };

    if (type) {
      where.type = type;
    }

    // Filter by status
    if (status === 'active') {
      where.isActive = true;
      where.claimedAt = null;
      where.revokedAt = null;
      where.expiresAt = { gt: new Date() };
    } else if (status === 'claimed') {
      where.claimedAt = { not: null };
    } else if (status === 'expired') {
      where.expiresAt = { lt: new Date() };
      where.claimedAt = null;
    } else if (status === 'revoked') {
      where.revokedAt = { not: null };
    }

    // Get total count
    const total = await prisma.claimCode.count({ where });

    // Get codes with pagination
    const codes = await prisma.claimCode.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
          },
        },
        teacher: {
          select: {
            id: true,
            teacherId: true,
            firstName: true,
            lastName: true,
          },
        },
        claimedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limitNum,
    });

    res.json({
      success: true,
      data: {
        codes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('List claim codes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list claim codes',
      details: error.message,
    });
  }
});

/**
 * GET /schools/:id/claim-codes/stats
 * Get claim code statistics for a school
 */
app.get('/schools/:id/claim-codes/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const now = new Date();

    // Get total codes
    const total = await prisma.claimCode.count({
      where: { schoolId: id },
    });

    // Get active codes (not claimed, not expired, not revoked)
    const active = await prisma.claimCode.count({
      where: {
        schoolId: id,
        isActive: true,
        claimedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
    });

    // Get claimed codes
    const claimed = await prisma.claimCode.count({
      where: {
        schoolId: id,
        claimedAt: { not: null },
      },
    });

    // Get expired codes
    const expired = await prisma.claimCode.count({
      where: {
        schoolId: id,
        expiresAt: { lt: now },
        claimedAt: null,
      },
    });

    // Get revoked codes
    const revoked = await prisma.claimCode.count({
      where: {
        schoolId: id,
        revokedAt: { not: null },
      },
    });

    // Get codes by type
    const byType = await prisma.claimCode.groupBy({
      by: ['type'],
      where: { schoolId: id },
      _count: true,
    });

    const typeStats = byType.reduce((acc: any, curr: any) => {
      acc[curr.type] = curr._count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        total,
        active,
        claimed,
        expired,
        revoked,
        byType: typeStats,
      },
    });
  } catch (error: any) {
    console.error('Get claim code stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get claim code statistics',
      details: error.message,
    });
  }
});

/**
 * GET /schools/:id/claim-codes/:codeId
 * Get details of a specific claim code
 */
app.get('/schools/:id/claim-codes/:codeId', async (req: Request, res: Response) => {
  try {
    const { id, codeId } = req.params;

    const claimCode = await prisma.claimCode.findFirst({
      where: {
        id: codeId,
        schoolId: id,
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        teacher: {
          select: {
            id: true,
            teacherId: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        claimedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!claimCode) {
      return res.status(404).json({
        success: false,
        error: 'Claim code not found',
      });
    }

    // Add status information
    const now = new Date();
    const isExpired = claimCode.expiresAt && claimCode.expiresAt < now;
    const isClaimed = !!claimCode.claimedAt;
    const isRevoked = !!claimCode.revokedAt;
    const isActive = claimCode.isActive && !isExpired && !isClaimed && !isRevoked;

    res.json({
      success: true,
      data: {
        ...claimCode,
        status: {
          isActive,
          isClaimed,
          isExpired,
          isRevoked,
        },
      },
    });
  } catch (error: any) {
    console.error('Get claim code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get claim code',
      details: error.message,
    });
  }
});

/**
 * POST /schools/:id/claim-codes/:codeId/revoke
 * Revoke a claim code
 */
app.post('/schools/:id/claim-codes/:codeId/revoke', async (req: Request, res: Response) => {
  try {
    const { id, codeId } = req.params;
    const { reason } = req.body;

    const claimCode = await prisma.claimCode.findFirst({
      where: {
        id: codeId,
        schoolId: id,
      },
    });

    if (!claimCode) {
      return res.status(404).json({
        success: false,
        error: 'Claim code not found',
      });
    }

    if (claimCode.claimedAt) {
      return res.status(400).json({
        success: false,
        error: 'Cannot revoke a claim code that has already been claimed',
      });
    }

    if (claimCode.revokedAt) {
      return res.status(400).json({
        success: false,
        error: 'Claim code is already revoked',
      });
    }

    const updated = await prisma.claimCode.update({
      where: { id: codeId },
      data: {
        revokedAt: new Date(),
        revokedReason: reason || 'Revoked by administrator',
        isActive: false,
      },
    });

    res.json({
      success: true,
      message: 'Claim code revoked successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('Revoke claim code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke claim code',
      details: error.message,
    });
  }
});

/**
 * GET /schools/:id/claim-codes/export
 * Export claim codes as CSV
 * Useful for printing and distribution
 */
app.get('/schools/:id/claim-codes/export', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, status } = req.query;

    // Build where clause
    const where: any = {
      schoolId: id,
    };

    if (type) {
      where.type = type;
    }

    if (status === 'active') {
      where.isActive = true;
      where.claimedAt = null;
      where.revokedAt = null;
      where.expiresAt = { gt: new Date() };
    } else if (status === 'unclaimed') {
      where.claimedAt = null;
      where.revokedAt = null;
    }

    // Get codes
    const codes = await prisma.claimCode.findMany({
      where,
      include: {
        student: {
          select: {
            studentId: true,
            firstName: true,
            lastName: true,
          },
        },
        teacher: {
          select: {
            teacherId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Generate CSV
    const csvRows = [
      'Code,Type,Person ID,Name,Expires At,Status,Created At',
    ];

    for (const code of codes) {
      const personId = code.student?.studentId || code.teacher?.teacherId || '';
      const personName = code.student
        ? `${code.student.firstName} ${code.student.lastName}`
        : code.teacher
        ? `${code.teacher.firstName} ${code.teacher.lastName}`
        : '';
      
      const now = new Date();
      const isExpired = code.expiresAt && code.expiresAt < now;
      const isClaimed = !!code.claimedAt;
      const isRevoked = !!code.revokedAt;
      const status = isRevoked ? 'Revoked' : isClaimed ? 'Claimed' : isExpired ? 'Expired' : 'Active';

      csvRows.push(
        `${code.code},${code.type},${personId},"${personName}",${code.expiresAt?.toISOString() || ''},${status},${code.createdAt.toISOString()}`
      );
    }

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="claim-codes-${id}-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error('Export claim codes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export claim codes',
      details: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   🏫 School Service - Stunity Enterprise v2.4    ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 API info: http://localhost:${PORT}/api/info\n`);
  console.log('📋 Academic Year APIs:');
  console.log('   - GET /schools/:id/academic-years/:yearId/comprehensive');
  console.log('   - GET /schools/:id/academic-years/:yearId/calendar');
  console.log('   - POST /schools/:id/academic-years/:yearId/calendar/events');
  console.log('   - DELETE /schools/:id/academic-years/:yearId/calendar/events/:eventId');
  console.log('   - GET /schools/:id/academic-years/:yearId/template');
  console.log('   - POST /schools/:id/academic-years/wizard');
  console.log('   - GET /schools/:id/setup-templates');
  console.log('   - GET /schools/:id/academic-years/comparison');
  console.log('');
  console.log('🎫 Claim Code Management APIs:');
  console.log('   - POST /schools/:id/claim-codes/generate       - Generate claim codes');
  console.log('   - GET  /schools/:id/claim-codes                - List claim codes');
  console.log('   - GET  /schools/:id/claim-codes/:codeId        - Get code details');
  console.log('   - GET  /schools/:id/claim-codes/export         - Export as CSV');
  console.log('   - POST /schools/:id/claim-codes/:codeId/revoke - Revoke a code\n');
  console.log('Press Ctrl+C to stop');
});

export default app;
