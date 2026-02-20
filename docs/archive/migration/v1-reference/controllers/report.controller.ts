import { Request, Response } from "express";
import { prisma } from "../utils/db";

function getSubjectGradeLevel(
  score: number | null,
  maxScore: number
): {
  level: string;
  levelKhmer: string;
  percentage: number;
} {
  if (score === null || score === undefined) {
    return {
      level: "-",
      levelKhmer: "-",
      percentage: 0,
    };
  }

  const percentage = (score / maxScore) * 100;

  let level = "F";
  let levelKhmer = "ខ្សោយ";

  if (percentage >= 80) {
    level = "A";
    levelKhmer = "ល្អប្រសើរ";
  } else if (percentage >= 70) {
    level = "B";
    levelKhmer = "ល្អណាស់";
  } else if (percentage >= 60) {
    level = "C";
    levelKhmer = "ល្អ";
  } else if (percentage >= 50) {
    level = "D";
    levelKhmer = "ល្អបង្គួរ";
  } else if (percentage >= 40) {
    level = "E";
    levelKhmer = "មធ្យម";
  }

  return {
    level,
    levelKhmer,
    percentage: parseFloat(percentage.toFixed(2)),
  };
}

export class ReportController {
  /**
   * Get monthly report for a class
   */

  static async getMonthlyReport(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const { month, year } = req.query;

      console.log(
        `📊 Report request: classId=${classId}, month=${month}, year=${year}`
      );

      const classData = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          students: true, // ✅ Remove orderBy here, sort later
          homeroomTeacher: true, // ✅ CHANGED from "teacher"
          teacherClasses: {
            // ✅ ADDED: Multiple teachers
            include: {
              teacher: true,
            },
          },
        },
      });

      if (!classData) {
        return res.status(404).json({
          success: false,
          message: "Class not found",
        });
      }

      // ✅ Sort students Excel-style
      const sortedStudents = [...classData.students].sort((a, b) => {
        const nameA = a.khmerName || `${a.lastName} ${a.firstName}`;
        const nameB = b.khmerName || `${b.lastName} ${b.firstName}`;
        return nameA.localeCompare(nameB, "en-US");
      });

      // ✅ FIXED: Filter subjects by grade AND track
      const whereClause: any = {
        grade: classData.grade,
        isActive: true,
      };

      // ✅ For Grade 11 & 12, filter by track
      const gradeNum = parseInt(classData.grade);
      if ((gradeNum === 11 || gradeNum === 12) && classData.track) {
        whereClause.OR = [
          { track: classData.track }, // Track-specific subjects
          { track: null }, // Common subjects
          { track: "common" }, // Explicitly common subjects
        ];

        console.log(
          `📚 Filtering subjects for Grade ${classData.grade} - Track: ${classData.track}`
        );
      }

      const subjects = await prisma.subject.findMany({
        where: whereClause,
        orderBy: { code: "asc" },
      });

      console.log(
        `✅ Found ${subjects.length} subjects for grade ${classData.grade}${
          classData.track ? ` (${classData.track})` : ""
        }`
      );

      const monthNames = [
        "មករា",
        "កុម្ភៈ",
        "មីនា",
        "មេសា",
        "ឧសភា",
        "មិថុនា",
        "កក្កដា",
        "សីហា",
        "កញ្ញា",
        "តុលា",
        "វិច្ឆិកា",
        "ធ្នូ",
      ];
      const monthNumber = monthNames.indexOf(month as string) + 1;

      if (monthNumber === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid month name",
        });
      }

      const grades = await prisma.grade.findMany({
        where: {
          classId,
          OR: [
            { month: month as string },
            { month: monthNumber.toString() },
            { monthNumber: monthNumber },
          ],
          year: parseInt(year as string),
        },
        include: {
          subject: true,
          student: true,
        },
      });

      const startDate = new Date(parseInt(year as string), monthNumber - 1, 1);
      const endDate = new Date(
        parseInt(year as string),
        monthNumber - 1,
        new Date(parseInt(year as string), monthNumber, 0).getDate(),
        23,
        59,
        59
      );

      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          classId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const attendanceSummary: {
        [studentId: string]: { absent: number; permission: number };
      } = {};

      attendanceRecords.forEach((record) => {
        if (!attendanceSummary[record.studentId]) {
          attendanceSummary[record.studentId] = { absent: 0, permission: 0 };
        }
        if (record.status === "ABSENT") {
          attendanceSummary[record.studentId].absent++;
        } else if (record.status === "PERMISSION") {
          attendanceSummary[record.studentId].permission++;
        }
      });

      // ✅ FIXED: Calculate total coefficient from filtered subjects
      const totalCoefficientForClass = subjects.reduce(
        (sum, s) => sum + s.coefficient,
        0
      );

      console.log(
        `✅ Total coefficient for class: ${totalCoefficientForClass}`
      );

      // ✅ Use sorted students
      const studentsData = sortedStudents.map((student) => {
        const studentGrades: { [subjectId: string]: number | null } = {};
        let totalScore = 0;
        let gradeCount = 0;
        let studentCoefficient = 0; // ✅ Track coefficient per student

        subjects.forEach((subject) => {
          const grade = grades.find(
            (g) => g.studentId === student.id && g.subjectId === subject.id
          );

          if (grade && grade.score !== null) {
            studentGrades[subject.id] = grade.score;
            totalScore += grade.score;
            gradeCount++;
            studentCoefficient += subject.coefficient; // ✅ Add coefficient only for entered subjects
          } else {
            studentGrades[subject.id] = null;
          }
        });

        // ✅ Average = totalScore / studentCoefficient (only entered subjects)
        const average =
          studentCoefficient > 0
            ? totalScore / studentCoefficient
            : 0;

        let gradeLevel = "F";
        if (average >= 45) gradeLevel = "A";
        else if (average >= 40) gradeLevel = "B";
        else if (average >= 35) gradeLevel = "C";
        else if (average >= 30) gradeLevel = "D";
        else if (average >= 25) gradeLevel = "E";

        return {
          studentId: student.studentId || student.id, // ✅ Use studentId field, fallback to id
          studentName:
            student.khmerName || `${student.lastName} ${student.firstName}`,
          gender: student.gender,
          grades: studentGrades,
          totalScore: totalScore.toFixed(2),
          average: average.toFixed(2),
          gradeLevel,
          absent: attendanceSummary[student.id]?.absent || 0,
          permission: attendanceSummary[student.id]?.permission || 0,
        };
      });

      const sorted = [...studentsData]
        .sort((a, b) => parseFloat(b.average) - parseFloat(a.average))
        .map((student, index) => ({ ...student, rank: index + 1 }));

      const finalData = studentsData.map((student) => {
        const ranked = sorted.find((s) => s.studentId === student.studentId);
        return { ...student, rank: ranked?.rank || 0 };
      });

      return res.json({
        success: true,
        data: {
          classId: classData.id,
          className: classData.name,
          grade: classData.grade,
          track: classData.track || null,
          teacherName: classData.homeroomTeacher
            ? `${classData.homeroomTeacher.lastName} ${classData.homeroomTeacher.firstName}`
            : null,
          month: month as string,
          year: parseInt(year as string),
          totalCoefficient: totalCoefficientForClass,
          subjects: subjects.map((s) => ({
            id: s.id,
            nameKh: s.nameKh,
            nameEn: s.nameEn,
            code: s.code,
            maxScore: s.maxScore,
            coefficient: s.coefficient,
          })),
          students: finalData,
        },
      });
    } catch (error: any) {
      console.error("❌ Get monthly report error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get monthly report",
      });
    }
  }

  /**
   * ✅ FIXED: Get grade-wide report - Handle multiple tracks
   */
  static async getGradeWideReport(req: Request, res: Response) {
    try {
      const { grade } = req.params;
      const { month, year } = req.query;

      const classes = await prisma.class.findMany({
        where: { grade: grade },
        include: {
          students: true, // ✅ Remove orderBy, sort later
        },
      });

      if (classes.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No classes found for this grade",
        });
      }

      const allStudents = classes.flatMap((c) =>
        c.students.map((s) => ({
          ...s,
          className: c.name,
          classId: c.id,
          classTrack: c.track,
        }))
      );

      // ✅ Sort students Excel-style
      const sortedStudents = [...allStudents].sort((a, b) => {
        const nameA = a.khmerName || `${a.lastName} ${a.firstName}`;
        const nameB = b.khmerName || `${b.lastName} ${b.firstName}`;
        return nameA.localeCompare(nameB, "en-US");
      });

      // ✅ FIXED: Get ALL subjects for this grade (all tracks)
      const subjects = await prisma.subject.findMany({
        where: {
          grade: grade,
          isActive: true,
        },
        orderBy: { code: "asc" },
      });

      console.log(
        `✅ Found ${subjects.length} total subjects for grade ${grade}`
      );

      const monthNames = [
        "មករា",
        "កុម្ភៈ",
        "មីនា",
        "មេសា",
        "ឧសភា",
        "មិថុនា",
        "កក្កដា",
        "សីហា",
        "កញ្ញា",
        "តុលា",
        "វិច្ឆិកា",
        "ធ្នូ",
      ];
      const monthNumber = monthNames.indexOf(month as string) + 1;

      if (monthNumber === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid month name",
        });
      }

      const grades = await prisma.grade.findMany({
        where: {
          OR: [
            { month: month as string },
            { month: monthNumber.toString() },
            { monthNumber: monthNumber },
          ],
          year: parseInt(year as string),
          studentId: {
            in: sortedStudents.map((s) => s.id),
          },
        },
        include: {
          subject: true,
          student: true,
        },
      });

      const startDate = new Date(parseInt(year as string), monthNumber - 1, 1);
      const endDate = new Date(
        parseInt(year as string),
        monthNumber - 1,
        new Date(parseInt(year as string), monthNumber, 0).getDate(),
        23,
        59,
        59
      );

      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          studentId: {
            in: sortedStudents.map((s) => s.id),
          },
        },
      });

      const attendanceSummary: {
        [studentId: string]: { absent: number; permission: number };
      } = {};

      attendanceRecords.forEach((record) => {
        if (!attendanceSummary[record.studentId]) {
          attendanceSummary[record.studentId] = { absent: 0, permission: 0 };
        }
        if (record.status === "ABSENT") {
          attendanceSummary[record.studentId].absent++;
        } else if (record.status === "PERMISSION") {
          attendanceSummary[record.studentId].permission++;
        }
      });

      // ✅ Use sorted students
      const studentsData = sortedStudents.map((student) => {
        // ✅ Filter subjects for THIS student's class track
        const gradeNum = parseInt(grade);
        const studentSubjects =
          gradeNum === 11 || gradeNum === 12
            ? subjects.filter(
                (s) =>
                  s.track === student.classTrack ||
                  s.track === null ||
                  s.track === "common"
              )
            : subjects;

        const totalCoefficientForStudent = studentSubjects.reduce(
          (sum, s) => sum + s.coefficient,
          0
        );

        const studentGrades: { [subjectId: string]: number | null } = {};
        let totalScore = 0;
        let gradeCount = 0;
        let actualCoefficient = 0; // ✅ Track coefficient for entered subjects only

        studentSubjects.forEach((subject) => {
          const grade = grades.find(
            (g) => g.studentId === student.id && g.subjectId === subject.id
          );

          if (grade && grade.score !== null) {
            studentGrades[subject.id] = grade.score;
            totalScore += grade.score;
            gradeCount++;
            actualCoefficient += subject.coefficient; // ✅ Add coefficient only for entered subjects
          } else {
            studentGrades[subject.id] = null;
          }
        });

        const average =
          actualCoefficient > 0
            ? totalScore / actualCoefficient
            : 0;

        let gradeLevel = "F";
        if (average >= 45) gradeLevel = "A";
        else if (average >= 40) gradeLevel = "B";
        else if (average >= 35) gradeLevel = "C";
        else if (average >= 30) gradeLevel = "D";
        else if (average >= 25) gradeLevel = "E";

        return {
          studentId: student.studentId || student.id, // ✅ Use studentId field, fallback to id
          studentName:
            student.khmerName || `${student.lastName} ${student.firstName}`,
          className: student.className,
          gender: student.gender,
          grades: studentGrades,
          totalScore: totalScore.toFixed(2),
          average: average.toFixed(2),
          gradeLevel,
          absent: attendanceSummary[student.id]?.absent || 0,
          permission: attendanceSummary[student.id]?.permission || 0,
        };
      });

      const sorted = [...studentsData]
        .sort((a, b) => parseFloat(b.average) - parseFloat(a.average))
        .map((student, index) => ({ ...student, rank: index + 1 }));

      const finalData = studentsData.map((student) => {
        const ranked = sorted.find((s) => s.studentId === student.studentId);
        return { ...student, rank: ranked?.rank || 0 };
      });

      // ✅ Calculate average coefficient across all classes
      const avgCoefficient =
        subjects.reduce((sum, s) => sum + s.coefficient, 0) / classes.length;

      return res.json({
        success: true,
        data: {
          grade: grade,
          classNames: classes.map((c) => c.name).join(", "),
          totalClasses: classes.length,
          month: month as string,
          year: parseInt(year as string),
          totalCoefficient: avgCoefficient,
          subjects: subjects.map((s) => ({
            id: s.id,
            nameKh: s.nameKh,
            nameEn: s.nameEn,
            code: s.code,
            maxScore: s.maxScore,
            coefficient: s.coefficient,
            track: s.track,
          })),
          students: finalData,
        },
      });
    } catch (error: any) {
      console.error("❌ Get grade-wide report error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get grade-wide report",
      });
    }
  }

  /**
   * ✅ FIXED: Get student tracking book - Filter subjects by track
   */

  static async getStudentTrackingBook(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const { year, month, subjectId } = req.query;

      console.log("\n=== TRACKING BOOK REQUEST ===");
      console.log("classId:", classId);
      console.log("year:", year);
      console.log("month:", month);
      console.log("subjectId:", subjectId);

      // ✅ FIXED: Use homeroomTeacher
      const classInfo = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          homeroomTeacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          students: true,
        },
      });

      if (!classInfo) {
        return res.status(404).json({
          success: false,
          message: "Class not found",
        });
      }

      // ✅ Sort students Excel-style
      const sortedStudents = [...classInfo.students].sort((a, b) => {
        const nameA = a.khmerName || `${a.lastName} ${a.firstName}`;
        const nameB = b.khmerName || `${b.lastName} ${b.firstName}`;
        return nameA.localeCompare(nameB, "en-US");
      });

      console.log(`\n📚 Class: ${classInfo.name}`);
      console.log(`👥 Students: ${sortedStudents.length}`);
      console.log(`📊 Grade: ${classInfo.grade}`);
      console.log(`🎯 Track: ${classInfo.track || "N/A"}`);

      // ✅ Build subject filter with track support
      const subjectWhereClause: any = {
        grade: classInfo.grade,
        isActive: true,
      };

      if (subjectId) {
        subjectWhereClause.id = subjectId as string;
      } else {
        const gradeNum = parseInt(classInfo.grade);
        if ((gradeNum === 11 || gradeNum === 12) && classInfo.track) {
          subjectWhereClause.OR = [
            { track: classInfo.track },
            { track: null },
            { track: "common" },
          ];
          console.log(`🔍 Filtering subjects by track: ${classInfo.track}`);
        }
      }

      const subjects = await prisma.subject.findMany({
        where: subjectWhereClause,
        orderBy: { code: "asc" },
        select: {
          id: true,
          nameKh: true,
          nameEn: true,
          code: true,
          maxScore: true,
          coefficient: true,
          track: true,
        },
      });

      console.log(`📖 Subjects: ${subjects.length}`);
      console.log(
        `📋 Subject list: `,
        subjects.map((s) => `${s.nameKh} (${s.track || "common"})`).join(", ")
      );

      // ✅ Build grade query
      const gradeWhereClause: any = {
        classId: classId,
        year: parseInt(year as string),
        studentId: {
          in: sortedStudents.map((s) => s.id),
        },
        subjectId: {
          in: subjects.map((s) => s.id),
        },
      };

      if (month && month !== "") {
        const monthNames = [
          "មករា",
          "កុម្ភៈ",
          "មីនា",
          "មេសា",
          "ឧសភា",
          "មិថុនា",
          "កក្កដា",
          "សីហា",
          "កញ្ញា",
          "តុលា",
          "វិច្ឆិកា",
          "ធ្នូ",
        ];
        const monthIndex = monthNames.indexOf(month as string);

        if (monthIndex >= 0) {
          const monthNumber = monthIndex + 1;
          gradeWhereClause.OR = [
            { month: month as string },
            { month: monthNumber.toString() },
            { monthNumber: monthNumber },
          ];
          console.log(
            `\n📅 Filtering by month: "${month}" (index: ${monthIndex}, number: ${monthNumber})`
          );
        }
      }

      console.log("\n🔍 Grade query filter:");
      console.log(JSON.stringify(gradeWhereClause, null, 2));

      const grades = await prisma.grade.findMany({
        where: gradeWhereClause,
        select: {
          id: true,
          studentId: true,
          subjectId: true,
          score: true,
          month: true,
          monthNumber: true,
        },
      });

      console.log(`\n✅ Found ${grades.length} grade records`);

      // ✅ Fetch attendance data
      const attendanceWhereClause: any = {
        classId: classId,
        studentId: {
          in: sortedStudents.map((s) => s.id),
        },
      };

      if (month && month !== "") {
        const monthNames = [
          "មករា",
          "កុម្ភៈ",
          "មីនា",
          "មេសា",
          "ឧសភា",
          "មិថុនា",
          "កក្កដា",
          "សីហា",
          "កញ្ញា",
          "តុលា",
          "វិច្ឆិកា",
          "ធ្នូ",
        ];
        const monthIndex = monthNames.indexOf(month as string);

        if (monthIndex >= 0) {
          const monthNumber = monthIndex + 1;
          const startDate = new Date(
            parseInt(year as string),
            monthNumber - 1,
            1
          );
          const endDate = new Date(
            parseInt(year as string),
            monthNumber - 1,
            new Date(parseInt(year as string), monthNumber, 0).getDate(),
            23,
            59,
            59
          );

          attendanceWhereClause.date = {
            gte: startDate,
            lte: endDate,
          };

          console.log(
            `\n📅 Attendance date range: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
          );
        }
      } else {
        const startDate = new Date(parseInt(year as string), 0, 1);
        const endDate = new Date(parseInt(year as string), 11, 31, 23, 59, 59);

        attendanceWhereClause.date = {
          gte: startDate,
          lte: endDate,
        };
      }

      const attendanceRecords = await prisma.attendance.findMany({
        where: attendanceWhereClause,
        select: {
          id: true,
          studentId: true,
          status: true,
          date: true,
        },
      });

      console.log(`\n✅ Found ${attendanceRecords.length} attendance records`);

      // ✅ Calculate attendance summary
      const attendanceSummary: {
        [studentId: string]: {
          totalAbsent: number;
          permission: number;
          withoutPermission: number;
        };
      } = {};

      sortedStudents.forEach((student) => {
        attendanceSummary[student.id] = {
          totalAbsent: 0,
          permission: 0,
          withoutPermission: 0,
        };
      });

      attendanceRecords.forEach((record) => {
        if (!attendanceSummary[record.studentId]) {
          attendanceSummary[record.studentId] = {
            totalAbsent: 0,
            permission: 0,
            withoutPermission: 0,
          };
        }

        if (record.status === "ABSENT") {
          attendanceSummary[record.studentId].withoutPermission++;
          attendanceSummary[record.studentId].totalAbsent++;
        } else if (record.status === "PERMISSION") {
          attendanceSummary[record.studentId].permission++;
          attendanceSummary[record.studentId].totalAbsent++;
        }
      });

      // ✅ Helper function for subject grade level
      const getSubjectGradeLevel = (
        score: number | null,
        maxScore: number
      ): {
        level: string;
        levelKhmer: string;
        percentage: number;
      } => {
        if (score === null || score === undefined) {
          return {
            level: "-",
            levelKhmer: "-",
            percentage: 0,
          };
        }

        const percentage = (score / maxScore) * 100;

        let level = "F";
        let levelKhmer = "ខ្សោយ";

        if (percentage >= 80) {
          level = "A";
          levelKhmer = "ល្អប្រសើរ";
        } else if (percentage >= 70) {
          level = "B";
          levelKhmer = "ល្អណាស់";
        } else if (percentage >= 60) {
          level = "C";
          levelKhmer = "ល្អ";
        } else if (percentage >= 50) {
          level = "D";
          levelKhmer = "ល្អបង្គួរ";
        } else if (percentage >= 40) {
          level = "E";
          levelKhmer = "មធ្យម";
        }

        return {
          level,
          levelKhmer,
          percentage: parseFloat(percentage.toFixed(2)),
        };
      };

      // ✅✅✅ THIS IS THE MISSING PART - ADD IT HERE ✅✅✅
      const totalCoefficientForClass = subjects.reduce(
        (sum, s) => sum + s.coefficient,
        0
      );

      console.log(`\n📊 Total Coefficient: ${totalCoefficientForClass}`);
      // ✅✅✅ END OF MISSING PART ✅✅✅

      // Build student data with subject grade levels
      const studentsData = sortedStudents.map((student) => {
        const subjectScores: {
          [subjectId: string]: {
            score: number | null;
            maxScore: number;
            gradeLevel: string;
            gradeLevelKhmer: string;
            percentage: number;
          };
        } = {};

        let totalScore = 0;
        let subjectsWithScores = 0;
        let studentCoefficient = 0; // ✅ Track coefficient for entered subjects

        subjects.forEach((subject) => {
          const grade = grades.find(
            (g) => g.studentId === student.id && g.subjectId === subject.id
          );

          const score = grade?.score ?? null;
          const gradeInfo = getSubjectGradeLevel(score, subject.maxScore);

          subjectScores[subject.id] = {
            score: score,
            maxScore: subject.maxScore,
            gradeLevel: gradeInfo.level,
            gradeLevelKhmer: gradeInfo.levelKhmer,
            percentage: gradeInfo.percentage,
          };

          if (score !== null) {
            totalScore += score;
            subjectsWithScores++;
            studentCoefficient += subject.coefficient; // ✅ Add coefficient only for entered subjects
          }
        });

        // ✅ Average = totalScore / studentCoefficient (only entered subjects)
        const averageScore =
          studentCoefficient > 0
            ? totalScore / studentCoefficient
            : 0;

        // ✅ Grade level thresholds
        let gradeLevel = "F";
        if (averageScore >= 45) gradeLevel = "A";
        else if (averageScore >= 40) gradeLevel = "B";
        else if (averageScore >= 35) gradeLevel = "C";
        else if (averageScore >= 30) gradeLevel = "D";
        else if (averageScore >= 25) gradeLevel = "E";

        const gradeLevelKhmer: { [key: string]: string } = {
          A: "ល្អប្រសើរ",
          B: "ល្អណាស់",
          C: "ល្អ",
          D: "ល្អបង្គួរ",
          E: "មធ្យម",
          F: "ខ្សោយ",
        };

        return {
          studentId: student.studentId || student.id, // ✅ Use studentId field, fallback to id
          studentName:
            student.khmerName || `${student.lastName} ${student.firstName}`,
          gender: student.gender,
          dateOfBirth: student.dateOfBirth
            ? new Date(student.dateOfBirth).toLocaleDateString("km-KH")
            : "",
          fatherName: student.fatherName || "",
          motherName: student.motherName || "",
          parentOccupation: student.parentOccupation || "",
          subjectScores,
          totalScore: totalScore.toFixed(0),
          averageScore: averageScore.toFixed(2),
          gradeLevel: gradeLevel,
          gradeLevelKhmer: gradeLevelKhmer[gradeLevel],
          subjectsRecorded: subjectsWithScores,
          attendance: attendanceSummary[student.id] || {
            totalAbsent: 0,
            permission: 0,
            withoutPermission: 0,
          },
        };
      });

      // Calculate ranks
      const sorted = [...studentsData]
        .filter((s) => s.subjectsRecorded > 0)
        .sort((a, b) => parseFloat(b.averageScore) - parseFloat(a.averageScore))
        .map((student, index) => ({ ...student, rank: index + 1 }));

      const finalData = studentsData.map((student) => {
        const ranked = sorted.find((s) => s.studentId === student.studentId);
        return { ...student, rank: ranked?.rank || 0 };
      });

      console.log(
        `\n✅ Generated tracking book for ${finalData.length} students`
      );

      if (finalData.length > 0) {
        console.log("\n📊 First student summary:");
        console.log(`  Name: ${finalData[0].studentName}`);
        console.log(
          `  Subjects with scores:  ${finalData[0].subjectsRecorded}`
        );
        console.log(`  Total:  ${finalData[0].totalScore}`);
        console.log(`  Average: ${finalData[0].averageScore}`);
        console.log(`  Rank: ${finalData[0].rank}`);
        console.log(`  Grade Level: ${finalData[0].gradeLevel}`);
      }

      console.log("=== END TRACKING BOOK ===\n");

      return res.json({
        success: true,
        data: {
          classId: classInfo.id,
          className: classInfo.name,
          grade: classInfo.grade,
          track: classInfo.track || null,
          year: parseInt(year as string),
          month: (month as string) || null,
          teacherName: classInfo.homeroomTeacher
            ? `${classInfo.homeroomTeacher.lastName} ${classInfo.homeroomTeacher.firstName}`
            : "",
          totalCoefficient: totalCoefficientForClass,
          subjects: subjects.map((s) => ({
            id: s.id,
            nameKh: s.nameKh,
            nameEn: s.nameEn,
            code: s.code,
            maxScore: s.maxScore,
            coefficient: s.coefficient,
            track: s.track,
          })),
          students: finalData,
        },
      });
    } catch (error: any) {
      console.error("\n❌ TRACKING BOOK ERROR:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get student tracking book",
      });
    }
  }
  /**
   * ✅ NEW: Get monthly statistics with gender breakdown
   */
  static async getMonthlyStatistics(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const { month, year } = req.query;

      console.log(
        `📊 Statistics request: classId=${classId}, month=${month}, year=${year}`
      );

      // ✅ Get class data
      const classData = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          students: true,
          homeroomTeacher: true, // ✅ CHANGED from "teacher"
          teacherClasses: {
            // ✅ ADDED: Multiple teachers
            include: {
              teacher: true,
            },
          },
        },
      });

      if (!classData) {
        return res.status(404).json({
          success: false,
          message: "Class not found",
        });
      }

      // ✅ Sort students
      const sortedStudents = [...classData.students].sort((a, b) => {
        const nameA = a.khmerName || `${a.lastName} ${a.firstName}`;
        const nameB = b.khmerName || `${b.lastName} ${b.firstName}`;
        return nameA.localeCompare(nameB, "en-US");
      });

      // ✅ Get subjects (with track filtering)
      const whereClause: any = {
        grade: classData.grade,
        isActive: true,
      };

      const gradeNum = parseInt(classData.grade);
      if ((gradeNum === 11 || gradeNum === 12) && classData.track) {
        whereClause.OR = [
          { track: classData.track },
          { track: null },
          { track: "common" },
        ];
      }

      const subjects = await prisma.subject.findMany({
        where: whereClause,
        orderBy: { code: "asc" },
      });

      console.log(`✅ Found ${subjects.length} subjects for statistics`);

      // ✅ Get month number
      const monthNames = [
        "មករា",
        "កុម្ភៈ",
        "មីនា",
        "មេសា",
        "ឧសភា",
        "មិថុនា",
        "កក្កដា",
        "សីហា",
        "កញ្ញា",
        "តុលា",
        "វិច្ឆិកា",
        "ធ្នូ",
      ];
      const monthNumber = monthNames.indexOf(month as string) + 1;

      if (monthNumber === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid month name",
        });
      }

      // ✅ Get grades
      const grades = await prisma.grade.findMany({
        where: {
          classId,
          OR: [
            { month: month as string },
            { month: monthNumber.toString() },
            { monthNumber: monthNumber },
          ],
          year: parseInt(year as string),
        },
        include: {
          subject: true,
          student: true,
        },
      });

      console.log(`✅ Found ${grades.length} grade records`);

      // ✅ Calculate total coefficient
      const totalCoefficient = subjects.reduce(
        (sum, s) => sum + s.coefficient,
        0
      );

      // ✅ Initialize statistics structure
      const statistics = {
        totalStudents: sortedStudents.length,
        femaleStudents: sortedStudents.filter((s) => s.gender === "FEMALE")
          .length,
        maleStudents: sortedStudents.filter((s) => s.gender === "MALE").length,

        // Overall Pass/Fail (Average >= 50 = Pass)
        totalPassed: 0,
        femalePassed: 0,
        malePassed: 0,
        totalFailed: 0,
        femaleFailed: 0,
        maleFailed: 0,

        // Overall Grade Distribution
        gradeDistribution: {
          A: { total: 0, female: 0, male: 0 },
          B: { total: 0, female: 0, male: 0 },
          C: { total: 0, female: 0, male: 0 },
          D: { total: 0, female: 0, male: 0 },
          E: { total: 0, female: 0, male: 0 },
          F: { total: 0, female: 0, male: 0 },
        },

        // Subject-wise Statistics
        subjectStatistics: {} as {
          [subjectId: string]: {
            subjectId: string;
            subjectName: string;
            subjectCode: string;
            gradeDistribution: {
              A: { total: number; female: number; male: number };
              B: { total: number; female: number; male: number };
              C: { total: number; female: number; male: number };
              D: { total: number; female: number; male: number };
              E: { total: number; female: number; male: number };
              F: { total: number; female: number; male: number };
            };
            averageScore: number;
            femaleAverageScore: number;
            maleAverageScore: number;
            totalScored: number;
            femaleScored: number;
            maleScored: number;
          };
        },
      };

      // ✅ Initialize subject statistics
      subjects.forEach((subject) => {
        statistics.subjectStatistics[subject.id] = {
          subjectId: subject.id,
          subjectName: subject.nameKh,
          subjectCode: subject.code,
          gradeDistribution: {
            A: { total: 0, female: 0, male: 0 },
            B: { total: 0, female: 0, male: 0 },
            C: { total: 0, female: 0, male: 0 },
            D: { total: 0, female: 0, male: 0 },
            E: { total: 0, female: 0, male: 0 },
            F: { total: 0, female: 0, male: 0 },
          },
          averageScore: 0,
          femaleAverageScore: 0,
          maleAverageScore: 0,
          totalScored: 0,
          femaleScored: 0,
          maleScored: 0,
        };
      });

      // ✅ Process each student
      sortedStudents.forEach((student) => {
        const studentGrades: { [subjectId: string]: number | null } = {};
        let totalScore = 0;
        let gradeCount = 0;
        let studentCoefficient = 0; // ✅ Track coefficient for entered subjects

        // Calculate student's total score and overall average
        subjects.forEach((subject) => {
          const grade = grades.find(
            (g) => g.studentId === student.id && g.subjectId === subject.id
          );

          const score = grade?.score ?? null;
          studentGrades[subject.id] = score;

          if (score !== null) {
            totalScore += score;
            gradeCount++;
            studentCoefficient += subject.coefficient; // ✅ Add coefficient only for entered subjects

            // ✅ Calculate subject grade level
            const subjectGradeInfo = getSubjectGradeLevel(
              score,
              subject.maxScore
            );

            // ✅ Update subject statistics
            const subjectStats = statistics.subjectStatistics[subject.id];
            const gradeLevel =
              subjectGradeInfo.level as keyof typeof subjectStats.gradeDistribution;

            if (subjectStats.gradeDistribution[gradeLevel]) {
              subjectStats.gradeDistribution[gradeLevel].total++;
              if (student.gender === "FEMALE") {
                subjectStats.gradeDistribution[gradeLevel].female++;
              } else {
                subjectStats.gradeDistribution[gradeLevel].male++;
              }
            }

            // ✅ Update subject average scores
            subjectStats.totalScored++;
            subjectStats.averageScore += score;
            if (student.gender === "FEMALE") {
              subjectStats.femaleScored++;
              subjectStats.femaleAverageScore += score;
            } else {
              subjectStats.maleScored++;
              subjectStats.maleAverageScore += score;
            }
          }
        });

        // ✅ Calculate student's overall average (only entered subjects)
        const average =
          studentCoefficient > 0 ? totalScore / studentCoefficient : 0;

        // ✅ FIXED: Use correct grade level thresholds
        let overallGradeLevel = "F";
        if (average >= 80) overallGradeLevel = "A";
        else if (average >= 70) overallGradeLevel = "B";
        else if (average >= 60) overallGradeLevel = "C";
        else if (average >= 50) overallGradeLevel = "D";
        else if (average >= 40) overallGradeLevel = "E";

        // ✅ Update overall grade distribution
        const gradeLevelKey =
          overallGradeLevel as keyof typeof statistics.gradeDistribution;
        statistics.gradeDistribution[gradeLevelKey].total++;
        if (student.gender === "FEMALE") {
          statistics.gradeDistribution[gradeLevelKey].female++;
        } else {
          statistics.gradeDistribution[gradeLevelKey].male++;
        }

        // ✅ FIXED: Update pass/fail statistics (Pass = Average >= 50)
        if (average >= 50) {
          statistics.totalPassed++;
          if (student.gender === "FEMALE") {
            statistics.femalePassed++;
          } else {
            statistics.malePassed++;
          }
        } else {
          statistics.totalFailed++;
          if (student.gender === "FEMALE") {
            statistics.femaleFailed++;
          } else {
            statistics.maleFailed++;
          }
        }
      });

      // ✅ Calculate final subject averages
      Object.values(statistics.subjectStatistics).forEach((subjectStat) => {
        if (subjectStat.totalScored > 0) {
          subjectStat.averageScore = parseFloat(
            (subjectStat.averageScore / subjectStat.totalScored).toFixed(2)
          );
        }
        if (subjectStat.femaleScored > 0) {
          subjectStat.femaleAverageScore = parseFloat(
            (subjectStat.femaleAverageScore / subjectStat.femaleScored).toFixed(
              2
            )
          );
        }
        if (subjectStat.maleScored > 0) {
          subjectStat.maleAverageScore = parseFloat(
            (subjectStat.maleAverageScore / subjectStat.maleScored).toFixed(2)
          );
        }
      });

      console.log(`✅ Statistics calculated successfully`);
      console.log(`   Total Students: ${statistics.totalStudents}`);
      console.log(`   Female Students: ${statistics.femaleStudents}`);
      console.log(`   Total Passed: ${statistics.totalPassed}`);
      console.log(`   Female Passed: ${statistics.femalePassed}`);

      return res.json({
        success: true,
        data: {
          classId: classData.id,
          className: classData.name,
          grade: classData.grade,
          track: classData.track || null,
          month: month as string,
          year: parseInt(year as string),
          teacherName: classData.homeroomTeacher
            ? `${classData.homeroomTeacher.lastName} ${classData.homeroomTeacher.firstName}`
            : null,
          totalCoefficient: totalCoefficient,
          subjects: subjects.map((s) => ({
            id: s.id,
            nameKh: s.nameKh,
            nameEn: s.nameEn,
            code: s.code,
            maxScore: s.maxScore,
            coefficient: s.coefficient,
          })),
          statistics: statistics,
        },
      });
    } catch (error: any) {
      console.error("❌ Get monthly statistics error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get monthly statistics",
      });
    }
  }
}
