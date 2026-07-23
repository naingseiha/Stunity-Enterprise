import { Router } from 'express';
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcementController';

const router = Router();

router.get('/clubs/:clubId/announcements', getAnnouncements);
router.post('/clubs/:clubId/announcements', createAnnouncement);
router.delete('/:id', deleteAnnouncement);

export default router;
