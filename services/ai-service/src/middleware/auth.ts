/**
 * JWT Auth Middleware for AI Service
 * 
 * Verifies the same JWT issued by auth-service using the shared JWT_SECRET.
 * Extracts userId and role from the token payload.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        res.status(500).json({ success: false, error: 'Server configuration error' });
        return;
    }

    try {
        const decoded = jwt.verify(token, secret) as { userId: string; role?: string; id?: string };
        req.userId = decoded.userId || decoded.id;
        req.userRole = decoded.role;
        next();
    } catch {
        res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
}
