
import { Request, Response, NextFunction, RequestHandler } from 'express';
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

export const authenticateToken: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthRequest;
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            res.status(401).json({ success: false, error: 'Access token required' });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;

        authReq.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            schoolId: decoded.schoolId,
        };
        next();
    } catch (error: any) {
        console.error('❌ [AUTH] Token verification failed:', error.message);
        res.status(403).json({ success: false, error: 'Invalid token' });
    }
};
