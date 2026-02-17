
import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/videos');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    },
});

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only video files are allowed.'));
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    },
});

export const uploadVideo = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No video file provided' });
        }

        // In a real production app, we would upload to S3/R2 here
        // For now, we return the local path relative to the static server
        const videoUrl = `/uploads/videos/${req.file.filename}`;

        // Generate thumbnail (mock for now, real implementation would use ffmpeg)
        const thumbnailUrl = '/assets/video-placeholder.png';

        res.json({
            success: true,
            data: {
                url: videoUrl,
                thumbnailUrl,
                filename: req.file.filename,
                mimetype: req.file.mimetype,
                size: req.file.size,
            },
        });
    } catch (error: any) {
        console.error('Video upload error:', error);
        res.status(500).json({ success: false, error: 'Failed to upload video' });
    }
};
