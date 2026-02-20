import { Request, Response } from "express";
import { prisma } from "../utils/db";

export class DashboardController {
  /**
   * Get comprehensive dashboard statistics
   */
  static async getDashboardStats(req: Request, res: Response) {
    try {
      const currentYear = new Date().getFullYear();

      // Get counts
      const [
        totalStudents,
        totalTeachers,
        totalClasses,
        totalSubjects,
        studentsWithClass,
        teachersWithClass,
        activeSubjects,
        recentGrades,
        recentAttendance,
      ] = await Promise.all([
        // Total students
        prisma.student.count(),

        // Total teachers
        prisma.teacher.count(),

        // Total classes
        prisma.class.count(),

        // Total subjects
        prisma.subject.count(),

        // Students with class assignment
        prisma.student.count({
          where: {
            classId: { not: null },
          },
        }),

        // Teachers with class assignment
        prisma.teacher.count({
          where: {
            OR: [
              { homeroomClass: { isNot: null } },
              { teacherClasses: { some: {} } },
            ],
          },
        }),

        // Active subjects
        prisma.subject.count({
          where: { isActive: true },
        }),

        // Recent grade entries (last 7 days)
        prisma.grade.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),

        // Recent attendance records (last 7 days)
        prisma.attendance.count({
          where: {
            date: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      // ✅ OPTIMIZED: Get grade distribution using database aggregation instead of loading all records
      const [gradeA, gradeB, gradeC, gradeD, gradeE, gradeF, totalGrades, failedGrades] = await Promise.all([
        prisma.grade.count({ where: { year: currentYear, percentage: { gte: 80 } } }),
        prisma.grade.count({ where: { year: currentYear, percentage: { gte: 70, lt: 80 } } }),
        prisma.grade.count({ where: { year: currentYear, percentage: { gte: 60, lt: 70 } } }),
        prisma.grade.count({ where: { year: currentYear, percentage: { gte: 50, lt: 60 } } }),
        prisma.grade.count({ where: { year: currentYear, percentage: { gte: 40, lt: 50 } } }),
        prisma.grade.count({ where: { year: currentYear, percentage: { lt: 40 } } }),
        prisma.grade.count({ where: { year: currentYear, percentage: { not: null } } }),
        prisma.grade.count({ where: { year: currentYear, percentage: { lt: 50 } } }), // Failed (< 50%)
      ]);

      const gradeDistribution = {
        A: gradeA,
        B: gradeB,
        C: gradeC,
        D: gradeD,
        E: gradeE,
        F: gradeF,
      };

      // ✅ NEW: Calculate pass/fail percentages
      const passedGrades = totalGrades - failedGrades;
      const passPercentage = totalGrades > 0 ? (passedGrades / totalGrades) * 100 : 0;
      const failPercentage = totalGrades > 0 ? (failedGrades / totalGrades) * 100 : 0;

      // ✅ OPTIMIZED: Get attendance statistics using database aggregation
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [presentCount, absentCount, lateCount, excusedCount] = await Promise.all([
        prisma.attendance.count({ where: { date: { gte: thirtyDaysAgo }, status: "PRESENT" } }),
        prisma.attendance.count({ where: { date: { gte: thirtyDaysAgo }, status: "ABSENT" } }),
        prisma.attendance.count({ where: { date: { gte: thirtyDaysAgo }, status: "LATE" } }),
        prisma.attendance.count({ where: { date: { gte: thirtyDaysAgo }, status: "EXCUSED" } }),
      ]);

      const attendanceStats = {
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        excused: excusedCount,
      };

      // Get class distribution by grade and student gender data in parallel
      const [classByGrade, studentsByGradeWithGender, classGrades] = await Promise.all([
        prisma.class.groupBy({
          by: ["grade"],
          _count: {
            id: true,
          },
          orderBy: {
            grade: "asc",
          },
        }),
        prisma.student.groupBy({
          by: ["classId", "gender"],
          _count: {
            id: true,
          },
          where: {
            classId: {
              not: null,
            },
          },
        }),
        prisma.class.findMany({
          select: {
            id: true,
            grade: true,
          },
        }),
      ]);

      const classGradeMap = new Map(classGrades.map((c) => [c.id, c.grade]));

      // Group students by grade and gender
      const studentsByGradeMap = new Map<string, { male: number; female: number; total: number }>();
      
      studentsByGradeWithGender.forEach((item) => {
        const grade = classGradeMap.get(item.classId!);
        if (!grade) return;

        const current = studentsByGradeMap.get(grade) || { male: 0, female: 0, total: 0 };
        
        if (item.gender === "MALE") {
          current.male += item._count.id;
        } else if (item.gender === "FEMALE") {
          current.female += item._count.id;
        }
        current.total += item._count.id;
        
        studentsByGradeMap.set(grade, current);
      });

      const studentsByGrade = Array.from(studentsByGradeMap.entries())
        .map(([grade, counts]) => ({ 
          grade, 
          male: counts.male,
          female: counts.female,
          total: counts.total 
        }))
        .sort((a, b) => parseInt(a.grade) - parseInt(b.grade));

      // ✅ OPTIMIZED: Get top performing classes with a single query using include
      const classSummaries = await prisma.studentMonthlySummary.groupBy({
        by: ["classId"],
        _avg: {
          average: true,
        },
        _count: {
          studentId: true,
        },
        orderBy: {
          _avg: {
            average: "desc",
          },
        },
        take: 5,
      });

      // ✅ OPTIMIZED: Batch fetch all classes in one query instead of N queries
      const classIds = classSummaries.map((s) => s.classId);
      const classesData = await prisma.class.findMany({
        where: { id: { in: classIds } },
        select: {
          id: true,
          name: true,
          grade: true,
          section: true,
        },
      });

      // Create a map for quick lookup
      const classMap = new Map(classesData.map((c) => [c.id, c]));

      // Combine the data
      const topClasses = classSummaries.map((summary) => {
        const classData = classMap.get(summary.classId);
        return {
          ...classData,
          averageScore: summary._avg.average,
          studentCount: summary._count.studentId,
        };
      });

      // Calculate completion rates
      const studentEnrollmentRate =
        totalStudents > 0 ? (studentsWithClass / totalStudents) * 100 : 0;
      const teacherAssignmentRate =
        totalTeachers > 0 ? (teachersWithClass / totalTeachers) * 100 : 0;

      res.json({
        success: true,
        data: {
          overview: {
            totalStudents,
            totalTeachers,
            totalClasses,
            totalSubjects,
            studentsWithClass,
            teachersWithClass,
            activeSubjects,
            studentEnrollmentRate: parseFloat(
              studentEnrollmentRate.toFixed(1)
            ),
            teacherAssignmentRate: parseFloat(teacherAssignmentRate.toFixed(1)),
            passPercentage: parseFloat(passPercentage.toFixed(1)),
            failPercentage: parseFloat(failPercentage.toFixed(1)),
            passedCount: passedGrades,
            failedCount: failedGrades,
            totalGradesCount: totalGrades,
          },
          recentActivity: {
            recentGradeEntries: recentGrades,
            recentAttendanceRecords: recentAttendance,
          },
          gradeDistribution,
          attendanceStats,
          classByGrade: classByGrade.map((c) => ({
            grade: c.grade,
            count: c._count.id,
          })),
          studentsByGrade,
          topPerformingClasses: topClasses.filter((c) => c !== null),
        },
      });
    } catch (error) {
      console.error("❌ Error fetching dashboard stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard statistics",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get teacher-specific dashboard
   */
  static async getTeacherDashboard(req: Request, res: Response) {
    try {
      const { teacherId } = req.params;

      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
        include: {
          homeroomClass: {
            include: {
              students: true,
            },
          },
          teacherClasses: {
            include: {
              class: {
                include: {
                  students: true,
                },
              },
            },
          },
          subjectTeachers: {
            include: {
              subject: true,
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

      // Get all classes taught by this teacher
      const classIds = [
        ...(teacher.homeroomClass ? [teacher.homeroomClass.id] : []),
        ...teacher.teacherClasses.map((tc) => tc.class.id),
      ];

      // Get total students
      const uniqueStudentIds = new Set<string>();
      if (teacher.homeroomClass) {
        teacher.homeroomClass.students.forEach((s) =>
          uniqueStudentIds.add(s.id)
        );
      }
      teacher.teacherClasses.forEach((tc) => {
        tc.class.students.forEach((s) => uniqueStudentIds.add(s.id));
      });

      // Recent grade entries by this teacher's classes
      const recentGrades = await prisma.grade.count({
        where: {
          classId: { in: classIds },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      });

      res.json({
        success: true,
        data: {
          teacher: {
            id: teacher.id,
            name: teacher.khmerName || `${teacher.firstName} ${teacher.lastName}`,
            homeroomClass: teacher.homeroomClass
              ? {
                  id: teacher.homeroomClass.id,
                  name: teacher.homeroomClass.name,
                  studentCount: teacher.homeroomClass.students.length,
                }
              : null,
            totalClasses: classIds.length,
            totalStudents: uniqueStudentIds.size,
            subjects: teacher.subjectTeachers.map((st) => ({
              id: st.subject.id,
              name: st.subject.nameKh || st.subject.name,
              code: st.subject.code,
            })),
          },
          recentActivity: {
            recentGradeEntries: recentGrades,
          },
        },
      });
    } catch (error) {
      console.error("❌ Error fetching teacher dashboard:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch teacher dashboard",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get lightweight mobile dashboard stats (faster loading)
   * Returns summary without detailed subject stats
   */
  static async getMobileDashboardStats(req: Request, res: Response) {
    try {
      const { month, year } = req.query;

      // Get Khmer month name
      const monthNames = [
        "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
        "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"
      ];

      const currentMonth = month ? String(month) : monthNames[new Date().getMonth()];
      const currentYear = year ? parseInt(String(year)) : new Date().getFullYear();
      const monthNumber = monthNames.indexOf(currentMonth) + 1;

      // Get total teachers and subjects for overview
      const [totalTeachers, totalSubjects] = await Promise.all([
        prisma.teacher.count(),
        prisma.subject.count({ where: { isActive: true } }),
      ]);

      // ✅ SUPER OPTIMIZED: Removed pass/fail queries for faster loading
      const grades = ["7", "8", "9", "10", "11", "12"];

      const gradeStats = await Promise.all(
        grades.map(async (grade) => {
          // Get class count and student count only (no expensive aggregations)
          const [classes, students] = await Promise.all([
            prisma.class.count({ where: { grade } }),
            prisma.student.count({ where: { class: { grade } } })
          ]);

          return {
            grade,
            totalStudents: students,
            totalClasses: classes,
          };
        })
      );

      res.json({
        success: true,
        data: {
          month: currentMonth,
          year: currentYear,
          totalTeachers,
          totalSubjects,
          grades: gradeStats.filter(g => g.totalClasses > 0),
        },
      });
    } catch (error) {
      console.error("❌ Error fetching mobile dashboard stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch mobile dashboard statistics",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get grade-level statistics (for grades 7-12) - Using real grade data
   */
  static async getGradeLevelStats(req: Request, res: Response) {
    try {
      const currentYear = new Date().getFullYear();

      // Get Khmer month name (grades are stored in Khmer)
      const monthNames = [
        "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
        "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"
      ];
      const currentMonth = monthNames[new Date().getMonth()];

      // Get all grades 7-12
      const grades = ["7", "8", "9", "10", "11", "12"];

      const gradeStats = await Promise.all(
        grades.map(async (grade) => {
          // Get all classes for this grade
          const classes = await prisma.class.findMany({
            where: { grade },
            include: {
              students: {
                select: {
                  id: true,
                  khmerName: true,
                  firstName: true,
                  lastName: true,
                }
              },
              homeroomTeacher: {
                select: {
                  id: true,
                  khmerName: true,
                  firstName: true,
                  lastName: true,
                }
              }
            },
          });

          const classIds = classes.map(c => c.id);
          const totalStudents = classes.reduce((sum, c) => sum + c.students.length, 0);

          // Get all subjects for this grade
          // ✅ For grades 11 & 12, we need to calculate per-track subject count
          // Instead of getting all subjects, we'll calculate based on each class's track
          const subjects = await prisma.subject.findMany({
            where: {
              grade,
            },
            orderBy: { code: "asc" }
          });

          // For display purposes, show total unique subjects
          // But for calculations, we'll use track-specific counts per class
          const totalSubjects = subjects.length;

          // Get all student monthly summaries for current month
          const studentSummaries = await prisma.studentMonthlySummary.findMany({
            where: {
              classId: { in: classIds },
              month: currentMonth,
              year: currentYear,
            },
            select: {
              studentId: true,
              classId: true,
              average: true,
            },
          });

          // Get all grades for calculating subject completion
          const allGrades = await prisma.grade.findMany({
            where: {
              classId: { in: classIds },
              month: currentMonth,
              year: currentYear,
            },
            select: {
              classId: true,
              subjectId: true,
              studentId: true,
              percentage: true,
            },
          });

          // Calculate statistics
          const totalSummaries = studentSummaries.length;

          // Grade distribution (based on average scores)
          const gradeDistribution = {
            A: studentSummaries.filter(s => (s.average || 0) >= 45).length,
            B: studentSummaries.filter(s => (s.average || 0) >= 40 && (s.average || 0) < 45).length,
            C: studentSummaries.filter(s => (s.average || 0) >= 35 && (s.average || 0) < 40).length,
            D: studentSummaries.filter(s => (s.average || 0) >= 30 && (s.average || 0) < 35).length,
            E: studentSummaries.filter(s => (s.average || 0) >= 25 && (s.average || 0) < 30).length,
            F: studentSummaries.filter(s => (s.average || 0) < 25).length,
          };

          // Calculate average across all students
          const averageScore = totalSummaries > 0
            ? studentSummaries.reduce((sum, s) => sum + (s.average || 0), 0) / totalSummaries
            : 0;

          // Pass/Fail counts (passing is >= 25)
          // ✅ Calculate based on students who have grades (same as comprehensive stats)
          const passCount = studentSummaries.filter(s => (s.average || 0) >= 25).length;
          const failCount = studentSummaries.filter(s => (s.average || 0) < 25).length;
          const passPercentage = totalSummaries > 0 ? (passCount / totalSummaries) * 100 : 0;

          // Subject completion by class
          const classDetails = classes.map((cls) => {
            const classGrades = allGrades.filter(g => g.classId === cls.id);
            const uniqueSubjects = new Set(classGrades.map(g => g.subjectId));
            const completedSubjects = uniqueSubjects.size;

            // ✅ Calculate track-specific total subjects for grades 11 & 12
            let classSpecificTotalSubjects = totalSubjects;
            const gradeNum = parseInt(grade);

            if ((gradeNum === 11 || gradeNum === 12) && cls.track) {
              // Filter subjects for this class's track
              const trackSubjects = subjects.filter(subj => {
                return subj.track === cls.track || subj.track === null || subj.track === "common";
              });
              classSpecificTotalSubjects = trackSubjects.length;
            }

            const completionPercentage = classSpecificTotalSubjects > 0
              ? (completedSubjects / classSpecificTotalSubjects) * 100
              : 0;

            // Get class average from summaries
            const classSummaries = studentSummaries.filter(s => s.classId === cls.id);
            const classAverage = classSummaries.length > 0
              ? classSummaries.reduce((sum, s) => sum + (s.average || 0), 0) / classSummaries.length
              : 0;

            return {
              id: cls.id,
              name: cls.name,
              section: cls.section || "",
              studentCount: cls.students.length,
              totalSubjects: classSpecificTotalSubjects, // ✅ Use track-specific count
              completedSubjects,
              completionPercentage: Math.round(completionPercentage),
              averageScore: Math.round(classAverage * 10) / 10,
              teacherName: cls.homeroomTeacher?.khmerName ||
                          `${cls.homeroomTeacher?.firstName || ""} ${cls.homeroomTeacher?.lastName || ""}`.trim() ||
                          "គ្មានគ្រូថ្នាក់",
            };
          });

          // Calculate overall subject completion for this grade
          const totalPossibleEntries = totalStudents * totalSubjects;
          const completedEntries = allGrades.length;
          const overallCompletion = totalPossibleEntries > 0
            ? (completedEntries / totalPossibleEntries) * 100
            : 0;

          return {
            grade,
            totalStudents,
            totalClasses: classes.length,
            totalSubjects,
            averageScore: Math.round(averageScore * 10) / 10,
            passPercentage: Math.round(passPercentage * 10) / 10,
            passCount,
            failCount,
            gradeDistribution: {
              A: totalSummaries > 0 ? Math.round((gradeDistribution.A / totalSummaries) * 1000) / 10 : 0,
              B: totalSummaries > 0 ? Math.round((gradeDistribution.B / totalSummaries) * 1000) / 10 : 0,
              C: totalSummaries > 0 ? Math.round((gradeDistribution.C / totalSummaries) * 1000) / 10 : 0,
              D: totalSummaries > 0 ? Math.round((gradeDistribution.D / totalSummaries) * 1000) / 10 : 0,
              E: totalSummaries > 0 ? Math.round((gradeDistribution.E / totalSummaries) * 1000) / 10 : 0,
            },
            subjectCompletionPercentage: Math.round(overallCompletion * 10) / 10,
            classes: classDetails.sort((a, b) => a.name.localeCompare(b.name)),
          };
        })
      );

      res.json({
        success: true,
        data: {
          currentMonth,
          currentYear,
          grades: gradeStats,
        },
      });
    } catch (error) {
      console.error("❌ Error fetching grade level stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch grade level statistics",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get student-specific dashboard
   */
  static async getStudentDashboard(req: Request, res: Response) {
    try {
      const { studentId } = req.params;

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          class: true,
          grades: {
            orderBy: {
              createdAt: "desc",
            },
            take: 10,
            include: {
              subject: true,
            },
          },
          attendance: {
            where: {
              date: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
        },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      // Calculate average grade
      const gradesWithScore = student.grades.filter(
        (g) => g.percentage !== null
      );
      const averageGrade =
        gradesWithScore.length > 0
          ? gradesWithScore.reduce((sum, g) => sum + (g.percentage || 0), 0) /
            gradesWithScore.length
          : 0;

      // Attendance stats
      const attendanceStats = {
        present: student.attendance.filter((a) => a.status === "PRESENT")
          .length,
        absent: student.attendance.filter((a) => a.status === "ABSENT").length,
        late: student.attendance.filter((a) => a.status === "LATE").length,
        excused: student.attendance.filter((a) => a.status === "EXCUSED")
          .length,
      };

      res.json({
        success: true,
        data: {
          student: {
            id: student.id,
            name: student.khmerName || `${student.firstName} ${student.lastName}`,
            class: student.class
              ? {
                  id: student.class.id,
                  name: student.class.name,
                  grade: student.class.grade,
                }
              : null,
            averageGrade: parseFloat(averageGrade.toFixed(2)),
          },
          recentGrades: student.grades.map((g) => ({
            subject: g.subject.nameKh || g.subject.name,
            score: g.score,
            maxScore: g.maxScore,
            percentage: g.percentage,
            month: g.month,
          })),
          attendanceStats,
          totalAttendanceRecords: student.attendance.length,
        },
      });
    } catch (error) {
      console.error("❌ Error fetching student dashboard:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch student dashboard",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get score import progress dashboard
   * Shows which subjects have scores imported and verified for each class
   */
  static async getScoreProgress(req: Request, res: Response) {
    try {
      const { month, year, grade, classId } = req.query;

      // Get Khmer month names
      const monthNames = [
        "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
        "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"
      ];

      const currentMonth = month ? String(month) : monthNames[new Date().getMonth()];
      const currentYear = year ? parseInt(String(year)) : new Date().getFullYear();

      // Build filter for classes
      const classFilter: any = {};
      if (grade) {
        classFilter.grade = String(grade);
      }
      if (classId) {
        classFilter.id = String(classId);
      }

      // 1. Fetch all classes with students and homeroom teachers
      const classes = await prisma.class.findMany({
        where: classFilter,
        include: {
          students: {
            select: {
              id: true,
              khmerName: true,
              firstName: true,
              lastName: true,
            },
          },
          homeroomTeacher: {
            select: {
              id: true,
              khmerName: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: [
          { grade: "asc" },
          { name: "asc" },
        ],
      });

      // 2. Get all subjects for the relevant grades
      const relevantGrades = [...new Set(classes.map(c => c.grade))];
      const subjects = await prisma.subject.findMany({
        where: {
          grade: { in: relevantGrades },
          isActive: true,
        },
        orderBy: { code: "asc" },
      });

      // 3. Get all grades for the specified month/year
      const classIds = classes.map(c => c.id);
      const grades = await prisma.grade.findMany({
        where: {
          classId: { in: classIds },
          month: currentMonth,
          year: currentYear,
        },
        select: {
          id: true,
          studentId: true,
          subjectId: true,
          classId: true,
          score: true,
          updatedAt: true,
        },
      });

      // 4. Get all grade confirmations for the specified month/year
      const confirmations = await prisma.gradeConfirmation.findMany({
        where: {
          classId: { in: classIds },
          month: currentMonth,
          year: currentYear,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // 5. Create lookup maps for efficient access
      const gradesByClassSubject = new Map<string, typeof grades>();
      grades.forEach(g => {
        const key = `${g.classId}:${g.subjectId}`;
        if (!gradesByClassSubject.has(key)) {
          gradesByClassSubject.set(key, []);
        }
        gradesByClassSubject.get(key)!.push(g);
      });

      const confirmationMap = new Map<string, typeof confirmations[0]>();
      confirmations.forEach(c => {
        const key = `${c.classId}:${c.subjectId}`;
        confirmationMap.set(key, c);
      });

      const subjectsByGrade = new Map<string, typeof subjects>();
      subjects.forEach(s => {
        if (!subjectsByGrade.has(s.grade)) {
          subjectsByGrade.set(s.grade, []);
        }
        subjectsByGrade.get(s.grade)!.push(s);
      });

      // Helper function to calculate score status
      const calculateScoreStatus = (totalStudents: number, studentsWithScores: number): string => {
        if (totalStudents === 0) return "EMPTY";
        const percentage = (studentsWithScores / totalStudents) * 100;
        if (percentage === 100) return "COMPLETE";
        if (percentage >= 50) return "PARTIAL";
        if (percentage > 0) return "STARTED";
        return "EMPTY";
      };

      // 6. Build response data structure
      const gradeData = new Map<string, any>();

      for (const cls of classes) {
        if (!gradeData.has(cls.grade)) {
          gradeData.set(cls.grade, {
            grade: cls.grade,
            totalClasses: 0,
            avgCompletion: 0,
            classes: [],
          });
        }

        const gradeInfo = gradeData.get(cls.grade)!;
        gradeInfo.totalClasses++;

        // Get subjects for this class (considering track for grades 11-12)
        const gradeSubjects = subjectsByGrade.get(cls.grade) || [];
        const gradeNum = parseInt(cls.grade);
        let classSubjects = gradeSubjects;

        if ((gradeNum === 11 || gradeNum === 12) && cls.track) {
          classSubjects = gradeSubjects.filter(s =>
            s.track === cls.track || s.track === null || s.track === "common"
          );
        }

        const totalStudents = cls.students.length;

        // Calculate subject-level stats
        const subjectStats = classSubjects.map(subject => {
          const key = `${cls.id}:${subject.id}`;
          const subjectGrades = gradesByClassSubject.get(key) || [];
          const studentsWithScores = new Set(subjectGrades.map(g => g.studentId)).size;
          const percentage = totalStudents > 0 ? (studentsWithScores / totalStudents) * 100 : 0;
          const status = calculateScoreStatus(totalStudents, studentsWithScores);

          // Get confirmation status
          const confirmation = confirmationMap.get(key);

          // Find who last updated this subject
          const latestGrade = subjectGrades.length > 0
            ? subjectGrades.reduce((latest, current) =>
                current.updatedAt > latest.updatedAt ? current : latest
              )
            : null;

          return {
            id: subject.id,
            code: subject.code,
            nameKh: subject.nameKh,
            nameEn: subject.nameEn || subject.name,
            maxScore: subject.maxScore,
            coefficient: subject.coefficient,
            scoreStatus: {
              totalStudents,
              studentsWithScores,
              percentage: Math.round(percentage * 10) / 10,
              status,
            },
            verification: {
              isConfirmed: confirmation?.isConfirmed || false,
              confirmedBy: confirmation ? {
                id: confirmation.user.id,
                firstName: confirmation.user.firstName,
                lastName: confirmation.user.lastName,
              } : undefined,
              confirmedAt: confirmation?.confirmedAt.toISOString(),
            },
            lastUpdated: latestGrade?.updatedAt.toISOString(),
          };
        });

        // Calculate class completion stats
        const completedSubjects = subjectStats.filter(s => s.scoreStatus.status === "COMPLETE").length;
        const verifiedSubjects = subjectStats.filter(s => s.verification.isConfirmed).length;
        const completionPercentage = classSubjects.length > 0
          ? (completedSubjects / classSubjects.length) * 100
          : 0;
        const verificationPercentage = classSubjects.length > 0
          ? (verifiedSubjects / classSubjects.length) * 100
          : 0;

        gradeInfo.classes.push({
          id: cls.id,
          name: cls.name,
          grade: cls.grade,
          section: cls.section || "",
          track: cls.track || null,
          studentCount: totalStudents,
          homeroomTeacher: cls.homeroomTeacher ? {
            id: cls.homeroomTeacher.id,
            firstName: cls.homeroomTeacher.firstName,
            lastName: cls.homeroomTeacher.lastName,
            khmerName: cls.homeroomTeacher.khmerName || `${cls.homeroomTeacher.firstName} ${cls.homeroomTeacher.lastName}`,
            email: cls.homeroomTeacher.email,
          } : null,
          subjects: subjectStats,
          completionStats: {
            totalSubjects: classSubjects.length,
            completedSubjects,
            completionPercentage: Math.round(completionPercentage * 10) / 10,
            verifiedSubjects,
            verificationPercentage: Math.round(verificationPercentage * 10) / 10,
          },
        });
      }

      // Calculate average completion for each grade
      gradeData.forEach((gradeInfo) => {
        const totalCompletion = gradeInfo.classes.reduce(
          (sum: number, c: any) => sum + c.completionStats.completionPercentage,
          0
        );
        gradeInfo.avgCompletion = gradeInfo.classes.length > 0
          ? Math.round((totalCompletion / gradeInfo.classes.length) * 10) / 10
          : 0;
      });

      // Calculate overall statistics
      const allClasses = Array.from(gradeData.values()).flatMap((g: any) => g.classes);
      const totalClasses = allClasses.length;
      const totalSubjects = allClasses.reduce((sum: number, c: any) => sum + c.completionStats.totalSubjects, 0);
      const completedSubjects = allClasses.reduce((sum: number, c: any) => sum + c.completionStats.completedSubjects, 0);
      const verifiedSubjects = allClasses.reduce((sum: number, c: any) => sum + c.completionStats.verifiedSubjects, 0);
      const completionPercentage = totalSubjects > 0 ? (completedSubjects / totalSubjects) * 100 : 0;
      const verificationPercentage = totalSubjects > 0 ? (verifiedSubjects / totalSubjects) * 100 : 0;

      res.json({
        success: true,
        data: {
          month: currentMonth,
          year: currentYear,
          overall: {
            totalClasses,
            totalSubjects,
            completedSubjects,
            completionPercentage: Math.round(completionPercentage * 10) / 10,
            verifiedSubjects,
            verificationPercentage: Math.round(verificationPercentage * 10) / 10,
          },
          grades: Array.from(gradeData.values()).sort((a, b) => parseInt(a.grade) - parseInt(b.grade)),
        },
      });
    } catch (error) {
      console.error("❌ Error fetching score progress:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch score progress",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get comprehensive statistics with month/year filter and gender breakdown
   * For mobile statistics dashboard
   * ✅ OPTIMIZED: Reduced from 1000+ queries to ~10-15 queries
   */
  static async getComprehensiveStats(req: Request, res: Response) {
    try {
      const { month, year } = req.query;

      // Get Khmer month name
      const monthNames = [
        "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
        "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"
      ];

      const currentMonth = month ? String(month) : monthNames[new Date().getMonth()];
      const currentYear = year ? parseInt(String(year)) : new Date().getFullYear();
      const monthNumber = monthNames.indexOf(currentMonth) + 1;

      // ✅ OPTIMIZATION 1: Fetch all data upfront in bulk queries
      const [allClasses, allSubjects, allGrades] = await Promise.all([
        // Fetch all classes with students
        prisma.class.findMany({
          where: {
            grade: { in: ["7", "8", "9", "10", "11", "12"] }
          },
          include: {
            students: {
              select: {
                id: true,
                khmerName: true,
                firstName: true,
                lastName: true,
                gender: true,
              }
            },
            homeroomTeacher: {
              select: {
                id: true,
                khmerName: true,
                firstName: true,
                lastName: true,
              }
            }
          },
        }),
        // Fetch all subjects with full details for subject stats
        prisma.subject.findMany({
          where: {
            grade: { in: ["7", "8", "9", "10", "11", "12"] },
            isActive: true,
          },
          select: {
            id: true,
            code: true,
            name: true,
            nameKh: true,
            grade: true,
            track: true,
            coefficient: true,
            maxScore: true,
          },
          orderBy: { code: "asc" },
        }),
        // Fetch all grades for the specified month/year with student gender
        prisma.grade.findMany({
          where: {
            class: {
              grade: { in: ["7", "8", "9", "10", "11", "12"] }
            },
            OR: [
              { month: currentMonth },
              { month: monthNumber.toString() },
              { monthNumber: monthNumber },
            ],
            year: currentYear,
          },
          select: {
            studentId: true,
            subjectId: true,
            score: true,
            classId: true,
            class: {
              select: {
                grade: true,
              }
            },
            student: {
              select: {
                gender: true,
              }
            }
          },
        }),
      ]);

      // ✅ OPTIMIZATION 2: Create lookup maps for O(1) access
      const subjectsByGrade = new Map<string, typeof allSubjects>();
      allSubjects.forEach(subject => {
        if (!subjectsByGrade.has(subject.grade)) {
          subjectsByGrade.set(subject.grade, []);
        }
        subjectsByGrade.get(subject.grade)!.push(subject);
      });

      const gradesByClass = new Map<string, typeof allGrades>();
      allGrades.forEach(grade => {
        if (!gradesByClass.has(grade.classId)) {
          gradesByClass.set(grade.classId, []);
        }
        gradesByClass.get(grade.classId)!.push(grade);
      });

      const classesByGrade = new Map<string, typeof allClasses>();
      allClasses.forEach(cls => {
        if (!classesByGrade.has(cls.grade)) {
          classesByGrade.set(cls.grade, []);
        }
        classesByGrade.get(cls.grade)!.push(cls);
      });

      // ✅ NEW: Create lookup map for grades by class + subject for subject-level stats
      const gradesByClassAndSubject = new Map<string, typeof allGrades>();
      allGrades.forEach(grade => {
        const key = `${grade.classId}:${grade.subjectId}`;
        if (!gradesByClassAndSubject.has(key)) {
          gradesByClassAndSubject.set(key, []);
        }
        gradesByClassAndSubject.get(key)!.push(grade);
      });

      // ✅ Create subject lookup by ID for quick access
      const subjectsById = new Map(allSubjects.map(s => [s.id, s]));

      // Get all grades 7-12
      const grades = ["7", "8", "9", "10", "11", "12"];

      // ✅ OPTIMIZATION 3: Process data using in-memory maps (no additional DB queries)
      const gradeStats = grades.map((grade) => {
        const classes = classesByGrade.get(grade) || [];

        // Get all students with their gender
        const allStudents = classes.flatMap(c => c.students);
        const totalStudents = allStudents.length;
        const maleStudents = allStudents.filter(s => s.gender === "MALE").length;
        const femaleStudents = allStudents.filter(s => s.gender === "FEMALE").length;

        // ✅ Calculate averages for each student (same as Results screen)
        interface StudentData {
          studentId: string;
          classId: string;
          totalScore: number;
          totalCoefficient: number;
          average: number;
          gender: string;
        }

        const studentDataMap = new Map<string, StudentData>();

        // Process each class to calculate student averages
        for (const cls of classes) {
          // ✅ Get subjects for this class (from pre-loaded map)
          const gradeSubjects = subjectsByGrade.get(cls.grade) || [];
          const gradeNum = parseInt(cls.grade);

          let classSubjects = gradeSubjects;
          if ((gradeNum === 11 || gradeNum === 12) && (cls as any).track) {
            classSubjects = gradeSubjects.filter(s =>
              s.track === (cls as any).track || s.track === null || s.track === "common"
            );
          }

          // ✅ Calculate total coefficient for this class
          const totalCoefficient = classSubjects.reduce((sum, s) => sum + s.coefficient, 0);

          // ✅ Get grades for this class (from pre-loaded map)
          const classGrades = gradesByClass.get(cls.id) || [];

          // ✅ For each student in this class
          for (const student of cls.students) {
            const studentGrades = classGrades.filter(g => g.studentId === student.id);

            // ✅ Calculate total score
            const totalScore = studentGrades.reduce((sum, g) => sum + (g.score || 0), 0);

            // ✅ Calculate coefficient only for subjects with grades entered
            const studentCoefficient = studentGrades.reduce((sum, g) => {
              const subject = classSubjects.find(s => s.id === g.subjectId);
              return sum + (subject?.coefficient || 0);
            }, 0);

            // ✅ Calculate average = totalScore / studentCoefficient (only entered subjects)
            const average = studentCoefficient > 0 ? totalScore / studentCoefficient : 0;

            studentDataMap.set(student.id, {
              studentId: student.id,
              classId: cls.id,
              totalScore,
              totalCoefficient: studentCoefficient,
              average,
              gender: student.gender || "MALE",
            });
          }
        }

        const studentData = Array.from(studentDataMap.values());

          // ✅ Pass/Fail with gender breakdown (passing is >= 25)
          const passedStudents = studentData.filter(s => s.average >= 25);
          const failedStudents = studentData.filter(s => s.average < 25);

          const passedMale = passedStudents.filter(s => s.gender === "MALE").length;
          const passedFemale = passedStudents.filter(s => s.gender === "FEMALE").length;
          const failedMale = failedStudents.filter(s => s.gender === "MALE").length;
          const failedFemale = failedStudents.filter(s => s.gender === "FEMALE").length;

          // ✅ Grade distribution with gender breakdown
          const getGenderBreakdown = (students: StudentData[], gradeFilter: (avg: number) => boolean) => {
            const filtered = students.filter(s => gradeFilter(s.average));
            return {
              total: filtered.length,
              male: filtered.filter(s => s.gender === "MALE").length,
              female: filtered.filter(s => s.gender === "FEMALE").length,
            };
          };

          const gradeDistribution = {
            A: getGenderBreakdown(studentData, avg => avg >= 45),
            B: getGenderBreakdown(studentData, avg => avg >= 40 && avg < 45),
            C: getGenderBreakdown(studentData, avg => avg >= 35 && avg < 40),
            D: getGenderBreakdown(studentData, avg => avg >= 30 && avg < 35),
            E: getGenderBreakdown(studentData, avg => avg >= 25 && avg < 30),
            F: getGenderBreakdown(studentData, avg => avg < 25),
          };

          // ✅ Calculate average scores
          const averageScore = studentData.length > 0
            ? studentData.reduce((sum, s) => sum + s.average, 0) / studentData.length
            : 0;

          const maleData = studentData.filter(s => s.gender === "MALE");
          const femaleData = studentData.filter(s => s.gender === "FEMALE");

          const maleAverage = maleData.length > 0
            ? maleData.reduce((sum, s) => sum + s.average, 0) / maleData.length
            : 0;

          const femaleAverage = femaleData.length > 0
            ? femaleData.reduce((sum, s) => sum + s.average, 0) / femaleData.length
            : 0;

        // ✅ Calculate pass percentage
        const passPercentage = studentData.length > 0 ? (passedStudents.length / studentData.length) * 100 : 0;
        const malePassPercentage = maleData.length > 0 ? (passedMale / maleData.length) * 100 : 0;
        const femalePassPercentage = femaleData.length > 0 ? (passedFemale / femaleData.length) * 100 : 0;

        // ✅ Class-level statistics (no more DB queries - all in memory)
        const classDetails = classes.map((cls) => {
          const classStudentData = studentData.filter(s => s.classId === cls.id);
          const classStudents = cls.students;

          const classPassed = classStudentData.filter(s => s.average >= 25);
          const classPassPercentage = classStudentData.length > 0
            ? (classPassed.length / classStudentData.length) * 100
            : 0;

          const classAverage = classStudentData.length > 0
            ? classStudentData.reduce((sum, s) => sum + s.average, 0) / classStudentData.length
            : 0;

          const classMale = classStudents.filter(s => s.gender === "MALE").length;
          const classFemale = classStudents.filter(s => s.gender === "FEMALE").length;

          const classPassedMale = classStudentData.filter(s =>
            s.average >= 25 && s.gender === "MALE"
          ).length;
          const classPassedFemale = classStudentData.filter(s =>
            s.average >= 25 && s.gender === "FEMALE"
          ).length;

          const classMaleData = classStudentData.filter(s => s.gender === "MALE");
          const classFemaleData = classStudentData.filter(s => s.gender === "FEMALE");

          const classMalePassPercentage = classMaleData.length > 0
            ? (classPassedMale / classMaleData.length) * 100
            : 0;
          const classFemalePassPercentage = classFemaleData.length > 0
            ? (classPassedFemale / classFemaleData.length) * 100
            : 0;

          // ✅ Calculate class-level grade distribution with gender breakdown
          const getClassGenderBreakdown = (students: StudentData[], gradeFilter: (avg: number) => boolean) => {
            const filtered = students.filter(s => gradeFilter(s.average));
            return {
              total: filtered.length,
              male: filtered.filter(s => s.gender === "MALE").length,
              female: filtered.filter(s => s.gender === "FEMALE").length,
            };
          };

          const classGradeDistribution = {
            A: getClassGenderBreakdown(classStudentData, avg => avg >= 45),
            B: getClassGenderBreakdown(classStudentData, avg => avg >= 40 && avg < 45),
            C: getClassGenderBreakdown(classStudentData, avg => avg >= 35 && avg < 40),
            D: getClassGenderBreakdown(classStudentData, avg => avg >= 30 && avg < 35),
            E: getClassGenderBreakdown(classStudentData, avg => avg >= 25 && avg < 30),
            F: getClassGenderBreakdown(classStudentData, avg => avg < 25),
          };

          // ✅ OPTIMIZATION 4: Calculate subject-level stats using in-memory data
          const gradeSubjects = subjectsByGrade.get(cls.grade) || [];
          const gradeNum = parseInt(cls.grade);

          // Filter subjects for this class (considering track for grades 11-12)
          let classSubjects = gradeSubjects;
          if ((gradeNum === 11 || gradeNum === 12) && (cls as any).track) {
            classSubjects = gradeSubjects.filter(s =>
              s.track === (cls as any).track || s.track === null || s.track === "common"
            );
          }

          // Calculate grade distribution for each subject (all in-memory, no DB queries!)
          const subjectStats = classSubjects.map(subject => {
            // Get all grades for this subject in this class from our lookup map
            const key = `${cls.id}:${subject.id}`;
            const subjectGrades = gradesByClassAndSubject.get(key) || [];

            // Convert scores to percentages and calculate grade distribution
            const scorePercentages = subjectGrades
              .filter(g => g.score !== null)
              .map(g => ({
                percentage: ((g.score || 0) / subject.maxScore) * 50, // Convert to 50-point scale
                gender: g.student.gender || "MALE"
              }));

            // Helper function to get gender breakdown for a score range
            const getSubjectGenderBreakdown = (filter: (pct: number) => boolean) => {
              const filtered = scorePercentages.filter(sp => filter(sp.percentage));
              return {
                total: filtered.length,
                male: filtered.filter(sp => sp.gender === "MALE").length,
                female: filtered.filter(sp => sp.gender === "FEMALE").length,
              };
            };

            const subjectGradeDistribution = {
              A: getSubjectGenderBreakdown(pct => pct >= 45),
              B: getSubjectGenderBreakdown(pct => pct >= 40 && pct < 45),
              C: getSubjectGenderBreakdown(pct => pct >= 35 && pct < 40),
              D: getSubjectGenderBreakdown(pct => pct >= 30 && pct < 35),
              E: getSubjectGenderBreakdown(pct => pct >= 25 && pct < 30),
              F: getSubjectGenderBreakdown(pct => pct < 25),
            };

            return {
              subjectId: subject.id,
              subjectCode: subject.code,
              subjectName: subject.nameKh || subject.name,
              maxScore: subject.maxScore,
              coefficient: subject.coefficient,
              totalStudentsWithGrades: subjectGrades.length,
              gradeDistribution: subjectGradeDistribution,
            };
          });

          return {
            id: cls.id,
            name: cls.name,
            section: cls.section || "",
            grade: cls.grade,
            track: (cls as any).track || null,
            studentCount: classStudents.length,
            maleCount: classMale,
            femaleCount: classFemale,
            averageScore: Math.round(classAverage * 10) / 10,
            passPercentage: Math.round(classPassPercentage * 10) / 10,
            malePassPercentage: Math.round(classMalePassPercentage * 10) / 10,
            femalePassPercentage: Math.round(classFemalePassPercentage * 10) / 10,
            passedCount: classPassed.length,
            failedCount: classStudentData.length - classPassed.length,
            gradeDistribution: classGradeDistribution,
            subjectStats: subjectStats, // ✅ Restored with optimized in-memory calculation!
            teacherName: cls.homeroomTeacher?.khmerName ||
                        `${cls.homeroomTeacher?.firstName || ""} ${cls.homeroomTeacher?.lastName || ""}`.trim() ||
                        "គ្មានគ្រូថ្នាក់",
          };
        });

        return {
          grade,
          totalStudents,
          maleStudents,
          femaleStudents,
          totalClasses: classes.length,
          averageScore: Math.round(averageScore * 10) / 10,
          maleAverageScore: Math.round(maleAverage * 10) / 10,
          femaleAverageScore: Math.round(femaleAverage * 10) / 10,
          passPercentage: Math.round(passPercentage * 10) / 10,
          malePassPercentage: Math.round(malePassPercentage * 10) / 10,
          femalePassPercentage: Math.round(femalePassPercentage * 10) / 10,
          passedCount: passedStudents.length,
          passedMale,
          passedFemale,
          failedCount: failedStudents.length,
          failedMale,
          failedFemale,
          gradeDistribution,
          classes: classDetails.sort((a, b) => b.passPercentage - a.passPercentage),
        };
      });

      // Get top performing classes across all grades
      const gradeLevelClasses = gradeStats.flatMap(g => g.classes);
      const topClasses = gradeLevelClasses
        .filter(c => c.passPercentage > 0)
        .sort((a, b) => b.passPercentage - a.passPercentage)
        .slice(0, 10);

      res.json({
        success: true,
        data: {
          month: currentMonth,
          year: currentYear,
          grades: gradeStats,
          topPerformingClasses: topClasses,
        },
      });
    } catch (error) {
      console.error("❌ Error fetching comprehensive stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch comprehensive statistics",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
