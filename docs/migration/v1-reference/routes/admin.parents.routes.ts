import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import * as adminParentsController from "../controllers/admin.parents.controller";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Statistics
router.get("/statistics", adminParentsController.getParentStatistics);

// Parent CRUD operations
router.get("/", adminParentsController.getAllParents);
router.post("/create", adminParentsController.createParent);
router.put("/:id", adminParentsController.updateParent);
router.delete("/:id", adminParentsController.deleteParent);

// Account management
router.post("/create-account", adminParentsController.createParentAccount);
router.post("/reset-password", adminParentsController.resetParentPassword);
router.put("/:id/toggle-status", adminParentsController.toggleParentStatus);

// Parent-Student relationship management
router.post("/link-student", adminParentsController.linkParentToStudent);
router.delete("/unlink-student", adminParentsController.unlinkParentFromStudent);

export default router;
