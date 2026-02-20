# Enhanced Management System Documentation

## Overview

This document covers the enhanced management features for Stunity Enterprise, including:
- Class Management with Student Assignment
- Teacher Subject Assignment
- Duplicate Prevention Validation
- Full CRUD APIs for management operations

---

## Class Management System

### Features

1. **Student Assignment Interface** (`/classes/[id]/manage`)
   - Dual-column layout with unassigned and enrolled students
   - Multi-select with checkboxes
   - Search filtering for both lists
   - Batch assign/remove operations
   - Real-time validation feedback

2. **Duplicate Prevention**
   - Prevents same student from being in same class twice
   - Prevents student from being in multiple classes in the same academic year
   - Shows detailed error messages with existing class name

3. **Student Transfer**
   - Transfer students between classes within same academic year
   - Automatic removal from source class and addition to target

### API Endpoints (Class Service - Port 3005)

#### Get Unassigned Students
```
GET /classes/unassigned-students/:academicYearId

Response:
{
  "success": true,
  "data": {
    "students": [
      {
        "id": "student-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "studentId": "STU001",
        "email": "john@example.com"
      }
    ],
    "totalCount": 25,
    "academicYear": {
      "id": "year-uuid",
      "name": "2024-2025"
    }
  }
}
```

#### Assign Students to Class (with validation)
```
POST /classes/:id/students

Request Body:
{
  "studentIds": ["student-1", "student-2", "student-3"]
}

Success Response:
{
  "success": true,
  "data": {
    "assignedCount": 3,
    "failedCount": 0,
    "errors": []
  }
}

Validation Error Response:
{
  "success": false,
  "error": "Student is already enrolled in another class (Grade 7A) for this academic year"
}
```

#### Transfer Student
```
POST /classes/:id/transfer-student

Request Body:
{
  "studentId": "student-uuid",
  "fromClassId": "source-class-uuid"
}

Response:
{
  "success": true,
  "data": {
    "message": "Student transferred successfully",
    "fromClass": "Grade 7A",
    "toClass": "Grade 7B"
  }
}
```

#### Remove Students from Class
```
DELETE /classes/:id/students

Request Body:
{
  "studentIds": ["student-1", "student-2"]
}

Response:
{
  "success": true,
  "data": {
    "removedCount": 2
  }
}
```

### Frontend Component

Location: `/apps/web/src/app/[locale]/classes/[id]/manage/page.tsx`

Features:
- Academic year context integration
- Real-time search filtering
- Multi-select with visual feedback
- Error message display
- Loading states with BlurLoader
- Responsive design

---

## Teacher Subject Assignment System

### Features

1. **Subject Management Page** (`/teachers/[id]/subjects`)
   - Dual-column layout with assigned and available subjects
   - Filter by grade and category
   - Search functionality
   - Batch assignment/removal
   - Save changes with single API call

2. **Teacher Profile Integration**
   - "Manage Subjects" button on teacher profile page
   - Shows current subject count in profile

### API Endpoints (Teacher Service - Port 3004)

#### Get Teacher's Subjects
```
GET /teachers/:id/subjects

Response:
{
  "success": true,
  "data": {
    "teacher": {
      "id": "teacher-uuid",
      "firstName": "Jane",
      "lastName": "Smith"
    },
    "subjects": [
      {
        "id": "subject-uuid",
        "name": "Mathematics",
        "code": "MATH101",
        "category": "Core",
        "grade": "7",
        "coefficient": 3,
        "assignedAt": "2024-01-15T00:00:00Z"
      }
    ]
  }
}
```

#### Assign Subject to Teacher
```
POST /teachers/:id/subjects

Request Body:
{
  "subjectId": "subject-uuid"
}

Response:
{
  "success": true,
  "data": {
    "message": "Subject assigned successfully",
    "subjectTeacher": {
      "id": "assignment-uuid",
      "teacherId": "teacher-uuid",
      "subjectId": "subject-uuid"
    }
  }
}
```

#### Update All Teacher Subjects (Replace)
```
PUT /teachers/:id/subjects

Request Body:
{
  "subjectIds": ["subject-1", "subject-2", "subject-3"]
}

Response:
{
  "success": true,
  "data": {
    "message": "Teacher subjects updated successfully",
    "count": 3
  }
}
```

#### Remove Subject from Teacher
```
DELETE /teachers/:id/subjects/:subjectId

Response:
{
  "success": true,
  "data": {
    "message": "Subject removed successfully"
  }
}
```

### Frontend Component

Location: `/apps/web/src/app/[locale]/teachers/[id]/subjects/page.tsx`

Features:
- Filter by grade level and category
- Search across name, code, and Khmer name
- Visual indicators for changes (green for add, red for remove)
- Floating save button on mobile
- Breadcrumb navigation

---

## Database Schema Reference

### StudentClass (Student-Class Assignment)
```prisma
model StudentClass {
  id           String       @id @default(uuid())
  studentId    String
  classId      String
  academicYear Int
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  
  student      Student      @relation(fields: [studentId], references: [id])
  class        Class        @relation(fields: [classId], references: [id])
  
  @@unique([studentId, classId, academicYear])
  @@index([studentId])
  @@index([classId])
  @@index([academicYear])
}
```

### SubjectTeacher (Teacher-Subject Assignment)
```prisma
model SubjectTeacher {
  id        String   @id @default(uuid())
  teacherId String
  subjectId String
  createdAt DateTime @default(now())
  
  teacher   Teacher  @relation(fields: [teacherId], references: [id])
  subject   Subject  @relation(fields: [subjectId], references: [id])
  
  @@unique([teacherId, subjectId])
  @@index([teacherId])
  @@index([subjectId])
}
```

---

## Validation Rules

### Class Assignment Validation

1. **Same Class Duplicate Check**
   - Query: Check if student already exists in target class
   - Error: "Student is already in this class"

2. **Academic Year Duplicate Check**
   - Query: Check if student is in ANY class for the same academic year
   - Error: "Student is already enrolled in another class (Class Name) for this academic year"

### Implementation Example

```typescript
// Check single assignment
const existingAssignment = await prisma.studentClass.findFirst({
  where: {
    studentId,
    classId,
  },
});

if (existingAssignment) {
  return res.status(400).json({
    success: false,
    error: 'Student is already in this class',
  });
}

// Check academic year duplicate
const existingInYear = await prisma.studentClass.findFirst({
  where: {
    studentId,
    class: {
      academicYearId: targetClass.academicYearId,
    },
    NOT: {
      classId,
    },
  },
  include: {
    class: true,
  },
});

if (existingInYear) {
  return res.status(400).json({
    success: false,
    error: `Student is already enrolled in another class (${existingInYear.class.name}) for this academic year`,
  });
}
```

---

## UI Components

### Classes List Page

Location: `/apps/web/src/app/[locale]/classes/page.tsx`

Action buttons for each class:
- **Manage Students** (green) - Opens student assignment page
- **View Roster** (blue) - Opens read-only roster view
- **Edit** (orange) - Opens class edit modal
- **Delete** (red) - Confirms and deletes class

### Teacher Profile Page

Location: `/apps/web/src/app/[locale]/teachers/[id]/page.tsx`

Added "Manage Subjects" button in the header area that links to `/teachers/[id]/subjects`

---

## Testing

### Manual Test Cases

1. **Class Student Assignment**
   - [ ] Assign unassigned student to class
   - [ ] Attempt to assign student already in same class (should fail)
   - [ ] Attempt to assign student in different class same year (should fail with class name)
   - [ ] Remove student from class
   - [ ] Transfer student between classes

2. **Teacher Subject Assignment**
   - [ ] View teacher's current subjects
   - [ ] Add new subject to teacher
   - [ ] Remove subject from teacher
   - [ ] Batch update subjects
   - [ ] Filter by grade/category

3. **Navigation**
   - [ ] "Manage Students" button on classes page works
   - [ ] "Manage Subjects" button on teacher profile works
   - [ ] Back navigation works correctly

---

## Future Enhancements

1. **Drag-and-Drop Interface**
   - Implement drag-drop for student assignment
   - Visual feedback during drag operations

2. **Bulk Operations**
   - Import students from CSV
   - Export class roster to Excel

3. **Conflict Resolution**
   - Show conflicts when bulk assigning
   - Offer resolution options

4. **History Tracking**
   - Track all assignment changes
   - Show who made changes and when

---

## Service Versions

- **Class Service**: v2.3 (with validation and transfer APIs)
- **Teacher Service**: v2.2 (with subject assignment CRUD)
- **Student Service**: v2.1 (with transcript API)
- **School Service**: v2.3 (with academic year APIs)
