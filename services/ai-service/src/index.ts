import dotenv from 'dotenv';
import path from 'path';

// Load environment variables — root .env in local dev, Cloud Run env vars in production
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback: also check service-local .env

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import { geminiService } from './services/gemini.service';
import generateRoutes from './routes/generate.routes';

const app = express();
app.set('trust proxy', 1); // ✅ Required for Cloud Run/Vercel (X-Forwarded-For)
const PORT = parseInt(process.env.PORT || process.env.AI_SERVICE_PORT || '3020', 10);

// ─── CORS ──────────────────────────────────────────────────────────
const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3010',
    'http://localhost:3020',
    `http://${process.env.EXPO_PUBLIC_API_HOST || 'localhost'}:3020`
];
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : defaultOrigins;

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
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Platform', 'X-Client-Version'],
}));

// ─── Middleware ────────────────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // CSP is less relevant for this API-only service
}));
app.use(hpp());
app.use(compression());
app.use(express.json({ limit: '1mb' })); // AI prompts shouldn't be huge
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// ─── Health Check ──────────────────────────────────────────────────
app.get('/health', async (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'healthy',
        service: 'ai-service',
        gemini: geminiService.isReady() ? 'connected' : 'unconfigured (missing API key)',
        uptime: Math.floor(process.uptime()),
    });
});

// ─── Routes ────────────────────────────────────────────────────────
app.use('/ai', generateRoutes);

// ─── Start Server ──────────────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   🤖 AI Service - Stunity Enterprise v8.0      ║');
    console.log('║   Powered by Google Gemini 1.5 Flash           ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log('');
    console.log('📦 Route modules loaded:');
    console.log('   POST /ai/generate/quiz');
    console.log('   POST /ai/generate/lesson');
    console.log('   POST /ai/generate/poll-options');
    console.log('   POST /ai/generate/course');
    console.log('   POST /ai/generate/announcement');
    console.log('   POST /ai/generate/milestones');
    console.log('   POST /ai/enhance/content');
    console.log('   POST /ai/suggest/tags');
    console.log('');
});

// Cloud Run timeouts
server.keepAliveTimeout = 620 * 1000;
server.headersTimeout = 630 * 1000;
