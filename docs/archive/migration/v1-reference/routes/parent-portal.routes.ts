import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import * as parentPortalController from "../controllers/parent-portal.controller";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Parent profile and info
router.get("/profile", parentPortalController.getProfile);
router.put("/profile", parentPortalController.updateProfile);

// Children list
router.get("/children", parentPortalController.getChildren);

// Child-specific data (requires studentId param)
router.get(
  "/child/:studentId/grades",
  parentPortalController.getChildGrades
);
router.get(
  "/child/:studentId/attendance",
  parentPortalController.getChildAttendance
);
router.get(
  "/child/:studentId/monthly-summaries",
  parentPortalController.getChildMonthlySummaries
);
router.get(
  "/child/:studentId/performance",
  parentPortalController.getChildPerformance
);

// Password management
router.post("/change-password", parentPortalController.changePassword);

export default router;
