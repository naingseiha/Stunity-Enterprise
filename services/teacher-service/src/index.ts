import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3004;
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
    message: 'Teacher service is running',
    service: 'teacher-service',
    version: '2.0.0',
    port: PORT,
  });
});

// Apply auth middleware to all routes below
app.use(authMiddleware);

// ===========================
// GET /teachers/lightweight
// Fast loading for grids/lists
// ===========================
app.get('/teachers/lightweight', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    console.log(`⚡ [School ${schoolId}] Fetching teachers (lightweight)...`);

    const teachers = await prisma.teacher.findMany({
      where: {
        schoolId: schoolId,
      },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        khmerName: true,
        englishName: true,
        email: true,
        phone: true,
        gender: true,
        role: true,
        dateOfBirth: true,
        hireDate: true,
        address: true,
        position: true,
        homeroomClassId: true,
        createdAt: true,
        updatedAt: true,
        // Only essential relations
        homeroomClass: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
            _count: {
              select: {
                students: true,
              },
            },
          },
        },
        // Get IDs only for assignments (no full data)
        subjectTeachers: {
          select: {
            subjectId: true,
            subject: {
              select: {
                id: true,
                name: true,
                nameKh: true,
              },
            },
          },
        },
        teacherClasses: {
          select: {
            classId: true,
            class: {
              select: {
                id: true,
                name: true,
                grade: true,
                section: true,
                _count: {
                  select: {
                    students: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform to match expected format
    const transformedTeachers = teachers.map((teacher) => ({
      ...teacher,
      subjectIds: teacher.subjectTeachers.map((sa) => sa.subjectId),
      teachingClassIds: teacher.teacherClasses.map((tc) => tc.classId),
      subjects: teacher.subjectTeachers.map((sa) => sa.subject),
      teacherClasses: teacher.teacherClasses.map((tc) => tc.class),
      teachingClasses: teacher.teacherClasses.map((tc) => tc.class),
    }));

    console.log(
      `⚡ [School ${schoolId}] Fetched ${transformedTeachers.length} teachers (lightweight)`
    );

    res.json({
      success: true,
      data: transformedTeachers,
    });
  } catch (error: any) {
    console.error('❌ Error fetching teachers (lightweight):', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teachers',
      error: error.message,
    });
  }
});

// ===========================
// GET /teachers
// Full data with all relations
// ===========================
app.get('/teachers', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    console.log(`📋 [School ${schoolId}] Fetching all teachers (full data)...`);

    const teachers = await prisma.teacher.findMany({
      where: {
        schoolId: schoolId,
      },
      include: {
        // Homeroom class (one-to-one)
        homeroomClass: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
            track: true,
            _count: {
              select: {
                students: true,
              },
            },
          },
        },
        // Teaching classes (many-to-many)
        teacherClasses: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
                grade: true,
                section: true,
                track: true,
                _count: {
                  select: {
                    students: true,
                  },
                },
              },
            },
          },
        },
        // Subject assignments (many-to-many)
        subjectTeachers: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                nameKh: true,
                nameEn: true,
                code: true,
                grade: true,
                track: true,
              },
            },
          },
        },
        // User account (for login status)
        user: {
          select: {
            id: true,
            phone: true,
            email: true,
            isActive: true,
            lastLogin: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform data for frontend
    const transformedTeachers = teachers.map((teacher) => ({
      ...teacher,
      // Extract IDs for easy access
      subjectIds: teacher.subjectTeachers.map((sa) => sa.subjectId),
      teachingClassIds: teacher.teacherClasses.map((tc) => tc.classId),

      // Flatten nested data
      subjects: teacher.subjectTeachers.map((sa) => sa.subject),
      teacherClasses: teacher.teacherClasses.map((tc) => tc.class),
      teachingClasses: teacher.teacherClasses.map((tc) => tc.class),

      // Create subject string for display
      subject: teacher.subjectTeachers
        .map((sa) => sa.subject.nameKh || sa.subject.name)
        .join(', '),

      // Login status
      hasLoginAccount: !!teacher.user,
      canLogin: teacher.user?.isActive || false,
    }));

    console.log(`✅ [School ${schoolId}] Found ${transformedTeachers.length} teachers`);

    res.json({
      success: true,
      data: transformedTeachers,
    });
  } catch (error: any) {
    console.error('❌ Error fetching teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teachers',
      error: error.message,
    });
  }
});

// ===========================
// GET /teachers/:id
// Get single teacher by ID
// ===========================
app.get('/teachers/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    console.log(`📋 [School ${schoolId}] Fetching teacher: ${id}`);

    const teacher = await prisma.teacher.findFirst({
      where: {
        id: id,
        schoolId: schoolId, // ✅ Multi-tenant check
      },
      include: {
        homeroomClass: {
          include: {
            students: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                khmerName: true,
                email: true,
                studentId: true,
              },
            },
            _count: {
              select: {
                students: true,
              },
            },
          },
        },
        teacherClasses: {
          include: {
            class: {
              include: {
                students: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    khmerName: true,
                    email: true,
                    studentId: true,
                  },
                },
                _count: {
                  select: {
                    students: true,
                  },
                },
              },
            },
          },
        },
        subjectTeachers: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                nameKh: true,
                nameEn: true,
                code: true,
                grade: true,
                track: true,
                category: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            phone: true,
            email: true,
            isActive: true,
            lastLogin: true,
            role: true,
          },
        },
      },
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found or does not belong to your school',
      });
    }

    // Transform data
    const transformedTeacher = {
      ...teacher,
      subjectIds: teacher.subjectTeachers.map((sa) => sa.subjectId),
      teachingClassIds: teacher.teacherClasses.map((tc) => tc.classId),
      subjects: teacher.subjectTeachers.map((sa) => sa.subject),
      teachingClasses: teacher.teacherClasses.map((tc) => tc.class),
      hasLoginAccount: !!teacher.user,
      canLogin: teacher.user?.isActive || false,
    };

    console.log(`✅ [School ${schoolId}] Found teacher: ${teacher.firstName} ${teacher.lastName}`);

    res.json({
      success: true,
      data: transformedTeacher,
    });
  } catch (error: any) {
    console.error('❌ Error fetching teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teacher',
      error: error.message,
    });
  }
});

// ===========================
// POST /teachers
// Create new teacher
// ===========================
app.post('/teachers', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const school = req.user!.school;
    console.log(`➕ [School ${schoolId}] Creating new teacher...`);

    // ✅ Check usage limits
    const currentTeacherCount = await prisma.teacher.count({
      where: { schoolId },
    });

    if (currentTeacherCount >= school.maxTeachers) {
      return res.status(403).json({
        success: false,
        message: `Teacher limit reached (${school.maxTeachers} teachers). Please upgrade your subscription.`,
        currentCount: currentTeacherCount,
        maxAllowed: school.maxTeachers,
      });
    }

    const {
      firstName,
      lastName,
      khmerName,
      englishName,
      email,
      phone,
      employeeId,
      gender,
      dateOfBirth,
      position,
      hireDate,
      address,
      role,
      degree,
      emergencyContact,
      emergencyPhone,
      idCard,
      major1,
      major2,
      nationality,
      passport,
      salaryRange,
      // Relations
      homeroomClassId,
      subjectIds,
      classIds,
    } = req.body;

    // Validation
    if (!firstName || !lastName || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firstName, lastName, phone',
      });
    }

    // Check if phone already exists in this school
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        phone,
        schoolId,
      },
    });

    if (existingTeacher) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already exists in your school',
      });
    }

    // Verify homeroom class belongs to school (if provided)
    if (homeroomClassId) {
      const homeroomClass = await prisma.class.findFirst({
        where: {
          id: homeroomClassId,
          schoolId: schoolId,
        },
      });

      if (!homeroomClass) {
        return res.status(400).json({
          success: false,
          message: 'Homeroom class not found or does not belong to your school',
        });
      }
    }

    // Create teacher with relations
    const teacher = await prisma.teacher.create({
      data: {
        firstName,
        lastName,
        khmerName,
        englishName,
        email,
        phone,
        employeeId,
        gender,
        dateOfBirth,
        position,
        hireDate,
        address,
        role: role || 'TEACHER',
        degree,
        emergencyContact,
        emergencyPhone,
        idCard,
        major1,
        major2,
        nationality,
        passport,
        salaryRange,
        schoolId: schoolId, // ✅ Multi-tenant
        homeroomClassId,
        // Connect subjects (many-to-many)
        ...(subjectIds && subjectIds.length > 0
          ? {
              subjectTeachers: {
                create: subjectIds.map((subjectId: string) => ({
                  subjectId,
                })),
              },
            }
          : {}),
        // Connect classes (many-to-many)
        ...(classIds && classIds.length > 0
          ? {
              teacherClasses: {
                create: classIds.map((classId: string) => ({
                  classId,
                })),
              },
            }
          : {}),
      },
      include: {
        homeroomClass: true,
        subjectTeachers: {
          include: {
            subject: true,
          },
        },
        teacherClasses: {
          include: {
            class: true,
          },
        },
      },
    });

    // ✅ Update school teacher count
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        currentTeachers: { increment: 1 },
      },
    });

    console.log(`✅ [School ${schoolId}] Created teacher: ${teacher.firstName} ${teacher.lastName}`);

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: teacher,
    });
  } catch (error: any) {
    console.error('❌ Error creating teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating teacher',
      error: error.message,
    });
  }
});

// ===========================
// POST /teachers/bulk
// Bulk create teachers
// ===========================
app.post('/teachers/bulk', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const school = req.user!.school;
    const { teachers } = req.body;

    if (!teachers || !Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Teachers array is required',
      });
    }

    console.log(`➕ [School ${schoolId}] Bulk creating ${teachers.length} teachers...`);

    // ✅ Check usage limits
    const currentTeacherCount = await prisma.teacher.count({
      where: { schoolId },
    });

    const totalAfterImport = currentTeacherCount + teachers.length;

    if (totalAfterImport > school.maxTeachers) {
      return res.status(403).json({
        success: false,
        message: `Cannot import ${teachers.length} teachers. Limit is ${school.maxTeachers}, you have ${currentTeacherCount}.`,
        currentCount: currentTeacherCount,
        maxAllowed: school.maxTeachers,
        requestedImport: teachers.length,
        availableSlots: school.maxTeachers - currentTeacherCount,
      });
    }

    const results = {
      success: [] as any[],
      failed: [] as any[],
    };

    // Process each teacher
    for (const teacherData of teachers) {
      try {
        const {
          firstName,
          lastName,
          khmerName,
          email,
          phone,
          employeeId,
          gender,
          dateOfBirth,
          position,
          hireDate,
          address,
          role,
        } = teacherData;

        // Validation
        if (!firstName || !lastName || !phone) {
          results.failed.push({
            data: teacherData,
            error: 'Missing required fields: firstName, lastName, phone',
          });
          continue;
        }

        // Check duplicate phone
        const existing = await prisma.teacher.findFirst({
          where: {
            phone,
            schoolId,
          },
        });

        if (existing) {
          results.failed.push({
            data: teacherData,
            error: `Phone ${phone} already exists`,
          });
          continue;
        }

        // Create teacher
        const teacher = await prisma.teacher.create({
          data: {
            firstName,
            lastName,
            khmerName,
            email,
            phone,
            employeeId,
            gender,
            dateOfBirth,
            position,
            hireDate,
            address,
            role: role || 'TEACHER',
            schoolId: schoolId, // ✅ Multi-tenant
          },
        });

        results.success.push(teacher);
      } catch (error: any) {
        results.failed.push({
          data: teacherData,
          error: error.message,
        });
      }
    }

    // ✅ Update school teacher count
    if (results.success.length > 0) {
      await prisma.school.update({
        where: { id: schoolId },
        data: {
          currentTeachers: { increment: results.success.length },
        },
      });
    }

    console.log(
      `✅ [School ${schoolId}] Bulk import complete: ${results.success.length} success, ${results.failed.length} failed`
    );

    res.status(201).json({
      success: true,
      message: `Bulk import complete: ${results.success.length} success, ${results.failed.length} failed`,
      data: results,
    });
  } catch (error: any) {
    console.error('❌ Error bulk creating teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Error bulk creating teachers',
      error: error.message,
    });
  }
});

// ===========================
// PUT /teachers/:id
// Update teacher
// ===========================
app.put('/teachers/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    console.log(`✏️ [School ${schoolId}] Updating teacher: ${id}`);

    // ✅ Verify teacher belongs to school
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        id,
        schoolId: schoolId,
      },
    });

    if (!existingTeacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found or does not belong to your school',
      });
    }

    const {
      firstName,
      lastName,
      khmerName,
      englishName,
      email,
      phone,
      employeeId,
      gender,
      dateOfBirth,
      position,
      hireDate,
      address,
      role,
      degree,
      emergencyContact,
      emergencyPhone,
      idCard,
      major1,
      major2,
      nationality,
      passport,
      salaryRange,
      homeroomClassId,
    } = req.body;

    // Verify new homeroom class belongs to school (if provided)
    if (homeroomClassId && homeroomClassId !== existingTeacher.homeroomClassId) {
      const homeroomClass = await prisma.class.findFirst({
        where: {
          id: homeroomClassId,
          schoolId: schoolId,
        },
      });

      if (!homeroomClass) {
        return res.status(400).json({
          success: false,
          message: 'Homeroom class not found or does not belong to your school',
        });
      }
    }

    // Update teacher
    const updatedTeacher = await prisma.teacher.update({
      where: { id },
      data: {
        firstName,
        lastName,
        khmerName,
        englishName,
        email,
        phone,
        employeeId,
        gender,
        dateOfBirth,
        position,
        hireDate,
        address,
        role,
        degree,
        emergencyContact,
        emergencyPhone,
        idCard,
        major1,
        major2,
        nationality,
        passport,
        salaryRange,
        homeroomClassId,
      },
      include: {
        homeroomClass: true,
        subjectTeachers: {
          include: {
            subject: true,
          },
        },
        teacherClasses: {
          include: {
            class: true,
          },
        },
      },
    });

    console.log(
      `✅ [School ${schoolId}] Updated teacher: ${updatedTeacher.firstName} ${updatedTeacher.lastName}`
    );

    res.json({
      success: true,
      message: 'Teacher updated successfully',
      data: updatedTeacher,
    });
  } catch (error: any) {
    console.error('❌ Error updating teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating teacher',
      error: error.message,
    });
  }
});

// ===========================
// DELETE /teachers/:id
// Delete teacher
// ===========================
app.delete('/teachers/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    console.log(`🗑️ [School ${schoolId}] Deleting teacher: ${id}`);

    // ✅ Verify teacher belongs to school
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        id,
        schoolId: schoolId,
      },
    });

    if (!existingTeacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found or does not belong to your school',
      });
    }

    // Delete teacher (cascade will handle relations)
    await prisma.teacher.delete({
      where: { id },
    });

    // ✅ Update school teacher count
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        currentTeachers: { decrement: 1 },
      },
    });

    console.log(`✅ [School ${schoolId}] Deleted teacher: ${existingTeacher.firstName} ${existingTeacher.lastName}`);

    res.json({
      success: true,
      message: 'Teacher deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Error deleting teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting teacher',
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
║   🎓 TEACHER SERVICE RUNNING                              ║
║                                                            ║
║   Port: ${PORT}                                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                                   ║
║   Multi-Tenant: ✅ ENABLED                                ║
║   Authentication: ✅ JWT Required                         ║
║                                                            ║
║   Endpoints:                                               ║
║   • GET    /teachers/lightweight                          ║
║   • GET    /teachers                                      ║
║   • GET    /teachers/:id                                  ║
║   • POST   /teachers                                      ║
║   • POST   /teachers/bulk                                 ║
║   • PUT    /teachers/:id                                  ║
║   • DELETE /teachers/:id                                  ║
║   • GET    /health (no auth)                              ║
║                                                            ║
║   🔒 Multi-Tenancy: All queries filtered by schoolId      ║
║   ✅ Usage Limits: Enforced before create                 ║
║   🌐 Khmer/English: Full bilingual support                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});
