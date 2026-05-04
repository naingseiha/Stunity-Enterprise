# V1 → V2 Data Migration Scripts

## Overview

Safely migrates data from **V1 (SchoolManagementApp)** to **V2 (Stunity-Enterprise)**.

| Script | Purpose |
|--------|---------|
| `export-v1-data.ts` | Dumps all V1 tables to JSON files |
| `import-to-v2.ts` | Imports JSON into V2 (transaction-safe, idempotent) |
| `validate-migration.ts` | Validates counts and integrity after import |
| `diff-rosters.ts` | Per-class roster diff: V1 export vs V2 `StudentClass` (same student PKs) |
| `audit-enrollments.ts` | Lists duplicate ACTIVE `StudentClass` rows per student + academic year |
| `resolve-school-id.ts` | Prints `SCHOOL_ID` for a school name (default **Svaythom High School**) using `DATABASE_URL` |
| `run-svaythom-full-import.sh` | Shell wrapper: `IMPORT_FULL_V1` import + prints validate/diff commands |

---

## Production backups (before import)

Take dumps **yourself** from the hosting provider or `pg_dump` (replace URLs and paths):

```bash
# V1 (SchoolManagementApp)
pg_dump "$V1_DATABASE_URL" -Fc -f v1-backup-$(date +%Y%m%d).dump

# V2 (Stunity)
pg_dump "$DATABASE_URL" -Fc -f v2-backup-$(date +%Y%m%d).dump
```

A fresh JSON export from V1 is also a portable snapshot:

```bash
V1_DATABASE_URL="postgresql://..." npx tsx scripts/migrate-v1-to-v2/export-v1-data.ts
```

---

## Where connection strings live

| System | Variable | Typical location |
|--------|----------|------------------|
| **SchoolManagementApp (V1)** | `DATABASE_URL` | `SchoolManagementApp/api/.env` (see `api/.env.example`) — single database, no `schoolId` in schema |
| **Stunity Enterprise (V2)** | `DATABASE_URL` (and often `DIRECT_URL`) | Repo root [`.env`](.env.example) or `packages/database/.env`, matching [`.env.example`](.env.example) |

For migration scripts, point **V1** at the same value using **`V1_DATABASE_URL`** (you can copy `DATABASE_URL` from SchoolManagementApp `api/.env` when running `export-v1-data.ts` from the Stunity repo).

### Resolve `SCHOOL_ID` by school name

You do not need to memorize the cuid. If the school name is **Svaythom High School** (or any substring match):

```bash
# Uses DATABASE_URL from .env; default name = Svaythom High School
npm run migrate:v1-resolve-school

# Or explicit name
SCHOOL_NAME="Svaythom High School" npm run migrate:v1-resolve-school
```

Copy the printed `SCHOOL_ID=...` into `import-to-v2.ts`, `diff-rosters.ts`, `validate-migration.ts`, and `audit-enrollments.ts`.

---

## Complete migration for **Svaythom High School** (all V1 data)

SchoolManagementApp holds **one school** (no `schoolId`). Stunity is multi-tenant: you target **Svaythom** with **`SCHOOL_ID`** from `resolve-school-id.ts`.

**Preset `IMPORT_FULL_V1=true`** turns on, unless you set them yourself:

- Parents + `student_parents` (contact records only — **not** parent login accounts)
- All Phase 2 bulk: grades, attendance, monthly summaries

It does **not** import **User** rows (student/teacher/parent logins). In Stunity, students are expected to **create or claim accounts** separately. It also skips **grade confirmations** and **audit logs** by default (those reference user ids). To migrate legacy login hashes anyway, set `IMPORT_INCLUDE_USERS=true` (and `IMPORT_INCLUDE_GRADE_CONFIRMATIONS=true` only if users exist for `confirmedBy`).

**Recommended sequence**

1. Back up V1 and V2 databases (`pg_dump`).
2. **Export** current V1 production data:

   ```bash
   V1_DATABASE_URL="<same as SchoolManagementApp api/.env DATABASE_URL>" \
     npx tsx scripts/migrate-v1-to-v2/export-v1-data.ts
   ```

3. Note the new folder under `scripts/migrate-v1-to-v2/data/export-.../`.

4. **Resolve** Stunity school id:

   ```bash
   npm run migrate:v1-resolve-school
   # default school name = Svaythom High School
   ```

5. **Dry run** (no writes):

   ```bash
   IMPORT_DIR="scripts/migrate-v1-to-v2/data/export-..." \
     IMPORT_FULL_V1=true DRY_RUN=true \
     npx tsx scripts/migrate-v1-to-v2/import-to-v2.ts
   ```

6. **Live import** into the existing Svaythom school (not `CREATE_SCHOOL`):

   ```bash
   IMPORT_DIR="scripts/migrate-v1-to-v2/data/export-..." \
     SCHOOL_ID="<id from step 4>" \
     IMPORT_FULL_V1=true \
     npx tsx scripts/migrate-v1-to-v2/import-to-v2.ts
   ```

   Or use the helper script:

   ```bash
   ./scripts/migrate-v1-to-v2/run-svaythom-full-import.sh \
     scripts/migrate-v1-to-v2/data/export-... \
     <SCHOOL_ID>
   ```

7. **Validate** and **diff rosters**:

   ```bash
   IMPORT_DIR="..." SCHOOL_ID="..." npm run migrate:v1-validate
   IMPORT_DIR="..." SCHOOL_ID="..." npm run migrate:v1-diff-rosters
   SCHOOL_ID="..." npm run migrate:v1-audit-enrollments
   ```

   After a **data-only** import, `migration-report.json` records that user accounts were not migrated; **validate** then **skips** row-count checks for `users` and `grade_confirmations`. For exports without that field, use `VALIDATE_SKIP_USER_ACCOUNT_COUNTS=true` if you intentionally omitted logins.

**Large import:** full run can take many minutes (mostly grades). Use `SKIP_ERRORS=true` only if you need to continue past row-level errors and fix later.

**Idempotent:** Re-running import with the same export + `SCHOOL_ID` upserts and uses `createMany(..., skipDuplicates)` for bulk tables.

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

# Enrollment hygiene (import)
DEACTIVATE_STALE_ENROLLMENTS="false"   # default on — marks other ACTIVE StudentClass rows INACTIVE when V1 assigns a class

# Full preset (Svaythom school data, no login accounts) — parents + all phase-2 bulk
IMPORT_FULL_V1="true"

# Phase 2 — large tables (default off unless IMPORT_FULL_V1)
IMPORT_PHASE2_GRADES="true"             # grades.json → Grade
IMPORT_PHASE2_ATTENDANCE="true"         # attendance.json
IMPORT_PHASE2_MONTHLY_SUMMARIES="true"  # student_monthly_summaries.json (monthly scores)

# Optional — default off (IMPORT_FULL_V1 does not enable these)
IMPORT_INCLUDE_PARENTS="true"           # set true by IMPORT_FULL_V1
IMPORT_INCLUDE_USERS="true"             # legacy V1 passwords/logins — usually leave false
IMPORT_INCLUDE_GRADE_CONFIRMATIONS="true" # needs User rows for confirmedBy
IMPORT_INCLUDE_AUDIT_LOGS="true"       # needs users

# Roster diff / audit (read-only on V2)
ACADEMIC_YEAR_NAME="2025-2026"         # optional filter for diff-rosters.ts
IGNORE_ACADEMIC_YEAR="true"            # compare active class rosters by classId, matching the Students page
OUTPUT_JSON="/tmp/roster-diff.json"     # optional JSON report for diff-rosters.ts
ACADEMIC_YEAR_ID="<cuid>"               # optional filter for audit-enrollments.ts
```

---

### Verify per-class rosters (before or after import)

Compares `students.json` grouped by V1 `classId` to V2 `StudentClass` rows (`ACTIVE`) for the mapped academic year. Student primary keys match when data was migrated from V1.

```bash
IMPORT_DIR="scripts/migrate-v1-to-v2/data/export-..." \
  SCHOOL_ID="<v2-school-cuid>" \
  npx tsx scripts/migrate-v1-to-v2/diff-rosters.ts
```

If the existing Stunity school has already moved the V1 classes into the current academic year, use the Students-page comparison mode. This ignores legacy V1 `class.academicYear` labels and checks active rosters by `classId`:

```bash
IMPORT_DIR="scripts/migrate-v1-to-v2/data/export-..." \
  SCHOOL_ID="<v2-school-cuid>" \
  IGNORE_ACADEMIC_YEAR=true \
  npx tsx scripts/migrate-v1-to-v2/diff-rosters.ts
```

Exit code `0` = no mismatches; `2` = differences found. Exit `2` helps CI fail on drift.

---

### Audit duplicate enrollments

```bash
SCHOOL_ID="<v2-school-cuid>" npx tsx scripts/migrate-v1-to-v2/audit-enrollments.ts
```

---

## Align an **existing** production school

Use a **fresh V1 export** and your real `SCHOOL_ID` (do not use `CREATE_SCHOOL`):

```bash
IMPORT_DIR="scripts/migrate-v1-to-v2/data/export-..." \
  SCHOOL_ID="<existing-v2-school-cuid>" \
  npx tsx scripts/migrate-v1-to-v2/import-to-v2.ts
```

The importer upserts students/classes with **preserved V1 IDs**, refreshes key fields, aligns `StudentClass`, and (by default) deactivates stale parallel ACTIVE enrollments for each V1 student. It reuses old null-year `StudentClass` rows where possible so class counts do not double-count students.

When students match, import monthly scores (large):

```bash
IMPORT_DIR="..." SCHOOL_ID="..." \
  IMPORT_PHASE2_MONTHLY_SUMMARIES=true \
  npx tsx scripts/migrate-v1-to-v2/import-to-v2.ts
```

(Add `IMPORT_PHASE2_GRADES=true` if line-item grades are still needed.)

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
8.  Parent                 (optional — IMPORT_INCLUDE_PARENTS / IMPORT_FULL_V1)
9.  StudentParent          (optional — same)
10. StudentClass           (enrollment; optional stale-row cleanup)
11. SubjectTeacher
12. TeacherClass
13. Grade                  (Phase 2 — IMPORT_PHASE2_* / IMPORT_FULL_V1)
14. Attendance             (Phase 2)
15. StudentMonthlySummary  (Phase 2)
16. User                    (optional — IMPORT_INCLUDE_USERS / IMPORT_FULL_V1)
17. GradeConfirmation      (optional — after users)
18. AuditLog               (optional — IMPORT_INCLUDE_AUDIT_LOGS only)
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
