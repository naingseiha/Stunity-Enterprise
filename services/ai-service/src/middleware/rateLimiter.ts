/**
 * AI Rate Limiter
 * 
 * Limits AI generation requests per user to prevent abuse.
 * Free Gemini tier: 1,500 req/day global → we allow 20/user/day.
 * 
 * The limit is keyed on userId extracted from JWT, not IP,
 * so VPNs or shared networks don't unfairly block users.
 */

import rateLimit from 'express-rate-limit';
import { AuthRequest } from './auth';

// ─── Per-User Daily AI Limit ──────────────────────────────────────
export const aiRateLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 20, // 20 AI calls per user per day (generous for education)
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use userId from JWT (set by auth middleware) for accurate per-user limiting
        return (req as AuthRequest).userId || req.ip || 'anonymous';
    },
    message: {
        success: false,
        error: 'Daily AI usage limit reached (20 requests/day). Please try again tomorrow.',
        code: 'AI_RATE_LIMIT',
    },
    skip: () => {
        // Skip rate limiting in test environment
        return process.env.NODE_ENV === 'test';
    },
});

// ─── Stricter Per-Minute Limiter ─────────────────────────────────
// Prevents burst attacks — max 5 AI calls per minute per user
export const aiMinuteLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req as AuthRequest).userId || req.ip || 'anonymous',
    message: {
        success: false,
        error: 'Too many AI requests. Please wait a moment.',
        code: 'AI_BURST_LIMIT',
    },
});
