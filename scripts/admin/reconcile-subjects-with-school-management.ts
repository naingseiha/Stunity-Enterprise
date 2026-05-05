/**
 * Reconcile Stunity subjects to the live SchoolManagementApp subject catalog.
 *
 * Default mode is dry-run:
 *   npx tsx scripts/admin/reconcile-subjects-with-school-management.ts
 *
 * Apply production changes:
 *   ALLOW_PRODUCTION_DB=1 APPLY=1 npx tsx scripts/admin/reconcile-subjects-with-school-management.ts
 *
 * The script keeps every subject code in the V1 SchoolManagementApp export,
 * moves duplicate/old references onto those official rows, backs up affected
 * rows, and deletes obsolete subject rows so active subject filters match V1.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { config } from 'dotenv';
import { Prisma, PrismaClient } from '@prisma/client';
import { runDbSafetyCheck } from '../db-safety-check';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), 'packages/database/.env') });

const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true';
const EXPORT_PATH = resolve(process.cwd(), 'scripts/migrate-v1-to-v2/data/export-2026-05-04T16-45-48/subjects.json');
const BACKUP_PATH =
  process.env.BACKUP_PATH ||
  resolve(process.cwd(), `scripts/admin/data/subject-reconcile-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);

const prisma = new PrismaClient({ log: ['error', 'warn'] });

type OfficialSubject = {
  code: string;
  grade: string;
  track: string | null;
};

type SubjectRow = {
  id: string;
  code: string;
  nameKh: string;
  grade: string;
  track: string | null;
};

const BASE_CODE_MAP: Record<string, string> = {
  AGR: 'AGRI',
  CIV: 'MORAL',
  CS: 'ICT',
  KH: 'KHM',
  PE: 'SPORTS',
};

function baseCode(code: string): string {
  return code.split('-')[0]?.toUpperCase() || code.toUpperCase();
}

function officialBaseFor(code: string): string {
  return BASE_CODE_MAP[baseCode(code)] || baseCode(code);
}

function normalizedTrack(track?: string | null): 'SCIENCE' | 'SOCIAL' | null {
  const value = (track || '').toLowerCase();
  if (value.includes('science')) return 'SCIENCE';
  if (value.includes('social')) return 'SOCIAL';
  return null;
}

function targetCodesForSubject(subject: SubjectRow, officialCodes: Set<string>): string[] {
  const base = officialBaseFor(subject.code);
  const grade = subject.grade;

  const direct = `${base}-G${grade}`;
  if (officialCodes.has(direct)) return [direct];

  const science = `${base}-G${grade}-SCIENCE`;
  const social = `${base}-G${grade}-SOCIAL`;
  return [science, social].filter((code) => officialCodes.has(code));
}

function targetCodeForClass(subject: SubjectRow, classTrack: string | null, officialCodes: Set<string>): string | null {
  const candidates = targetCodesForSubject(subject, officialCodes);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0]!;

  const track = normalizedTrack(classTrack);
  if (track) {
    const tracked = candidates.find((code) => code.endsWith(`-${track}`));
    if (tracked) return tracked;
  }

  // Current Svay Thom grade 11/12 generic demo rows are attached to Science/Exam Prep classes.
  return candidates.find((code) => code.endsWith('-SCIENCE')) || candidates[0]!;
}

function loadOfficialCodes(): Set<string> {
  const rows = JSON.parse(readFileSync(EXPORT_PATH, 'utf8')) as OfficialSubject[];
  return new Set(rows.map((row) => row.code));
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function groupIdsByTarget<T extends { id: string }>(items: T[], getTargetId: (item: T) => string | null): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const item of items) {
    const targetId = getTargetId(item) || 'NULL';
    const group = groups.get(targetId) || [];
    group.push(item.id);
    groups.set(targetId, group);
  }
  return groups;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
  if (APPLY) runDbSafetyCheck();

  const officialCodes = loadOfficialCodes();
  const subjects = await prisma.subject.findMany({
    select: {
      id: true,
      code: true,
      nameKh: true,
      grade: true,
      track: true,
      _count: {
        select: {
          grades: true,
          subjectTeachers: true,
          teacherSubjectAssignments: true,
          timetableEntries: true,
        },
      },
    },
    orderBy: [{ grade: 'asc' }, { code: 'asc' }],
  });

  const obsoleteSubjects = subjects.filter((subject) => !officialCodes.has(subject.code));
  const officialByCode = new Map(
    await prisma.subject
      .findMany({
        where: { code: { in: [...officialCodes] } },
        select: { id: true, code: true },
      })
      .then((rows) => rows.map((row) => [row.code, row] as const))
  );

  const affectedIds = obsoleteSubjects.map((subject) => subject.id);
  const [grades, subjectTeachers, teacherSubjectAssignments, timetableEntries, gradeConfirmations, conflictExceptions] =
    affectedIds.length
      ? await Promise.all([
          prisma.grade.findMany({
            where: { subjectId: { in: affectedIds } },
            select: { id: true, subjectId: true, studentId: true, classId: true, month: true, year: true, score: true, maxScore: true },
          }),
          prisma.subjectTeacher.findMany({ where: { subjectId: { in: affectedIds } } }),
          prisma.teacherSubjectAssignment.findMany({ where: { subjectId: { in: affectedIds } } }),
          prisma.timetableEntry.findMany({
            where: { subjectId: { in: affectedIds } },
            select: { id: true, subjectId: true, teacherId: true, classId: true, class: { select: { track: true, grade: true, name: true } } },
          }),
          prisma.gradeConfirmation.findMany({ where: { subjectId: { in: affectedIds } } }),
          prisma.timetableConflictException.findMany({ where: { subjectId: { in: affectedIds } } }),
        ])
      : [[], [], [], [], [], []];

  const obsoleteById = new Map(obsoleteSubjects.map((subject) => [subject.id, subject]));

  const remapBySubject = obsoleteSubjects.map((subject) => ({
    subject,
    targetCodes: targetCodesForSubject(subject, officialCodes),
  }));

  const classIds = [
    ...new Set([
      ...grades.map((grade) => grade.classId),
      ...timetableEntries.map((entry) => entry.classId),
    ]),
  ];
  const classById = new Map(
    await prisma.class
      .findMany({ where: { id: { in: classIds } }, select: { id: true, track: true } })
      .then((rows) => rows.map((row) => [row.id, row] as const))
  );

  const gradeMoves: Array<{ gradeId: string; fromCode: string; toCode: string | null }> = [];
  const timetableMoves: Array<{ entryId: string; fromCode: string; toCode: string | null }> = [];

  for (const grade of grades) {
    const subject = obsoleteById.get(grade.subjectId);
    if (!subject) continue;
    const classInfo = classById.get(grade.classId);
    gradeMoves.push({
      gradeId: grade.id,
      fromCode: subject.code,
      toCode: targetCodeForClass(subject, classInfo?.track || null, officialCodes),
    });
  }

  for (const entry of timetableEntries) {
    const subject = obsoleteById.get(entry.subjectId || '');
    if (!subject) continue;
    timetableMoves.push({
      entryId: entry.id,
      fromCode: subject.code,
      toCode: targetCodeForClass(subject, entry.class?.track || null, officialCodes),
    });
  }

  const gradeById = new Map(grades.map((grade) => [grade.id, grade]));
  const targetSubjectIds = [
    ...new Set(gradeMoves.map((move) => (move.toCode ? officialByCode.get(move.toCode)?.id : null)).filter(Boolean) as string[]),
  ];
  const possibleTargetGrades = await prisma.grade.findMany({
    where: {
      subjectId: { in: targetSubjectIds },
      classId: { in: [...new Set(grades.map((grade) => grade.classId))] },
      studentId: { in: [...new Set(grades.map((grade) => grade.studentId))] },
    },
    select: { id: true, studentId: true, subjectId: true, classId: true, month: true, year: true },
  });
  const possibleTargetGradeKeys = new Set(
    possibleTargetGrades.map((grade) => `${grade.studentId}|${grade.subjectId}|${grade.classId}|${grade.month || ''}|${grade.year || ''}`)
  );
  const collidingGrades = gradeMoves
    .filter((move): move is { gradeId: string; fromCode: string; toCode: string } => Boolean(move.toCode))
    .filter((move) => {
      const grade = gradeById.get(move.gradeId);
      const target = officialByCode.get(move.toCode);
      if (!grade || !target) return false;
      return possibleTargetGradeKeys.has(`${grade.studentId}|${target.id}|${grade.classId}|${grade.month || ''}|${grade.year || ''}`);
    });

  const summary = {
    mode: APPLY ? 'apply' : 'dry-run',
    officialSubjects: officialCodes.size,
    currentSubjects: subjects.length,
    obsoleteSubjects: obsoleteSubjects.length,
    obsoleteWithGrades: obsoleteSubjects.filter((subject) => subject._count.grades > 0).length,
    gradeRowsToMove: gradeMoves.filter((move) => move.toCode).length,
    gradeRowsWithoutOfficialTarget: gradeMoves.filter((move) => !move.toCode).length,
    timetableEntriesToMove: timetableMoves.filter((move) => move.toCode).length,
    timetableEntriesToClear: timetableMoves.filter((move) => !move.toCode).length,
    subjectTeacherRows: subjectTeachers.length,
    teacherSubjectAssignmentRows: teacherSubjectAssignments.length,
    gradeConfirmations: gradeConfirmations.length,
    conflictExceptions: conflictExceptions.length,
    collidingGrades: collidingGrades.length,
  };

  console.log(JSON.stringify({ summary, remapBySubject: remapBySubject.map(({ subject, targetCodes }) => ({ code: subject.code, nameKh: subject.nameKh, grade: subject.grade, track: subject.track, refs: subject._count, targetCodes })) }, null, 2));

  if (collidingGrades.length > 0) {
    console.log(JSON.stringify({ collidingGrades }, null, 2));
    throw new Error('Refusing to apply because grade rows would collide with existing official grades.');
  }

  if (!APPLY) {
    console.log('\nDry run only. Set APPLY=1 and ALLOW_PRODUCTION_DB=1 to write changes.');
    return;
  }

  mkdirSync(dirname(BACKUP_PATH), { recursive: true });
  writeFileSync(
    BACKUP_PATH,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        summary,
        subjects: obsoleteSubjects,
        grades,
        subjectTeachers,
        teacherSubjectAssignments,
        timetableEntries,
        gradeConfirmations,
        conflictExceptions,
      },
      null,
      2
    )
  );

  const gradeMoveById = new Map(gradeMoves.map((move) => [move.gradeId, move]));
  const timetableMoveById = new Map(timetableMoves.map((move) => [move.entryId, move]));

  const subjectTeacherCreates = uniqueBy(
    subjectTeachers.flatMap((assignment) => {
      const subject = obsoleteById.get(assignment.subjectId);
      if (!subject) return [];
      return targetCodesForSubject(subject, officialCodes)
        .map((code) => officialByCode.get(code))
        .filter(Boolean)
        .map((target) => ({ subjectId: target!.id, teacherId: assignment.teacherId }));
    }),
    (row) => `${row.subjectId}|${row.teacherId}`
  );

  const teacherSubjectAssignmentCreates = uniqueBy(
    teacherSubjectAssignments.flatMap((assignment) => {
      const subject = obsoleteById.get(assignment.subjectId);
      if (!subject) return [];
      return targetCodesForSubject(subject, officialCodes)
        .map((code) => officialByCode.get(code))
        .filter(Boolean)
        .map((target) => ({
          teacherId: assignment.teacherId,
          subjectId: target!.id,
          isPrimary: assignment.isPrimary,
          maxPeriodsPerWeek: assignment.maxPeriodsPerWeek,
          preferredGrades: assignment.preferredGrades,
          isActive: assignment.isActive,
        }));
    }),
    (row) => `${row.teacherId}|${row.subjectId}`
  );

  await prisma.$transaction(
    async (tx) => {
      const gradeGroups = groupIdsByTarget(grades, (grade) => {
        const move = gradeMoveById.get(grade.id);
        return move?.toCode ? officialByCode.get(move.toCode)?.id || null : null;
      });
      for (const [targetId, ids] of gradeGroups) {
        if (targetId === 'NULL') {
          await tx.grade.deleteMany({ where: { id: { in: ids } } });
        } else {
          await tx.grade.updateMany({ where: { id: { in: ids } }, data: { subjectId: targetId } });
        }
      }

      const timetableGroups = groupIdsByTarget(timetableEntries, (entry) => {
        const move = timetableMoveById.get(entry.id);
        return move?.toCode ? officialByCode.get(move.toCode)?.id || null : null;
      });
      for (const [targetId, ids] of timetableGroups) {
        await tx.timetableEntry.updateMany({
          where: { id: { in: ids } },
          data: { subjectId: targetId === 'NULL' ? null : targetId },
        });
      }

      if (subjectTeacherCreates.length > 0) {
        await tx.subjectTeacher.createMany({
          data: subjectTeacherCreates,
          skipDuplicates: true,
        });
      }

      if (teacherSubjectAssignmentCreates.length > 0) {
        await tx.teacherSubjectAssignment.createMany({
          data: teacherSubjectAssignmentCreates,
          skipDuplicates: true,
        });
      }

      if (subjectTeachers.length > 0) {
        await tx.subjectTeacher.deleteMany({ where: { subjectId: { in: affectedIds } } });
      }

      if (teacherSubjectAssignments.length > 0) {
        await tx.teacherSubjectAssignment.deleteMany({ where: { subjectId: { in: affectedIds } } });
      }

      for (const confirmation of gradeConfirmations) {
        const subject = obsoleteById.get(confirmation.subjectId);
        if (!subject) continue;
        const targetCode = targetCodeForClass(subject, null, officialCodes);
        const target = targetCode ? officialByCode.get(targetCode) : null;
        if (target) {
          await tx.gradeConfirmation
            .update({
              where: { id: confirmation.id },
              data: { subjectId: target.id },
            })
            .catch(async (error) => {
              if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                await tx.gradeConfirmation.delete({ where: { id: confirmation.id } });
                return;
              }
              throw error;
            });
        } else {
          await tx.gradeConfirmation.delete({ where: { id: confirmation.id } });
        }
      }

      for (const exception of conflictExceptions) {
        const subject = exception.subjectId ? obsoleteById.get(exception.subjectId) : null;
        if (!subject) continue;
        const targetCode = targetCodeForClass(subject, null, officialCodes);
        const target = targetCode ? officialByCode.get(targetCode) : null;
        await tx.timetableConflictException.update({
          where: { id: exception.id },
          data: { subjectId: target?.id || null },
        });
      }

      for (const ids of [
        await tx.grade.findMany({ where: { subjectId: { in: affectedIds } }, select: { id: true } }),
        await tx.timetableEntry.findMany({ where: { subjectId: { in: affectedIds } }, select: { id: true } }),
      ]) {
        if (ids.length > 0) {
          throw new Error(`Refusing to delete subjects; ${ids.length} references still point at obsolete subject ids.`);
        }
      }

      await tx.subject.deleteMany({ where: { id: { in: affectedIds } } });
    },
    { timeout: 300_000 }
  );

  console.log(`\nApplied subject reconciliation. Backup written to ${BACKUP_PATH}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
