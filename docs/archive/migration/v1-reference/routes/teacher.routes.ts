import { Router } from "express";
import {
  getAllTeachers,
  getTeachersLightweight,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  bulkCreateTeachers,
  bulkUpdateTeachers,
} from "../controllers/teacher.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// ✅ Apply authentication middleware to all routes
router.use(authMiddleware);

// ✅ Teacher routes
router.get("/lightweight", getTeachersLightweight); // GET teachers (lightweight - fast)
router.get("/", getAllTeachers); // GET all teachers (full data)
router.get("/:id", getTeacherById); // GET single teacher
router.post("/", createTeacher); // CREATE teacher
router.post("/bulk", bulkCreateTeachers); // BULK CREATE teachers
router.put("/bulk", bulkUpdateTeachers); // BULK UPDATE teachers (optimized)
router.put("/:id", updateTeacher); // UPDATE teacher
router.delete("/:id", deleteTeacher); // DELETE teacher

export default router;
