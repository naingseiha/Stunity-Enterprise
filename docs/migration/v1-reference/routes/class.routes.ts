import { Router } from "express";
import {
  getAllClasses,
  getClassesLightweight,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  assignStudentsToClass,
  removeStudentFromClass,
  getClassesByGrade,
} from "../controllers/class.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get("/lightweight", authenticate, getClassesLightweight); // GET classes (lightweight - fast)
router.get("/", authenticate, getAllClasses);
router.get("/grade/:grade", authenticate, getClassesByGrade);
router.get("/:id", authenticate, getClassById);
router.post("/", authenticate, authorize("ADMIN"), createClass);
router.put("/:id", authenticate, authorize("ADMIN"), updateClass);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteClass);
router.post("/:id/assign-students", assignStudentsToClass);
router.delete("/:id/students/:studentId", removeStudentFromClass);

export default router;
