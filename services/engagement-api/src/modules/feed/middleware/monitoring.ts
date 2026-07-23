/**
 * Performance Monitoring Middleware
 * Phase 1 Day 7: Request timing and structured logging
 */

import { Request, Response, NextFunction } from 'express';

interface PerformanceMetrics {
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  userAgent?: string;
  userId?: string;
  cacheHit?: boolean;
  dbQueries?: number;
  memoryUsage?: number;
}

// Track slow requests for optimization
const SLOW_REQUEST_THRESHOLD = 1000; // 1 second

// Performance timing middleware
export const performanceMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  // Track response
  const originalSend = res.send;
  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;
    const memoryUsed = process.memoryUsage().heapUsed - startMemory;

    const metrics: PerformanceMetrics = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('user-agent'),
      userId: (req as any).user?.id,
      cacheHit: res.getHeader('X-Cache-Hit') === 'true',
      memoryUsage: Math.round(memoryUsed / 1024), // KB
    };

    // Log based on performance
    if (duration > SLOW_REQUEST_THRESHOLD) {
      console.warn('🐌 [SLOW REQUEST]', JSON.stringify(metrics));
    } else if (process.env.LOG_LEVEL === 'debug') {
      console.log('⚡ [REQUEST]', JSON.stringify(metrics));
    }

    // Emit metrics for monitoring (can be sent to Google Cloud Monitoring)
    if (process.env.NODE_ENV === 'production') {
      emitMetric('request_duration_ms', duration, {
        method: req.method,
        path: req.path,
        status: res.statusCode.toString(),
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

// Structured error logging
export const errorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    method: req.method,
    path: req.path,
    userId: (req as any).user?.id,
    userAgent: req.get('user-agent'),
    body: process.env.LOG_LEVEL === 'debug' ? req.body : undefined,
  };

  console.error('❌ [ERROR]', JSON.stringify(errorLog));

  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Could integrate Sentry here: Sentry.captureException(err);
  }

  // Don't expose internal errors to client
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'An error occurred' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};

// Health check endpoint with detailed metrics
export const healthCheck = async (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.round(uptime),
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
    },
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  };

  // Check database connection
  try {
    const { prisma } = require('../context');
    await prisma.$queryRaw`SELECT 1`;
    (health as any).database = 'connected';
  } catch (error) {
    (health as any).database = 'disconnected';
    (health as any).status = 'degraded';
  }

  res.json(health);
};

// Emit metrics to Google Cloud Monitoring (placeholder)
// In production, use @google-cloud/monitoring
const emitMetric = (metricName: string, value: number, labels: Record<string, string> = {}) => {
  if (process.env.NODE_ENV !== 'production') return;

  // Placeholder for Google Cloud Monitoring integration
  // const monitoring = require('@google-cloud/monitoring');
  // const client = new monitoring.MetricServiceClient();
  // ... send metric to Cloud Monitoring
  
  // For free tier, just log to stdout (Cloud Run captures this)
  console.log(JSON.stringify({
    metric: metricName,
    value,
    labels,
    timestamp: new Date().toISOString(),
  }));
};

// Request size tracking
export const requestSizeTracking = (req: Request, res: Response, next: NextFunction) => {
  const requestSize = parseInt(req.get('content-length') || '0');
  
  if (requestSize > 10 * 1024 * 1024) { // > 10MB
    console.warn('⚠️ [LARGE REQUEST]', {
      path: req.path,
      size: `${(requestSize / 1024 / 1024).toFixed(2)}MB`,
      userId: (req as any).user?.id,
    });
  }

  // Track response size
  const originalSend = res.send;
  res.send = function (data: any): Response {
    const responseSize = Buffer.byteLength(JSON.stringify(data));
    
    if (responseSize > 1024 * 1024) { // > 1MB
      console.warn('⚠️ [LARGE RESPONSE]', {
        path: req.path,
        size: `${(responseSize / 1024 / 1024).toFixed(2)}MB`,
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

export default {
  performanceMonitoring,
  errorLogger,
  healthCheck,
  requestSizeTracking,
};
