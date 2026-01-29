import { Router } from "express";
import {
  getAllSubjects,
  getSubjectsLightweight,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  assignTeachersToSubject,
  removeTeacherFromSubject,
  getSubjectsByGrade,
} from "../controllers/subject.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Subject CRUD routes
router.get("/lightweight", getSubjectsLightweight); // GET subjects (lightweight - fast)
router.get("/", getAllSubjects);
router.get("/grade/:grade", getSubjectsByGrade);
router.get("/:id", getSubjectById);
router.post("/", createSubject);
router.put("/:id", updateSubject);
router.delete("/:id", deleteSubject);

// Teacher assignment routes
router.post("/:id/assign-teachers", assignTeachersToSubject);
router.delete("/:id/teachers/:teacherId", removeTeacherFromSubject);

export default router;
