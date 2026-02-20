import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  profilePictureUpload,
  coverPhotoUpload,
} from "../middleware/upload.middleware";
import {
  uploadProfilePicture,
  deleteProfilePicture,
  uploadCoverPhoto,
  deleteCoverPhoto,
  updateBio,
  getUserProfile,
  getMyProfile,
  getProfileCompleteness,
} from "../controllers/profile.controller";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Profile picture routes
router.post("/picture", profilePictureUpload, uploadProfilePicture);
router.delete("/picture", deleteProfilePicture);

// Cover photo routes
router.post("/cover", coverPhotoUpload, uploadCoverPhoto);
router.delete("/cover", deleteCoverPhoto);

// Profile details routes
router.put("/bio", updateBio);
router.get("/me", getMyProfile);
router.get("/completeness", getProfileCompleteness);

// Public profile view (must be last due to :userId param)
router.get("/:userId", getUserProfile);

export default router;
