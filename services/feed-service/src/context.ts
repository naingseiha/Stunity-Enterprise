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
import { normalizePrismaUrlForComparison, withPrismaPoolParams } from '../../lib/prisma-pool-url';

// ─── Prisma (primary — read/write) ─────────────────────────────────
const databaseUrl = process.env.DATABASE_URL || '';
const pooledUrl = withPrismaPoolParams(databaseUrl) ?? databaseUrl;

export const prisma = new PrismaClient({
    datasources: { db: { url: pooledUrl } },
    log: ['error', 'warn'],
});

// ─── Prisma (read replica — read-only queries) ─────────────────────
// One client when no dedicated read URL — avoids doubling pooler slots on Micro.
const readUrlRaw = process.env.DATABASE_READ_URL?.trim();
const useDedicatedReadReplica = Boolean(
    readUrlRaw &&
    normalizePrismaUrlForComparison(readUrlRaw) !== normalizePrismaUrlForComparison(databaseUrl)
);
const readUrl = withPrismaPoolParams(readUrlRaw || databaseUrl) ?? databaseUrl;

export const prismaRead = useDedicatedReadReplica
    ? new PrismaClient({
        datasources: { db: { url: readUrl } },
        log: ['error', 'warn'],
    })
    : prisma;

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
