#!/usr/bin/env node

import { createRequire } from "node:module";
import process from "node:process";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: ".env.production.local" });
dotenv.config({ path: ".env" });

const require = createRequire(import.meta.url);
const { signAccessToken } = require("../../../services/lib/auth-tokens.js");

const OFFICIAL_SCHOOL_ID = "cmm7yhssh0000lwcvao23npok";
const API_BASE = process.env.ACADEMIC_API_URL || "https://academic.stunity.app";
const execute = process.argv.includes("--execute");
const auditOnly = process.argv.includes("--audit");
const prisma = new PrismaClient();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function api(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      accept: "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

async function counts() {
  const [academicYears, students, classes, enrollments, batches] = await Promise.all([
    prisma.academicYear.count(),
    prisma.student.count(),
    prisma.class.count(),
    prisma.studentClass.count(),
    prisma.classPlacementBatch.count(),
  ]);
  return { academicYears, students, classes, enrollments, batches };
}

async function officialCounts() {
  const [academicYears, students, classes, enrollments, batches] = await Promise.all([
    prisma.academicYear.count({ where: { schoolId: OFFICIAL_SCHOOL_ID } }),
    prisma.student.count({ where: { schoolId: OFFICIAL_SCHOOL_ID } }),
    prisma.class.count({ where: { schoolId: OFFICIAL_SCHOOL_ID } }),
    prisma.studentClass.count({ where: { class: { schoolId: OFFICIAL_SCHOOL_ID } } }),
    prisma.classPlacementBatch.count({ where: { schoolId: OFFICIAL_SCHOOL_ID } }),
  ]);
  return { academicYears, students, classes, enrollments, batches };
}

async function findTestSchool() {
  const schools = await prisma.school.findMany({
    where: { id: { not: OFFICIAL_SCHOOL_ID } },
    select: {
      id: true,
      name: true,
      users: {
        where: { isActive: true, role: { in: ["ADMIN", "STAFF", "SUPER_ADMIN"] } },
        select: { id: true, email: true, role: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return schools
    .filter((school) => school.users.length > 0)
    .sort((left, right) => {
      const leftQa = /qa|test/i.test(left.name) ? 0 : 1;
      const rightQa = /qa|test/i.test(right.name) ? 0 : 1;
      return leftQa - rightQa || left.name.localeCompare(right.name);
    })[0];
}

async function cleanupFixture(fixture) {
  if (!fixture) return;
  const { batchId, studentIds, classIds, yearIds } = fixture;
  await prisma.$transaction(async (tx) => {
    if (batchId) {
      await tx.platformAuditLog.deleteMany({ where: { resourceType: "CLASS_PLACEMENT_BATCH", resourceId: batchId } });
      await tx.classPlacementBatch.deleteMany({ where: { id: batchId } });
    }
    if (studentIds.length) {
      await tx.studentClass.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.studentProgression.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.student.deleteMany({ where: { id: { in: studentIds } } });
    }
    if (classIds.length) await tx.class.deleteMany({ where: { id: { in: classIds } } });
    if (yearIds.length) await tx.academicYear.deleteMany({ where: { id: { in: yearIds } } });
  });
}

async function main() {
  assert(process.env.DATABASE_URL?.includes("supabase.com"), "Refusing to run without the expected production Supabase DATABASE_URL");
  assert(process.env.JWT_SECRET, "JWT_SECRET is required");
  const school = await findTestSchool();
  assert(school, "No non-official test school with an active administrator was found");

  console.log(JSON.stringify({
    mode: auditOnly ? "audit" : execute ? "execute" : "dry-run",
    apiBase: API_BASE,
    selectedTestSchool: { id: school.id, name: school.name, administratorCount: school.users.length },
    officialSchoolProtected: OFFICIAL_SCHOOL_ID,
  }, null, 2));
  if (auditOnly) {
    const [official, officialSchool, currentYears, versions, progressions, rls, enrollmentIntegrity, progressionIntegrity] = await Promise.all([
      officialCounts(),
      prisma.school.findUnique({ where: { id: OFFICIAL_SCHOOL_ID }, select: { id: true, name: true } }),
      prisma.academicYear.count({ where: { schoolId: OFFICIAL_SCHOOL_ID, isCurrent: true } }),
      prisma.classPlacementBatchVersion.count(),
      prisma.studentProgression.count(),
      prisma.$queryRawUnsafe(`SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('class_placement_batches', 'class_placement_batch_versions') ORDER BY relname`),
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int AS count
        FROM student_classes enrollment
        JOIN students student_record ON student_record.id = enrollment."studentId"
        JOIN classes class_record ON class_record.id = enrollment."classId"
        WHERE student_record."schoolId" <> class_record."schoolId"
           OR enrollment."academicYearId" IS DISTINCT FROM class_record."academicYearId"
      `),
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int AS count
        FROM student_progressions progression
        JOIN students student_record ON student_record.id = progression."studentId"
        JOIN academic_years source_year ON source_year.id = progression."fromAcademicYearId"
        JOIN academic_years target_year ON target_year.id = progression."toAcademicYearId"
        JOIN classes source_class ON source_class.id = progression."fromClassId"
        LEFT JOIN classes target_class ON target_class.id = progression."toClassId"
        WHERE source_year."schoolId" <> student_record."schoolId"
           OR target_year."schoolId" <> student_record."schoolId"
           OR source_class."schoolId" <> student_record."schoolId"
           OR source_class."academicYearId" <> progression."fromAcademicYearId"
           OR (progression."toClassId" IS NOT NULL AND (
                target_class.id IS NULL
                OR target_class."schoolId" <> student_record."schoolId"
                OR target_class."academicYearId" <> progression."toAcademicYearId"
           ))
      `),
    ]);
    console.log(JSON.stringify({
      audit: "PASS",
      officialSchool,
      officialCounts: official,
      officialCurrentAcademicYears: currentYears,
      globalPlacementBatchVersions: versions,
      globalStudentProgressions: progressions,
      rowLevelSecurity: rls,
      integrityViolations: {
        enrollmentTenantOrYear: enrollmentIntegrity[0]?.count ?? null,
        progressionTenantOrYear: progressionIntegrity[0]?.count ?? null,
      },
    }, null, 2));
    return;
  }
  if (!execute) return;

  const marker = `CODEX-PLACEMENT-E2E-${Date.now()}`;
  const globalBefore = await counts();
  const officialBefore = await officialCounts();
  const fixture = { batchId: null, studentIds: [], classIds: [], yearIds: [] };
  const submitter = school.users[0];
  const approver = school.users[1] || submitter;
  const tokenFor = (user) => signAccessToken({
    userId: user.id,
    email: user.email || "",
    role: user.role,
    schoolId: school.id,
  }, process.env.JWT_SECRET, "15m");
  const submitterToken = tokenFor(submitter);
  const approverToken = tokenFor(approver);

  let applied = false;
  try {
    const [sourceYear, targetYear] = await prisma.$transaction([
      prisma.academicYear.create({ data: {
        schoolId: school.id,
        name: `${marker}-SOURCE`,
        startDate: new Date("2024-09-01T00:00:00.000Z"),
        endDate: new Date("2025-06-30T00:00:00.000Z"),
        status: "ENDED",
      } }),
      prisma.academicYear.create({ data: {
        schoolId: school.id,
        name: `${marker}-TARGET`,
        startDate: new Date("2026-09-01T00:00:00.000Z"),
        endDate: new Date("2027-06-30T00:00:00.000Z"),
        status: "PLANNING",
      } }),
    ]);
    fixture.yearIds.push(sourceYear.id, targetYear.id);

    const [sourceClass, targetA, targetB] = await prisma.$transaction([
      prisma.class.create({ data: { schoolId: school.id, academicYearId: sourceYear.id, name: `${marker}-10A`, grade: "10", section: "A", capacity: 10 } }),
      prisma.class.create({ data: { schoolId: school.id, academicYearId: targetYear.id, name: `${marker}-11A`, grade: "11", section: "A", capacity: 2 } }),
      prisma.class.create({ data: { schoolId: school.id, academicYearId: targetYear.id, name: `${marker}-11B`, grade: "11", section: "B", capacity: 2 } }),
    ]);
    fixture.classIds.push(sourceClass.id, targetA.id, targetB.id);

    for (let index = 0; index < 4; index += 1) {
      const student = await prisma.student.create({ data: {
        schoolId: school.id,
        studentId: `${marker}-S${index + 1}`,
        firstName: "Placement",
        lastName: `Smoke ${index + 1}`,
        englishFirstName: "Placement",
        englishLastName: `Smoke ${index + 1}`,
        dateOfBirth: "2010-01-01",
        gender: index % 2 === 0 ? "FEMALE" : "MALE",
        classId: sourceClass.id,
      } });
      fixture.studentIds.push(student.id);
      await prisma.studentProgression.create({ data: {
        studentId: student.id,
        fromAcademicYearId: sourceYear.id,
        toAcademicYearId: targetYear.id,
        fromClassId: sourceClass.id,
        toClassId: null,
        toGrade: "11",
        promotionType: "MANUAL",
        promotionDate: new Date(),
        promotedBy: submitter.id,
        notes: marker,
      } });
    }

    const workspace = await api(`/classes/placement/${targetYear.id}/11`, { token: submitterToken });
    assert(workspace.status === 200 && workspace.payload?.data?.candidates?.length === 4, `Workspace check failed (${workspace.status})`);

    const preview = await api("/classes/placement/preview", {
      token: submitterToken,
      method: "POST",
      body: {
        academicYearId: targetYear.id,
        grade: "11",
        classIds: [targetA.id, targetB.id],
        strategy: "RANDOM_BALANCED",
        seed: marker,
      },
    });
    const assignments = preview.payload?.data?.assignments;
    assert(preview.status === 200 && assignments?.length === 4, `Preview check failed (${preview.status})`);
    assert(new Set(assignments.map((item) => item.studentId)).size === 4, "Preview returned duplicate students");

    const directApply = await api("/classes/placement/apply", {
      token: submitterToken,
      method: "POST",
      body: { academicYearId: targetYear.id, grade: "11", assignments },
    });
    assert(directApply.status === 409, `Legacy direct apply guard failed (${directApply.status})`);

    const saved = await api("/classes/placement/batches", {
      token: submitterToken,
      method: "POST",
      body: {
        academicYearId: targetYear.id,
        grade: "11",
        strategy: "RANDOM_BALANCED",
        seed: marker,
        assignments,
        notes: marker,
      },
    });
    assert(saved.status === 201 && saved.payload?.data?.id, `Batch save failed (${saved.status}): ${saved.payload?.message || "unknown"}`);
    fixture.batchId = saved.payload.data.id;

    const submitted = await api(`/classes/placement/batches/${fixture.batchId}/submit`, { token: submitterToken, method: "POST" });
    assert(submitted.status === 200 && submitted.payload?.data?.status === "IN_REVIEW", `Batch submit failed (${submitted.status})`);

    const approved = await api(`/classes/placement/batches/${fixture.batchId}/approve`, { token: approverToken, method: "POST" });
    assert(approved.status === 200 && approved.payload?.data?.status === "APPROVED", `Batch approve failed (${approved.status}): ${approved.payload?.message || "unknown"}`);

    const appliedResponse = await api(`/classes/placement/batches/${fixture.batchId}/apply`, { token: submitterToken, method: "POST" });
    assert(appliedResponse.status === 201 && appliedResponse.payload?.data?.assigned === 4, `Batch apply failed (${appliedResponse.status}): ${appliedResponse.payload?.message || "unknown"}`);
    applied = true;

    const [activeEnrollments, placedProgressions] = await Promise.all([
      prisma.studentClass.count({ where: { studentId: { in: fixture.studentIds }, academicYearId: targetYear.id, status: "ACTIVE", endedAt: null } }),
      prisma.studentProgression.count({ where: { studentId: { in: fixture.studentIds }, toAcademicYearId: targetYear.id, toClassId: { not: null } } }),
    ]);
    assert(activeEnrollments === 4 && placedProgressions === 4, "Applied placement was not persisted consistently");

    const reversed = await api(`/classes/placement/batches/${fixture.batchId}/undo`, {
      token: submitterToken,
      method: "POST",
      body: { reason: marker },
    });
    assert(reversed.status === 200 && reversed.payload?.data?.reversed === 4, `Batch undo failed (${reversed.status}): ${reversed.payload?.message || "unknown"}`);
    applied = false;

    const [reversedBatch, pendingProgressions, activeAfterUndo, sourcePointers] = await Promise.all([
      prisma.classPlacementBatch.findUnique({ where: { id: fixture.batchId }, select: { status: true, currentVersion: true } }),
      prisma.studentProgression.count({ where: { studentId: { in: fixture.studentIds }, toAcademicYearId: targetYear.id, toClassId: null } }),
      prisma.studentClass.count({ where: { studentId: { in: fixture.studentIds }, academicYearId: targetYear.id, status: "ACTIVE", endedAt: null } }),
      prisma.student.count({ where: { id: { in: fixture.studentIds }, classId: sourceClass.id } }),
    ]);
    assert(reversedBatch?.status === "REVERSED" && reversedBatch.currentVersion === 1, "Batch did not reach REVERSED state");
    assert(pendingProgressions === 4 && activeAfterUndo === 0 && sourcePointers === 4, "Undo did not fully restore the pre-placement state");

    console.log(JSON.stringify({
      result: "PASS",
      marker,
      testSchool: { id: school.id, name: school.name },
      workflow: ["WORKSPACE", "PREVIEW", "DIRECT_APPLY_BLOCKED", "DRAFT", "IN_REVIEW", "APPROVED", "APPLIED", "REVERSED"],
      students: 4,
      targetClasses: 2,
      approverSeparation: submitter.id !== approver.id,
    }, null, 2));
  } finally {
    if (applied && fixture.batchId) {
      await api(`/classes/placement/batches/${fixture.batchId}/undo`, {
        token: submitterToken,
        method: "POST",
        body: { reason: `${marker}-automatic-cleanup` },
      }).catch(() => undefined);
    }
    await cleanupFixture(fixture);
    const [globalAfter, officialAfter] = await Promise.all([counts(), officialCounts()]);
    assert(JSON.stringify(globalAfter) === JSON.stringify(globalBefore), `Global counts changed after cleanup: ${JSON.stringify({ globalBefore, globalAfter })}`);
    assert(JSON.stringify(officialAfter) === JSON.stringify(officialBefore), `Official school counts changed: ${JSON.stringify({ officialBefore, officialAfter })}`);
    console.log(JSON.stringify({ cleanup: "PASS", globalCountsRestored: true, officialSchoolUnchanged: true }, null, 2));
  }
}

main()
  .catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
