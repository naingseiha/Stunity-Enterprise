import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/database";
import {
  generateTemporaryPassword,
  calculatePasswordExpiry,
  getAlertLevel,
  getTimeRemaining,
} from "../utils/password.utils";

/**
 * Get security dashboard overview
 */
export const getSecurityDashboard = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    // Get statistics
    const totalTeachers = await prisma.user.count({
      where: { role: { in: ["TEACHER"] } },
    });

    const defaultPasswordCount = await prisma.user.count({
      where: {
        role: { in: ["TEACHER"] },
        isDefaultPassword: true,
      },
    });

    const expiredCount = await prisma.user.count({
      where: {
        role: { in: ["TEACHER"] },
        isDefaultPassword: true,
        passwordExpiresAt: { lt: new Date() },
      },
    });

    const expiringInDay = await prisma.user.count({
      where: {
        role: { in: ["TEACHER"] },
        isDefaultPassword: true,
        passwordExpiresAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      },
    });

    const expiringIn3Days = await prisma.user.count({
      where: {
        role: { in: ["TEACHER"] },
        isDefaultPassword: true,
        passwordExpiresAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const suspendedCount = await prisma.user.count({
      where: {
        role: { in: ["TEACHER"] },
        isActive: false,
        accountSuspendedAt: { not: null },
      },
    });

    // Get parent statistics
    const totalParents = await prisma.parent.count();
    const activeParents = await prisma.parent.count({
      where: {
        user: {
          isActive: true,
        },
      },
    });

    // Get active teachers count
    const activeTeachers = await prisma.user.count({
      where: {
        role: { in: ["TEACHER"] },
        isActive: true,
      },
    });

    // Get suspended accounts
    const suspendedAccounts = await prisma.user.count({
      where: {
        isActive: false,
        accountSuspendedAt: { not: null },
      },
    });

    res.json({
      success: true,
      data: {
        totalTeachers,
        activeTeachers,
        defaultPasswordCount,
        expiredCount,
        expiringInDay,
        expiringIn3Days,
        suspendedCount,
        suspendedAccounts,
        totalParents,
        activeParents,
        securityScore: Math.round(
          ((totalTeachers - defaultPasswordCount) / totalTeachers) * 100
        ),
      },
    });
  } catch (error: any) {
    console.error("❌ Get security dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get security dashboard",
      error: error.message,
    });
  }
};

/**
 * Get teacher security list with pagination
 */
export const getTeacherSecurityList = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const filter = (req.query.filter as string) || "all";

    let whereClause: any = {
      role: { in: ["TEACHER"] },
    };

    if (filter === "default") {
      whereClause.isDefaultPassword = true;
    } else if (filter === "expired") {
      whereClause.isDefaultPassword = true;
      whereClause.passwordExpiresAt = { lt: new Date() };
    } else if (filter === "expiring") {
      whereClause.isDefaultPassword = true;
      whereClause.passwordExpiresAt = {
        gte: new Date(),
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
    } else if (filter === "suspended") {
      whereClause.isActive = false;
      whereClause.accountSuspendedAt = { not: null };
    }

    const [teachers, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          teacher: {
            select: {
              teacherId: true,
              firstName: true,
              lastName: true,
              khmerName: true,
              phone: true,
              position: true,
            },
          },
        },
        orderBy: [
          { passwordExpiresAt: "asc" },
          { lastName: "asc" },
        ],
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    const teachersWithStatus = teachers.map((teacher) => {
      const timeRemaining = getTimeRemaining(teacher.passwordExpiresAt);
      const alertLevel = getAlertLevel(teacher.passwordExpiresAt);

      return {
        id: teacher.id,
        email: teacher.email,
        phone: teacher.phone,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        isActive: teacher.isActive,
        isDefaultPassword: teacher.isDefaultPassword,
        passwordExpiresAt: teacher.passwordExpiresAt,
        passwordChangedAt: teacher.passwordChangedAt,
        accountSuspendedAt: teacher.accountSuspendedAt,
        suspensionReason: teacher.suspensionReason,
        lastLogin: teacher.lastLogin,
        teacher: teacher.teacher,
        daysRemaining: timeRemaining.daysRemaining,
        hoursRemaining: timeRemaining.hoursRemaining,
        isExpired: timeRemaining.isExpired,
        alertLevel,
      };
    });

    res.json({
      success: true,
      data: {
        teachers: teachersWithStatus,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Get teacher security list error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get teacher security list",
      error: error.message,
    });
  }
};

/**
 * Force password reset for a teacher
 */
export const forcePasswordReset = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, firstName: true, lastName: true },
    });

    if (!admin || admin.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    const { teacherId, reason } = req.body;

    if (!teacherId) {
      return res.status(400).json({
        success: false,
        message: "Teacher ID is required",
      });
    }

    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      include: {
        teacher: {
          select: {
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!teacher || !["TEACHER"].includes(teacher.role)) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // Generate temporary password
    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Update user
    await prisma.user.update({
      where: { id: teacherId },
      data: {
        password: hashedPassword,
        isDefaultPassword: true,
        passwordExpiresAt: calculatePasswordExpiry(7),
        passwordChangedAt: new Date(),
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        adminId: userId,
        teacherId,
        action: "FORCE_PASSWORD_RESET",
        reason: reason || "Admin initiated password reset",
        details: {
          tempPassword,
        },
      },
    });

    res.json({
      success: true,
      message: "Password reset successfully",
      data: {
        tempPassword,
        teacherName: `${teacher.teacher?.firstName} ${teacher.teacher?.lastName}`,
        expiresAt: calculatePasswordExpiry(7),
      },
    });
  } catch (error: any) {
    console.error("❌ Force password reset error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
};

/**
 * Extend password expiration for a teacher
 */
export const extendExpiration = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!admin || admin.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    const { teacherId, days, reason } = req.body;

    if (!teacherId || !days) {
      return res.status(400).json({
        success: false,
        message: "Teacher ID and days are required",
      });
    }

    if (days < 1 || days > 30) {
      return res.status(400).json({
        success: false,
        message: "Days must be between 1 and 30",
      });
    }

    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
    });

    if (!teacher || !["TEACHER"].includes(teacher.role)) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // Calculate new expiration date by adding days to current expiration
    // If no current expiration, start from today
    const baseDate = teacher.passwordExpiresAt || new Date();
    const newExpiresAt = new Date(baseDate);
    newExpiresAt.setDate(newExpiresAt.getDate() + days);

    await prisma.user.update({
      where: { id: teacherId },
      data: {
        passwordExpiresAt: newExpiresAt,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        adminId: userId,
        teacherId,
        action: "EXTEND_EXPIRATION",
        reason: reason || `Extended password expiration by ${days} days`,
        details: {
          days,
          newExpiresAt,
        },
      },
    });

    res.json({
      success: true,
      message: `Password expiration extended by ${days} days`,
      data: {
        newExpiresAt,
      },
    });
  } catch (error: any) {
    console.error("❌ Extend expiration error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to extend expiration",
      error: error.message,
    });
  }
};

/**
 * Suspend or unsuspend a teacher account
 */
export const toggleAccountSuspension = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!admin || admin.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    const { teacherId, suspend, reason } = req.body;

    if (!teacherId || suspend === undefined) {
      return res.status(400).json({
        success: false,
        message: "Teacher ID and suspend flag are required",
      });
    }

    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
    });

    if (!teacher || !["TEACHER"].includes(teacher.role)) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    await prisma.user.update({
      where: { id: teacherId },
      data: {
        isActive: !suspend,
        accountSuspendedAt: suspend ? new Date() : null,
        suspensionReason: suspend ? reason : null,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        adminId: userId,
        teacherId,
        action: suspend ? "SUSPEND_ACCOUNT" : "UNSUSPEND_ACCOUNT",
        reason: reason || (suspend ? "Account suspended" : "Account unsuspended"),
      },
    });

    res.json({
      success: true,
      message: suspend ? "Account suspended" : "Account unsuspended",
    });
  } catch (error: any) {
    console.error("❌ Toggle account suspension error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle account suspension",
      error: error.message,
    });
  }
};

/**
 * Get audit logs
 */
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const teacherId = req.query.teacherId as string;

    let whereClause: any = {};
    if (teacherId) {
      whereClause.teacherId = teacherId;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          admin: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          teacher: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.count({ where: whereClause }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Get audit logs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get audit logs",
      error: error.message,
    });
  }
};
