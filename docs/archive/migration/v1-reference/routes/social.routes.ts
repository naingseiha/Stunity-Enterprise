import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowSuggestions,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/social.controller";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Follow system
router.post("/follow/:userId", followUser);
router.delete("/follow/:userId", unfollowUser);
router.get("/followers", getFollowers);
router.get("/following", getFollowing);
router.get("/suggestions", getFollowSuggestions);

// Notifications
router.get("/notifications", getNotifications);
router.put("/notifications/:notificationId/read", markNotificationRead);
router.put("/notifications/read-all", markAllNotificationsRead);

export default router;
