import { Router } from "express";
import {
  getAllGrades,
  getGradeById,
  getGradesByStudent,
  getGradesByClass,
  getGradesBySubject,
  createGrade,
  updateGrade,
  deleteGrade,
} from "../controllers/grade.controller";
import { GradeController } from "../controllers/grade.controller";

const router = Router();

// ==================== FILE UPLOAD & IMPORT ====================

/**
 * @route   POST /api/grades/import/:classId
 * @desc    Import grades from Excel
 * @access  Private
 */
router.post(
  "/import/:classId",
  GradeController.uploadMiddleware,
  GradeController.importGrades
);

/**
 * @route   GET /api/grades/month/:classId
 * @desc    Get grades by month
 * @access  Private
 */
router.get("/month/:classId", GradeController.getGradesByMonth);

/**
 * @route   GET /api/grades/summary/:classId
 * @desc    Get monthly summary
 * @access  Private
 */
router.get("/summary/:classId", GradeController.getMonthlySummary);

// ==================== NEW: BULK SAVE ====================

/**
 * @route   POST /api/grades/bulk-save
 * @desc    Bulk save/update grades
 * @access  Private
 */
router.post("/bulk-save", GradeController.bulkSaveGrades);

/**
 * @route   GET /api/grades/grid/:classId
 * @desc    Get grades in grid format for editing
 * @access  Private
 */
router.get("/grid/:classId", GradeController.getGradesGrid);

// ==================== GRADE CONFIRMATION ROUTES ====================

/**
 * @route   POST /api/grades/confirm
 * @desc    Confirm grades for a class/subject/month/year
 * @access  Private
 */
router.post("/confirm", GradeController.confirmGrades);

/**
 * @route   GET /api/grades/confirmations/:classId
 * @desc    Get all confirmations for a class
 * @access  Private
 */
router.get("/confirmations/:classId", GradeController.getConfirmations);

/**
 * @route   DELETE /api/grades/confirm/:id
 * @desc    Remove grade confirmation
 * @access  Private
 */
router.delete("/confirm/:id", GradeController.removeConfirmation);

// ==================== EXISTING ROUTES ====================

/**
 * @route   GET /api/grades
 * @desc    Get all grades
 * @access  Private
 */
router.get("/", getAllGrades);

/**
 * @route   GET /api/grades/:id
 * @desc    Get grade by ID
 * @access  Private
 */
router.get("/:id", getGradeById);

/**
 * @route   GET /api/grades/student/:studentId
 * @desc    Get grades by student
 * @access  Private
 */
router.get("/student/:studentId", getGradesByStudent);

/**
 * @route   GET /api/grades/class/:classId
 * @desc    Get grades by class
 * @access  Private
 */
router.get("/class/:classId", getGradesByClass);

/**
 * @route   GET /api/grades/subject/:subjectId
 * @desc    Get grades by subject
 * @access  Private
 */
router.get("/subject/:subjectId", getGradesBySubject);

/**
 * @route   POST /api/grades
 * @desc    Create new grade
 * @access  Private
 */
router.post("/", createGrade);

/**
 * @route   PUT /api/grades/:id
 * @desc    Update grade
 * @access  Private
 */
router.put("/:id", updateGrade);

/**
 * @route   DELETE /api/grades/:id
 * @desc    Delete grade
 * @access  Private
 */
router.delete("/:id", deleteGrade);

export default router;
