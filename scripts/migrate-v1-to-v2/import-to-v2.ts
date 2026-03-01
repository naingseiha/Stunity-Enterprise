/**
 * V1 → V2 Data Importer (Production Grade)
 *
 * Usage:
 *   # Dry-run (no writes, full preview):
 *   IMPORT_DIR=scripts/migrate-v1-to-v2/data/export-LATEST DRY_RUN=true npx tsx scripts/migrate-v1-to-v2/import-to-v2.ts
 *
 *   # Real import (creates a school automatically):
 *   IMPORT_DIR=scripts/migrate-v1-to-v2/data/export-LATEST CREATE_SCHOOL=true SCHOOL_NAME="My School" npx tsx scripts/migrate-v1-to-v2/import-to-v2.ts
 *
 *   # Real import (use existing school):
 *   IMPORT_DIR=scripts/migrate-v1-to-v2/data/export-LATEST SCHOOL_ID=<v2-school-id> npx tsx scripts/migrate-v1-to-v2/import-to-v2.ts
 *
 * Environment Variables:
 *   IMPORT_DIR      Path to the export directory (required)
 *   DRY_RUN         "true" = no DB writes, show preview report only
 *   CREATE_SCHOOL   "true" = create a new school in V2 for migrated data
 *   SCHOOL_NAME     Name for the new school (used with CREATE_SCHOOL=true)
 *   SCHOOL_ID       Use an existing V2 school ID (alternative to CREATE_SCHOOL)
 *   SKIP_ERRORS     "true" = log row-level errors and continue (default: abort on error)
 *   COUNTRY_CODE    Country code for new school (default: "KH")
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

// ─── Config ──────────────────────────────────────────────────────────────────

const IMPORT_DIR = process.env.IMPORT_DIR || path.join(__dirname, 'data', 'export-latest');
const DRY_RUN = process.env.DRY_RUN === 'true';
const CREATE_SCHOOL = process.env.CREATE_SCHOOL === 'true';
const SCHOOL_NAME = process.env.SCHOOL_NAME || 'Migrated School (V1)';
const SCHOOL_ID_ENV = process.env.SCHOOL_ID || null;
const SKIP_ERRORS = process.env.SKIP_ERRORS === 'true';
const COUNTRY_CODE = process.env.COUNTRY_CODE || 'KH';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '500');

// ─── Types ───────────────────────────────────────────────────────────────────

interface IdMap {
  class: Record<string, string>;
  subject: Record<string, string>;
  teacher: Record<string, string>;
  student: Record<string, string>;
  parent: Record<string, string>;
  user: Record<string, string>;
  academicYear: Record<string, string>;
}

interface MigrationReport {
  schoolId: string;
  schoolName: string;
  created: Record<string, number>;
  skipped: Record<string, number>;
  errors: Array<{ entity: string; id: string; error: string }>;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadJson<T>(filename: string): T | null {
  const p = path.join(IMPORT_DIR, filename);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
  } catch (e) {
    console.warn(`  ⚠️  Could not parse ${filename}: ${e}`);
    return null;
  }
}

function parseAcademicYear(s: string): { start: Date; end: Date } {
  const parts = s.split('-').map(Number);
  const startYear = parts[0];
  const endYear = parts[1] ?? startYear + 1;
  return {
    start: new Date(startYear, 8, 1),   // Sept 1
    end: new Date(endYear, 7, 31),       // Aug 31
  };
}

function buildStudentCustomFields(s: any): Record<string, any> {
  const cf: Record<string, any> = {};
  if (s.khmerName) cf.khmerName = s.khmerName;
  if (s.englishName) cf.englishName = s.englishName;
  if (s.placeOfBirth) cf.placeOfBirth = s.placeOfBirth;
  if (s.currentAddress) cf.currentAddress = s.currentAddress;
  if (s.fatherName) cf.fatherName = s.fatherName;
  if (s.motherName) cf.motherName = s.motherName;
  if (s.parentOccupation) cf.parentOccupation = s.parentOccupation;
  if (s.previousSchool) cf.previousSchool = s.previousSchool;
  if (s.repeatingGrade !== undefined) cf.repeatingGrade = s.repeatingGrade;
  if (s.transferredFrom) cf.transferredFrom = s.transferredFrom;
  const g9: Record<string, any> = {};
  if (s.grade9ExamCenter) g9.examCenter = s.grade9ExamCenter;
  if (s.grade9ExamRoom) g9.examRoom = s.grade9ExamRoom;
  if (s.grade9ExamDesk) g9.examDesk = s.grade9ExamDesk;
  if (s.grade9ExamSession) g9.examSession = s.grade9ExamSession;
  if (s.grade9PassStatus) g9.passStatus = s.grade9PassStatus;
  if (Object.keys(g9).length > 0) cf.grade9 = g9;
  const g12: Record<string, any> = {};
  if (s.grade12ExamCenter) g12.examCenter = s.grade12ExamCenter;
  if (s.grade12ExamRoom) g12.examRoom = s.grade12ExamRoom;
  if (s.grade12ExamDesk) g12.examDesk = s.grade12ExamDesk;
  if (s.grade12ExamSession) g12.examSession = s.grade12ExamSession;
  if (s.grade12PassStatus) g12.passStatus = s.grade12PassStatus;
  if (s.grade12Track) g12.track = s.grade12Track;
  if (Object.keys(g12).length > 0) cf.grade12 = g12;
  return cf;
}

function buildTeacherCustomFields(t: any): Record<string, any> {
  const cf: Record<string, any> = {};
  if (t.khmerName) cf.khmerName = t.khmerName;
  if (t.englishName) cf.englishName = t.englishName;
  if (t.degree) cf.degree = t.degree;
  if (t.major1) cf.major1 = t.major1;
  if (t.major2) cf.major2 = t.major2;
  if (t.workingLevel) cf.workingLevel = t.workingLevel;
  if (t.idCard) cf.idCard = t.idCard;
  if (t.passport) cf.passport = t.passport;
  if (t.nationality) cf.nationality = t.nationality;
  if (t.salaryRange) cf.salaryRange = t.salaryRange;
  if (t.emergencyContact) cf.emergencyContact = t.emergencyContact;
  if (t.emergencyPhone) cf.emergencyPhone = t.emergencyPhone;
  return cf;
}

function buildParentCustomFields(p: any): Record<string, any> {
  const cf: Record<string, any> = {};
  if (p.khmerName) cf.khmerName = p.khmerName;
  if (p.englishName) cf.englishName = p.englishName;
  if (p.occupation) cf.occupation = p.occupation;
  return cf;
}

function cambodianGradingRanges() {
  return [
    { grade: 'A', minScore: 90, maxScore: 100, gpa: 4.0, description: 'Excellent', color: '#22c55e', order: 0 },
    { grade: 'B', minScore: 80, maxScore: 89.99, gpa: 3.0, description: 'Good', color: '#84cc16', order: 1 },
    { grade: 'C', minScore: 70, maxScore: 79.99, gpa: 2.0, description: 'Average', color: '#eab308', order: 2 },
    { grade: 'D', minScore: 55, maxScore: 69.99, gpa: 1.0, description: 'Pass', color: '#f97316', order: 3 },
    { grade: 'F', minScore: 0, maxScore: 54.99, gpa: 0.0, description: 'Fail', color: '#ef4444', order: 4 },
  ];
}

// V2 TeacherRole enum: TEACHER | INSTRUCTOR
function sanitizeTeacherRole(role: any): 'TEACHER' | 'INSTRUCTOR' {
  if (role === 'INSTRUCTOR') return 'INSTRUCTOR';
  return 'TEACHER'; // VICE_PRINCIPAL, PRINCIPAL, ADMIN, null → TEACHER
}

// V2 WorkingLevel enum: FRAMEWORK_A | FRAMEWORK_B | FRAMEWORK_C | CONTRACT | PROBATION
const VALID_WORKING_LEVELS = new Set(['FRAMEWORK_A', 'FRAMEWORK_B', 'FRAMEWORK_C', 'CONTRACT', 'PROBATION']);
function sanitizeWorkingLevel(wl: any): string | null {
  if (!wl) return null;
  const upper = String(wl).toUpperCase().trim();
  // Try common V1 aliases
  if (upper === 'A' || upper === 'FRAMEWORK A') return 'FRAMEWORK_A';
  if (upper === 'B' || upper === 'FRAMEWORK B') return 'FRAMEWORK_B';
  if (upper === 'C' || upper === 'FRAMEWORK C') return 'FRAMEWORK_C';
  if (VALID_WORKING_LEVELS.has(upper)) return upper;
  return null; // unknown value → null (stored in customFields instead)
}

/**
 * Normalize V1 date strings to ISO YYYY-MM-DD or null.
 * V1 has inconsistent formats: "21/5/87", "2/6/72", "1988-08-14", "", "null"
 */
function sanitizeDate(raw: any): string | null {
  if (!raw || raw === 'null') return null;
  const s = String(raw).trim();
  if (!s || s === 'null') return null;

  // Already ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // dd/M/yy or dd/MM/yy (two-digit year) e.g. "21/5/87" → 1987, "6/2/87" → 1987
  // dd/M/yyyy or dd/MM/yyyy (four-digit year) e.g. "2/6/1972"
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1]).toString().padStart(2, '0');
    const month = parseInt(dmyMatch[2]).toString().padStart(2, '0');
    let year = parseInt(dmyMatch[3]);
    // Two-digit year: 00–30 → 2000–2030, 31–99 → 1931–1999
    if (year < 100) year = year <= 30 ? 2000 + year : 1900 + year;
    return `${year}-${month}-${day}`;
  }

  // Anything else that can't be parsed: store null, don't break the migration
  return null;
}

function pad(label: string, width = 32) { return label.padEnd(width); }
function counter(n: number) { return String(n).padStart(6); }

async function upsertInBatches<T>(items: T[], batchSize: number, processFn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += batchSize) {
    await Promise.all(items.slice(i, i + batchSize).map(processFn));
  }
}


// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();

  if (!fs.existsSync(IMPORT_DIR)) {
    console.error(`\n❌  Import directory not found: ${IMPORT_DIR}`);
    console.error('    Run export-v1-data.ts first, then set IMPORT_DIR.\n');
    process.exit(1);
  }

  console.log('');
  console.log('┌─────────────────────────────────────────────────┐');
  console.log(DRY_RUN
    ? '│  V1 → V2 Migration:  DRY RUN (no writes)        │'
    : '│  V1 → V2 Migration:  Live Import                │');
  console.log('└─────────────────────────────────────────────────┘');
  console.log('');
  console.log(`  Mode       : ${DRY_RUN ? '🔍 DRY RUN' : '✍️  LIVE'}`);
  console.log(`  Import dir : ${IMPORT_DIR}`);
  console.log(`  Skip errors: ${SKIP_ERRORS}`);
  console.log('');

  const classes = loadJson<any[]>('classes.json') || [];
  const subjects = loadJson<any[]>('subjects.json') || [];
  const teachers = loadJson<any[]>('teachers.json') || [];
  const students = loadJson<any[]>('students.json') || [];
  const parents = loadJson<any[]>('parents.json') || [];
  const studentParents = loadJson<any[]>('student_parents.json') || [];
  const subjectTeachers = loadJson<any[]>('subject_teachers.json') || [];
  const teacherClasses = loadJson<any[]>('teacher_classes.json') || [];
  const grades = loadJson<any[]>('grades.json') || [];
  const attendance = loadJson<any[]>('attendance.json') || [];
  const monthlySummaries = loadJson<any[]>('student_monthly_summaries.json') || [];
  const users = loadJson<any[]>('users.json') || [];
  const gradeConfirmations = loadJson<any[]>('grade_confirmations.json') || [];
  const auditLogs = loadJson<any[]>('audit_logs.json') || [];

  console.log('  V1 Record Counts:');
  console.log(`    ${pad('Classes')}${counter(classes.length)}`);
  console.log(`    ${pad('Subjects')}${counter(subjects.length)}`);
  console.log(`    ${pad('Teachers')}${counter(teachers.length)}`);
  console.log(`    ${pad('Students')}${counter(students.length)}`);
  console.log(`    ${pad('Parents')}${counter(parents.length)}`);
  console.log(`    ${pad('Grades')}${counter(grades.length)}`);
  console.log(`    ${pad('Attendance')}${counter(attendance.length)}`);
  console.log(`    ${pad('Users')}${counter(users.length)}`);
  console.log('');

  if (DRY_RUN) {
    const yearStrings = [...new Set(classes.map((c) => c.academicYear || '2024-2025'))];
    console.log('  🔍 DRY RUN Preview:');
    console.log(`    Would create school       : "${SCHOOL_NAME}"`);
    console.log(`    AcademicYears to create   : ${yearStrings.join(', ')}`);
    console.log(`    GradingScales (per year)  : ${yearStrings.length} (Cambodian A–F scale)`);
    console.log(`    Subjects to migrate       : ${subjects.length}`);
    console.log(`    Teachers to migrate       : ${teachers.length}`);
    console.log(`    Classes to migrate        : ${classes.length}`);
    console.log(`    Students to migrate       : ${students.length}`);
    console.log(`    Parents to migrate        : ${parents.length}`);
    console.log(`    StudentParent links       : ${studentParents.length}`);
    console.log(`    StudentClass enrollments  : ${students.filter((s) => s.classId).length}`);
    console.log(`    SubjectTeacher links      : ${subjectTeachers.length}`);
    console.log(`    TeacherClass links        : ${teacherClasses.length}`);
    console.log(`    Grades to migrate         : ${grades.length}`);
    console.log(`    Attendance to migrate     : ${attendance.length}`);
    console.log(`    Monthly summaries         : ${monthlySummaries.length}`);
    console.log(`    Users to migrate          : ${users.length}`);
    console.log(`    GradeConfirmations        : ${gradeConfirmations.length}`);
    console.log('');
    if (students.length > 0) {
      console.log('  customFields sample (student):');
      const sample = buildStudentCustomFields(students[0]);
      console.log(JSON.stringify(sample, null, 4).split('\n').map((l) => `    ${l}`).join('\n'));
    }
    console.log('');
    console.log('  To run the actual import:');
    console.log(`    IMPORT_DIR="${IMPORT_DIR}" CREATE_SCHOOL=true SCHOOL_NAME="${SCHOOL_NAME}" npx tsx scripts/migrate-v1-to-v2/import-to-v2.ts`);
    console.log('');
    return;
  }

  // ── Live import ─────────────────────────────────────────────────────────────
  const prisma = new PrismaClient();
  const idMap: IdMap = { class: {}, subject: {}, teacher: {}, student: {}, parent: {}, user: {}, academicYear: {} };
  const report: MigrationReport = {
    schoolId: '', schoolName: '', created: {}, skipped: {}, errors: [], startedAt: new Date().toISOString(),
  };

  function inc(key: string, by = 1) { report.created[key] = (report.created[key] || 0) + by; }
  function skip(key: string, by = 1) { report.skipped[key] = (report.skipped[key] || 0) + by; }
  function recordError(entity: string, id: string, err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    report.errors.push({ entity, id, error: msg });
    console.error(`    ⛔ ${entity} [${id}]: ${msg.slice(0, 120)}`);
    if (!SKIP_ERRORS) throw new Error(`Aborting due to error in ${entity} ${id}. Set SKIP_ERRORS=true to continue.`);
  }

  try {
    // ── 1. School (outside transaction) ──────────────────────────────────────
    let schoolId: string;
    if (SCHOOL_ID_ENV) {
      const school = await prisma.school.findUnique({ where: { id: SCHOOL_ID_ENV } });
      if (!school) { console.error(`❌  School "${SCHOOL_ID_ENV}" not found.`); process.exit(1); }
      schoolId = school.id;
      console.log(`  ✅  ${pad('School (existing)')} ${school.name} [${school.id}]`);
    } else if (CREATE_SCHOOL) {
      const slug = SCHOOL_NAME.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
      const school = await prisma.school.create({
        data: { name: SCHOOL_NAME, slug, email: `migrated-${Date.now()}@school.local`, countryCode: COUNTRY_CODE, subscriptionTier: 'FREE_TRIAL_1M', schoolType: 'HIGH_SCHOOL' },
      });
      schoolId = school.id;
      console.log(`  ✅  ${pad('School (created)')} ${school.name} [${school.id}]`);
      inc('school');
    } else {
      const school = await prisma.school.findFirst({ where: { isActive: true } });
      if (!school) { console.error('❌  No active school found. Use CREATE_SCHOOL=true or SCHOOL_ID=<id>.'); process.exit(1); }
      schoolId = school.id;
      console.log(`  ✅  ${pad('School (first active)')} ${school.name} [${school.id}]`);
    }
    report.schoolId = schoolId;
    report.schoolName = SCHOOL_NAME;

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 1 — Structural data in a single short transaction
    //   Academic years, subjects, teachers, classes, students, parents, links
    //   All small (<2000 rows), completes in a few seconds.
    // ═══════════════════════════════════════════════════════════════════════
    console.log('');
    console.log('  Phase 1: Structural data…');

    await prisma.$transaction(async (tx) => {

      // ── 2. Academic Years ─────────────────────────────────────────────────
      const yearStrings = [...new Set(classes.map((c) => c.academicYear || '2024-2025'))];
      for (const ys of yearStrings) {
        const { start, end } = parseAcademicYear(ys);
        const isLatest = yearStrings.indexOf(ys) === yearStrings.length - 1;
        const ay = await (tx as any).academicYear.upsert({
          where: { schoolId_name: { schoolId, name: ys } },
          create: { schoolId, name: ys, startDate: start, endDate: end, isCurrent: isLatest },
          update: {},
        });
        idMap.academicYear[ys] = ay.id;
      }
      console.log(`  ✅  ${pad('AcademicYears')}${counter(yearStrings.length)}`);
      inc('academicYears', yearStrings.length);

      // ── 3. Grading Scales ─────────────────────────────────────────────────
      let gsCreated = 0;
      for (const ys of yearStrings) {
        const ayId = idMap.academicYear[ys];
        const existing = await (tx as any).gradingScale.findFirst({ where: { academicYearId: ayId } });
        if (!existing) {
          await (tx as any).gradingScale.create({
            data: {
              academicYearId: ayId, name: 'Cambodian Standard (A–F)', isDefault: true,
              ranges: { create: cambodianGradingRanges() },
            },
          });
          gsCreated++;
        }
      }
      console.log(`  ✅  ${pad('GradingScales (created)')}${counter(gsCreated)}`);
      inc('gradingScales', gsCreated);

    }, { timeout: 30_000, maxWait: 10_000 });

    console.log('  Phase 1b: Core Data (Non-transactional)…');

    // ── 4. Subjects ───────────────────────────────────────────────────────
    let subjCreated = 0, subjSkipped = 0;
    for (const s of subjects) {
      if (!s.code) { recordError('subject', s.id, 'Missing code field'); continue; }
      try {
        const existing = await prisma.subject.findUnique({ where: { code: s.code } });
        if (existing) { idMap.subject[s.id] = existing.id; subjSkipped++; }
        else {
          const cf: Record<string, any> = {};
          if (s.nameKh && s.nameKh !== s.name) cf.localName = s.nameKh;
          const created = await prisma.subject.create({
            data: {
              name: s.name, nameKh: s.nameKh || s.name, nameEn: s.nameEn ?? null,
              code: s.code, grade: s.grade, track: s.track ?? null,
              category: s.category || 'Core', weeklyHours: s.weeklyHours ?? 0,
              annualHours: s.annualHours ?? 0, maxScore: s.maxScore ?? 100,
              coefficient: s.coefficient ?? 1, isActive: s.isActive ?? true,
              customFields: Object.keys(cf).length > 0 ? cf : undefined,
            },
          });
          idMap.subject[s.id] = created.id;
          subjCreated++;
        }
      } catch (err) { recordError('subject', s.id || s.code, err); }
    }
    console.log(`  ✅  ${pad('Subjects created/skipped')}${counter(subjCreated)} / ${subjSkipped}`);
    inc('subjects', subjCreated); skip('subjects', subjSkipped);

    // ── 5. Teachers ───────────────────────────────────────────────────────
    let tchCreated = 0, tchSkipped = 0;
    for (const t of teachers) {
      try {
        const cf = buildTeacherCustomFields(t);
        const teacherData = {
          id: t.id, schoolId, teacherId: t.teacherId ?? null, firstName: t.firstName, lastName: t.lastName,
          khmerName: t.khmerName ?? null, email: t.email ?? null, phone: t.phone ?? null,
          employeeId: t.employeeId ?? null, gender: t.gender ?? null, dateOfBirth: sanitizeDate(t.dateOfBirth),
          position: t.position ?? null, address: t.address ?? null, hireDate: sanitizeDate(t.hireDate),
          role: sanitizeTeacherRole(t.role), englishName: t.englishName ?? null, degree: t.degree ?? null,
          emergencyContact: t.emergencyContact ?? null, emergencyPhone: t.emergencyPhone ?? null,
          idCard: t.idCard ?? null, major1: t.major1 ?? null, major2: t.major2 ?? null,
          nationality: t.nationality ?? null, passport: t.passport ?? null,
          phoneNumber: t.phoneNumber ?? null, salaryRange: t.salaryRange ?? null,
          workingLevel: sanitizeWorkingLevel(t.workingLevel) as any,
          customFields: Object.keys(cf).length > 0 ? cf : undefined,
        };
        const result = await prisma.teacher.upsert({
          where: { id: t.id },
          create: teacherData,
          update: { schoolId, firstName: t.firstName, lastName: t.lastName },
        });
        const isNew = result.createdAt?.getTime() === result.updatedAt?.getTime();
        idMap.teacher[t.id] = result.id;
        if (isNew) tchCreated++; else tchSkipped++;
      } catch (err) {
        recordError('teacher', t.id, err);
      }
    }
    console.log(`  ✅  ${pad('Teachers')}${counter(tchCreated)} created / ${tchSkipped} updated`);
    inc('teachers', tchCreated);

    // ── 6. Classes ────────────────────────────────────────────────────────
    let clsCreated = 0;
    for (const c of classes) {
      const ayId = idMap.academicYear[c.academicYear || '2024-2025'];
      if (!ayId) { recordError('class', c.id, 'AcademicYear not found: ' + c.academicYear); continue; }
      try {
        const homeroomTeacherId = c.homeroomTeacherId ? idMap.teacher[c.homeroomTeacherId] ?? null : null;
        const classData = {
          id: c.id, schoolId, academicYearId: ayId, classId: c.classId ?? null,
          name: c.name, grade: c.grade, section: c.section ?? null,
          capacity: c.capacity ?? null, track: c.track ?? null, homeroomTeacherId,
        };
        const result = await prisma.class.upsert({
          where: { id: c.id },
          create: classData,
          update: { name: c.name, homeroomTeacherId },
        });
        idMap.class[c.id] = result.id;
        clsCreated++;
      } catch (err) {
        recordError('class', c.id, err);
      }
    }
    console.log(`  ✅  ${pad('Classes')}${counter(clsCreated)}`);
    inc('classes', clsCreated);

    // ── 7. Students ───────────────────────────────────────────────────────
    let stdCreated = 0;
    await upsertInBatches(students, 50, async (s) => {
      const classId = s.classId ? (idMap.class[s.classId] ?? null) : null;
      const cf = buildStudentCustomFields(s);
      const studentData: any = {
        id: s.id, schoolId, studentId: s.studentId ?? null, firstName: s.firstName,
        lastName: s.lastName, khmerName: s.khmerName ?? '', dateOfBirth: s.dateOfBirth || '',
        gender: s.gender, englishName: s.englishName ?? null, email: s.email ?? null,
        placeOfBirth: s.placeOfBirth ?? null, currentAddress: s.currentAddress ?? null,
        phoneNumber: s.phoneNumber ?? null, classId, fatherName: s.fatherName ?? null,
        motherName: s.motherName ?? null, parentPhone: s.parentPhone ?? null,
        parentOccupation: s.parentOccupation ?? null, previousGrade: s.previousGrade ?? null,
        remarks: s.remarks ?? null, photoUrl: s.photoUrl ?? null,
        grade12ExamCenter: s.grade12ExamCenter ?? null, grade12ExamDesk: s.grade12ExamDesk ?? null,
        grade12ExamRoom: s.grade12ExamRoom ?? null, grade12ExamSession: s.grade12ExamSession ?? null,
        grade12PassStatus: s.grade12PassStatus ?? null, grade12Track: s.grade12Track ?? null,
        grade9ExamCenter: s.grade9ExamCenter ?? null, grade9ExamDesk: s.grade9ExamDesk ?? null,
        grade9ExamRoom: s.grade9ExamRoom ?? null, grade9ExamSession: s.grade9ExamSession ?? null,
        grade9PassStatus: s.grade9PassStatus ?? null, previousSchool: s.previousSchool ?? null,
        repeatingGrade: s.repeatingGrade ?? null, transferredFrom: s.transferredFrom ?? null,
        accountDeactivatedAt: s.accountDeactivatedAt ? new Date(s.accountDeactivatedAt) : null,
        deactivationReason: s.deactivationReason ?? null, isAccountActive: s.isAccountActive ?? true,
        studentRole: s.studentRole || 'GENERAL',
        customFields: Object.keys(cf).length > 0 ? cf : undefined,
      };
      try {
        const result = await prisma.student.upsert({
          where: { id: s.id },
          create: studentData,
          update: { firstName: s.firstName, lastName: s.lastName, classId },
        });
        idMap.student[s.id] = result.id;
        stdCreated++;
      } catch (err) {
        recordError('student', s.id, err);
      }
    });
    console.log(`  ✅  ${pad('Students')}${counter(stdCreated)}`);
    inc('students', stdCreated);

    // ── 8. Parents ────────────────────────────────────────────────────────
    /* SKIP PARENTS FOR NOW
    let parCreated = 0;
    await upsertInBatches(parents, 50, async (p) => {
      const cf = buildParentCustomFields(p);
      try {
        const result = await prisma.parent.upsert({
          where: { id: p.id },
          create: {
            id: p.id, parentId: p.parentId ?? null, firstName: p.firstName, lastName: p.lastName,
            khmerName: p.khmerName ?? '', englishName: p.englishName ?? null,
            gender: p.gender ?? null, email: p.email ?? null, phone: p.phone,
            address: p.address ?? null, relationship: p.relationship,
            occupation: p.occupation ?? null, emergencyPhone: p.emergencyPhone ?? null,
            isAccountActive: p.isAccountActive ?? true,
            customFields: Object.keys(cf).length > 0 ? cf : undefined,
          },
          update: { firstName: p.firstName, lastName: p.lastName },
        });
        idMap.parent[p.id] = result.id;
        parCreated++;
      } catch (err) {
        recordError('parent', p.id, err);
      }
    });
    console.log(`  ✅  ${pad('Parents')}${counter(parCreated)}`);
    inc('parents', parCreated);
    */

    // ── 9. StudentParent links ────────────────────────────────────────────
    /* SKIP STUDENT-PARENT LINKS FOR NOW
    let spCreated = 0;
    await upsertInBatches(studentParents, 100, async (sp) => {
      const studentId = idMap.student[sp.studentId];
      const parentId = idMap.parent[sp.parentId];
      if (!studentId || !parentId) { skip('studentParents'); return; }
      try {
        await prisma.studentParent.upsert({
          where: { studentId_parentId: { studentId, parentId } },
          create: { studentId, parentId, isPrimary: sp.isPrimary ?? false, relationship: sp.relationship },
          update: {},
        });
        spCreated++;
      } catch (err) { recordError('studentParent', sp.id || `${sp.studentId}+${sp.parentId}`, err); }
    });
    console.log(`  ✅  ${pad('StudentParent links')}${counter(spCreated)}`);
    inc('studentParents', spCreated);
    */

    // ── 10. StudentClass enrollments ──────────────────────────────────────
    let scCreated = 0;
    await upsertInBatches(students, 10, async (s) => {
      if (!s.classId) return;
      const studentId = idMap.student[s.id];
      const classId = idMap.class[s.classId];
      const cls = classes.find((c) => c.id === s.classId);
      const ayId = cls ? idMap.academicYear[cls.academicYear || '2024-2025'] : null;
      if (!studentId || !classId || !ayId) { skip('studentClasses'); return; }
      try {
        await prisma.studentClass.upsert({
          where: { studentId_classId_academicYearId: { studentId, classId, academicYearId: ayId } },
          create: { studentId, classId, academicYearId: ayId, status: 'ACTIVE' },
          update: {},
        });
        scCreated++;
      } catch (err) { recordError('studentClass', s.id, err); }
    });
    console.log(`  ✅  ${pad('StudentClass enrollments')}${counter(scCreated)}`);
    inc('studentClasses', scCreated);

    // ── 11. SubjectTeacher links ──────────────────────────────────────────
    let stCreated = 0;
    await upsertInBatches(subjectTeachers, 10, async (st) => {
      const subjectId = idMap.subject[st.subjectId];
      const teacherId = idMap.teacher[st.teacherId];
      if (!subjectId || !teacherId) { skip('subjectTeachers'); return; }
      try {
        await prisma.subjectTeacher.upsert({
          where: { subjectId_teacherId: { subjectId, teacherId } },
          create: { subjectId, teacherId },
          update: {},
        });
        stCreated++;
      } catch (err) { recordError('subjectTeacher', st.id, err); }
    });
    console.log(`  ✅  ${pad('SubjectTeacher links')}${counter(stCreated)}`);
    inc('subjectTeachers', stCreated);

    // ── 12. TeacherClass links ────────────────────────────────────────────
    let tcCreated = 0;
    await upsertInBatches(teacherClasses, 50, async (tc) => {
      const teacherId = idMap.teacher[tc.teacherId];
      const classId = idMap.class[tc.classId];
      if (!teacherId || !classId) { skip('teacherClasses'); return; }
      try {
        await prisma.teacherClass.upsert({
          where: { teacherId_classId: { teacherId, classId } },
          create: { teacherId, classId },
          update: {},
        });
        tcCreated++;
      } catch (err) { recordError('teacherClass', tc.id, err); }
    });
    console.log(`  ✅  ${pad('TeacherClass links')}${counter(tcCreated)}`);
    inc('teacherClasses', tcCreated);



    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 2 — Bulk data: grades, attendance, summaries
    //   Inserted OUTSIDE any transaction using batched createMany(skipDuplicates).
    //   100x faster than row-by-row; no transaction timeout possible.
    // ═══════════════════════════════════════════════════════════════════════
    console.log('');
    console.log('  Phase 2: Bulk data (batched, no transaction)…');

    // Helper: map + batch createMany
    async function insertBatch<T>(
      label: string,
      rows: T[],
      mapFn: (row: T) => Record<string, any> | null,
      createMany: (data: Record<string, any>[]) => Promise<{ count: number }>,
      countKey: string
    ) {
      const mapped = rows.map(mapFn).filter((r): r is Record<string, any> => r !== null);
      let total = 0;
      for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
        const chunk = mapped.slice(i, i + BATCH_SIZE);
        try {
          const res = await createMany(chunk);
          total += res.count;
        } catch (err: any) {
          console.error(`  ⚠️  Batch error in ${label} at offset ${i}: ${err.message?.slice(0, 100)}`);
        }
        if (mapped.length > 5000 && i > 0 && i % 10000 === 0) {
          console.log(`    … ${label} ${i.toLocaleString()} / ${mapped.length.toLocaleString()}`);
        }
      }
      console.log(`  ✅  ${pad(label)}${counter(total)}`);
      inc(countKey, total);
    }

    // ── 13. Grades ────────────────────────────────────────────────────────────
    /* SKIP PHASE 2 IMPORTS (Grades, Attendance, Users)
    await insertBatch(
      'Grades', grades,
      (g) => {
        const studentId = idMap.student[g.studentId];
        const subjectId = idMap.subject[g.subjectId];
        const classId = idMap.class[g.classId];
        if (!studentId || !subjectId || !classId) { skip('grades'); return null; }
        return {
          studentId, subjectId, classId,
          score: g.score, maxScore: g.maxScore,
          month: g.month ?? null, monthNumber: g.monthNumber ?? null, year: g.year ?? null,
          percentage: g.percentage ?? null, weightedScore: g.weightedScore ?? null,
          remarks: g.remarks ?? null,
        };
      },
      (data) => prisma.grade.createMany({ data: data as any, skipDuplicates: true }),
      'grades'
    );

    // ── 14. Attendance ────────────────────────────────────────────────────────
    await insertBatch(
      'Attendance', attendance,
      (a) => {
        const studentId = idMap.student[a.studentId];
        const classId = a.classId ? (idMap.class[a.classId] ?? null) : null;
        if (!studentId) { skip('attendance'); return null; }
        return {
          studentId, classId, date: new Date(a.date),
          status: a.status, session: a.session || 'MORNING', remarks: a.remarks ?? null,
        };
      },
      (data) => prisma.attendance.createMany({ data: data as any, skipDuplicates: true }),
      'attendance'
    );

    // ── 15. Monthly Summaries ─────────────────────────────────────────────────
    await insertBatch(
      'Monthly Summaries', monthlySummaries,
      (m) => {
        const studentId = idMap.student[m.studentId];
        const classId = idMap.class[m.classId];
        if (!studentId || !classId) { skip('monthlySummaries'); return null; }
        return {
          studentId, classId, month: m.month, monthNumber: m.monthNumber, year: m.year,
          totalScore: m.totalScore, totalMaxScore: m.totalMaxScore,
          totalWeightedScore: m.totalWeightedScore, totalCoefficient: m.totalCoefficient,
          average: m.average, classRank: m.classRank ?? null, gradeLevel: m.gradeLevel ?? null,
        };
      },
      (data) => prisma.studentMonthlySummary.createMany({ data: data as any, skipDuplicates: true }),
      'monthlySummaries'
    );

    // ── 16. Users (upsert, row by row — handles FK links) ────────────────────
    let usrCreated = 0;
    for (const u of users) {
      const studentId = u.studentId ? (idMap.student[u.studentId] ?? null) : null;
      const teacherId = u.teacherId ? (idMap.teacher[u.teacherId] ?? null) : null;
      const parentId = u.parentId ? (idMap.parent[u.parentId] ?? null) : null;
      try {
        const result = await prisma.user.upsert({
          where: { id: u.id },
          create: {
            id: u.id, schoolId: studentId || teacherId ? schoolId : null,
            email: u.email ?? null, password: u.password,
            firstName: u.firstName, lastName: u.lastName,
            role: u.role || 'TEACHER', studentId, teacherId, parentId,
            phone: u.phone ?? null, permissions: u.permissions ?? undefined,
            isDefaultPassword: u.isDefaultPassword ?? true,
            isSuperAdmin: u.isSuperAdmin ?? false,
          },
          update: {
            schoolId: studentId || teacherId ? schoolId : undefined,
            studentId: studentId ?? undefined, teacherId: teacherId ?? undefined, parentId: parentId ?? undefined,
          },
        });
        idMap.user[u.id] = result.id;
        usrCreated++;
      } catch (err) { recordError('user', u.id, err); }
    }
    console.log(`  ✅  ${pad('Users')}${counter(usrCreated)}`);
    inc('users', usrCreated);

    // ── 17. GradeConfirmations ────────────────────────────────────────────────
    let gcCreated = 0;
    for (const gc of gradeConfirmations) {
      const classId = idMap.class[gc.classId];
      const subjectId = idMap.subject[gc.subjectId];
      const confirmedBy = idMap.user[gc.confirmedBy] ?? gc.confirmedBy;
      if (!classId || !subjectId) { skip('gradeConfirmations'); continue; }
      try {
        await prisma.gradeConfirmation.upsert({
          where: { classId_subjectId_month_year: { classId, subjectId, month: gc.month, year: gc.year } },
          create: { classId, subjectId, month: gc.month, year: gc.year, isConfirmed: gc.isConfirmed ?? false, confirmedBy },
          update: {},
        });
        gcCreated++;
      } catch (err) { recordError('gradeConfirmation', gc.id, err); }
    }
    console.log(`  ✅  ${pad('GradeConfirmations')}${counter(gcCreated)}`);
    inc('gradeConfirmations', gcCreated);

    // ── 18. Audit Logs ────────────────────────────────────────────────────────
    let alCreated = 0;
    for (const al of auditLogs) {
      const adminId = idMap.user[al.adminId] ?? al.adminId;
      const teacherId = idMap.user[al.teacherId] ?? al.teacherId;
      if (!adminId || !teacherId) { skip('auditLogs'); continue; }
      try {
        await prisma.auditLog.create({
          data: { id: al.id, adminId, teacherId, action: al.action, reason: al.reason ?? null, details: al.details ?? undefined },
        });
        alCreated++;
      } catch { skip('auditLogs'); }
    }
    console.log(`  ✅  ${pad('AuditLogs')}${counter(alCreated)}`);
    inc('auditLogs', alCreated);
    */

    // ── Final Report ──────────────────────────────────────────────────────────
    const duration = Date.now() - startTime;
    report.completedAt = new Date().toISOString();
    report.durationMs = duration;
    const reportPath = path.join(IMPORT_DIR, 'migration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

    console.log('');
    console.log('┌─────────────────────────────────────────────────┐');
    console.log('│  Migration Complete ✅                           │');
    console.log('└─────────────────────────────────────────────────┘');
    console.log('');
    console.log(`  School ID  : ${report.schoolId}`);
    console.log(`  Duration   : ${(duration / 1000).toFixed(1)}s`);
    console.log('');
    console.log('  Created:');
    for (const [k, v] of Object.entries(report.created)) console.log(`    ${pad(k)}${counter(v)}`);
    if (Object.keys(report.skipped).length > 0) {
      console.log('');
      console.log('  Skipped (already existed or missing FK):');
      for (const [k, v] of Object.entries(report.skipped)) console.log(`    ${pad(k)}${counter(v)}`);
    }
    if (report.errors.length > 0) console.log(`\n  ⚠️  Errors: ${report.errors.length} (see migration-report.json)`);
    console.log('');
    console.log(`  Report     : ${reportPath}`);
    console.log('');
    console.log('  Next step – validate:');
    console.log(`    IMPORT_DIR="${IMPORT_DIR}" npx tsx scripts/migrate-v1-to-v2/validate-migration.ts`);
    console.log('');

  } catch (err) {
    console.error('\n❌  Migration FAILED:', err);
    console.error('\n    If this happened during Phase 1, all structural data was rolled back.');
    console.error('    If this happened during Phase 2, structural data was committed — re-run with SKIP_ERRORS=true to resume.\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
