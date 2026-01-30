import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient, Gender } from '@prisma/client';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { generateStudentId } from './utils/studentIdGenerator';
import { parseDate } from './utils/dateParser';

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

const app = express();
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['warn', 'error'],
});

// Middleware - CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Serve static files from public/uploads
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads/students');
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: student-{timestamp}-{random}.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'student-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// JWT Authentication Middleware
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    schoolId: string;
  };
}

const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'stunity-enterprise-secret-2026') as any;
    
    // OPTIMIZED: Use data from JWT token instead of database query
    // This reduces response time from ~200ms to <5ms
    
    if (!decoded.userId || !decoded.schoolId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format',
      });
    }

    // Check if school is active (from token)
    if (decoded.school && !decoded.school.isActive) {
      return res.status(403).json({
        success: false,
        message: 'School account is inactive',
      });
    }

    // Check if trial expired (from token)
    if (decoded.school?.isTrial && decoded.school?.subscriptionEnd) {
      const now = new Date();
      const trialEnd = new Date(decoded.school.subscriptionEnd);
      if (now > trialEnd) {
        return res.status(403).json({
          success: false,
          message: 'Trial period has expired',
        });
      }
    }

    req.user = {
      id: decoded.userId,
      email: decoded.email || '',
      role: decoded.role,
      schoolId: decoded.schoolId,
    };

    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

// Apply auth middleware to all routes
app.use(authenticateToken);

// ==========================================
// STUDENT ENDPOINTS (Multi-Tenant)
// ==========================================

/**
 * GET /students/lightweight
 * Get students with pagination and filters (lightweight)
 */
app.get('/students/lightweight', async (req: AuthRequest, res: Response) => {
  try {
    console.log("⚡ Fetching students (lightweight)...");
    const schoolId = req.user!.schoolId; // Multi-tenant filter

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Filters
    const classId = req.query.classId as string | undefined;
    const gender = req.query.gender as string | undefined;

    // Create cache key
    const cacheKey = `students:${schoolId}:${page}:${limit}:${classId || 'all'}:${gender || 'all'}`;
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`✅ Cache hit for ${cacheKey}`);
      return res.json(cached.data);
    }

    console.log(`📄 Page: ${page}, Limit: ${limit}, Skip: ${skip}`);
    console.log(`🏫 School ID: ${schoolId}`);

    // Build where clause
    const where: any = { schoolId }; // Multi-tenant filter
    
    if (classId && classId !== "all") {
      where.classId = classId;
    }
    if (gender && gender !== "all") {
      where.gender = gender === "male" ? "MALE" : "FEMALE";
    }

    // Get total count and students in parallel
    const [totalCount, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          khmerName: true,
          englishName: true,
          email: true,
          dateOfBirth: true,
          gender: true,
          placeOfBirth: true,
          currentAddress: true,
          phoneNumber: true,
          classId: true,
          isAccountActive: true,
          studentRole: true,
          class: {
            select: {
              id: true,
              name: true,
              grade: true,
            },
          },
          fatherName: true,
          motherName: true,
          parentPhone: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    console.log(`⚡ Fetched ${students.length} students (page ${page}/${totalPages})`);

    const response = {
      success: true,
      data: students,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    };

    // Store in cache
    cache.set(cacheKey, { data: response, timestamp: Date.now() });

    res.json(response);
  } catch (error: any) {
    console.error("❌ Error fetching students (lightweight):", error);
    res.status(500).json({
      success: false,
      message: "Error fetching students",
      error: error.message,
    });
  }
});

/**
 * GET /students
 * Get all students (full data)
 */
app.get('/students', async (req: AuthRequest, res: Response) => {
  try {
    console.log("📋 Fetching all students (full data)...");
    const schoolId = req.user!.schoolId; // Multi-tenant filter

    const students = await prisma.student.findMany({
      where: { schoolId }, // Multi-tenant filter
      include: {
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`✅ Fetched ${students.length} students for school ${schoolId}`);

    res.json({
      success: true,
      data: students,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching students",
      error: error.message,
    });
  }
});

/**
 * GET /students/:id
 * Get student by ID
 */
app.get('/students/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId; // Multi-tenant filter

    const student = await prisma.student.findFirst({
      where: { 
        id,
        schoolId, // Multi-tenant filter
      },
      include: {
        class: true,
        grades: {
          include: {
            subject: true,
          },
        },
        attendance: true,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found in your school",
      });
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching student",
      error: error.message,
    });
  }
});

/**
 * POST /students
 * Create new student
 */
app.post('/students', async (req: AuthRequest, res: Response) => {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📥 CREATE STUDENT REQUEST");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const schoolId = req.user!.schoolId; // Multi-tenant context
    console.log(`🏫 School ID: ${schoolId}`);

    // Check school usage limits
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    const currentStudents = await prisma.student.count({
      where: { schoolId },
    });

    if (currentStudents >= school.maxStudents) {
      return res.status(403).json({
        success: false,
        message: `Student limit reached (${school.maxStudents} max). Please upgrade your subscription.`,
      });
    }

    const {
      firstName,
      lastName,
      khmerName,
      englishName,
      email,
      dateOfBirth,
      gender,
      placeOfBirth,
      currentAddress,
      phoneNumber,
      classId,
      fatherName,
      motherName,
      parentPhone,
      parentOccupation,
      remarks,
    } = req.body;

    // Validations
    if (!firstName || firstName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "គោត្តនាម (First name) ជាទិន្នន័យចាំបាច់",
      });
    }

    if (!lastName || lastName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "នាម (Last name) ជាទិន្នន័យចាំបាច់",
      });
    }

    if (!khmerName || khmerName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "ឈ្មោះជាអក្សរខ្មែរ (Khmer name) ជាទិន្នន័យចាំបាច់",
      });
    }

    if (!dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: "ថ្ងៃខែឆ្នាំកំណើត (Date of birth) ជាទិន្នន័យចាំបាច់",
      });
    }

    if (!gender || (gender !== "MALE" && gender !== "FEMALE")) {
      return res.status(400).json({
        success: false,
        message: "ភេទត្រូវតែជា MALE ឬ FEMALE",
      });
    }

    // Generate student ID (school-specific)
    const studentId = await generateStudentId(classId, schoolId);
    console.log(`🎯 Generated Student ID: ${studentId}`);

    const studentEmail =
      email && email.trim() !== ""
        ? email.trim()
        : `${studentId}@student.edu.kh`;

    console.log(`📧 Email: ${studentEmail}`);

    // Verify class belongs to same school
    if (classId && classId.trim() !== "") {
      const classExists = await prisma.class.findFirst({
        where: { 
          id: classId,
          schoolId, // Multi-tenant check
        },
      });

      if (!classExists) {
        return res.status(400).json({
          success: false,
          message: "រកមិនឃើញថ្នាក់នេះទេ (Class not found in your school)",
        });
      }
    }

    const studentData: any = {
      schoolId, // Multi-tenant
      studentId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      khmerName: khmerName.trim(),
      englishName: englishName?.trim() || null,
      email: studentEmail,
      dateOfBirth,
      gender: gender as Gender,
      placeOfBirth: placeOfBirth?.trim() || "ភ្នំពេញ",
      currentAddress: currentAddress?.trim() || "ភ្នំពេញ",
      phoneNumber: phoneNumber?.trim() || null,
      fatherName: fatherName?.trim() || "ឪពុក",
      motherName: motherName?.trim() || "ម្តាយ",
      parentPhone: parentPhone?.trim() || null,
      parentOccupation: parentOccupation?.trim() || "កសិករ",
      remarks: remarks?.trim() || null,
    };

    if (classId && classId.trim() !== "") {
      studentData.classId = classId;
    }

    console.log("💾 Creating student in database...");

    const student = await prisma.student.create({
      data: studentData,
      include: {
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },
      },
    });

    // Update school's current student count
    await prisma.school.update({
      where: { id: schoolId },
      data: { currentStudents: currentStudents + 1 },
    });

    console.log("✅ Student created successfully!");
    console.log(`   ID: ${student.id}`);
    console.log(`   Student ID: ${student.studentId}`);
    console.log(`   Name: ${student.khmerName}`);
    console.log(`   School: ${schoolId}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    res.status(201).json({
      success: true,
      message: "បង្កើតសិស្សបានជោគជ័យ (Student created successfully)",
      data: student,
    });
  } catch (error: any) {
    console.error("❌ Error creating student:", error);
    res.status(500).json({
      success: false,
      message: "មានបញ្ហាក្នុងការបង្កើតសិស្ស (Error creating student)",
      error: error.message,
    });
  }
});

/**
 * POST /students/bulk
 * Bulk create students
 */
app.post('/students/bulk', async (req: AuthRequest, res: Response) => {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📥 BULK CREATE STUDENTS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const schoolId = req.user!.schoolId; // Multi-tenant context
    const { classId, students } = req.body;

    if (!classId || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "classId and students array are required",
      });
    }

    // Check school usage limits
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    const currentStudents = await prisma.student.count({
      where: { schoolId },
    });

    if (currentStudents + students.length > school.maxStudents) {
      return res.status(403).json({
        success: false,
        message: `Adding ${students.length} students would exceed your limit of ${school.maxStudents}. Please upgrade your subscription.`,
      });
    }

    // Verify class belongs to school
    const classExists = await prisma.class.findFirst({
      where: { 
        id: classId,
        schoolId, // Multi-tenant check
      },
      select: { id: true, name: true, grade: true },
    });

    if (!classExists) {
      return res.status(400).json({
        success: false,
        message: "Class not found in your school",
      });
    }

    console.log(`📊 Class: ${classExists.name} (Grade ${classExists.grade})`);
    console.log(`👥 Students to create: ${students.length}`);
    console.log(`🏫 School ID: ${schoolId}`);

    const results: any = { success: [], failed: [] };

    for (let i = 0; i < students.length; i++) {
      const studentData = students[i];
      const rowNumber = i + 1;

      try {
        // Parse name
        const fullName = studentData.name?.trim();
        if (!fullName) throw new Error("Name is required");

        const nameParts = fullName.split(/\s+/);
        const firstName = nameParts.pop() || "";
        const lastName = nameParts.join(" ") || firstName;

        // Parse gender
        let gender: "MALE" | "FEMALE" = "MALE";
        if (studentData.gender) {
          const g = studentData.gender.toString().trim().toUpperCase();
          if (["ប", "ប្រុស", "M", "MALE", "BOY"].includes(g)) {
            gender = "MALE";
          } else if (["ស", "ស្រី", "F", "FEMALE", "GIRL"].includes(g)) {
            gender = "FEMALE";
          }
        }

        // Parse date
        let dateOfBirth: string;
        try {
          if (!studentData.dateOfBirth) {
            throw new Error("Date of birth is required");
          }
          dateOfBirth = parseDate(studentData.dateOfBirth);
          console.log(`  📅 Row ${rowNumber}: ${studentData.dateOfBirth} → ${dateOfBirth}`);
        } catch (dateError: any) {
          throw new Error(`Invalid date: ${dateError.message}`);
        }

        // Generate student ID (school-specific)
        const studentId = await generateStudentId(classId, schoolId);

        // Create student
        const newStudent = await prisma.student.create({
          data: {
            schoolId, // Multi-tenant
            studentId,
            firstName,
            lastName,
            khmerName: fullName,
            dateOfBirth,
            gender,
            classId,
            email: `${studentId}@student.edu.kh`,
            previousGrade: studentData.previousGrade?.trim() || null,
            previousSchool: studentData.previousSchool?.trim() || null,
            repeatingGrade: studentData.repeatingGrade?.trim() || null,
            transferredFrom: studentData.transferredFrom?.trim() || null,
            grade9ExamSession: studentData.grade9ExamSession?.trim() || null,
            grade9ExamCenter: studentData.grade9ExamCenter?.trim() || null,
            grade9ExamRoom: studentData.grade9ExamRoom?.trim() || null,
            grade9ExamDesk: studentData.grade9ExamDesk?.trim() || null,
            grade9PassStatus: studentData.grade9PassStatus?.trim() || null,
            grade12ExamSession: studentData.grade12ExamSession?.trim() || null,
            grade12ExamCenter: studentData.grade12ExamCenter?.trim() || null,
            grade12ExamRoom: studentData.grade12ExamRoom?.trim() || null,
            grade12ExamDesk: studentData.grade12ExamDesk?.trim() || null,
            grade12PassStatus: studentData.grade12PassStatus?.trim() || null,
            grade12Track: studentData.grade12Track?.trim() || null,
            remarks: studentData.remarks?.trim() || null,
            placeOfBirth: "ភ្នំពេញ",
            currentAddress: "ភ្នំពេញ",
            fatherName: "ឪពុក",
            motherName: "ម្តាយ",
            parentOccupation: "កសិករ",
          },
          include: {
            class: {
              select: { id: true, name: true, grade: true },
            },
          },
        });

        results.success.push({
          row: rowNumber,
          studentId: newStudent.studentId,
          name: newStudent.khmerName,
        });

        console.log(`  ✅ Row ${rowNumber}: ${newStudent.khmerName} (${newStudent.studentId})`);
      } catch (error: any) {
        results.failed.push({
          row: rowNumber,
          name: studentData.name || "Unknown",
          error: error.message,
        });
        console.error(`  ❌ Row ${rowNumber}: ${error.message}`);
      }
    }

    // Update school's current student count
    await prisma.school.update({
      where: { id: schoolId },
      data: { currentStudents: currentStudents + results.success.length },
    });

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Success: ${results.success.length}/${students.length}`);
    console.log(`❌ Failed: ${results.failed.length}/${students.length}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    res.status(201).json({
      success: true,
      message: `Created ${results.success.length} students successfully`,
      data: {
        total: students.length,
        success: results.success.length,
        failed: results.failed.length,
        results,
      },
    });
  } catch (error: any) {
    console.error("❌ Bulk create error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create students",
      error: error.message,
    });
  }
});

/**
 * PUT /students/:id
 * Update student
 */
app.put('/students/:id', async (req: AuthRequest, res: Response) => {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📝 UPDATE STUDENT REQUEST");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const { id } = req.params;
    const schoolId = req.user!.schoolId; // Multi-tenant context

    // Verify student belongs to school
    const existingStudent = await prisma.student.findFirst({
      where: { 
        id,
        schoolId, // Multi-tenant check
      },
    });

    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: "Student not found in your school",
      });
    }

    const {
      firstName,
      lastName,
      khmerName,
      englishName,
      gender,
      dateOfBirth,
      placeOfBirth,
      currentAddress,
      phoneNumber,
      email,
      classId,
      fatherName,
      motherName,
      parentPhone,
      parentOccupation,
      previousGrade,
      previousSchool,
      repeatingGrade,
      transferredFrom,
      grade9ExamSession,
      grade9ExamCenter,
      grade9ExamRoom,
      grade9ExamDesk,
      grade9PassStatus,
      grade12ExamSession,
      grade12ExamCenter,
      grade12ExamRoom,
      grade12ExamDesk,
      grade12PassStatus,
      grade12Track,
      remarks,
      photoUrl,
    } = req.body;

    // Verify new class belongs to same school
    if (classId && classId.trim() !== "") {
      const classExists = await prisma.class.findFirst({
        where: { 
          id: classId,
          schoolId, // Multi-tenant check
        },
      });

      if (!classExists) {
        return res.status(400).json({
          success: false,
          message: "Class not found in your school",
        });
      }
    }

    // Build update data
    const updateData: any = {};

    if (firstName !== undefined) updateData.firstName = firstName?.trim() || "";
    if (lastName !== undefined) updateData.lastName = lastName?.trim() || "";
    if (khmerName !== undefined) updateData.khmerName = khmerName?.trim() || "";
    if (gender !== undefined) updateData.gender = gender;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (englishName !== undefined) updateData.englishName = englishName?.trim() === "" ? null : englishName?.trim();
    if (email !== undefined) updateData.email = email?.trim() === "" ? null : email?.trim();
    if (placeOfBirth !== undefined) updateData.placeOfBirth = placeOfBirth?.trim() === "" ? null : placeOfBirth?.trim();
    if (currentAddress !== undefined) updateData.currentAddress = currentAddress?.trim() === "" ? null : currentAddress?.trim();
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber?.trim() === "" ? null : phoneNumber?.trim();
    if (classId !== undefined) updateData.classId = classId?.trim() === "" ? null : classId?.trim();
    if (fatherName !== undefined) updateData.fatherName = fatherName?.trim() === "" ? null : fatherName?.trim();
    if (motherName !== undefined) updateData.motherName = motherName?.trim() === "" ? null : motherName?.trim();
    if (parentPhone !== undefined) updateData.parentPhone = parentPhone?.trim() === "" ? null : parentPhone?.trim();
    if (parentOccupation !== undefined) updateData.parentOccupation = parentOccupation?.trim() === "" ? null : parentOccupation?.trim();
    if (previousGrade !== undefined) updateData.previousGrade = previousGrade?.trim() === "" ? null : previousGrade?.trim();
    if (previousSchool !== undefined) updateData.previousSchool = previousSchool?.trim() === "" ? null : previousSchool?.trim();
    if (repeatingGrade !== undefined) updateData.repeatingGrade = repeatingGrade?.trim() === "" ? null : repeatingGrade?.trim();
    if (transferredFrom !== undefined) updateData.transferredFrom = transferredFrom?.trim() === "" ? null : transferredFrom?.trim();
    if (grade9ExamSession !== undefined) updateData.grade9ExamSession = grade9ExamSession?.trim() === "" ? null : grade9ExamSession?.trim();
    if (grade9ExamCenter !== undefined) updateData.grade9ExamCenter = grade9ExamCenter?.trim() === "" ? null : grade9ExamCenter?.trim();
    if (grade9ExamRoom !== undefined) updateData.grade9ExamRoom = grade9ExamRoom?.trim() === "" ? null : grade9ExamRoom?.trim();
    if (grade9ExamDesk !== undefined) updateData.grade9ExamDesk = grade9ExamDesk?.trim() === "" ? null : grade9ExamDesk?.trim();
    if (grade9PassStatus !== undefined) updateData.grade9PassStatus = grade9PassStatus?.trim() === "" ? null : grade9PassStatus?.trim();
    if (grade12ExamSession !== undefined) updateData.grade12ExamSession = grade12ExamSession?.trim() === "" ? null : grade12ExamSession?.trim();
    if (grade12ExamCenter !== undefined) updateData.grade12ExamCenter = grade12ExamCenter?.trim() === "" ? null : grade12ExamCenter?.trim();
    if (grade12ExamRoom !== undefined) updateData.grade12ExamRoom = grade12ExamRoom?.trim() === "" ? null : grade12ExamRoom?.trim();
    if (grade12ExamDesk !== undefined) updateData.grade12ExamDesk = grade12ExamDesk?.trim() === "" ? null : grade12ExamDesk?.trim();
    if (grade12PassStatus !== undefined) updateData.grade12PassStatus = grade12PassStatus?.trim() === "" ? null : grade12PassStatus?.trim();
    if (grade12Track !== undefined) updateData.grade12Track = grade12Track?.trim() === "" ? null : grade12Track?.trim();
    if (remarks !== undefined) updateData.remarks = remarks?.trim() === "" ? null : remarks?.trim();
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl?.trim() === "" ? null : photoUrl?.trim();

    console.log(`💾 Updating student ${id} in school ${schoolId}...`);

    const student = await prisma.student.update({
      where: { id },
      data: updateData,
      include: {
        class: true,
      },
    });

    console.log("✅ Student updated successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    res.json({
      success: true,
      data: student,
      message: "Student updated successfully",
    });
  } catch (error: any) {
    console.error("❌ UPDATE STUDENT ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Error updating student",
      error: error.message,
    });
  }
});

/**
 * DELETE /students/:id
 * Delete student
 */
app.delete('/students/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId; // Multi-tenant context

    // Verify student belongs to school
    const existingStudent = await prisma.student.findFirst({
      where: { 
        id,
        schoolId, // Multi-tenant check
      },
    });

    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: "Student not found in your school",
      });
    }

    await prisma.student.delete({
      where: { id },
    });

    // Update school's current student count
    const currentCount = await prisma.student.count({
      where: { schoolId },
    });

    await prisma.school.update({
      where: { id: schoolId },
      data: { currentStudents: currentCount },
    });

    res.json({
      success: true,
      message: "លុបសិស្សបានជោគជ័យ (Student deleted successfully)",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "មានបញ្ហាក្នុងការលុបសិស្ស (Error deleting student)",
      error: error.message,
    });
  }
});

/**
 * POST /students/:id/photo
 * Upload photo for a student
 */
app.post('/students/:id/photo', upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo file provided',
      });
    }

    // Verify student belongs to school
    const student = await prisma.student.findFirst({
      where: { id, schoolId },
    });

    if (!student) {
      // Delete uploaded file if student not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Student not found in your school',
      });
    }

    // Delete old photo if exists
    if (student.photoUrl) {
      const oldPhotoPath = path.join(__dirname, '../public', student.photoUrl);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Update student with new photo URL
    const photoUrl = `/uploads/students/${req.file.filename}`;
    const updatedStudent = await prisma.student.update({
      where: { id },
      data: { photoUrl },
    });

    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      data: {
        photoUrl,
        student: updatedStudent,
      },
    });
  } catch (error: any) {
    // Clean up uploaded file on error
    if ((req as any).file) {
      fs.unlinkSync((req as any).file.path);
    }
    console.error('Error uploading photo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload photo',
      error: error.message,
    });
  }
});

// ============================================
// STUDENT PROMOTION & PROGRESSION ENDPOINTS
// ============================================

/**
 * Preview automatic promotion
 * Shows which students will be promoted from current year to next
 */
app.post('/students/promote/preview', async (req: AuthRequest, res: Response) => {
  try {
    const { fromAcademicYearId, toAcademicYearId } = req.body;
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!fromAcademicYearId || !toAcademicYearId) {
      return res.status(400).json({
        success: false,
        message: 'fromAcademicYearId and toAcademicYearId are required',
      });
    }

    // Get all classes from source year
    const fromClasses = await prisma.class.findMany({
      where: {
        academicYearId: fromAcademicYearId,
        schoolId,
      },
      include: {
        studentClasses: {
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                firstName: true,
                lastName: true,
                khmerName: true,
                gender: true,
                photoUrl: true,
              },
            },
          },
        },
      },
    });

    // Get target year classes
    const toClasses = await prisma.class.findMany({
      where: {
        academicYearId: toAcademicYearId,
        schoolId,
      },
      select: {
        id: true,
        name: true,
        grade: true,
        section: true,
      },
    });

    // Build promotion preview
    const promotionPreview = fromClasses.map((fromClass) => {
      // Find matching class in next year (same grade + 1)
      const nextGrade = (parseInt(fromClass.grade) + 1).toString();
      const suggestedToClass = toClasses.find(
        (c) => c.grade === nextGrade && c.section === fromClass.section
      );

      return {
        fromClass: {
          id: fromClass.id,
          name: fromClass.name,
          grade: fromClass.grade,
          section: fromClass.section,
          studentCount: fromClass.studentClasses.length,
        },
        toClass: suggestedToClass || null,
        students: fromClass.studentClasses.map((sc) => ({
          id: sc.student.id,
          studentId: sc.student.studentId,
          name: {
            latin: `${sc.student.firstName} ${sc.student.lastName}`,
            khmer: sc.student.khmerName,
          },
          gender: sc.student.gender,
          photo: sc.student.photoUrl,
          canPromote: !!suggestedToClass,
        })),
      };
    });

    res.json({
      success: true,
      data: {
        fromAcademicYearId,
        toAcademicYearId,
        totalStudents: promotionPreview.reduce((sum, p) => sum + p.students.length, 0),
        promotableStudents: promotionPreview
          .filter((p) => p.toClass)
          .reduce((sum, p) => sum + p.students.length, 0),
        preview: promotionPreview,
      },
    });
  } catch (error: any) {
    console.error('Error previewing promotion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview promotion',
      error: error.message,
    });
  }
});

/**
 * Execute automatic promotion
 * Promotes students from one academic year to the next automatically
 */
app.post('/students/promote/automatic', async (req: AuthRequest, res: Response) => {
  try {
    const { fromAcademicYearId, toAcademicYearId, promotions } = req.body;
    const schoolId = req.user?.schoolId;
    const userId = req.user?.id;

    if (!schoolId || !userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!fromAcademicYearId || !toAcademicYearId || !Array.isArray(promotions)) {
      return res.status(400).json({
        success: false,
        message: 'fromAcademicYearId, toAcademicYearId, and promotions array are required',
      });
    }

    // Validate academic years exist
    const [fromYear, toYear] = await Promise.all([
      prisma.academicYear.findFirst({
        where: { id: fromAcademicYearId, schoolId },
      }),
      prisma.academicYear.findFirst({
        where: { id: toAcademicYearId, schoolId },
      }),
    ]);

    if (!fromYear || !toYear) {
      return res.status(404).json({
        success: false,
        message: 'Academic year not found',
      });
    }

    const results = {
      successful: [] as any[],
      failed: [] as any[],
    };

    // Process each promotion
    for (const promo of promotions) {
      try {
        const { studentId, fromClassId, toClassId } = promo;

        // Verify student exists and belongs to from class
        const studentClass = await prisma.studentClass.findFirst({
          where: {
            studentId,
            classId: fromClassId,
          },
        });

        if (!studentClass) {
          results.failed.push({
            studentId,
            reason: 'Student not found in source class',
          });
          continue;
        }

        // Check if already promoted
        const existingProgression = await prisma.studentProgression.findFirst({
          where: {
            studentId,
            fromAcademicYearId,
            toAcademicYearId,
          },
        });

        if (existingProgression) {
          results.failed.push({
            studentId,
            reason: 'Already promoted to this academic year',
          });
          continue;
        }

        // Create progression record and assign to new class
        await prisma.$transaction(async (tx) => {
          // Create progression record
          await tx.studentProgression.create({
            data: {
              studentId,
              fromAcademicYearId,
              toAcademicYearId,
              fromClassId,
              toClassId,
              promotionType: 'AUTOMATIC',
              promotionDate: new Date(),
              promotedBy: userId,
            },
          });

          // Assign student to new class
          const existingAssignment = await tx.studentClass.findFirst({
            where: {
              studentId,
              classId: toClassId,
            },
          });

          if (!existingAssignment) {
            await tx.studentClass.create({
              data: {
                studentId,
                classId: toClassId,
                enrolledAt: new Date(),
              },
            });
          }
        });

        results.successful.push({
          studentId,
          fromClassId,
          toClassId,
        });
      } catch (error: any) {
        results.failed.push({
          studentId: promo.studentId,
          reason: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Promoted ${results.successful.length} students successfully`,
      data: {
        successCount: results.successful.length,
        failureCount: results.failed.length,
        results,
      },
    });
  } catch (error: any) {
    console.error('Error executing automatic promotion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute promotion',
      error: error.message,
    });
  }
});

/**
 * Manual promotion - promote individual student to specific class
 */
app.post('/students/promote/manual', async (req: AuthRequest, res: Response) => {
  try {
    const {
      studentId,
      fromAcademicYearId,
      toAcademicYearId,
      fromClassId,
      toClassId,
      notes,
    } = req.body;
    const schoolId = req.user?.schoolId;
    const userId = req.user?.id;

    if (!schoolId || !userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!studentId || !fromAcademicYearId || !toAcademicYearId || !fromClassId || !toClassId) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    // Validate student belongs to school
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check if already promoted
    const existingProgression = await prisma.studentProgression.findFirst({
      where: {
        studentId,
        fromAcademicYearId,
        toAcademicYearId,
      },
    });

    if (existingProgression) {
      return res.status(400).json({
        success: false,
        message: 'Student already promoted to this academic year',
      });
    }

    // Create progression and assign to class
    const progression = await prisma.$transaction(async (tx) => {
      // Create progression record
      const prog = await tx.studentProgression.create({
        data: {
          studentId,
          fromAcademicYearId,
          toAcademicYearId,
          fromClassId,
          toClassId,
          promotionType: 'MANUAL',
          promotionDate: new Date(),
          promotedBy: userId,
          notes,
        },
        include: {
          student: {
            select: {
              studentId: true,
              firstName: true,
              lastName: true,
            },
          },
          fromClass: {
            select: {
              name: true,
              grade: true,
            },
          },
          toClass: {
            select: {
              name: true,
              grade: true,
            },
          },
        },
      });

      // Assign to new class if not already assigned
      const existingAssignment = await tx.studentClass.findFirst({
        where: {
          studentId,
          classId: toClassId,
        },
      });

      if (!existingAssignment) {
        await tx.studentClass.create({
          data: {
            studentId,
            classId: toClassId,
            enrolledAt: new Date(),
          },
        });
      }

      return prog;
    });

    res.json({
      success: true,
      message: 'Student promoted successfully',
      data: progression,
    });
  } catch (error: any) {
    console.error('Error executing manual promotion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to promote student',
      error: error.message,
    });
  }
});

/**
 * Get student progression history
 */
app.get('/students/:id/progression', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Verify student belongs to school
    const student = await prisma.student.findFirst({
      where: { id, schoolId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Get progression history
    const progressions = await prisma.studentProgression.findMany({
      where: { studentId: id },
      include: {
        fromAcademicYear: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        toAcademicYear: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        fromClass: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
          },
        },
        toClass: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
          },
        },
      },
      orderBy: {
        promotionDate: 'asc',
      },
    });

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          studentId: student.studentId,
          name: {
            latin: `${student.firstName} ${student.lastName}`,
            khmer: student.khmerName,
          },
        },
        progressions,
      },
    });
  } catch (error: any) {
    console.error('Error fetching progression history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progression history',
      error: error.message,
    });
  }
});

// Mark students as failed (repeat same grade)
app.post('/students/mark-failed', async (req: any, res: Response) => {
  try {
    const { studentIds, fromAcademicYearId, toAcademicYearId, notes } = req.body;
    const schoolId = req.user.schoolId;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'studentIds array is required',
      });
    }

    if (!fromAcademicYearId || !toAcademicYearId) {
      return res.status(400).json({
        success: false,
        error: 'fromAcademicYearId and toAcademicYearId are required',
      });
    }

    // Verify academic years belong to school
    const [fromYear, toYear] = await Promise.all([
      prisma.academicYear.findFirst({
        where: { id: fromAcademicYearId, schoolId },
      }),
      prisma.academicYear.findFirst({
        where: { id: toAcademicYearId, schoolId },
      }),
    ]);

    if (!fromYear || !toYear) {
      return res.status(404).json({
        success: false,
        error: 'Academic year not found',
      });
    }

    const results = {
      processed: 0,
      failed: [] as any[],
    };

    // Process each student
    for (const studentId of studentIds) {
      try {
        // Get student with current class
        const student = await prisma.student.findFirst({
          where: { id: studentId, schoolId },
          include: {
            studentClasses: {
              where: { status: 'ACTIVE' },
              include: {
                class: true,
              },
              orderBy: { enrolledAt: 'desc' },
              take: 1,
            },
          },
        });

        if (!student || student.studentClasses.length === 0) {
          results.failed.push({
            studentId,
            error: 'Student not found or not enrolled in any class',
          });
          continue;
        }

        const currentClass = student.studentClasses[0].class;

        // Find class in new year with same grade
        const repeatClass = await prisma.class.findFirst({
          where: {
            schoolId,
            academicYearId: toAcademicYearId,
            grade: currentClass.grade, // Same grade
          },
        });

        if (!repeatClass) {
          results.failed.push({
            studentId,
            error: `No class found for grade ${currentClass.grade} in target year`,
          });
          continue;
        }

        // Create progression record with REPEAT type
        await prisma.studentProgression.create({
          data: {
            studentId,
            fromAcademicYearId,
            toAcademicYearId,
            fromClassId: currentClass.id,
            toClassId: repeatClass.id,
            promotionType: 'REPEAT',
            promotionDate: new Date(),
            promotedBy: req.user.userId,
            notes: notes || 'Student marked as failed - repeating grade',
          },
        });

        // Add student to new class
        await prisma.studentClass.create({
          data: {
            studentId,
            classId: repeatClass.id,
            status: 'ACTIVE',
          },
        });

        results.processed++;
      } catch (err: any) {
        results.failed.push({
          studentId,
          error: err.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.processed} student(s)`,
      data: results,
    });
  } catch (error: any) {
    console.error('Mark failed error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark students as failed',
      details: error.message,
    });
  }
});

// Health check endpoint (no auth required)
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'student-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Start server
const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Student Service running on port ${PORT}`);
  console.log(`🏫 Multi-tenant support: ENABLED`);
  console.log(`🔒 JWT authentication: ENABLED`);
  console.log(`📊 Endpoints:`);
  console.log(`   GET    /students/lightweight - Paginated list`);
  console.log(`   GET    /students - Full list`);
  console.log(`   GET    /students/:id - Get by ID`);
  console.log(`   POST   /students - Create student`);
  console.log(`   POST   /students/bulk - Bulk create`);
  console.log(`   PUT    /students/:id - Update student`);
  console.log(`   DELETE /students/:id - Delete student`);
  console.log(`   POST   /students/:id/photo - Upload photo`);
  console.log(`🎓 Student Promotion:`);
  console.log(`   POST   /students/promote/preview - Preview promotion`);
  console.log(`   POST   /students/promote/automatic - Bulk promotion`);
  console.log(`   POST   /students/promote/manual - Manual promotion`);
  console.log(`   GET    /students/:id/progression - History`);
  console.log(`   GET    /health - Health check (no auth)`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});

export default app;
