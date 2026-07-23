import { Router } from 'express';
import {
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  deleteSession
} from '../controllers/sessionController';

const router = Router();

// Session routes
router.post('/clubs/:clubId/sessions', createSession);
router.get('/clubs/:clubId/sessions', getSessions);
router.get('/sessions/:id', getSessionById);
router.put('/sessions/:id', updateSession);
router.delete('/sessions/:id', deleteSession);

export default router;
