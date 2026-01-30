# Attendance Service

A microservice for managing student attendance in the Stunity Enterprise system.

## Overview

The Attendance Service provides comprehensive attendance tracking features including:
- Daily attendance marking with morning/afternoon sessions
- Bulk attendance operations
- Grid/calendar view for monthly attendance
- Individual and class-wide statistics
- Multi-tenant support with school isolation

## Configuration

### Environment Variables

Create a `.env` file in the service root:

```env
PORT=3008
DATABASE_URL="postgresql://postgres:password@localhost:5432/stunity_enterprise?schema=public"
JWT_SECRET="stunity-enterprise-secret-2026"
```

### Port

Default: `3008`

## Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

## Database Schema

The service uses the `Attendance` model from Prisma:

```prisma
model Attendance {
  id        String            @id @default(cuid())
  studentId String
  classId   String?
  date      DateTime
  status    AttendanceStatus
  remarks   String?
  session   AttendanceSession @default(MORNING)
  
  student   Student           @relation(fields: [studentId], references: [id], onDelete: Cascade)
  class     Class?            @relation(fields: [classId], references: [id])
  
  @@unique([studentId, classId, date, session])
  @@index([classId, date])
  @@index([studentId, date])
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  EXCUSED
  PERMISSION
}

enum AttendanceSession {
  MORNING
  AFTERNOON
}
```

## API Endpoints

### Authentication

All endpoints (except `/health`) require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <token>
```

The JWT token must contain:
- `userId`: User ID
- `schoolId`: School ID (for multi-tenancy)
- `email`: User email
- `role`: User role

### Health Check

#### `GET /health`

Returns service health status.

**Response:**
```json
{
  "success": true,
  "message": "Attendance Service is running",
  "service": "attendance-service",
  "port": "3008"
}
```

---

## A. Attendance Marking

### Get Class Attendance for Date

#### `GET /attendance/class/:classId/date/:date`

Fetch all students in a class with their attendance for a specific date.

**Parameters:**
- `classId` (path): Class ID
- `date` (path): Date in ISO format (e.g., `2024-01-15`)

**Response:**
```json
{
  "success": true,
  "data": {
    "classId": "class123",
    "date": "2024-01-15",
    "students": [
      {
        "studentId": "student123",
        "studentNumber": "STU001",
        "firstName": "John",
        "lastName": "Doe",
        "photo": "https://...",
        "morning": {
          "id": "att123",
          "status": "PRESENT",
          "remarks": null
        },
        "afternoon": {
          "id": "att124",
          "status": "ABSENT",
          "remarks": "Sick"
        }
      }
    ]
  }
}
```

**Notes:**
- Returns `null` for sessions without attendance records
- Validates class belongs to school
- Students are ordered by first name

---

### Bulk Save Attendance

#### `POST /attendance/bulk`

Bulk upsert attendance records for multiple students.

**Request Body:**
```json
{
  "classId": "class123",
  "date": "2024-01-15",
  "session": "MORNING",
  "attendance": [
    {
      "studentId": "student123",
      "status": "PRESENT",
      "remarks": null
    },
    {
      "studentId": "student456",
      "status": "ABSENT",
      "remarks": "Sick leave"
    },
    {
      "studentId": "student789",
      "status": "LATE",
      "remarks": "Traffic"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Attendance saved successfully",
  "data": {
    "savedCount": 3,
    "classId": "class123",
    "date": "2024-01-15",
    "session": "MORNING"
  }
}
```

**Validation:**
- All students must belong to the specified class
- Status must be one of: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`, `PERMISSION`
- Session must be: `MORNING` or `AFTERNOON`
- Uses Prisma transaction for atomicity
- Upserts records (creates new or updates existing)

---

### Update Single Attendance

#### `PUT /attendance/:id`

Update a single attendance record.

**Parameters:**
- `id` (path): Attendance record ID

**Request Body:**
```json
{
  "status": "EXCUSED",
  "remarks": "Medical appointment"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Attendance updated successfully",
  "data": {
    "id": "att123",
    "studentId": "student123",
    "classId": "class123",
    "date": "2024-01-15T00:00:00.000Z",
    "status": "EXCUSED",
    "remarks": "Medical appointment",
    "session": "MORNING",
    "createdAt": "2024-01-15T08:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Validation:**
- Record must exist
- Record must belong to school (via student)
- Status must be valid

---

### Delete Attendance

#### `DELETE /attendance/:id`

Delete a single attendance record.

**Parameters:**
- `id` (path): Attendance record ID

**Response:**
```json
{
  "success": true,
  "message": "Attendance deleted successfully"
}
```

**Validation:**
- Record must exist
- Record must belong to school

---

## B. Grid/Calendar View

### Get Monthly Attendance Grid

#### `GET /attendance/class/:classId/month/:month/year/:year`

Fetch entire month's attendance for all students in a class.

**Parameters:**
- `classId` (path): Class ID
- `month` (path): Month number (1-12)
- `year` (path): Year (e.g., 2024)

**Response:**
```json
{
  "success": true,
  "data": {
    "classId": "class123",
    "month": 1,
    "year": 2024,
    "students": [
      {
        "studentId": "student123",
        "studentNumber": "STU001",
        "firstName": "John",
        "lastName": "Doe",
        "photo": "https://...",
        "attendance": {
          "2024-01-15": {
            "morning": {
              "id": "att123",
              "status": "PRESENT",
              "remarks": null
            },
            "afternoon": {
              "id": "att124",
              "status": "PRESENT",
              "remarks": null
            }
          },
          "2024-01-16": {
            "morning": {
              "id": "att125",
              "status": "ABSENT",
              "remarks": "Sick"
            }
          }
        },
        "totals": {
          "present": 15,
          "absent": 2,
          "late": 1,
          "excused": 1,
          "permission": 0
        }
      }
    ]
  }
}
```

**Notes:**
- Optimized for grid display
- Groups by student, then by date and session
- Includes monthly totals per student
- Validates month (1-12) and year

---

## C. Statistics

### Student Attendance Summary

#### `GET /attendance/student/:studentId/summary`

Calculate attendance statistics for a student over a date range.

**Parameters:**
- `studentId` (path): Student ID
- `startDate` (query, optional): Start date (ISO format, defaults to start of current month)
- `endDate` (query, optional): End date (ISO format, defaults to end of current month)

**Example:**
```
GET /attendance/student/student123/summary?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "student123",
      "studentNumber": "STU001",
      "firstName": "John",
      "lastName": "Doe"
    },
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "totals": {
      "present": 38,
      "absent": 2,
      "late": 1,
      "excused": 1,
      "permission": 0
    },
    "summary": {
      "totalSchoolDays": 22,
      "totalSessions": 44,
      "attendedSessions": 39,
      "attendancePercentage": 89
    }
  }
}
```

**Notes:**
- Excludes weekends from school days calculation
- Counts `PRESENT` and `LATE` as attended
- Percentage is rounded to nearest integer

---

### Class Attendance Summary

#### `GET /attendance/class/:classId/summary`

Calculate class-wide attendance statistics.

**Parameters:**
- `classId` (path): Class ID
- `startDate` (query, required): Start date (ISO format)
- `endDate` (query, required): End date (ISO format)

**Example:**
```
GET /attendance/class/class123/summary?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "class": {
      "id": "class123",
      "name": "Grade 10A",
      "studentCount": 30
    },
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "totals": {
      "present": 1140,
      "absent": 60,
      "late": 30,
      "excused": 15,
      "permission": 5
    },
    "summary": {
      "totalSchoolDays": 22,
      "totalPossibleSessions": 1320,
      "attendedSessions": 1170,
      "averageAttendanceRate": 89
    },
    "dayByDay": [
      {
        "date": "2024-01-15",
        "present": 55,
        "absent": 3,
        "late": 2,
        "excused": 0,
        "permission": 0
      }
    ]
  }
}
```

**Notes:**
- Requires both start and end dates
- Includes day-by-day breakdown
- Average attendance rate for entire class

---

## Utility Functions

### calculateAttendancePercentage(present, total)

Calculates attendance percentage rounded to nearest integer.

```typescript
const percentage = calculateAttendancePercentage(39, 44); // 89
```

### getSchoolDays(startDate, endDate)

Counts weekdays (excludes weekends) between two dates.

```typescript
const schoolDays = getSchoolDays(new Date('2024-01-01'), new Date('2024-01-31')); // 22
```

### validateAttendanceStatus(status)

Validates if status is one of the allowed values.

```typescript
validateAttendanceStatus('PRESENT'); // true
validateAttendanceStatus('INVALID'); // false
```

### validateAttendanceSession(session)

Validates if session is MORNING or AFTERNOON.

```typescript
validateAttendanceSession('MORNING'); // true
validateAttendanceSession('EVENING'); // false
```

---

## Security & Multi-Tenancy

### School Isolation

All database queries are automatically filtered by `schoolId` from the JWT token. This ensures:
- Schools can only access their own data
- Cross-school data leakage is prevented
- No additional security logic needed in controllers

### Validation Layers

1. **JWT Validation**: Token must be valid and not expired
2. **School Active Check**: School must be active
3. **Trial Expiry Check**: Trial schools must be within trial period
4. **Resource Ownership**: Classes, students, and attendance records must belong to school
5. **Input Validation**: All inputs validated before processing

### Example Flow

```
Request → JWT Auth → Extract schoolId → Query with schoolId filter → Response
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (dev mode)"
}
```

### Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (inactive school, expired trial)
- `404`: Not Found
- `500`: Internal Server Error

---

## Testing

### Using curl

```bash
# Health check
curl http://localhost:3008/health

# Get attendance (with auth)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3008/attendance/class/class123/date/2024-01-15

# Bulk save attendance
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "classId": "class123",
    "date": "2024-01-15",
    "session": "MORNING",
    "attendance": [
      {"studentId": "student1", "status": "PRESENT"},
      {"studentId": "student2", "status": "ABSENT", "remarks": "Sick"}
    ]
  }' \
  http://localhost:3008/attendance/bulk
```

---

## Dependencies

### Production
- `express`: Web framework
- `@prisma/client`: Database ORM
- `cors`: CORS middleware
- `dotenv`: Environment variables
- `date-fns`: Date utilities
- `jsonwebtoken`: JWT validation

### Development
- `typescript`: TypeScript compiler
- `ts-node`: TypeScript execution
- `nodemon`: Hot reload
- `@types/*`: Type definitions

---

## Architecture

### Service Structure

```
attendance-service/
├── src/
│   └── index.ts          # Main service file
├── dist/                 # Compiled JavaScript
├── .env                  # Environment variables
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── nodemon.json          # Nodemon config
└── README.md            # This file
```

### Key Design Decisions

1. **Bulk Operations**: Use Prisma transactions for atomic bulk inserts
2. **Upsert Strategy**: Allows updating existing records or creating new ones
3. **Date Handling**: All dates stored in UTC, displayed in ISO format
4. **Multi-Session Support**: Each day has morning/afternoon sessions
5. **Soft Validation**: Students without records return `null` instead of errors

---

## Performance Considerations

### Indexing

The Attendance table has optimized indexes:
- `[studentId, classId, date, session]`: Unique constraint & fast lookups
- `[classId, date]`: Fast class-wide queries
- `[studentId, date]`: Fast student-specific queries

### Query Optimization

- Only select needed fields (avoid `select *`)
- Use Prisma's efficient batching for bulk operations
- Filter by schoolId at database level (indexed)
- Weekend calculation done in-memory (not DB query)

---

## Future Enhancements

Potential features for future versions:
- [ ] Attendance reports export (PDF, Excel)
- [ ] Automated absence notifications
- [ ] Attendance patterns analysis
- [ ] Integration with parent portal
- [ ] QR code attendance marking
- [ ] Biometric attendance support
- [ ] Holiday/weekend configuration
- [ ] Custom attendance statuses per school

---

## Support

For issues or questions, contact the Stunity Enterprise development team.

**Service Version**: 2.0.0
