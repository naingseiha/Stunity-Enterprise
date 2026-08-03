import { timingSafeEqual } from 'crypto';
import { NextFunction, Request, Response } from 'express';

function configuredToken(): string {
  return process.env.NOTIFICATION_SERVICE_AUTH_TOKEN?.trim() || '';
}

export function requireInternalServiceToken(req: Request, res: Response, next: NextFunction): void {
  const expected = configuredToken();
  const supplied = String(req.headers['x-service-token'] || '').trim();

  if (!expected) {
    res.status(503).json({ success: false, error: 'Internal service authentication is not configured' });
    return;
  }

  const expectedBytes = Buffer.from(expected, 'utf8');
  const suppliedBytes = Buffer.from(supplied, 'utf8');
  const valid = expectedBytes.length === suppliedBytes.length
    && suppliedBytes.length > 0
    && timingSafeEqual(expectedBytes, suppliedBytes);

  if (!valid) {
    res.status(401).json({ success: false, error: 'Service authentication required' });
    return;
  }

  next();
}
