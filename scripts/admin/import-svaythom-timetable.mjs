import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

for (const envPath of ['.env', 'packages/database/.env']) {
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] ||= value;
  }
}

const APPLY = process.argv.includes('--apply');
const PREPARED_PATH = new URL('./data/svaythom-timetable-2025-2026.prepared.json', import.meta.url);
const RESULT_PATH = new URL('./data/svaythom-timetable-2025-2026.import-result.json', import.meta.url);
const prepared = JSON.parse(fs.readFileSync(PREPARED_PATH, 'utf8'));

function gradeFromClassCode(classCode) {
  return classCode?.match(/^\d{1,2}/)?.[0] || null;
}

function subjectIdForEntry(entry, subjectByCode) {
  if (entry.subjectId) return entry.subjectId;
  const grade = gradeFromClassCode(entry.source.classCode);
  if (!grade) return null;
  if (entry.source.pdfSubjectCode === 'K') return subjectByCode.get(`KHM-G${grade}`)?.id || null;
  if (entry.source.pdfSubjectCode === 'Ls') return subjectByCode.get(`LS-G${grade}`)?.id || null;
  return null;
}

function assertNoClassSlotDuplicates(entries) {
  const seen = new Set();
  const duplicates = [];
  for (const entry of entries) {
    const key = `${entry.classId}|${entry.dayOfWeek}|${entry.periodNumber}`;
    if (seen.has(key)) duplicates.push(entry.source);
    seen.add(key);
  }
  if (duplicates.length > 0) {
    throw new Error(`Prepared data has ${duplicates.length} duplicate class slots; refusing import.`);
  }
}

assertNoClassSlotDuplicates(prepared.entries);

const db = new PrismaClient();

try {
  const before = {
    periods: await db.period.count({ where: { schoolId: prepared.schoolId } }),
    timetableEntries: await db.timetableEntry.count({
      where: { schoolId: prepared.schoolId, academicYearId: prepared.academicYearId },
    }),
    targetSubjects: await db.subject.count({
      where: { code: { in: prepared.subjectsToCreate.map((subject) => subject.code) } },
    }),
  };

  if (!APPLY) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      before,
      wouldCreateOrUpdateSubjects: prepared.subjectsToCreate.map((subject) => subject.code),
      wouldReplacePeriodsWith: prepared.periods,
      wouldCreateTimetableEntries: prepared.entries.length,
      expectedSubjectlessAfterImport: prepared.entries.filter((entry) => !entry.subjectId && !['K', 'Ls'].includes(entry.source.pdfSubjectCode)).length,
      note: 'Run with --apply to write to the database.',
    }, null, 2));
    process.exit(0);
  }

  const result = await db.$transaction(async (tx) => {
    const deletedEntries = await tx.timetableEntry.deleteMany({
      where: { schoolId: prepared.schoolId, academicYearId: prepared.academicYearId },
    });

    const upsertedSubjects = [];
    for (const subject of prepared.subjectsToCreate) {
      const upserted = await tx.subject.upsert({
        where: { code: subject.code },
        update: {
          name: subject.name,
          nameKh: subject.nameKh,
          nameEn: subject.nameEn,
          grade: subject.grade,
          track: subject.track,
          category: subject.category,
          coefficient: subject.coefficient,
          weeklyHours: subject.weeklyHours,
          annualHours: subject.annualHours,
          isActive: subject.isActive,
        },
        create: {
          name: subject.name,
          nameKh: subject.nameKh,
          nameEn: subject.nameEn,
          code: subject.code,
          grade: subject.grade,
          track: subject.track,
          category: subject.category,
          coefficient: subject.coefficient,
          weeklyHours: subject.weeklyHours,
          annualHours: subject.annualHours,
          isActive: subject.isActive,
        },
        select: { id: true, code: true },
      });
      upsertedSubjects.push(upserted);
    }

    for (const period of prepared.periods) {
      await tx.period.upsert({
        where: { schoolId_order: { schoolId: prepared.schoolId, order: period.order } },
        update: {
          name: period.name,
          startTime: period.startTime,
          endTime: period.endTime,
          isBreak: period.isBreak,
          duration: period.duration,
        },
        create: {
          schoolId: prepared.schoolId,
          name: period.name,
          startTime: period.startTime,
          endTime: period.endTime,
          order: period.order,
          isBreak: period.isBreak,
          duration: period.duration,
        },
      });
    }

    const removedExtraPeriods = await tx.period.deleteMany({
      where: {
        schoolId: prepared.schoolId,
        order: { notIn: prepared.periods.map((period) => period.order) },
      },
    });

    const [periodRows, subjectRows] = await Promise.all([
      tx.period.findMany({
        where: { schoolId: prepared.schoolId },
        select: { id: true, order: true },
      }),
      tx.subject.findMany({
        where: { isActive: true },
        select: { id: true, code: true },
      }),
    ]);

    const periodIdByOrder = new Map(periodRows.map((period) => [period.order, period.id]));
    const subjectByCode = new Map(subjectRows.map((subject) => [subject.code, subject]));
    const rows = prepared.entries.map((entry) => {
      const periodId = periodIdByOrder.get(entry.periodNumber);
      if (!periodId) throw new Error(`Missing period id for order ${entry.periodNumber}`);
      return {
        schoolId: prepared.schoolId,
        classId: entry.classId,
        subjectId: subjectIdForEntry(entry, subjectByCode),
        teacherId: entry.teacherId,
        periodId,
        dayOfWeek: entry.dayOfWeek,
        room: null,
        academicYearId: prepared.academicYearId,
      };
    });

    const createdEntries = await tx.timetableEntry.createMany({ data: rows });

    return {
      deletedTimetableEntries: deletedEntries.count,
      upsertedSubjects,
      removedExtraPeriods: removedExtraPeriods.count,
      createdTimetableEntries: createdEntries.count,
      subjectlessCreatedEntries: rows.filter((row) => !row.subjectId).length,
    };
  }, { timeout: 120000 });

  const after = {
    periods: await db.period.findMany({
      where: { schoolId: prepared.schoolId },
      select: { order: true, name: true, startTime: true, endTime: true, isBreak: true, duration: true },
      orderBy: { order: 'asc' },
    }),
    timetableEntries: await db.timetableEntry.count({
      where: { schoolId: prepared.schoolId, academicYearId: prepared.academicYearId },
    }),
    subjectlessTimetableEntries: await db.timetableEntry.count({
      where: { schoolId: prepared.schoolId, academicYearId: prepared.academicYearId, subjectId: null },
    }),
    classSlotDuplicates: await db.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT "classId", "periodId", "dayOfWeek", "academicYearId", COUNT(*) AS n
        FROM timetable_entries
        WHERE "schoolId" = ${prepared.schoolId}
          AND "academicYearId" = ${prepared.academicYearId}
        GROUP BY "classId", "periodId", "dayOfWeek", "academicYearId"
        HAVING COUNT(*) > 1
      ) dupes
    `,
  };

  const payload = {
    importedAt: new Date().toISOString(),
    schoolId: prepared.schoolId,
    academicYearId: prepared.academicYearId,
    before,
    result,
    after,
    reviewFlags: {
      teacherConflicts: prepared.summary.teacherConflicts,
      pageHourMismatches: prepared.summary.pageHourMismatches.length,
      unresolvedSubjectPatterns: prepared.summary.unresolved,
      remainingSubjectlessEntries: after.subjectlessTimetableEntries,
    },
  };
  fs.writeFileSync(RESULT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify(payload, null, 2));
} finally {
  await db.$disconnect();
}
