import { Router } from 'express';
import {
  getUserExperiences,
  addExperience,
  updateExperience,
  deleteExperience
} from '../controllers/experiences.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public route - anyone can view experiences
router.get('/:userId/experiences', getUserExperiences);

// Protected routes - require authentication
router.use(authMiddleware);
router.post('/experiences', addExperience);
router.put('/experiences/:experienceId', updateExperience);
router.delete('/experiences/:experienceId', deleteExperience);

export default router;
