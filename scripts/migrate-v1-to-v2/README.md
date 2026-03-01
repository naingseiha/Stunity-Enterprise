# V1 → V2 Data Migration Scripts

## Overview

Safely migrates data from **V1 (SchoolManagementApp)** to **V2 (Stunity-Enterprise)**.

| Script | Purpose |
|--------|---------|
| `export-v1-data.ts` | Dumps all V1 tables to JSON files |
| `import-to-v2.ts` | Imports JSON into V2 (transaction-safe, idempotent) |
| `validate-migration.ts` | Validates counts and integrity after import |

---

## Prerequisites

1. Access to the **V1 PostgreSQL database** (connection string)
2. Access to the **V2 PostgreSQL database** (via `DATABASE_URL` in `.env`)
3. Both databases **backed up** before running
4. V2 schema up to date: `npx prisma migrate deploy` (in `packages/database/`)

---

## Environment Variables

```bash
# Required for export (V1 database)
V1_DATABASE_URL="postgresql://user:pass@host:5432/school_db_v1"

# Required for import/validate (V2 database – from your .env)
DATABASE_URL="postgresql://user:pass@host:5432/stunity_v2"
DIRECT_URL="postgresql://user:pass@host:5432/stunity_v2"

# Import options
IMPORT_DIR="scripts/migrate-v1-to-v2/data/export-2026-03-01T..."  # path to export folder
DRY_RUN="true"          # Preview only – no DB writes
CREATE_SCHOOL="true"    # Auto-create a new School in V2 for migrated data
SCHOOL_NAME="My School" # Name for the new school
SCHOOL_ID="<cuid>"      # Use existing V2 school (alternative to CREATE_SCHOOL)
SKIP_ERRORS="true"      # Continue on row-level errors (default: abort)
COUNTRY_CODE="KH"       # Country code for new school (default: KH)
```

---

## Quick Start

### Step 1 – Export from V1

```bash
cd /path/to/Stunity-Enterprise

V1_DATABASE_URL="postgresql://..." \
  npx tsx scripts/migrate-v1-to-v2/export-v1-data.ts
# Creates: scripts/migrate-v1-to-v2/data/export-2026-.../ 
```

The script will print the output directory path you need for the next steps.

---

### Step 2 – Dry Run (Preview)

**Always run this first.** No writes to V2.

```bash
IMPORT_DIR="scripts/migrate-v1-to-v2/data/export-2026-..." \
  DRY_RUN=true \
  npx tsx scripts/migrate-v1-to-v2/import-to-v2.ts
```

Expected output: full preview table showing counts and a sample `customFields` JSON.

---

### Step 3 – Live Import

```bash
IMPORT_DIR="scripts/migrate-v1-to-v2/data/export-2026-..." \
  CREATE_SCHOOL=true \
  SCHOOL_NAME="My School Name" \
  npx tsx scripts/migrate-v1-to-v2/import-to-v2.ts
```

On **failure**: the entire import is rolled back (transaction). V2 is unchanged. Fix the error and re-run.

---

### Step 4 – Validate

```bash
IMPORT_DIR="scripts/migrate-v1-to-v2/data/export-2026-..." \
  npx tsx scripts/migrate-v1-to-v2/validate-migration.ts
```

Expected: all checks ✅ PASS. Exit code `0` on success, `1` on failure.

---

## npm Scripts (from Stunity-Enterprise root)

```bash
# Dry run
IMPORT_DIR="..." DRY_RUN=true npm run migrate:v1-import

# Live import
IMPORT_DIR="..." CREATE_SCHOOL=true SCHOOL_NAME="..." npm run migrate:v1-import

# Validate
IMPORT_DIR="..." npm run migrate:v1-validate
```

---

## Migration Order & FK Safety

The import script processes entities in this strict order:

```
1.  School
2.  AcademicYear           (from V1 Class.academicYear strings)
3.  GradingScale + Ranges  (Cambodian A–F defaults per year)
4.  Subject                (upsert by code – deduplicates)
5.  Teacher                (with schoolId)
6.  Class                  (with schoolId, academicYearId)
7.  Student                (with schoolId, classId)
8.  Parent
9.  StudentParent
10. StudentClass            (enrollment history for each Student+Class)
11. SubjectTeacher
12. TeacherClass
13. Grade
14. Attendance
15. StudentMonthlySummary
16. User                   (linked to student/teacher/parent)
17. GradeConfirmation
18. AuditLog
```

---

## customFields (Flexible Country-Specific Data)

The import script **dual-writes** Cambodian-specific data:
- **Old columns** (backward compat): `khmerName`, `grade12ExamRoom`, etc.
- **New `customFields` JSON** (forward compat): single flexible column

**Cambodian student example:**
```json
{
  "khmerName": "ចាន់ សុខា",
  "placeOfBirth": "ភ្នំពេញ",
  "fatherName": "ឪពុក",
  "grade9":  { "examRoom": "A01", "examDesk": "12", "passStatus": "PASS" },
  "grade12": { "examRoom": "B02", "examDesk": "5",  "passStatus": "PASS", "track": "science" }
}
```

New schools (non-Cambodian) use only `customFields` and ignore the legacy columns.

---

## Output Files

After each step, these files are written to your `IMPORT_DIR`:

| File | Created by |
|------|-----------|
| `metadata.json` | export |
| `*.json` (tables) | export |
| `migration-report.json` | import |
| `validation-report.json` | validate |

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `V1_DATABASE_URL is required` | Set the env var and re-run |
| `Import directory not found` | Run export first; set `IMPORT_DIR` to the correct path |
| `P2002 unique constraint` | Import is idempotent – re-runs are safe; the script maps existing IDs |
| `Migration FAILED (transaction rolled back)` | Fix the error shown; all V2 changes were rolled back |
| Want to skip bad rows | Set `SKIP_ERRORS=true` (re-run after fixing the root cause) |

---

## Post-Migration Manual Checklist

After `validate-migration.ts` passes:
- [ ] Log into V2 web portal as school admin
- [ ] Students page: count matches; Khmer name visible in student detail
- [ ] Grades page: scores correct for a sample student
- [ ] Attendance page: records present
- [ ] Mobile app: login as a migrated student/teacher account
- [ ] Check GradingScale in school settings
