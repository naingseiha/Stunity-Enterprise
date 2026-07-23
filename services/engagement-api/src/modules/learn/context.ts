/**
 * Shared Application Context - Learn Service
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });
dotenv.config();

import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { normalizePrismaUrlForComparison, withPrismaPoolParams } from '../../../../lib/prisma-pool-url';
import { getPooledPrismaClient } from '../../../../lib/prisma-client';

// ─── Prisma (primary — read/write) ─────────────────────────────────
// One process-wide pooled client, shared with every other engagement module.
const databaseUrl = process.env.DATABASE_URL || '';

export const prisma = getPooledPrismaClient();

// ─── Prisma (read replica — read-only queries) ─────────────────────
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

// ─── Multer (file uploads) ─────────────────────────────────────────
export const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB for video uploads in courses
        files: 5,
    },
    fileFilter: (_req, file, cb) => {
        const allowedMimes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm',
            'application/pdf',
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type. ${file.mimetype} is not allowed.`));
        }
    },
});
