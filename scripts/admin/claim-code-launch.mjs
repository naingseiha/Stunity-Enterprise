#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import "dotenv/config";
import pg from "pg";

import {
  APPLY_CONFIRMATION,
  classifyLaunchReadiness,
  csvEscape,
  parseLaunchArgs,
  plannedCredentialCount,
  validateApplyAuthorization,
  validateLaunchScope,
} from "./claim-code-launch-lib.mjs";

const { Client } = pg;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RECOGNIZED_ENROLLMENT_STATUSES = ["ACTIVE", "INACTIVE"];

function printHelp() {
  console.log(`
Controlled student Claim Code launch workflow

Dry run (default):
  SCHOOL_ID=<id> npm run db:claim-code-launch:check

Apply an approved launch batch:
  ALLOW_PRODUCTION_DB=1 ALLOW_CLAIM_CODE_LAUNCH=1 SCHOOL_ID=<id> \\
    npm run db:claim-code-launch:apply -- \\
    --output=/absolute/private/path/student-claim-codes.csv \\
    --confirm=${APPLY_CONFIRMATION}

Options:
  --school-id=<id>          Overrides SCHOOL_ID
  --academic-year-id=<id>   Overrides ACADEMIC_YEAR_ID; otherwise current year
  --expires-in-days=<7..365> Credential lifetime (default 30)
  --sample-limit=<0..100>   Non-sensitive action sample size (default 20)
  --output=<absolute-path>  Required new CSV file for apply; never overwritten
  --json                    Emit machine-readable report (never includes codes)
  --apply                   Create the approved batch in one transaction
  --confirm=<phrase>        Required with --apply
`);
}

async function resolveScope(client, options, report) {
  const school = await client.query(`SELECT "id", "name" FROM "schools" WHERE "id" = $1`, [options.schoolId]);
  if (school.rowCount !== 1) {
    report.blockers.push("The requested school does not exist");
    return null;
  }

  const year = options.academicYearId
    ? await client.query(
        `SELECT "id", "name", "startDate", "endDate", "isCurrent"
         FROM "academic_years" WHERE "id" = $1 AND "schoolId" = $2`,
        [options.academicYearId, options.schoolId],
      )
    : await client.query(
        `SELECT "id", "name", "startDate", "endDate", "isCurrent"
         FROM "academic_years" WHERE "schoolId" = $1 AND "isCurrent" = true
         ORDER BY "startDate" DESC`,
        [options.schoolId],
      );

  if (year.rowCount !== 1) {
    report.blockers.push(
      options.academicYearId
        ? "The requested academic year does not belong to the requested school"
        : year.rowCount === 0
          ? "No current academic year was found; provide --academic-year-id"
          : "Multiple current academic years were found; provide --academic-year-id",
    );
    return null;
  }
  return { school: school.rows[0], academicYear: year.rows[0] };
}

async function collectReport(client, options) {
  const report = {
    mode: options.apply ? "apply-preflight" : "dry-run",
    school: null,
    academicYear: null,
    expiresInDays: options.expiresInDays,
    currentYearStudentCount: 0,
    linkedAccountStudentCount: 0,
    protectedPendingStudentCount: 0,
    eligibleStudentCount: 0,
    usableCodeStudentCount: 0,
    expiredCodeStudentCount: 0,
    missingCodeStudentCount: 0,
    duplicateActiveCodeStudentCount: 0,
    plannedCredentialCount: 0,
    candidates: [],
    blockers: [],
    warnings: [],
  };
  const scope = await resolveScope(client, options, report);
  if (!scope) return { report, actionRows: [] };
  report.school = scope.school;
  report.academicYear = scope.academicYear;

  const result = await client.query(
    `WITH current_students AS (
       SELECT DISTINCT
         s."id" AS "studentId", s."studentId" AS "studentCode", s."firstName", s."lastName", s."dateOfBirth"
       FROM "students" s
       JOIN "student_classes" sc ON sc."studentId" = s."id" AND sc."academicYearId" = $2
       JOIN "classes" c ON c."id" = sc."classId"
       WHERE s."schoolId" = $1
         AND s."recordStatus"::text = 'ACTIVE'
         AND c."schoolId" = $1
         AND c."academicYearId" = $2
         AND sc."status" = ANY($3::text[])
     )
     SELECT cs.*,
       EXISTS (SELECT 1 FROM "users" u WHERE u."studentId" = cs."studentId") AS "hasLinkedAccount",
       EXISTS (
         SELECT 1 FROM "school_link_requests" slr
         WHERE slr."schoolId" = $1 AND slr."studentId" = cs."studentId" AND slr."status"::text = 'PENDING'
       ) AS "hasPendingLink",
       (SELECT count(*)::int FROM "claim_codes" cc
        WHERE cc."schoolId" = $1 AND cc."studentId" = cs."studentId"
          AND cc."isActive" = true AND cc."claimedAt" IS NULL
          AND cc."claimedByUserId" IS NULL AND cc."revokedAt" IS NULL) AS "activeCodeCount",
       (SELECT count(*)::int FROM "claim_codes" cc
        WHERE cc."schoolId" = $1 AND cc."studentId" = cs."studentId"
          AND cc."isActive" = true AND cc."claimedAt" IS NULL
          AND cc."claimedByUserId" IS NULL AND cc."revokedAt" IS NULL
          AND cc."expiresAt" > CURRENT_TIMESTAMP) AS "usableCodeCount"
     FROM current_students cs
     ORDER BY cs."lastName", cs."firstName", cs."studentCode", cs."studentId"`,
    [options.schoolId, scope.academicYear.id, RECOGNIZED_ENROLLMENT_STATUSES],
  );

  const rows = result.rows.map((row) => {
    const eligible = !row.hasLinkedAccount && !row.hasPendingLink;
    const action = !eligible
      ? "PROTECTED"
      : row.usableCodeCount > 0
        ? "KEEP_USABLE"
        : row.activeCodeCount > 0
          ? "ROTATE_EXPIRED"
          : "CREATE";
    return { ...row, eligible, action };
  });

  report.currentYearStudentCount = rows.length;
  report.linkedAccountStudentCount = rows.filter((row) => row.hasLinkedAccount).length;
  report.protectedPendingStudentCount = rows.filter((row) => row.hasPendingLink).length;
  report.eligibleStudentCount = rows.filter((row) => row.eligible).length;
  report.usableCodeStudentCount = rows.filter((row) => row.eligible && row.usableCodeCount > 0).length;
  report.expiredCodeStudentCount = rows.filter((row) => row.action === "ROTATE_EXPIRED").length;
  report.missingCodeStudentCount = rows.filter((row) => row.action === "CREATE").length;
  report.duplicateActiveCodeStudentCount = rows.filter((row) => row.activeCodeCount > 1).length;
  report.plannedCredentialCount = plannedCredentialCount(report);
  report.candidates = rows
    .filter((row) => row.action === "ROTATE_EXPIRED" || row.action === "CREATE")
    .slice(0, options.sampleLimit)
    .map(({ studentId, studentCode, firstName, lastName, action }) => ({ studentId, studentCode, firstName, lastName, action }));

  return {
    report,
    actionRows: rows.filter((row) => row.action === "ROTATE_EXPIRED" || row.action === "CREATE"),
  };
}

function randomSegment(length = 4) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (byte) => CODE_CHARS[byte % CODE_CHARS.length]).join("");
}

function generateCode() {
  return `STNT-${randomSegment()}-${randomSegment()}`;
}

async function generateUniqueCodes(client, count) {
  const generated = new Set();
  while (generated.size < count) generated.add(generateCode());
  let codes = [...generated];
  while (true) {
    const existing = await client.query(`SELECT "code" FROM "claim_codes" WHERE "code" = ANY($1::text[])`, [codes]);
    if (existing.rowCount === 0) return codes;
    const collisions = new Set(existing.rows.map((row) => row.code));
    codes = codes.map((code) => (collisions.has(code) ? generateCode() : code));
    if (new Set(codes).size !== codes.length) codes = await generateUniqueCodes(client, count);
  }
}

function buildCsv(rows, report, batchId, expiresAt) {
  const header = ["batchId", "schoolId", "academicYearId", "studentId", "studentCode", "lastName", "firstName", "claimCode", "expiresAt"];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [batchId, report.school.id, report.academicYear.id, row.studentId, row.studentCode, row.lastName, row.firstName, row.code, expiresAt.toISOString()]
        .map(csvEscape)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

async function applyLaunch(client, options) {
  let outputHandle;
  let committed = false;
  try {
    outputHandle = await fs.open(options.output, "wx", 0o600);
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('stunity:student-claim-code-launch'))");

    const { report, actionRows } = await collectReport(client, { ...options, apply: true });
    const readiness = classifyLaunchReadiness(report);
    if (!readiness.ok) throw new Error(`Launch preflight blocked: ${readiness.blockers.join("; ")}`);

    const codes = await generateUniqueCodes(client, actionRows.length);
    const batchId = `${new Date().toISOString().replaceAll(/[-:.TZ]/g, "").slice(0, 14)}-${crypto.randomBytes(4).toString("hex")}`;
    const expiresAt = new Date(Date.now() + options.expiresInDays * 86_400_000);
    const rows = actionRows.map((row, index) => ({ ...row, code: codes[index] }));
    const rotatingStudentIds = rows.filter((row) => row.action === "ROTATE_EXPIRED").map((row) => row.studentId);

    if (rotatingStudentIds.length > 0) {
      await client.query(
        `UPDATE "claim_codes"
         SET "isActive" = false, "revokedAt" = CURRENT_TIMESTAMP,
             "revokedBy" = 'system:claim-code-launch',
             "revokedReason" = $2
         WHERE "schoolId" = $1 AND "studentId" = ANY($3::text[])
           AND "isActive" = true AND "claimedAt" IS NULL
           AND "claimedByUserId" IS NULL AND "revokedAt" IS NULL`,
        [report.school.id, `Replaced by controlled launch batch ${batchId}`, rotatingStudentIds],
      );
    }

    const inserts = rows.map((row) => ({
      id: `claim_launch:${batchId}:${row.studentId}`,
      code: row.code,
      studentId: row.studentId,
      verificationData: { firstName: row.firstName, lastName: row.lastName, dateOfBirth: row.dateOfBirth },
    }));
    if (inserts.length > 0) {
      await client.query(
        `INSERT INTO "claim_codes" (
           "id", "code", "type", "schoolId", "studentId", "expiresAt", "createdAt",
           "verificationData", "isActive"
         )
         SELECT item->>'id', item->>'code', 'STUDENT'::"ClaimCodeType", $2,
                item->>'studentId', $3, CURRENT_TIMESTAMP,
                item->'verificationData', true
         FROM jsonb_array_elements($1::jsonb) item`,
        [JSON.stringify(inserts), report.school.id, expiresAt],
      );
    }

    await outputHandle.writeFile(buildCsv(rows, report, batchId, expiresAt), { encoding: "utf8" });
    await outputHandle.sync();
    await client.query("COMMIT");
    committed = true;
    return { batchId, generatedCount: rows.length, expiresAt, output: options.output };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await outputHandle?.close().catch(() => undefined);
    if (!committed && options.output) await fs.unlink(options.output).catch(() => undefined);
  }
}

function printHuman(report, readiness, applyResult = null) {
  console.log("\nStudent Claim Code launch readiness");
  console.log("────────────────────────────────────────────────────────");
  console.log(`Mode: ${report.mode}`);
  if (report.school) console.log(`School: ${report.school.name} (${report.school.id})`);
  if (report.academicYear) console.log(`Academic year: ${report.academicYear.name} (${report.academicYear.id})`);
  console.log(`Credential lifetime: ${report.expiresInDays} day(s)`);
  console.log(`Current-year canonical students: ${report.currentYearStudentCount}`);
  console.log(`Linked accounts: ${report.linkedAccountStudentCount}`);
  console.log(`Protected pending links: ${report.protectedPendingStudentCount}`);
  console.log(`Eligible students: ${report.eligibleStudentCount}`);
  console.log(`Usable credentials kept: ${report.usableCodeStudentCount}`);
  console.log(`Expired credentials to rotate: ${report.expiredCodeStudentCount}`);
  console.log(`Missing credentials to create: ${report.missingCodeStudentCount}`);
  console.log(`Students with duplicate active codes: ${report.duplicateActiveCodeStudentCount}`);
  console.log(`Planned new credentials: ${report.plannedCredentialCount}`);
  if (applyResult) {
    console.log(`Applied batch: ${applyResult.batchId}`);
    console.log(`Generated credentials: ${applyResult.generatedCount}`);
    console.log(`Private CSV: ${applyResult.output}`);
  }
  if (report.candidates.length > 0) {
    console.log("\nAction sample (codes are never shown in dry-run output):");
    for (const row of report.candidates) console.log(`  ${row.studentCode || row.studentId} — ${row.lastName} ${row.firstName}: ${row.action}`);
  }
  if (readiness.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of readiness.warnings) console.log(`  - ${warning}`);
  }
  if (readiness.blockers.length > 0) {
    console.log("\nBlockers:");
    for (const blocker of readiness.blockers) console.log(`  - ${blocker}`);
  }
  console.log(`\nResult: ${readiness.ok ? "READY" : "BLOCKED"}\n`);
}

async function main() {
  let options;
  try {
    options = parseLaunchArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }
  if (options.help) return printHelp();

  const errors = [...validateLaunchScope(options), ...validateApplyAuthorization(options, process.env, path)];
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
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
    let { report } = await collectReport(client, options);
    let readiness = classifyLaunchReadiness(report);
    let applyResult = null;
    if (options.apply) {
      if (!readiness.ok) {
        if (options.json) console.log(JSON.stringify({ ...report, ...readiness }, null, 2));
        else printHuman(report, readiness);
        process.exitCode = 2;
        return;
      }
      applyResult = await applyLaunch(client, options);
      ({ report } = await collectReport(client, { ...options, apply: true }));
      report.mode = "apply-verified";
      readiness = classifyLaunchReadiness(report);
      if (report.plannedCredentialCount !== 0) {
        readiness.ok = false;
        readiness.blockers.push("Post-apply verification still found students requiring credentials");
      }
    }
    if (options.json) console.log(JSON.stringify({ ...report, ...readiness, applyResult }, null, 2));
    else printHuman(report, readiness, applyResult);
    if (!readiness.ok) process.exitCode = 2;
  } catch (error) {
    const code = typeof error?.code === "string" ? error.code : "UNKNOWN";
    console.error(`Claim Code launch workflow could not complete (${code}): ${error.message}`);
    process.exitCode = 2;
  } finally {
    await client.end().catch(() => undefined);
  }
}

await main();
