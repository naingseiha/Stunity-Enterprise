import { Router } from "express";
import {
  getAdminAccounts,
  getAdminStatistics,
  updateAdminPassword,
  createAdminAccount,
  toggleAdminStatus,
  deleteAdminAccount,
  getAvailablePermissions,
  getAdminPermissions,
  updateAdminPermissions,
  setSuperAdmin,
} from "../controllers/admin-management.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { adminMiddleware } from "../middleware/admin.middleware";

const router = Router();

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🔧 Registering ADMIN MANAGEMENT routes...");

// All routes require authentication + admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// Admin Account Management
router.get("/admins", getAdminAccounts);
router.get("/admins/statistics", getAdminStatistics);
router.post("/admins", createAdminAccount);
router.put("/admins/:adminId/password", updateAdminPassword);
router.put("/admins/:adminId/status", toggleAdminStatus);
router.delete("/admins/:adminId", deleteAdminAccount);

// Permission Management
router.get("/permissions/available", getAvailablePermissions);
router.get("/admins/:adminId/permissions", getAdminPermissions);
router.put("/admins/:adminId/permissions", updateAdminPermissions);
router.put("/admins/:adminId/super-admin", setSuperAdmin);

console.log("✅ Admin management routes registered:");
console.log("  - GET    /api/admin/admins");
console.log("  - GET    /api/admin/admins/statistics");
console.log("  - POST   /api/admin/admins");
console.log("  - PUT    /api/admin/admins/:adminId/password");
console.log("  - PUT    /api/admin/admins/:adminId/status");
console.log("  - DELETE /api/admin/admins/:adminId");
console.log("  - GET    /api/admin/permissions/available");
console.log("  - GET    /api/admin/admins/:adminId/permissions");
console.log("  - PUT    /api/admin/admins/:adminId/permissions");
console.log("  - PUT    /api/admin/admins/:adminId/super-admin");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

export default router;
