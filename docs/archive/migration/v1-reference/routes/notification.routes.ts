import { Router } from "express";
import { authenticate } from "../middleware/auth";
import * as notificationController from "../controllers/notification.controller";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get notifications
router.get("/", notificationController.getNotifications);

// Get unread count
router.get("/unread-count", notificationController.getUnreadCount);

// Mark notification as read
router.put("/:id/read", notificationController.markAsRead);

// Mark all as read
router.put("/read-all", notificationController.markAllAsRead);

// Delete notification
router.delete("/:id", notificationController.deleteNotification);

export default router;
