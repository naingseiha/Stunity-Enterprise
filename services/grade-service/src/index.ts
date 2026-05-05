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

const resolveMonthNumber = (month: string, providedMonthNumber?: number): number => {
  if (typeof providedMonthNumber === 'number' && Number.isFinite(providedMonthNumber)) {
    return providedMonthNumber;
  }

  const parsed = parseInt(month.replace(/[^\d]/g, ''), 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return 1;
};

const upsertStudentMonthlySummary = async (
  studentId: string,
  classId: string,
  month: string,
  monthNumber: number,
  year: number
) => {
  const grades = await prisma.grade.findMany({
    where: {
      studentId,
      classId,
      month,
      year,
    },
    include: {
      subject: {
        select: {
          coefficient: true,
        },
      },
    },
  });

  if (grades.length === 0) {
    await prisma.studentMonthlySummary.deleteMany({
      where: {
        studentId,
        classId,
        month,
        year,
      },
    });
    return null;
  }

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

  const existingSummary = await prisma.studentMonthlySummary.findFirst({
    where: {
      studentId,
      classId,
      month,
      year,
    },
  });

  if (existingSummary) {
    return prisma.studentMonthlySummary.update({
      where: { id: existingSummary.id },
      data: {
        monthNumber,
        totalScore,
        totalMaxScore,
        totalWeightedScore,
        totalCoefficient,
        average,
        gradeLevel,
      },
    });
  }

  return prisma.studentMonthlySummary.create({
    data: {
      studentId,
      classId,
      month,
      monthNumber,
      year,
      totalScore,
      totalMaxScore,
      totalWeightedScore,
      totalCoefficient,
      average,
      classRank: 1,
      gradeLevel,
    },
  });
};

const refreshMonthlySummaryRanks = async (classId: string, month: string, year: number) => {
  const summaries = await prisma.studentMonthlySummary.findMany({
    where: {
      classId,
      month,
      year,
    },
    select: {
      id: true,
      classRank: true,
    },
    orderBy: [
      { average: 'desc' },
      { id: 'asc' },
    ],
  });

  const rankUpdates = summaries
    .map((summary, index) => ({
      id: summary.id,
      nextRank: index + 1,
      currentRank: summary.classRank || 0,
    }))
    .filter((item) => item.currentRank !== item.nextRank);

  if (rankUpdates.length === 0) return;

  await prisma.$transaction(
    rankUpdates.map((item) =>
      prisma.studentMonthlySummary.update({
        where: { id: item.id },
        data: { classRank: item.nextRank },
      })
    )
  );
};

const KHMER_MONTH_LABELS: Record<number, string> = {
  1: 'មករា',
  2: 'កុម្ភៈ',
  3: 'មីនា',
  4: 'មេសា',
  5: 'ឧសភា',
  6: 'មិថុនា',
  7: 'កក្កដា',
  8: 'សីហា',
  9: 'កញ្ញា',
  10: 'តុលា',
  11: 'វិច្ឆិកា',
  12: 'ធ្នូ',
};

type ReportPeriod = {
  year: number;
  monthNumber: number;
  label: string;
};

type ReportTermContext = {
  academicYearId?: string;
  termId?: string;
  termName: string;
  termNumber: number;
  startDate: Date;
  endDate: Date;
  periods: ReportPeriod[];
};

function monthStart(year: number, monthNumber: number) {
  return new Date(Date.UTC(year, monthNumber - 1, 1));
}

function monthEnd(year: number, monthNumber: number) {
  return new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59, 999));
}

function enumerateReportPeriods(startDate: Date, endDate: Date): ReportPeriod[] {
  const periods: ReportPeriod[] = [];
  let year = startDate.getUTCFullYear();
  let monthNumber = startDate.getUTCMonth() + 1;
  const endValue = endDate.getUTCFullYear() * 100 + endDate.getUTCMonth() + 1;

  while (year * 100 + monthNumber <= endValue) {
    periods.push({
      year,
      monthNumber,
      label: KHMER_MONTH_LABELS[monthNumber] || `Month ${monthNumber}`,
    });
    monthNumber += 1;
    if (monthNumber > 12) {
      monthNumber = 1;
      year += 1;
    }
  }

  return periods;
}

function fallbackReportTerm(semester: string, academicStartYear: number): ReportTermContext {
  const semesterNumber = semester === '2' ? 2 : 1;
  const start =
    semesterNumber === 1
      ? { year: academicStartYear, monthNumber: 11 }
      : { year: academicStartYear + 1, monthNumber: 3 };
  const end =
    semesterNumber === 1
      ? { year: academicStartYear + 1, monthNumber: 2 }
      : { year: academicStartYear + 1, monthNumber: 8 };

  const startDate = monthStart(start.year, start.monthNumber);
  const endDate = monthEnd(end.year, end.monthNumber);

  return {
    termName: semesterNumber === 1 ? 'Semester 1' : 'Semester 2',
    termNumber: semesterNumber,
    startDate,
    endDate,
    periods: enumerateReportPeriods(startDate, endDate),
  };
}

function parseAcademicStartYearName(name?: string | null) {
  if (!name) return null;
  const match = name.match(/^(\d{4})/);
  if (!match) return null;

  const year = Number(match[1]);
  return Number.isInteger(year) ? year : null;
}

async function resolveReportAcademicStartYear(
  schoolId: string | null,
  requestedYear?: string | number | null
) {
  const parsedYear = Number(requestedYear);
  if (Number.isInteger(parsedYear)) return parsedYear;

  if (schoolId) {
    const currentAcademicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId,
        isCurrent: true,
      },
      orderBy: [
        { startDate: 'desc' },
        { name: 'desc' },
      ],
    });

    const nameStartYear = parseAcademicStartYearName(currentAcademicYear?.name);
    if (nameStartYear) return nameStartYear;
    if (currentAcademicYear?.startDate) return currentAcademicYear.startDate.getUTCFullYear();
  }

  return new Date().getFullYear();
}

async function resolveReportTermContext(
  schoolId: string | null,
  semester: string,
  academicStartYear: number
): Promise<ReportTermContext> {
  const semesterNumber = semester === '2' ? 2 : 1;

  if (!schoolId || !Number.isFinite(academicStartYear)) {
    return fallbackReportTerm(semester, academicStartYear || new Date().getFullYear());
  }

  const academicYearName = `${academicStartYear}-${academicStartYear + 1}`;
  const academicYear = await prisma.academicYear.findFirst({
    where: {
      schoolId,
      OR: [
        { name: academicYearName },
        {
          startDate: { lte: monthEnd(academicStartYear, 12) },
          endDate: { gte: monthStart(academicStartYear, 1) },
        },
      ],
    },
    include: {
      terms: {
        where: { termNumber: semesterNumber },
        orderBy: { termNumber: 'asc' },
      },
    },
    orderBy: [
      { name: 'desc' },
      { startDate: 'desc' },
    ],
  });

  const term = academicYear?.terms?.[0];
  if (!term) {
    const fallback = fallbackReportTerm(semester, academicStartYear);
    return {
      ...fallback,
      academicYearId: academicYear?.id,
    };
  }

  return {
    academicYearId: academicYear.id,
    termId: term.id,
    termName: term.name,
    termNumber: term.termNumber,
    startDate: term.startDate,
    endDate: term.endDate,
    periods: enumerateReportPeriods(term.startDate, term.endDate),
  };
}

function buildGradePeriodWhere(periods: ReportPeriod[]) {
  return {
    OR: periods.flatMap((period) => [
      {
        year: period.year,
        monthNumber: period.monthNumber,
      },
      {
        year: period.year,
        month: period.label,
      },
    ]),
  };
}

function reportPeriodCacheKey(context: ReportTermContext) {
  return context.periods.map((period) => `${period.year}-${period.monthNumber}`).join(',');
}

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

const KHMER_MONTH_REPORT_TEMPLATE = 'KHM_MOEYS_MONTHLY';
const KHMER_MONTH_PASSING_AVERAGE = 25;
const ENGLISH_SCORE_BASELINE = 25;

const KHMER_SUBJECT_ORDER: Record<string, number> = {
  khmer: 1,
  'ភាសាខ្មែរ': 1,
  'តែងសេចក្តី': 2,
  'សរសេរតាមអាន': 3,
  mathematics: 4,
  math: 4,
  'គណិតវិទ្យា': 4,
  physics: 5,
  'រូបវិទ្យា': 5,
  chemistry: 6,
  'គីមីវិទ្យា': 6,
  biology: 7,
  'ជីវវិទ្យា': 7,
  earth: 8,
  'ផែនដីវិទ្យា': 8,
  morality: 9,
  'សីលធម៌-ពលរដ្ឋវិជ្ជា': 9,
  geography: 10,
  'ភូមិវិទ្យា': 10,
  history: 11,
  'ប្រវត្តិវិទ្យា': 11,
  english: 12,
  'ភាសាអង់គ្លេស': 12,
  ict: 13,
  'ព័ត៌មានវិទ្យា': 13,
  home: 14,
  'គេហវិទ្យា': 14,
  agriculture: 15,
  'កសិកម្ម': 15,
  sport: 16,
  'កីឡា': 16,
};

function normalizeKhmerReportKey(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function khmerMonthlyGradeLevel(average: number): string {
  if (average >= 45) return 'A';
  if (average >= 40) return 'B';
  if (average >= 35) return 'C';
  if (average >= 30) return 'D';
  if (average >= 25) return 'E';
  return 'F';
}

function isFemaleGender(gender?: string | null) {
  const normalized = normalizeKhmerReportKey(gender);
  return normalized === 'female' || normalized === 'f' || normalized === 'ស្រី';
}

function isEnglishSubject(subject: { name?: string | null; nameKh?: string | null; nameEn?: string | null; code?: string | null }) {
  return [subject.name, subject.nameKh, subject.nameEn, subject.code].some((value) => {
    const normalized = normalizeKhmerReportKey(value);
    return normalized.includes('english') || normalized.includes('អង់គ្លេស') || normalized === 'eng';
  });
}

function shouldApplySemesterOneEnglishRule(grade?: string | null, monthNumber?: number | null, month?: string | null) {
  const normalizedGrade = String(grade || '').replace(/[^\d]/g, '');
  const normalizedMonth = normalizeKhmerReportKey(month);
  return (
    (normalizedGrade === '9' || normalizedGrade === '12') &&
    (monthNumber === 2 || normalizedMonth.includes('កុម្ភៈ') || normalizedMonth.includes('ឆមាសទី១'))
  );
}

function getKhmerStudentName(student: { firstName?: string | null; lastName?: string | null; customFields?: any }) {
  return (
    student.customFields?.regional?.khmerName ||
    student.customFields?.khmerName ||
    `${student.lastName || ''} ${student.firstName || ''}`.trim() ||
    student.firstName ||
    student.lastName ||
    ''
  );
}

function resolveKhmerMonthLabel(monthNumber: number, month?: string | null) {
  return (month && month.trim()) || KHMER_MONTH_LABELS[monthNumber] || `Month ${monthNumber}`;
}

function resolveKhmerMonthlyReportPeriod(academicStartYear: number, monthNumber: number, periodYear?: string | number | null) {
  const explicitPeriodYear = Number(periodYear);
  if (Number.isInteger(explicitPeriodYear)) return explicitPeriodYear;
  return monthNumber <= 8 ? academicStartYear + 1 : academicStartYear;
}

function compareSubjectsForKhmerMonthlyReport(a: any, b: any) {
  const aKeys = [a.code, a.nameKh, a.nameEn, a.name].map(normalizeKhmerReportKey);
  const bKeys = [b.code, b.nameKh, b.nameEn, b.name].map(normalizeKhmerReportKey);
  const aOrder = aKeys.map((key) => KHMER_SUBJECT_ORDER[key]).find((order) => order) || 999;
  const bOrder = bKeys.map((key) => KHMER_SUBJECT_ORDER[key]).find((order) => order) || 999;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return (a.nameKh || a.name || '').localeCompare(b.nameKh || b.name || '', 'km');
}

function getKhmerMonthlySubjectGroupKey(subject: { nameKh?: string | null; name?: string | null; nameEn?: string | null; code?: string | null }) {
  const values = [subject.nameKh, subject.name, subject.nameEn, subject.code]
    .map(normalizeKhmerReportKey)
    .filter(Boolean);
  const joined = values.join(' ');

  if (joined.includes('អង់គ្លេស') || joined.includes('english') || values.includes('eng')) return 'canonical:english';
  if (joined.includes('គីមី') || joined.includes('chemistry')) return 'canonical:chemistry';
  if (joined.includes('ប្រវត្តិ') || joined.includes('history')) return 'canonical:history';
  if (joined.includes('គណិត') || joined.includes('math')) return 'canonical:mathematics';
  if (joined.includes('រូបវិទ្យា') || joined.includes('physics')) return 'canonical:physics';
  if (joined.includes('ជីវ') || joined.includes('biology')) return 'canonical:biology';
  if (joined.includes('ផែនដី') || joined.includes('earth')) return 'canonical:earth';
  if (joined.includes('សីលធម៌') || joined.includes('morality') || joined.includes('civics')) return 'canonical:morality';
  if (joined.includes('ភូមិ') || joined.includes('geography')) return 'canonical:geography';
  if (joined.includes('ភាសាខ្មែរ') || joined.includes('khmer')) return 'canonical:khmer';
  if (joined.includes('ព័ត៌មាន') || joined.includes('កុំព្យូទ័រ') || joined.includes('computer') || joined.includes('ict')) return 'canonical:ict';
  if (joined.includes('កីឡា') || joined.includes('sport')) return 'canonical:sport';
  if (joined.includes('កសិកម្ម') || joined.includes('agriculture')) return 'canonical:agriculture';
  if (joined.includes('គេហ') || joined.includes('home')) return 'canonical:home-economics';

  const khmerName = normalizeKhmerReportKey(subject.nameKh);
  if (khmerName) return `kh:${khmerName}`;

  const englishName = normalizeKhmerReportKey(subject.nameEn || subject.name);
  if (englishName) return `name:${englishName}`;

  return `code:${normalizeKhmerReportKey(subject.code)}`;
}

function buildMonthlyGradeWhere(monthNumber: number, monthLabel: string, actualYear: number) {
  return {
    year: actualYear,
    OR: [
      { monthNumber },
      { month: monthLabel },
    ],
  };
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

/** Roster for grade entry: prefer ACTIVE StudentClass (same as class hub / monthly report), else Student.classId. */
async function getStudentsForClassGradeGrid(classId: string, schoolId: string | null) {
  const enrollmentRows = await prisma.studentClass.findMany({
    where: {
      classId,
      status: 'ACTIVE',
      student: {
        isAccountActive: true,
        ...(schoolId ? { schoolId } : {}),
      },
    },
    select: {
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
    },
    orderBy: [
      { student: { firstName: 'asc' } },
      { student: { lastName: 'asc' } },
    ],
  });

  if (enrollmentRows.length > 0) {
    return enrollmentRows.map((row) => row.student);
  }

  return prisma.student.findMany({
    where: {
      classId,
      isAccountActive: true,
      ...(schoolId ? { schoolId } : {}),
    },
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
}

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

      const students = await getStudentsForClassGradeGrid(classId, schoolId);

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
    const affectedSummaries = new Map<string, {
      studentId: string;
      classId: string;
      month: string;
      monthNumber: number;
    }>();

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
        const normalizedMonth = month || 'Month 1';
        const normalizedMonthNumber = resolveMonthNumber(normalizedMonth, monthNumber);
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
            month: normalizedMonth,
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
              monthNumber: normalizedMonthNumber || existing.monthNumber,
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
              month: normalizedMonth,
              monthNumber: normalizedMonthNumber,
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
            `A new grade has been posted for ${subject.name} (${normalizedMonth})`,
            `/parent/child/${studentId}/grades`
          );
          // Also notify the student
          notifyStudent(
            studentId,
            'GRADE_POSTED',
            'New Grade Posted',
            `Your grade for ${subject.name} (${normalizedMonth}) has been posted`,
            `/grades`
          );
        }

        const summaryKey = `${studentId}:${classId}:${normalizedMonth}`;
        affectedSummaries.set(summaryKey, {
          studentId,
          classId,
          month: normalizedMonth,
          monthNumber: normalizedMonthNumber,
        });
      } catch (gradeError: any) {
        results.errors.push({ studentId, error: gradeError.message });
      }
    }

    const affectedClassMonths = new Map<string, { classId: string; month: string; year: number }>();
    let syncedSummaries = 0;

    for (const item of affectedSummaries.values()) {
      try {
        const summary = await upsertStudentMonthlySummary(
          item.studentId,
          item.classId,
          item.month,
          item.monthNumber,
          currentYear
        );
        if (summary) {
          syncedSummaries++;
        }
        affectedClassMonths.set(`${item.classId}:${item.month}:${currentYear}`, {
          classId: item.classId,
          month: item.month,
          year: currentYear,
        });
      } catch (summaryError: any) {
        results.errors.push({
          studentId: item.studentId,
          error: `Monthly summary sync failed: ${summaryError.message}`,
        });
      }
    }

    for (const target of affectedClassMonths.values()) {
      try {
        await refreshMonthlySummaryRanks(target.classId, target.month, target.year);
      } catch (rankError: any) {
        results.errors.push({
          classId: target.classId,
          error: `Class rank refresh failed for ${target.month}: ${rankError.message}`,
        });
      }
    }

    console.log(`✅ Batch operation: Created ${results.created}, Updated ${results.updated}`);
    if (affectedSummaries.size > 0) {
      console.log(`📈 Monthly summaries synced: ${syncedSummaries}/${affectedSummaries.size}`);
    }
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
    const summaryInclude = {
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
    } as const;

    let summary = await prisma.studentMonthlySummary.findFirst({
      where: {
        studentId,
        month,
        year: currentYear,
      },
      include: summaryInclude,
    });

    if (!summary) {
      const gradeForMonth = await prisma.grade.findFirst({
        where: {
          studentId,
          month,
          year: currentYear,
        },
        select: {
          classId: true,
          monthNumber: true,
        },
      });

      if (gradeForMonth) {
        const regenerated = await upsertStudentMonthlySummary(
          studentId,
          gradeForMonth.classId,
          month,
          resolveMonthNumber(month, gradeForMonth.monthNumber || undefined),
          currentYear
        );

        if (regenerated) {
          await refreshMonthlySummaryRanks(gradeForMonth.classId, month, currentYear);
          summary = await prisma.studentMonthlySummary.findUnique({
            where: { id: regenerated.id },
            include: summaryInclude,
          });
        }
      }
    }

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
    const normalizedMonth = month || 'Month 1';
    const normalizedMonthNumber = resolveMonthNumber(normalizedMonth, monthNumber);

    if (!studentId || !classId) {
      return res.status(400).json({ message: 'studentId and classId are required' });
    }

    const summary = await upsertStudentMonthlySummary(
      studentId,
      classId,
      normalizedMonth,
      normalizedMonthNumber,
      currentYear
    );

    if (!summary) {
      return res.status(400).json({ message: 'No grades found for this student and month' });
    }

    await refreshMonthlySummaryRanks(classId, normalizedMonth, currentYear);
    const latestSummary = await prisma.studentMonthlySummary.findUnique({
      where: { id: summary.id },
    });

    console.log(`✅ Generated monthly summary for student ${studentId}`);
    clearGradeCaches(schoolId);
    res.json(latestSummary || summary);
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
 * GET /grades/monthly-report - Khmer MOEYS monthly report data
 * Query params:
 *   scope=class|grade, classId, grade, month, monthNumber, year, periodYear, academicYearId
 */
app.get('/grades/monthly-report', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      scope = 'class',
      classId,
      grade,
      month,
      monthNumber,
      year,
      periodYear,
      academicYearId,
    } = req.query;
    const schoolId = getSchoolId(req);

    if (!schoolId) {
      return res.status(400).json({ message: 'School context is required' });
    }

    const requestedMonthNumber = Number(monthNumber) || resolveMonthNumber(String(month || ''), undefined);
    if (!requestedMonthNumber || requestedMonthNumber < 1 || requestedMonthNumber > 12) {
      return res.status(400).json({ message: 'A valid monthNumber between 1 and 12 is required' });
    }

    const academicStartYear = await resolveReportAcademicStartYear(schoolId, year as string | undefined);
    const actualYear = resolveKhmerMonthlyReportPeriod(academicStartYear, requestedMonthNumber, periodYear as string | undefined);
    const monthLabel = resolveKhmerMonthLabel(requestedMonthNumber, month as string | undefined);
    const cacheKey = `${schoolId}:monthly-report:${String(scope)}:${String(classId || '')}:${String(grade || '')}:${String(academicYearId || '')}:${academicStartYear}:${actualYear}:${requestedMonthNumber}:${monthLabel}`;
    const cachedResponse = readGradeReportCache(cacheKey);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        address: true,
        countryCode: true,
        defaultLanguage: true,
        educationModel: true,
      },
    });

    const reportScope = String(scope) === 'grade' ? 'grade' : 'class';
    const selectedClasses = reportScope === 'class'
      ? await prisma.class.findMany({
          where: {
            id: String(classId || ''),
            schoolId,
            ...(academicYearId ? { academicYearId: String(academicYearId) } : {}),
          },
          include: {
            academicYear: true,
            homeroomTeacher: true,
          },
        })
      : await prisma.class.findMany({
          where: {
            schoolId,
            grade: String(grade || ''),
            ...(academicYearId ? { academicYearId: String(academicYearId) } : {}),
          },
          include: {
            academicYear: true,
            homeroomTeacher: true,
          },
          orderBy: [
            { name: 'asc' },
            { section: 'asc' },
          ],
        });

    if (selectedClasses.length === 0) {
      return res.status(404).json({ message: reportScope === 'class' ? 'Class not found' : 'No classes found for this grade' });
    }

    const classIds = selectedClasses.map((classInfo) => classInfo.id);
    const reportGrade = reportScope === 'class' ? selectedClasses[0].grade : String(grade || selectedClasses[0].grade);
    const classById = new Map(selectedClasses.map((classInfo) => [classInfo.id, classInfo]));

    const studentClasses = await prisma.studentClass.findMany({
      where: {
        classId: { in: classIds },
        status: 'ACTIVE',
        ...(academicYearId ? { academicYearId: String(academicYearId) } : {}),
      },
      include: {
        student: true,
        class: true,
      },
      orderBy: [
        { class: { name: 'asc' } },
        { student: { firstName: 'asc' } },
      ],
    });

    const fallbackStudents = studentClasses.length > 0
      ? []
      : await prisma.student.findMany({
          where: {
            schoolId,
            classId: { in: classIds },
            isAccountActive: true,
          },
          include: {
            class: true,
          },
          orderBy: [
            { firstName: 'asc' },
            { lastName: 'asc' },
          ],
        });

    const roster = studentClasses.length > 0
      ? studentClasses.map((studentClass) => ({
          student: studentClass.student,
          class: studentClass.class,
        }))
      : fallbackStudents.map((student) => ({
          student,
          class: student.class || classById.get(student.classId || ''),
        }));

    const studentIds = roster.map((entry) => entry.student.id);
    const trackValues = Array.from(new Set(selectedClasses.map((classInfo) => classInfo.track).filter(Boolean))) as string[];
    const subjects = await prisma.subject.findMany({
      where: {
        grade: reportGrade,
        isActive: true,
        OR: [
          { track: null },
          { track: 'common' },
          ...trackValues.map((track) => ({ track })),
        ],
      },
      select: {
        id: true,
        name: true,
        nameKh: true,
        nameEn: true,
        code: true,
        maxScore: true,
        coefficient: true,
        track: true,
        category: true,
      },
    });
    const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));

    const [gradesForMonth, attendanceCounts] = await Promise.all([
      studentIds.length > 0
        ? prisma.grade.findMany({
            where: {
              studentId: { in: studentIds },
              classId: { in: classIds },
              ...buildMonthlyGradeWhere(requestedMonthNumber, monthLabel, actualYear),
            },
            include: {
              subject: {
                select: {
                  id: true,
                  name: true,
                  nameKh: true,
                  nameEn: true,
                  code: true,
                  maxScore: true,
                  coefficient: true,
                  track: true,
                  category: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      studentIds.length > 0
        ? prisma.attendance.groupBy({
            by: ['studentId', 'status'],
            where: {
              studentId: { in: studentIds },
              classId: { in: classIds },
              date: {
                gte: monthStart(actualYear, requestedMonthNumber),
                lte: monthEnd(actualYear, requestedMonthNumber),
              },
            },
            _count: {
              status: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const gradeCountBySubject = new Map<string, number>();
    gradesForMonth.forEach((gradeEntry) => {
      gradeCountBySubject.set(gradeEntry.subjectId, (gradeCountBySubject.get(gradeEntry.subjectId) || 0) + 1);
    });

    const subjectsByGroup = new Map<string, typeof subjects>();
    subjects.forEach((subject) => {
      const groupKey = getKhmerMonthlySubjectGroupKey(subject);
      const groupedSubjects = subjectsByGroup.get(groupKey) || [];
      groupedSubjects.push(subject);
      subjectsByGroup.set(groupKey, groupedSubjects);
    });

    const subjectAliasMap = new Map<string, string[]>();
    const sortedSubjects = Array.from(subjectsByGroup.values())
      .map((groupedSubjects) => {
        const preferredSubject = [...groupedSubjects].sort((a, b) => {
          const bGradeCount = gradeCountBySubject.get(b.id) || 0;
          const aGradeCount = gradeCountBySubject.get(a.id) || 0;
          if (bGradeCount !== aGradeCount) return bGradeCount - aGradeCount;

          const aTrack = normalizeKhmerReportKey(a.track);
          const bTrack = normalizeKhmerReportKey(b.track);
          const aTrackPriority = aTrack && aTrack !== 'common' ? 0 : aTrack === 'common' ? 1 : 2;
          const bTrackPriority = bTrack && bTrack !== 'common' ? 0 : bTrack === 'common' ? 1 : 2;
          if (aTrackPriority !== bTrackPriority) return aTrackPriority - bTrackPriority;

          return compareSubjectsForKhmerMonthlyReport(a, b);
        })[0];

        subjectAliasMap.set(preferredSubject.id, groupedSubjects.map((subject) => subject.id));
        return preferredSubject;
      })
      .sort(compareSubjectsForKhmerMonthlyReport);

    const gradesByStudent = new Map<string, Map<string, any>>();
    gradesForMonth.forEach((gradeEntry) => {
      const studentGrades = gradesByStudent.get(gradeEntry.studentId) || new Map();
      studentGrades.set(gradeEntry.subjectId, gradeEntry);
      gradesByStudent.set(gradeEntry.studentId, studentGrades);
    });

    const attendanceByStudent = new Map<string, { absent: number; permission: number }>();
    attendanceCounts.forEach((entry) => {
      const totals = attendanceByStudent.get(entry.studentId) || { absent: 0, permission: 0 };
      if (entry.status === 'ABSENT') totals.absent += entry._count.status;
      if (entry.status === 'PERMISSION' || entry.status === 'EXCUSED') totals.permission += entry._count.status;
      attendanceByStudent.set(entry.studentId, totals);
    });

    const usesSemesterOneEnglishRule = shouldApplySemesterOneEnglishRule(reportGrade, requestedMonthNumber, monthLabel);
    const reportStudents = roster.map((entry) => {
      const classInfo = entry.class || classById.get(entry.student.classId || '');
      const classTrack = classInfo?.track || null;
      const studentGrades = gradesByStudent.get(entry.student.id) || new Map();
      const gradeMap: Record<string, number | null> = {};
      let totalScore = 0;
      let totalCoefficient = 0;
      let englishBonus = 0;

      sortedSubjects.forEach((subject) => {
        const subjectIds = subjectAliasMap.get(subject.id) || [subject.id];
        const appliesToTrack = subjectIds.some((subjectId) => {
          const subjectTrack = subjectById.get(subjectId)?.track || null;
          return !subjectTrack || subjectTrack === 'common' || subjectTrack === classTrack;
        });
        if (!appliesToTrack) return;

        const gradeEntry = subjectIds.map((subjectId) => studentGrades.get(subjectId)).find(Boolean);
        gradeMap[subject.id] = gradeEntry ? gradeEntry.score : null;
        if (!gradeEntry) return;

        if (usesSemesterOneEnglishRule && isEnglishSubject(subject)) {
          englishBonus += Math.max(gradeEntry.score - ENGLISH_SCORE_BASELINE, 0);
          return;
        }

        totalScore += gradeEntry.score;
        totalCoefficient += subject.coefficient || 0;
      });

      const adjustedTotalScore = totalScore + englishBonus;
      const average = totalCoefficient > 0 ? adjustedTotalScore / totalCoefficient : 0;
      const attendance = attendanceByStudent.get(entry.student.id) || { absent: 0, permission: 0 };

      return {
        studentId: entry.student.id,
        studentCode: entry.student.studentId,
        studentName: getKhmerStudentName(entry.student),
        firstName: entry.student.firstName,
        lastName: entry.student.lastName,
        gender: entry.student.gender,
        classId: classInfo?.id || entry.student.classId,
        className: classInfo?.name || '',
        classTrack,
        grades: gradeMap,
        totalScore: Math.round(adjustedTotalScore * 100) / 100,
        totalCoefficient: Math.round(totalCoefficient * 100) / 100,
        average: Math.round(average * 100) / 100,
        gradeLevel: khmerMonthlyGradeLevel(average),
        rank: 0,
        absent: attendance.absent,
        permission: attendance.permission,
      };
    });

    const rankedStudents = reportStudents
      .sort((a, b) => {
        if (b.average !== a.average) return b.average - a.average;
        return a.studentName.localeCompare(b.studentName, 'km');
      })
      .map((student, index) => ({
        ...student,
        rank: index + 1,
      }));

    const totalStudents = rankedStudents.length;
    const femaleStudents = rankedStudents.filter((student) => isFemaleGender(student.gender)).length;
    const passedStudents = rankedStudents.filter((student) => student.average >= KHMER_MONTH_PASSING_AVERAGE);
    const failedStudents = rankedStudents.filter((student) => student.average < KHMER_MONTH_PASSING_AVERAGE);

    const homeroomTeacher = reportScope === 'class' ? selectedClasses[0].homeroomTeacher : null;
    const result = {
      template: KHMER_MONTH_REPORT_TEMPLATE,
      scope: reportScope,
      school,
      academicYear: {
        startYear: academicStartYear,
        label: `${academicStartYear}-${academicStartYear + 1}`,
        id: selectedClasses[0].academicYearId,
      },
      period: {
        month: monthLabel,
        monthNumber: requestedMonthNumber,
        academicStartYear,
        year: actualYear,
      },
      class: reportScope === 'class'
        ? {
            id: selectedClasses[0].id,
            name: selectedClasses[0].name,
            grade: selectedClasses[0].grade,
            track: selectedClasses[0].track,
          }
        : null,
      grade: reportGrade,
      classNames: selectedClasses.map((classInfo) => classInfo.name),
      totalClasses: selectedClasses.length,
      teacherName: homeroomTeacher ? `${homeroomTeacher.firstName || ''} ${homeroomTeacher.lastName || ''}`.trim() : '',
      subjects: sortedSubjects,
      students: rankedStudents,
      statistics: {
        totalStudents,
        femaleStudents,
        passedStudents: passedStudents.length,
        passedFemaleStudents: passedStudents.filter((student) => isFemaleGender(student.gender)).length,
        failedStudents: failedStudents.length,
        failedFemaleStudents: failedStudents.filter((student) => isFemaleGender(student.gender)).length,
      },
      rules: {
        system: 'KHM_MOEYS',
        passingAverage: KHMER_MONTH_PASSING_AVERAGE,
        semesterOneEnglishBaseline: ENGLISH_SCORE_BASELINE,
        usesSemesterOneEnglishRule,
      },
      generatedAt: new Date().toISOString(),
    };

    writeGradeReportCache(cacheKey, result);
    res.json(result);
  } catch (error: any) {
    console.error('❌ Error generating monthly report:', error);
    res.status(500).json({
      message: 'Error generating monthly report',
      error: error.message,
    });
  }
});

/**
 * GET /grades/report-card/:studentId - Get student report card data
 * Query params: semester (1 or 2), year
 */
app.get('/grades/report-card/:studentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { semester = '1', year } = req.query;
    const schoolId = getSchoolId(req);
    const currentYear = await resolveReportAcademicStartYear(schoolId, year as string | undefined);
    const termContext = await resolveReportTermContext(schoolId, String(semester), currentYear);
    const gradePeriodWhere = buildGradePeriodWhere(termContext.periods);
    const cacheKey = `${schoolId || 'unknown'}:report-card:${studentId}:${String(semester)}:${currentYear}:${reportPeriodCacheKey(termContext)}`;
    const cachedResponse = readGradeReportCache(cacheKey);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

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
          ...gradePeriodWhere,
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
      getAttendanceSummary(studentId, termContext),
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
              ...gradePeriodWhere,
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
      term: {
        name: termContext.termName,
        startDate: termContext.startDate.toISOString(),
        endDate: termContext.endDate.toISOString(),
        months: termContext.periods,
      },
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
    const schoolId = getSchoolId(req);
    const currentYear = await resolveReportAcademicStartYear(schoolId, year as string | undefined);
    const termContext = await resolveReportTermContext(schoolId, String(semester), currentYear);
    const gradePeriodWhere = buildGradePeriodWhere(termContext.periods);
    const cacheKey = `${schoolId || 'unknown'}:class-report:${classId}:${String(semester)}:${currentYear}:${reportPeriodCacheKey(termContext)}`;
    const cachedResponse = readGradeReportCache(cacheKey);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

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
          ...gradePeriodWhere,
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
      term: {
        name: termContext.termName,
        startDate: termContext.startDate.toISOString(),
        endDate: termContext.endDate.toISOString(),
        months: termContext.periods,
      },
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
    const schoolId = getSchoolId(req);
    const currentYear = await resolveReportAcademicStartYear(schoolId, year as string | undefined);
    const termContext = await resolveReportTermContext(schoolId, semester, currentYear);
    const gradePeriodWhere = buildGradePeriodWhere(termContext.periods);
    const cacheKey = `${schoolId || 'unknown'}:semester-summary:${classId}:${semester}:${currentYear}:${reportPeriodCacheKey(termContext)}`;
    const cachedResponse = readGradeReportCache(cacheKey);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    const [grades, classInfo, studentCount] = await Promise.all([
      prisma.grade.findMany({
        where: {
          classId,
          ...gradePeriodWhere,
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
      term: {
        name: termContext.termName,
        startDate: termContext.startDate.toISOString(),
        endDate: termContext.endDate.toISOString(),
      },
      months: termContext.periods.map((period) => period.label),
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
    const schoolId = getSchoolId(req);
    const currentYear = await resolveReportAcademicStartYear(schoolId, year as string | undefined);
    const termContext = await resolveReportTermContext(schoolId, String(semester), currentYear);
    const gradePeriodWhere = buildGradePeriodWhere(termContext.periods);
    const cacheKey = `${schoolId || 'unknown'}:grade-analytics:${classId}:${String(semester)}:${currentYear}:${reportPeriodCacheKey(termContext)}`;
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
          ...gradePeriodWhere,
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

    const monthlyTotals = new Map<string, { total: number; count: number }>();
    const subjectPerformanceMap = new Map<string, { name: string; total: number; count: number }>();
    const categoryTotals: Record<string, { total: number; count: number }> = {
      Sciences: { total: 0, count: 0 },
      Mathematics: { total: 0, count: 0 },
      Languages: { total: 0, count: 0 },
      Social: { total: 0, count: 0 },
      Arts: { total: 0, count: 0 },
    };

    grades.forEach((grade) => {
      const monthKey = `${grade.year}-${grade.monthNumber}`;
      const monthData = monthlyTotals.get(monthKey) || { total: 0, count: 0 };
      monthData.total += grade.percentage ?? 0;
      monthData.count += 1;
      monthlyTotals.set(monthKey, monthData);

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

    const monthlyTrend = termContext.periods.map((period) => {
      const item = monthlyTotals.get(`${period.year}-${period.monthNumber}`);
      return {
        month: period.label,
        monthNumber: period.monthNumber,
        year: period.year,
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
      term: {
        name: termContext.termName,
        startDate: termContext.startDate.toISOString(),
        endDate: termContext.endDate.toISOString(),
        months: termContext.periods,
      },
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
async function getAttendanceSummary(studentId: string, termContext: ReportTermContext) {
  try {
    const attendanceCounts = await prisma.attendance.groupBy({
      by: ['status'],
      where: {
        studentId,
        date: {
          gte: termContext.startDate,
          lte: termContext.endDate,
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
  console.log(`   GET    /grades/monthly-report - Khmer monthly report`);
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
