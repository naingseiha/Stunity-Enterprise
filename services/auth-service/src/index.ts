import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'auth-service',
    port: PORT,
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

// API info endpoint
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    service: 'Stunity Enterprise - Authentication Service',
    version: '2.0.0',
    endpoints: {
      health: '/health',
      login: '/auth/login (POST)',
      register: '/auth/register (POST)',
      verify: '/auth/verify (GET)',
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   🔐 Auth Service - Stunity Enterprise v2.0  ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 API info: http://localhost:${PORT}/api/info`);
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
});
