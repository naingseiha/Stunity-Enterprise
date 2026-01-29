import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.SCHOOL_SERVICE_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'school-service',
    port: PORT,
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

// API info endpoint
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    service: 'Stunity Enterprise - School Management Service',
    version: '2.0.0',
    description: 'Self-service school registration and management',
    endpoints: {
      health: '/health',
      register: '/schools/register (POST)',
      getSchool: '/schools/:id (GET)',
      updateSchool: '/schools/:id (PATCH)',
      getSubscription: '/schools/:id/subscription (GET)',
    },
  });
});

// TODO: School registration endpoint (will add in next session)
// POST /schools/register

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   🏫 School Service - Stunity Enterprise v2.0    ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 API info: http://localhost:${PORT}/api/info`);
  console.log('');
  console.log('📋 Features (Coming next):');
  console.log('   - School self-registration');
  console.log('   - Trial management (1 or 3 months)');
  console.log('   - Subscription tracking');
  console.log('   - Usage limits enforcement');
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
});
