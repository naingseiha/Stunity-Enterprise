import "dotenv/config";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL or DIRECT_URL is required");
  process.exit(2);
}

const client = new Client({ connectionString });
const blockers = [];
const warnings = [];
const checks = [];

function record(name, status, detail) {
  checks.push({ name, status, detail });
}

async function scalar(sql, values = []) {
  const result = await client.query(sql, values);
  return result.rows[0]?.value;
}

async function tableExists(tableName) {
  return (
    (await scalar("SELECT to_regclass($1) IS NOT NULL AS value", [
      tableName,
    ])) === true
  );
}

async function columnExists(tableName, columnName) {
  return (
    (await scalar(
      `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     ) AS value`,
      [tableName, columnName],
    )) === true
  );
}

function normalizePhone(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  // Cambodia is the default product region. International numbers already
  // carrying a country code are left untouched; ambiguous local values are
  // reported as warnings rather than silently rewritten.
  if (digits.startsWith("0") && digits.length >= 9 && digits.length <= 10)
    return `+855${digits.slice(1)}`;
  return `+${digits}`;
}

async function run() {
  await client.connect();

  for (const table of ["users", "schools", "claim_codes"]) {
    if (!(await tableExists(table)))
      blockers.push(`Required table is missing: ${table}`);
  }
  record(
    "required_tables",
    blockers.length === 0 ? "pass" : "block",
    "users, schools, claim_codes",
  );

  const legacyColumns = ["linkingStatus", "pendingLinkData"];
  const missingLegacyColumns = [];
  for (const column of legacyColumns) {
    if (!(await columnExists("users", column)))
      missingLegacyColumns.push(column);
  }
  if (missingLegacyColumns.length) {
    blockers.push(
      `Phase 1 backfill requires legacy users columns: ${missingLegacyColumns.join(", ")}`,
    );
  }
  record(
    "legacy_columns",
    missingLegacyColumns.length ? "block" : "pass",
    missingLegacyColumns.length
      ? missingLegacyColumns
      : "linkingStatus, pendingLinkData",
  );

  if (await tableExists("_prisma_migrations")) {
    const failed = await scalar(
      `SELECT count(*)::int AS value
       FROM "_prisma_migrations"
       WHERE finished_at IS NULL AND rolled_back_at IS NULL`,
    );
    if (failed > 0)
      blockers.push(
        `${failed} unfinished Prisma migration(s) must be recovered first`,
      );
    record(
      "migration_ledger",
      failed > 0 ? "block" : "pass",
      `${failed} unfinished migration(s)`,
    );
  } else {
    warnings.push(
      "_prisma_migrations is not present; run this check against the real staging database, not a db-push-only database",
    );
    record("migration_ledger", "warn", "migration ledger not found");
  }

  if (missingLegacyColumns.length === 0) {
    const duplicateApprovedProfiles = await scalar(
      `SELECT count(*)::int AS value
       FROM (
         SELECT "studentId" AS roster_id
         FROM "users"
         WHERE "linkingStatus"::text = 'APPROVED' AND "studentId" IS NOT NULL
         GROUP BY "studentId" HAVING count(*) > 1
         UNION ALL
         SELECT "teacherId" AS roster_id
         FROM "users"
         WHERE "linkingStatus"::text = 'APPROVED' AND "teacherId" IS NOT NULL
         GROUP BY "teacherId" HAVING count(*) > 1
       ) duplicates`,
    );
    if (duplicateApprovedProfiles > 0)
      blockers.push(
        `${duplicateApprovedProfiles} approved roster profile collision(s) would violate Phase 1 uniqueness`,
      );
    record(
      "approved_roster_uniqueness",
      duplicateApprovedProfiles > 0 ? "block" : "pass",
      `${duplicateApprovedProfiles} collision group(s)`,
    );

    const unmatchedPending = await scalar(
      `SELECT count(*)::int AS value
       FROM "users" u
       WHERE u."linkingStatus"::text = 'PENDING'
         AND u."pendingLinkData" IS NOT NULL
         AND NOT EXISTS (
           SELECT 1
           FROM "claim_codes" cc
           WHERE upper(trim(cc."code")) = upper(trim(u."pendingLinkData"->>'code'))
             AND cc."schoolId" = u."pendingLinkData"->>'schoolId'
         )`,
    );
    if (unmatchedPending > 0)
      blockers.push(
        `${unmatchedPending} pending legacy link(s) have no matching claim code`,
      );
    record(
      "pending_claim_resolution",
      unmatchedPending > 0 ? "block" : "pass",
      `${unmatchedPending} unmatched pending link(s)`,
    );

    const duplicatePendingClaims = await scalar(
      `SELECT count(*)::int AS value
       FROM (
         SELECT cc."id"
         FROM "users" u
         JOIN "claim_codes" cc
           ON upper(trim(cc."code")) = upper(trim(u."pendingLinkData"->>'code'))
          AND cc."schoolId" = u."pendingLinkData"->>'schoolId'
         WHERE u."linkingStatus"::text = 'PENDING'
           AND u."pendingLinkData" IS NOT NULL
         GROUP BY cc."id" HAVING count(*) > 1
       ) duplicates`,
    );
    if (duplicatePendingClaims > 0)
      blockers.push(
        `${duplicatePendingClaims} claim code(s) are attached to multiple pending users`,
      );
    record(
      "pending_claim_uniqueness",
      duplicatePendingClaims > 0 ? "block" : "pass",
      `${duplicatePendingClaims} collision group(s)`,
    );
  }

  if (await tableExists("users")) {
    const phoneRows = await client.query(
      `SELECT "phone" FROM "users" WHERE "phone" IS NOT NULL`,
    );
    const seen = new Map();
    for (const row of phoneRows.rows) {
      const normalized = normalizePhone(row.phone);
      if (!normalized) continue;
      seen.set(normalized, (seen.get(normalized) || 0) + 1);
    }
    const duplicatePhones = [...seen.values()].filter(
      (count) => count > 1,
    ).length;
    if (duplicatePhones > 0)
      blockers.push(
        `${duplicatePhones} canonical phone collision group(s) require manual resolution`,
      );
    record(
      "canonical_phone_uniqueness",
      duplicatePhones > 0 ? "block" : "pass",
      `${duplicatePhones} collision group(s)`,
    );
    if (phoneRows.rows.some((row) => !normalizePhone(row.phone)))
      warnings.push(
        "Some stored phone values could not be normalized; review before enabling OTP",
      );
  }

  const featureTables = {
    phase1: await tableExists("school_link_requests"),
    phase2: await tableExists("verified_contacts"),
  };
  record("feature_tables", "pass", featureTables);
  console.log(
    JSON.stringify(
      { ok: blockers.length === 0, blockers, warnings, checks },
      null,
      2,
    ),
  );
  process.exitCode = blockers.length ? 1 : 0;
}

try {
  await run();
} catch (error) {
  console.error(
    `Passwordless migration preflight failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 2;
} finally {
  await client.end().catch(() => undefined);
}
