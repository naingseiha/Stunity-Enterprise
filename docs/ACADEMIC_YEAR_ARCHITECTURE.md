# 🏗️ Academic Year System Architecture

**How Everything Connects to Academic Years**

---

## 🎯 Core Concept

**Every piece of data in the system is tied to an academic year.**

Think of Academic Year as the "container" for everything:
```
Academic Year 2025-2026
├── Classes (Grade 7A, 7B, 8A, etc.)
├── Students (enrolled in classes)
├── Teachers (assigned to classes)
├── Subjects (taught in classes)
├── Grades (for students in that year)
├── Attendance (recorded for that year)
├── Timetable (schedules for that year)
└── Reports (generated for that year)
```

---

## 📊 Database Relationships

### Primary Connection Point: **Classes**

```
AcademicYear (2025-2026)
    ↓
  Class (Grade 7A)
    ↓
  ├── Students (enrolled)
  ├── Teachers (assigned)
  ├── Subjects (taught)
  ├── Timetable (schedule)
  ├── Attendance (daily records)
  └── Grades (exam results)
```

### Database Schema:

```prisma
model AcademicYear {
  id        String
  name      "2025-2026"
  status    PLANNING|ACTIVE|ENDED|ARCHIVED
  
  // Direct relationships
  classes   Class[]          // All classes in this year
  terms     AcademicTerm[]   // Q1, Q2, Q3, Q4
  examTypes ExamType[]       // Midterm, Final, etc.
  calendars AcademicCalendar[] // Holidays, events
}

model Class {
  id              String
  name            "Grade 7A"
  academicYearId  String  // ← KEY CONNECTION
  
  // Everything flows through Class
  students        Student[]
  teachers        TeacherClass[]
  subjects        ClassSubject[]
  timetable       Timetable[]
  attendances     Attendance[]
  grades          Grade[]
}

model Student {
  id              String
  classId         String  // ← Connected to Class
  
  // History tracked via progressions
  progressions    StudentProgression[]
}

model StudentProgression {
  fromYearId      String  // 2024-2025
  toYearId        String  // 2025-2026
  fromClassId     String  // Grade 7A
  toClassId       String  // Grade 8A
  status          PROMOTED|REPEATED|GRADUATED
}
```

---

## 🔄 How Data Flows

### 1. **Classes** (Foundation)
```
Academic Year → Classes → Everything Else
```

**Example:**
- Year: 2025-2026
- Classes: Grade 7A, 7B, 7C, 8A, 8B, etc.
- Each class is **locked to that year**

**When querying classes:**
```sql
SELECT * FROM classes 
WHERE schoolId = 'xxx' 
AND academicYearId = '2025-2026'
```

### 2. **Students** (Through Classes)
```
Academic Year → Class → Students
```

**How it works:**
- Students are enrolled in a **specific class**
- That class belongs to **specific academic year**
- Student's year = Class's year

**Example:**
- Bopha enrolls in "Grade 7A" for "2025-2026"
- Next year, she's in "Grade 8A" for "2026-2027"
- Her history: `StudentProgression` records

**Query students for a year:**
```sql
SELECT students.* FROM students
JOIN classes ON students.classId = classes.id
WHERE classes.academicYearId = '2025-2026'
```

### 3. **Teachers** (Through Class Assignments)
```
Academic Year → Class → Teacher Assignment
```

**How it works:**
- Teachers are assigned to classes
- Each assignment is for a specific year
- Same teacher can teach different classes each year

**Example:**
- Mr. Sok teaches "Grade 7A Math" in 2025-2026
- Next year: "Grade 8B Math" in 2026-2027

**Query teachers for a year:**
```sql
SELECT DISTINCT teachers.* FROM teachers
JOIN teacher_classes ON teachers.id = teacher_classes.teacherId
JOIN classes ON teacher_classes.classId = classes.id
WHERE classes.academicYearId = '2025-2026'
```

### 4. **Subjects** (Through Classes)
```
Academic Year → Class → Class-Subject Association
```

**How it works:**
- Subjects are taught **in specific classes**
- Same subject (Math) taught in multiple classes
- Different curriculum each year

**Example:**
- Grade 7 Math (2025-2026) - Topics: Algebra, Geometry
- Grade 8 Math (2026-2027) - Topics: Advanced Algebra

### 5. **Grades** (Through Classes & Terms)
```
Academic Year → Class → Student → Grades
```

**How it works:**
- Grades recorded per **student, subject, exam type, term**
- All within a specific academic year
- Historical grades preserved

**Example:**
- Bopha's Grade 7 Math Midterm (2025-2026): 85
- Bopha's Grade 8 Math Midterm (2026-2027): 90

**Query grades for a year:**
```sql
SELECT grades.* FROM grades
JOIN students ON grades.studentId = students.id
JOIN classes ON students.classId = classes.id
WHERE classes.academicYearId = '2025-2026'
```

### 6. **Attendance** (Through Classes)
```
Academic Year → Class → Daily Attendance
```

**How it works:**
- Attendance recorded daily per class
- Date always within academic year range
- Historical records preserved

**Example:**
- Grade 7A attendance for 2025-11-15
- Grade 7A attendance for 2026-05-20

### 7. **Timetable** (Through Classes)
```
Academic Year → Class → Weekly Schedule
```

**How it works:**
- Each class has a timetable for that year
- Different schedule each year
- Period times may change

**Example:**
- Grade 7A: Monday 8:00-9:00 Math (2025-2026)
- Grade 8A: Monday 9:00-10:00 Math (2026-2027)

### 8. **Reports** (Generated from Year Data)
```
Academic Year → Aggregated Data → Reports
```

**Types of reports:**
- Student report cards (per term, per year)
- Class performance reports
- Teacher evaluation reports
- School-wide analytics

---

## 🔄 Year Transition Workflow

### Scenario: Moving from 2025-2026 to 2026-2027

**Step 1: Create New Year**
```
✓ Name: 2026-2027
✓ Start: 2026-11-01
✓ End: 2027-09-30
✓ Status: PLANNING
```

**Step 2: Copy Settings (Optional)**
```
Copy from 2025-2026:
- Terms (Q1, Q2, Q3, Q4)
- Exam types (Midterm, Final)
- Grading scales (A, B, C, D, F)
- Holidays
```

**Step 3: Create Classes for New Year**
```
2026-2027 Classes:
- Grade 7A, 7B, 7C (new students)
- Grade 8A, 8B (promoted from Grade 7)
- Grade 9A, 9B (promoted from Grade 8)
```

**Step 4: Promote Students**
```
For each student in 2025-2026:
- If passed → Promote to next grade
- If failed → Repeat same grade
- If Grade 12 → Graduate

Create StudentProgression records:
- fromYear: 2025-2026
- toYear: 2026-2027
- fromClass: Grade 7A
- toClass: Grade 8A
- status: PROMOTED
```

**Step 5: Assign Teachers**
```
- Copy teacher assignments or reassign
- Teachers can teach different classes
```

**Step 6: Set New Year as Current**
```
✓ 2025-2026: ACTIVE → ENDED
✓ 2026-2027: PLANNING → ACTIVE
```

**Step 7: Archive Old Year (Later)**
```
After semester ends:
✓ 2025-2026: ENDED → ARCHIVED
✓ Data preserved for history
✓ Read-only access
```

---

## 📈 View Statistics

**Where statistics come from:**

### Current Display (Basic):
```
Students: ~ (placeholder)
Classes: ~ (placeholder)
Promoted: - (not done yet)
```

### Real Statistics (Phase 2B):
```
GET /schools/:id/academic-years/:yearId/stats

Returns:
{
  students: 1205,      // Count from classes in this year
  classes: 45,         // Classes in this year
  teachers: 68,        // Teachers assigned to classes
  promoted: 892,       // From StudentProgression
  failed: 113,         // From StudentProgression
  graduated: 200,      // Grade 12 completed
  attendance: 94.5%,   // Average attendance rate
  performance: {
    excellent: 245,    // A grade students
    good: 456,         // B grade students
    average: 389,      // C grade students
    needsHelp: 115     // D/F grade students
  }
}
```

### Detailed Statistics Page (Future):
```
/settings/academic-years/:id/statistics

Shows:
- Student enrollment trends
- Class sizes
- Teacher workload
- Grade distribution
- Attendance patterns
- Promotion success rate
- Subject performance
- Comparison with previous years
```

---

## 🎯 Implementation Roadmap

### Phase 2B: Data Scoping (Current)
```
✓ Academic Year management
✓ Year selector
→ Filter Students by year
→ Filter Classes by year
→ Filter Teachers by year
→ Filter Grades by year
→ Filter Attendance by year
```

**Implementation:**
```typescript
// Student Service
GET /students?academicYearId=xxx
→ Returns students in classes of that year

// Class Service
GET /classes?academicYearId=xxx
→ Returns classes for that year

// Teacher Service
GET /teachers?academicYearId=xxx
→ Returns teachers assigned to classes that year
```

### Phase 3: Promotion System
```
→ Bulk student promotion wizard
→ Pass/fail determination
→ Grade advancement rules
→ StudentProgression creation
→ Promotion reports
```

### Phase 4: Advanced Features
```
→ Year comparison reports
→ Historical data viewer
→ Multi-year analytics
→ Performance trends
→ Predictive analytics
```

---

## 🔍 Query Examples

### Get all students for current year:
```sql
SELECT s.* 
FROM students s
JOIN classes c ON s.classId = c.id
JOIN academic_years y ON c.academicYearId = y.id
WHERE y.isCurrent = true
```

### Get student's complete history:
```sql
SELECT 
  ay.name as yearName,
  c.name as className,
  AVG(g.score) as avgScore
FROM student_progressions sp
JOIN academic_years ay ON sp.fromYearId = ay.id
JOIN classes c ON sp.fromClassId = c.id
LEFT JOIN grades g ON g.studentId = sp.studentId
WHERE sp.studentId = 'bopha-123'
GROUP BY ay.name, c.name
ORDER BY ay.startDate
```

### Get class performance for a year:
```sql
SELECT 
  c.name as className,
  COUNT(DISTINCT s.id) as studentCount,
  AVG(g.score) as avgScore,
  SUM(CASE WHEN sp.status = 'PROMOTED' THEN 1 ELSE 0 END) as promoted
FROM classes c
LEFT JOIN students s ON s.classId = c.id
LEFT JOIN grades g ON g.studentId = s.id
LEFT JOIN student_progressions sp ON sp.studentId = s.id
WHERE c.academicYearId = '2025-2026'
GROUP BY c.id, c.name
```

---

## ✅ Summary

**Every module connects through Academic Year:**

```
Academic Year
    ↓
 Classes (hub)
    ↓
├── Students (enrolled)
├── Teachers (assigned)
├── Subjects (taught)
├── Grades (recorded)
├── Attendance (tracked)
├── Timetable (scheduled)
└── Reports (generated)
```

**Key Principle:**
> "Nothing exists without an academic year context"

**Implementation Status:**
- ✅ Academic year management
- ✅ Year selector UI
- 🚧 Backend year filtering (in progress)
- ⏳ Promotion system (pending)
- ⏳ Advanced analytics (future)

**Next Steps:**
1. Add year filtering to all services
2. Update all pages to use selected year
3. Show real statistics
4. Build promotion wizard
5. Create historical views

---

**The academic year is the backbone of the entire system!** 🏗️
