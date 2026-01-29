import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database";
import {
  isDefaultPassword,
  calculatePasswordExpiry,
  getAlertLevel,
  getTimeRemaining
} from "../utils/password.utils";

/**
 * ✅ REGISTER - បង្កើតគណនីថ្មី
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role, phone } = req.body;

    console.log("📝 REGISTER REQUEST:", { email, role, firstName, lastName });

    if (!password || !firstName || !lastName || !role) {
      return res.status(400).json({
        success: false,
        message: "សូមបំពេញព័ត៌មានទាំងអស់\nAll fields are required",
      });
    }

    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "អ៊ីមែលនេះត្រូវបានប្រើរួចហើយ\nEmail already exists",
        });
      }
    }

    if (phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone },
      });

      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message:
            "លេខទូរសព្ទនេះត្រូវបានប្រើរួចហើយ\nPhone number already exists",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email || undefined,
        phone: phone || undefined,
        password: hashedPassword,
        firstName,
        lastName,
        role,
      },
    });

    // ✅ FIXED: Proper JWT signing with 365 days expiration
    const jwtSecret = process.env.JWT_SECRET || "fallback-secret-key";
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email || user.phone || "",
        role: user.role,
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || "365d" }
    );

    console.log("✅ User registered successfully:", user.id);

    res.status(201).json({
      success: true,
      message: "បង្កើតគណនីបានជោគជ័យ\nRegistration successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || "365d",
      },
    });
  } catch (error: any) {
    console.error("❌ Register error:", error);
    res.status(500).json({
      success: false,
      message: "មានបញ្ហាក្នុងការបង្កើតគណនី\nRegistration failed",
      error: error.message,
    });
  }
};

/**
 * ✅ LOGIN - ចូលប្រើប្រាស់ (Supports Teacher, Student & Parent Login)
 * Students can login with: studentCode, email, or phone
 * Teachers can login with: email or phone
 * Parents can login with: email or phone
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, phone, password, studentCode } = req.body;

    console.log("🔐 LOGIN REQUEST:", { email, phone, studentCode });

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "សូមបញ្ចូលពាក្យសម្ងាត់\nPassword is required",
      });
    }

    if (!email && !phone && !studentCode) {
      return res.status(400).json({
        success: false,
        message: "សូមបញ្ចូលលេខកូដសិស្ស អ៊ីមែល ឬលេខទូរសព្ទ\nStudent code, email or phone is required",
      });
    }

    // ✅ Build flexible query to support student login via studentCode/email/phone
    const whereConditions: any[] = [];
    
    if (email) whereConditions.push({ email });
    if (phone) whereConditions.push({ phone });
    if (studentCode) {
      // For student login via studentCode
      whereConditions.push({ 
        student: { 
          studentId: studentCode 
        } 
      });
    }

    // ✅ Optimized: Only fetch essential data for login, load relations later
    const user = await prisma.user.findFirst({
      where: {
        OR: whereConditions,
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            khmerName: true,
            isAccountActive: true,
            deactivationReason: true,
            studentRole: true,
            classId: true,
            class: {
              select: {
                id: true,
                name: true,
                grade: true,
              },
            },
          },
        },
        teacher: {
          select: {
            id: true,
            teacherId: true,
            firstName: true,
            lastName: true,
            khmerName: true,
            position: true,
            homeroomClassId: true,
            phone: true,
            homeroomClass: {
              select: {
                id: true,
                name: true,
                grade: true,
              },
            },
            subjectTeachers: {
              select: {
                id: true,
                subjectId: true,
                subject: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    nameKh: true,
                  },
                },
              },
            },
            teacherClasses: {
              select: {
                id: true,
                classId: true,
                class: {
                  select: {
                    id: true,
                    name: true,
                    grade: true,
                  },
                },
              },
            },
          },
        },
        parent: {
          select: {
            id: true,
            parentId: true,
            firstName: true,
            lastName: true,
            khmerName: true,
            relationship: true,
            isAccountActive: true,
            studentParents: {
              include: {
                student: {
                  select: {
                    id: true,
                    studentId: true,
                    khmerName: true,
                    class: {
                      select: {
                        id: true,
                        name: true,
                        grade: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ\nInvalid credentials",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: user.failedAttempts + 1,
        },
      });

      return res.status(401).json({
        success: false,
        message: "អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ\nInvalid credentials",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "គណនីត្រូវបានបិទ\nAccount is disabled",
      });
    }

    // ✅ Check if student account is deactivated
    if (user.role === "STUDENT" && user.student && !user.student.isAccountActive) {
      return res.status(403).json({
        success: false,
        message: "គណនីសិស្សត្រូវបានបិទ\nStudent account is deactivated",
        deactivationReason: user.student.deactivationReason,
      });
    }

    // ✅ Check if parent account is deactivated
    if (user.role === "PARENT" && user.parent && !user.parent.isAccountActive) {
      return res.status(403).json({
        success: false,
        message: "គណនីឪពុកម្តាយត្រូវបានបិទ\nParent account is deactivated",
      });
    }

    // ✅ Password Security: Check if using default password
    const phoneNumber = user.phone || user.teacher?.phone;
    const usingDefaultPassword = phoneNumber 
      ? await isDefaultPassword(user.password, phoneNumber)
      : false;

    // Set default password flag and expiration on first detection
    let passwordSecurityUpdate: any = {
      lastLogin: new Date(),
      loginCount: user.loginCount + 1,
      failedAttempts: 0,
    };

    // Update password security status based on ACTUAL password check
    if (usingDefaultPassword) {
      // User IS using default password
      if (user.isDefaultPassword === null) {
        passwordSecurityUpdate.isDefaultPassword = true;
      }
      // Always set expiration if not set or if user still has default password
      if (!user.passwordExpiresAt || user.isDefaultPassword) {
        passwordSecurityUpdate.passwordExpiresAt = calculatePasswordExpiry(7);
      }
    } else {
      // User is NOT using default password - clear the flag and expiration
      if (user.isDefaultPassword === true || user.isDefaultPassword === null) {
        passwordSecurityUpdate.isDefaultPassword = false;
        passwordSecurityUpdate.passwordExpiresAt = null;
      }
    }

    // Check if password has expired (only for teachers with default passwords)
    if (user.role === "TEACHER" && user.isDefaultPassword && user.passwordExpiresAt) {
      const now = new Date();
      if (user.passwordExpiresAt < now) {
        return res.status(403).json({
          success: false,
          message: "ពាក្យសម្ងាត់របស់អ្នកផុតកំណត់\nYour password has expired. Please contact admin.",
          passwordExpired: true,
        });
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: passwordSecurityUpdate,
    });

    // ✅ FIXED: Proper JWT signing with 365 days expiration
    const jwtSecret = process.env.JWT_SECRET || "fallback-secret-key";
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email || user.phone || user.student?.studentId || "",
        role: user.role,
        studentRole: user.student?.studentRole || null,
        studentId: user.student?.id || null,
        teacherId: user.teacher?.id || null,
        parentId: user.parent?.id || null,
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || "365d" }
    );

    console.log("✅ Login successful:", user.id, "Role:", user.role);

    // Calculate password security status
    const passwordStatus = {
      isDefaultPassword: usingDefaultPassword || user.isDefaultPassword || false,
      passwordExpiresAt: user.passwordExpiresAt,
      alertLevel: getAlertLevel(user.passwordExpiresAt),
      ...getTimeRemaining(user.passwordExpiresAt),
    };

    res.json({
      success: true,
      message: "ចូលប្រើប្រាស់បានជោគជ័យ\nLogin successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isSuperAdmin: user.isSuperAdmin,
          permissions: user.permissions,
          profilePictureUrl: user.profilePictureUrl, // ✅ ADDED: For profile picture display
          coverPhotoUrl: user.coverPhotoUrl, // ✅ ADDED: For cover photo display
          student: user.student,
          teacher: user.teacher,
          parent: user.parent,
        },
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || "365d",
        passwordStatus,
      },
    });
  } catch (error: any) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: "មានបញ្ហាក្នុងការចូលប្រើប្រាស់\nLogin failed",
      error: error.message,
    });
  }
};

/**
 * ✅ REFRESH TOKEN - ផ្តល់ token ថ្មី
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    // ✅ FIXED:  Proper JWT verify
    const jwtSecret = process.env.JWT_SECRET || "fallback-secret-key";
    const decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
      email: string;
      role: string;
    };

    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        email: decoded.email || "",
        role: decoded.role,
      },
      jwtSecret as string,
      { expiresIn: (process.env.JWT_EXPIRES_IN || "365d") as string }
    );

    res.json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        token: newToken,
      },
    });
  } catch (error: any) {
    console.error("❌ Refresh token error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: error.message,
    });
  }
};

/**
 * ✅ GET CURRENT USER
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // ✅ FIX: Middleware sets req.userId, not req.user.userId
    const userId = (req as any).userId;

    console.log("📍 Getting current user for ID:", userId);

    if (!userId) {
      console.log("❌ No userId found in request");
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        loginCount: true,
        createdAt: true,
        updatedAt: true,
        isSuperAdmin: true,
        permissions: true,
        profilePictureUrl: true, // ✅ ADDED: For profile picture display
        coverPhotoUrl: true, // ✅ ADDED: For cover photo display
        student: {
          select: {
            id: true,
            studentId: true,
            khmerName: true,
            firstName: true,
            lastName: true,
            gender: true,
            classId: true,
            class: {
              select: {
                id: true,
                name: true,
                grade: true,
              },
            },
          },
        },
        teacher: {
          select: {
            id: true,
            teacherId: true,
            firstName: true,
            lastName: true,
            khmerName: true,
            position: true,
            homeroomClassId: true,
            homeroomClass: {
              select: {
                id: true,
                name: true,
                grade: true,
              },
            },
            subjectTeachers: {
              select: {
                id: true,
                subjectId: true,
                subject: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    nameKh: true,
                  },
                },
              },
            },
            teacherClasses: {
              select: {
                id: true,
                classId: true,
                class: {
                  select: {
                    id: true,
                    name: true,
                    grade: true,
                  },
                },
              },
            },
          },
        },
        parent: {
          select: {
            id: true,
            parentId: true,
            firstName: true,
            lastName: true,
            khmerName: true,
            relationship: true,
            phone: true,
            email: true,
            studentParents: {
              select: {
                id: true,
                isPrimary: true,
                relationship: true,
                student: {
                  select: {
                    id: true,
                    studentId: true,
                    khmerName: true,
                    class: {
                      select: {
                        id: true,
                        name: true,
                        grade: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error("❌ Get current user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user",
      error: error.message,
    });
  }
};

/**
 * ✅ LOGOUT
 */
export const logout = async (req: Request, res: Response) => {
  try {
    // ✅ FIX: Middleware sets req.userId, not req.user.userId
    const userId = (req as any).userId;

    if (userId) {
      console.log("👋 User logged out:", userId);
    }

    res.json({
      success: true,
      message: "ចាកចេញបានជោគជ័យ\nLogout successful",
    });
  } catch (error: any) {
    console.error("❌ Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
    });
  }
};

/**
 * ✅ GET PASSWORD STATUS - ពិនិត្យស្ថានភាពពាក្យសម្ងាត់
 */
export const getPasswordStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isDefaultPassword: true,
        passwordExpiresAt: true,
        passwordChangedAt: true,
        phone: true,
        password: true, // Need to check actual password
        teacher: {
          select: {
            phone: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Actually check if the current password is the default (phone number)
    const phoneNumber = user.phone || user.teacher?.phone;
    const actuallyUsingDefaultPassword = phoneNumber
      ? await isDefaultPassword(user.password, phoneNumber)
      : false;

    // If the actual check differs from the database field, update it
    if (actuallyUsingDefaultPassword !== user.isDefaultPassword) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isDefaultPassword: actuallyUsingDefaultPassword,
          passwordExpiresAt: actuallyUsingDefaultPassword 
            ? (user.passwordExpiresAt || calculatePasswordExpiry(7))
            : null,
        },
      });
    }

    const timeRemaining = getTimeRemaining(
      actuallyUsingDefaultPassword ? user.passwordExpiresAt : null
    );
    const alertLevel = getAlertLevel(
      actuallyUsingDefaultPassword ? user.passwordExpiresAt : null
    );

    res.json({
      success: true,
      data: {
        isDefaultPassword: actuallyUsingDefaultPassword,
        passwordExpiresAt: actuallyUsingDefaultPassword ? user.passwordExpiresAt : null,
        passwordChangedAt: user.passwordChangedAt,
        daysRemaining: timeRemaining.daysRemaining,
        hoursRemaining: timeRemaining.hoursRemaining,
        isExpired: timeRemaining.isExpired,
        alertLevel: actuallyUsingDefaultPassword ? alertLevel : 'none',
        canExtend: actuallyUsingDefaultPassword && timeRemaining.daysRemaining > 0 && timeRemaining.daysRemaining <= 7,
      },
    });
  } catch (error: any) {
    console.error("❌ Get password status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get password status",
      error: error.message,
    });
  }
};
