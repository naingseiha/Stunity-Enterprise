import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import notificationRoutes from './routes/notification.routes';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3013;

app.use(cors());
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
});
