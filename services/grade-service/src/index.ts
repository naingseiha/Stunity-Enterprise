import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3007;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ========================================
// Middleware
// ========================================

app.use(cors());
app.use(express.json());

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

app.use(authenticateToken);

const getSchoolId = (req: AuthRequest): string | null => {
  return req.user?.schoolId || req.user?.school?.id || null;
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

// ========================================
// Health Check
// ========================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    service: 'grade-service',
    status: 'healthy',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

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
            khmerName: true,
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

      // Get all students in class
      const students = await prisma.student.findMany({
        where: { classId },
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          khmerName: true,
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

    // Process each grade in a transaction
    await prisma.$transaction(
      grades.map((gradeData) => {
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

        const percentage = calculatePercentage(score, maxScore);

        // Get subject to calculate weighted score
        return prisma.subject.findUnique({ where: { id: subjectId } }).then((subject) => {
          if (!subject) {
            results.errors.push({ studentId, error: 'Subject not found' });
            return null;
          }

          const weightedScore = calculateWeightedScore(score, subject.coefficient);

          // Try to find existing grade
          return prisma.grade
            .findFirst({
              where: {
                studentId,
                subjectId,
                classId,
                month,
                year: currentYear,
              },
            })
            .then((existing) => {
              if (existing) {
                // Update existing
                results.updated++;
                return prisma.grade.update({
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
              } else {
                // Create new
                results.created++;
                return prisma.grade.create({
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
              }
            });
        });
      })
    );

    console.log(`✅ Batch operation: Created ${results.created}, Updated ${results.updated}`);

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

    console.log(`✅ Updated grade for student ${updatedGrade.student.khmerName}`);

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

    const grade = await prisma.grade.delete({
      where: { id },
    });

    console.log(`✅ Deleted grade ${id}`);

    res.json({
      message: 'Grade deleted successfully',
      grade,
    });
  } catch (error: any) {
    console.error('❌ Error deleting grade:', error);
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
            khmerName: true,
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
        studentName: student.khmerName,
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
});
