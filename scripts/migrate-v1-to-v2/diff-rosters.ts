/**
 * Per-class roster diff: V1 export (students.json + classes.json) vs V2 StudentClass.
 *
 * Join key: Student PK is preserved by import (V1 id === V2 id).
 *
 * Usage:
 *   IMPORT_DIR=scripts/migrate-v1-to-v2/data/export-... \
 *   SCHOOL_ID=<v2-school-cuid> \
 *   npx tsx scripts/migrate-v1-to-v2/diff-rosters.ts
 *
 * Optional:
 *   ACADEMIC_YEAR_NAME=2025-2026   (limit to one year; omit to include all years in export)
 *   IGNORE_ACADEMIC_YEAR=true      (compare active class rosters by classId, matching the Students UI)
 *   OUTPUT_JSON=path/report.json    (write machine-readable report)
 */

import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const IMPORT_DIR = process.env.IMPORT_DIR || path.join(__dirname, 'data', 'export-latest');
const SCHOOL_ID = process.env.SCHOOL_ID;
const ACADEMIC_YEAR_NAME = process.env.ACADEMIC_YEAR_NAME?.trim();
const IGNORE_ACADEMIC_YEAR = process.env.IGNORE_ACADEMIC_YEAR === 'true';
const OUTPUT_JSON = process.env.OUTPUT_JSON;

interface V1Student {
  id: string;
  classId: string | null;
  studentId?: string | null;
  firstName?: string;
  lastName?: string;
}

interface V1Class {
  id: string;
  name: string;
  grade: string;
  section?: string | null;
  academicYear?: string;
}

function loadJson<T>(file: string): T | null {
  const p = path.join(IMPORT_DIR, file);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

async function main() {
  if (!SCHOOL_ID) {
    console.error('❌  SCHOOL_ID is required (target V2 school).');
    process.exit(1);
  }
  if (!fs.existsSync(IMPORT_DIR)) {
    console.error(`❌  IMPORT_DIR not found: ${IMPORT_DIR}`);
    process.exit(1);
  }

  const students = loadJson<V1Student[]>('students.json') || [];
  const classes = loadJson<V1Class[]>('classes.json') || [];
  const classById = new Map(classes.map((c) => [c.id, c]));

  const prisma = new PrismaClient({ log: ['error', 'warn'] });

  try {
    const school = await prisma.school.findUnique({ where: { id: SCHOOL_ID } });
    if (!school) {
      console.error(`❌  School not found: ${SCHOOL_ID}`);
      process.exit(1);
    }

    const ayRows = await prisma.academicYear.findMany({
      where: { schoolId: SCHOOL_ID },
      select: { id: true, name: true },
    });
    const ayByName = new Map(ayRows.map((a) => [a.name, a.id]));

    type ClassReport = {
      v1ClassId: string;
      className: string;
      grade: string;
      academicYear: string;
      v2AcademicYearId: string | null;
      v1Count: number;
      v2ActiveCount: number;
      missingInV2: string[];
      extraInV2: string[];
      matched: number;
    };

    const reports: ClassReport[] = [];
    let totalMissing = 0;
    let totalExtra = 0;

    // Group V1 students by classId
    const v1ByClass = new Map<string, Set<string>>();
    for (const s of students) {
      if (!s.classId) continue;
      if (!v1ByClass.has(s.classId)) v1ByClass.set(s.classId, new Set());
      v1ByClass.get(s.classId)!.add(s.id);
    }

    const classIdsToProcess = [...new Set([...v1ByClass.keys(), ...classes.map((c) => c.id)])];

    for (const classId of classIdsToProcess) {
      const cls = classById.get(classId);
      const yearName = cls?.academicYear || '2024-2025';
      if (ACADEMIC_YEAR_NAME && yearName !== ACADEMIC_YEAR_NAME) continue;

      const ayId = ayByName.get(yearName) ?? null;
      const v1Set = v1ByClass.get(classId) ?? new Set<string>();

      let v2Ids = new Set<string>();
      if (IGNORE_ACADEMIC_YEAR) {
        const scRows = await prisma.studentClass.findMany({
          where: {
            classId,
            status: 'ACTIVE',
            student: { schoolId: SCHOOL_ID },
          },
          select: { studentId: true },
        });
        v2Ids = new Set(scRows.map((r) => r.studentId));
      } else if (ayId) {
        const scRows = await prisma.studentClass.findMany({
          where: {
            classId,
            academicYearId: ayId,
            status: 'ACTIVE',
            student: { schoolId: SCHOOL_ID },
          },
          select: { studentId: true },
        });
        v2Ids = new Set(scRows.map((r) => r.studentId));
      }

      const missingInV2 = [...v1Set].filter((id) => !v2Ids.has(id)).sort();
      const extraInV2 = [...v2Ids].filter((id) => !v1Set.has(id)).sort();

      totalMissing += missingInV2.length;
      totalExtra += extraInV2.length;

      reports.push({
        v1ClassId: classId,
        className: cls?.name ?? '(unknown)',
        grade: cls?.grade ?? '?',
        academicYear: yearName,
        v2AcademicYearId: ayId,
        v1Count: v1Set.size,
        v2ActiveCount: v2Ids.size,
        missingInV2,
        extraInV2,
        matched: [...v1Set].filter((id) => v2Ids.has(id)).length,
      });
    }

    // Sort: classes with mismatches first
    reports.sort((a, b) => {
      const da = a.missingInV2.length + a.extraInV2.length;
      const db = b.missingInV2.length + b.extraInV2.length;
      if (db !== da) return db - da;
      return a.className.localeCompare(b.className);
    });

    console.log('');
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│  V1 vs V2 per-class roster diff                         │');
    console.log('└─────────────────────────────────────────────────────────┘');
    console.log('');
    console.log(`  School       : ${school.name} (${SCHOOL_ID})`);
    console.log(`  IMPORT_DIR   : ${IMPORT_DIR}`);
    console.log(`  Year filter  : ${ACADEMIC_YEAR_NAME || '(all years in export)'}`);
    console.log(`  Compare mode : ${IGNORE_ACADEMIC_YEAR ? 'class roster (ignore StudentClass.academicYearId)' : 'strict academic year'}`);
    console.log('');

    let mismatchClasses = 0;
    for (const r of reports) {
      const diff = r.missingInV2.length + r.extraInV2.length;
      if (diff === 0 && r.v1Count === 0 && r.v2ActiveCount === 0) continue;
      if (!IGNORE_ACADEMIC_YEAR && !r.v2AcademicYearId && r.v1Count > 0) {
        console.log(`  ⚠️  ${r.className} [${r.v1ClassId}] — AcademicYear "${r.academicYear}" not in V2 for this school`);
        mismatchClasses++;
        continue;
      }
      if (diff > 0) mismatchClasses++;
      const status = diff === 0 ? '✅' : '❌';
      console.log(`  ${status} ${r.className} (${r.grade}) [${r.academicYear}]`);
      console.log(`     V1 roster: ${r.v1Count}  |  V2 ACTIVE StudentClass: ${r.v2ActiveCount}  |  matched: ${r.matched}`);
      if (r.missingInV2.length) {
        console.log(`     Missing in V2 (${r.missingInV2.length}): ${r.missingInV2.slice(0, 8).join(', ')}${r.missingInV2.length > 8 ? ' …' : ''}`);
      }
      if (r.extraInV2.length) {
        console.log(`     Extra in V2 (${r.extraInV2.length}):   ${r.extraInV2.slice(0, 8).join(', ')}${r.extraInV2.length > 8 ? ' …' : ''}`);
      }
      console.log('');
    }

    console.log('────────────────────────────────────────────────────────────');
    console.log(`  Classes with mismatches or missing AY: ${mismatchClasses}`);
    console.log(`  Total students missing in V2 (set):   ${totalMissing}`);
    console.log(`  Total students extra in V2 (set):     ${totalExtra}`);
    console.log('');

    if (OUTPUT_JSON) {
      fs.writeFileSync(
        OUTPUT_JSON,
        JSON.stringify(
          {
            schoolId: SCHOOL_ID,
            importDir: IMPORT_DIR,
            academicYearFilter: ACADEMIC_YEAR_NAME ?? null,
            ignoreAcademicYear: IGNORE_ACADEMIC_YEAR,
            generatedAt: new Date().toISOString(),
            summary: {
              mismatchClasses,
              totalMissingStudentSlots: totalMissing,
              totalExtraStudentSlots: totalExtra,
            },
            classes: reports,
          },
          null,
          2
        ),
        'utf8'
      );
      console.log(`  Wrote ${OUTPUT_JSON}`);
    }

    process.exit(mismatchClasses > 0 || totalMissing > 0 || totalExtra > 0 ? 2 : 0);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
