import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * ✅ GET subjects LIGHTWEIGHT (for dropdowns/lists - fast loading)
 */
export const getSubjectsLightweight = async (req: Request, res: Response) => {
  try {
    console.log("⚡ GET SUBJECTS (lightweight)");

    const subjects = await prisma.subject.findMany({
      select: {
        id: true,
        name: true,
        nameKh: true,
        nameEn: true,
        code: true,
        description: true,
        grade: true,
        track: true,
        category: true,
        weeklyHours: true,
        annualHours: true,
        maxScore: true,
        coefficient: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
    });

    console.log(`⚡ Found ${subjects.length} subjects (lightweight)`);
    res.json(subjects);
  } catch (error: any) {
    console.error("❌ Error getting subjects (lightweight):", error);
    res.status(500).json({
      success: false,
      message: "Error getting subjects",
      error: error.message,
    });
  }
};

/**
 * ✅ GET all subjects (FULL DATA - includes teacher assignments)
 */
export const getAllSubjects = async (req: Request, res: Response) => {
  try {
    console.log("📚 GET ALL SUBJECTS (full data)");

    const subjects = await prisma.subject.findMany({
      include: {
        subjectTeachers: {
          include: {
            teacher: {
              select: {
                id: true,
                khmerName: true,
                englishName: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            grades: true,
          },
        },
      },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
    });

    console.log(`✅ Found ${subjects.length} subjects`);

    // ✅ Return array directly (not wrapped in {data: ...})
    res.json(subjects);
  } catch (error: any) {
    console.error("❌ Error getting subjects:", error);
    res.status(500).json({
      success: false,
      message: "Error getting subjects",
      error: error.message,
    });
  }
};

// ✅ FIXED: Create subject - RETURN WRAPPED RESPONSE
export const createSubject = async (req: Request, res: Response) => {
  try {
    const {
      name,
      nameKh,
      nameEn,
      code,
      description,
      grade,
      track,
      category,
      weeklyHours,
      annualHours,
      maxScore,
      coefficient,
      isActive,
    } = req.body;

    console.log("➕ CREATE SUBJECT:", { name, code, grade, coefficient });

    if (!name || !code || !grade) {
      return res.status(400).json({
        success: false,
        message: "Name, code, and grade are required",
      });
    }

    // ✅ Validate coefficient
    const coefficientValue =
      coefficient !== undefined ? parseFloat(coefficient) : 1.0;
    if (coefficientValue < 0.5 || coefficientValue > 3.0) {
      return res.status(400).json({
        success: false,
        message: "Coefficient must be between 0.5 and 3.0",
      });
    }

    const existingSubject = await prisma.subject.findUnique({
      where: { code },
    });

    if (existingSubject) {
      return res.status(400).json({
        success: false,
        message: `Subject with code "${code}" already exists`,
      });
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        nameKh: nameKh || name,
        nameEn,
        code,
        description,
        grade,
        track: track || null,
        category: category || "core",
        weeklyHours: parseFloat(weeklyHours) || 0,
        annualHours: parseInt(annualHours) || 0,
        maxScore: parseInt(maxScore) || 100,
        coefficient: coefficientValue,
        isActive: isActive !== false,
      },
      include: {
        subjectTeachers: {
          include: {
            teacher: true,
          },
        },
        _count: {
          select: {
            grades: true,
          },
        },
      },
    });

    console.log("✅ Subject created successfully:", subject.id);

    // ✅ FIX: Return wrapped response to match frontend expectation
    res.status(201).json({
      success: true,
      message: "Subject created successfully",
      data: subject,
    });
  } catch (error: any) {
    console.error("❌ Error creating subject:", error);
    res.status(500).json({
      success: false,
      message: "Error creating subject",
      error: error.message,
    });
  }
};

// ✅ FIXED: Update subject - RETURN WRAPPED RESPONSE
export const updateSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log("✏️ UPDATE SUBJECT:", id, updateData);

    const existingSubject = await prisma.subject.findUnique({
      where: { id },
    });

    if (!existingSubject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    if (updateData.code && updateData.code !== existingSubject.code) {
      const duplicateCode = await prisma.subject.findUnique({
        where: { code: updateData.code },
      });

      if (duplicateCode) {
        return res.status(400).json({
          success: false,
          message: `Subject with code "${updateData.code}" already exists`,
        });
      }
    }

    // ✅ Validate coefficient if provided
    if (updateData.coefficient !== undefined) {
      const coefficientValue = parseFloat(updateData.coefficient);
      if (coefficientValue < 0.5 || coefficientValue > 3.0) {
        return res.status(400).json({
          success: false,
          message: "Coefficient must be between 0. 5 and 3.0",
        });
      }
    }

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        ...updateData,
        weeklyHours:
          updateData.weeklyHours !== undefined
            ? parseFloat(updateData.weeklyHours)
            : existingSubject.weeklyHours,
        annualHours:
          updateData.annualHours !== undefined
            ? parseInt(updateData.annualHours)
            : existingSubject.annualHours,
        maxScore:
          updateData.maxScore !== undefined
            ? parseInt(updateData.maxScore)
            : existingSubject.maxScore,
        coefficient:
          updateData.coefficient !== undefined
            ? parseFloat(updateData.coefficient)
            : existingSubject.coefficient,
      },
      include: {
        subjectTeachers: {
          include: {
            teacher: true,
          },
        },
        _count: {
          select: {
            grades: true,
          },
        },
      },
    });

    console.log("✅ Subject updated successfully");

    // ✅ FIX: Return wrapped response
    res.json({
      success: true,
      message: "Subject updated successfully",
      data: subject,
    });
  } catch (error: any) {
    console.error("❌ Error updating subject:", error);
    res.status(500).json({
      success: false,
      message: "Error updating subject",
      error: error.message,
    });
  }
};

// Keep other functions same...
export const getSubjectById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        subjectTeachers: { include: { teacher: true } },
        _count: { select: { grades: true } },
      },
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    res.json(subject);
  } catch (error: any) {
    console.error("❌ Error getting subject:", error);
    res.status(500).json({
      success: false,
      message: "Error getting subject",
      error: error.message,
    });
  }
};

/**
 * ✅ GET subjects by grade (with optional track filter)
 */
export const getSubjectsByGrade = async (req: Request, res: Response) => {
  try {
    const { grade } = req.params;
    const { track } = req.query; // Optional:   "science" | "social"

    console.log(
      `📚 GET SUBJECTS BY GRADE:  ${grade}`,
      track ? `(${track})` : ""
    );

    const whereClause: any = {
      grade: grade.toString(),
      isActive: true,
    };

    // ✅ Filter by track for grades 11-12
    if (track) {
      whereClause.track = track.toString();
    }

    const subjects = await prisma.subject.findMany({
      where: whereClause,
      include: {
        subjectTeachers: {
          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                khmerName: true,
                englishName: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            grades: true,
            subjectTeachers: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    console.log(`✅ Found ${subjects.length} subjects`);

    res.json({
      success: true,
      data: subjects,
    });
  } catch (error: any) {
    console.error("❌ Error getting subjects by grade:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching subjects",
      error: error.message,
    });
  }
};

export const deleteSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const subjectWithGrades = await prisma.subject.findUnique({
      where: { id },
      include: { grades: true },
    });

    if (!subjectWithGrades) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    if (subjectWithGrades.grades.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete subject with ${subjectWithGrades.grades.length} grade(s). `,
      });
    }

    await prisma.subject.delete({ where: { id } });

    res.json({
      success: true,
      message: "Subject deleted successfully",
      data: null,
    });
  } catch (error: any) {
    console.error("❌ Error deleting subject:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting subject",
      error: error.message,
    });
  }
};

export const assignTeachersToSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teacherIds } = req.body;

    if (!Array.isArray(teacherIds)) {
      return res.status(400).json({
        success: false,
        message: "teacherIds must be an array",
      });
    }

    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    await prisma.subjectTeacher.deleteMany({ where: { subjectId: id } });

    const assignments = await Promise.all(
      teacherIds.map((teacherId) =>
        prisma.subjectTeacher.create({
          data: { subjectId: id, teacherId },
          include: { teacher: true },
        })
      )
    );

    res.json({
      success: true,
      message: "Teachers assigned successfully",
      data: assignments,
    });
  } catch (error: any) {
    console.error("❌ Error assigning teachers:", error);
    res.status(500).json({
      success: false,
      message: "Error assigning teachers",
      error: error.message,
    });
  }
};

export const removeTeacherFromSubject = async (req: Request, res: Response) => {
  try {
    const { id, teacherId } = req.params;
    await prisma.subjectTeacher.deleteMany({
      where: { subjectId: id, teacherId },
    });

    res.json({
      success: true,
      message: "Teacher removed successfully",
      data: null,
    });
  } catch (error: any) {
    console.error("❌ Error removing teacher:", error);
    res.status(500).json({
      success: false,
      message: "Error removing teacher",
      error: error.message,
    });
  }
};
