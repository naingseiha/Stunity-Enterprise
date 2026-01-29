import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// All dashboard routes require authentication
router.use(authMiddleware);

// Get general dashboard statistics (Admin/Teacher)
router.get("/stats", DashboardController.getDashboardStats);

// Get teacher-specific dashboard
router.get("/teacher/:teacherId", DashboardController.getTeacherDashboard);

// Get student-specific dashboard
router.get("/student/:studentId", DashboardController.getStudentDashboard);

// Get grade-level statistics (for grades 7-12)
router.get("/grade-stats", DashboardController.getGradeLevelStats);

// Get lightweight mobile dashboard stats (faster initial load)
router.get("/mobile-stats", DashboardController.getMobileDashboardStats);

// Get comprehensive statistics with month/year filter and gender breakdown
router.get("/comprehensive-stats", DashboardController.getComprehensiveStats);

// Get score import progress dashboard
router.get("/score-progress", DashboardController.getScoreProgress);

export default router;
