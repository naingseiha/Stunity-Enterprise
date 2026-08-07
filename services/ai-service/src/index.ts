import './loadEnv'; // must be the first import — see loadEnv.ts for why

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import { geminiService } from './services/gemini.service';
import { claudeService } from './services/claude.service';
import generateRoutes from './routes/generate.routes';
import tutorRoutes from './routes/tutor.routes';
import { requestIdMiddleware } from './middleware/requestId';

const app = express();
app.set('trust proxy', 1); // ✅ Required for Cloud Run/Vercel (X-Forwarded-For)
const PORT = parseInt(process.env.PORT || process.env.AI_SERVICE_PORT || '3020', 10);

if (process.env.NODE_ENV === 'production' && process.env.CORS_ORIGIN === '*') {
    throw new Error('Refusing to start ai-service with wildcard CORS_ORIGIN in production');
}

// ─── CORS ──────────────────────────────────────────────────────────
const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3010',
    'http://localhost:3020',
    `http://${process.env.EXPO_PUBLIC_API_HOST || 'localhost'}:3020`
];
const configuredOrigins = process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS;
const allowedOrigins = configuredOrigins
    ? configuredOrigins.split(',').map(o => o.trim())
    : defaultOrigins;

app.use(cors({
    origin: (origin, callback) => {
        // Allow all origins in production if CORS_ORIGIN is set to *
        if (process.env.CORS_ORIGIN === '*') return callback(null, true);

        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) return callback(null, true);
        // Deny without throwing — a thrown Error becomes a generic 500 in clients.
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Platform', 'X-Client-Version', 'X-Request-ID'],
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
app.use(requestIdMiddleware);

// ─── Health Check ──────────────────────────────────────────────────
app.get('/health', async (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'healthy',
        service: 'ai-service',
        gemini: geminiService.isReady() ? 'connected' : 'unconfigured (missing API key)',
        claude: claudeService.isReady() ? 'connected' : 'unconfigured (missing API key)',
        uptime: Math.floor(process.uptime()),
    });
});

// ─── Routes ────────────────────────────────────────────────────────
app.use('/ai', generateRoutes);
app.use('/ai', tutorRoutes);

// ─── Error Handling ───────────────────────────────────────────────
app.use((err: any, req: Request, res: Response, next: any) => {
    const requestId = res.locals.requestId;
    console.error(JSON.stringify({ level: 'ERROR', requestId, method: req.method, path: req.path, message: err?.message || 'Unhandled error', stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined }));

    const status = err.status || 500;

    // User-friendly messages for common errors
    let errorMessage = 'Internal Server Error';
    if (status === 429) {
        errorMessage = 'AI service is busy (too many requests). Please wait about 30-60 seconds and try again.';
    }

    res.status(status).json({
        success: false,
        error: errorMessage,
        code: status === 429 ? 'RATE_LIMITED' : 'SERVER_ERROR',
        requestId,
    });
});

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
    console.log('   POST /ai/tutor/ask');
    console.log('');
});

// Cloud Run timeouts
server.keepAliveTimeout = 620 * 1000;
server.headersTimeout = 630 * 1000;
