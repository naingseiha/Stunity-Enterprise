# 📚 API Documentation - Multi-Tenant School Management System

## Overview

Complete API reference for the upgraded multi-tenant school management system with multi-academic year support.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Schools API](#schools-api)
3. [Academic Years API](#academic-years-api)
4. [Students API](#students-api)
5. [Student Enrollment API](#student-enrollment-api)
6. [Student Progression API](#student-progression-api)
7. [Teachers API](#teachers-api)
8. [Classes API](#classes-api)
9. [Subjects API](#subjects-api)
10. [Grades API](#grades-api)
11. [Attendance API](#attendance-api)
12. [Super Admin API](#super-admin-api)
13. [Reports API](#reports-api)
14. [Error Codes](#error-codes)

---

## Authentication

### Headers Required

```http
Authorization: Bearer <jwt_token>
X-School-ID: <school_id>           // Required for school-specific requests
X-Academic-Year-ID: <year_id>      // Optional, defaults to current year
Content-Type: application/json
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-001",
    "email": "user@example.com",
    "role": "ADMIN",
    "schoolId": "school-001"
  },
  "school": {
    "id": "school-001",
    "name": "Sample School",
    "schoolId": "SCH-PP-001"
  }
}
```

---

## Schools API

### Create School (Super Admin Only)

```http
POST /api/super-admin/schools
Authorization: Bearer <super_admin_token>

{
  "name": "New School Name",
  "nameKh": "ឈ្មោះសាលា",
  "nameEn": "School Name (optional)",
  "province": "Phnom Penh",
  "district": "Chamkar Mon",
  "address": "Street 123, Phnom Penh",
  "email": "school@example.com",
  "phone": "+855123456789",
  "schoolType": "HIGH_SCHOOL",
  "isPublic": true,
  "principalName": "Principal Name"
}
```

**Response:**
```json
{
  "id": "school-002",
  "schoolId": "SCH-PP-002",
  "name": "New School Name",
  "nameKh": "ឈ្មោះសាលា",
  "province": "Phnom Penh",
  "status": "PENDING",
  "createdAt": "2026-01-12T10:00:00Z"
}
```

### List All Schools

```http
GET /api/super-admin/schools?province=Phnom Penh&status=ACTIVE&page=1&limit=20
```

**Response:**
```json
{
  "data": [
    {
      "id": "school-001",
      "schoolId": "SCH-PP-001",
      "name": "School Name",
      "nameKh": "ឈ្មោះសាលា",
      "province": "Phnom Penh",
      "status": "ACTIVE",
      "studentCount": 500,
      "teacherCount": 30,
      "classCount": 12
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Get School Details

```http
GET /api/super-admin/schools/:schoolId
```

**Response:**
```json
{
  "id": "school-001",
  "schoolId": "SCH-PP-001",
  "name": "School Name",
  "nameKh": "ឈ្មោះសាលា",
  "province": "Phnom Penh",
  "address": "123 Street, Phnom Penh",
  "email": "school@example.com",
  "phone": "+855123456789",
  "schoolType": "HIGH_SCHOOL",
  "status": "ACTIVE",
  "subscriptionTier": "PREMIUM",
  "subscriptionExpiry": "2027-01-12T00:00:00Z",
  "academicYears": [
    {
      "id": "year-001",
      "name": "2024-2025",
      "isCurrent": true
    }
  ],
  "statistics": {
    "totalStudents": 500,
    "totalTeachers": 30,
    "totalClasses": 12,
    "activeUsers": 450
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "activatedAt": "2024-01-15T00:00:00Z"
}
```

### Update School

```http
PUT /api/super-admin/schools/:schoolId
Authorization: Bearer <super_admin_token>

{
  "name": "Updated School Name",
  "phone": "+855987654321",
  "principalName": "New Principal"
}
```

### Activate School

```http
PUT /api/super-admin/schools/:schoolId/activate
Authorization: Bearer <super_admin_token>
```

### Deactivate School

```http
PUT /api/super-admin/schools/:schoolId/deactivate
Authorization: Bearer <super_admin_token>

{
  "reason": "Subscription expired"
}
```

---

## Academic Years API

### Create Academic Year

```http
POST /api/academic-years
X-School-ID: school-001

{
  "name": "2025-2026",
  "displayName": "Academic Year 2025-2026",
  "startDate": "2025-09-01",
  "endDate": "2026-06-30",
  "semesters": [
    {
      "name": "Semester 1",
      "start": "2025-09-01",
      "end": "2025-12-31"
    },
    {
      "name": "Semester 2",
      "start": "2026-01-01",
      "end": "2026-06-30"
    }
  ],
  "holidays": [
    {
      "name": "Khmer New Year",
      "start": "2026-04-14",
      "end": "2026-04-16"
    }
  ]
}
```

**Response:**
```json
{
  "id": "year-002",
  "schoolId": "school-001",
  "name": "2025-2026",
  "startDate": "2025-09-01T00:00:00Z",
  "endDate": "2026-06-30T23:59:59Z",
  "status": "PLANNING",
  "isCurrent": false,
  "isActive": false,
  "createdAt": "2026-01-12T10:00:00Z"
}
```

### List Academic Years

```http
GET /api/academic-years
X-School-ID: school-001
```

**Response:**
```json
{
  "data": [
    {
      "id": "year-001",
      "name": "2024-2025",
      "startDate": "2024-09-01T00:00:00Z",
      "endDate": "2025-06-30T23:59:59Z",
      "status": "ACTIVE",
      "isCurrent": true,
      "totalStudents": 500,
      "totalTeachers": 30,
      "totalClasses": 12
    },
    {
      "id": "year-002",
      "name": "2025-2026",
      "startDate": "2025-09-01T00:00:00Z",
      "endDate": "2026-06-30T23:59:59Z",
      "status": "PLANNING",
      "isCurrent": false
    }
  ]
}
```

### Get Current Academic Year

```http
GET /api/academic-years/current
X-School-ID: school-001
```

**Response:**
```json
{
  "id": "year-001",
  "name": "2024-2025",
  "startDate": "2024-09-01T00:00:00Z",
  "endDate": "2025-06-30T23:59:59Z",
  "status": "ACTIVE",
  "isCurrent": true,
  "totalStudents": 500
}
```

### Activate Academic Year

```http
PUT /api/academic-years/:yearId/activate
X-School-ID: school-001
```

**Note:** This will deactivate the currently active year.

### Close Academic Year (Year-End)

```http
POST /api/academic-years/:yearId/close
X-School-ID: school-001

{
  "finalizeGrades": true,
  "generateReports": true
}
```

**Response:**
```json
{
  "id": "year-001",
  "status": "CLOSED",
  "closedAt": "2025-06-30T23:59:59Z",
  "statistics": {
    "totalStudents": 500,
    "promoted": 450,
    "retained": 30,
    "graduated": 20
  }
}
```

---

## Students API

### Create Student

```http
POST /api/students
X-School-ID: school-001

{
  "firstName": "John",
  "lastName": "Doe",
  "khmerName": "ចន ដូវ",
  "dateOfBirth": "2010-05-15",
  "gender": "MALE",
  "placeOfBirth": "Phnom Penh",
  "currentAddress": "123 Street, Phnom Penh",
  "phoneNumber": "+855123456789",
  "email": "john.doe@example.com",
  "fatherName": "Father Name",
  "motherName": "Mother Name",
  "parentPhone": "+855987654321",
  "previousSchool": "Previous School Name",
  "previousGrade": "GRADE_6"
}
```

**Response:**
```json
{
  "id": "student-001",
  "studentId": "S2024-001",
  "firstName": "John",
  "lastName": "Doe",
  "khmerName": "ចន ដូវ",
  "enrollmentStatus": "ACTIVE",
  "createdAt": "2026-01-12T10:00:00Z"
}
```

### Get Student with History

```http
GET /api/students/:studentId/history
X-School-ID: school-001
```

**Response:**
```json
{
  "student": {
    "id": "student-001",
    "studentId": "S2024-001",
    "firstName": "John",
    "lastName": "Doe",
    "khmerName": "ចន ដូវ",
    "currentGrade": "GRADE_8",
    "currentClass": {
      "id": "class-001",
      "name": "8A",
      "grade": "GRADE_8"
    }
  },
  "history": [
    {
      "academicYear": "2024-2025",
      "grade": "GRADE_7",
      "class": "7A",
      "finalAverage": 85.5,
      "classRank": 3,
      "status": "PROMOTED",
      "attendanceRate": 95.2
    },
    {
      "academicYear": "2023-2024",
      "grade": "GRADE_6",
      "class": "6B",
      "finalAverage": 82.0,
      "classRank": 5,
      "status": "PROMOTED",
      "attendanceRate": 93.8
    }
  ],
  "transcripts": [
    {
      "academicYear": "2024-2025",
      "subjects": [
        {
          "name": "Khmer",
          "monthlyScores": [80, 85, 88, 90],
          "average": 85.75
        }
      ]
    }
  ]
}
```

### Generate Student Transcript

```http
GET /api/students/:studentId/transcript?years=all&format=pdf
X-School-ID: school-001
```

**Response:** PDF file download

---

## Student Enrollment API

### Enroll Student

```http
POST /api/student-enrollments
X-School-ID: school-001

{
  "studentId": "student-001",
  "classId": "class-001",
  "academicYearId": "year-001",
  "enrollmentType": "REGULAR"
}
```

**Response:**
```json
{
  "id": "enrollment-001",
  "studentId": "student-001",
  "classId": "class-001",
  "academicYearId": "year-001",
  "status": "ACTIVE",
  "enrollmentDate": "2024-09-01T00:00:00Z"
}
```

### Get Student Enrollments

```http
GET /api/student-enrollments?studentId=student-001
X-School-ID: school-001
```

**Response:**
```json
{
  "data": [
    {
      "id": "enrollment-001",
      "academicYear": {
        "id": "year-001",
        "name": "2024-2025"
      },
      "class": {
        "id": "class-001",
        "name": "8A",
        "grade": "GRADE_8"
      },
      "status": "ACTIVE",
      "enrollmentDate": "2024-09-01T00:00:00Z"
    }
  ]
}
```

### Update Enrollment Status

```http
PUT /api/student-enrollments/:enrollmentId
X-School-ID: school-001

{
  "status": "COMPLETED",
  "finalAverage": 85.5,
  "classRank": 3,
  "promotionStatus": "PROMOTED",
  "promotedToGrade": "GRADE_9"
}
```

---

## Student Progression API

### Preview Promotion

```http
POST /api/student-progression/preview
X-School-ID: school-001

{
  "sourceYearId": "year-001",
  "targetYearId": "year-002",
  "rules": {
    "minimumAverage": 50,
    "requiredSubjects": ["KHMER", "MATH"],
    "autoPromote": true
  }
}
```

**Response:**
```json
{
  "totalStudents": 500,
  "preview": {
    "promoted": 450,
    "retained": 30,
    "graduated": 20
  },
  "promotionDetails": [
    {
      "studentId": "student-001",
      "currentGrade": "GRADE_7",
      "nextGrade": "GRADE_8",
      "finalAverage": 85.5,
      "status": "PROMOTED",
      "reason": "Meets criteria"
    },
    {
      "studentId": "student-002",
      "currentGrade": "GRADE_7",
      "nextGrade": "GRADE_7",
      "finalAverage": 45.0,
      "status": "RETAINED",
      "reason": "Below minimum average"
    }
  ]
}
```

### Execute Promotion

```http
POST /api/student-progression/execute
X-School-ID: school-001

{
  "sourceYearId": "year-001",
  "targetYearId": "year-002",
  "rules": {
    "minimumAverage": 50,
    "requiredSubjects": ["KHMER", "MATH"],
    "autoPromote": true
  },
  "confirmed": true
}
```

**Response:**
```json
{
  "transitionId": "transition-001",
  "status": "IN_PROGRESS",
  "progress": {
    "processed": 0,
    "total": 500
  }
}
```

### Check Progression Status

```http
GET /api/student-progression/:transitionId/status
X-School-ID: school-001
```

**Response:**
```json
{
  "id": "transition-001",
  "status": "COMPLETED",
  "progress": {
    "processed": 500,
    "total": 500
  },
  "results": {
    "promoted": 450,
    "retained": 30,
    "graduated": 20,
    "errors": 0
  },
  "completedAt": "2025-07-01T10:30:00Z"
}
```

### Rollback Progression

```http
POST /api/student-progression/:transitionId/rollback
X-School-ID: school-001

{
  "reason": "Incorrect promotion rules applied"
}
```

---

## Teachers API

### Create Teacher

```http
POST /api/teachers
X-School-ID: school-001

{
  "firstName": "Jane",
  "lastName": "Smith",
  "khmerName": "ស្មីត",
  "email": "jane.smith@school.com",
  "phone": "+855123456789",
  "gender": "FEMALE",
  "dateOfBirth": "1985-03-20",
  "degree": "BACHELOR",
  "major1": "Mathematics",
  "position": "Mathematics Teacher",
  "hireDate": "2020-09-01"
}
```

### Assign Teacher to Class/Subject

```http
POST /api/teacher-assignments
X-School-ID: school-001

{
  "teacherId": "teacher-001",
  "classId": "class-001",
  "subjectId": "subject-001",
  "academicYearId": "year-001",
  "isHomeroom": false,
  "weeklyHours": 4
}
```

---

## Classes API

### Create Class

```http
POST /api/classes
X-School-ID: school-001
X-Academic-Year-ID: year-001

{
  "name": "8A",
  "grade": "GRADE_8",
  "section": "A",
  "capacity": 40,
  "homeroomTeacherId": "teacher-001",
  "roomNumber": "201",
  "building": "Main Building"
}
```

### Get Class Students

```http
GET /api/classes/:classId/students
X-School-ID: school-001
X-Academic-Year-ID: year-001
```

**Response:**
```json
{
  "class": {
    "id": "class-001",
    "name": "8A",
    "grade": "GRADE_8",
    "capacity": 40,
    "currentEnrollment": 35
  },
  "students": [
    {
      "id": "student-001",
      "studentId": "S2024-001",
      "firstName": "John",
      "lastName": "Doe",
      "khmerName": "ចន ដូវ",
      "currentAverage": 85.5,
      "classRank": 3
    }
  ]
}
```

---

## Grades API

### Enter Grade

```http
POST /api/grades
X-School-ID: school-001
X-Academic-Year-ID: year-001

{
  "studentId": "student-001",
  "subjectId": "subject-001",
  "classId": "class-001",
  "score": 85,
  "maxScore": 100,
  "month": "JANUARY",
  "monthNumber": 1,
  "year": 2025,
  "remarks": "Good performance"
}
```

### Get Student Grades

```http
GET /api/grades?studentId=student-001&month=JANUARY&year=2025
X-School-ID: school-001
X-Academic-Year-ID: year-001
```

### Get Class Grades

```http
GET /api/grades?classId=class-001&subjectId=subject-001&month=JANUARY
X-School-ID: school-001
X-Academic-Year-ID: year-001
```

### Bulk Grade Entry

```http
POST /api/grades/bulk
X-School-ID: school-001
X-Academic-Year-ID: year-001

{
  "classId": "class-001",
  "subjectId": "subject-001",
  "month": "JANUARY",
  "year": 2025,
  "grades": [
    {
      "studentId": "student-001",
      "score": 85,
      "maxScore": 100
    },
    {
      "studentId": "student-002",
      "score": 90,
      "maxScore": 100
    }
  ]
}
```

---

## Attendance API

### Mark Attendance

```http
POST /api/attendance
X-School-ID: school-001
X-Academic-Year-ID: year-001

{
  "classId": "class-001",
  "date": "2025-01-12",
  "session": "MORNING",
  "attendance": [
    {
      "studentId": "student-001",
      "status": "PRESENT"
    },
    {
      "studentId": "student-002",
      "status": "ABSENT",
      "remarks": "Sick"
    }
  ]
}
```

### Get Class Attendance

```http
GET /api/attendance?classId=class-001&date=2025-01-12&session=MORNING
X-School-ID: school-001
X-Academic-Year-ID: year-001
```

### Get Student Attendance History

```http
GET /api/attendance/student/:studentId?startDate=2025-01-01&endDate=2025-01-31
X-School-ID: school-001
X-Academic-Year-ID: year-001
```

---

## Super Admin API

### Dashboard Statistics

```http
GET /api/super-admin/dashboard/stats
Authorization: Bearer <super_admin_token>
```

**Response:**
```json
{
  "totalSchools": 45,
  "activeSchools": 42,
  "pendingSchools": 3,
  "totalStudents": 22500,
  "totalTeachers": 1350,
  "totalClasses": 540,
  "byProvince": {
    "Phnom Penh": 15,
    "Siem Reap": 10,
    "Battambang": 8
  },
  "growth": {
    "schools": "+5%",
    "students": "+12%"
  }
}
```

### School Analytics

```http
GET /api/super-admin/schools/:schoolId/analytics?period=year
Authorization: Bearer <super_admin_token>
```

**Response:**
```json
{
  "schoolId": "school-001",
  "period": "2024-2025",
  "studentEnrollment": {
    "total": 500,
    "byGrade": {
      "GRADE_7": 85,
      "GRADE_8": 82,
      "GRADE_9": 80
    },
    "trend": "+5%"
  },
  "academicPerformance": {
    "averageScore": 78.5,
    "passRate": 92.0,
    "topPerformers": 50
  },
  "attendance": {
    "averageRate": 94.5,
    "absenteeRate": 5.5
  },
  "teacherMetrics": {
    "total": 30,
    "studentTeacherRatio": 16.7
  }
}
```

### Create Template

```http
POST /api/super-admin/templates
Authorization: Bearer <super_admin_token>

{
  "name": "Cambodia High School - Standard",
  "description": "Standard template for Cambodian high schools",
  "type": "COMPLETE",
  "targetGrades": ["GRADE_7", "GRADE_8", "GRADE_9", "GRADE_10", "GRADE_11", "GRADE_12"],
  "targetSchoolType": "HIGH_SCHOOL",
  "data": {
    "subjects": [
      {
        "name": "Khmer",
        "nameKh": "ភាសាខ្មែរ",
        "code": "KHM",
        "grade": "GRADE_7",
        "coefficient": 2.0,
        "weeklyHours": 6
      }
    ],
    "classes": [
      {
        "grade": "GRADE_7",
        "sections": ["A", "B", "C"],
        "capacity": 40
      }
    ]
  }
}
```

### Apply Template to School

```http
POST /api/super-admin/schools/:schoolId/template
Authorization: Bearer <super_admin_token>

{
  "templateId": "template-001",
  "overwrite": false
}
```

### Audit Logs

```http
GET /api/super-admin/audit-logs?schoolId=school-001&action=UPDATE_USER&startDate=2025-01-01
Authorization: Bearer <super_admin_token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "log-001",
      "timestamp": "2025-01-12T10:00:00Z",
      "userId": "user-001",
      "userName": "Admin User",
      "schoolId": "school-001",
      "action": "UPDATE_USER",
      "entityType": "User",
      "entityId": "user-002",
      "changes": {
        "before": {"role": "TEACHER"},
        "after": {"role": "ADMIN"}
      },
      "ipAddress": "123.45.67.89"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1250
  }
}
```

---

## Reports API

### Generate Report Card

```http
POST /api/reports/report-card
X-School-ID: school-001
X-Academic-Year-ID: year-001

{
  "studentId": "student-001",
  "month": "JANUARY",
  "format": "pdf"
}
```

**Response:** PDF file download

### Generate Class Report

```http
POST /api/reports/class-report
X-School-ID: school-001
X-Academic-Year-ID: year-001

{
  "classId": "class-001",
  "month": "JANUARY",
  "includeGrades": true,
  "includeAttendance": true,
  "format": "pdf"
}
```

### Generate School Statistics Report

```http
GET /api/reports/school-statistics?academicYearId=year-001&format=excel
X-School-ID: school-001
```

### Generate Multi-Year Comparison

```http
POST /api/reports/year-comparison
X-School-ID: school-001

{
  "yearIds": ["year-001", "year-002"],
  "metrics": ["enrollment", "performance", "attendance"],
  "format": "pdf"
}
```

---

## Error Codes

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions or inactive school)
- `404` - Not Found
- `409` - Conflict (e.g., duplicate entry)
- `422` - Validation Error
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

### Error Response Format

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context"
  },
  "timestamp": "2026-01-12T10:00:00Z"
}
```

### Common Error Codes

```
SCHOOL_NOT_FOUND          - School does not exist
SCHOOL_INACTIVE           - School is not active
SUBSCRIPTION_EXPIRED      - School subscription has expired
ACADEMIC_YEAR_NOT_FOUND   - Academic year does not exist
OVERLAPPING_YEAR          - Academic year dates overlap with existing year
STUDENT_NOT_FOUND         - Student does not exist
ENROLLMENT_EXISTS         - Student already enrolled in this year
INVALID_PROMOTION         - Cannot promote student (doesn't meet criteria)
TRANSITION_IN_PROGRESS    - Year transition already in progress
CLASS_FULL                - Class has reached capacity
GRADE_ALREADY_ENTERED     - Grade already exists for this period
INVALID_CREDENTIALS       - Invalid email/password
PERMISSION_DENIED         - User lacks required permissions
TENANT_MISMATCH           - Resource belongs to different school
```

---

## Rate Limiting

- **Standard Users:** 100 requests per minute
- **Admin Users:** 200 requests per minute
- **Super Admins:** 500 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642076400
```

---

## Pagination

Standard pagination parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "totalPages": 25,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Webhooks (Future Feature)

Schools can subscribe to webhooks for real-time notifications:

Events:
- `student.enrolled`
- `student.promoted`
- `grade.entered`
- `attendance.marked`
- `year.activated`
- `year.closed`

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { SchoolManagementAPI } from '@school-management/sdk';

const api = new SchoolManagementAPI({
  apiUrl: 'https://api.school.com',
  token: 'your-jwt-token',
  schoolId: 'school-001'
});

// Get current academic year
const currentYear = await api.academicYears.getCurrent();

// Enroll student
const enrollment = await api.students.enroll({
  studentId: 'student-001',
  classId: 'class-001',
  academicYearId: currentYear.id
});

// Enter grades
await api.grades.create({
  studentId: 'student-001',
  subjectId: 'subject-001',
  classId: 'class-001',
  score: 85,
  month: 'JANUARY'
});
```

---

**Document Version:** 1.0
**Last Updated:** January 12, 2026
**Status:** Complete
