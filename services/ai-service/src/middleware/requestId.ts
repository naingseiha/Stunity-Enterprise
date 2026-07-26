import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
    const supplied = req.get('x-request-id');
    const requestId = supplied && REQUEST_ID_PATTERN.test(supplied) ? supplied : randomUUID();
    res.locals.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
}
