import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { GradeImportService } from "../services/grade-import.service";
import { GradeCalculationService } from "../services/grade-calculation.service";
import multer from "multer";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

// Configure multer for file upload
const upload = multer({ storage: multer.memoryStorage() });

export class GradeController {
  // ==================== FILE UPLOAD ====================

  /**
   * Multer middleware for file upload
   */
  static uploadMiddleware = upload.single("file");

  /**
   * Upload and import grades from Excel
   */
  static async importGrades(req: Request, res: Response) {
    try {
      const { classId } = req.params;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      console.log(`📤 Importing grades for class: ${classId}`);

      const result = await GradeImportService.importGrades(
        classId,
        req.file.buffer
      );

      return res.status(result.success ? 200 : 207).json(result);
    } catch (error: any) {
      console.error("❌ Grade import error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to import grades",
      });
    }
  }

  /**
   * Get grades by month
   */
  static async getGradesByMonth(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const { month, year } = req.query;

      const grades = await prisma.grade.findMany({
        where: {
          classId,
          month: month as string,
          year: parseInt(year as string),
        },
        include: {
          student: {
            select: {
              id: true,
              khmerName: true,
              firstName: true,
              lastName: true,
              gender: true,
            },
          },
          subject: {
            select: {
              id: true,
              nameKh: true,
              nameEn: true,
              code: true,
              maxScore: true,
              coefficient: true,
            },
          },
        },
        orderBy: [{ student: { khmerName: "asc" } }],
      });

      return res.json({
        success: true,
        data: grades,
      });
    } catch (error: any) {
      console.error("❌ Get grades error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get grades",
      });
    }
  }

  /**
   * Get monthly summary for a class
   */
  static async getMonthlySummary(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const { month, year } = req.query;

      const summaries = await prisma.studentMonthlySummary.findMany({
        where: {
          classId,
          month: month as string,
          year: parseInt(year as string),
        },
        include: {
          student: {
            select: {
              id: true,
              khmerName: true,
              firstName: true,
              lastName: true,
              gender: true,
            },
          },
        },
        orderBy: [{ classRank: "asc" }],
      });

      return res.json({
        success: true,
        data: summaries,
      });
    } catch (error: any) {
      console.error("❌ Get summary error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get summary",
      });
    }
  }

  // ==================== NEW: GRID DATA & BULK SAVE ====================

  /**
   * Get grades in grid format for Excel-like editing
   */
  // Update the getGradesGrid method in GradeController class

  /**
   * Get grades in grid format for Excel-like editing
   */
  // Update getSubjectOrder function in getGradesGrid method

  // Update getGradesGrid method - Calculate Total Coefficients from ALL subjects
  // Update getGradesGrid method in GradeController class
  static async getGradesGrid(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const { month, year } = req.query;

      // Get class with students
      const classData = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          students: {
            orderBy: { khmerName: "asc" },
          },
        },
      });

      if (!classData) {
        return res.status(404).json({
          success: false,
          message: "Class not found",
        });
      }

      // Define subject order and codes by grade
      const getSubjectOrder = (
        grade: string
      ): { [code: string]: { order: number; shortCode: string } } => {
        const gradeNum = parseInt(grade);

        // Grades 7, 8
        if (gradeNum === 7 || gradeNum === 8) {
          return {
            WRITER: { order: 1, shortCode: "W" },
            WRITING: { order: 2, shortCode: "R" },
            DICTATION: { order: 3, shortCode: "D" },
            MATH: { order: 4, shortCode: "M" },
            PHY: { order: 5, shortCode: "P" },
            CHEM: { order: 6, shortCode: "C" },
            BIO: { order: 7, shortCode: "B" },
            EARTH: { order: 8, shortCode: "Es" },
            MORAL: { order: 9, shortCode: "Mo" },
            GEO: { order: 10, shortCode: "G" },
            HIST: { order: 11, shortCode: "H" },
            ENG: { order: 12, shortCode: "E" },
            HE: { order: 13, shortCode: "He" },
            HLTH: { order: 14, shortCode: "Hl" },
            SPORTS: { order: 15, shortCode: "S" },
            AGRI: { order: 16, shortCode: "Ag" },
            ICT: { order: 17, shortCode: "IT" },
          };
        }

        // Grade 9
        if (gradeNum === 9) {
          return {
            WRITER: { order: 1, shortCode: "W" },
            WRITING: { order: 2, shortCode: "R" },
            DICTATION: { order: 3, shortCode: "D" },
            MATH: { order: 4, shortCode: "M" },
            PHY: { order: 5, shortCode: "P" },
            CHEM: { order: 6, shortCode: "C" },
            BIO: { order: 7, shortCode: "B" },
            EARTH: { order: 8, shortCode: "Es" },
            MORAL: { order: 9, shortCode: "Mo" },
            GEO: { order: 10, shortCode: "G" },
            HIST: { order: 11, shortCode: "H" },
            ENG: { order: 12, shortCode: "E" },
            KHM: { order: 13, shortCode: "K" },
            ECON: { order: 14, shortCode: "Ec" },
            HLTH: { order: 15, shortCode: "Hl" },
            HE: { order: 16, shortCode: "He" },
            SPORTS: { order: 17, shortCode: "S" },
            AGRI: { order: 18, shortCode: "Ag" },
            ICT: { order: 19, shortCode: "IT" },
          };
        }

        // Grades 10, 11, 12
        return {
          KHM: { order: 1, shortCode: "K" },
          MATH: { order: 2, shortCode: "M" },
          PHY: { order: 3, shortCode: "P" },
          CHEM: { order: 4, shortCode: "C" },
          BIO: { order: 5, shortCode: "B" },
          EARTH: { order: 6, shortCode: "Es" },
          MORAL: { order: 7, shortCode: "Mo" },
          GEO: { order: 8, shortCode: "G" },
          HIST: { order: 9, shortCode: "H" },
          ENG: { order: 10, shortCode: "E" },
          ECON: { order: 11, shortCode: "Ec" },
          HLTH: { order: 12, shortCode: "Hl" },
          SPORTS: { order: 13, shortCode: "S" },
          AGRI: { order: 14, shortCode: "Ag" },
          ICT: { order: 15, shortCode: "IT" },
        };
      };

      const subjectOrder = getSubjectOrder(classData.grade);

      // ✅ FIXED: Filter subjects by grade AND track
      const whereClause: any = {
        grade: classData.grade,
        isActive: true,
      };

      // ✅ For Grade 11 & 12, filter by track
      const gradeNum = parseInt(classData.grade);
      if ((gradeNum === 11 || gradeNum === 12) && classData.track) {
        whereClause.OR = [
          { track: classData.track }, // Subjects specific to this track
          { track: null }, // Common subjects (for both tracks)
          { track: "common" }, // Common subjects (explicit)
        ];

        console.log(
          `📚 Filtering subjects for Grade ${classData.grade} - Track: ${classData.track}`
        );
      }

      const subjects = await prisma.subject.findMany({
        where: whereClause,
      });

      console.log(
        `✅ Found ${subjects.length} subjects for grade ${classData.grade}${
          classData.track ? ` (${classData.track})` : ""
        }`
      );

      // Sort subjects by order
      const sortedSubjects = subjects
        .map((subject) => {
          const baseCode = subject.code.split("-")[0];
          const orderInfo = subjectOrder[baseCode] || {
            order: 999,
            shortCode: subject.code,
          };
          return {
            ...subject,
            displayOrder: orderInfo.order,
            shortCode: orderInfo.shortCode,
          };
        })
        .sort((a, b) => a.displayOrder - b.displayOrder);

      // ✅ CALCULATE TOTAL COEFFICIENTS FROM ALL SUBJECTS
      const totalCoefficientForClass = sortedSubjects.reduce(
        (sum, subject) => sum + subject.coefficient,
        0
      );

      // Get existing grades
      const existingGrades = await prisma.grade.findMany({
        where: {
          classId,
          month: month as string,
          year: parseInt(year as string),
        },
      });

      // Build grid data with calculations
      const gridData = classData.students.map((student) => {
        const studentGrades: { [subjectId: string]: any } = {};
        let totalScore = 0;
        let totalMaxScore = 0;
        let studentCoefficient = 0; // ✅ Track coefficient for entered subjects

        sortedSubjects.forEach((subject) => {
          const grade = existingGrades.find(
            (g) => g.studentId === student.id && g.subjectId === subject.id
          );

          // Use proper null check - don't treat 0 as falsy!
          const score = grade?.score !== undefined ? grade.score : null;

          // Include ALL scores (including 0) in calculations
          if (score !== null) {
            totalScore += score;
            totalMaxScore += subject.maxScore;
            studentCoefficient += subject.coefficient; // ✅ Add coefficient only for entered subjects
          }

          studentGrades[subject.id] = {
            id: grade?.id || null,
            score,
            maxScore: subject.maxScore,
            coefficient: subject.coefficient,
            isSaved: !!grade,
          };
        });

        const average =
          studentCoefficient > 0
            ? totalScore / studentCoefficient
            : 0;

        let gradeLevel = "F";
        if (average >= 90) gradeLevel = "A";
        else if (average >= 80) gradeLevel = "B+";
        else if (average >= 70) gradeLevel = "B";
        else if (average >= 60) gradeLevel = "C";
        else if (average >= 50) gradeLevel = "D";
        else if (average >= 40) gradeLevel = "E";

        return {
          studentId: student.id,
          studentName:
            student.khmerName || `${student.lastName} ${student.firstName}`,
          gender: student.gender,
          grades: studentGrades,
          totalScore: totalScore.toFixed(2),
          totalMaxScore,
          totalCoefficient: studentCoefficient.toFixed(2), // ✅ Use student's actual coefficient
          average: average.toFixed(2),
          gradeLevel,
          absent: 0,
          permission: 0,
        };
      });

      // Calculate ranks
      const rankedData = gridData
        .slice()
        .sort((a, b) => parseFloat(b.average) - parseFloat(a.average))
        .map((student, index) => ({
          ...student,
          rank: index + 1,
        }));

      // Restore original order with ranks
      const finalData = gridData.map((student) => {
        const ranked = rankedData.find(
          (r) => r.studentId === student.studentId
        );
        return { ...student, rank: ranked?.rank || 0 };
      });

      return res.json({
        success: true,
        data: {
          classId: classData.id,
          className: classData.name,
          grade: classData.grade,
          track: classData.track || null, // ✅ Include track in response
          month: month as string,
          year: parseInt(year as string),
          totalCoefficient: totalCoefficientForClass,
          subjects: sortedSubjects.map((s) => ({
            id: s.id,
            nameKh: s.nameKh,
            nameEn: s.nameEn,
            code: s.code,
            shortCode: s.shortCode,
            maxScore: s.maxScore,
            coefficient: s.coefficient,
            order: s.displayOrder,
          })),
          students: finalData,
        },
      });
    } catch (error: any) {
      console.error("❌ Get grid error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get grid data",
      });
    }
  }

  /**
   * 🚀 OPTIMIZED: Bulk save/update grades
   * @description Save multiple grades efficiently with proper connection management
   */
  static async bulkSaveGrades(req: Request, res: Response) {
    try {
      const { classId, month, year, grades } = req.body;

      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🎯 Bulk Save Grades Started");
      console.log("📊 Class:", classId);
      console.log("📅 Period:", month, year);
      console.log("📝 Total items:", grades.length);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      if (!Array.isArray(grades) || grades.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No grades provided",
        });
      }

      // ✅ Fetch subjects with maxScore
      console.time("📚 Fetch Subjects");
      const subjects = await prisma.subject.findMany({
        where: { isActive: true },
        select: {
          id: true,
          maxScore: true, // ✅ Include maxScore
        },
      });
      console.timeEnd("📚 Fetch Subjects");
      console.log(`✅ Found ${subjects.length} subjects\n`);

      const subjectMap = new Map(subjects.map((s) => [s.id, s]));

      // ✅ Validate
      console.time("🔨 Validate Data");
      const validData: typeof grades = [];
      const errors: any[] = [];

      for (const item of grades) {
        if (!item.studentId || !item.subjectId || item.score === undefined) {
          errors.push({ item, reason: "Missing required fields" });
          continue;
        }

        const subject = subjectMap.get(item.subjectId);
        if (!subject) {
          errors.push({ item, reason: "Invalid subject ID" });
          continue;
        }

        if (
          item.score !== null &&
          (item.score < 0 || item.score > subject.maxScore)
        ) {
          errors.push({
            item,
            reason: `Score out of range (0-${subject.maxScore})`,
          });
          continue;
        }

        validData.push(item);
      }

      console.timeEnd("🔨 Validate Data");
      console.log(
        `✅ Validated: ${validData.length} valid, ${errors.length} errors\n`
      );

      if (validData.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid grades to save",
          errors,
        });
      }

      // ✅ Fetch existing grades
      console.time("🔍 Fetch Existing Grades");
      const existingGrades = await prisma.grade.findMany({
        where: {
          classId: classId,
          year: year,
          month: month,
          OR: validData.map((item) => ({
            studentId: item.studentId,
            subjectId: item.subjectId,
          })),
        },
        select: {
          id: true,
          studentId: true,
          subjectId: true,
          score: true,
        },
      });
      console.timeEnd("🔍 Fetch Existing Grades");
      console.log(`✅ Found ${existingGrades.length} existing grades\n`);

      // ✅ Build lookup map
      const existingMap = new Map(
        existingGrades.map((g) => [`${g.studentId}_${g.subjectId}`, g])
      );

      // ✅ Separate creates and updates
      const toCreate: any[] = [];
      const toUpdate: any[] = [];

      validData.forEach((item) => {
        const key = `${item.studentId}_${item.subjectId}`;
        const existing = existingMap.get(key);

        // ✅ Get subject maxScore
        const subject = subjectMap.get(item.subjectId);
        if (!subject) {
          console.warn(`⚠️ Subject not found: ${item.subjectId}`);
          return;
        }

        if (existing) {
          // Only update if score changed
          if (existing.score !== item.score) {
            toUpdate.push({
              where: { id: existing.id },
              data: {
                score: item.score,
                maxScore: subject.maxScore, // ✅ Update maxScore too
                updatedAt: new Date(),
              },
            });
          }
        } else {
          // ✅ Include maxScore, id, and updatedAt in create
          toCreate.push({
            id: randomUUID(), // ✅ FIXED: Generate unique ID
            studentId: item.studentId,
            subjectId: item.subjectId,
            classId: classId,
            score: item.score,
            maxScore: subject.maxScore, // ✅ FIXED: Include maxScore
            year: year,
            month: month,
            updatedAt: new Date(), // ✅ FIXED: Add updatedAt timestamp
          });
        }
      });

      console.log(
        `📝 Operations: ${toCreate.length} creates, ${toUpdate.length} updates\n`
      );

      // ✅ Execute bulk operations
      console.time("💾 Database Save");

      let created = 0;
      let updated = 0;

      // Create in bulk
      if (toCreate.length > 0) {
        console.time("  📥 Bulk Create");
        const createResult = await prisma.grade.createMany({
          data: toCreate,
          skipDuplicates: true,
        });
        created = createResult.count;
        console.timeEnd("  📥 Bulk Create");
        console.log(`  ✅ Created ${created} records\n`);
      }

      // Update in batches
      if (toUpdate.length > 0) {
        const UPDATE_BATCH = 100;
        const updateBatches = Math.ceil(toUpdate.length / UPDATE_BATCH);

        console.log(`  📤 Updating in ${updateBatches} batches... `);
        console.time("  📤 Bulk Update");

        for (let i = 0; i < toUpdate.length; i += UPDATE_BATCH) {
          const batch = toUpdate.slice(i, i + UPDATE_BATCH);

          // ✅ After (correct)
          await prisma.$transaction(
            batch.map((update) => prisma.grade.update(update))
          );

          updated += batch.length;

          if (updateBatches > 1) {
            console.log(`    Progress: ${updated}/${toUpdate.length}`);
          }
        }

        console.timeEnd("  📤 Bulk Update");
        console.log(`  ✅ Updated ${updated} records\n`);
      }

      console.timeEnd("💾 Database Save");

      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("✅ Bulk Save Completed");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`📊 Created: ${created}`);
      console.log(`📊 Updated: ${updated}`);
      console.log(`📊 Skipped: ${validData.length - created - updated}`);
      console.log(`📊 Total: ${created + updated}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      return res.json({
        success: true,
        message: "Grades saved successfully",
        data: {
          created,
          updated,
          skipped: validData.length - created - updated,
          total: created + updated,
          validationErrors: errors,
        },
      });
    } catch (error: any) {
      console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("❌ Bulk Save Error");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      return res.status(500).json({
        success: false,
        message: error.message || "Failed to save grades",
      });
    }
  }

  // ==================== GRADE CONFIRMATION METHODS ====================

  /**
   * Confirm grades for a specific class/subject/month/year
   */
  static async confirmGrades(req: Request, res: Response) {
    try {
      const { classId, subjectId, month, year, userId } = req.body;

      if (!classId || !subjectId || !month || !year || !userId) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      // Check if confirmation already exists
      const existing = await prisma.gradeConfirmation.findUnique({
        where: {
          classId_subjectId_month_year: {
            classId,
            subjectId,
            month,
            year,
          },
        },
      });

      let confirmation;
      if (existing) {
        // Update existing confirmation
        confirmation = await prisma.gradeConfirmation.update({
          where: { id: existing.id },
          data: {
            isConfirmed: true,
            confirmedBy: userId,
            confirmedAt: new Date(),
          },
        });
      } else {
        // Create new confirmation
        confirmation = await prisma.gradeConfirmation.create({
          data: {
            classId,
            subjectId,
            month,
            year,
            isConfirmed: true,
            confirmedBy: userId,
          },
        });
      }

      return res.json({
        success: true,
        message: "Grades confirmed successfully",
        data: confirmation,
      });
    } catch (error: any) {
      console.error("❌ Confirm grades error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to confirm grades",
      });
    }
  }

  /**
   * Get all confirmations for a class (optionally filtered by month/year)
   */
  static async getConfirmations(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const { month, year } = req.query;

      const where: any = { classId };
      if (month) where.month = month as string;
      if (year) where.year = parseInt(year as string);

      const confirmations = await prisma.gradeConfirmation.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      });

      return res.json({
        success: true,
        data: confirmations,
      });
    } catch (error: any) {
      console.error("❌ Get confirmations error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get confirmations",
      });
    }
  }

  /**
   * Remove grade confirmation (revert to unconfirmed state)
   */
  static async removeConfirmation(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const confirmation = await prisma.gradeConfirmation.findUnique({
        where: { id },
      });

      if (!confirmation) {
        return res.status(404).json({
          success: false,
          message: "Confirmation not found",
        });
      }

      await prisma.gradeConfirmation.delete({
        where: { id },
      });

      return res.json({
        success: true,
        message: "Confirmation removed successfully",
      });
    } catch (error: any) {
      console.error("❌ Remove confirmation error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to remove confirmation",
      });
    }
  }
}

// ==================== EXISTING FUNCTIONS (Keep as is) ====================

// Get all grades
export const getAllGrades = async (req: Request, res: Response) => {
  try {
    const grades = await prisma.grade.findMany({
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: grades,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching grades",
      error: error.message,
    });
  }
};

// Get grade by ID
export const getGradeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const grade = await prisma.grade.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            khmerName: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!grade) {
      return res.status(404).json({
        success: false,
        message: "Grade not found",
      });
    }

    res.json({
      success: true,
      data: grade,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching grade",
      error: error.message,
    });
  }
};

// Get grades by student
export const getGradesByStudent = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const grades = await prisma.grade.findMany({
      where: { studentId },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: grades,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching student grades",
      error: error.message,
    });
  }
};

// Get grades by class
export const getGradesByClass = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;

    const grades = await prisma.grade.findMany({
      where: { classId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            khmerName: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: grades,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching class grades",
      error: error.message,
    });
  }
};

// Get grades by subject
export const getGradesBySubject = async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;

    const grades = await prisma.grade.findMany({
      where: { subjectId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            khmerName: true,
            class: {
              select: {
                name: true,
                grade: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: grades,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching subject grades",
      error: error.message,
    });
  }
};

// Create new grade
// Create new grade
export const createGrade = async (req: Request, res: Response) => {
  try {
    const {
      studentId,
      subjectId,
      classId,
      score,
      maxScore,
      remarks,
      month,
      year,
    } = req.body;

    if (
      !studentId ||
      !subjectId ||
      !classId ||
      score === undefined ||
      !maxScore
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    if (score < 0 || score > maxScore) {
      return res.status(400).json({
        success: false,
        message: `Score must be between 0 and ${maxScore}`,
      });
    }

    const newGrade = await prisma.grade.create({
      data: {
        studentId,
        subjectId,
        classId,
        score,
        maxScore,
        remarks,
        month,
        year,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            khmerName: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // Calculate summary if month/year provided
    if (month && year) {
      // FIX: Remove optional chaining on static method
      const monthNumber = GradeCalculationService.getMonthNumber(month) || 1;
      await GradeCalculationService.calculateMonthlySummary(
        studentId,
        classId,
        month,
        monthNumber,
        year
      );
    }

    res.status(201).json({
      success: true,
      message: "Grade created successfully",
      data: newGrade,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error creating grade",
      error: error.message,
    });
  }
};

// Update grade
export const updateGrade = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { score, maxScore, remarks } = req.body;

    const existingGrade = await prisma.grade.findUnique({
      where: { id },
    });

    if (!existingGrade) {
      return res.status(404).json({
        success: false,
        message: "Grade not found",
      });
    }

    const finalMaxScore = maxScore || existingGrade.maxScore;
    if (score !== undefined && (score < 0 || score > finalMaxScore)) {
      return res.status(400).json({
        success: false,
        message: `Score must be between 0 and ${finalMaxScore}`,
      });
    }

    const updatedGrade = await prisma.grade.update({
      where: { id },
      data: {
        score,
        maxScore,
        remarks,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            khmerName: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: "Grade updated successfully",
      data: updatedGrade,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error updating grade",
      error: error.message,
    });
  }
};

// Delete grade
export const deleteGrade = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingGrade = await prisma.grade.findUnique({
      where: { id },
    });

    if (!existingGrade) {
      return res.status(404).json({
        success: false,
        message: "Grade not found",
      });
    }

    await prisma.grade.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Grade deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error deleting grade",
      error: error.message,
    });
  }
};
