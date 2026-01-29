import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3005;
const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';

// Middleware
app.use(cors());
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

    // Fetch user with school info
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        school: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive',
      });
    }

    if (!user.school || !user.school.isActive) {
      return res.status(403).json({
        success: false,
        message: 'School account is inactive',
      });
    }

    // Check if trial expired
    if (user.school.isTrial && user.school.subscriptionEnd) {
      const now = new Date();
      const trialEnd = new Date(user.school.subscriptionEnd);
      if (now > trialEnd) {
        return res.status(403).json({
          success: false,
          message: 'Trial period has expired. Please upgrade to continue.',
        });
      }
    }

    req.user = {
      userId: user.id,
      email: user.email || '',
      role: user.role,
      schoolId: user.schoolId || '',
      school: user.school,
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

// Apply auth middleware to all routes below
app.use(authMiddleware);

// ===========================
// GET /classes/lightweight
// Ultra-fast loading for dropdowns
// ===========================
app.get('/classes/lightweight', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const startTime = Date.now();
    console.log(`⚡ [School ${schoolId}] Fetching classes (lightweight)...`);

    const classes = await prisma.class.findMany({
      where: {
        schoolId: schoolId,
      },
      select: {
        id: true,
        classId: true,
        name: true,
        grade: true,
        section: true,
        track: true,
        academicYear: true,
        _count: {
          select: {
            students: true,
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
    console.log(`📚 [School ${schoolId}] Fetching all classes (full data)...`);

    const classes = await prisma.class.findMany({
      where: {
        schoolId: schoolId,
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
            role: true,
          },
        },
        students: {
          select: {
            id: true,
            khmerName: true,
            firstName: true,
            lastName: true,
            gender: true,
            studentId: true,
          },
        },
        _count: {
          select: {
            students: true,
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
        grade: parseInt(grade),
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
        students: {
          select: {
            id: true,
            studentId: true,
            khmerName: true,
            firstName: true,
            lastName: true,
            gender: true,
            email: true,
            phone: true,
          },
          orderBy: {
            khmerName: 'asc',
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
            students: true,
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

    console.log(`✅ [School ${schoolId}] Found class: ${classData.name}`);

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
      academicYear,
      homeroomTeacherId,
      capacity,
    } = req.body;

    // Validation
    if (!name || !grade) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, grade',
      });
    }

    // Check if class name already exists in this school
    const existingClass = await prisma.class.findFirst({
      where: {
        name,
        schoolId,
      },
    });

    if (existingClass) {
      return res.status(400).json({
        success: false,
        message: 'Class name already exists in your school',
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

      // Check if teacher is already a homeroom teacher for another class
      const existingHomeroom = await prisma.class.findFirst({
        where: {
          homeroomTeacherId: homeroomTeacherId,
          schoolId: schoolId,
        },
      });

      if (existingHomeroom) {
        return res.status(400).json({
          success: false,
          message: `Teacher is already homeroom teacher for class ${existingHomeroom.name}`,
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
        academicYear,
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
      academicYear,
      homeroomTeacherId,
      capacity,
    } = req.body;

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

      // Check if teacher is already a homeroom teacher for another class
      const existingHomeroom = await prisma.class.findFirst({
        where: {
          homeroomTeacherId: homeroomTeacherId,
          schoolId: schoolId,
          id: { not: id }, // Exclude current class
        },
      });

      if (existingHomeroom) {
        return res.status(400).json({
          success: false,
          message: `Teacher is already homeroom teacher for class ${existingHomeroom.name}`,
        });
      }
    }

    // Update class
    const updatedClass = await prisma.class.update({
      where: { id },
      data: {
        classId,
        name,
        grade,
        section,
        track,
        academicYear,
        homeroomTeacherId,
        capacity,
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
║   • POST   /classes                                       ║
║   • PUT    /classes/:id                                   ║
║   • DELETE /classes/:id                                   ║
║   • POST   /classes/:id/assign-students                   ║
║   • DELETE /classes/:id/students/:studentId               ║
║   • GET    /health (no auth)                              ║
║                                                            ║
║   🔒 Multi-Tenancy: All queries filtered by schoolId      ║
║   ✅ Student Assignment: Validated ownership              ║
║   🌐 Khmer/English: Full bilingual support                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});
