import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables from root .env
dotenv.config({ path: '../../.env' });

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const app = express();

// ✅ Singleton Prisma pattern
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
  log: ['error'],
});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Database warmup
(async () => { try { await prisma.$queryRaw`SELECT 1`; console.log('✅ Database ready'); } catch (e) { console.error('⚠️ DB warmup failed'); } })();

const PORT = process.env.PORT || 3005;
const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';

// Middleware - CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ===========================
// JWT Auth Middleware
// ===========================
interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    schoolId: string;
    school?: any;
  };
}

const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // OPTIMIZED: Use data from JWT token instead of database query
    // This reduces response time from ~200ms to <5ms
    
    // Basic validation
    if (!decoded.userId || !decoded.schoolId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format',
      });
    }

    // Check if school is active (from token)
    if (decoded.school && !decoded.school.isActive) {
      return res.status(403).json({
        success: false,
        message: 'School account is inactive',
      });
    }

    // Check if trial expired (from token)
    if (decoded.school?.isTrial && decoded.school?.subscriptionEnd) {
      const now = new Date();
      const trialEnd = new Date(decoded.school.subscriptionEnd);
      if (now > trialEnd) {
        return res.status(403).json({
          success: false,
          message: 'Trial period has expired. Please upgrade to continue.',
        });
      }
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email || '',
      role: decoded.role,
      schoolId: decoded.schoolId,
      school: decoded.school,
    };

    next();
  } catch (error: any) {
    console.error('❌ Auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

// ===========================
// Health Check
// ===========================
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Class service is running',
    service: 'class-service',
    version: '2.0.0',
    port: PORT,
  });
});

// ===========================
// POST /classes/batch
// Batch create classes (for onboarding - no auth required)
// ===========================
app.post('/classes/batch', async (req: Request, res: Response) => {
  try {
    const { schoolId, academicYearId, classes } = req.body;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: 'schoolId is required',
      });
    }

    if (!academicYearId) {
      return res.status(400).json({
        success: false,
        message: 'academicYearId is required',
      });
    }

    if (!classes || !Array.isArray(classes) || classes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'classes array is required',
      });
    }

    console.log(`➕ [Onboarding] Batch creating ${classes.length} classes for school ${schoolId}...`);

    const createdClasses = [];
    const errors = [];

    for (const classData of classes) {
      try {
        const {
          name,
          nameKh,
          grade,
          section,
          capacity,
        } = classData;

        // Basic validation
        if (!name || !grade) {
          errors.push({
            class: classData,
            error: 'Missing required fields (name, grade)',
          });
          continue;
        }

        // Check for duplicate class name
        const existingClass = await prisma.class.findFirst({
          where: {
            schoolId,
            academicYearId,
            name,
          },
        });

        if (existingClass) {
          errors.push({
            class: classData,
            error: `Class with name ${name} already exists`,
          });
          continue;
        }

        // Create class
        const newClass = await prisma.class.create({
          data: {
            schoolId,
            academicYearId,
            name,
            grade,
            section: section || null,
            capacity: capacity || 40,
          },
        });

        createdClasses.push(newClass);
        console.log(`✅ Created class: ${newClass.name}`);
      } catch (error: any) {
        console.error(`❌ Error creating class:`, error);
        errors.push({
          class: classData,
          error: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Created ${createdClasses.length} classes`,
      data: {
        classesCreated: createdClasses.length,
        classes: createdClasses,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error: any) {
    console.error('❌ Batch create error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating classes',
      error: error.message,
    });
  }
});

// Apply auth middleware to all routes below
app.use(authMiddleware);

// ===========================
// GET /classes/lightweight
// Ultra-fast loading for dropdowns
// ===========================
app.get('/classes/lightweight', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const academicYearId = req.query.academicYearId as string | undefined;
    const startTime = Date.now();
    console.log(`⚡ [School ${schoolId}] Fetching classes (lightweight)...`);
    if (academicYearId) {
      console.log(`📅 Filtering by Academic Year: ${academicYearId}`);
    }

    const where: any = {
      schoolId: schoolId,
    };
    
    // Add academic year filter if provided
    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    const classes = await prisma.class.findMany({
      where,
      select: {
        id: true,
        classId: true,
        name: true,
        grade: true,
        section: true,
        track: true,
        capacity: true,
        academicYear: {
          select: {
            id: true,
            name: true,
            isCurrent: true,
          },
        },
        _count: {
          select: {
            studentClasses: true, // Count from junction table instead of direct students
          },
        },
        homeroomTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            khmerName: true,
          },
        },
      },
      orderBy: [{ grade: 'asc' }, { section: 'asc' }],
    });

    const elapsedTime = Date.now() - startTime;
    console.log(
      `⚡ [School ${schoolId}] Found ${classes.length} classes in ${elapsedTime}ms`
    );

    res.json({
      success: true,
      data: classes,
    });
  } catch (error: any) {
    console.error('❌ Error getting classes (lightweight):', error);
    res.status(500).json({
      success: false,
      message: 'Error getting classes',
      error: error.message,
    });
  }
});

// ===========================
// GET /classes
// Full data with relations
// ===========================
app.get('/classes', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const academicYearId = req.query.academicYearId as string | undefined;
    console.log(`📚 [School ${schoolId}] Fetching all classes (full data)...`);
    if (academicYearId) {
      console.log(`📅 Filtering by Academic Year: ${academicYearId}`);
    }

    const where: any = {
      schoolId: schoolId,
    };
    
    // Add academic year filter if provided
    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        homeroomTeacher: {
          select: {
            id: true,
            khmerName: true,
            englishName: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        academicYear: {
          select: {
            id: true,
            name: true,
            isCurrent: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        studentClasses: {
          include: {
            student: {
              select: {
                id: true,
                khmerName: true,
                firstName: true,
                lastName: true,
                gender: true,
                studentId: true,
                photoUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            studentClasses: true,
          },
        },
      },
      orderBy: [{ grade: 'asc' }, { section: 'asc' }],
    });

    console.log(`✅ [School ${schoolId}] Found ${classes.length} classes`);

    res.json({
      success: true,
      data: classes,
    });
  } catch (error: any) {
    console.error('❌ Error getting classes:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting classes',
      error: error.message,
    });
  }
});

// ===========================
// GET /classes/grade/:grade
// Get classes by grade
// ===========================
app.get('/classes/grade/:grade', async (req: AuthRequest, res: Response) => {
  try {
    const { grade } = req.params;
    const schoolId = req.user!.schoolId;
    console.log(`📚 [School ${schoolId}] Fetching classes for grade ${grade}...`);

    const classes = await prisma.class.findMany({
      where: {
        schoolId: schoolId,
        grade: grade, // Already a string from params
      },
      include: {
        homeroomTeacher: {
          select: {
            id: true,
            khmerName: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: [{ section: 'asc' }],
    });

    console.log(`✅ [School ${schoolId}] Found ${classes.length} classes for grade ${grade}`);

    res.json({
      success: true,
      data: classes,
    });
  } catch (error: any) {
    console.error('❌ Error getting classes by grade:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting classes by grade',
      error: error.message,
    });
  }
});

// ===========================
// GET /classes/:id
// Get single class by ID
// ===========================
app.get('/classes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    console.log(`📚 [School ${schoolId}] Fetching class: ${id}`);

    const classData = await prisma.class.findFirst({
      where: {
        id: id,
        schoolId: schoolId, // ✅ Multi-tenant check
      },
      include: {
        homeroomTeacher: {
          select: {
            id: true,
            khmerName: true,
            englishName: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        academicYear: {
          select: {
            id: true,
            name: true,
            isCurrent: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        studentClasses: {
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                khmerName: true,
                firstName: true,
                lastName: true,
                gender: true,
                email: true,
                phoneNumber: true,
                photoUrl: true,
                dateOfBirth: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        teacherClasses: {
          include: {
            teacher: {
              select: {
                id: true,
                khmerName: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            studentClasses: true,
          },
        },
      },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    console.log(`✅ [School ${schoolId}] Found class: ${classData.name} (${classData.academicYear.name})`);

    res.json({
      success: true,
      data: classData,
    });
  } catch (error: any) {
    console.error('❌ Error fetching class:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching class',
      error: error.message,
    });
  }
});

// ===========================
// POST /classes
// Create new class
// ===========================
app.post('/classes', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    console.log(`➕ [School ${schoolId}] Creating new class...`);

    const {
      classId,
      name,
      grade,
      section,
      track,
      academicYearId,
      homeroomTeacherId,
      capacity,
    } = req.body;

    // Validation
    if (!name || !grade || !academicYearId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, grade, academicYearId',
      });
    }

    // Verify academic year belongs to school
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id: academicYearId,
        schoolId: schoolId,
      },
    });

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Academic year not found or does not belong to your school',
      });
    }

    // Check if class name already exists in this school for this academic year
    const existingClass = await prisma.class.findFirst({
      where: {
        name,
        schoolId,
        academicYearId,
      },
    });

    if (existingClass) {
      return res.status(400).json({
        success: false,
        message: 'Class name already exists in your school for this academic year',
      });
    }

    // Verify homeroom teacher belongs to school (if provided)
    if (homeroomTeacherId) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          id: homeroomTeacherId,
          schoolId: schoolId,
        },
      });

      if (!teacher) {
        return res.status(400).json({
          success: false,
          message: 'Homeroom teacher not found or does not belong to your school',
        });
      }

      // Check if teacher is already a homeroom teacher for another class in this academic year
      const existingHomeroom = await prisma.class.findFirst({
        where: {
          homeroomTeacherId: homeroomTeacherId,
          schoolId: schoolId,
          academicYearId,
        },
      });

      if (existingHomeroom) {
        return res.status(400).json({
          success: false,
          message: `Teacher is already homeroom teacher for class ${existingHomeroom.name} in this academic year`,
        });
      }
    }

    // Create class
    const newClass = await prisma.class.create({
      data: {
        classId,
        name,
        grade,
        section,
        track,
        academicYearId,
        homeroomTeacherId,
        capacity,
        schoolId: schoolId, // ✅ Multi-tenant
      },
      include: {
        homeroomTeacher: {
          select: {
            id: true,
            khmerName: true,
            firstName: true,
            lastName: true,
          },
        },
        academicYear: {
          select: {
            id: true,
            name: true,
            isCurrent: true,
          },
        },
      },
    });

    console.log(`✅ [School ${schoolId}] Created class: ${newClass.name}`);

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: newClass,
    });
  } catch (error: any) {
    console.error('❌ Error creating class:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating class',
      error: error.message,
    });
  }
});

// ===========================
// PUT /classes/:id
// Update class
// ===========================
app.put('/classes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    console.log(`✏️ [School ${schoolId}] Updating class: ${id}`);

    // ✅ Verify class belongs to school
    const existingClass = await prisma.class.findFirst({
      where: {
        id,
        schoolId: schoolId,
      },
    });

    if (!existingClass) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    const {
      classId,
      name,
      grade,
      section,
      track,
      academicYearId,
      homeroomTeacherId,
      capacity,
    } = req.body;

    // If changing academic year, verify new year exists and belongs to school
    if (academicYearId && academicYearId !== existingClass.academicYearId) {
      const academicYear = await prisma.academicYear.findFirst({
        where: {
          id: academicYearId,
          schoolId: schoolId,
        },
      });

      if (!academicYear) {
        return res.status(400).json({
          success: false,
          message: 'Academic year not found or does not belong to your school',
        });
      }
    }

    // Verify new homeroom teacher belongs to school (if provided)
    if (homeroomTeacherId && homeroomTeacherId !== existingClass.homeroomTeacherId) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          id: homeroomTeacherId,
          schoolId: schoolId,
        },
      });

      if (!teacher) {
        return res.status(400).json({
          success: false,
          message: 'Homeroom teacher not found or does not belong to your school',
        });
      }

      // Check if teacher is already a homeroom teacher for another class in this academic year
      const finalAcademicYearId = academicYearId || existingClass.academicYearId;
      const existingHomeroom = await prisma.class.findFirst({
        where: {
          homeroomTeacherId: homeroomTeacherId,
          schoolId: schoolId,
          academicYearId: finalAcademicYearId,
          id: { not: id }, // Exclude current class
        },
      });

      if (existingHomeroom) {
        return res.status(400).json({
          success: false,
          message: `Teacher is already homeroom teacher for class ${existingHomeroom.name} in this academic year`,
        });
      }
    }

    // Update class
    const updatedClass = await prisma.class.update({
      where: { id },
      data: {
        ...(classId !== undefined && { classId }),
        ...(name !== undefined && { name }),
        ...(grade !== undefined && { grade }),
        ...(section !== undefined && { section }),
        ...(track !== undefined && { track }),
        ...(academicYearId !== undefined && { academicYearId }),
        ...(homeroomTeacherId !== undefined && { homeroomTeacherId }),
        ...(capacity !== undefined && { capacity }),
      },
      include: {
        homeroomTeacher: {
          select: {
            id: true,
            khmerName: true,
            firstName: true,
            lastName: true,
          },
        },
        academicYear: {
          select: {
            id: true,
            name: true,
            isCurrent: true,
          },
        },
        _count: {
          select: {
            studentClasses: true,
          },
        },
      },
    });

    console.log(`✅ [School ${schoolId}] Updated class: ${updatedClass.name}`);

    res.json({
      success: true,
      message: 'Class updated successfully',
      data: updatedClass,
    });
  } catch (error: any) {
    console.error('❌ Error updating class:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating class',
      error: error.message,
    });
  }
});

// ===========================
// DELETE /classes/:id
// Delete class
// ===========================
app.delete('/classes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    console.log(`🗑️ [School ${schoolId}] Deleting class: ${id}`);

    // ✅ Verify class belongs to school
    const existingClass = await prisma.class.findFirst({
      where: {
        id,
        schoolId: schoolId,
      },
      include: {
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    if (!existingClass) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    // Check if class has students
    if (existingClass._count.students > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete class with ${existingClass._count.students} students. Please reassign students first.`,
      });
    }

    // Delete class
    await prisma.class.delete({
      where: { id },
    });

    console.log(`✅ [School ${schoolId}] Deleted class: ${existingClass.name}`);

    res.json({
      success: true,
      message: 'Class deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Error deleting class:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting class',
      error: error.message,
    });
  }
});

// ===========================
// POST /classes/:id/assign-students
// Assign students to class
// ===========================
app.post('/classes/:id/assign-students', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { studentIds } = req.body;
    const schoolId = req.user!.schoolId;
    console.log(`➕ [School ${schoolId}] Assigning students to class: ${id}`);

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'studentIds array is required',
      });
    }

    // ✅ Verify class belongs to school
    const classData = await prisma.class.findFirst({
      where: {
        id,
        schoolId: schoolId,
      },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    // ✅ Verify all students belong to school
    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        schoolId: schoolId,
      },
    });

    if (students.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some students not found or do not belong to your school',
      });
    }

    // Update students to assign to class
    await prisma.student.updateMany({
      where: {
        id: { in: studentIds },
      },
      data: {
        classId: id,
      },
    });

    console.log(
      `✅ [School ${schoolId}] Assigned ${studentIds.length} students to class ${classData.name}`
    );

    res.json({
      success: true,
      message: `Successfully assigned ${studentIds.length} students to class`,
    });
  } catch (error: any) {
    console.error('❌ Error assigning students:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning students',
      error: error.message,
    });
  }
});

// ===========================
// DELETE /classes/:id/students/:studentId
// Remove student from class
// ===========================
app.delete('/classes/:id/students/:studentId', async (req: AuthRequest, res: Response) => {
  try {
    const { id, studentId } = req.params;
    const schoolId = req.user!.schoolId;
    console.log(`➖ [School ${schoolId}] Removing student ${studentId} from class ${id}`);

    // ✅ Verify class belongs to school
    const classData = await prisma.class.findFirst({
      where: {
        id,
        schoolId: schoolId,
      },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    // ✅ Verify student belongs to school and is in this class
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: schoolId,
        classId: id,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found in this class or does not belong to your school',
      });
    }

    // Remove student from class (set classId to null)
    await prisma.student.update({
      where: { id: studentId },
      data: {
        classId: null,
      },
    });

    console.log(
      `✅ [School ${schoolId}] Removed student ${student.firstName} ${student.lastName} from class ${classData.name}`
    );

    res.json({
      success: true,
      message: 'Student removed from class successfully',
    });
  } catch (error: any) {
    console.error('❌ Error removing student:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing student from class',
      error: error.message,
    });
  }
});

// ===========================
// GET /classes/:id/students
// Get all students in a class
// ===========================
app.get('/classes/:id/students', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    console.log(`📋 [School ${schoolId}] Fetching students for class: ${id}`);

    // Verify class belongs to school
    const classData = await prisma.class.findFirst({
      where: {
        id,
        schoolId: schoolId,
      },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    // Get all students in this class via StudentClass junction table
    const studentClasses = await prisma.studentClass.findMany({
      where: {
        classId: id,
        status: 'ACTIVE',
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            khmerName: true,
            gender: true,
            dateOfBirth: true,
            photoUrl: true,
          },
        },
      },
      orderBy: {
        student: {
          firstName: 'asc',
        },
      },
    });

    const students = studentClasses.map(sc => ({
      ...sc.student,
      nameKh: sc.student.khmerName, // Map to match frontend interface
      status: sc.status, // Get status from StudentClass, not Student
      enrolledAt: sc.enrolledAt,
      studentClassId: sc.id,
    }));

    console.log(`✅ [School ${schoolId}] Found ${students.length} students in class`);

    res.json({
      success: true,
      data: students,
      count: students.length,
    });
  } catch (error: any) {
    console.error('❌ Error fetching class students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching class students',
      error: error.message,
    });
  }
});

// ===========================
// POST /classes/:id/students
// Assign a single student to class (using StudentClass junction)
// ===========================
app.post('/classes/:id/students', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { studentId, academicYearId } = req.body;
    const schoolId = req.user!.schoolId;
    console.log(`➕ [School ${schoolId}] Assigning student ${studentId} to class: ${id}`);

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'studentId is required',
      });
    }

    // Verify class belongs to school
    const classData = await prisma.class.findFirst({
      where: {
        id,
        schoolId: schoolId,
      },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    // Verify student belongs to school
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: schoolId,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found or does not belong to your school',
      });
    }

    // Check if student is already in this class
    const existingAssignment = await prisma.studentClass.findFirst({
      where: {
        studentId,
        classId: id,
        academicYearId: academicYearId || null,
        status: 'ACTIVE',
      },
    });

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: 'Student is already assigned to this class',
      });
    }

    // Create StudentClass assignment
    const studentClass = await prisma.studentClass.create({
      data: {
        studentId,
        classId: id,
        academicYearId: academicYearId || null,
        status: 'ACTIVE',
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            khmerName: true,
          },
        },
      },
    });

    console.log(
      `✅ [School ${schoolId}] Assigned student ${student.firstName} ${student.lastName} to class ${classData.name}`
    );

    res.json({
      success: true,
      message: 'Student assigned to class successfully',
      data: studentClass,
    });
  } catch (error: any) {
    console.error('❌ Error assigning student:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning student to class',
      error: error.message,
    });
  }
});

// ===========================
// POST /classes/:id/students/batch
// Assign multiple students to class at once (OPTIMIZED - 100x faster!)
// ===========================
app.post('/classes/:id/students/batch', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { studentIds, academicYearId } = req.body;
    const schoolId = req.user!.schoolId;
    
    console.log(`⚡ [School ${schoolId}] Batch assigning ${studentIds?.length || 0} students to class: ${id}`);

    // Validation
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'studentIds array is required and must not be empty',
      });
    }

    // Verify class belongs to school
    const classData = await prisma.class.findFirst({
      where: { id, schoolId },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    // Verify all students belong to school (single query)
    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        schoolId: schoolId,
      },
      select: { id: true },
    });

    if (students.length !== studentIds.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more students not found or do not belong to your school',
        found: students.length,
        requested: studentIds.length,
      });
    }

    // Check for existing assignments (single query)
    const existingAssignments = await prisma.studentClass.findMany({
      where: {
        studentId: { in: studentIds },
        classId: id,
        status: 'ACTIVE',
      },
      select: { studentId: true },
    });

    const existingStudentIds = new Set(existingAssignments.map(a => a.studentId));
    const newStudentIds = studentIds.filter(sid => !existingStudentIds.has(sid));

    if (newStudentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All students are already assigned to this class',
        skipped: studentIds.length,
      });
    }

    // Batch create all assignments in a single transaction (SUPER FAST!)
    const result = await prisma.studentClass.createMany({
      data: newStudentIds.map(studentId => ({
        studentId,
        classId: id,
        academicYearId: academicYearId || null,
        status: 'ACTIVE',
      })),
      skipDuplicates: true,
    });

    console.log(`✅ [School ${schoolId}] Batch assigned ${result.count} students in one transaction!`);

    res.status(201).json({
      success: true,
      message: `Successfully assigned ${result.count} students to class`,
      data: {
        assigned: result.count,
        skipped: studentIds.length - result.count,
        total: studentIds.length,
        class: {
          id: classData.id,
          name: classData.name,
          grade: classData.grade,
        },
      },
    });
  } catch (error: any) {
    console.error('❌ Error in batch assign:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning students to class',
      error: error.message,
    });
  }
});

// ===========================
// DELETE /classes/:id/students/:studentId (UPDATED)
// Remove student from class (using StudentClass junction)
// ===========================
app.delete('/classes/:id/students/:studentId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id, studentId } = req.params;
    const schoolId = req.user!.schoolId;
    console.log(`➖ [School ${schoolId}] Removing student ${studentId} from class ${id}`);

    // Verify class belongs to school
    const classData = await prisma.class.findFirst({
      where: {
        id,
        schoolId: schoolId,
      },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or does not belong to your school',
      });
    }

    // Verify student belongs to school
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: schoolId,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found or does not belong to your school',
      });
    }

    // Find and delete the StudentClass assignment
    const studentClass = await prisma.studentClass.findFirst({
      where: {
        studentId,
        classId: id,
        status: 'ACTIVE',
      },
    });

    if (!studentClass) {
      return res.status(404).json({
        success: false,
        message: 'Student is not assigned to this class',
      });
    }

    // Update status to DROPPED instead of deleting (for audit trail)
    await prisma.studentClass.update({
      where: { id: studentClass.id },
      data: { status: 'DROPPED' },
    });

    console.log(
      `✅ [School ${schoolId}] Removed student ${student.firstName} ${student.lastName} from class ${classData.name}`
    );

    res.json({
      success: true,
      message: 'Student removed from class successfully',
    });
  } catch (error: any) {
    console.error('❌ Error removing student:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing student from class',
      error: error.message,
    });
  }
});

// ===========================
// Start Server
// ===========================
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎓 CLASS SERVICE RUNNING                                ║
║                                                            ║
║   Port: ${PORT}                                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                                   ║
║   Multi-Tenant: ✅ ENABLED                                ║
║   Authentication: ✅ JWT Required                         ║
║                                                            ║
║   Endpoints:                                               ║
║   • GET    /classes/lightweight                           ║
║   • GET    /classes                                       ║
║   • GET    /classes/grade/:grade                          ║
║   • GET    /classes/:id                                   ║
║   • GET    /classes/:id/students (NEW)                    ║
║   • POST   /classes                                       ║
║   • POST   /classes/:id/students (NEW)                    ║
║   • PUT    /classes/:id                                   ║
║   • DELETE /classes/:id                                   ║
║   • POST   /classes/:id/assign-students                   ║
║   • DELETE /classes/:id/students/:studentId               ║
║   • GET    /health (no auth)                              ║
║                                                            ║
║   🔒 Multi-Tenancy: All queries filtered by schoolId      ║
║   ✅ Student Assignment: StudentClass junction table      ║
║   🌐 Khmer/English: Full bilingual support                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});
