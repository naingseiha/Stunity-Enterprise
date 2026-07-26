import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const SERVICE_TOKEN = process.env.NOTIFICATION_SERVICE_AUTH_TOKEN;

const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
};

export const requireServiceAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!SERVICE_TOKEN) {
    return res.status(503).json({ success: false, error: 'Service authentication is not configured' });
  }
  const headerToken = req.headers['x-service-token'];
  const token = typeof headerToken === 'string' ? headerToken.trim() : '';

  if (!token || !safeEqual(token, SERVICE_TOKEN)) {
    return res.status(401).json({ success: false, error: 'Unauthorized service request' });
  }

  next();
};
