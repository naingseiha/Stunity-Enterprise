import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * 🔐 Verify parent has access to a specific student
 * Helper function for authorization
 */
async function verifyParentAccess(userId: string, studentId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      parent: {
        include: {
          studentParents: {
            select: { studentId: true },
          },
        },
      },
    },
  });

  if (!user || user.role !== "PARENT" || !user.parent) {
    throw new Error("Access denied: Not a parent");
  }

  const childIds = user.parent.studentParents.map((sp) => sp.studentId);
  if (!childIds.includes(studentId)) {
    throw new Error("Access denied: This student is not your child");
  }

  return user.parent;
}

/**
 * 👤 Get parent's own profile with all children
 * GET /api/parent-portal/profile
 */
export const getProfile = async (req: Request, res: Response) => {
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
        parent: {
          include: {
            studentParents: {
              include: {
                student: {
                  include: {
                    class: {
                      select: {
                        id: true,
                        name: true,
                        grade: true,
                        section: true,
                        track: true,
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

    if (!user || user.role !== "PARENT" || !user.parent) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Format children data
    const children = user.parent.studentParents.map((sp) => ({
      id: sp.student.id,
      studentId: sp.student.studentId,
      firstName: sp.student.firstName,
      lastName: sp.student.lastName,
      khmerName: sp.student.khmerName,
      gender: sp.student.gender,
      dateOfBirth: sp.student.dateOfBirth,
      email: sp.student.email,
      phoneNumber: sp.student.phoneNumber,
      photoUrl: sp.student.photoUrl,
      class: sp.student.class,
      relationship: sp.relationship,
      isPrimary: sp.isPrimary,
    }));

    res.json({
      success: true,
      data: {
        id: user.id,
        parentInfo: {
          id: user.parent.id,
          parentId: user.parent.parentId,
          firstName: user.parent.firstName,
          lastName: user.parent.lastName,
          khmerName: user.parent.khmerName,
          englishName: user.parent.englishName,
          gender: user.parent.gender,
          email: user.parent.email,
          phone: user.parent.phone,
          address: user.parent.address,
          relationship: user.parent.relationship,
          occupation: user.parent.occupation,
          emergencyPhone: user.parent.emergencyPhone,
        },
        children,
        totalChildren: children.length,
      },
    });
  } catch (error: any) {
    console.error("Error getting parent profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: error.message,
    });
  }
};

/**
 * 👶 Get detailed list of children
 * GET /api/parent-portal/children
 */
export const getChildren = async (req: Request, res: Response) => {
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
        parent: {
          include: {
            studentParents: {
              include: {
                student: {
                  include: {
                    class: {
                      include: {
                        homeroomTeacher: {
                          select: {
                            firstName: true,
                            lastName: true,
                            khmerName: true,
                            phone: true,
                            email: true,
                          },
                        },
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

    if (!user || user.role !== "PARENT" || !user.parent) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Get current academic year
    const currentMonth = new Date().getMonth() + 1;
    const currentCalendarYear = new Date().getFullYear();
    const currentAcademicYear = currentMonth >= 10 ? currentCalendarYear : currentCalendarYear - 1;

    // Get detailed info for each child
    const childrenWithStats = await Promise.all(
      user.parent.studentParents.map(async (sp) => {
        const student = sp.student;

        // Get latest grades for current academic year
        const grades = await prisma.grade.findMany({
          where: {
            studentId: student.id,
            OR: [
              { year: currentAcademicYear, monthNumber: { gte: 10 } },
              { year: currentAcademicYear + 1, monthNumber: { lte: 9 } },
            ],
          },
          include: {
            subject: {
              select: { coefficient: true },
            },
          },
        });

        // Calculate average
        const totalScore = grades.reduce((sum, g) => sum + (g.score || 0), 0);
        const totalCoefficient = grades.reduce(
          (sum, g) => sum + (g.subject.coefficient || 1),
          0
        );
        const averageScore =
          totalCoefficient > 0 ? totalScore / totalCoefficient : null;

        // Get attendance for current month
        const currentMonthStart = new Date(
          currentCalendarYear,
          new Date().getMonth(),
          1
        );
        const currentMonthEnd = new Date(
          currentCalendarYear,
          new Date().getMonth() + 1,
          0
        );

        const attendance = await prisma.attendance.findMany({
          where: {
            studentId: student.id,
            date: {
              gte: currentMonthStart,
              lte: currentMonthEnd,
            },
          },
        });

        const presentCount = attendance.filter((a) => a.status === "PRESENT").length;
        const totalDays = new Date().getDate(); // Days in current month so far
        const attendanceRate =
          totalDays > 0 ? (presentCount / totalDays) * 100 : null;

        return {
          id: student.id,
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          khmerName: student.khmerName,
          englishName: student.englishName,
          gender: student.gender,
          dateOfBirth: student.dateOfBirth,
          email: student.email,
          phoneNumber: student.phoneNumber,
          photoUrl: student.photoUrl,
          class: student.class,
          relationship: sp.relationship,
          isPrimary: sp.isPrimary,
          stats: {
            averageScore: averageScore ? parseFloat(averageScore.toFixed(2)) : null,
            attendanceRate: attendanceRate ? parseFloat(attendanceRate.toFixed(1)) : null,
            totalGrades: grades.length,
            presentDays: presentCount,
            totalDays,
          },
        };
      })
    );

    res.json({
      success: true,
      data: childrenWithStats,
    });
  } catch (error: any) {
    console.error("Error getting children:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get children",
      error: error.message,
    });
  }
};

/**
 * 📊 Get child's grades
 * GET /api/parent-portal/child/:studentId/grades
 */
export const getChildGrades = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { studentId } = req.params;
    const { year, month } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Verify parent has access to this student
    try {
      await verifyParentAccess(userId, studentId);
    } catch (error: any) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    // Build filter
    const filter: any = {
      studentId,
    };

    if (year) {
      filter.year = parseInt(year as string);
    }
    if (month) {
      filter.month = month as string;
    }

    // Get grades
    const grades = await prisma.grade.findMany({
      where: filter,
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
      orderBy: [{ year: "desc" }, { monthNumber: "desc" }],
    });

    // Get student info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
      },
    });

    // Get all subjects for the student's grade
    let allSubjects: any[] = [];
    if (student?.class) {
      const whereClause: any = {
        grade: student.class.grade,
        isActive: true,
      };

      // For Grade 11 & 12, filter by track
      const gradeNum = parseInt(student.class.grade);
      if ((gradeNum === 11 || gradeNum === 12) && student.class.track) {
        whereClause.OR = [
          { track: student.class.track },
          { track: null },
          { track: "common" },
        ];
      }

      allSubjects = await prisma.subject.findMany({
        where: whereClause,
      });
    }

    // Calculate statistics
    const totalGrades = grades.length;
    const totalScore = grades.reduce((sum, g) => sum + (g.score || 0), 0);
    const studentCoefficient = grades.reduce(
      (sum, g) => sum + (g.subject.coefficient || 1),
      0
    );
    const averageScore =
      studentCoefficient > 0 ? totalScore / studentCoefficient : 0;

    // Calculate class rank if specific month and year provided
    let classRank = null;
    if (student?.classId && year && month) {
      const classStudents = await prisma.student.findMany({
        where: { classId: student.classId },
        select: { id: true },
      });

      const studentAverages = await Promise.all(
        classStudents.map(async (s) => {
          const studentGrades = await prisma.grade.findMany({
            where: {
              studentId: s.id,
              classId: student.classId,
              month: month as string,
              year: parseInt(year as string),
            },
            include: { subject: true },
          });

          const score = studentGrades.reduce((sum, g) => sum + (g.score || 0), 0);
          const coeff = studentGrades.reduce(
            (sum, g) => sum + (g.subject.coefficient || 1),
            0
          );
          const avg = coeff > 0 ? score / coeff : 0;

          return { studentId: s.id, average: avg };
        })
      );

      const sorted = studentAverages
        .sort((a, b) => b.average - a.average)
        .map((s, index) => ({ ...s, rank: index + 1 }));

      const currentStudent = sorted.find((s) => s.studentId === studentId);
      classRank = currentStudent?.rank || null;
    }

    // Calculate grade level
    let gradeLevel = "F";
    if (averageScore >= 45) gradeLevel = "A";
    else if (averageScore >= 40) gradeLevel = "B";
    else if (averageScore >= 35) gradeLevel = "C";
    else if (averageScore >= 30) gradeLevel = "D";
    else if (averageScore >= 25) gradeLevel = "E";

    res.json({
      success: true,
      data: {
        student: {
          id: student?.id,
          studentId: student?.studentId,
          khmerName: student?.khmerName,
          class: student?.class,
        },
        grades,
        allSubjects,
        statistics: {
          totalGrades,
          totalSubjects: allSubjects.length,
          totalScore: parseFloat(totalScore.toFixed(2)),
          averageScore: parseFloat(averageScore.toFixed(2)),
          classRank,
          gradeLevel,
        },
      },
    });
  } catch (error: any) {
    console.error("Error getting child grades:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get grades",
      error: error.message,
    });
  }
};

/**
 * 📅 Get child's attendance
 * GET /api/parent-portal/child/:studentId/attendance
 */
export const getChildAttendance = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { studentId } = req.params;
    const { month, year } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Verify parent has access to this student
    try {
      await verifyParentAccess(userId, studentId);
    } catch (error: any) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    // Build date filter
    const filter: any = { studentId };

    if (month && year) {
      const monthNum = parseInt(month as string);
      const yearNum = parseInt(year as string);
      const startOfMonth = new Date(yearNum, monthNum - 1, 1);
      const endOfMonth = new Date(yearNum, monthNum, 0);
      filter.date = { gte: startOfMonth, lte: endOfMonth };
    }

    // Get attendance records
    const attendance = await prisma.attendance.findMany({
      where: filter,
      include: {
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Get student info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
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
    });

    // Calculate statistics
    const monthNum = month ? parseInt(month as string) : new Date().getMonth() + 1;
    const yearNum = year ? parseInt(year as string) : new Date().getFullYear();
    const totalDaysInMonth = new Date(yearNum, monthNum, 0).getDate();

    const presentCount = attendance.filter((a) => a.status === "PRESENT").length;
    const absentCount = attendance.filter((a) => a.status === "ABSENT").length;
    const permissionCount = attendance.filter(
      (a) => a.status === "PERMISSION"
    ).length;
    const lateCount = attendance.filter((a) => a.status === "LATE").length;
    const excusedCount = attendance.filter((a) => a.status === "EXCUSED").length;

    const daysNotAttended = absentCount + permissionCount;
    const attendanceRate =
      totalDaysInMonth > 0
        ? ((totalDaysInMonth - daysNotAttended) / totalDaysInMonth) * 100
        : 0;

    res.json({
      success: true,
      data: {
        student,
        attendance,
        statistics: {
          totalDays: totalDaysInMonth,
          presentCount,
          absentCount,
          permissionCount,
          lateCount,
          excusedCount,
          attendanceRate: parseFloat(attendanceRate.toFixed(1)),
        },
      },
    });
  } catch (error: any) {
    console.error("Error getting child attendance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get attendance",
      error: error.message,
    });
  }
};

/**
 * 📈 Get child's monthly summaries
 * GET /api/parent-portal/child/:studentId/monthly-summaries
 */
export const getChildMonthlySummaries = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).userId;
    const { studentId } = req.params;
    const { year } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Verify parent has access to this student
    try {
      await verifyParentAccess(userId, studentId);
    } catch (error: any) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    // Get student info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
      },
    });

    if (!student || !student.class) {
      return res.status(404).json({
        success: false,
        message: "Student or class not found",
      });
    }

    // Get academic year
    const currentMonth = new Date().getMonth() + 1;
    const currentCalendarYear = new Date().getFullYear();
    const currentAcademicYear =
      currentMonth >= 10 ? currentCalendarYear : currentCalendarYear - 1;
    const academicYear = year ? parseInt(year as string) : currentAcademicYear;

    // Get all subjects for student's grade
    const whereClause: any = {
      grade: student.class.grade,
      isActive: true,
    };

    const gradeNum = parseInt(student.class.grade);
    if ((gradeNum === 11 || gradeNum === 12) && student.class.track) {
      whereClause.OR = [
        { track: student.class.track },
        { track: null },
        { track: "common" },
      ];
    }

    const allSubjects = await prisma.subject.findMany({
      where: whereClause,
    });

    // Fetch grades for academic year
    const grades = await prisma.grade.findMany({
      where: {
        studentId,
        OR: [
          { year: academicYear, monthNumber: { gte: 10 } },
          { year: academicYear + 1, monthNumber: { lte: 9 } },
        ],
      },
      include: {
        subject: {
          select: { coefficient: true },
        },
      },
    });

    // Khmer month names in order (Oct-Sep)
    const khmerMonths = [
      "តុលា",
      "វិច្ឆិកា",
      "ធ្នូ",
      "មករា",
      "កុម្ភៈ",
      "មីនា",
      "មេសា",
      "ឧសភា",
      "មិថុនា",
      "កក្កដា",
      "សីហា",
      "កញ្ញា",
    ];

    // Group by month and calculate averages
    const summaries = khmerMonths.map((month, index) => {
      const monthGrades = grades.filter((g) => g.month === month);
      const totalScore = monthGrades.reduce((sum, g) => sum + (g.score || 0), 0);
      const coefficient = monthGrades.reduce(
        (sum, g) => sum + (g.subject.coefficient || 1),
        0
      );
      const averageScore = coefficient > 0 ? totalScore / coefficient : null;

      return {
        month,
        monthIndex: index,
        averageScore: averageScore
          ? parseFloat(averageScore.toFixed(2))
          : null,
        hasData: monthGrades.length > 0,
        subjectCount: monthGrades.length,
        totalSubjects: allSubjects.length,
        isComplete: monthGrades.length >= allSubjects.length,
      };
    });

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          studentId: student.studentId,
          khmerName: student.khmerName,
          class: student.class,
        },
        academicYear,
        summaries,
      },
    });
  } catch (error: any) {
    console.error("Error getting child monthly summaries:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get monthly summaries",
      error: error.message,
    });
  }
};

/**
 * 📊 Get child's performance analysis
 * GET /api/parent-portal/child/:studentId/performance
 */
export const getChildPerformance = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { studentId } = req.params;
    const { year, month } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Verify parent has access to this student
    try {
      await verifyParentAccess(userId, studentId);
    } catch (error: any) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    // Get student info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
      },
    });

    if (!student || !student.class) {
      return res.status(404).json({
        success: false,
        message: "Student or class not found",
      });
    }

    // Build filter
    const filter: any = {
      studentId,
    };

    if (year) {
      filter.year = parseInt(year as string);
    }
    if (month) {
      filter.month = month as string;
    }

    // Get student's grades
    const grades = await prisma.grade.findMany({
      where: filter,
      include: {
        subject: true,
      },
    });

    // Get class average for each subject
    const subjectPerformance = await Promise.all(
      grades.map(async (grade) => {
        // Get all grades for this subject in the same class/month/year
        const classGrades = await prisma.grade.findMany({
          where: {
            subjectId: grade.subjectId,
            classId: grade.classId,
            month: grade.month,
            year: grade.year,
          },
        });

        const classAvg =
          classGrades.length > 0
            ? classGrades.reduce((sum, g) => sum + g.score, 0) /
              classGrades.length
            : 0;

        const percentageScore = (grade.score / grade.maxScore) * 100;

        return {
          subject: {
            id: grade.subject.id,
            code: grade.subject.code,
            nameKh: grade.subject.nameKh,
            category: grade.subject.category,
            coefficient: grade.subject.coefficient,
          },
          studentScore: grade.score,
          maxScore: grade.maxScore,
          percentageScore: parseFloat(percentageScore.toFixed(1)),
          classAverage: parseFloat(classAvg.toFixed(2)),
          difference: parseFloat((grade.score - classAvg).toFixed(2)),
          performanceLevel:
            grade.score > classAvg
              ? "Above Average"
              : grade.score === classAvg
              ? "Average"
              : "Below Average",
        };
      })
    );

    // Group by category
    const categoryStats: any = {};
    subjectPerformance.forEach((sp) => {
      const category = sp.subject.category;
      if (!categoryStats[category]) {
        categoryStats[category] = {
          totalScore: 0,
          totalMax: 0,
          subjects: [],
        };
      }
      categoryStats[category].totalScore += sp.studentScore;
      categoryStats[category].totalMax += sp.maxScore;
      categoryStats[category].subjects.push(sp);
    });

    // Calculate category averages
    const categoryPerformance = Object.entries(categoryStats).map(
      ([category, stats]: [string, any]) => ({
        category,
        averagePercentage: parseFloat(
          ((stats.totalScore / stats.totalMax) * 100).toFixed(1)
        ),
        subjectCount: stats.subjects.length,
      })
    );

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          studentId: student.studentId,
          khmerName: student.khmerName,
          class: student.class,
        },
        subjectPerformance,
        categoryPerformance,
      },
    });
  } catch (error: any) {
    console.error("Error getting child performance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get performance data",
      error: error.message,
    });
  }
};

/**
 * 🔒 Change parent's password
 * POST /api/parent-portal/change-password
 */
export const changePassword = async (req: Request, res: Response) => {
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

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { parent: true },
    });

    if (!user || user.role !== "PARENT" || !user.parent) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        isDefaultPassword: false,
        passwordChangedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error: any) {
    console.error("Error changing password:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password",
      error: error.message,
    });
  }
};

/**
 * ✏️ Update parent's profile
 * PUT /api/parent-portal/profile
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { firstName, lastName, khmerName, englishName, email, phone, address, occupation, emergencyPhone } =
      req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { parent: true },
    });

    if (!user || user.role !== "PARENT" || !user.parent) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Build update data
    const parentUpdateData: any = {};
    if (firstName !== undefined) parentUpdateData.firstName = firstName;
    if (lastName !== undefined) parentUpdateData.lastName = lastName;
    if (khmerName !== undefined) parentUpdateData.khmerName = khmerName;
    if (englishName !== undefined) parentUpdateData.englishName = englishName;
    if (email !== undefined) parentUpdateData.email = email;
    if (phone !== undefined) parentUpdateData.phone = phone;
    if (address !== undefined) parentUpdateData.address = address;
    if (occupation !== undefined) parentUpdateData.occupation = occupation;
    if (emergencyPhone !== undefined)
      parentUpdateData.emergencyPhone = emergencyPhone;

    const userUpdateData: any = {};
    if (firstName !== undefined) userUpdateData.firstName = firstName;
    if (lastName !== undefined) userUpdateData.lastName = lastName;
    if (email !== undefined) userUpdateData.email = email;
    if (phone !== undefined) userUpdateData.phone = phone;

    // Update in transaction
    await prisma.$transaction([
      prisma.parent.update({
        where: { id: user.parent.id },
        data: parentUpdateData,
      }),
      prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      }),
    ]);

    res.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};
