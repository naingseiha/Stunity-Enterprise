import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * ✅ GET ACCOUNT STATISTICS
 * Overview of active/inactive accounts across the system
 */
export const getAccountStatistics = async (req: Request, res: Response) => {
  try {
    console.log("📊 Fetching account statistics...");

    // Count all students
    const totalStudents = await prisma.student.count();
    
    // Count active student accounts
    const activeStudents = await prisma.student.count({
      where: { isAccountActive: true },
    });
    
    // Count students by grade
    const studentsByGrade = await prisma.student.groupBy({
      by: ["classId"],
      where: {
        classId: { not: null },
      },
      _count: true,
    });

    // Get class information for grade grouping
    const classes = await prisma.class.findMany({
      select: {
        id: true,
        grade: true,
        name: true,
      },
    });

    // Group by grade
    const gradeStats: any = {};
    for (const cls of classes) {
      if (!gradeStats[cls.grade]) {
        gradeStats[cls.grade] = {
          total: 0,
          active: 0,
          inactive: 0,
        };
      }
    }

    // Count students per grade
    for (const item of studentsByGrade) {
      const cls = classes.find((c) => c.id === item.classId);
      if (cls) {
        gradeStats[cls.grade].total += item._count;
      }
    }

    // Count active students per grade
    const activeByClass = await prisma.student.groupBy({
      by: ["classId"],
      where: {
        classId: { not: null },
        isAccountActive: true,
      },
      _count: true,
    });

    for (const item of activeByClass) {
      const cls = classes.find((c) => c.id === item.classId);
      if (cls) {
        gradeStats[cls.grade].active += item._count;
      }
    }

    // 🔥 FIX: Calculate inactive counts for ALL grades (not just those with active students)
    for (const grade in gradeStats) {
      gradeStats[grade].inactive = gradeStats[grade].total - gradeStats[grade].active;
    }

    res.json({
      success: true,
      data: {
        overall: {
          totalStudents,
          activeStudents,
          inactiveStudents: totalStudents - activeStudents,
          activationRate: totalStudents > 0 
            ? ((activeStudents / totalStudents) * 100).toFixed(2) + "%" 
            : "0%",
        },
        byGrade: gradeStats,
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching account statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch account statistics",
      error: error.message,
    });
  }
};

/**
 * ✅ DEACTIVATE ALL STUDENT ACCOUNTS (School-wide)
 * WARNING: This will deactivate ALL student accounts
 */
export const deactivateAllStudents = async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    
    console.log("🚨 DEACTIVATING ALL STUDENT ACCOUNTS...");
    console.log("Reason:", reason);

    const result = await prisma.student.updateMany({
      data: {
        isAccountActive: false,
        accountDeactivatedAt: new Date(),
        deactivationReason: reason || "Bulk deactivation by admin",
      },
    });

    console.log(`✅ Deactivated ${result.count} student accounts`);

    res.json({
      success: true,
      message: `បានបិទគណនីសិស្ស ${result.count} នាក់\nDeactivated ${result.count} student accounts`,
      data: {
        deactivatedCount: result.count,
        reason,
        deactivatedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error("❌ Error deactivating all students:", error);
    res.status(500).json({
      success: false,
      message: "Failed to deactivate all student accounts",
      error: error.message,
    });
  }
};

/**
 * ✅ DEACTIVATE STUDENTS BY GRADE
 */
export const deactivateStudentsByGrade = async (req: Request, res: Response) => {
  try {
    const { grade, reason } = req.body;

    if (!grade) {
      return res.status(400).json({
        success: false,
        message: "Grade is required",
      });
    }

    console.log(`🚨 DEACTIVATING STUDENTS IN GRADE: ${grade}...`);
    console.log("Reason:", reason);

    // Get all classes for this grade
    const classes = await prisma.class.findMany({
      where: { grade },
      select: { id: true },
    });

    const classIds = classes.map((c) => c.id);

    const result = await prisma.student.updateMany({
      where: {
        classId: { in: classIds },
      },
      data: {
        isAccountActive: false,
        accountDeactivatedAt: new Date(),
        deactivationReason: reason || `Deactivated grade ${grade} by admin`,
      },
    });

    console.log(`✅ Deactivated ${result.count} students in grade ${grade}`);

    res.json({
      success: true,
      message: `បានបិទគណនីសិស្ស ${result.count} នាក់ក្នុងថ្នាក់ទី ${grade}\nDeactivated ${result.count} students in grade ${grade}`,
      data: {
        deactivatedCount: result.count,
        grade,
        reason,
        deactivatedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error("❌ Error deactivating students by grade:", error);
    res.status(500).json({
      success: false,
      message: "Failed to deactivate students by grade",
      error: error.message,
    });
  }
};

/**
 * ✅ DEACTIVATE STUDENTS BY CLASS
 */
export const deactivateStudentsByClass = async (req: Request, res: Response) => {
  try {
    const { classId, reason } = req.body;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: "Class ID is required",
      });
    }

    console.log(`🚨 DEACTIVATING STUDENTS IN CLASS: ${classId}...`);
    console.log("Reason:", reason);

    const result = await prisma.student.updateMany({
      where: { classId },
      data: {
        isAccountActive: false,
        accountDeactivatedAt: new Date(),
        deactivationReason: reason || `Deactivated class by admin`,
      },
    });

    console.log(`✅ Deactivated ${result.count} students in class ${classId}`);

    res.json({
      success: true,
      message: `បានបិទគណនីសិស្ស ${result.count} នាក់\nDeactivated ${result.count} students`,
      data: {
        deactivatedCount: result.count,
        classId,
        reason,
        deactivatedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error("❌ Error deactivating students by class:", error);
    res.status(500).json({
      success: false,
      message: "Failed to deactivate students by class",
      error: error.message,
    });
  }
};

/**
 * ✅ ACTIVATE STUDENT ACCOUNTS (Bulk or Individual)
 */
export const activateStudents = async (req: Request, res: Response) => {
  try {
    const { studentIds, grade, classId, activateAll } = req.body;

    console.log("✅ ACTIVATING STUDENT ACCOUNTS...");

    let result;

    if (activateAll) {
      // Activate all students
      result = await prisma.student.updateMany({
        data: {
          isAccountActive: true,
          accountDeactivatedAt: null,
          deactivationReason: null,
        },
      });
      console.log(`✅ Activated ALL ${result.count} students`);
    } else if (grade) {
      // Activate by grade
      const classes = await prisma.class.findMany({
        where: { grade },
        select: { id: true },
      });
      const classIds = classes.map((c) => c.id);

      result = await prisma.student.updateMany({
        where: {
          classId: { in: classIds },
        },
        data: {
          isAccountActive: true,
          accountDeactivatedAt: null,
          deactivationReason: null,
        },
      });
      console.log(`✅ Activated ${result.count} students in grade ${grade}`);
    } else if (classId) {
      // Activate by class
      result = await prisma.student.updateMany({
        where: { classId },
        data: {
          isAccountActive: true,
          accountDeactivatedAt: null,
          deactivationReason: null,
        },
      });
      console.log(`✅ Activated ${result.count} students in class ${classId}`);
    } else if (studentIds && Array.isArray(studentIds)) {
      // Activate specific students
      result = await prisma.student.updateMany({
        where: {
          id: { in: studentIds },
        },
        data: {
          isAccountActive: true,
          accountDeactivatedAt: null,
          deactivationReason: null,
        },
      });
      console.log(`✅ Activated ${result.count} specific students`);
    } else {
      return res.status(400).json({
        success: false,
        message: "Please specify students to activate",
      });
    }

    res.json({
      success: true,
      message: `បានបើកគណនីសិស្ស ${result.count} នាក់\nActivated ${result.count} student accounts`,
      data: {
        activatedCount: result.count,
        activatedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error("❌ Error activating students:", error);
    res.status(500).json({
      success: false,
      message: "Failed to activate students",
      error: error.message,
    });
  }
};

/**
 * ✅ CREATE STUDENT USER ACCOUNT
 * Automatically create user account when student is added
 */
export const createStudentAccount = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    console.log(`📝 Creating account for student: ${studentId}`);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (student.user) {
      return res.status(400).json({
        success: false,
        message: "Student already has an account",
      });
    }

    // Default password is student code
    const defaultPassword = student.studentId || "123456";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const user = await prisma.user.create({
      data: {
        email: student.email || undefined,
        phone: student.phoneNumber || undefined,
        password: hashedPassword,
        firstName: student.firstName,
        lastName: student.lastName,
        role: "STUDENT",
        studentId: student.id,
      },
    });

    console.log(`✅ Account created for student: ${student.studentId}`);

    res.json({
      success: true,
      message: "បានបង្កើតគណនីសិស្ស\nStudent account created successfully",
      data: {
        userId: user.id,
        studentId: student.id,
        studentCode: student.studentId,
        defaultPassword: defaultPassword,
      },
    });
  } catch (error: any) {
    console.error("❌ Error creating student account:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create student account",
      error: error.message,
    });
  }
};

/**
 * ✅ RESET STUDENT PASSWORD TO DEFAULT
 */
export const resetStudentPassword = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!student || !student.user) {
      return res.status(404).json({
        success: false,
        message: "Student account not found",
      });
    }

    // Reset to default password (student code)
    const defaultPassword = student.studentId || "123456";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    await prisma.user.update({
      where: { id: student.user.id },
      data: {
        password: hashedPassword,
        failedAttempts: 0,
      },
    });

    console.log(`✅ Password reset for student: ${student.studentId}`);

    res.json({
      success: true,
      message: "បានកំណត់ពាក្យសម្ងាត់ឡើងវិញ\nPassword reset successfully",
      data: {
        studentCode: student.studentId,
        defaultPassword: defaultPassword,
      },
    });
  } catch (error: any) {
    console.error("❌ Error resetting student password:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
};

/**
 * ✅ UPDATE STUDENT ROLE (Class Leader, Vice Leaders)
 */
export const updateStudentRole = async (req: Request, res: Response) => {
  try {
    const { studentId, studentRole } = req.body;

    if (!studentId || !studentRole) {
      return res.status(400).json({
        success: false,
        message: "Student ID and role are required",
      });
    }

    // Validate role
    const validRoles = ["GENERAL", "CLASS_LEADER", "VICE_LEADER_1", "VICE_LEADER_2"];
    if (!validRoles.includes(studentRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student role",
      });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { classId: true },
    });

    if (!student || !student.classId) {
      return res.status(404).json({
        success: false,
        message: "Student not found or not assigned to a class",
      });
    }

    // Validate: Only one CLASS_LEADER per class
    if (studentRole === "CLASS_LEADER") {
      const existingLeader = await prisma.student.findFirst({
        where: {
          classId: student.classId,
          studentRole: "CLASS_LEADER",
          id: { not: studentId },
        },
      });

      if (existingLeader) {
        return res.status(400).json({
          success: false,
          message: "This class already has a class leader",
        });
      }
    }

    // Validate: Only one VICE_LEADER_1 per class
    if (studentRole === "VICE_LEADER_1") {
      const existingVice1 = await prisma.student.findFirst({
        where: {
          classId: student.classId,
          studentRole: "VICE_LEADER_1",
          id: { not: studentId },
        },
      });

      if (existingVice1) {
        return res.status(400).json({
          success: false,
          message: "This class already has a first vice leader",
        });
      }
    }

    // Validate: Only one VICE_LEADER_2 per class
    if (studentRole === "VICE_LEADER_2") {
      const existingVice2 = await prisma.student.findFirst({
        where: {
          classId: student.classId,
          studentRole: "VICE_LEADER_2",
          id: { not: studentId },
        },
      });

      if (existingVice2) {
        return res.status(400).json({
          success: false,
          message: "This class already has a second vice leader",
        });
      }
    }

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: { studentRole },
      include: {
        class: {
          select: {
            name: true,
            grade: true,
          },
        },
      },
    });

    console.log(
      `✅ Updated student role: ${updatedStudent.studentId} -> ${studentRole}`
    );

    res.json({
      success: true,
      message: "បានកែប្រែតួនាទីសិស្ស\nStudent role updated successfully",
      data: updatedStudent,
    });
  } catch (error: any) {
    console.error("❌ Error updating student role:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update student role",
      error: error.message,
    });
  }
};
