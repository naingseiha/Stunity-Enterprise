import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';

// Load environment variables from root .env. Production must use a dedicated
// service token; JWT_SECRET is intentionally never accepted as a fallback.
if (process.env.NODE_ENV === 'production' && !process.env.NOTIFICATION_SERVICE_AUTH_TOKEN) {
  throw new Error('FATAL: NOTIFICATION_SERVICE_AUTH_TOKEN must be set in production.');
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
