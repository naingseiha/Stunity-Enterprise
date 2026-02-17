
import { Router } from 'express';
import { registerDeviceToken, sendNotification } from '../controllers/notification.controller';

const router = Router();

router.post('/device-token', registerDeviceToken);
router.post('/send', sendNotification);

export default router;
