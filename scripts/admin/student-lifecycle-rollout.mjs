#!/usr/bin/env node

import "dotenv/config";
import pg from "pg";

import {
  APPLY_CONFIRMATION,
  classifyRolloutReadiness,
  parseRolloutArgs,
  validateApplyAuthorization,
  validateRolloutScope,
} from "./student-lifecycle-rollout-lib.mjs";

const { Client } = pg;
const MIGRATION_NAME = "20260802150000_separate_student_record_lifecycle";
const RECOGNIZED_ENROLLMENT_STATUSES = ["ACTIVE", "INACTIVE"];

function printHelp() {
  console.log(`
Student lifecycle rollout checker and legacy-class enrollment backfill

Dry run (default):
  SCHOOL_ID=<id> node scripts/admin/student-lifecycle-rollout.mjs

Optional explicit academic year:
  SCHOOL_ID=<id> ACADEMIC_YEAR_ID=<id> node scripts/admin/student-lifecycle-rollout.mjs

Apply an approved backfill:
  ALLOW_STUDENT_LIFECYCLE_BACKFILL=1 SCHOOL_ID=<id> \\
    node scripts/admin/student-lifecycle-rollout.mjs --apply --confirm=${APPLY_CONFIRMATION}

Options:
  --school-id=<id>          Overrides SCHOOL_ID
  --academic-year-id=<id>   Overrides ACADEMIC_YEAR_ID; otherwise the current year is used
  --sample-limit=<0..100>   Candidate/conflict sample size (default 20)
  --json                    Emit machine-readable JSON
  --apply                   Insert missing StudentClass rows in one transaction
  --confirm=<phrase>        Required with --apply
`);
}

function asNumber(value) {
  return Number(value || 0);
}

async function scalar(client, sql, values = []) {
  const result = await client.query(sql, values);
  return result.rows[0]?.value;
}

async function tableExists(client, tableName) {
  return (await scalar(client, "SELECT to_regclass($1) IS NOT NULL AS value", [`public.${tableName}`])) === true;
}

async function columnExists(client, tableName, columnName) {
  return (
    (await scalar(
      client,
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
       ) AS value`,
      [tableName, columnName],
    )) === true
  );
}

async function resolveScope(client, options, report) {
  const schoolResult = await client.query(
    `SELECT "id", "name" FROM "schools" WHERE "id" = $1`,
    [options.schoolId],
  );
  if (schoolResult.rowCount !== 1) {
    report.blockers.push("The requested school does not exist");
    return null;
  }

  let yearResult;
  if (options.academicYearId) {
    yearResult = await client.query(
      `SELECT "id", "name", "startDate", "endDate", "isCurrent"
       FROM "academic_years"
       WHERE "id" = $1 AND "schoolId" = $2`,
      [options.academicYearId, options.schoolId],
    );
    if (yearResult.rowCount !== 1) {
      report.blockers.push("The requested academic year does not belong to the requested school");
      return null;
    }
  } else {
    yearResult = await client.query(
      `SELECT "id", "name", "startDate", "endDate", "isCurrent"
       FROM "academic_years"
       WHERE "schoolId" = $1 AND "isCurrent" = true
       ORDER BY "startDate" DESC`,
      [options.schoolId],
    );
    if (yearResult.rowCount !== 1) {
      report.blockers.push(
        yearResult.rowCount === 0
          ? "No current academic year was found; provide --academic-year-id explicitly"
          : "Multiple current academic years were found; provide --academic-year-id explicitly",
      );
      return null;
    }
  }

  return {
    school: schoolResult.rows[0],
    academicYear: yearResult.rows[0],
  };
}

async function collectReport(client, options) {
  const report = {
    mode: options.apply ? "apply" : "dry-run",
    migration: MIGRATION_NAME,
    school: null,
    academicYear: null,
    migrationApplied: false,
    activeSisStudentCount: 0,
    archivedSisStudentCount: 0,
    legacyInactiveFlagCount: 0,
    academicYearCensusCount: 0,
    outsideAcademicYearCount: 0,
    canonicalEnrollmentCount: 0,
    fallbackOnlyCount: 0,
    candidateCount: 0,
    conflictingEnrollmentCount: 0,
    unrecognizedEnrollmentStatusCount: 0,
    duplicateEffectiveEnrollmentCount: 0,
    linkedStunityAccountCount: 0,
    pendingSchoolLinkCount: 0,
    approvedSchoolLinkCount: 0,
    flaggedActiveUnclaimedClaimCodeCount: 0,
    usableUnclaimedClaimCodeCount: 0,
    candidates: [],
    conflicts: [],
    blockers: [],
    warnings: [],
  };

  const requiredTables = [
    "schools",
    "academic_years",
    "students",
    "classes",
    "student_classes",
    "users",
    "school_link_requests",
    "claim_codes",
  ];
  for (const table of requiredTables) {
    if (!(await tableExists(client, table))) report.blockers.push(`Required table is missing: ${table}`);
  }
  if (report.blockers.length > 0) return report;

  const lifecycleColumnExists = await columnExists(client, "students", "recordStatus");
  if (!lifecycleColumnExists) {
    report.blockers.push(`Migration ${MIGRATION_NAME} must be deployed before this rollout check`);
    return report;
  }

  if (await tableExists(client, "_prisma_migrations")) {
    report.migrationApplied =
      (await scalar(
        client,
        `SELECT EXISTS (
           SELECT 1 FROM "_prisma_migrations"
           WHERE migration_name = $1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL
         ) AS value`,
        [MIGRATION_NAME],
      )) === true;
    if (!report.migrationApplied) {
      report.warnings.push(
        "The lifecycle column exists but the Prisma migration ledger does not show the expected completed migration",
      );
    }
  } else {
    report.warnings.push("The Prisma migration ledger is not present");
  }

  const scope = await resolveScope(client, options, report);
  if (!scope) return report;
  report.school = scope.school;
  report.academicYear = scope.academicYear;

  const values = [options.schoolId, scope.academicYear.id, RECOGNIZED_ENROLLMENT_STATUSES];

  const counts = await client.query(
    `WITH scoped_students AS (
       SELECT s."id", s."classId"
       FROM "students" s
       WHERE s."schoolId" = $1 AND s."recordStatus"::text = 'ACTIVE'
     ), canonical AS (
       SELECT DISTINCT ss."id" AS "studentId"
       FROM scoped_students ss
       JOIN "student_classes" sc ON sc."studentId" = ss."id"
       JOIN "classes" c ON c."id" = sc."classId"
       WHERE c."schoolId" = $1
         AND c."academicYearId" = $2
         AND sc."status" = ANY($3::text[])
     ), legacy AS (
       SELECT ss."id" AS "studentId", ss."classId"
       FROM scoped_students ss
       JOIN "classes" c ON c."id" = ss."classId"
       WHERE c."schoolId" = $1 AND c."academicYearId" = $2
     )
     SELECT
       (SELECT count(*) FROM scoped_students)::int AS "activeSisStudentCount",
       (SELECT count(*) FROM (SELECT "studentId" FROM canonical UNION SELECT "studentId" FROM legacy) census)::int
         AS "academicYearCensusCount",
       (SELECT count(*) FROM canonical)::int AS "canonicalEnrollmentCount",
       (SELECT count(*) FROM legacy l WHERE NOT EXISTS (
          SELECT 1 FROM canonical c WHERE c."studentId" = l."studentId"
        ))::int AS "fallbackOnlyCount"`,
    values,
  );
  Object.assign(report, counts.rows[0]);
  report.outsideAcademicYearCount = Math.max(
    0,
    report.activeSisStudentCount - report.academicYearCensusCount,
  );

  report.archivedSisStudentCount = asNumber(
    await scalar(
      client,
      `SELECT count(*)::int AS value
       FROM "students"
       WHERE "schoolId" = $1 AND "recordStatus"::text = 'ARCHIVED'`,
      [options.schoolId],
    ),
  );
  report.legacyInactiveFlagCount = asNumber(
    await scalar(
      client,
      `SELECT count(*)::int AS value
       FROM "students"
       WHERE "schoolId" = $1
         AND "recordStatus"::text = 'ACTIVE'
         AND "isAccountActive" = false`,
      [options.schoolId],
    ),
  );

  const candidateResult = await client.query(
    `SELECT
       s."id" AS "studentId",
       s."studentId" AS "studentCode",
       s."firstName",
       s."lastName",
       c."id" AS "classId",
       c."name" AS "className"
     FROM "students" s
     JOIN "classes" c ON c."id" = s."classId"
     WHERE s."schoolId" = $1
       AND s."recordStatus"::text = 'ACTIVE'
       AND c."schoolId" = $1
       AND c."academicYearId" = $2
       AND NOT EXISTS (
         SELECT 1 FROM "student_classes" sc
         WHERE sc."studentId" = s."id" AND sc."academicYearId" = $2
       )
     ORDER BY c."name", s."lastName", s."firstName", s."id"`,
    [options.schoolId, scope.academicYear.id],
  );
  report.candidateCount = candidateResult.rowCount;
  report.candidates = candidateResult.rows.slice(0, options.sampleLimit);

  const conflictResult = await client.query(
    `SELECT
       s."id" AS "studentId",
       s."studentId" AS "studentCode",
       s."classId" AS "legacyClassId",
       legacy_class."name" AS "legacyClassName",
       array_agg(DISTINCT sc."classId") FILTER (WHERE sc."status" = ANY($3::text[])) AS "enrollmentClassIds"
     FROM "students" s
     JOIN "classes" legacy_class ON legacy_class."id" = s."classId"
     JOIN "student_classes" sc ON sc."studentId" = s."id" AND sc."academicYearId" = $2
     WHERE s."schoolId" = $1
       AND s."recordStatus"::text = 'ACTIVE'
       AND legacy_class."schoolId" = $1
       AND legacy_class."academicYearId" = $2
     GROUP BY s."id", s."studentId", s."classId", legacy_class."name"
     HAVING bool_or(sc."status" = ANY($3::text[]))
        AND NOT bool_or(sc."status" = ANY($3::text[]) AND sc."classId" = s."classId")
     ORDER BY legacy_class."name", s."id"`,
    values,
  );
  report.conflictingEnrollmentCount = conflictResult.rowCount;
  report.conflicts = conflictResult.rows.slice(0, options.sampleLimit);

  report.unrecognizedEnrollmentStatusCount = asNumber(
    await scalar(
      client,
      `SELECT count(*)::int AS value
       FROM "students" s
       JOIN "classes" c ON c."id" = s."classId"
       WHERE s."schoolId" = $1
         AND s."recordStatus"::text = 'ACTIVE'
         AND c."schoolId" = $1
         AND c."academicYearId" = $2
         AND EXISTS (
           SELECT 1 FROM "student_classes" sc
           WHERE sc."studentId" = s."id" AND sc."academicYearId" = $2
         )
         AND NOT EXISTS (
           SELECT 1 FROM "student_classes" sc
           WHERE sc."studentId" = s."id"
             AND sc."academicYearId" = $2
             AND sc."status" = ANY($3::text[])
         )`,
      values,
    ),
  );

  report.duplicateEffectiveEnrollmentCount = asNumber(
    await scalar(
      client,
      `SELECT count(*)::int AS value
       FROM (
         SELECT sc."studentId"
         FROM "student_classes" sc
         JOIN "students" s ON s."id" = sc."studentId"
         JOIN "classes" c ON c."id" = sc."classId"
         WHERE s."schoolId" = $1
           AND s."recordStatus"::text = 'ACTIVE'
           AND c."schoolId" = $1
           AND c."academicYearId" = $2
           AND sc."academicYearId" = $2
           AND sc."status" = 'ACTIVE'
           AND sc."endedAt" IS NULL
         GROUP BY sc."studentId"
         HAVING count(*) > 1
       ) duplicates`,
      [options.schoolId, scope.academicYear.id],
    ),
  );

  report.linkedStunityAccountCount = asNumber(
    await scalar(
      client,
      `SELECT count(*)::int AS value
       FROM "users" u
       JOIN "students" s ON s."id" = u."studentId"
       WHERE s."schoolId" = $1 AND s."recordStatus"::text = 'ACTIVE'`,
      [options.schoolId],
    ),
  );
  report.pendingSchoolLinkCount = asNumber(
    await scalar(
      client,
      `SELECT count(*)::int AS value
       FROM "school_link_requests"
       WHERE "schoolId" = $1 AND "studentId" IS NOT NULL AND "status"::text = 'PENDING'`,
      [options.schoolId],
    ),
  );
  report.approvedSchoolLinkCount = asNumber(
    await scalar(
      client,
      `SELECT count(*)::int AS value
       FROM "school_link_requests"
       WHERE "schoolId" = $1 AND "studentId" IS NOT NULL AND "status"::text = 'APPROVED'`,
      [options.schoolId],
    ),
  );
  report.flaggedActiveUnclaimedClaimCodeCount = asNumber(
    await scalar(
      client,
      `SELECT count(*)::int AS value
       FROM "claim_codes"
       WHERE "schoolId" = $1
         AND "studentId" IS NOT NULL
         AND "isActive" = true
         AND "claimedAt" IS NULL
         AND "claimedByUserId" IS NULL
         AND "revokedAt" IS NULL`,
      [options.schoolId],
    ),
  );
  report.usableUnclaimedClaimCodeCount = asNumber(
    await scalar(
      client,
      `SELECT count(*)::int AS value
       FROM "claim_codes"
       WHERE "schoolId" = $1
         AND "studentId" IS NOT NULL
         AND "isActive" = true
         AND "claimedAt" IS NULL
         AND "claimedByUserId" IS NULL
         AND "revokedAt" IS NULL
         AND "expiresAt" > CURRENT_TIMESTAMP`,
      [options.schoolId],
    ),
  );

  return report;
}

async function applyBackfill(client, report) {
  await client.query("BEGIN");
  try {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('stunity:student-lifecycle-backfill'))",
    );
    const inserted = await client.query(
      `INSERT INTO "student_classes" (
         "id", "studentId", "classId", "academicYearId", "enrolledAt", "startedAt",
         "entryReason", "status", "createdAt", "updatedAt"
       )
       SELECT
         'student_class_backfill:' || s."id" || ':' || c."id" || ':' || c."academicYearId",
         s."id",
         c."id",
         c."academicYearId",
         ay."startDate",
         ay."startDate",
         'ADMIN_PLACEMENT'::"EnrollmentEntryReason",
         'ACTIVE',
         CURRENT_TIMESTAMP,
         CURRENT_TIMESTAMP
       FROM "students" s
       JOIN "classes" c ON c."id" = s."classId"
       JOIN "academic_years" ay ON ay."id" = c."academicYearId"
       WHERE s."schoolId" = $1
         AND s."recordStatus"::text = 'ACTIVE'
         AND c."schoolId" = $1
         AND c."academicYearId" = $2
         AND NOT EXISTS (
           SELECT 1 FROM "student_classes" sc
           WHERE sc."studentId" = s."id" AND sc."academicYearId" = $2
         )
       ON CONFLICT ("id") DO NOTHING
       RETURNING "id"`,
      [report.school.id, report.academicYear.id],
    );
    await client.query("COMMIT");
    return inserted.rowCount;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

function printHuman(report, readiness, insertedCount = null) {
  console.log("");
  console.log("Student lifecycle rollout");
  console.log("────────────────────────────────────────────────────────");
  console.log(`Mode: ${report.mode}`);
  console.log(`Migration ledger: ${report.migrationApplied ? "applied" : "not confirmed"}`);
  if (report.school) console.log(`School: ${report.school.name} (${report.school.id})`);
  if (report.academicYear) console.log(`Academic year: ${report.academicYear.name} (${report.academicYear.id})`);
  console.log("");
  console.log(`Active SIS records: ${report.activeSisStudentCount}`);
  console.log(`Archived SIS records: ${report.archivedSisStudentCount}`);
  console.log(`Active SIS records with legacy isAccountActive=false: ${report.legacyInactiveFlagCount}`);
  console.log(`Academic-year census: ${report.academicYearCensusCount}`);
  console.log(`Active SIS records outside selected academic year: ${report.outsideAcademicYearCount}`);
  console.log(`Canonical StudentClass: ${report.canonicalEnrollmentCount}`);
  console.log(`Legacy fallback only: ${report.fallbackOnlyCount}`);
  console.log(`Safe backfill candidates: ${report.candidateCount}`);
  console.log(`Enrollment conflicts: ${report.conflictingEnrollmentCount}`);
  console.log(`Unrecognized statuses: ${report.unrecognizedEnrollmentStatusCount}`);
  console.log(`Duplicate effective enrollments: ${report.duplicateEffectiveEnrollmentCount}`);
  console.log(`Linked Stunity accounts: ${report.linkedStunityAccountCount}`);
  console.log(`Pending school links: ${report.pendingSchoolLinkCount}`);
  console.log(`Approved school links: ${report.approvedSchoolLinkCount}`);
  console.log(`Flagged active/unclaimed claim codes: ${report.flaggedActiveUnclaimedClaimCodeCount}`);
  console.log(`Usable unclaimed claim codes: ${report.usableUnclaimedClaimCodeCount}`);
  if (insertedCount !== null) console.log(`Inserted StudentClass rows: ${insertedCount}`);

  if (report.candidates.length > 0) {
    console.log("\nCandidate sample:");
    for (const row of report.candidates) {
      console.log(
        `  ${row.studentCode || row.studentId} — ${row.lastName} ${row.firstName} → ${row.className}`,
      );
    }
  }
  if (report.conflicts.length > 0) {
    console.log("\nConflict sample:");
    for (const row of report.conflicts) {
      console.log(
        `  ${row.studentCode || row.studentId} — legacy ${row.legacyClassName}; enrollment ${row.enrollmentClassIds.join(", ")}`,
      );
    }
  }
  if (readiness.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of readiness.warnings) console.log(`  - ${warning}`);
  }
  if (readiness.blockers.length > 0) {
    console.log("\nBlockers:");
    for (const blocker of readiness.blockers) console.log(`  - ${blocker}`);
  }
  console.log(`\nResult: ${readiness.ok ? "READY" : "BLOCKED"}`);
  if (!report.mode.startsWith("apply") && readiness.ok && report.candidateCount > 0) {
    console.log(
      `Apply only after backup: --apply --confirm=${APPLY_CONFIRMATION} with ALLOW_STUDENT_LIFECYCLE_BACKFILL=1`,
    );
  }
  console.log("");
}

async function main() {
  let options;
  try {
    options = parseRolloutArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }

  if (options.help) {
    printHelp();
    return;
  }

  const inputErrors = [
    ...validateRolloutScope(options),
    ...validateApplyAuthorization(options),
  ];
  if (inputErrors.length > 0) {
    for (const error of inputErrors) console.error(error);
    process.exitCode = 2;
    return;
  }

  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DIRECT_URL or DATABASE_URL is required");
    process.exitCode = 2;
    return;
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();
    let report = await collectReport(client, options);
    let readiness = classifyRolloutReadiness(report);
    let insertedCount = null;

    if (options.apply) {
      if (!readiness.ok) {
        if (options.json) console.log(JSON.stringify({ ...report, ...readiness }, null, 2));
        else printHuman(report, readiness);
        process.exitCode = 2;
        return;
      }

      insertedCount = await applyBackfill(client, report);
      report = await collectReport(client, { ...options, apply: true });
      report.mode = "apply-verified";
      report.insertedCount = insertedCount;
      if (report.fallbackOnlyCount !== 0 || report.candidateCount !== 0) {
        report.blockers.push("Post-apply verification still found fallback-only students");
      }
      readiness = classifyRolloutReadiness(report);
    }

    if (options.json) {
      console.log(JSON.stringify({ ...report, ...readiness, insertedCount }, null, 2));
    } else {
      printHuman(report, readiness, insertedCount);
    }
    if (!readiness.ok) process.exitCode = 2;
  } catch (error) {
    const code = typeof error?.code === "string" ? error.code : "UNKNOWN";
    console.error(`Student lifecycle rollout could not complete (${code}).`);
    process.exitCode = 2;
  } finally {
    await client.end().catch(() => undefined);
  }
}

await main();
