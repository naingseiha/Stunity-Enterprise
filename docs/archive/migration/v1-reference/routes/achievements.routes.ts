import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  getAchievements,
  addAchievement,
  updateAchievement,
  deleteAchievement,
  getAchievementStats,
} from "../controllers/achievements.controller";

const router = Router();

// Public routes
router.get("/profile/:userId/achievements", getAchievements);
router.get("/profile/:userId/achievements/stats", getAchievementStats);

// Protected routes
router.post("/profile/achievements", authMiddleware, addAchievement);
router.put("/profile/achievements/:achievementId", authMiddleware, updateAchievement);
router.delete("/profile/achievements/:achievementId", authMiddleware, deleteAchievement);

export default router;
