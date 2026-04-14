import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const DEFAULT_DEV_SERVICE_TOKEN = 'stunity-notification-dev-service-token';
const SERVICE_TOKEN = process.env.NOTIFICATION_SERVICE_AUTH_TOKEN || DEFAULT_DEV_SERVICE_TOKEN;

const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
};

export const requireServiceAuth = (req: Request, res: Response, next: NextFunction) => {
  const headerToken = req.headers['x-service-token'];
  const token = typeof headerToken === 'string' ? headerToken.trim() : '';

  if (!token || !safeEqual(token, SERVICE_TOKEN)) {
    return res.status(401).json({ success: false, error: 'Unauthorized service request' });
  }

  next();
};

