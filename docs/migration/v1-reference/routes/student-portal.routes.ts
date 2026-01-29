import { Router } from "express";
import {
  getMyProfile,
  getMyGrades,
  getMyAttendance,
  changeMyPassword,
  updateMyProfile,
  getMonthlySummaries,
} from "../controllers/student-portal.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Student portal routes
router.get("/profile", getMyProfile);
router.get("/grades", getMyGrades);
router.get("/monthly-summaries", getMonthlySummaries);
router.get("/attendance", getMyAttendance);
router.post("/change-password", changeMyPassword);
router.put("/profile", updateMyProfile);

export default router;
