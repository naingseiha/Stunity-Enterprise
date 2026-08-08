import { getJwtSecret } from '../../../../../lib/jwt-secret';
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../auth/security/tokenClaims';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET must be set in production. Refusing to start.');
}
const JWT_SECRET = getJwtSecret();

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
            console.log('❌ [AUTH] No token provided');
            return res.status(401).json({ success: false, error: 'Access token required' });
        }

        // console.log('🔐 [AUTH] Verifying token for:', req.method, req.path);

        const decoded = verifyAccessToken(token, JWT_SECRET);

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
