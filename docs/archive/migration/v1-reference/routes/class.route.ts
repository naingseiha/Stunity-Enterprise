import { Router } from "express";
import {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  assignStudentsToClass,
  removeStudentFromClass,
} from "../controllers/class.controller";

const router = Router();

// Class CRUD routes
router.get("/", getAllClasses);
router.get("/:id", getClassById);
router.post("/", createClass);
router.put("/:id", updateClass);
router.delete("/:id", deleteClass);

// Student assignment routes
router.post("/:id/assign-students", assignStudentsToClass);
router.delete("/:id/students/:studentId", removeStudentFromClass);

export default router;
