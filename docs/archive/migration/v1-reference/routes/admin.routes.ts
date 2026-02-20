import { Router } from "express";
import {
  getAccountStatistics,
  deactivateAllStudents,
  deactivateStudentsByGrade,
  deactivateStudentsByClass,
  activateStudents,
  createStudentAccount,
  resetStudentPassword,
  updateStudentRole,
} from "../controllers/admin.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { adminMiddleware } from "../middleware/admin.middleware";

const router = Router();

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🔧 Registering ADMIN routes...");

// All admin routes require authentication + admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// Account Management Statistics
router.get("/accounts/statistics", getAccountStatistics);

// Bulk Account Deactivation
router.post("/accounts/deactivate-all", deactivateAllStudents);
router.post("/accounts/deactivate-by-grade", deactivateStudentsByGrade);
router.post("/accounts/deactivate-by-class", deactivateStudentsByClass);

// Bulk Account Activation
router.post("/accounts/activate", activateStudents);

// Student Account Management
router.post("/students/create-account", createStudentAccount);
router.post("/students/reset-password", resetStudentPassword);
router.post("/students/update-role", updateStudentRole);

console.log("✅ Admin routes registered:");
console.log("  - GET  /api/admin/accounts/statistics");
console.log("  - POST /api/admin/accounts/deactivate-all");
console.log("  - POST /api/admin/accounts/deactivate-by-grade");
console.log("  - POST /api/admin/accounts/deactivate-by-class");
console.log("  - POST /api/admin/accounts/activate");
console.log("  - POST /api/admin/students/create-account");
console.log("  - POST /api/admin/students/reset-password");
console.log("  - POST /api/admin/students/update-role");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

export default router;
