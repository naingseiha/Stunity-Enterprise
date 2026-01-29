import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

/**
 * ✅ GET teachers LIGHTWEIGHT (for grid/list views - fast loading)
 */
export const getTeachersLightweight = async (req: Request, res: Response) => {
  try {
    console.log("⚡ Fetching teachers (lightweight)...");

    const teachers = await prisma.teacher.findMany({
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
        createdAt: "desc",
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
      `⚡ Fetched ${transformedTeachers.length} teachers (lightweight)`
    );

    res.json({
      success: true,
      data: transformedTeachers,
    });
  } catch (error: any) {
    console.error("❌ Error fetching teachers (lightweight):", error);
    res.status(500).json({
      success: false,
      message: "Error fetching teachers",
      error: error.message,
    });
  }
};

/**
 * ✅ GET all teachers with relations (FULL DATA - slower)
 */
export const getAllTeachers = async (req: Request, res: Response) => {
  try {
    console.log("📋 Fetching all teachers (full data)...");

    const teachers = await prisma.teacher.findMany({
      include: {
        // ✅ Homeroom class (one-to-one)
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
        // ✅ Teaching classes (many-to-many)
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
        // ✅ Subject assignments (many-to-many)
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
        // ✅ User account (for login status)
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
        createdAt: "desc",
      },
    });

    // ✅ Transform data for frontend
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
        .join(", "),

      // ✅ Login status
      hasLoginAccount: !!teacher.user,
      canLogin: teacher.user?.isActive || false,
    }));

    console.log(`✅ Found ${transformedTeachers.length} teachers`);

    res.json({
      success: true,
      data: transformedTeachers,
    });
  } catch (error: any) {
    console.error("❌ Error fetching teachers:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching teachers",
      error: error.message,
    });
  }
};

/**
 * ✅ GET single teacher by ID with full details
 */
export const getTeacherById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`📋 Fetching teacher:  ${id}`);

    const teacher = await prisma.teacher.findUnique({
      where: { id },
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
        // ✅ User account
        user: {
          select: {
            id: true,
            phone: true,
            email: true,
            isActive: true,
            lastLogin: true,
            loginCount: true,
          },
        },
      },
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // ✅ Transform data
    const transformedTeacher = {
      ...teacher,
      subjectIds: teacher.subjectTeachers.map((sa) => sa.subjectId),
      teachingClassIds: teacher.teacherClasses.map((tc) => tc.classId),
      subjects: teacher.subjectTeachers.map((sa) => sa.subject),
      teacherClasses: teacher.teacherClasses.map((tc) => tc.class),
      subject: teacher.subjectTeachers
        .map((sa) => sa.subject.nameKh || sa.subject.name)
        .join(", "),
      hasLoginAccount: !!teacher.user,
      canLogin: teacher.user?.isActive || false,
    };

    console.log("✅ Teacher found");

    res.json({
      success: true,
      data: transformedTeacher,
    });
  } catch (error: any) {
    console.error("❌ Error fetching teacher:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching teacher",
      error: error.message,
    });
  }
};

/**
 * ✅ CREATE new teacher with User account
 */
/**
 * ✅ CREATE new teacher with User account
 */
export const createTeacher = async (req: Request, res: Response) => {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📥 CREATE TEACHER - Request body:");
    console.log(JSON.stringify(req.body, null, 2));
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const {
      firstName,
      lastName,
      khmerName,
      englishName,
      email,
      phone,
      gender,
      role,
      employeeId,
      position,
      address,
      dateOfBirth,
      hireDate,
      homeroomClassId,
      subjectIds,
      teachingClassIds,
      workingLevel,
      salaryRange,
      major1,
      major2,
      degree,
      nationality,
      idCard,
      passport,
      emergencyContact,
      emergencyPhone,
    } = req.body;

    // ✅ Validate required fields
    if (!firstName || firstName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "First name is required",
      });
    }

    if (!lastName || lastName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Last name is required",
      });
    }

    if (!phone || phone.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Phone number is required (used for login)",
      });
    }

    // ✅ Validate phone format
    const phoneRegex = /^[0-9]{8,15}$/;
    if (!phoneRegex.test(phone.trim().replace(/\s/g, ""))) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
    }

    // ✅ Email format validation (if provided)
    if (email && email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }
    }

    // ✅ Validate INSTRUCTOR must have homeroom class
    if (role === "INSTRUCTOR" && !homeroomClassId) {
      return res.status(400).json({
        success: false,
        message: "Instructor must have a homeroom class assigned",
      });
    }

    // ✅ Check phone uniqueness (Teacher table)
    const existingPhone = await prisma.teacher.findUnique({
      where: { phone: phone.trim() },
    });

    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number already exists",
      });
    }

    // ✅ Check phone uniqueness (User table)
    const existingUserPhone = await prisma.user.findUnique({
      where: { phone: phone.trim() },
    });

    if (existingUserPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number already registered",
      });
    }

    // ✅ Check email uniqueness (if provided)
    if (email && email.trim() !== "") {
      const existingEmail = await prisma.teacher.findUnique({
        where: { email: email.trim() },
      });

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    // ✅ Check employee ID uniqueness (if provided)
    if (employeeId && employeeId.trim() !== "") {
      const existingEmployeeId = await prisma.teacher.findUnique({
        where: { employeeId: employeeId.trim() },
      });

      if (existingEmployeeId) {
        return res.status(400).json({
          success: false,
          message: "Employee ID already exists",
        });
      }
    }

    // ✅ Check homeroom class availability
    if (homeroomClassId) {
      const classWithTeacher = await prisma.class.findUnique({
        where: { id: homeroomClassId },
        include: { homeroomTeacher: true },
      });

      if (!classWithTeacher) {
        return res.status(404).json({
          success: false,
          message: "Homeroom class not found",
        });
      }

      if (classWithTeacher.homeroomTeacher) {
        return res.status(400).json({
          success: false,
          message: `Class ${classWithTeacher.name} already has a homeroom teacher`,
        });
      }
    }

    // ✅ AUTO-GENERATE Employee ID if not provided
    let finalEmployeeId = employeeId?.trim() || null;

    if (!finalEmployeeId) {
      const year = new Date().getFullYear().toString().slice(-2);
      const teacherCount = await prisma.teacher.count({
        where: {
          createdAt: {
            gte: new Date(`${new Date().getFullYear()}-01-01`),
          },
        },
      });
      const sequence = (teacherCount + 1).toString().padStart(5, "0");
      finalEmployeeId = `T${year}${sequence}`;

      console.log(`🆔 Auto-generated Employee ID: ${finalEmployeeId}`);
    }

    // ✅ Create teacher + User account in transaction
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Create Teacher
        const now = new Date();
        const teacherId = randomUUID();

        const teacher = await tx.teacher.create({
          data: {
            id: teacherId,
            createdAt: now,
            updatedAt: now,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            khmerName: khmerName?.trim() || null,
            englishName: englishName?.trim() || null,
            email: email?.trim() || null,
            phone: phone.trim(),
            gender: gender || null,
            role: role || "TEACHER",
            employeeId: finalEmployeeId,
            position: position?.trim() || null,
            address: address?.trim() || null,
            dateOfBirth: dateOfBirth || null,
            hireDate: hireDate || null,
            workingLevel: workingLevel || null,
            salaryRange: salaryRange?.trim() || null,
            major1: major1?.trim() || null,
            major2: major2?.trim() || null,
            degree: degree || null,
            nationality: nationality?.trim() || null,
            idCard: idCard?.trim() || null,
            passport: passport?.trim() || null,
            emergencyContact: emergencyContact?.trim() || null,
            emergencyPhone: emergencyPhone?.trim() || null,
            homeroomClassId: homeroomClassId || null,

            // Subject assignments
            subjectTeachers: {
              create: (subjectIds || []).map((subjectId: string) => ({
                id: randomUUID(),
                subjectId,
                createdAt: now,
                updatedAt: now,
              })),
            },

            // Teaching class assignments
            teacherClasses: {
              create: (teachingClassIds || []).map((classId: string) => ({
                id: randomUUID(),
                classId,
                createdAt: now,
                updatedAt: now,
              })),
            },
          },
          include: {
            homeroomClass: true,
            teacherClasses: {
              include: { class: true },
            },
            subjectTeachers: {
              include: { subject: true },
            },
          },
        });

        // 2. Create User account
        const hashedPassword = await bcrypt.hash(phone.trim(), 10);

        const user = await tx.user.create({
          data: {
            id: randomUUID(),
            createdAt: now,
            updatedAt: now,
            phone: phone.trim(),
            email: email?.trim() || null,
            password: hashedPassword,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            role: "TEACHER",
            teacherId: teacherId,
            permissions: {
              canEnterGrades: true,
              canMarkAttendance: true,
              canViewReports: true,
              canUpdateStudents: false,
              canManageClasses: false,
            },
          },
        });

        return { teacher, user, defaultPassword: phone.trim() };
      },
      {
        maxWait: 15000,
        timeout: 20000,
      }
    );

    console.log("✅ Teacher created successfully:", result.teacher.id);
    console.log("✅ Employee ID:", result.teacher.employeeId);
    console.log("✅ User account created");
    console.log("📱 Phone (Username):", result.user.phone);
    console.log("🔑 Default Password:", result.defaultPassword);

    res.status(201).json({
      success: true,
      message: "Teacher created successfully with login account",
      data: result.teacher,
      loginInfo: {
        phone: result.user.phone,
        email: result.user.email,
        employeeId: result.teacher.employeeId,
        defaultPassword: result.defaultPassword,
        message:
          "លេខទូរស័ព្ទ = ឈ្មោះប្រើប្រាស់\nពាក្យសម្ងាត់លើកដំបូគឺដូចគ្នានឹងលេខទូរស័ព្ទ\nអាចប្តូរពាក្យសម្ងាត់នៅពេលក្រោយ",
      },
    });
  } catch (error: any) {
    console.error("❌ Error creating teacher:", error);
    res.status(500).json({
      success: false,
      message: "Error creating teacher",
      error: error.message,
    });
  }
};

/**
 * ✅ UPDATE teacher (preserves User account)
 */
export const updateTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📝 UPDATE TEACHER:  ${id}`);
    console.log("📥 Request body:");
    console.log(JSON.stringify(req.body, null, 2));
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const {
      firstName,
      lastName,
      khmerName,
      email,
      phone,
      gender,
      role,
      employeeId,
      position,
      address,
      dateOfBirth,
      hireDate,
      homeroomClassId,
      subjectIds,
      teachingClassIds,
    } = req.body;

    // ✅ Check if teacher exists
    const existingTeacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        user: true,
        homeroomClass: true,
        teacherClasses: true,
        subjectTeachers: true,
      },
    });

    if (!existingTeacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // ✅ Validate fields
    if (firstName !== undefined && firstName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "First name cannot be empty",
      });
    }

    if (lastName !== undefined && lastName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Last name cannot be empty",
      });
    }

    if (phone !== undefined && phone.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Phone cannot be empty",
      });
    }

    // ✅ Validate INSTRUCTOR must have homeroom
    if (role === "INSTRUCTOR" && !homeroomClassId) {
      return res.status(400).json({
        success: false,
        message: "Instructor must have a homeroom class assigned",
      });
    }

    // ✅ Check phone uniqueness (if changed)
    if (phone && phone !== existingTeacher.phone) {
      const phoneExists = await prisma.teacher.findUnique({
        where: { phone: phone.trim() },
      });

      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: "Phone number already exists",
        });
      }
    }

    // ✅ Check email uniqueness (if changed)
    if (email && email !== existingTeacher.email) {
      const emailExists = await prisma.teacher.findUnique({
        where: { email: email.trim() },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    // ✅ Check employee ID uniqueness
    if (employeeId && employeeId !== existingTeacher.employeeId) {
      const employeeIdExists = await prisma.teacher.findUnique({
        where: { employeeId: employeeId.trim() },
      });

      if (employeeIdExists) {
        return res.status(400).json({
          success: false,
          message: "Employee ID already exists",
        });
      }
    }

    // ✅ Check homeroom class availability
    if (
      homeroomClassId &&
      homeroomClassId !== existingTeacher.homeroomClassId
    ) {
      const classWithTeacher = await prisma.class.findUnique({
        where: { id: homeroomClassId },
        include: { homeroomTeacher: true },
      });

      if (!classWithTeacher) {
        return res.status(404).json({
          success: false,
          message: "Homeroom class not found",
        });
      }

      if (
        classWithTeacher.homeroomTeacher &&
        classWithTeacher.homeroomTeacher.id !== id
      ) {
        return res.status(400).json({
          success: false,
          message: `Class ${classWithTeacher.name} already has a homeroom teacher`,
        });
      }
    }

    // ✅ Update teacher + sync User account
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Delete old assignments
        await Promise.all([
          tx.subjectTeacher.deleteMany({
            where: { teacherId: id },
          }),
          tx.teacherClass.deleteMany({
            where: { teacherId: id },
          }),
        ]);

        // 2. Update teacher
        await tx.teacher.update({
          where: { id },
          data: {
            firstName: firstName !== undefined ? firstName.trim() : undefined,
            lastName: lastName !== undefined ? lastName.trim() : undefined,
            khmerName:
              khmerName !== undefined ? khmerName?.trim() || null : undefined,
            email: email !== undefined ? email?.trim() || null : undefined,
            phone: phone !== undefined ? phone.trim() : undefined,
            gender: gender !== undefined ? gender : undefined,
            role: role !== undefined ? role : undefined,
            employeeId:
              employeeId !== undefined ? employeeId?.trim() || null : undefined,
            position:
              position !== undefined ? position?.trim() || null : undefined,
            address:
              address !== undefined ? address?.trim() || null : undefined,
            dateOfBirth: dateOfBirth !== undefined ? dateOfBirth : undefined,
            hireDate: hireDate !== undefined ? hireDate : undefined,

            homeroomClassId:
              role === "INSTRUCTOR"
                ? homeroomClassId || null
                : role === "TEACHER"
                ? null
                : undefined,
          },
        });

        // 3. Create new subject and class assignments
        const now = new Date();
        await Promise.all([
          // Create subject assignments
          ...(subjectIds || []).map((subjectId: string) =>
            tx.subjectTeacher.create({
              data: {
                id: randomUUID(),
                teacherId: id,
                subjectId,
                createdAt: now,
                updatedAt: now,
              },
            })
          ),
          // Create class assignments
          ...(teachingClassIds || []).map((classId: string) =>
            tx.teacherClass.create({
              data: {
                id: randomUUID(),
                teacherId: id,
                classId,
                createdAt: now,
                updatedAt: now,
              },
            })
          ),
        ]);

        // 4. Fetch updated teacher with all relations
        const updatedTeacher = await tx.teacher.findUnique({
          where: { id },
          include: {
            homeroomClass: true,
            teacherClasses: {
              include: { class: true },
            },
            subjectTeachers: {
              include: { subject: true },
            },
            user: true,
          },
        });

        // 5. Verify teacher was fetched successfully
        if (!updatedTeacher) {
          throw new Error("Failed to fetch updated teacher");
        }

        // 6. Update User account (if exists and phone/email changed)
        if (existingTeacher.user) {
          await tx.user.update({
            where: { id: existingTeacher.user.id },
            data: {
              phone: phone !== undefined ? phone.trim() : undefined,
              email: email !== undefined ? email?.trim() || null : undefined,
              firstName: firstName !== undefined ? firstName.trim() : undefined,
              lastName: lastName !== undefined ? lastName.trim() : undefined,
            },
          });
        }

        return updatedTeacher;
      },
      {
        maxWait: 10000,
        timeout: 15000,
      }
    );

    console.log("✅ Teacher updated successfully");

    res.json({
      success: true,
      message: "Teacher updated successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("❌ Error updating teacher:", error);
    res.status(500).json({
      success: false,
      message: "Error updating teacher",
      error: error.message,
    });
  }
};

/**
 * ✅ DELETE teacher (with User account)
 */
export const deleteTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ DELETE TEACHER: ${id}`);

    // ✅ Check if teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        user: true,
        homeroomClass: true,
        teacherClasses: true,
        subjectTeachers: true,
      },
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // ✅ Check if has homeroom class
    if (teacher.homeroomClass) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete teacher with assigned homeroom class (${teacher.homeroomClass.name})`,
      });
    }

    // ✅ Check if has teaching classes
    if (teacher.teacherClasses.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete teacher with ${teacher.teacherClasses.length} teaching class(es)`,
      });
    }

    // ✅ Delete teacher (cascade will delete User account + assignments)
    await prisma.teacher.delete({
      where: { id },
    });

    console.log("✅ Teacher deleted successfully");
    if (teacher.user) {
      console.log("✅ User account also deleted");
    }

    res.json({
      success: true,
      message: "Teacher deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Error deleting teacher:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting teacher",
      error: error.message,
    });
  }
};

// ✅ ADD this function to teacher.controller.ts

/**
 * ✅ BULK CREATE teachers
 */
export const bulkCreateTeachers = async (req: Request, res: Response) => {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📥 BULK CREATE TEACHERS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const { teachers } = req.body;

    if (!Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "teachers array is required",
      });
    }

    console.log(`👥 Teachers to create: ${teachers.length}`);

    const results = { success: [], failed: [] };

    // ✅ Get all classes and subjects for mapping
    const [allClasses, allSubjects] = await Promise.all([
      prisma.class.findMany({
        select: { id: true, name: true },
      }),
      prisma.subject.findMany({
        select: { id: true, name: true, nameKh: true, nameEn: true },
      }),
    ]);

    console.log(`📚 Found ${allClasses.length} classes`);
    console.log(`📖 Found ${allSubjects.length} subjects`);

    // ✅ Helper:  Map subject names to IDs
    const mapSubjectNamesToIds = (subjectsString: string): string[] => {
      if (!subjectsString || subjectsString.trim() === "") return [];

      const subjectNames = subjectsString
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      return subjectNames
        .map((name) => {
          const subject = allSubjects.find(
            (s) =>
              s.nameKh?.toLowerCase() === name.toLowerCase() ||
              s.nameEn?.toLowerCase() === name.toLowerCase() ||
              s.name?.toLowerCase() === name.toLowerCase()
          );
          return subject?.id;
        })
        .filter((id) => id) as string[];
    };

    // ✅ Helper: Map class names to IDs
    const mapClassNamesToIds = (classesString: string): string[] => {
      if (!classesString || classesString.trim() === "") return [];

      const classNames = classesString
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      return classNames
        .map((name) => {
          const cls = allClasses.find(
            (c) => c.name?.toLowerCase() === name.toLowerCase()
          );
          return cls?.id;
        })
        .filter((id) => id) as string[];
    };

    // ✅ Helper: Find homeroom class ID
    const findHomeroomClassId = (className: string): string | null => {
      if (!className || className.trim() === "") return null;

      const cls = allClasses.find(
        (c) => c.name?.toLowerCase() === className.trim().toLowerCase()
      );

      return cls?.id || null;
    };

    // ✅ Process each teacher
    for (let i = 0; i < teachers.length; i++) {
      const teacherData = teachers[i];
      const rowNumber = i + 1;

      try {
        // ✅ Validate required fields
        if (!teacherData.firstName || teacherData.firstName.trim() === "") {
          throw new Error("First name is required");
        }
        if (!teacherData.lastName || teacherData.lastName.trim() === "") {
          throw new Error("Last name is required");
        }
        if (!teacherData.phone || teacherData.phone.trim() === "") {
          throw new Error("Phone number is required");
        }

        // ✅ Validate phone format
        const phoneRegex = /^[0-9]{8,15}$/;
        if (!phoneRegex.test(teacherData.phone.trim().replace(/\s/g, ""))) {
          throw new Error("Invalid phone number format");
        }

        // ✅ Check phone uniqueness
        const existingPhone = await prisma.teacher.findUnique({
          where: { phone: teacherData.phone.trim() },
        });

        if (existingPhone) {
          throw new Error("Phone number already exists");
        }

        // ✅ Validate gender
        let gender: "MALE" | "FEMALE" = "MALE";
        if (teacherData.gender) {
          const g = teacherData.gender.toString().trim().toUpperCase();
          if (["MALE", "M", "ប្រុស", "ប"].includes(g)) {
            gender = "MALE";
          } else if (["FEMALE", "F", "ស្រី", "ស"].includes(g)) {
            gender = "FEMALE";
          }
        }

        // ✅ Validate role
        const role =
          teacherData.role?.toUpperCase() === "INSTRUCTOR"
            ? "INSTRUCTOR"
            : "TEACHER";

        // ✅ Map subjects
        const subjectIds = mapSubjectNamesToIds(teacherData.subjects || "");

        // ✅ Map teaching classes
        const teachingClassIds = mapClassNamesToIds(
          teacherData.teacherClasses || ""
        );

        // ✅ Find homeroom class
        let homeroomClassId: string | null = null;
        if (role === "INSTRUCTOR") {
          if (!teacherData.homeroomClass) {
            throw new Error("Instructor must have homeroom class");
          }

          homeroomClassId = findHomeroomClassId(teacherData.homeroomClass);

          if (!homeroomClassId) {
            throw new Error(
              `Homeroom class "${teacherData.homeroomClass}" not found`
            );
          }

          // Check if already has homeroom teacher
          const classWithTeacher = await prisma.class.findUnique({
            where: { id: homeroomClassId },
            include: { homeroomTeacher: true },
          });

          if (classWithTeacher?.homeroomTeacher) {
            throw new Error(
              `Class "${teacherData.homeroomClass}" already has a homeroom teacher`
            );
          }

          // Add homeroom class to teaching classes if not already there
          if (!teachingClassIds.includes(homeroomClassId)) {
            teachingClassIds.push(homeroomClassId);
          }
        }

        // ✅ Auto-generate Employee ID
        const year = new Date().getFullYear().toString().slice(-2);
        const teacherCount = await prisma.teacher.count({
          where: {
            createdAt: {
              gte: new Date(`${new Date().getFullYear()}-01-01`),
            },
          },
        });
        const sequence = (teacherCount + 1).toString().padStart(5, "0");
        const employeeId = `T${year}${sequence}`;

        // ✅ Create teacher with User account
        const result = await prisma.$transaction(
          async (tx) => {
            // Create teacher
            const teacher = await tx.teacher.create({
              data: {
                firstName: teacherData.firstName.trim(),
                lastName: teacherData.lastName.trim(),
                khmerName:
                  teacherData.khmerName?.trim() ||
                  `${teacherData.firstName} ${teacherData.lastName}`,
                email: teacherData.email?.trim() || null,
                phone: teacherData.phone.trim(),
                gender,
                role,
                employeeId,
                position: teacherData.position?.trim() || null,
                address: teacherData.address?.trim() || null,
                dateOfBirth: teacherData.dateOfBirth || null,
                hireDate: teacherData.hireDate || null,
                homeroomClassId,

                // Subject assignments
                subjectTeachers: {
                  create: subjectIds.map((subjectId) => ({
                    subjectId,
                  })),
                },

                // Teaching class assignments
                teacherClasses: {
                  create: teachingClassIds.map((classId) => ({
                    classId,
                  })),
                },
              },
            });

            // Create User account
            const hashedPassword = await bcrypt.hash(
              teacherData.phone.trim(),
              10
            );

            await tx.user.create({
              data: {
                id: randomUUID(),
                createdAt: new Date(),
                updatedAt: new Date(),
                phone: teacherData.phone.trim(),
                email: teacherData.email?.trim() || null,
                password: hashedPassword,
                firstName: teacherData.firstName.trim(),
                lastName: teacherData.lastName.trim(),
                role: "TEACHER",
                teacherId: teacher.id,
                permissions: {
                  canEnterGrades: true,
                  canMarkAttendance: true,
                  canViewReports: true,
                  canUpdateStudents: false,
                  canManageClasses: false,
                },
              },
            });

            return teacher;
          },
          {
            maxWait: 15000,
            timeout: 20000,
          }
        );

        results.success.push({
          row: rowNumber,
          teacherId: result.id,
          name: result.khmerName || `${result.firstName} ${result.lastName}`,
          employeeId: result.employeeId || "",
        });

        console.log(
          `  ✅ Row ${rowNumber}: ${result.khmerName} (${result.employeeId})`
        );
      } catch (error: any) {
        results.failed.push({
          row: rowNumber,
          name:
            teacherData.khmerName ||
            `${teacherData.firstName || ""} ${teacherData.lastName || ""}` ||
            "Unknown",
          error: error.message,
        });
        console.error(`  ❌ Row ${rowNumber}: ${error.message}`);
      }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Success: ${results.success.length}/${teachers.length}`);
    console.log(`❌ Failed: ${results.failed.length}/${teachers.length}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    res.status(201).json({
      success: true,
      message: `Created ${results.success.length} teachers successfully`,
      data: {
        total: teachers.length,
        success: results.success.length,
        failed: results.failed.length,
        results,
      },
    });
  } catch (error: any) {
    console.error("❌ Bulk create error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create teachers",
      error: error.message,
    });
  }
};

/**
 * ✅ BULK UPDATE teachers (optimized for speed)
 */
export const bulkUpdateTeachers = async (req: Request, res: Response) => {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("⚡ BULK UPDATE TEACHERS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const { teachers } = req.body;

    if (!Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "teachers array is required",
      });
    }

    console.log(`👥 Teachers to update: ${teachers.length}`);

    const results: any = { success: [], failed: [] };

    // Process all updates in parallel for speed
    await Promise.all(
      teachers.map(async (teacherUpdate: any) => {
        const { id, ...updateData } = teacherUpdate;

        if (!id) {
          results.failed.push({
            id: "unknown",
            error: "Teacher ID is required",
          });
          return;
        }

        try {
          // Check if teacher exists
          const existingTeacher = await prisma.teacher.findUnique({
            where: { id },
            include: {
              subjectTeachers: true,
              teacherClasses: true,
            },
          });

          if (!existingTeacher) {
            results.failed.push({
              id,
              error: "Teacher not found",
            });
            return;
          }

          // Perform update in transaction
          const updatedTeacher = await prisma.$transaction(
            async (tx) => {
              // Delete old assignments
              await Promise.all([
                tx.subjectTeacher.deleteMany({
                  where: { teacherId: id },
                }),
                tx.teacherClass.deleteMany({
                  where: { teacherId: id },
                }),
              ]);

              // Update teacher
              return await tx.teacher.update({
                where: { id },
                data: {
                  firstName:
                    updateData.firstName !== undefined
                      ? updateData.firstName.trim()
                      : undefined,
                  lastName:
                    updateData.lastName !== undefined
                      ? updateData.lastName.trim()
                      : undefined,
                  khmerName:
                    updateData.khmerName !== undefined
                      ? updateData.khmerName?.trim() || null
                      : undefined,
                  englishName:
                    updateData.englishName !== undefined
                      ? updateData.englishName?.trim() || null
                      : undefined,
                  email:
                    updateData.email !== undefined
                      ? updateData.email?.trim() || null
                      : undefined,
                  phone:
                    updateData.phone !== undefined
                      ? updateData.phone.trim()
                      : undefined,
                  gender:
                    updateData.gender !== undefined
                      ? updateData.gender
                      : undefined,
                  role:
                    updateData.role !== undefined ? updateData.role : undefined,
                  employeeId:
                    updateData.employeeId !== undefined
                      ? updateData.employeeId?.trim() || null
                      : undefined,
                  position:
                    updateData.position !== undefined
                      ? updateData.position?.trim() || null
                      : undefined,
                  address:
                    updateData.address !== undefined
                      ? updateData.address?.trim() || null
                      : undefined,
                  dateOfBirth:
                    updateData.dateOfBirth !== undefined
                      ? updateData.dateOfBirth
                      : undefined,
                  hireDate:
                    updateData.hireDate !== undefined
                      ? updateData.hireDate
                      : undefined,

                  homeroomClassId:
                    updateData.role === "INSTRUCTOR"
                      ? updateData.homeroomClassId || null
                      : updateData.role === "TEACHER"
                      ? null
                      : undefined,

                  subjectTeachers: {
                    create: (updateData.subjectIds || []).map(
                      (subjectId: string) => ({
                        subjectId,
                      })
                    ),
                  },
                  teacherClasses: {
                    create: (updateData.teachingClassIds || []).map(
                      (classId: string) => ({
                        classId,
                      })
                    ),
                  },
                },
              });
            },
            {
              maxWait: 10000,
              timeout: 15000,
            }
          );

          results.success.push({
            id: updatedTeacher.id,
            name:
              updatedTeacher.khmerName ||
              `${updatedTeacher.firstName} ${updatedTeacher.lastName}`,
          });

          console.log(
            `  ✅ Updated: ${
              updatedTeacher.khmerName || updatedTeacher.firstName
            }`
          );
        } catch (error: any) {
          results.failed.push({
            id,
            error: error.message,
          });
          console.error(`  ❌ Failed to update ${id}: ${error.message}`);
        }
      })
    );

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Success: ${results.success.length}/${teachers.length}`);
    console.log(`❌ Failed: ${results.failed.length}/${teachers.length}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    res.json({
      success: true,
      message: `Updated ${results.success.length} teachers successfully`,
      data: {
        total: teachers.length,
        success: results.success.length,
        failed: results.failed.length,
        results,
      },
    });
  } catch (error: any) {
    console.error("❌ Bulk update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update teachers",
      error: error.message,
    });
  }
};
