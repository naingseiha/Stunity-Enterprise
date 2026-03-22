import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';

// Load environment variables from root .env
dotenv.config({ path: '../../.env' });

const app = express();
app.set('trust proxy', 1); // ✅ Required for Cloud Run/Vercel (X-Forwarded-For)
const PORT = process.env.PORT || process.env.GRADE_SERVICE_PORT || 3007;
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET must be set in production. Refusing to start.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';

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

// Keep database connection warm (Supabase Pooler)
let isDbWarm = false;
const warmUpDb = async () => {
  if (isDbWarm) return;
  try {
    await prisma.$queryRaw`SELECT 1`;
    isDbWarm = true;
    console.log('✅ Grade Service - Database ready');
  } catch (error) {
    console.error('⚠️ Grade Service - Database warmup failed');
  }
};
warmUpDb();
setInterval(() => { isDbWarm = false; warmUpDb(); }, 4 * 60 * 1000); // Every 4 minutes

// ========================================
// Middleware
// ========================================

const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow all origins in production if CORS_ORIGIN is set to *
    if (process.env.CORS_ORIGIN === '*') return callback(null, true);
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many requests' } }));
app.use(express.json({ limit: '1mb' }));

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    schoolId?: string;
    school?: {
      id: string;
    };
  };
}

const authenticateToken = (req: AuthRequest, res: Response, next: Function) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

const getSchoolId = (req: AuthRequest): string | null => {
  return req.user?.schoolId || req.user?.school?.id || null;
};

const gradeGridCache = new Map<string, { data: any; timestamp: number }>();
const GRADE_GRID_CACHE_TTL_MS = 2 * 60 * 1000;
const gradeReportCache = new Map<string, { data: any; timestamp: number }>();
const GRADE_REPORT_CACHE_TTL_MS = 2 * 60 * 1000;

function readGradeGridCache(cacheKey: string) {
  const cached = gradeGridCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > GRADE_GRID_CACHE_TTL_MS) {
    gradeGridCache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

function writeGradeGridCache(cacheKey: string, data: any) {
  gradeGridCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
}

function clearGradeGridCache(schoolId?: string | null) {
  for (const key of gradeGridCache.keys()) {
    if (!schoolId || key.startsWith(`${schoolId}:`)) {
      gradeGridCache.delete(key);
    }
  }
}

function readGradeReportCache(cacheKey: string) {
  const cached = gradeReportCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > GRADE_REPORT_CACHE_TTL_MS) {
    gradeReportCache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

function writeGradeReportCache(cacheKey: string, data: any) {
  gradeReportCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
}

function clearGradeReportCache(schoolId?: string | null) {
  for (const key of gradeReportCache.keys()) {
    if (!schoolId || key.startsWith(`${schoolId}:`)) {
      gradeReportCache.delete(key);
    }
  }
}

function clearGradeCaches(schoolId?: string | null) {
  clearGradeGridCache(schoolId);
  clearGradeReportCache(schoolId);
}

// ========================================
// Health Check (No Auth Required)
// ========================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    service: 'grade-service',
    status: 'healthy',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Apply authentication to all routes below this point
app.use(authenticateToken);

// ========================================
// Notification Helper
// ========================================

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

// Send notification to parent(s) of a student
const notifyParents = async (studentId: string, type: string, title: string, message: string, link?: string) => {
  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/notifications/parent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, type, title, message, link }),
    });
    if (!response.ok) {
      console.log(`⚠️ Parent notification sent (parents may not be registered): ${title}`);
    } else {
      const result = await response.json() as { parentsNotified?: number };
      console.log(`📧 Parent notification sent to ${result.parentsNotified} parent(s): ${title}`);
    }
  } catch (error) {
    console.log(`⚠️ Could not send parent notification: ${error}`);
  }
};

// Send notification to student directly
const notifyStudent = async (studentId: string, type: string, title: string, message: string, link?: string) => {
  try {
    await fetch(`${AUTH_SERVICE_URL}/notifications/student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, type, title, message, link }),
    });
  } catch (error) {
    // Silent fail — student notification is best-effort
  }
};

// ========================================
// Helper Functions
// ========================================

const calculateGradeLevel = (percentage: number): string => {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  if (percentage >= 50) return 'E';
  return 'F';
};

const calculatePercentage = (score: number, maxScore: number): number => {
  if (maxScore === 0) return 0;
  return (score / maxScore) * 100;
};

const calculateWeightedScore = (score: number, coefficient: number): number => {
  return score * coefficient;
};

const getSemesterMonths = (semester: string) => (
  semester === '1'
    ? ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5']
    : ['Month 6', 'Month 7', 'Month 8', 'Month 9', 'Month 10']
);

function buildSemesterAverageMap(
  grades: Array<{
    studentId: string;
    subjectId: string;
    score: number;
    subject: {
      coefficient: number;
    };
  }>
) {
  const studentSubjectTotals = new Map<
    string,
    Map<string, { total: number; count: number; coefficient: number }>
  >();

  grades.forEach((grade) => {
    const subjectTotals = studentSubjectTotals.get(grade.studentId) || new Map();
    const subjectData = subjectTotals.get(grade.subjectId) || {
      total: 0,
      count: 0,
      coefficient: grade.subject.coefficient,
    };

    subjectData.total += grade.score;
    subjectData.count += 1;
    subjectData.coefficient = grade.subject.coefficient;
    subjectTotals.set(grade.subjectId, subjectData);
    studentSubjectTotals.set(grade.studentId, subjectTotals);
  });

  const averages = new Map<string, number>();

  studentSubjectTotals.forEach((subjectTotals, studentId) => {
    let totalWeighted = 0;
    let totalCoefficient = 0;

    subjectTotals.forEach((data) => {
      const average = data.count > 0 ? data.total / data.count : 0;
      totalWeighted += average * data.coefficient;
      totalCoefficient += data.coefficient;
    });

    averages.set(studentId, totalCoefficient > 0 ? totalWeighted / totalCoefficient : 0);
  });

  return averages;
}

function normalizeAnalyticsCategory(subject?: { name?: string | null; category?: string | null }) {
  const rawCategory = (subject?.category || '').toLowerCase();
  const rawName = (subject?.name || '').toLowerCase();

  if (
    rawCategory.includes('math') ||
    rawName.includes('math') ||
    rawName.includes('algebra') ||
    rawName.includes('geometry') ||
    rawName.includes('calculus')
  ) {
    return 'Mathematics';
  }

  if (
    rawCategory.includes('science') ||
    rawName.includes('physics') ||
    rawName.includes('chemistry') ||
    rawName.includes('biology') ||
    rawName.includes('science')
  ) {
    return 'Sciences';
  }

  if (
    rawCategory.includes('language') ||
    rawName.includes('english') ||
    rawName.includes('khmer') ||
    rawName.includes('french') ||
    rawName.includes('language') ||
    rawName.includes('literature')
  ) {
    return 'Languages';
  }

  if (
    rawCategory.includes('art') ||
    rawName.includes('art') ||
    rawName.includes('music') ||
    rawName.includes('drama')
  ) {
    return 'Arts';
  }

  return 'Social';
}

// ========================================
// GRADE CRUD ENDPOINTS
// ========================================

/**
 * GET /grades/class/:classId - Get all grades for a class
 * Query params: month, subjectId
 */
app.get('/grades/class/:classId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { classId } = req.params;
    const { month, subjectId } = req.query;
    const schoolId = getSchoolId(req);

    // Multi-tenant: verify class belongs to requesting school
    if (schoolId) {
      const classData = await prisma.class.findFirst({ where: { id: classId, schoolId } });
      if (!classData) {
        return res.status(404).json({ message: 'Class not found in your school' });
      }
    }

    const where: any = { classId };

    if (month) where.month = month as string;
    if (subjectId) where.subjectId = subjectId as string;

    const grades = await prisma.grade.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            customFields: true,
            photoUrl: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            nameKh: true,
            code: true,
            coefficient: true,
            maxScore: true,
          },
        },
      },
      orderBy: [
        { student: { firstName: 'asc' } },
        { subject: { name: 'asc' } },
      ],
    });

    console.log(`✅ Found ${grades.length} grades for class ${classId}`);

    res.json(grades);
  } catch (error: any) {
    console.error('❌ Error getting grades:', error);
    res.status(500).json({
      message: 'Error getting grades',
      error: error.message,
    });
  }
});

/**
 * GET /grades/class/:classId/subject/:subjectId/month/:month
 * Get grades for specific class, subject, and month (for grid view)
 */
app.get(
  '/grades/class/:classId/subject/:subjectId/month/:month',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { classId, subjectId, month } = req.params;
      const schoolId = getSchoolId(req);
      const cacheKey = `${schoolId || 'unknown'}:${classId}:${subjectId}:${month}`;
      const cachedResponse = readGradeGridCache(cacheKey);

      if (cachedResponse) {
        return res.json(cachedResponse);
      }

      // Get all students in class
      const students = await prisma.student.findMany({
        where: { classId },
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          customFields: true,
          photoUrl: true,
        },
        orderBy: [
          { firstName: 'asc' },
          { lastName: 'asc' },
        ],
      });

      // Get subject info
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
      });

      if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
      }

      // Get grades for this subject and month
      const grades = await prisma.grade.findMany({
        where: {
          classId,
          subjectId,
          month: month,
        },
      });

      // Create a map of grades by student ID
      const gradesMap = new Map(grades.map((g) => [g.studentId, g]));

      // Build result with student info and their grade (or null)
      const result = students.map((student) => ({
        student,
        grade: gradesMap.get(student.id) || null,
        subject,
      }));

      console.log(`✅ Loaded ${result.length} students for grade entry`);

      writeGradeGridCache(cacheKey, result);
      res.json(result);
    } catch (error: any) {
      console.error('❌ Error getting grades for grid:', error);
      res.status(500).json({
        message: 'Error getting grades',
        error: error.message,
      });
    }
  }
);

/**
 * GET /grades/student/:studentId - Get all grades for a student
 * Query params: month, year
 */
app.get('/grades/student/:studentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { month, year } = req.query;

    const where: any = { studentId };

    if (month) where.month = month as string;
    if (year) where.year = parseInt(year as string);

    const grades = await prisma.grade.findMany({
      where,
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            nameKh: true,
            code: true,
            coefficient: true,
            maxScore: true,
            category: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },
      },
      orderBy: [
        { year: 'desc' },
        { monthNumber: 'desc' },
        { subject: { name: 'asc' } },
      ],
    });

    res.json(grades);
  } catch (error: any) {
    console.error('❌ Error getting student grades:', error);
    res.status(500).json({
      message: 'Error getting student grades',
      error: error.message,
    });
  }
});

/**
 * POST /grades/batch - Batch create/update grades
 * Body: { grades: [{ studentId, subjectId, classId, score, month, ... }] }
 */
app.post('/grades/batch', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { grades } = req.body;
    const schoolId = getSchoolId(req);

    if (!Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ message: 'Grades array is required' });
    }

    const results = {
      created: 0,
      updated: 0,
      errors: [] as any[],
    };

    // Get current year
    const currentYear = new Date().getFullYear();

    // Process each grade sequentially
    for (const gradeData of grades) {
      const {
        studentId,
        subjectId,
        classId,
        score,
        month,
        monthNumber,
        maxScore = 100,
        remarks,
      } = gradeData;

      try {
        const percentage = calculatePercentage(score, maxScore);

        // Get subject to calculate weighted score
        const subject = await prisma.subject.findUnique({ where: { id: subjectId } });

        if (!subject) {
          results.errors.push({ studentId, error: 'Subject not found' });
          continue;
        }

        const weightedScore = calculateWeightedScore(score, subject.coefficient);

        // Try to find existing grade
        const existing = await prisma.grade.findFirst({
          where: {
            studentId,
            subjectId,
            classId,
            month,
            year: currentYear,
          },
        });

        if (existing) {
          // Update existing
          await prisma.grade.update({
            where: { id: existing.id },
            data: {
              score,
              maxScore,
              percentage,
              weightedScore,
              remarks,
              monthNumber: monthNumber || existing.monthNumber,
            },
          });
          results.updated++;
        } else {
          // Create new
          await prisma.grade.create({
            data: {
              studentId,
              subjectId,
              classId,
              score,
              maxScore,
              month: month || 'Month 1',
              monthNumber: monthNumber || 1,
              year: currentYear,
              percentage,
              weightedScore,
              remarks,
            },
          });
          results.created++;

          // Send notification to parent for new grade (only for new grades, not updates)
          notifyParents(
            studentId,
            'GRADE_POSTED',
            'New Grade Posted',
            `A new grade has been posted for ${subject.name} (${month})`,
            `/parent/child/${studentId}/grades`
          );
          // Also notify the student
          notifyStudent(
            studentId,
            'GRADE_POSTED',
            'New Grade Posted',
            `Your grade for ${subject.name} (${month}) has been posted`,
            `/grades`
          );
        }
      } catch (gradeError: any) {
        results.errors.push({ studentId, error: gradeError.message });
      }
    }

    console.log(`✅ Batch operation: Created ${results.created}, Updated ${results.updated}`);
    clearGradeCaches(schoolId);

    res.json({
      message: 'Batch operation completed',
      ...results,
    });
  } catch (error: any) {
    console.error('❌ Error in batch operation:', error);
    res.status(500).json({
      message: 'Error processing batch grades',
      error: error.message,
    });
  }
});

/**
 * PUT /grades/:id - Update a single grade
 */
app.put('/grades/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { score, maxScore, remarks } = req.body;

    const existingGrade = await prisma.grade.findUnique({
      where: { id },
      include: { subject: true },
    });

    if (!existingGrade) {
      return res.status(404).json({ message: 'Grade not found' });
    }

    const percentage = calculatePercentage(score, maxScore || existingGrade.maxScore);
    const weightedScore = calculateWeightedScore(score, existingGrade.subject.coefficient);

    const updatedGrade = await prisma.grade.update({
      where: { id },
      data: {
        ...(score !== undefined && { score }),
        ...(maxScore !== undefined && { maxScore }),
        ...(remarks !== undefined && { remarks }),
        percentage,
        weightedScore,
      },
      include: {
        student: true,
        subject: true,
      },
    });

    console.log(`✅ Updated grade for student ${(updatedGrade.student.customFields as any)?.regional?.khmerName || updatedGrade.student.firstName}`);
    clearGradeCaches(getSchoolId(req));

    res.json(updatedGrade);
  } catch (error: any) {
    console.error('❌ Error updating grade:', error);
    res.status(500).json({
      message: 'Error updating grade',
      error: error.message,
    });
  }
});

/**
 * DELETE /grades/:id - Delete a grade
 */
app.delete('/grades/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = getSchoolId(req);

    // Multi-tenant: verify grade belongs to requesting school
    const existing = await prisma.grade.findUnique({
      where: { id },
      include: { class: { select: { schoolId: true } } },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Grade not found' });
    }

    if (schoolId && existing.class?.schoolId !== schoolId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const grade = await prisma.grade.delete({
      where: { id },
    });

    clearGradeCaches(schoolId);

    res.json({
      message: 'Grade deleted successfully',
      grade,
    });
  } catch (error: any) {
    console.error('Error deleting grade:', error);
    res.status(500).json({
      message: 'Error deleting grade',
      error: error.message,
    });
  }
});

// ========================================
// CALCULATION ENDPOINTS
// ========================================

/**
 * POST /grades/calculate/average - Calculate student averages
 * Body: { classId, month }
 */
app.post('/grades/calculate/average', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { classId, month } = req.body;

    const currentYear = new Date().getFullYear();

    // Get all grades for class and month
    const grades = await prisma.grade.findMany({
      where: {
        classId,
        month,
        year: currentYear,
      },
      include: {
        subject: true,
      },
    });

    // Group by student
    const studentGrades = new Map<string, any[]>();

    grades.forEach((grade) => {
      if (!studentGrades.has(grade.studentId)) {
        studentGrades.set(grade.studentId, []);
      }
      studentGrades.get(grade.studentId)!.push(grade);
    });

    // Calculate average for each student
    const averages = [];

    for (const [studentId, studentGradesArray] of studentGrades) {
      let totalScore = 0;
      let totalMaxScore = 0;
      let totalWeightedScore = 0;
      let totalCoefficient = 0;

      studentGradesArray.forEach((grade) => {
        totalScore += grade.score;
        totalMaxScore += grade.maxScore;
        totalWeightedScore += grade.weightedScore || 0;
        totalCoefficient += grade.subject.coefficient;
      });

      const average = totalCoefficient > 0 ? totalWeightedScore / totalCoefficient : 0;
      const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
      const gradeLevel = calculateGradeLevel(percentage);

      averages.push({
        studentId,
        totalScore,
        totalMaxScore,
        totalWeightedScore,
        totalCoefficient,
        average,
        percentage,
        gradeLevel,
        rank: 0,
      });
    }

    // Sort by average (descending) for ranking
    averages.sort((a, b) => b.average - a.average);

    // Add ranking
    averages.forEach((avg, index) => {
      avg.rank = index + 1;
    });

    res.json(averages);
  } catch (error: any) {
    console.error('❌ Error calculating averages:', error);
    res.status(500).json({
      message: 'Error calculating averages',
      error: error.message,
    });
  }
});

/**
 * GET /grades/summary/:studentId/:month - Get student monthly summary
 */
app.get('/grades/summary/:studentId/:month', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, month } = req.params;
    const currentYear = new Date().getFullYear();

    const summary = await prisma.studentMonthlySummary.findFirst({
      where: {
        studentId,
        month,
        year: currentYear,
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            customFields: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },
      },
    });

    if (!summary) {
      return res.status(404).json({ message: 'Summary not found' });
    }

    res.json(summary);
  } catch (error: any) {
    console.error('❌ Error getting summary:', error);
    res.status(500).json({
      message: 'Error getting summary',
      error: error.message,
    });
  }
});

/**
 * POST /grades/monthly-summary - Generate/update monthly summary
 * Body: { studentId, classId, month, monthNumber }
 */
app.post('/grades/monthly-summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, classId, month, monthNumber } = req.body;
    const currentYear = new Date().getFullYear();
    const schoolId = getSchoolId(req);

    // Get all grades for student in this month
    const grades = await prisma.grade.findMany({
      where: {
        studentId,
        classId,
        month,
        year: currentYear,
      },
      include: {
        subject: true,
      },
    });

    if (grades.length === 0) {
      return res.status(400).json({ message: 'No grades found for this student and month' });
    }

    // Calculate totals
    let totalScore = 0;
    let totalMaxScore = 0;
    let totalWeightedScore = 0;
    let totalCoefficient = 0;

    grades.forEach((grade) => {
      totalScore += grade.score;
      totalMaxScore += grade.maxScore;
      totalWeightedScore += grade.weightedScore || 0;
      totalCoefficient += grade.subject.coefficient;
    });

    const average = totalCoefficient > 0 ? totalWeightedScore / totalCoefficient : 0;
    const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
    const gradeLevel = calculateGradeLevel(percentage);

    // Calculate class rank
    const allSummaries = await prisma.studentMonthlySummary.findMany({
      where: {
        classId,
        month,
        year: currentYear,
      },
      orderBy: {
        average: 'desc',
      },
    });

    let classRank = 1;
    for (const summary of allSummaries) {
      if (summary.average > average) {
        classRank++;
      } else {
        break;
      }
    }

    // Create or update summary
    const existingSummary = await prisma.studentMonthlySummary.findFirst({
      where: {
        studentId,
        classId,
        month,
        year: currentYear,
      },
    });

    let summary;

    if (existingSummary) {
      summary = await prisma.studentMonthlySummary.update({
        where: { id: existingSummary.id },
        data: {
          totalScore,
          totalMaxScore,
          totalWeightedScore,
          totalCoefficient,
          average,
          classRank,
          gradeLevel,
        },
      });
    } else {
      summary = await prisma.studentMonthlySummary.create({
        data: {
          studentId,
          classId,
          month,
          monthNumber: monthNumber || 1,
          year: currentYear,
          totalScore,
          totalMaxScore,
          totalWeightedScore,
          totalCoefficient,
          average,
          classRank,
          gradeLevel,
        },
      });
    }

    console.log(`✅ Generated monthly summary for student ${studentId}`);
    clearGradeCaches(schoolId);
    res.json(summary);
  } catch (error: any) {
    console.error('❌ Error generating summary:', error);
    res.status(500).json({
      message: 'Error generating monthly summary',
      error: error.message,
    });
  }
});

// ========================================
// IMPORT/EXPORT ENDPOINTS
// ========================================

/**
 * GET /grades/export/template - Download Excel template
 * Query: classId, subjectId
 */
app.get('/grades/export/template', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { classId, subjectId } = req.query;

    if (!classId || !subjectId) {
      return res.status(400).json({ message: 'classId and subjectId are required' });
    }

    // Get students in class
    const students = await prisma.student.findMany({
      where: { classId: classId as string },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    // Get subject
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId as string },
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Grades');

    // Add headers
    worksheet.columns = [
      { header: 'Student ID', key: 'studentId', width: 15 },
      { header: 'Student Name', key: 'studentName', width: 30 },
      { header: 'Month 1', key: 'month1', width: 10 },
      { header: 'Month 2', key: 'month2', width: 10 },
      { header: 'Month 3', key: 'month3', width: 10 },
      { header: 'Month 4', key: 'month4', width: 10 },
      { header: 'Month 5', key: 'month5', width: 10 },
      { header: 'Month 6', key: 'month6', width: 10 },
      { header: 'Month 7', key: 'month7', width: 10 },
      { header: 'Month 8', key: 'month8', width: 10 },
      { header: 'Month 9', key: 'month9', width: 10 },
      { header: 'Month 10', key: 'month10', width: 10 },
      { header: 'Month 11', key: 'month11', width: 10 },
      { header: 'Month 12', key: 'month12', width: 10 },
    ];

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add student rows
    students.forEach((student) => {
      worksheet.addRow({
        studentId: student.studentId || student.id,
        studentName: (student.customFields as any)?.regional?.khmerName || `${student.firstName} ${student.lastName}`,
      });
    });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=grade-template-${subject.code}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

    console.log(`✅ Generated Excel template for ${subject.code}`);
  } catch (error: any) {
    console.error('❌ Error generating template:', error);
    res.status(500).json({
      message: 'Error generating template',
      error: error.message,
    });
  }
});

// ========================================
// REPORT CARD ENDPOINTS
// ========================================

/**
 * GET /grades/report-card/:studentId - Get student report card data
 * Query params: semester (1 or 2), year
 */
app.get('/grades/report-card/:studentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { semester = '1', year } = req.query;
    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
    const schoolId = getSchoolId(req) || 'unknown';
    const cacheKey = `${schoolId}:report-card:${studentId}:${String(semester)}:${currentYear}`;
    const cachedResponse = readGradeReportCache(cacheKey);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    const semesterMonths = getSemesterMonths(String(semester));

    // Get student info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const [grades, attendanceSummary, activeStudentClasses, classGrades] = await Promise.all([
      prisma.grade.findMany({
        where: {
          studentId,
          year: currentYear,
          month: { in: semesterMonths },
        },
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              nameKh: true,
              code: true,
              coefficient: true,
              maxScore: true,
              category: true,
            },
          },
        },
        orderBy: [
          { subject: { category: 'asc' } },
          { subject: { name: 'asc' } },
          { monthNumber: 'asc' },
        ],
      }),
      getAttendanceSummary(studentId, String(semester), currentYear),
      student.classId
        ? prisma.studentClass.findMany({
            where: {
              classId: student.classId,
              status: 'ACTIVE',
            },
            select: {
              studentId: true,
            },
          })
        : Promise.resolve([]),
      student.classId
        ? prisma.grade.findMany({
            where: {
              classId: student.classId,
              year: currentYear,
              month: { in: semesterMonths },
            },
            include: {
              subject: {
                select: {
                  coefficient: true,
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    // Group grades by subject
    const subjectGrades = new Map<string, any>();

    grades.forEach((grade) => {
      const subjectId = grade.subjectId;
      if (!subjectGrades.has(subjectId)) {
        subjectGrades.set(subjectId, {
          subject: grade.subject,
          grades: [],
          totalScore: 0,
          totalMaxScore: 0,
          count: 0,
        });
      }
      const subjectData = subjectGrades.get(subjectId);
      subjectData.grades.push({
        month: grade.month,
        monthNumber: grade.monthNumber,
        score: grade.score,
        maxScore: grade.maxScore,
        percentage: grade.percentage,
      });
      subjectData.totalScore += grade.score;
      subjectData.totalMaxScore += grade.maxScore;
      subjectData.count++;
    });

    // Calculate averages per subject
    const subjectResults = Array.from(subjectGrades.values()).map((data) => {
      const average = data.count > 0 ? data.totalScore / data.count : 0;
      const maxScore = data.subject.maxScore || 100;
      const percentage = (average / maxScore) * 100;
      const gradeLevel = calculateGradeLevel(percentage);

      return {
        subject: data.subject,
        monthlyGrades: data.grades.sort((a: any, b: any) => a.monthNumber - b.monthNumber),
        semesterAverage: Math.round(average * 100) / 100,
        percentage: Math.round(percentage * 100) / 100,
        gradeLevel,
        coefficient: data.subject.coefficient,
        weightedScore: average * data.subject.coefficient,
      };
    });

    // Calculate overall semester average
    let totalWeightedScore = 0;
    let totalCoefficient = 0;

    subjectResults.forEach((result) => {
      totalWeightedScore += result.weightedScore;
      totalCoefficient += result.coefficient;
    });

    const overallAverage = totalCoefficient > 0 ? totalWeightedScore / totalCoefficient : 0;
    const overallPercentage = overallAverage; // Since each subject is out of 100
    const overallGradeLevel = calculateGradeLevel(overallPercentage);

    const classAverageMap = buildSemesterAverageMap(
      classGrades as Array<{
        studentId: string;
        subjectId: string;
        score: number;
        subject: { coefficient: number };
      }>
    );
    const rankedAverages = activeStudentClasses
      .map(({ studentId: activeStudentId }) => ({
        studentId: activeStudentId,
        average: classAverageMap.get(activeStudentId) || 0,
      }))
      .sort((a, b) => b.average - a.average);

    const rankIndex = rankedAverages.findIndex((entry) => entry.studentId === studentId);
    const classRank = {
      rank: rankIndex >= 0 ? rankIndex + 1 : rankedAverages.length || 1,
      total: rankedAverages.length,
    };

    const reportCard = {
      student: {
        id: student.id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        khmerName: (student.customFields as any)?.regional?.khmerName || null,
        photoUrl: student.photoUrl,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
      },
      class: student.class,
      semester: parseInt(semester as string),
      year: currentYear,
      subjects: subjectResults,
      summary: {
        totalSubjects: subjectResults.length,
        overallAverage: Math.round(overallAverage * 100) / 100,
        overallPercentage: Math.round(overallPercentage * 100) / 100,
        overallGradeLevel,
        classRank: classRank.rank,
        totalStudents: classRank.total,
        isPassing: overallPercentage >= 50,
      },
      attendance: attendanceSummary,
      generatedAt: new Date().toISOString(),
    };

    console.log(`✅ Generated report card for student ${(student.customFields as any)?.regional?.khmerName || student.firstName}`);

    writeGradeReportCache(cacheKey, reportCard);
    res.json(reportCard);
  } catch (error: any) {
    console.error('❌ Error generating report card:', error);
    res.status(500).json({
      message: 'Error generating report card',
      error: error.message,
    });
  }
});

/**
 * GET /grades/class-report/:classId - Get all report cards for a class
 * Query params: semester, year
 */
app.get('/grades/class-report/:classId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { classId } = req.params;
    const { semester = '1', year } = req.query;
    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
    const schoolId = getSchoolId(req) || 'unknown';
    const cacheKey = `${schoolId}:class-report:${classId}:${String(semester)}:${currentYear}`;
    const cachedResponse = readGradeReportCache(cacheKey);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    const semesterMonths = getSemesterMonths(String(semester));
    const [studentClasses, grades, classInfo] = await Promise.all([
      prisma.studentClass.findMany({
        where: {
          classId,
          status: 'ACTIVE',
        },
        include: {
          student: true,
        },
        orderBy: {
          student: {
            firstName: 'asc',
          },
        },
      }),
      prisma.grade.findMany({
        where: {
          classId,
          year: currentYear,
          month: { in: semesterMonths },
        },
        include: {
          subject: {
            select: {
              coefficient: true,
            },
          },
        },
      }),
      prisma.class.findUnique({
        where: { id: classId },
      }),
    ]);

    const averageMap = buildSemesterAverageMap(grades);
    const rankedStudents = studentClasses
      .map(({ student }) => ({
        studentId: student.id,
        average: Math.round((averageMap.get(student.id) || 0) * 100) / 100,
        student: {
          id: student.id,
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          khmerName: (student.customFields as any)?.regional?.khmerName || null,
          photoUrl: student.photoUrl,
        },
      }))
      .sort((a, b) => b.average - a.average);

    // Add rankings
    const rankedStudentsWithMetadata = rankedStudents.map((s, index) => ({
      ...s,
      rank: index + 1,
      gradeLevel: calculateGradeLevel(s.average),
      isPassing: s.average >= 50,
    }));

    const result = {
      class: classInfo,
      semester: parseInt(semester as string),
      year: currentYear,
      totalStudents: rankedStudentsWithMetadata.length,
      students: rankedStudentsWithMetadata,
      statistics: {
        classAverage: rankedStudentsWithMetadata.length > 0
          ? Math.round(rankedStudentsWithMetadata.reduce((sum, s) => sum + s.average, 0) / rankedStudentsWithMetadata.length * 100) / 100
          : 0,
        highestAverage: rankedStudentsWithMetadata.length > 0 ? rankedStudentsWithMetadata[0].average : 0,
        lowestAverage: rankedStudentsWithMetadata.length > 0 ? rankedStudentsWithMetadata[rankedStudentsWithMetadata.length - 1].average : 0,
        passingCount: rankedStudentsWithMetadata.filter((s) => s.isPassing).length,
        failingCount: rankedStudentsWithMetadata.filter((s) => !s.isPassing).length,
        passRate: rankedStudentsWithMetadata.length > 0
          ? Math.round((rankedStudentsWithMetadata.filter((s) => s.isPassing).length / rankedStudentsWithMetadata.length) * 100)
          : 0,
      },
      generatedAt: new Date().toISOString(),
    };

    console.log(`✅ Generated class report for ${classInfo?.name} - ${rankedStudentsWithMetadata.length} students`);

    writeGradeReportCache(cacheKey, result);
    res.json(result);
  } catch (error: any) {
    console.error('❌ Error generating class report:', error);
    res.status(500).json({
      message: 'Error generating class report',
      error: error.message,
    });
  }
});

/**
 * GET /grades/semester-summary/:classId/:semester - Get semester summary
 */
app.get('/grades/semester-summary/:classId/:semester', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { classId, semester } = req.params;
    const { year } = req.query;
    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
    const schoolId = getSchoolId(req) || 'unknown';
    const cacheKey = `${schoolId}:semester-summary:${classId}:${semester}:${currentYear}`;
    const cachedResponse = readGradeReportCache(cacheKey);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    const semesterMonths = getSemesterMonths(semester);

    const [grades, classInfo, studentCount] = await Promise.all([
      prisma.grade.findMany({
        where: {
          classId,
          year: currentYear,
          month: { in: semesterMonths },
        },
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              nameKh: true,
              code: true,
              category: true,
            },
          },
        },
      }),
      prisma.class.findUnique({
        where: { id: classId },
      }),
      prisma.studentClass.count({
        where: {
          classId,
          status: 'ACTIVE',
        },
      }),
    ]);

    const subjectStatsMap = new Map<
      string,
      {
        subject: {
          id: string;
          name: string;
          nameKh: string;
          code: string;
          category: string | null;
        };
        gradesCount: number;
        totalScore: number;
        highestScore: number;
        lowestScore: number;
      }
    >();

    grades.forEach((grade) => {
      const key = grade.subjectId;
      const existing = subjectStatsMap.get(key) || {
        subject: {
          id: grade.subject.id,
          name: grade.subject.name,
          nameKh: grade.subject.nameKh,
          code: grade.subject.code,
          category: grade.subject.category,
        },
        gradesCount: 0,
        totalScore: 0,
        highestScore: 0,
        lowestScore: 100,
      };

      const percentage = grade.percentage ?? 0;
      existing.gradesCount += 1;
      existing.totalScore += percentage;
      existing.highestScore = existing.gradesCount === 1 ? percentage : Math.max(existing.highestScore, percentage);
      existing.lowestScore = existing.gradesCount === 1 ? percentage : Math.min(existing.lowestScore, percentage);
      subjectStatsMap.set(key, existing);
    });

    const subjectStats = Array.from(subjectStatsMap.values())
      .map((item) => ({
        subject: item.subject,
        gradesCount: item.gradesCount,
        averageScore: item.gradesCount > 0 ? Math.round((item.totalScore / item.gradesCount) * 100) / 100 : 0,
        highestScore: item.gradesCount > 0 ? item.highestScore : 0,
        lowestScore: item.gradesCount > 0 ? item.lowestScore : 0,
      }))
      .sort((a, b) => {
        const categoryCompare = (a.subject.category || '').localeCompare(b.subject.category || '');
        if (categoryCompare !== 0) return categoryCompare;
        return a.subject.name.localeCompare(b.subject.name);
      });

    const responseBody = {
      class: classInfo,
      semester: parseInt(semester),
      year: currentYear,
      months: semesterMonths,
      subjects: subjectStats,
      totalSubjects: subjectStats.length,
      studentCount,
    };

    writeGradeReportCache(cacheKey, responseBody);
    res.json(responseBody);
  } catch (error: any) {
    console.error('❌ Error getting semester summary:', error);
    res.status(500).json({
      message: 'Error getting semester summary',
      error: error.message,
    });
  }
});

/**
 * GET /grades/analytics/:classId - Get chart-ready analytics for a class/semester
 * Query params: semester, year
 */
app.get('/grades/analytics/:classId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { classId } = req.params;
    const { semester = '1', year } = req.query;
    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
    const schoolId = getSchoolId(req) || 'unknown';
    const cacheKey = `${schoolId}:grade-analytics:${classId}:${String(semester)}:${currentYear}`;
    const cachedResponse = readGradeReportCache(cacheKey);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    if (schoolId) {
      const classData = await prisma.class.findFirst({ where: { id: classId, schoolId } });
      if (!classData) {
        return res.status(404).json({ message: 'Class not found in your school' });
      }
    }

    const semesterMonths = getSemesterMonths(String(semester));
    const [studentClasses, grades, classInfo] = await Promise.all([
      prisma.studentClass.findMany({
        where: {
          classId,
          status: 'ACTIVE',
        },
        include: {
          student: true,
        },
        orderBy: {
          student: {
            firstName: 'asc',
          },
        },
      }),
      prisma.grade.findMany({
        where: {
          classId,
          year: currentYear,
          month: { in: semesterMonths },
        },
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              nameKh: true,
              code: true,
              category: true,
              coefficient: true,
              maxScore: true,
            },
          },
        },
      }),
      prisma.class.findUnique({
        where: { id: classId },
      }),
    ]);

    const averageMap = buildSemesterAverageMap(grades);
    const rankedStudents = studentClasses
      .map(({ student }) => ({
        studentId: student.id,
        average: Math.round((averageMap.get(student.id) || 0) * 100) / 100,
        student: {
          id: student.id,
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          khmerName: (student.customFields as any)?.regional?.khmerName || null,
          photoUrl: student.photoUrl,
        },
      }))
      .sort((a, b) => b.average - a.average)
      .map((student, index) => ({
        ...student,
        rank: index + 1,
        gradeLevel: calculateGradeLevel(student.average),
        isPassing: student.average >= 50,
      }));

    const monthlyTotals = new Map<number, { total: number; count: number }>();
    const subjectPerformanceMap = new Map<string, { name: string; total: number; count: number }>();
    const categoryTotals: Record<string, { total: number; count: number }> = {
      Sciences: { total: 0, count: 0 },
      Mathematics: { total: 0, count: 0 },
      Languages: { total: 0, count: 0 },
      Social: { total: 0, count: 0 },
      Arts: { total: 0, count: 0 },
    };

    grades.forEach((grade) => {
      const monthData = monthlyTotals.get(grade.monthNumber) || { total: 0, count: 0 };
      monthData.total += grade.percentage ?? 0;
      monthData.count += 1;
      monthlyTotals.set(grade.monthNumber, monthData);

      const subjectData = subjectPerformanceMap.get(grade.subjectId) || {
        name: grade.subject.name,
        total: 0,
        count: 0,
      };
      subjectData.total += grade.percentage ?? 0;
      subjectData.count += 1;
      subjectPerformanceMap.set(grade.subjectId, subjectData);

      const category = normalizeAnalyticsCategory(grade.subject);
      categoryTotals[category].total += grade.percentage ?? 0;
      categoryTotals[category].count += 1;
    });

    const monthlyTrend = semesterMonths.map((monthLabel, index) => {
      const monthNumber = semester === '1' ? index + 1 : index + 6;
      const item = monthlyTotals.get(monthNumber);
      return {
        month: monthLabel,
        monthNumber,
        average: item && item.count > 0 ? Math.round(item.total / item.count) : 0,
      };
    });

    const subjectPerformance = Array.from(subjectPerformanceMap.values())
      .map((subject) => ({
        subject: subject.name.length > 10 ? `${subject.name.substring(0, 10)}...` : subject.name,
        fullName: subject.name,
        average: subject.count > 0 ? Math.round(subject.total / subject.count) : 0,
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 10);

    const gradeDistributionMap = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 } as Record<string, number>;
    rankedStudents.forEach((student) => {
      gradeDistributionMap[student.gradeLevel] = (gradeDistributionMap[student.gradeLevel] || 0) + 1;
    });

    const gradeDistribution = Object.entries(gradeDistributionMap)
      .filter(([, count]) => count > 0)
      .map(([grade, value]) => ({
        name: `Grade ${grade}`,
        value,
        grade,
      }));

    const categoryPerformance = Object.entries(categoryTotals).map(([category, data]) => ({
      category,
      score: data.count > 0 ? Math.round(data.total / data.count) : 0,
      fullMark: 100,
    }));

    const responseBody = {
      class: classInfo,
      semester: parseInt(String(semester), 10),
      year: currentYear,
      totalStudents: rankedStudents.length,
      students: rankedStudents,
      statistics: {
        classAverage: rankedStudents.length > 0
          ? Math.round((rankedStudents.reduce((sum, student) => sum + student.average, 0) / rankedStudents.length) * 100) / 100
          : 0,
        highestAverage: rankedStudents.length > 0 ? rankedStudents[0].average : 0,
        lowestAverage: rankedStudents.length > 0 ? rankedStudents[rankedStudents.length - 1].average : 0,
        passingCount: rankedStudents.filter((student) => student.isPassing).length,
        failingCount: rankedStudents.filter((student) => !student.isPassing).length,
        passRate: rankedStudents.length > 0
          ? Math.round((rankedStudents.filter((student) => student.isPassing).length / rankedStudents.length) * 100)
          : 0,
      },
      charts: {
        monthlyTrend,
        subjectPerformance,
        gradeDistribution,
        categoryPerformance,
      },
      generatedAt: new Date().toISOString(),
    };

    writeGradeReportCache(cacheKey, responseBody);
    res.json(responseBody);
  } catch (error: any) {
    console.error('❌ Error getting grade analytics:', error);
    res.status(500).json({
      message: 'Error getting grade analytics',
      error: error.message,
    });
  }
});

// Helper function: Get attendance summary
async function getAttendanceSummary(studentId: string, semester: string, year: number) {
  try {
    const startMonth = semester === '1' ? 10 : 3; // November or March
    const endMonth = semester === '1' ? 2 : 8; // February or August
    const startYear = semester === '1' ? year : year + 1;
    const endYear = semester === '1' ? year + 1 : year + 1;

    const attendanceCounts = await prisma.attendance.groupBy({
      by: ['status'],
      where: {
        studentId,
        date: {
          gte: new Date(startYear, startMonth, 1),
          lte: new Date(endYear, endMonth + 1, 0),
        },
      },
      _count: {
        status: true,
      },
    });

    const countByStatus = new Map(attendanceCounts.map((entry) => [entry.status, entry._count.status]));
    const totals = {
      present: countByStatus.get('PRESENT') || 0,
      absent: countByStatus.get('ABSENT') || 0,
      late: countByStatus.get('LATE') || 0,
      excused: countByStatus.get('EXCUSED') || 0,
      permission: countByStatus.get('PERMISSION') || 0,
    };

    const totalSessions = attendanceCounts.reduce((sum, item) => sum + item._count.status, 0);
    const attendedSessions = totals.present + totals.late;
    const attendanceRate = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0;

    return {
      ...totals,
      totalSessions,
      attendedSessions,
      attendanceRate,
    };
  } catch (error) {
    console.error('Error getting attendance summary:', error);
    return {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      permission: 0,
      totalSessions: 0,
      attendedSessions: 0,
      attendanceRate: 0,
    };
  }
}

// ========================================
// Start Server
// ========================================

app.listen(PORT, () => {
  console.log(`📊 Grade Service running on port ${PORT}`);
  console.log(`📝 Endpoints:`);
  console.log(`   GET    /grades/class/:classId - Get class grades`);
  console.log(`   GET    /grades/class/:classId/subject/:subjectId/month/:month - Grid view`);
  console.log(`   GET    /grades/student/:studentId - Get student grades`);
  console.log(`   POST   /grades/batch - Batch create/update`);
  console.log(`   PUT    /grades/:id - Update grade`);
  console.log(`   DELETE /grades/:id - Delete grade`);
  console.log(`   POST   /grades/calculate/average - Calculate averages`);
  console.log(`   GET    /grades/summary/:studentId/:month - Get summary`);
  console.log(`   POST   /grades/monthly-summary - Generate summary`);
  console.log(`   GET    /grades/export/template - Download template`);
  console.log(`📋 Report Card Endpoints:`);
  console.log(`   GET    /grades/report-card/:studentId - Student report card`);
  console.log(`   GET    /grades/class-report/:classId - Class report cards`);
  console.log(`   GET    /grades/semester-summary/:classId/:semester - Semester summary`);
});
