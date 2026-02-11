import { Router } from 'express';
import {
  createAward,
  getClubAwards,
  getMemberAwards,
  getAwardById,
  deleteAward
} from '../controllers/awardController';

const router = Router();

// Award routes
router.post('/clubs/:clubId/awards', createAward);
router.get('/clubs/:clubId/awards', getClubAwards);
router.get('/clubs/:clubId/members/:memberId/awards', getMemberAwards);
router.get('/awards/:id', getAwardById);
router.delete('/awards/:id', deleteAward);

export default router;
