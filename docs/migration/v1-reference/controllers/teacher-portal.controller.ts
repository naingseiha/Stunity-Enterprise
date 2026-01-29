import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Get teacher's own profile
export const getMyProfile = async (req: Request, res: Response) => {
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
      include: {
        teacher: {
          include: {
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
            teacherClasses: {
              select: {
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
            subjectTeachers: {
              select: {
                subject: {
                  select: {
                    id: true,
                    name: true,
                    nameKh: true,
                    code: true,
                    grade: true,
                    track: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !["TEACHER", "INSTRUCTOR", "ADMIN"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied - Not a teacher/admin",
      });
    }

    // If the user is a teacher but doesn't have a teacher record, create one or handle appropriately
    let teacherData = user.teacher;
    if (!teacherData && user.role !== "ADMIN") {
      // For backward compatibility, if a teacher doesn't have a teacher record, return basic user info
      teacherData = null;
    }

    // Map teaching classes
    const teachingClasses = teacherData?.teacherClasses?.map((tc: any) => tc.class) || [];

    // Map subjects
    const subjects = teacherData?.subjectTeachers?.map((st: any) => st.subject) || [];

    res.json({
      success: true,
      data: {
        id: user.id,
        teacherId: teacherData?.teacherId,
        firstName: user.firstName,
        lastName: user.lastName,
        khmerName: teacherData?.khmerName,
        englishName: teacherData?.englishName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        gender: teacherData?.gender,
        dateOfBirth: teacherData?.dateOfBirth,
        hireDate: teacherData?.hireDate,
        address: teacherData?.address,
        position: teacherData?.position,
        homeroomClass: teacherData?.homeroomClass,
        teachingClasses: teachingClasses,
        subjects: subjects,
      },
    });
  } catch (error: any) {
    console.error("Error getting teacher profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: error.message,
    });
  }
};

// Update teacher's own profile
export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const {
      firstName,
      lastName,
      khmerName,
      englishName,
      email,
      phone,
      gender,
      dateOfBirth,
      address,
      position,
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { teacher: true },
    });

    if (!user || !["TEACHER", "INSTRUCTOR", "ADMIN"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Update user record
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
        email: email || user.email,
        phone: phone || user.phone,
      },
    });

    // Update teacher record if exists
    let updatedTeacher = null;
    if (user.teacher) {
      updatedTeacher = await prisma.teacher.update({
        where: { id: user.teacher.id },
        data: {
          firstName: firstName || user.firstName,
          lastName: lastName || user.lastName,
          khmerName: khmerName || user.teacher.khmerName,
          englishName: englishName || user.teacher.englishName,
          email: email || user.email,
          phone: phone || user.phone,
          gender: gender || user.teacher.gender,
          dateOfBirth: dateOfBirth || user.teacher.dateOfBirth,
          address: address || user.teacher.address,
          position: position || user.teacher.position,
        },
        include: {
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
          teacherClasses: {
            select: {
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
          subjectTeachers: {
            select: {
              subject: {
                select: {
                  id: true,
                  name: true,
                  nameKh: true,
                  code: true,
                  grade: true,
                  track: true,
                },
              },
            },
          },
        },
      });
    }

    // Map teaching classes and subjects
    const teachingClasses2 = updatedTeacher?.teacherClasses?.map((tc: any) => tc.class) || [];
    const subjects2 = updatedTeacher?.subjectTeachers?.map((st: any) => st.subject) || [];

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updatedUser.id,
        teacherId: updatedTeacher?.teacherId,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        khmerName: updatedTeacher?.khmerName,
        englishName: updatedTeacher?.englishName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        gender: updatedTeacher?.gender,
        dateOfBirth: updatedTeacher?.dateOfBirth,
        hireDate: updatedTeacher?.hireDate,
        address: updatedTeacher?.address,
        position: updatedTeacher?.position,
        homeroomClass: updatedTeacher?.homeroomClass,
        teachingClasses: teachingClasses2,
        subjects: subjects2,
      },
    });
  } catch (error: any) {
    console.error("Error updating teacher profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

// Change teacher's password
export const changeMyPassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { oldPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Old password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !["TEACHER", "INSTRUCTOR", "ADMIN"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Old password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password with security fields
    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        isDefaultPassword: false,
        passwordChangedAt: new Date(),
        passwordExpiresAt: null,
      },
    });

    res.json({
      success: true,
      message: "Password changed successfully",
      isDefaultPassword: false,
      passwordChangedAt: new Date(),
    });
  } catch (error: any) {
    console.error("Error changing teacher password:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password",
      error: error.message,
    });
  }
};
