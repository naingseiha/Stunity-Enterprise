import { Router } from "express";
import {
  getSecurityDashboard,
  getTeacherSecurityList,
  forcePasswordReset,
  extendExpiration,
  toggleAccountSuspension,
  getAuditLogs,
} from "../controllers/admin-security.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🔧 Registering ADMIN SECURITY routes...");

// All routes require authentication
router.use(authMiddleware);

// Get security dashboard
router.get(
  "/dashboard",
  (req, res, next) => {
    console.log("📥 GET /api/admin/security/dashboard called");
    next();
  },
  getSecurityDashboard
);

// Get teacher security list
router.get(
  "/teachers",
  (req, res, next) => {
    console.log("📥 GET /api/admin/security/teachers called");
    next();
  },
  getTeacherSecurityList
);

// Force password reset
router.post(
  "/force-reset",
  (req, res, next) => {
    console.log("📥 POST /api/admin/security/force-reset called");
    next();
  },
  forcePasswordReset
);

// Extend password expiration
router.post(
  "/extend-expiration",
  (req, res, next) => {
    console.log("📥 POST /api/admin/security/extend-expiration called");
    next();
  },
  extendExpiration
);

// Toggle account suspension
router.post(
  "/toggle-suspension",
  (req, res, next) => {
    console.log("📥 POST /api/admin/security/toggle-suspension called");
    next();
  },
  toggleAccountSuspension
);

// Get audit logs
router.get(
  "/audit-logs",
  (req, res, next) => {
    console.log("📥 GET /api/admin/security/audit-logs called");
    next();
  },
  getAuditLogs
);

console.log("✅ Admin Security routes registered:");
console.log("  - GET  /api/admin/security/dashboard");
console.log("  - GET  /api/admin/security/teachers");
console.log("  - POST /api/admin/security/force-reset");
console.log("  - POST /api/admin/security/extend-expiration");
console.log("  - POST /api/admin/security/toggle-suspension");
console.log("  - GET  /api/admin/security/audit-logs");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

export default router;
