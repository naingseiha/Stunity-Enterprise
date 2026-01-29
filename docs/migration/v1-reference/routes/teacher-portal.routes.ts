import { Router } from "express";
import {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
} from "../controllers/teacher-portal.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Teacher portal routes
router.get("/profile", getMyProfile);
router.patch("/profile", updateMyProfile);
router.post("/change-password", changeMyPassword);

export default router;
