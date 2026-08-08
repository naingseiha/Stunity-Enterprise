/**
 * JWT Auth Middleware for AI Service
 *
 * Verifies access tokens with the shared issuer/audience/tokenUse profile.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../../lib/auth-tokens';
import { getJwtSecret } from '../../../lib/jwt-secret';

export interface AuthRequest extends Request {
    userId?: string;
    userRole?: string;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
    }

    try {
        const decoded = verifyAccessToken(token, getJwtSecret());
        req.userId = decoded.userId;
        req.userRole = typeof decoded.role === 'string' ? decoded.role : undefined;
        next();
    } catch {
        res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
}
