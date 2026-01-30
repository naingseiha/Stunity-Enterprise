import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3006;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ========================================
// Middleware
// ========================================

app.use(cors());
app.use(express.json());

// Authentication Middleware
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

// ========================================
// Utility Functions
// ========================================

const getSchoolId = (req: AuthRequest): string | null => {
  return req.user?.schoolId || req.user?.school?.id || null;
};

// ========================================
// Health Check
// ========================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    service: 'subject-service',
    status: 'healthy',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// ========================================
// SUBJECT ENDPOINTS - FULL FEATURES
// ========================================

/**
 * GET /subjects - Get all subjects with filters
 * Query params:
 * - grade: Filter by grade (7, 8, 9, 10, 11, 12)
 * - track: Filter by track (Science, Social, Math-Bilingual)
 * - category: Filter by category (Core, Optional, Elective)
 * - isActive: Filter by active status (true/false)
 * - search: Search by name/code
 * - includeTeachers: Include teacher assignments (true/false)
 */
app.get('/subjects', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ message: 'School ID is required' });
    }

    const {
      grade,
      track,
      category,
      isActive,
      search,
      includeTeachers = 'false',
    } = req.query;

    // Build filter conditions
    const where: any = {};

    if (grade) where.grade = grade as string;
    if (track) where.track = track as string;
    if (category) where.category = category as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { nameKh: { contains: search as string, mode: 'insensitive' } },
        { nameEn: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const subjects = await prisma.subject.findMany({
      where,
      include: {
        subjectTeachers: includeTeachers === 'true' ? {
          include: {
            teacher: {
              select: {
                id: true,
                teacherId: true,
                firstName: true,
                lastName: true,
                khmerName: true,
                email: true,
                phone: true,
                schoolId: true,
              },
            },
          },
          where: {
            teacher: {
              schoolId: schoolId,
            },
          },
        } : false,
        _count: {
          select: {
            grades: true,
            subjectTeachers: true,
          },
        },
      },
      orderBy: [
        { grade: 'asc' },
        { name: 'asc' },
      ],
    });

    console.log(`✅ Found ${subjects.length} subjects for school ${schoolId}`);

    res.json(subjects);
  } catch (error: any) {
    console.error('❌ Error getting subjects:', error);
    res.status(500).json({
      message: 'Error getting subjects',
      error: error.message,
    });
  }
});

/**
 * GET /subjects/lightweight - Lightweight list for dropdowns
 */
app.get('/subjects/lightweight', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { grade, isActive = 'true' } = req.query;

    const where: any = {
      isActive: isActive === 'true',
    };

    if (grade) where.grade = grade as string;

    const subjects = await prisma.subject.findMany({
      where,
      select: {
        id: true,
        name: true,
        nameKh: true,
        nameEn: true,
        code: true,
        grade: true,
        track: true,
        category: true,
        coefficient: true,
        maxScore: true,
      },
      orderBy: [
        { grade: 'asc' },
        { name: 'asc' },
      ],
    });

    res.json(subjects);
  } catch (error: any) {
    console.error('❌ Error getting lightweight subjects:', error);
    res.status(500).json({
      message: 'Error getting subjects',
      error: error.message,
    });
  }
});

/**
 * GET /subjects/:id - Get single subject by ID
 */
app.get('/subjects/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = getSchoolId(req);

    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        subjectTeachers: {
          include: {
            teacher: {
              select: {
                id: true,
                teacherId: true,
                firstName: true,
                lastName: true,
                khmerName: true,
                email: true,
                phone: true,
                schoolId: true,
              },
            },
          },
          where: schoolId ? {
            teacher: {
              schoolId: schoolId,
            },
          } : {},
        },
        _count: {
          select: {
            grades: true,
            subjectTeachers: true,
          },
        },
      },
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    res.json(subject);
  } catch (error: any) {
    console.error('❌ Error getting subject:', error);
    res.status(500).json({
      message: 'Error getting subject',
      error: error.message,
    });
  }
});

/**
 * POST /subjects - Create new subject
 */
app.post('/subjects', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      nameKh,
      nameEn,
      code,
      description,
      grade,
      track,
      category,
      weeklyHours = 0,
      annualHours = 0,
      maxScore = 100,
      coefficient = 1.0,
      isActive = true,
    } = req.body;

    // Validation
    if (!name || !nameKh || !code || !grade || !category) {
      return res.status(400).json({
        message: 'Missing required fields: name, nameKh, code, grade, category',
      });
    }

    // Check for duplicate code
    const existing = await prisma.subject.findUnique({
      where: { code },
    });

    if (existing) {
      return res.status(409).json({
        message: 'Subject code already exists',
      });
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        nameKh,
        nameEn,
        code,
        description,
        grade,
        track,
        category,
        weeklyHours: parseFloat(weeklyHours),
        annualHours: parseInt(annualHours),
        maxScore: parseInt(maxScore),
        coefficient: parseFloat(coefficient),
        isActive,
      },
    });

    console.log(`✅ Created subject: ${subject.name} (${subject.code})`);

    res.status(201).json(subject);
  } catch (error: any) {
    console.error('❌ Error creating subject:', error);
    res.status(500).json({
      message: 'Error creating subject',
      error: error.message,
    });
  }
});

/**
 * PUT /subjects/:id - Update subject
 */
app.put('/subjects/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      nameKh,
      nameEn,
      code,
      description,
      grade,
      track,
      category,
      weeklyHours,
      annualHours,
      maxScore,
      coefficient,
      isActive,
    } = req.body;

    // Check if subject exists
    const existing = await prisma.subject.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Check for duplicate code if code is being changed
    if (code && code !== existing.code) {
      const duplicate = await prisma.subject.findUnique({
        where: { code },
      });

      if (duplicate) {
        return res.status(409).json({
          message: 'Subject code already exists',
        });
      }
    }

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameKh !== undefined && { nameKh }),
        ...(nameEn !== undefined && { nameEn }),
        ...(code !== undefined && { code }),
        ...(description !== undefined && { description }),
        ...(grade !== undefined && { grade }),
        ...(track !== undefined && { track }),
        ...(category !== undefined && { category }),
        ...(weeklyHours !== undefined && { weeklyHours: parseFloat(weeklyHours) }),
        ...(annualHours !== undefined && { annualHours: parseInt(annualHours) }),
        ...(maxScore !== undefined && { maxScore: parseInt(maxScore) }),
        ...(coefficient !== undefined && { coefficient: parseFloat(coefficient) }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    console.log(`✅ Updated subject: ${subject.name} (${subject.id})`);

    res.json(subject);
  } catch (error: any) {
    console.error('❌ Error updating subject:', error);
    res.status(500).json({
      message: 'Error updating subject',
      error: error.message,
    });
  }
});

/**
 * DELETE /subjects/:id - Delete subject
 */
app.delete('/subjects/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if subject exists
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            grades: true,
            subjectTeachers: true,
          },
        },
      },
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Check if subject has grades
    if (subject._count.grades > 0) {
      return res.status(400).json({
        message: 'Cannot delete subject with existing grades. Please deactivate instead.',
        gradeCount: subject._count.grades,
      });
    }

    // Delete subject (will cascade delete teacher assignments)
    await prisma.subject.delete({
      where: { id },
    });

    console.log(`✅ Deleted subject: ${subject.name} (${id})`);

    res.json({
      message: 'Subject deleted successfully',
      deletedSubject: subject,
    });
  } catch (error: any) {
    console.error('❌ Error deleting subject:', error);
    res.status(500).json({
      message: 'Error deleting subject',
      error: error.message,
    });
  }
});

/**
 * PATCH /subjects/:id/toggle-status - Toggle active status
 */
app.patch('/subjects/:id/toggle-status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const subject = await prisma.subject.findUnique({
      where: { id },
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const updated = await prisma.subject.update({
      where: { id },
      data: {
        isActive: !subject.isActive,
      },
    });

    console.log(`✅ Toggled subject status: ${updated.name} -> ${updated.isActive ? 'Active' : 'Inactive'}`);

    res.json(updated);
  } catch (error: any) {
    console.error('❌ Error toggling subject status:', error);
    res.status(500).json({
      message: 'Error toggling subject status',
      error: error.message,
    });
  }
});

// ========================================
// TEACHER ASSIGNMENT ENDPOINTS
// ========================================

/**
 * POST /subjects/:id/teachers - Assign teacher to subject
 */
app.post('/subjects/:id/teachers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id: subjectId } = req.params;
    const { teacherId } = req.body;
    const schoolId = getSchoolId(req);

    if (!teacherId) {
      return res.status(400).json({ message: 'Teacher ID is required' });
    }

    // Verify teacher exists and belongs to school
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId: schoolId || undefined,
      },
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Check if assignment already exists
    const existing = await prisma.subjectTeacher.findUnique({
      where: {
        subjectId_teacherId: {
          subjectId,
          teacherId,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ message: 'Teacher already assigned to this subject' });
    }

    const assignment = await prisma.subjectTeacher.create({
      data: {
        subjectId,
        teacherId,
      },
      include: {
        teacher: {
          select: {
            id: true,
            teacherId: true,
            firstName: true,
            lastName: true,
            khmerName: true,
            email: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            nameKh: true,
            code: true,
            grade: true,
          },
        },
      },
    });

    console.log(`✅ Assigned teacher ${teacher.khmerName} to subject ${assignment.subject.name}`);

    res.status(201).json(assignment);
  } catch (error: any) {
    console.error('❌ Error assigning teacher:', error);
    res.status(500).json({
      message: 'Error assigning teacher',
      error: error.message,
    });
  }
});

/**
 * DELETE /subjects/:id/teachers/:teacherId - Remove teacher assignment
 */
app.delete('/subjects/:id/teachers/:teacherId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id: subjectId, teacherId } = req.params;

    const assignment = await prisma.subjectTeacher.findUnique({
      where: {
        subjectId_teacherId: {
          subjectId,
          teacherId,
        },
      },
      include: {
        teacher: true,
        subject: true,
      },
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    await prisma.subjectTeacher.delete({
      where: {
        subjectId_teacherId: {
          subjectId,
          teacherId,
        },
      },
    });

    console.log(`✅ Removed teacher ${assignment.teacher.khmerName} from subject ${assignment.subject.name}`);

    res.json({
      message: 'Teacher assignment removed successfully',
      assignment,
    });
  } catch (error: any) {
    console.error('❌ Error removing teacher assignment:', error);
    res.status(500).json({
      message: 'Error removing teacher assignment',
      error: error.message,
    });
  }
});

/**
 * GET /subjects/:id/teachers - Get teachers assigned to subject
 */
app.get('/subjects/:id/teachers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id: subjectId } = req.params;
    const schoolId = getSchoolId(req);

    const assignments = await prisma.subjectTeacher.findMany({
      where: {
        subjectId,
        ...(schoolId && {
          teacher: {
            schoolId,
          },
        }),
      },
      include: {
        teacher: {
          select: {
            id: true,
            teacherId: true,
            firstName: true,
            lastName: true,
            khmerName: true,
            email: true,
            phone: true,
            gender: true,
            photoUrl: true,
          },
        },
      },
    });

    res.json(assignments);
  } catch (error: any) {
    console.error('❌ Error getting subject teachers:', error);
    res.status(500).json({
      message: 'Error getting subject teachers',
      error: error.message,
    });
  }
});

// ========================================
// ADVANCED QUERY ENDPOINTS
// ========================================

/**
 * GET /subjects/by-grade/:grade - Get subjects by grade
 */
app.get('/subjects/by-grade/:grade', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { grade } = req.params;
    const { isActive = 'true', track } = req.query;

    const where: any = {
      grade,
      isActive: isActive === 'true',
    };

    if (track) where.track = track as string;

    const subjects = await prisma.subject.findMany({
      where,
      include: {
        _count: {
          select: {
            subjectTeachers: true,
            grades: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json(subjects);
  } catch (error: any) {
    console.error('❌ Error getting subjects by grade:', error);
    res.status(500).json({
      message: 'Error getting subjects by grade',
      error: error.message,
    });
  }
});

/**
 * GET /subjects/by-teacher/:teacherId - Get subjects taught by teacher
 */
app.get('/subjects/by-teacher/:teacherId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { teacherId } = req.params;

    const assignments = await prisma.subjectTeacher.findMany({
      where: {
        teacherId,
      },
      include: {
        subject: {
          include: {
            _count: {
              select: {
                grades: true,
              },
            },
          },
        },
      },
    });

    const subjects = assignments.map(a => a.subject);

    res.json(subjects);
  } catch (error: any) {
    console.error('❌ Error getting subjects by teacher:', error);
    res.status(500).json({
      message: 'Error getting subjects by teacher',
      error: error.message,
    });
  }
});

/**
 * GET /subjects/statistics - Get subject statistics
 */
app.get('/subjects/statistics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const totalSubjects = await prisma.subject.count();
    const activeSubjects = await prisma.subject.count({ where: { isActive: true } });
    const inactiveSubjects = await prisma.subject.count({ where: { isActive: false } });

    // By grade
    const byGrade = await prisma.subject.groupBy({
      by: ['grade'],
      _count: true,
      orderBy: {
        grade: 'asc',
      },
    });

    // By category
    const byCategory = await prisma.subject.groupBy({
      by: ['category'],
      _count: true,
    });

    // By track
    const byTrack = await prisma.subject.groupBy({
      by: ['track'],
      _count: true,
    });

    res.json({
      total: totalSubjects,
      active: activeSubjects,
      inactive: inactiveSubjects,
      byGrade,
      byCategory,
      byTrack,
    });
  } catch (error: any) {
    console.error('❌ Error getting subject statistics:', error);
    res.status(500).json({
      message: 'Error getting subject statistics',
      error: error.message,
    });
  }
});

// ========================================
// BULK OPERATIONS
// ========================================

/**
 * POST /subjects/bulk-create - Create multiple subjects
 */
app.post('/subjects/bulk-create', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { subjects } = req.body;

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ message: 'Subjects array is required' });
    }

    const created = await prisma.subject.createMany({
      data: subjects.map((s: any) => ({
        name: s.name,
        nameKh: s.nameKh,
        nameEn: s.nameEn,
        code: s.code,
        description: s.description,
        grade: s.grade,
        track: s.track,
        category: s.category,
        weeklyHours: parseFloat(s.weeklyHours || 0),
        annualHours: parseInt(s.annualHours || 0),
        maxScore: parseInt(s.maxScore || 100),
        coefficient: parseFloat(s.coefficient || 1.0),
        isActive: s.isActive !== undefined ? s.isActive : true,
      })),
      skipDuplicates: true,
    });

    console.log(`✅ Bulk created ${created.count} subjects`);

    res.status(201).json({
      message: `Successfully created ${created.count} subjects`,
      count: created.count,
    });
  } catch (error: any) {
    console.error('❌ Error bulk creating subjects:', error);
    res.status(500).json({
      message: 'Error bulk creating subjects',
      error: error.message,
    });
  }
});

// ========================================
// Start Server
// ========================================

app.listen(PORT, () => {
  console.log(`🎓 Subject Service running on port ${PORT}`);
  console.log(`📚 Endpoints:`);
  console.log(`   GET    /subjects - List all subjects with filters`);
  console.log(`   GET    /subjects/lightweight - Lightweight list`);
  console.log(`   GET    /subjects/:id - Get single subject`);
  console.log(`   POST   /subjects - Create subject`);
  console.log(`   PUT    /subjects/:id - Update subject`);
  console.log(`   DELETE /subjects/:id - Delete subject`);
  console.log(`   PATCH  /subjects/:id/toggle-status - Toggle active status`);
  console.log(`   POST   /subjects/:id/teachers - Assign teacher`);
  console.log(`   DELETE /subjects/:id/teachers/:teacherId - Remove teacher`);
  console.log(`   GET    /subjects/:id/teachers - Get subject teachers`);
  console.log(`   GET    /subjects/by-grade/:grade - Get by grade`);
  console.log(`   GET    /subjects/by-teacher/:teacherId - Get by teacher`);
  console.log(`   GET    /subjects/statistics - Get statistics`);
  console.log(`   POST   /subjects/bulk-create - Bulk create`);
});
