# 🎓 Stunity Enterprise - Complete System Documentation

**Version:** 4.1  
**Last Updated:** February 2, 2026  
**Status:** Production Ready

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Microservices](#microservices)
4. [Database Schema](#database-schema)
5. [Multi-Academic Year System](#multi-academic-year-system)
6. [Student Management](#student-management)
7. [Teacher Management](#teacher-management)
8. [Class Management](#class-management)
9. [API Reference](#api-reference)
10. [Frontend Pages](#frontend-pages)
11. [Authentication](#authentication)
12. [Deployment](#deployment)

---

## 🌟 System Overview

Stunity Enterprise is a comprehensive school management and e-learning platform designed for educational institutions worldwide. It combines traditional school management features with modern social learning capabilities.

### Key Features

- **Multi-Academic Year Management** - Track students, teachers, and classes across multiple academic years
- **Student Lifecycle** - Enrollment, progression, promotion, and graduation tracking
- **Teacher Assignment** - Subject and class assignments with history tracking
- **Class Management** - Student enrollment with duplicate prevention
- **Academic Transcripts** - Complete student academic history with PDF export
- **Year-Over-Year Comparison** - Analytics and reporting across academic years
- **Bilingual Support** - Full Khmer and English language support

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Authentication | JWT (JSON Web Tokens) |
| State Management | React Context API |

---

## 🏗️ Architecture

### Microservices Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Web Application                      │
│                        (Port 3000)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
│              (JWT Authentication + Multi-Tenant)                 │
└─────────────────────────────────────────────────────────────────┘
          │           │           │           │           │
          ▼           ▼           ▼           ▼           ▼
     ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
     │  Auth  │  │ School │  │Student │  │Teacher │  │ Class  │
     │ :3001  │  │ :3002  │  │ :3003  │  │ :3004  │  │ :3005  │
     └────────┘  └────────┘  └────────┘  └────────┘  └────────┘
          │           │           │           │           │
          ▼           ▼           ▼           ▼           ▼
     ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
     │Subject │  │ Grade  │  │Attend. │  │Timetbl │
     │ :3006  │  │ :3007  │  │ :3008  │  │ :3009  │
     └────────┘  └────────┘  └────────┘  └────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database (Neon)                    │
│                     (Multi-Tenant Schema)                        │
└─────────────────────────────────────────────────────────────────┘
```

### Multi-Tenant Design

Every data record is associated with a `schoolId`, ensuring complete data isolation between schools:

```typescript
// All queries are automatically filtered by schoolId
const students = await prisma.student.findMany({
  where: { schoolId: req.user.schoolId }
});
```

---

## 🔧 Microservices

### Service Overview

| Port | Service | Version | Description |
|------|---------|---------|-------------|
| 3000 | Web App | 4.1 | Next.js frontend application |
| 3001 | Auth Service | 2.0 | Authentication & authorization |
| 3002 | School Service | 2.3 | School & academic year management |
| 3003 | Student Service | 2.1 | Student management & transcripts |
| 3004 | Teacher Service | 2.2 | Teacher management & subject assignments |
| 3005 | Class Service | 2.3 | Class management & student enrollment |
| 3006 | Subject Service | 2.0 | Subject/curriculum management |
| 3007 | Grade Service | 2.0 | Grade entry & calculations |
| 3008 | Attendance Service | 2.0 | Attendance tracking |
| 3009 | Timetable Service | 2.0 | Schedule management |

### Starting Services

```bash
# Quick start all services
./quick-start.sh

# Or start individually
cd services/auth-service && npm start
cd services/school-service && npm start
# ... etc
```

---

## 📊 Database Schema

### Core Entities

#### Student
```prisma
model Student {
  id              String   @id @default(uuid())
  schoolId        String
  studentId       String   // School-assigned ID (e.g., "STU2025001")
  firstName       String
  lastName        String
  khmerName       String?
  gender          Gender
  dateOfBirth     DateTime
  photoUrl        String?
  email           String?
  phone           String?
  address         String?
  isAccountActive Boolean  @default(true)
  
  // Relations
  studentClasses     StudentClass[]
  StudentProgression StudentProgression[]
  grades             Grade[]
  attendances        Attendance[]
}
```

#### Teacher
```prisma
model Teacher {
  id             String   @id @default(uuid())
  schoolId       String
  employeeId     String?
  firstName      String
  lastName       String
  khmerName      String?
  email          String?
  phone          String?
  photoUrl       String?
  position       String?
  department     String?
  qualification  String?
  specialization String?
  
  // Relations
  subjectTeachers SubjectTeacher[]
  teacherClasses  TeacherClass[]
  homeroomClasses Class[]
}
```

#### Class
```prisma
model Class {
  id              String   @id @default(uuid())
  schoolId        String
  academicYearId  String
  name            String   // e.g., "Grade 7A"
  grade           String   // e.g., "7"
  section         String?  // e.g., "A"
  track           String?  // e.g., "Science"
  room            String?
  capacity        Int?
  homeroomTeacherId String?
  
  // Relations
  academicYear    AcademicYear @relation(...)
  homeroomTeacher Teacher?     @relation(...)
  students        StudentClass[]
  teacherClasses  TeacherClass[]
}
```

#### StudentClass (Junction Table)
```prisma
model StudentClass {
  id             String   @id @default(uuid())
  studentId      String
  classId        String
  academicYearId String
  status         String   @default("ACTIVE") // ACTIVE, TRANSFERRED, WITHDRAWN
  enrolledAt     DateTime @default(now())
  
  student      Student      @relation(...)
  class        Class        @relation(...)
  academicYear AcademicYear @relation(...)
  
  @@unique([studentId, classId, academicYearId])
}
```

#### AcademicYear
```prisma
model AcademicYear {
  id        String   @id @default(uuid())
  schoolId  String
  name      String   // e.g., "2025-2026"
  startDate DateTime
  endDate   DateTime
  status    AcademicYearStatus // PLANNING, ACTIVE, COMPLETED, ARCHIVED
  isCurrent Boolean  @default(false)
  
  // Relations
  classes            Class[]
  studentClasses     StudentClass[]
  studentProgressions StudentProgression[]
}
```

#### StudentProgression
```prisma
model StudentProgression {
  id               String        @id @default(uuid())
  studentId        String
  fromAcademicYearId String?
  toAcademicYearId   String
  fromClassId      String?
  toClassId        String?
  fromGrade        String?
  toGrade          String
  promotionType    PromotionType // AUTOMATIC, MANUAL, REPEAT, NEW_ADMISSION, TRANSFER_IN
  promotedAt       DateTime
  notes            String?
}
```

---

## 📅 Multi-Academic Year System

### Features

1. **Academic Year Lifecycle**
   - PLANNING → ACTIVE → COMPLETED → ARCHIVED
   - Only one ACTIVE year at a time
   - Historical data preserved indefinitely

2. **Year Context Provider**
   - Global context for selected academic year
   - All data filtered by selected year
   - Persists selection across page navigation

3. **Student Progression**
   - Track students across years
   - Automatic grade advancement (7→8, 8→9, etc.)
   - Handle repeaters and transfers

### API Endpoints (School Service - Port 3002)

```
GET    /academic-years                 - List all years
POST   /academic-years                 - Create new year
GET    /academic-years/:id             - Get year details
PUT    /academic-years/:id             - Update year
DELETE /academic-years/:id             - Delete year
POST   /academic-years/:id/set-current - Set as current year
GET    /academic-years/:id/statistics  - Get year statistics
GET    /academic-years/compare         - Compare multiple years
```

### Student Promotion API

```
POST /schools/:schoolId/promote-students

Request Body:
{
  "fromAcademicYearId": "year-2024-2025",
  "toAcademicYearId": "year-2025-2026",
  "studentPromotions": [
    {
      "studentId": "student-uuid",
      "fromClassId": "class-7a-uuid",
      "toClassId": "class-8a-uuid",
      "fromGrade": "7",
      "toGrade": "8",
      "promotionType": "AUTOMATIC"
    }
  ]
}
```

---

## 👨‍🎓 Student Management

### Features

- Full CRUD operations
- Photo upload
- Academic transcript generation
- Progression history tracking
- Class enrollment management

### API Endpoints (Student Service - Port 3003)

```
GET    /students                    - List students (with filters)
POST   /students                    - Create student
GET    /students/:id                - Get student details
PUT    /students/:id                - Update student
DELETE /students/:id                - Delete student
GET    /students/:id/transcript     - Get academic transcript
GET    /students/:id/history        - Get progression history
```

### Academic Transcript

The transcript API returns complete academic history:

```json
{
  "success": true,
  "data": {
    "student": {
      "id": "...",
      "firstName": "John",
      "lastName": "Doe",
      "studentId": "STU2025001"
    },
    "academicHistory": [
      {
        "academicYear": { "id": "...", "name": "2024-2025" },
        "class": { "name": "Grade 7A", "grade": "7" },
        "grades": [
          {
            "subject": "Mathematics",
            "term1": 85,
            "term2": 88,
            "final": 87
          }
        ],
        "attendance": {
          "totalDays": 180,
          "presentDays": 175,
          "absentDays": 5,
          "percentage": 97.2
        },
        "progression": {
          "promotionType": "AUTOMATIC",
          "toGrade": "8"
        }
      }
    ]
  }
}
```

---

## 👨‍🏫 Teacher Management

### Features

- Full CRUD operations
- Subject assignment (many-to-many)
- Class assignment
- Assignment history by academic year

### API Endpoints (Teacher Service - Port 3004)

```
GET    /teachers                    - List teachers
POST   /teachers                    - Create teacher
GET    /teachers/:id                - Get teacher details
PUT    /teachers/:id                - Update teacher
DELETE /teachers/:id                - Delete teacher
GET    /teachers/:id/subjects       - Get assigned subjects
POST   /teachers/:id/subjects       - Assign subject
PUT    /teachers/:id/subjects       - Update all subjects (batch)
DELETE /teachers/:id/subjects/:subjectId - Remove subject
GET    /teachers/:id/history        - Get assignment history
```

### Subject Assignment

```json
// PUT /teachers/:id/subjects
{
  "subjectIds": ["math-uuid", "physics-uuid", "chemistry-uuid"]
}

// Response
{
  "success": true,
  "data": {
    "message": "Teacher subjects updated successfully",
    "count": 3
  }
}
```

---

## 🏫 Class Management

### Features

- Class CRUD operations
- Student enrollment with validation
- Duplicate prevention (one student per academic year)
- Student transfer between classes
- Capacity management

### API Endpoints (Class Service - Port 3005)

```
GET    /classes                     - List classes
GET    /classes/lightweight         - List classes (minimal data)
POST   /classes                     - Create class
GET    /classes/:id                 - Get class details
PUT    /classes/:id                 - Update class
DELETE /classes/:id                 - Delete class
GET    /classes/:id/students        - Get enrolled students
POST   /classes/:id/students        - Assign students (with validation)
DELETE /classes/:id/students/:studentId - Remove student
GET    /classes/unassigned-students/:academicYearId - Get unassigned students
POST   /classes/:id/transfer-student - Transfer student between classes
```

### Duplicate Prevention

The system prevents:
1. Same student assigned to same class twice
2. Student assigned to multiple classes in same academic year

```json
// Error Response
{
  "success": false,
  "error": "Student is already enrolled in another class (Grade 7B) for this academic year"
}
```

### Student Transfer

```json
// POST /classes/:id/transfer-student
{
  "studentId": "student-uuid",
  "fromClassId": "class-7a-uuid",
  "reason": "Class change request"
}

// Response
{
  "success": true,
  "message": "Student transferred from \"Grade 7A\" to \"Grade 7B\"",
  "data": {
    "fromClass": "Grade 7A",
    "toClass": "Grade 7B"
  }
}
```

---

## 🔌 API Reference

### Authentication

All API requests (except health checks) require a JWT token:

```
Authorization: Bearer <jwt_token>
```

The JWT payload contains:
```json
{
  "userId": "user-uuid",
  "schoolId": "school-uuid",
  "email": "user@school.edu",
  "role": "ADMIN"
}
```

### Common Response Format

```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed description"
}
```

### Health Check

All services expose a health endpoint:

```
GET /health

Response:
{
  "success": true,
  "message": "Service is running",
  "service": "class-service",
  "version": "2.3",
  "port": 3005
}
```

---

## 🖥️ Frontend Pages

### Main Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Main dashboard with statistics |
| `/students` | Student list with filters |
| `/students/[id]` | Student profile |
| `/students/[id]/transcript` | Academic transcript |
| `/teachers` | Teacher list |
| `/teachers/[id]` | Teacher profile |
| `/teachers/[id]/subjects` | Subject assignment management |
| `/classes` | Class list |
| `/classes/[id]/manage` | Student enrollment management |
| `/classes/[id]/roster` | Class roster view |
| `/subjects` | Subject list |
| `/settings/academic-years` | Academic year management |
| `/settings/academic-years/[id]` | Year details (5 tabs) |
| `/settings/academic-years/[id]/promote` | Promotion wizard |
| `/reports/year-comparison` | Year-over-year comparison |

### Key UI Components

- **UnifiedNavigation** - Sidebar navigation with academic year selector
- **AcademicYearSelector** - Dropdown for selecting active year
- **BlurLoader** - Loading state with blur effect
- **AnimatedContent** - Fade/slide animations

---

## 🔐 Authentication

### Login Flow

1. User submits email/password to `/auth/login`
2. Auth service validates credentials
3. Returns JWT access token and refresh token
4. Frontend stores tokens in localStorage
5. All subsequent requests include JWT in Authorization header

### Token Management

```typescript
// TokenManager (frontend)
TokenManager.getAccessToken()   // Get current token
TokenManager.setTokens(...)     // Store tokens
TokenManager.clearTokens()      // Logout
TokenManager.getUserData()      // Get decoded user info
```

### Test Credentials

```
Email: john.doe@testhighschool.edu
Password: SecurePass123!
```

---

## 🚀 Deployment

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d

# Service Ports
AUTH_PORT=3001
SCHOOL_PORT=3002
STUDENT_PORT=3003
TEACHER_PORT=3004
CLASS_PORT=3005
SUBJECT_PORT=3006
GRADE_PORT=3007
ATTENDANCE_PORT=3008
TIMETABLE_PORT=3009

# Frontend
NEXT_PUBLIC_API_URL=http://localhost
```

### Quick Start

```bash
# Clone repository
git clone https://github.com/naingseiha/Stunity-Enterprise.git
cd Stunity-Enterprise

# Install dependencies
npm install

# Generate Prisma client
cd packages/database && npx prisma generate

# Start all services
./quick-start.sh

# Access application
open http://localhost:3000
```

### Production Deployment

1. Set up PostgreSQL database (Neon recommended)
2. Configure environment variables
3. Build all services: `npm run build`
4. Use PM2 or Docker for process management
5. Set up reverse proxy (nginx)
6. Configure SSL certificates

---

## 📈 Performance Optimization

### Caching Strategy

- **In-memory cache** with stale-while-revalidate pattern
- **Fresh TTL:** 5 minutes
- **Stale TTL:** 10 minutes (serves stale while refreshing)
- **Keep-alive ping:** Every 4 minutes (prevents database sleep)

### Database Connection Pooling

```typescript
// Prisma singleton pattern
const globalForPrisma = global as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Performance Results

| Endpoint | Cold (DB Sleep) | Warm (Cached) |
|----------|-----------------|---------------|
| Students | 3-4s | ~60ms |
| Teachers | 3-7s | ~50ms |
| Classes | 3-4s | ~50ms |
| Subjects | 3-4s | ~40ms |

---

## 📝 Version History

### v4.1 (February 2026) - Enhanced Management
- Class management with student assignment UI
- Teacher subject assignment page
- Duplicate prevention validation
- Student transfer between classes

### v4.0 (January 2026) - Multi-Academic Year
- Academic year detail views (5 tabs)
- New year setup wizard
- Teacher assignment history
- Year-over-year comparison
- Student academic transcript

### v3.0 - Student Promotion
- Bulk promotion API
- Promotion wizard UI
- StudentProgression tracking

### v2.0 - Academic Year Management
- Academic year CRUD
- Year status transitions
- Global year context

### v1.0 - Core Features
- Microservices architecture
- Student/Teacher/Class management
- Authentication system

---

## 🆘 Troubleshooting

### Class Service Not Starting

If port 3005 fails to start:

```bash
# Check if port is in use
lsof -ti:3005

# Kill existing process
kill $(lsof -ti:3005)

# Rebuild and start
cd services/class-service
npm run build
npm start
```

### Database Connection Issues

```bash
# Regenerate Prisma client
cd packages/database
npx prisma generate

# Test connection
npx prisma db pull
```

### JWT Token Issues

Ensure all services use the same `JWT_SECRET` in `.env` file.

---

## 📚 Related Documentation

- [Multi-Academic Year System](./MULTI_ACADEMIC_YEAR_SYSTEM.md)
- [Enhanced Management System](./ENHANCED_MANAGEMENT_SYSTEM.md)
- [API Documentation](./api/)
- [Architecture Guide](./architecture/)
- [Deployment Guide](./deployment-setup/)

---

**© 2026 Stunity Enterprise. All rights reserved.**
