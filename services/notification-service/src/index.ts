import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
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

const app = express();
app.set('trust proxy', 1); // ✅ Required for Cloud Run/Vercel (X-Forwarded-For)
const PORT = process.env.PORT || process.env.NOTIFICATION_SERVICE_PORT || 3013;

const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow all origins in production if CORS_ORIGIN is set to *
    if (process.env.CORS_ORIGIN === '*') return callback(null, true);

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many requests' } }));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

app.use('/notifications', notificationRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
  // Start the in-process job scheduler (no-op when ENABLE_INTERNAL_CRON=false).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('./scheduler').startInternalScheduler();
});
