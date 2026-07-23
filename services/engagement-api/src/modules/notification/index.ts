import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';

// Load environment variables from root .env
// Cloud Run deploy script always sets JWT_SECRET; use it as the service token when the
// dedicated notification token is omitted so the container can bind to PORT without extra env wiring.
if (!process.env.NOTIFICATION_SERVICE_AUTH_TOKEN && process.env.JWT_SECRET) {
  process.env.NOTIFICATION_SERVICE_AUTH_TOKEN = process.env.JWT_SECRET;
}
if (process.env.NODE_ENV === 'production' && !process.env.NOTIFICATION_SERVICE_AUTH_TOKEN) {
  throw new Error('FATAL: NOTIFICATION_SERVICE_AUTH_TOKEN or JWT_SECRET must be set in production.');
}
// Import routes after env is loaded so Prisma gets the correct DATABASE_URL.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const notificationRoutes = require('./routes/notification.routes').default;

const app = express.Router();
const PORT = process.env.PORT || process.env.NOTIFICATION_SERVICE_PORT || 3013;

const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'];

app.use(morgan('dev'));
app.use('/notifications', express.json({ limit: '1mb' }));

app.use('/notifications', notificationRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});


export default app;
