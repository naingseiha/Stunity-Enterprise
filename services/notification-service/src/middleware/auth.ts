import { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyAccessToken } from '../../../lib/auth-tokens';
import { getJwtSecret } from '../../../lib/jwt-secret';

const JWT_SECRET = getJwtSecret();

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

        const decoded = verifyAccessToken(token, JWT_SECRET);

        authReq.user = {
            id: decoded.userId,
            email: typeof decoded.email === 'string' ? decoded.email : '',
            role: typeof decoded.role === 'string' ? decoded.role : '',
            schoolId: typeof decoded.schoolId === 'string' ? decoded.schoolId : '',
        };
        next();
    } catch (error: any) {
        console.error('❌ [AUTH] Token verification failed:', error.message);
        res.status(403).json({ success: false, error: 'Invalid token' });
    }
};
