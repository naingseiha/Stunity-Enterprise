import { Router } from "express";
import { ReportController } from "../controllers/report.controller";

const router = Router();

/**
 * @route   GET /api/reports/monthly/:classId
 * @desc    Get monthly report for a specific class
 */
router.get("/monthly/:classId", ReportController.getMonthlyReport);

/**
 * @route   GET /api/reports/grade-wide/:grade
 * @desc    Get grade-wide report (all classes combined)
 */
router.get("/grade-wide/:grade", ReportController.getGradeWideReport);

/**
 * @route   GET /api/reports/tracking-book/:classId
 * @desc    Get student tracking book (all months)
 */
router.get("/tracking-book/:classId", ReportController.getStudentTrackingBook);

/**
 * @route   GET /api/reports/monthly-statistics/:classId
 * @desc    Get monthly statistics for a specific class
 */
router.get(
  "/monthly-statistics/:classId",
  ReportController.getMonthlyStatistics
);

export default router;
