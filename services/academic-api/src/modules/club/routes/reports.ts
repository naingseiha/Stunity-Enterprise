import { Router } from 'express';
import {
  generateMemberReport,
  generateClubReport,
  getMemberTranscript
} from '../controllers/reportController';

const router = Router();

// Report routes
router.get('/clubs/:clubId/members/:memberId/report', generateMemberReport);
router.get('/clubs/:clubId/report', generateClubReport);
router.get('/clubs/:clubId/members/:memberId/transcript', getMemberTranscript);

export default router;
