import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient, SubscriptionTier } from '@prisma/client';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const PORT = process.env.SCHOOL_SERVICE_PORT || 3002;
const prisma = new PrismaClient();

// Fix BigInt JSON serialization
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

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

// School registration endpoint
app.post('/schools/register', async (req: Request, res: Response) => {
  try {
    const {
      schoolName,
      email,
      phone,
      address,
      adminFirstName,
      adminLastName,
      adminEmail,
      adminPhone,
      adminPassword,
      trialMonths = 1, // 1 or 3
    } = req.body;

    // Validation
    if (!schoolName || !email || !adminFirstName || !adminLastName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    if (![1, 3].includes(trialMonths)) {
      return res.status(400).json({
        success: false,
        error: 'Trial months must be 1 or 3',
      });
    }

    // Check if school email already exists
    const existingSchool = await prisma.school.findUnique({
      where: { email },
    });

    if (existingSchool) {
      return res.status(409).json({
        success: false,
        error: 'School email already registered',
      });
    }

    // Generate slug
    const baseSlug = slugify(schoolName, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (await prisma.school.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Determine subscription tier and limits
    const tier = trialMonths === 1 ? SubscriptionTier.FREE_TRIAL_1M : SubscriptionTier.FREE_TRIAL_3M;
    const maxStudents = trialMonths === 1 ? 100 : 300;
    const maxTeachers = trialMonths === 1 ? 10 : 20;
    const maxStorage = trialMonths === 1 ? 1073741824 : 2147483648; // 1GB or 2GB

    // Calculate subscription end date
    const subscriptionStart = new Date();
    const subscriptionEnd = new Date();
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + trialMonths);

    // Hash admin password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create school with admin user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create school
      const school = await tx.school.create({
        data: {
          name: schoolName,
          slug,
          email,
          phone,
          address,
          subscriptionTier: tier,
          subscriptionStart,
          subscriptionEnd,
          isTrial: true,
          isActive: true,
          maxStudents,
          maxTeachers,
          maxStorage,
        },
      });

      // Create default academic year
      const currentYear = new Date().getFullYear();
      const academicYear = await tx.academicYear.create({
        data: {
          schoolId: school.id,
          name: `${currentYear}-${currentYear + 1}`,
          startDate: new Date(`${currentYear}-01-01`),
          endDate: new Date(`${currentYear}-12-31`),
          isCurrent: true,
        },
      });

      // Create admin user
      const adminUser = await tx.user.create({
        data: {
          schoolId: school.id,
          firstName: adminFirstName,
          lastName: adminLastName,
          email: adminEmail,
          phone: adminPhone,
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true,
          isDefaultPassword: false,
          isSuperAdmin: false,
        },
      });

      return { school, academicYear, adminUser };
    });

    res.status(201).json({
      success: true,
      message: 'School registered successfully',
      data: {
        school: {
          id: result.school.id,
          name: result.school.name,
          slug: result.school.slug,
          email: result.school.email,
          subscriptionTier: result.school.subscriptionTier,
          subscriptionEnd: result.school.subscriptionEnd,
          isTrial: result.school.isTrial,
        },
        admin: {
          id: result.adminUser.id,
          firstName: result.adminUser.firstName,
          lastName: result.adminUser.lastName,
          email: result.adminUser.email,
        },
        academicYear: {
          id: result.academicYear.id,
          name: result.academicYear.name,
        },
      },
    });
  } catch (error: any) {
    console.error('School registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register school',
      details: error.message,
    });
  }
});

// Get school by ID
app.get('/schools/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        academicYears: {
          where: { isCurrent: true },
        },
        _count: {
          select: {
            users: true,
            academicYears: true,
          },
        },
      },
    });

    if (!school) {
      return res.status(404).json({
        success: false,
        error: 'School not found',
      });
    }

    res.json({
      success: true,
      data: school,
    });
  } catch (error: any) {
    console.error('Get school error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get school',
      details: error.message,
    });
  }
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
