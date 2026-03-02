/**
 * Shared Application Context
 * 
 * Singleton exports used by all route modules.
 * Keeps Prisma, FeedRanker, and multer in one place.
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { FeedRanker } from './feedRanker';

// ─── Prisma (primary — read/write) ─────────────────────────────────
const databaseUrl = process.env.DATABASE_URL || '';
const pooledUrl = databaseUrl.includes('?')
    ? `${databaseUrl}&connection_limit=20&pool_timeout=10`
    : `${databaseUrl}?connection_limit=20&pool_timeout=10`;

export const prisma = new PrismaClient({
    datasources: { db: { url: pooledUrl } },
    log: ['error', 'warn'],
});

// ─── Prisma (read replica — read-only queries) ─────────────────────
// Falls back to primary when DATABASE_READ_URL is not set.
const readUrl = process.env.DATABASE_READ_URL || pooledUrl;
export const prismaRead = new PrismaClient({
    datasources: { db: { url: readUrl } },
    log: ['error', 'warn'],
});

// ─── Feed Ranker ───────────────────────────────────────────────────
export const feedRanker = new FeedRanker(prisma);

// ─── Multer (file uploads) ─────────────────────────────────────────
export const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB to support short videos
        files: 10,
    },
    fileFilter: (_req, file, cb) => {
        const allowedMimes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type. ${file.mimetype} is not allowed.`));
        }
    },
});
