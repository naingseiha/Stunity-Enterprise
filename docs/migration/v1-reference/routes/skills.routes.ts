import { Router } from 'express';
import {
  getUserSkills,
  addSkill,
  updateSkill,
  deleteSkill,
  endorseSkill
} from '../controllers/skills.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Skills routes
router.get('/:userId/skills', getUserSkills);
router.post('/skills', addSkill);
router.put('/skills/:skillId', updateSkill);
router.delete('/skills/:skillId', deleteSkill);
router.post('/skills/:skillId/endorse', endorseSkill);

export default router;
