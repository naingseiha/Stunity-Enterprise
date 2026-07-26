import { getJwtSecret } from '../../../../../lib/jwt-secret';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../context';

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
        const headerToken = authHeader && authHeader.split(' ')[1];
        const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
        const token = headerToken || queryToken;

        if (!token) {
            console.log('❌ [AUTH] No token provided');
            return res.status(401).json({ success: false, error: 'Access token required' });
        }

        // console.log('🔐 [AUTH] Verifying token for:', req.method, req.path);

        const decoded = jwt.verify(token, JWT_SECRET) as any;

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                role: true,
                schoolId: true,
                isActive: true,
                schoolAccessVersion: true,
                passwordChangedAt: true,
                school: { select: { isActive: true } },
            },
        });

        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, error: 'User not found or inactive' });
        }

        const tokenSchoolAccessVersion = Number.isInteger(decoded.schoolAccessVersion)
            ? decoded.schoolAccessVersion
            : 0;
        if (tokenSchoolAccessVersion !== user.schoolAccessVersion) {
            return res.status(401).json({
                success: false,
                code: 'SCHOOL_ACCESS_CHANGED',
                error: 'School access changed. Please sign in again.',
            });
        }

        if (user.passwordChangedAt && decoded.iat) {
            const changedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
            if (decoded.iat < changedTimestamp) {
                return res.status(401).json({
                    success: false,
                    error: 'Password changed. Please sign in again.',
                });
            }
        }

        if (user.schoolId && user.school && !user.school.isActive) {
            return res.status(403).json({ success: false, error: 'School account is inactive' });
        }

        req.user = {
            id: user.id,
            email: user.email || '',
            role: user.role,
            schoolId: user.schoolId || '',
        };
        next();
    } catch (error: any) {
        console.error('❌ [AUTH] Token verification failed:', error.message);
        return res.status(403).json({ success: false, error: 'Invalid token' });
    }
};
