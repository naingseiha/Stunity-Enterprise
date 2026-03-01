# V1 → V2 Data Migration Analysis & Strategy

## Executive Summary

This document analyzes the migration path from **V1 (SchoolManagementApp)** to **V2 (Stunity-Enterprise)**. V1 is a single-tenant Cambodian school management app; V2 is a multi-tenant enterprise platform with significant schema differences. The migration requires careful data transformation, and we propose a flexible JSON-based approach for country-specific fields (students, teachers, subjects, grading) to support future internationalization.

---

## 1. Schema Comparison

### 1.1 Core Architectural Difference

| Aspect | V1 (SchoolManagementApp) | V2 (Stunity-Enterprise) |
|--------|--------------------------|--------------------------|
| **Tenancy** | Single school (no School model) | Multi-tenant (School as root entity) |
| **Academic Year** | String field on Class (`"2024-2025"`) | Dedicated `AcademicYear` model with relations |
| **Subject Scope** | Global (no schoolId) | Global (no schoolId) – same in both |
| **Parent Scope** | Global | Global (no schoolId) |
| **Grading Scale** | Fixed per subject (Cambodian curriculum) | `GradingScale` + `GradeRange` per AcademicYear |
| **Enrollment** | `Student.classId` direct | `StudentClass` join table + `Student.classId` |

### 1.2 Entity-by-Entity Comparison

#### School
- **V1**: Does not exist.
- **V2**: Root entity with `slug`, `email`, `subscriptionTier`, `countryCode`, etc.
- **Migration**: Create ONE School for all V1 data.

#### AcademicYear
- **V1**: Stored as string on Class (`academicYear: "2024-2025"`).
- **V2**: Model with `schoolId`, `startDate`, `endDate`, `isCurrent`, `status`.
- **Migration**: Extract unique academic year strings from V1 Classes → create AcademicYear records.

#### Class
- **V1**: `classId`, `name`, `grade`, `section`, `academicYear` (string), `capacity`, `track`, `homeroomTeacherId`. No `schoolId`, no `academicYearId`.
- **V2**: Same fields + `schoolId`, `academicYearId` (relation).
- **Migration**: Create Classes with `schoolId` and `academicYearId` (from mapping).

#### Student
- **V1**: No `schoolId`. Has Cambodian-specific fields:
  - `khmerName`, `englishName`, `placeOfBirth`, `currentAddress`, `fatherName`, `motherName`, `parentOccupation` (defaults like "កសិករ")
  - `grade12ExamCenter`, `grade12ExamDesk`, `grade12ExamRoom`, `grade12ExamSession`, `grade12PassStatus`, `grade12Track`
  - `grade9ExamCenter`, `grade9ExamDesk`, `grade9ExamRoom`, `grade9ExamSession`, `grade9PassStatus`
  - `previousSchool`, `repeatingGrade`, `transferredFrom`
- **V2**: Adds `schoolId`, `permanentId`, `studentIdFormat`, `studentIdMeta` (Json), `entryYear`. Same Cambodian fields exist.
- **Migration**: Map all V1 students to new School; preserve or transform Cambodian fields (see §3).

#### Teacher
- **V1**: No `schoolId`. Has `khmerName`, `employeeId`, `degree`, `workingLevel`, etc.
- **V2**: Adds `schoolId`, `permanentId`, `teacherIdFormat`, `teacherIdMeta` (Json), `hireYear`.
- **Migration**: Same as Student – assign `schoolId`.

#### Subject
- **V1**: `name`, `nameKh`, `nameEn`, `code`, `grade`, `track`, `category`, `maxScore`, `coefficient`. Global (no schoolId).
- **V2**: Same structure. Global.
- **Migration**: V1 uses codes like `KHM-G9`, `MATH-G12-SCIENCE`. V2 seed uses `KH-7`, `MATH-7`. **Subject code format may differ** – need mapping or merge strategy.

#### Grade
- **V1**: `studentId`, `subjectId`, `classId`, `score`, `maxScore`, `month`, `year`, `percentage`, `weightedScore`.
- **V2**: Same structure.
- **Migration**: Must map `studentId`, `subjectId`, `classId` to V2 IDs. If IDs are preserved (same cuid), mapping is simpler.

#### Attendance
- **V1**: Same as V2 (studentId, classId, date, status, session).
- **Migration**: Map IDs.

#### User
- **V1**: No `schoolId`. Links to `studentId`, `teacherId`, `parentId`.
- **V2**: Adds `schoolId` (optional). Many new fields (SSO, profile, gamification).
- **Migration**: Set `schoolId` for school users; leave new fields as defaults.

#### Parent
- **V1** & **V2**: Structurally same (no schoolId). `khmerName`, `occupation` (default "កសិករ").
- **Migration**: Direct copy (IDs preserved or mapped).

#### StudentParent, SubjectTeacher, TeacherClass
- Same structure. Migration: map foreign keys.

#### StudentMonthlySummary
- Same structure. Migration: map `studentId`, `classId`.

#### GradeConfirmation
- Same structure. Migration: map `classId`, `subjectId`, `confirmedBy`.

#### V2-Only Entities (Not in V1)
- `StudentClass` (enrollment)
- `StudentProgression` (promotion)
- `GradingScale`, `GradeRange`, `ExamType`, `AcademicTerm`
- `Period`, `TimetableEntry`, `SchoolShift`, etc.
- Social: Post, Comment, Like, StudyClub, etc.

**Migration**: These are created during V2 onboarding or left empty for migrated school.

---

## 2. Migration Challenges

### 2.1 ID Strategy

**Option A: Preserve V1 IDs**
- Pros: Simpler FK mapping; existing references (e.g. in exports) remain valid.
- Cons: V1 and V2 may share same DB or use different DBs. If different DBs, we must insert with explicit IDs (Prisma supports this).

**Option B: Generate New IDs**
- Pros: Clean V2 data; no collision risk.
- Cons: Must maintain ID mapping (V1_id → V2_id) for all entities; more complex script.

**Recommendation**: Use **Option A** when migrating into the same DB or a cloned DB. Use **Option B** when migrating to a fresh V2 DB with existing data (to avoid ID collisions). Maintain a mapping table or JSON file for Option B.

### 2.2 Subject Code Conflicts

V1 seed creates codes like:
- `KHM-G9`, `MATH-G12-SCIENCE`, `MATH-G12-SOCIAL`
- Grade–track combinations

V2 seed creates codes like:
- `KH-7`, `MATH-7`, `MATH-10`

If V1 and V2 share the same Subject table (global, no schoolId), **code uniqueness** must be respected. Options:
1. **Pre-migrate**: Ensure V2 has all V1 subjects (run V1 subject seed logic adapted for V2), then migrate Grades by matching `(code, grade, track)` → subjectId.
2. **Merge**: Migrate V1 subjects first; skip duplicates by code.
3. **Separate**: Add `schoolId` to Subject in V2 for school-specific subjects (schema change) – more flexible but larger refactor.

**Recommendation**: Start with (1) or (2). Run V1 subject seed (or equivalent) in V2, then map V1 `subjectId` → V2 `subjectId` by code. If codes differ, maintain a mapping file.

### 2.3 Class → AcademicYear Mapping

V1 Class has `academicYear: "2024-2025"`. We need:
1. Extract distinct academic year strings.
2. Create `AcademicYear` for each with sensible `startDate`/`endDate` (e.g. "2024-2025" → Sept 2024 – Aug 2025).
3. Create V2 Classes with `academicYearId` pointing to these.

### 2.4 StudentClass Enrollments

V2 uses `StudentClass` for enrollment history. V1 has `Student.classId`. During migration:
- For each V1 Student with `classId`, create `StudentClass` with `studentId`, `classId`, `academicYearId` (from the Class’s academic year).

### 2.5 GradingScale / ExamType

V1 uses fixed `maxScore` per subject (from Cambodian curriculum). V2 has `GradingScale` and `GradeRange` per AcademicYear. Options:
1. Create a default Cambodian GradingScale (A–F, 0–100) for each migrated AcademicYear.
2. Leave GradingScale empty initially; reports/transcripts can use raw scores or a default scale.

**Recommendation**: Create a default Cambodian GradingScale during migration for consistency with existing reports.

---

## 3. Flexible JSON Approach for Country-Specific Data

### 3.1 Problem

V1/V2 contain many **Cambodian-specific** fields:
- Students: `khmerName`, `grade12ExamCenter`, `grade12ExamDesk`, `grade12ExamRoom`, `grade12ExamSession`, `grade12PassStatus`, `grade12Track`, same for grade 9, `placeOfBirth`, `fatherName`, `motherName`, `parentOccupation`, etc.
- Teachers: `khmerName`, `degree`, `workingLevel`, etc.
- Parents: `khmerName`, `occupation` (default "កសិករ")

Other countries need different fields (e.g. Thailand, Vietnam, Singapore). Hardcoding columns for each country does not scale.

### 3.2 Proposal: `customFields` / `metadata` JSON

Add a single JSON column to store country/school-specific data:

```prisma
model Student {
  // ... existing required fields (firstName, lastName, dateOfBirth, gender, schoolId, classId)
  firstName   String
  lastName    String
  dateOfBirth String
  gender      Gender
  // ... core fields that are universal

  // Country/school-specific data - flexible per school/country
  customFields Json?  // or: metadata, countrySpecificData, etc.
}

model Teacher {
  // ... existing
  customFields Json?
}

model Parent {
  // ... existing
  customFields Json?
}
```

**Example `customFields` for Cambodian student:**
```json
{
  "khmerName": "ចាន់ សុខា",
  "englishName": "Sokha Chan",
  "placeOfBirth": "ភ្នំពេញ",
  "currentAddress": "ភ្នំពេញ",
  "fatherName": "ឪពុក",
  "motherName": "ម្តាយ",
  "parentOccupation": "កសិករ",
  "grade12": {
    "examCenter": "...",
    "examRoom": "A01",
    "examDesk": "12",
    "examSession": "AM",
    "passStatus": "PASS",
    "track": "science"
  },
  "grade9": {
    "examCenter": "...",
    "examRoom": "...",
    "examDesk": "...",
    "examSession": "...",
    "passStatus": "..."
  },
  "previousSchool": "...",
  "repeatingGrade": null,
  "transferredFrom": null
}
```

### 3.3 Migration Path for Existing Cambodian Fields

1. **Phase 1 – Add `customFields`**: Add `customFields Json?` to Student, Teacher, Parent.
2. **Phase 2 – Backfill**: Migration script moves existing Cambodian columns → `customFields` JSON.
3. **Phase 3 – Deprecate columns**: Keep old columns temporarily for backward compatibility; read from `customFields` when present.
4. **Phase 4 – Remove columns**: Once all consumers use `customFields`, drop old columns.

Alternatively: keep current columns for Cambodian schools and use `customFields` only for *new* country-specific data. This avoids breaking existing logic but increases schema complexity.

**Recommendation**: Add `customFields` now. For V1→V2 migration, **keep existing columns** and also populate `customFields` from them. New schools/countries use only `customFields`. Later, deprecate Cambodian columns and read from `customFields` for Cambodia as well.

### 3.4 Subject Flexibility

Current Subject model: `name`, `nameKh`, `nameEn`, `code`, `grade`, `track`, `category`, `coefficient`, `maxScore`.

**Option A**: Add `customFields Json?` to Subject for extra attributes per country.
**Option B**: Add `schoolId` to Subject for school-specific subjects (each school can define own subjects).
**Option C**: Keep Subject global but add `subjectTemplate` or `countryCode` to group by system.

**Recommendation**: Add `customFields Json?` to Subject for extensibility. Consider `schoolId` as optional for school-specific subjects in a later phase.

### 3.5 Grade System Flexibility

V2 has `GradingScale` and `GradeRange` per AcademicYear. This is already flexible. Additional flexibility:
- Add `customFields Json?` to `GradingScale` for country-specific metadata.
- Allow multiple GradingScales per year (e.g. letter grades vs 0–100) and let the school choose.

Reports and transcripts should read from `GradingScale` + `GradeRange` and `customFields` as needed.

---

## 4. Migration Strategy – Step by Step

### Phase 0: Preparation
1. **Backup V1 database** (pg_dump).
2. **Document record counts** (students, teachers, classes, grades, attendance, etc.).
3. **Identify V1 database URL** and **V2 database URL** (same or different).
4. **Create staging DB** if needed.

### Phase 1: Schema Alignment (V2)
1. Ensure V2 schema has all required fields.
2. Add `customFields Json?` to Student, Teacher, Parent (optional but recommended).
3. Run V2 migrations.

### Phase 2: Migration Script (Order of Operations)
Execute in this order to satisfy FKs:

1. **School**: Create one School for V1 data (or use existing).
2. **AcademicYear**: Create from distinct V1 `Class.academicYear` values.
3. **Subject**: Seed/merge V1 subjects; build V1_subjectId → V2_subjectId map.
4. **Teacher**: Create Teachers with `schoolId`; build V1_teacherId → V2_teacherId map.
5. **Class**: Create Classes with `schoolId`, `academicYearId`; build V1_classId → V2_classId map.
6. **Student**: Create Students with `schoolId`, `classId` (mapped); build V1_studentId → V2_studentId map.
7. **Parent**: Copy Parents; build V1_parentId → V2_parentId map (if using new IDs).
8. **StudentParent**: Create with mapped IDs.
9. **StudentClass**: For each Student+Class, create enrollment with `academicYearId`.
10. **SubjectTeacher**: Create with mapped IDs.
11. **TeacherClass**: Create with mapped IDs.
12. **Grade**: Create with mapped studentId, subjectId, classId.
13. **Attendance**: Create with mapped studentId, classId.
14. **StudentMonthlySummary**: Create with mapped IDs.
15. **User**: Update/create with `schoolId`; link to mapped studentId, teacherId, parentId.
16. **GradeConfirmation**: Create with mapped IDs.
17. **AuditLog**: Create with mapped adminId, teacherId.

### Phase 3: GradingScale (Optional)
Create default Cambodian GradingScale for each AcademicYear.

### Phase 4: Validation
- Row counts match (or explain differences).
- Spot-check: grades, attendance, student-class links.
- Test V2 app: login, view students, grades, attendance.

### Phase 5: Reports & Transcripts (Later)
Design reports and transcripts to:
- Use `GradingScale` + `GradeRange` for conversions.
- Use `customFields` for country-specific labels (e.g. Khmer names, exam info).
- Support multiple academic years and terms.

---

## 5. Reports & Transcripts – Future Design Notes

### 5.1 Data Sources
- **Grades**: `Grade` (studentId, subjectId, classId, score, maxScore, month, year).
- **GPA/Letter**: `GradingScale` + `GradeRange` for the academic year.
- **Student info**: `Student` + `customFields` (e.g. khmerName, exam details).
- **Subjects**: `Subject` (+ `customFields` if used).

### 5.2 Transcript Structure (Conceptual)
- Header: School, academic year, student name (from `firstName`, `lastName`, `customFields.khmerName`).
- Body: Subjects, scores, letter grades, credits/coefficients.
- Footer: GPA, pass/fail, exam info (from `customFields.grade12` or `grade9`).

### 5.3 Report Flexibility
- **Country templates**: Store report templates (e.g. Cambodian vs Thai) in `SchoolSettings` or a new `ReportTemplate` model.
- **Custom fields in templates**: Use placeholders like `{{student.customFields.khmerName}}` for rendering.

---

## 6. Recommendations Summary

| Area | Recommendation |
|------|----------------|
| **Migration approach** | Use a single migration script, run in a transaction, with dry-run option. |
| **ID handling** | Preserve V1 IDs when migrating to empty V2 DB; use mapping when merging into existing V2 DB. |
| **Country-specific data** | Add `customFields Json?` to Student, Teacher, Parent; migrate Cambodian columns into it; keep columns during transition. |
| **Subjects** | Merge V1 subjects by code; add `customFields` to Subject for extensibility. |
| **Grading** | Create default Cambodian GradingScale per AcademicYear during migration. |
| **Reports/Transcripts** | Design in V2 to use GradingScale + customFields; implement as separate phase. |

---

## 7. Next Steps

1. **Confirm DB strategy**: Same DB vs separate DB for V1 and V2.
2. **Implement migration script**: TypeScript/Node script using Prisma for both V1 and V2 (or direct SQL if preferred).
3. **Add `customFields` to schema**: Student, Teacher, Parent (and optionally Subject).
4. **Run migration on staging**: Validate before production.
5. **Design report/transcript API and templates**: After data migration is stable.

---

*Document created: 2025-03-01*
