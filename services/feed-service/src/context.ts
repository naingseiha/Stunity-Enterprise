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
const appendQueryParam = (url: string, key: string, value: string) => {
    if (!value || new RegExp(`[?&]${key}=`).test(url)) return url;
    return `${url}${url.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(value)}`;
};

const withPrismaPoolParams = (rawUrl: string) => {
    if (!rawUrl) return rawUrl;

    const connectionLimit = process.env.PRISMA_CONNECTION_LIMIT ?? '20';
    const poolTimeout = process.env.PRISMA_POOL_TIMEOUT ?? '10';

    try {
        const parsedUrl = new URL(rawUrl);
        if (connectionLimit && !parsedUrl.searchParams.has('connection_limit')) {
            parsedUrl.searchParams.set('connection_limit', connectionLimit);
        }
        if (poolTimeout && !parsedUrl.searchParams.has('pool_timeout')) {
            parsedUrl.searchParams.set('pool_timeout', poolTimeout);
        }
        return parsedUrl.toString();
    } catch {
        return appendQueryParam(
            appendQueryParam(rawUrl, 'connection_limit', connectionLimit),
            'pool_timeout',
            poolTimeout
        );
    }
};

const pooledUrl = withPrismaPoolParams(databaseUrl);

export const prisma = new PrismaClient({
    datasources: { db: { url: pooledUrl } },
    log: ['error', 'warn'],
});

// ─── Prisma (read replica — read-only queries) ─────────────────────
// Falls back to primary when DATABASE_READ_URL is not set.
const readUrl = withPrismaPoolParams(process.env.DATABASE_READ_URL || databaseUrl);
export const prismaRead = new PrismaClient({
    datasources: { db: { url: readUrl } },
    log: ['error', 'warn'],
});

// ─── Feed Ranker ───────────────────────────────────────────────────
export const feedRanker = new FeedRanker(prisma, prismaRead);

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
