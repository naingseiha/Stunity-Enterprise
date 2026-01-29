import { Router } from 'express';
import multer from 'multer';
import {
  getUserProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  likeProject,
  toggleFeatured
} from '../controllers/projects.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public routes (no auth required for viewing)
router.get('/:userId/projects', getUserProjects);
router.get('/projects/:projectId', getProjectById);

// Protected routes (require authentication)
router.use(authMiddleware);
router.post('/projects', upload.array('media', 10), createProject);
router.put('/projects/:projectId', upload.array('media', 10), updateProject);
router.delete('/projects/:projectId', deleteProject);
router.post('/projects/:projectId/like', likeProject);
router.post('/projects/:projectId/feature', toggleFeatured);

export default router;
