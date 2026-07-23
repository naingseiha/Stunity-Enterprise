
import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { uploadMultipleToR2, isR2Configured, generatePresignedUploadUrl } from '../utils/r2';

const router = express.Router();

// -- Video storage (disk) --
const videoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const dir = path.join(__dirname, '../../uploads/videos');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        cb(null, `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`);
    },
});

const videoUpload = multer({
    storage: videoStorage,
    fileFilter: (_req, file, cb) => {
        const allowed = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
        cb(null, allowed.includes(file.mimetype));
    },
    limits: { fileSize: 100 * 1024 * 1024 },
});

// -- Image storage (memory for R2, disk fallback) --
const imageStorageDisk = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const dir = path.join(__dirname, '../../uploads/images');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        cb(null, `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`);
    },
});

const imageUploadMemory = multer({
    storage: multer.memoryStorage(),
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm'];
        cb(null, allowed.includes(file.mimetype));
    },
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
});

const imageUploadDisk = multer({
    storage: imageStorageDisk,
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm'];
        cb(null, allowed.includes(file.mimetype));
    },
    limits: { fileSize: 50 * 1024 * 1024 },
});

// ==========================================
// POST /upload — General file upload endpoint
// Accepts: multipart/form-data with field "files"
// Returns: { success: true, data: [{ url, key, filename }] }
// ==========================================
router.post('/upload', authenticateToken, (req: AuthRequest, res: Response, next) => {
    // Choose memory or disk based on R2 config
    const uploader = isR2Configured()
        ? imageUploadMemory.array('files', 10)
        : imageUploadDisk.array('files', 10);

    uploader(req, res, async (err) => {
        if (err) {
            console.error('❌ Multer upload error:', err);
            return res.status(400).json({ success: false, error: err.message || 'Upload failed' });
        }

        try {
            const files = req.files as Express.Multer.File[];
            if (!files || files.length === 0) {
                return res.status(400).json({ success: false, error: 'No files provided' });
            }

            console.log(`📤 Uploading ${files.length} file(s)...`);

            let results: { url: string; key: string; filename: string; width?: number; height?: number; blurHash?: string }[];

            if (isR2Configured()) {
                // Upload to R2
                const r2Files = files.map(f => ({
                    buffer: f.buffer,
                    originalname: f.originalname,
                    mimetype: f.mimetype,
                }));
                const r2Results = await uploadMultipleToR2(r2Files, 'posts');
                results = r2Results.map(r => ({
                    ...r,
                    filename: r.key.split('/').pop() || r.key,
                }));
                console.log('✅ Files uploaded to R2:', results.map(r => `${r.url} (${r.width}x${r.height})`));
            } else {
                // Fallback: store relative paths (resolved to absolute on read)
                results = files.map(f => ({
                    url: `/uploads/images/${f.filename}`,
                    key: `uploads/images/${f.filename}`,
                    filename: f.filename || f.originalname,
                }));
                console.log('✅ Files saved locally:', results.map(r => r.url));
            }

            return res.json({ success: true, data: results });
        } catch (error: any) {
            console.error('❌ Upload processing error:', error);
            return res.status(500).json({ success: false, error: 'Failed to process uploads' });
        }
    });
});

// ==========================================
// POST /upload/video — Video upload endpoint
// ==========================================
router.post('/upload/video', authenticateToken, videoUpload.single('video'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No video file provided' });
        }

        const videoUrl = `/uploads/videos/${req.file.filename}`;
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
        res.status(500).json({ success: false, error: 'Failed to upload video' });
    }
});

// ==========================================
// POST /presigned-url — Generate direct upload tickets for R2
// Accepts: { requests: [{ originalName, mimeType }] }
// Returns: { success: true, data: [{ presignedUrl, key, publicUrl, expiresAt }] }
// ==========================================
router.post('/presigned-url', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        if (!isR2Configured()) {
            return res.status(503).json({ success: false, error: 'R2 storage is not configured' });
        }

        const { requests } = req.body;

        if (!requests || !Array.isArray(requests) || requests.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid requests payload' });
        }

        // Prevent abuse: max 10 tickets per request
        if (requests.length > 10) {
            return res.status(400).json({ success: false, error: 'Too many files requested at once' });
        }

        const urls = await Promise.all(
            requests.map(async (reqItem: any) => {
                const { originalName, mimeType } = reqItem;
                if (!originalName || !mimeType) {
                    throw new Error('Missing originalName or mimeType in request item');
                }
                return generatePresignedUploadUrl(originalName, mimeType, 'posts');
            })
        );

        res.json({ success: true, data: urls });
    } catch (error: any) {
        console.error('❌ Presigned URL generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate upload urls' });
    }
});

export default router;
