
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        schoolId: string;
    };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ success: false, error: 'Access token required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;

        req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            schoolId: decoded.schoolId,
        };
        next();
    } catch (error: any) {
        console.error('❌ [AUTH] Token verification failed:', error.message);
        return res.status(403).json({ success: false, error: 'Invalid token' });
    }
};
