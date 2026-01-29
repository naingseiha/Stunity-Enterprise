import { Request, Response } from "express";
import {
  ExcelTemplateService,
  ExportOptions,
} from "../services/excel-template.service";
import { ExcelImportService } from "../services/excel-import.service";
import multer from "multer";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Configure multer for file upload
const upload = multer({ storage: multer.memoryStorage() });

/**
 * ✅ Download blank import template
 */
export const downloadImportTemplate = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const { schoolName, provinceName, academicYear } = req.query;

    console.log("📥 Import template request for class:", classId);

    // Get class info
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        name: true,
        academicYear: true,
      },
    });

    const buffer = await ExcelTemplateService.generateImportTemplate(classId, {
      schoolName: (schoolName as string) || undefined,
      provinceName: (provinceName as string) || undefined,
      academicYear:
        (academicYear as string) || classData?.academicYear || "2024-2025",
      className: classData?.name || "ថ្នាក់",
      sampleRows: 5,
    });

    const filename = `Import_Template_${classId}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);

    res.send(buffer);
  } catch (error: any) {
    console.error("❌ Template generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate template",
      error: error.message,
    });
  }
};

/**
 * ✅ Upload and import students from Excel
 */
export const importStudentsFromExcel = [
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const { classId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      console.log("📤 Processing upload:", file.originalname);

      // Parse Excel file
      const students = await ExcelImportService.parseImportFile(file.buffer);

      if (students.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid student data found in file",
        });
      }

      // Import to database
      const result = await ExcelImportService.importStudents(classId, students);

      res.json({
        success: result.success,
        message: `Imported ${result.validRows} students successfully`,
        data: result,
      });
    } catch (error: any) {
      console.error("❌ Import error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to import students",
        error: error.message,
      });
    }
  },
];

/**
 * ✅ Export students by class to Excel
 */
export const exportStudentsByClass = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;

    const options: ExportOptions = {
      classId,
      schoolName: req.body.schoolName,
      provinceName: req.body.provinceName,
      academicYear: req.body.academicYear,
      directorDetails: req.body.directorDetails,
      instructorDetails: req.body.instructorDetails,
      classInstructor: req.body.classInstructor,
      examSession: req.body.examSession,
      examCode: req.body.examCode,
      showExamInfo: req.body.showExamInfo || false,
      showPhoneNumber: req.body.showPhoneNumber !== false,
      showAddress: req.body.showAddress !== false,
      showStudentId: req.body.showStudentId !== false,
    };

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📥 Export Request:", {
      classId,
      schoolName: options.schoolName,
      provinceName: options.provinceName,
      academicYear: options.academicYear,
    });

    const buffer = await ExcelTemplateService.exportStudentsByClass(options);

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `Students_${classId}_${timestamp}.xlsx`;

    console.log(`📤 Sending file: ${filename} (${buffer.length} bytes)`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);

    res.send(buffer);
  } catch (error: any) {
    console.error("❌ Export error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export students",
      error: error.message,
    });
  }
};

/**
 * ✅ Get available export templates
 */
export const getAvailableTemplates = async (req: Request, res: Response) => {
  try {
    const templates = ExcelTemplateService.getAvailableTemplates();

    res.json({
      success: true,
      data: templates,
    });
  } catch (error: any) {
    console.error("❌ Get templates error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get templates",
      error: error.message,
    });
  }
};

/**
 * ✅ Preview export settings (without generating file)
 */
export const previewExport = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;

    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          select: {
            id: true,
            gender: true,
          },
        },
        homeroomTeacher: {
          select: {
            khmerName: true,
            firstName: true,
            lastName: true,
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

    const totalStudents = classData.students.length;
    const maleStudents = classData.students.filter(
      (s) => s.gender === "MALE"
    ).length;
    const femaleStudents = classData.students.filter(
      (s) => s.gender === "FEMALE"
    ).length;

    const instructorName =
      classData.homeroomTeacher?.khmerName ||
      (classData.homeroomTeacher
        ? `${classData.homeroomTeacher.firstName} ${classData.homeroomTeacher.lastName}`
        : "មិនទាន់កំណត់");

    res.json({
      success: true,
      data: {
        className: classData.name,
        grade: classData.grade,
        section: classData.section,
        academicYear: classData.academicYear || "2024-2025",
        totalStudents,
        maleStudents,
        femaleStudents,
        classInstructor: instructorName,
        suggestedFilename: `Students_${classData.name}_${
          new Date().toISOString().split("T")[0]
        }.xlsx`,
      },
    });
  } catch (error: any) {
    console.error("❌ Preview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to preview export",
      error: error.message,
    });
  }
};
