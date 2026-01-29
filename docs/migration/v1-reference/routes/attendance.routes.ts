import { Router } from "express";
import { AttendanceController } from "../controllers/attendance.controller";

const router = Router();

/**
 * @route   GET /api/attendance/grid/:classId
 * @desc    Get attendance grid for a month
 */
router.get("/grid/:classId", AttendanceController.getAttendanceGrid);

/**
 * @route   POST /api/attendance/bulk-save
 * @desc    Bulk save attendance
 */
router.post("/bulk-save", AttendanceController.bulkSaveAttendance);

/**
 * @route   GET /api/attendance/summary/:classId
 * @desc    Get monthly attendance summary (for grade entry)
 */
router.get("/summary/:classId", AttendanceController.getMonthlySummary);

export default router;
