import { Router } from "express";
import {
  exportStudentsByClass,
  downloadImportTemplate,
  getAvailableTemplates,
  previewExport,
  importStudentsFromExcel,
} from "../controllers/export.controller";

const router = Router();

/**
 * Export & Import Routes
 */

// Get available templates
router.get("/templates", getAvailableTemplates);

// Preview export settings
router.get("/preview/:classId", previewExport);

// Export students by class
router.post("/students/class/:classId", exportStudentsByClass);

// Download blank import template
router.get("/template/import/:classId", downloadImportTemplate);

// Upload and import students from Excel
router.post("/import/:classId", importStudentsFromExcel);

console.log("✅ Export routes loaded");

export default router;
