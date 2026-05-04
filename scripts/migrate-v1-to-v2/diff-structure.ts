/**
 * V1 vs V2 structure diff for classes, subjects, and teacher assignment links.
 *
 * Usage:
 *   IMPORT_DIR=scripts/migrate-v1-to-v2/data/export-... \
 *   SCHOOL_ID=<v2-school-cuid> \
 *   npx tsx scripts/migrate-v1-to-v2/diff-structure.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const IMPORT_DIR = process.env.IMPORT_DIR || path.join(__dirname, 'data', 'export-latest');
const SCHOOL_ID = process.env.SCHOOL_ID;
const OUTPUT_JSON = process.env.OUTPUT_JSON;
const IGNORE_CLASS_ACADEMIC_YEAR = process.env.IGNORE_CLASS_ACADEMIC_YEAR === 'true';
const STRICT_GLOBAL_SUBJECTS = process.env.STRICT_GLOBAL_SUBJECTS === 'true';

type Diff = {
  entity: string;
  id: string;
  field?: string;
  v1?: unknown;
  v2?: unknown;
  note?: string;
};

function loadJson<T>(file: string): T {
  const p = path.join(IMPORT_DIR, file);
  if (!fs.existsSync(p)) {
    throw new Error(`Missing export file: ${p}`);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

function clean(value: unknown) {
  return value === undefined ? null : value;
}

function valuesMatch(a: unknown, b: unknown) {
  if (a === undefined || a === null) return b === undefined || b === null;
  if (b === undefined || b === null) return false;
  if (typeof a === 'number' || typeof b === 'number') {
    return Number(a) === Number(b);
  }
  return String(a) === String(b);
}

function compareFields(
  diffs: Diff[],
  entity: string,
  id: string,
  v1: Record<string, unknown>,
  v2: Record<string, unknown>,
  fields: string[],
) {
  for (const field of fields) {
    if (!valuesMatch(v1[field], v2[field])) {
      diffs.push({ entity, id, field, v1: clean(v1[field]), v2: clean(v2[field]) });
    }
  }
}

function linkSet<T>(rows: T[], pick: (row: T) => string | null) {
  const out = new Set<string>();
  for (const row of rows) {
    const key = pick(row);
    if (key) out.add(key);
  }
  return out;
}

function missingFrom(expected: Set<string>, actual: Set<string>) {
  return [...expected].filter((key) => !actual.has(key)).sort();
}

function printDiffSamples(title: string, diffs: Diff[], limit = 12) {
  if (diffs.length === 0) return;
  console.log(`\n  ${title} (${diffs.length})`);
  for (const d of diffs.slice(0, limit)) {
    const field = d.field ? `.${d.field}` : '';
    const note = d.note ? ` — ${d.note}` : '';
    const values = d.field ? `  V1=${JSON.stringify(d.v1)} V2=${JSON.stringify(d.v2)}` : '';
    console.log(`    - ${d.entity} ${d.id}${field}${note}${values}`);
  }
  if (diffs.length > limit) {
    console.log(`    ... ${diffs.length - limit} more`);
  }
}

async function main() {
  if (!SCHOOL_ID) {
    console.error('❌  SCHOOL_ID is required.');
    process.exit(1);
  }

  const v1Classes = loadJson<any[]>('classes.json');
  const v1Subjects = loadJson<any[]>('subjects.json');
  const v1SubjectTeachers = loadJson<any[]>('subject_teachers.json');
  const v1TeacherClasses = loadJson<any[]>('teacher_classes.json');

  const prisma = new PrismaClient({ log: ['error', 'warn'] });

  try {
    const school = await prisma.school.findUnique({
      where: { id: SCHOOL_ID },
      select: { id: true, name: true },
    });
    if (!school) {
      console.error(`❌  School not found: ${SCHOOL_ID}`);
      process.exit(1);
    }

    const [v2Classes, v2Subjects, v2SubjectTeachers, v2TeacherClasses] = await Promise.all([
      prisma.class.findMany({
        where: { schoolId: SCHOOL_ID },
        select: {
          id: true,
          classId: true,
          name: true,
          grade: true,
          section: true,
          capacity: true,
          track: true,
          homeroomTeacherId: true,
          academicYear: { select: { name: true } },
        },
      }),
      prisma.subject.findMany({
        select: {
          id: true,
          name: true,
          nameKh: true,
          nameEn: true,
          code: true,
          description: true,
          grade: true,
          track: true,
          category: true,
          weeklyHours: true,
          annualHours: true,
          maxScore: true,
          coefficient: true,
          isActive: true,
        },
      }),
      prisma.subjectTeacher.findMany({
        where: { teacher: { schoolId: SCHOOL_ID } },
        select: { subjectId: true, teacherId: true },
      }),
      prisma.teacherClass.findMany({
        where: { teacher: { schoolId: SCHOOL_ID }, class: { schoolId: SCHOOL_ID } },
        select: { teacherId: true, classId: true },
      }),
    ]);

    const classDiffs: Diff[] = [];
    const subjectDiffs: Diff[] = [];
    const linkDiffs: Diff[] = [];

    const v1ClassById = new Map(v1Classes.map((c) => [c.id, c]));
    const v2ClassById = new Map(v2Classes.map((c) => [c.id, c]));
    const v1SubjectByCode = new Map(v1Subjects.map((s) => [s.code, s]));
    const v2SubjectByCode = new Map(v2Subjects.map((s) => [s.code, s]));

    for (const c of v1Classes) {
      const v2 = v2ClassById.get(c.id);
      if (!v2) {
        classDiffs.push({ entity: 'class', id: c.id, note: 'missing in V2' });
        continue;
      }
      const classFields = [
        'classId',
        'name',
        'grade',
        'section',
        'capacity',
        'track',
        'homeroomTeacherId',
        ...(IGNORE_CLASS_ACADEMIC_YEAR ? [] : ['academicYear']),
      ];
      compareFields(classDiffs, 'class', c.id, c, { ...v2, academicYear: v2.academicYear?.name }, classFields);
    }

    for (const c of v2Classes) {
      if (!v1ClassById.has(c.id)) {
        classDiffs.push({ entity: 'class', id: c.id, note: 'extra in V2' });
      }
    }

    for (const s of v1Subjects) {
      const v2 = v2SubjectByCode.get(s.code);
      if (!v2) {
        subjectDiffs.push({ entity: 'subject', id: s.id, note: `missing in V2 by code ${s.code}` });
        continue;
      }
      compareFields(subjectDiffs, 'subject', s.code, s, v2, [
        'name',
        'nameKh',
        'nameEn',
        'code',
        'description',
        'grade',
        'track',
        'category',
        'weeklyHours',
        'annualHours',
        'maxScore',
        'coefficient',
        'isActive',
      ]);
    }

    for (const s of v2Subjects) {
      if (STRICT_GLOBAL_SUBJECTS && !v1SubjectByCode.has(s.code)) {
        subjectDiffs.push({ entity: 'subject', id: s.id, note: `extra in V2 code ${s.code}` });
      }
    }

    const subjectIdMap = new Map<string, string>();
    for (const s of v1Subjects) {
      const v2 = v2SubjectByCode.get(s.code);
      if (v2) subjectIdMap.set(s.id, v2.id);
    }

    const v1SubjectTeacherSet = linkSet(v1SubjectTeachers, (st) => {
      const subjectId = subjectIdMap.get(st.subjectId);
      return subjectId && st.teacherId ? `${subjectId}::${st.teacherId}` : null;
    });
    const v2SubjectTeacherSet = linkSet(v2SubjectTeachers, (st) => `${st.subjectId}::${st.teacherId}`);
    for (const key of missingFrom(v1SubjectTeacherSet, v2SubjectTeacherSet)) {
      linkDiffs.push({ entity: 'subjectTeacher', id: key, note: 'missing in V2' });
    }
    for (const key of missingFrom(v2SubjectTeacherSet, v1SubjectTeacherSet)) {
      linkDiffs.push({ entity: 'subjectTeacher', id: key, note: 'extra in V2' });
    }

    const v1TeacherClassSet = linkSet(v1TeacherClasses, (tc) => {
      return tc.teacherId && tc.classId ? `${tc.teacherId}::${tc.classId}` : null;
    });
    const v2TeacherClassSet = linkSet(v2TeacherClasses, (tc) => `${tc.teacherId}::${tc.classId}`);
    for (const key of missingFrom(v1TeacherClassSet, v2TeacherClassSet)) {
      linkDiffs.push({ entity: 'teacherClass', id: key, note: 'missing in V2' });
    }
    for (const key of missingFrom(v2TeacherClassSet, v1TeacherClassSet)) {
      linkDiffs.push({ entity: 'teacherClass', id: key, note: 'extra in V2' });
    }

    const v2SubjectsInExport = v2Subjects.filter((s) => v1SubjectByCode.has(s.code));
    const subjectCountsByGrade: Record<string, { v1: number; v2: number }> = {};
    for (const s of v1Subjects) {
      subjectCountsByGrade[s.grade] ??= { v1: 0, v2: 0 };
      subjectCountsByGrade[s.grade].v1++;
    }
    for (const s of v2SubjectsInExport) {
      subjectCountsByGrade[s.grade] ??= { v1: 0, v2: 0 };
      subjectCountsByGrade[s.grade].v2++;
    }

    const summary = {
      classes: {
        v1: v1Classes.length,
        v2: v2Classes.length,
        diffs: classDiffs.length,
      },
      subjects: {
        v1: v1Subjects.length,
        v2: STRICT_GLOBAL_SUBJECTS ? v2Subjects.length : v2SubjectsInExport.length,
        v2GlobalTotal: v2Subjects.length,
        diffs: subjectDiffs.length,
      },
      subjectTeachers: {
        v1: v1SubjectTeacherSet.size,
        v2: v2SubjectTeacherSet.size,
        diffs: linkDiffs.filter((d) => d.entity === 'subjectTeacher').length,
      },
      teacherClasses: {
        v1: v1TeacherClassSet.size,
        v2: v2TeacherClassSet.size,
        diffs: linkDiffs.filter((d) => d.entity === 'teacherClass').length,
      },
      subjectCountsByGrade,
    };

    console.log('');
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│  V1 vs V2 classes/subjects structure diff               │');
    console.log('└─────────────────────────────────────────────────────────┘');
    console.log('');
    console.log(`  School     : ${school.name} (${school.id})`);
    console.log(`  IMPORT_DIR : ${IMPORT_DIR}`);
    console.log(`  Class AY   : ${IGNORE_CLASS_ACADEMIC_YEAR ? 'ignored' : 'strict'}`);
    console.log(`  Subjects   : ${STRICT_GLOBAL_SUBJECTS ? 'strict global table' : 'SchoolManagementApp subject codes only'}`);
    console.log('');
    console.log(`  Classes          V1: ${String(summary.classes.v1).padStart(4)} | V2: ${String(summary.classes.v2).padStart(4)} | diffs: ${summary.classes.diffs}`);
    console.log(`  Subjects         V1: ${String(summary.subjects.v1).padStart(4)} | V2: ${String(summary.subjects.v2).padStart(4)} | diffs: ${summary.subjects.diffs}${STRICT_GLOBAL_SUBJECTS ? '' : ` | global total: ${summary.subjects.v2GlobalTotal}`}`);
    console.log(`  SubjectTeachers  V1: ${String(summary.subjectTeachers.v1).padStart(4)} | V2: ${String(summary.subjectTeachers.v2).padStart(4)} | diffs: ${summary.subjectTeachers.diffs}`);
    console.log(`  TeacherClasses   V1: ${String(summary.teacherClasses.v1).padStart(4)} | V2: ${String(summary.teacherClasses.v2).padStart(4)} | diffs: ${summary.teacherClasses.diffs}`);
    console.log('');
    console.log('  Subjects by grade:');
    for (const grade of Object.keys(subjectCountsByGrade).sort((a, b) => Number(a) - Number(b))) {
      const counts = subjectCountsByGrade[grade];
      console.log(`    Grade ${grade.padStart(2)}  V1: ${String(counts.v1).padStart(3)} | V2: ${String(counts.v2).padStart(3)}`);
    }

    printDiffSamples('Class diffs', classDiffs);
    printDiffSamples('Subject diffs', subjectDiffs);
    printDiffSamples('Link diffs', linkDiffs);

    const allDiffs = [...classDiffs, ...subjectDiffs, ...linkDiffs];
    console.log('');
    if (allDiffs.length === 0) {
      console.log('  ✅ Classes, subjects, and teacher assignment links match.');
    } else {
      console.log(`  ❌ Found ${allDiffs.length} structural diff(s).`);
    }
    console.log('');

    if (OUTPUT_JSON) {
      fs.writeFileSync(
        OUTPUT_JSON,
        JSON.stringify(
          {
            schoolId: SCHOOL_ID,
            importDir: IMPORT_DIR,
            generatedAt: new Date().toISOString(),
            summary,
            diffs: allDiffs,
          },
          null,
          2,
        ),
      );
      console.log(`  JSON report written: ${OUTPUT_JSON}`);
      console.log('');
    }

    process.exit(allDiffs.length === 0 ? 0 : 2);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
