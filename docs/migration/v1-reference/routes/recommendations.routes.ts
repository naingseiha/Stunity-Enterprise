import { Router } from 'express';
import {
  getUserRecommendations,
  writeRecommendation,
  acceptRecommendation,
  deleteRecommendation
} from '../controllers/recommendations.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes can optionally have auth (for checking if viewing own profile)
router.get('/:userId/recommendations', getUserRecommendations);

// Protected routes - require authentication
router.use(authMiddleware);
router.post('/recommendations', writeRecommendation);
router.put('/recommendations/:recommendationId/accept', acceptRecommendation);
router.delete('/recommendations/:recommendationId', deleteRecommendation);

export default router;
