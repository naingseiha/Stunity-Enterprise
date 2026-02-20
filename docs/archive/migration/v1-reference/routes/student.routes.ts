import { Router } from "express";
import {
  getAllStudents,
  getStudentsLightweight,
  getStudentById,
  createStudent,
  bulkCreateStudents,
  updateStudent,
  deleteStudent,
} from "../controllers/student.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

router.get("/lightweight", getStudentsLightweight); // GET students (lightweight - fast)
router.get("/", getAllStudents);
router.get("/:id", getStudentById);
router.post("/", createStudent);
router.post("/bulk", bulkCreateStudents);
router.put("/:id", updateStudent);
router.delete("/:id", deleteStudent);

export default router;
