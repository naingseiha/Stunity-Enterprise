import { Router } from "express";
import {
  login,
  getCurrentUser,
  refreshToken,
  getPasswordStatus,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🔧 Registering AUTH routes...");

// Public routes
router.post(
  "/login",
  (req, res, next) => {
    console.log("📥 POST /api/auth/login called");
    next();
  },
  login
);

router.post(
  "/refresh",
  (req, res, next) => {
    console.log("📥 POST /api/auth/refresh called");
    next();
  },
  refreshToken
);

// Protected routes
router.get(
  "/me",
  (req, res, next) => {
    console.log("📥 GET /api/auth/me called");
    next();
  },
  authMiddleware,
  getCurrentUser
);

router.get(
  "/password-status",
  (req, res, next) => {
    console.log("📥 GET /api/auth/password-status called");
    next();
  },
  authMiddleware,
  getPasswordStatus
);

console.log("✅ Auth routes registered:");
console.log("  - POST /api/auth/login");
console.log("  - POST /api/auth/refresh");
console.log("  - GET  /api/auth/me");
console.log("  - GET  /api/auth/password-status");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

export default router;
