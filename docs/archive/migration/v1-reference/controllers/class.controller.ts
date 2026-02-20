import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * ✅ OPTIMIZED: GET classes ULTRA-LIGHTWEIGHT (for dropdowns - blazing fast!)
 * Only returns essential fields needed for selection lists
 * No joins, no counts = Maximum performance
 */
export const getClassesLightweight = async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    console.log("⚡ GET CLASSES (ultra-lightweight)");

    const classes = await prisma.class.findMany({
      select: {
        id: true,
        classId: true,
        name: true,
        grade: true,
        section: true,
        track: true,
        academicYear: true,
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: [{ grade: "asc" }, { section: "asc" }],
    });

    const elapsedTime = Date.now() - startTime;
    console.log(`⚡ Found ${classes.length} classes in ${elapsedTime}ms (${Math.round(classes.length / (elapsedTime / 1000))} classes/sec)`);

    res.json(classes);
  } catch (error: any) {
    console.error("❌ Error getting classes (lightweight):", error);
    res.status(500).json({
      success: false,
      message: "Error getting classes",
      error: error.message,
    });
  }
};

/**
 * ✅ GET all classes (FULL DATA - includes students list)
 */
export const getAllClasses = async (req: Request, res: Response) => {
  try {
    console.log("📚 GET ALL CLASSES (full data)");

    const classes = await prisma.class.findMany({
      include: {
        homeroomTeacher: {
          // ✅ CHANGED: teacher → homeroomTeacher
          select: {
            id: true,
            khmerName: true,
            englishName: true, // ✅ ADDED
            firstName: true,
            lastName: true,
            email: true,
            role: true, // ✅ ADDED
          },
        },
        students: {
          select: {
            id: true,
            khmerName: true,
            firstName: true,
            lastName: true,
            gender: true,
          },
        },
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: [{ grade: "asc" }, { section: "asc" }],
    });

    console.log(`✅ Found ${classes.length} classes`);
    res.json(classes);
  } catch (error: any) {
    console.error("❌ Error getting classes:", error);
    res.status(500).json({
      success: false,
      message: "Error getting classes",
      error: error.message,
    });
  }
};

// Get class by ID
export const getClassById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log("📖 GET CLASS BY ID:", id);

    const classData = await prisma.class.findUnique({
      where: { id },
      include: {
        homeroomTeacher: true, // ✅ CHANGED: teacher → homeroomTeacher
        students: {
          orderBy: {
            khmerName: "asc",
          },
        },
        _count: {
          select: {
            students: true,
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

    console.log("✅ Class found:", classData.name);
    res.json(classData);
  } catch (error: any) {
    console.error("❌ Error getting class:", error);
    res.status(500).json({
      success: false,
      message: "Error getting class",
      error: error.message,
    });
  }
};

// Create class
export const createClass = async (req: Request, res: Response) => {
  try {
    const {
      classId,
      name,
      grade,
      section,
      track, // ✅ ADDED
      academicYear,
      capacity,
      teacherId, // ⚠️ Keep for backward compatibility
      homeroomTeacherId, // ✅ ADDED
    } = req.body;

    console.log("➕ CREATE CLASS:", { classId, name, grade });

    if (!name || !grade || !academicYear) {
      return res.status(400).json({
        success: false,
        message: "Name, grade, and academicYear are required",
      });
    }

    // ✅ Validate track for grades 11-12
    if ((grade === "11" || grade === "12") && !track) {
      return res.status(400).json({
        success: false,
        message: "Track (science/social) is required for grades 11-12",
      });
    }

    // Check if classId already exists
    if (classId) {
      const existing = await prisma.class.findUnique({
        where: { classId },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Class with ID "${classId}" already exists`,
        });
      }
    }

    // ✅ Use homeroomTeacherId if provided, fallback to teacherId for backward compatibility
    const finalTeacherId = homeroomTeacherId || teacherId || null;

    const classData = await prisma.class.create({
      data: {
        classId: classId || `G${grade}-${section || "A"}`,
        name,
        grade,
        section: section || null,
        track: track || null, // ✅ ADDED
        academicYear,
        capacity: capacity ? parseInt(capacity) : null,
        homeroomTeacherId: finalTeacherId, // ✅ CHANGED: teacherId → homeroomTeacherId
      },
      include: {
        homeroomTeacher: true, // ✅ CHANGED:  teacher → homeroomTeacher
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    console.log("✅ Class created:", classData.id);
    res.status(201).json(classData);
  } catch (error: any) {
    console.error("❌ Error creating class:", error);
    res.status(500).json({
      success: false,
      message: "Error creating class",
      error: error.message,
    });
  }
};

// Update class
export const updateClass = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log("✏️ UPDATE CLASS:", id);

    const existing = await prisma.class.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // ✅ Handle both teacherId (old) and homeroomTeacherId (new)
    const finalTeacherId =
      updateData.homeroomTeacherId !== undefined
        ? updateData.homeroomTeacherId
        : updateData.teacherId !== undefined
        ? updateData.teacherId
        : undefined;

    const classData = await prisma.class.update({
      where: { id },
      data: {
        classId: updateData.classId,
        name: updateData.name,
        grade: updateData.grade,
        section: updateData.section,
        track: updateData.track, // ✅ ADDED
        academicYear: updateData.academicYear,
        capacity: updateData.capacity
          ? parseInt(updateData.capacity)
          : existing.capacity,
        homeroomTeacherId: finalTeacherId, // ✅ CHANGED
      },
      include: {
        homeroomTeacher: true, // ✅ CHANGED: teacher → homeroomTeacher
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    console.log("✅ Class updated");
    res.json(classData);
  } catch (error: any) {
    console.error("❌ Error updating class:", error);
    res.status(500).json({
      success: false,
      message: "Error updating class",
      error: error.message,
    });
  }
};

// Delete class
export const deleteClass = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log("🗑️ DELETE CLASS REQUEST:", id);

    // ✅ Check if class exists and get student count
    const classWithStudents = await prisma.class.findUnique({
      where: { id },
      include: {
        students: {
          select: {
            id: true,
            khmerName: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!classWithStudents) {
      console.log("❌ Class not found:", id);
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // ✅ Prevent deletion if class has students
    if (classWithStudents.students.length > 0) {
      console.log(
        `❌ Cannot delete class with ${classWithStudents.students.length} students`
      );
      return res.status(400).json({
        success: false,
        message: `Cannot delete class with ${classWithStudents.students.length} student(s). Please remove students first.`,
        studentCount: classWithStudents.students.length,
      });
    }

    // ✅ Delete the class
    await prisma.class.delete({
      where: { id },
    });

    console.log("✅ Class deleted successfully:", classWithStudents.name);
    res.json({
      success: true,
      message: "Class deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Error deleting class:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting class",
      error: error.message,
    });
  }
};

// Assign students to class
export const assignStudentsToClass = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { studentIds } = req.body;

    console.log("🔗 ASSIGN STUDENTS TO CLASS:", id);

    if (!Array.isArray(studentIds)) {
      return res.status(400).json({
        success: false,
        message: "studentIds must be an array",
      });
    }

    const classData = await prisma.class.findUnique({
      where: { id },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // ✅ FIX: Get students' old class IDs before updating
    const studentsWithOldClass = await prisma.student.findMany({
      where: {
        id: {
          in: studentIds,
        },
      },
      select: {
        id: true,
        classId: true,
      },
    });

    // Update students to new class
    await prisma.student.updateMany({
      where: {
        id: {
          in: studentIds,
        },
      },
      data: {
        classId: id,
      },
    });

    // ✅ FIX: Transfer grades to new class for each student
    for (const student of studentsWithOldClass) {
      // Get all grades for this student (both from old class and unassigned)
      let gradesToTransfer = [];

      if (student.classId && student.classId !== id) {
        // Student is changing from another class
        console.log(
          `📚 Transferring grades for student ${student.id} from class ${student.classId} to ${id}`
        );

        gradesToTransfer = await prisma.grade.findMany({
          where: {
            studentId: student.id,
            classId: student.classId,
          },
        });
      } else if (!student.classId) {
        // ✅ NEW: Student has no class but may have unassigned grades
        console.log(
          `📚 Transferring unassigned grades for student ${student.id} to ${id}`
        );

        gradesToTransfer = await prisma.grade.findMany({
          where: {
            studentId: student.id,
            classId: null,
          },
        });
      }

      // Transfer the grades
      for (const grade of gradesToTransfer) {
        const existingGrade = await prisma.grade.findUnique({
          where: {
            studentId_subjectId_classId_month_year: {
              studentId: student.id,
              subjectId: grade.subjectId,
              classId: id,
              month: grade.month || "",
              year: grade.year || 0,
            },
          },
        });

        if (existingGrade) {
          // Grade already exists in new class, delete the old one
          await prisma.grade.delete({
            where: { id: grade.id },
          });
          console.log(
            `  ⚠️  Duplicate grade found, keeping existing grade for ${grade.subjectId}`
          );
        } else {
          // No conflict, update the classId
          await prisma.grade.update({
            where: { id: grade.id },
            data: { classId: id },
          });
          console.log(`  ✅ Transferred grade for ${grade.subjectId}`);
        }
      }

      if (gradesToTransfer.length > 0) {
        console.log(
          `  📊 Total grades transferred: ${gradesToTransfer.length}`
        );
      }
    }

    const updatedClass = await prisma.class.findUnique({
      where: { id },
      include: {
        students: true,
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    console.log("✅ Students assigned and grades transferred");
    res.json(updatedClass);
  } catch (error: any) {
    console.error("❌ Error assigning students:", error);
    res.status(500).json({
      success: false,
      message: "Error assigning students",
      error: error.message,
    });
  }
};

// Remove student from class
export const removeStudentFromClass = async (req: Request, res: Response) => {
  try {
    const { id, studentId } = req.params;

    console.log("🔓 REMOVE STUDENT FROM CLASS:", { id, studentId });

    // ✅ First, get the student's current class to verify
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, classId: true, khmerName: true, firstName: true },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (student.classId !== id) {
      return res.status(400).json({
        success: false,
        message: "Student is not in this class",
      });
    }

    // ✅ Handle grades: Set classId to null so grades "follow" the student
    // When student joins a new class later, the assignStudents function
    // will find these unassigned grades and transfer them
    const gradesUpdated = await prisma.grade.updateMany({
      where: {
        studentId: studentId,
        classId: id,
      },
      data: {
        classId: null,
      },
    });

    console.log(
      `📚 Set ${gradesUpdated.count} grade(s) to unassigned for student ${student.khmerName || student.firstName}`
    );

    // Remove student from class
    await prisma.student.update({
      where: { id: studentId },
      data: {
        classId: null,
      },
    });

    console.log("✅ Student removed from class");
    res.json({
      success: true,
      message: "Student removed from class successfully",
      gradesHandled: gradesUpdated.count,
    });
  } catch (error: any) {
    console.error("❌ Error removing student:", error);
    res.status(500).json({
      success: false,
      message: "Error removing student",
      error: error.message,
    });
  }
};

/**
 * ✅ GET classes by grade (with optional track filter)
 */
export const getClassesByGrade = async (req: Request, res: Response) => {
  try {
    const { grade } = req.params;
    const { track } = req.query; // Optional: "science" | "social"

    console.log(`📚 GET CLASSES BY GRADE: ${grade}`, track ? `(${track})` : "");

    const whereClause: any = {
      grade: grade.toString(),
    };

    // ✅ Filter by track for grades 11-12
    if (track) {
      whereClause.track = track.toString();
    }

    const classes = await prisma.class.findMany({
      where: whereClause,
      include: {
        homeroomTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            khmerName: true,
            englishName: true,
            role: true,
          },
        },
        students: {
          select: {
            id: true,
            khmerName: true,
            firstName: true,
            lastName: true,
            gender: true,
          },
        },
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    console.log(`✅ Found ${classes.length} classes`);

    res.json(classes); // ✅ Return array directly (to match existing format)
  } catch (error: any) {
    console.error("❌ Error getting classes by grade:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching classes",
      error: error.message,
    });
  }
};
