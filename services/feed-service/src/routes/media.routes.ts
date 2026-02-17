
import express from 'express';
import { upload, uploadVideo } from '../controllers/media.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Upload video endpoint
router.post('/upload/video', authenticateToken, upload.single('video'), uploadVideo);

export default router;
