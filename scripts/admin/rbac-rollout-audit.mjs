#!/usr/bin/env node

import 'dotenv/config';
import pg from 'pg';
import permissionPolicy from '../../services/lib/admin-permissions.js';

const { ALL_PERMISSIONS, isExplicitPermissionDocument, sanitizePermissionGrants } = permissionPolicy;
const { Client } = pg;

function parseArgs(argv) {
  const options = { json: false, schoolId: String(process.env.SCHOOL_ID || '').trim(), help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') options.json = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--school-id') options.schoolId = String(argv[++index] || '').trim();
    else if (arg.startsWith('--school-id=')) options.schoolId = arg.slice(12).trim();
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log(`
Read-only enterprise RBAC rollout audit

Usage:
  npm run db:rbac:check
  SCHOOL_ID=<id> npm run db:rbac:check
  npm run db:rbac:check -- --school-id=<id> --json

This command never writes permission data.
`);
}

function classify(rows, schoolId = '') {
  const report = {
    mode: 'read-only',
    schoolId: schoolId || null,
    knownPermissionCount: ALL_PERMISSIONS.length,
    totalAdministrativeUsers: rows.length,
    activeAdministrativeUsers: rows.filter((row) => row.isActive).length,
    roles: {},
    legacyRoleDefaultUsers: 0,
    explicitPolicyUsers: 0,
    restrictedExplicitPolicyUsers: 0,
    malformedExplicitPolicyUsers: 0,
    unknownGrantUsers: 0,
    missingSchoolUsers: 0,
    superAdminProjectionMismatches: 0,
    blockers: [],
    warnings: [],
  };

  for (const row of rows) {
    report.roles[row.role] = (report.roles[row.role] || 0) + 1;
    if (row.role !== 'SUPER_ADMIN' && !row.schoolId) report.missingSchoolUsers += 1;
    if ((row.role === 'SUPER_ADMIN') !== Boolean(row.isSuperAdmin)) report.superAdminProjectionMismatches += 1;

    if (!isExplicitPermissionDocument(row.permissions)) {
      report.legacyRoleDefaultUsers += 1;
      continue;
    }
    report.explicitPolicyUsers += 1;
    if (!Array.isArray(row.permissions.grants)) {
      report.malformedExplicitPolicyUsers += 1;
      continue;
    }
    const sanitized = sanitizePermissionGrants(row.permissions.grants);
    if (sanitized.length !== new Set(row.permissions.grants).size) report.unknownGrantUsers += 1;
    if (sanitized.length < ALL_PERMISSIONS.length) report.restrictedExplicitPolicyUsers += 1;
  }

  if (report.missingSchoolUsers > 0) {
    report.blockers.push(`${report.missingSchoolUsers} non-super administrator(s) have no school tenant`);
  }
  if (report.malformedExplicitPolicyUsers > 0) {
    report.blockers.push(`${report.malformedExplicitPolicyUsers} explicit permission document(s) are malformed`);
  }
  if (report.unknownGrantUsers > 0) {
    report.blockers.push(`${report.unknownGrantUsers} explicit permission document(s) contain unknown grants`);
  }
  if (report.superAdminProjectionMismatches > 0) {
    report.warnings.push(`${report.superAdminProjectionMismatches} user(s) have legacy isSuperAdmin/role projection mismatch`);
  }
  if (report.legacyRoleDefaultUsers > 0) {
    report.warnings.push(`${report.legacyRoleDefaultUsers} administrator(s) will use backward-compatible role defaults`);
  }
  report.ready = report.blockers.length === 0;
  return report;
}

function printHuman(report) {
  console.log('\nEnterprise RBAC rollout readiness');
  console.log('────────────────────────────────────────────────────────');
  console.log(`Mode: ${report.mode}`);
  console.log(`Scope: ${report.schoolId || 'all schools'}`);
  console.log(`Known permissions: ${report.knownPermissionCount}`);
  console.log(`Administrative users: ${report.totalAdministrativeUsers} (${report.activeAdministrativeUsers} active)`);
  console.log(`Roles: ${Object.entries(report.roles).map(([role, count]) => `${role}=${count}`).join(', ') || 'none'}`);
  console.log(`Legacy role defaults: ${report.legacyRoleDefaultUsers}`);
  console.log(`Explicit policies: ${report.explicitPolicyUsers} (${report.restrictedExplicitPolicyUsers} restricted)`);
  console.log(`Malformed policies: ${report.malformedExplicitPolicyUsers}`);
  console.log(`Unknown-grant policies: ${report.unknownGrantUsers}`);
  console.log(`Missing tenant: ${report.missingSchoolUsers}`);
  for (const warning of report.warnings) console.log(`WARNING: ${warning}`);
  for (const blocker of report.blockers) console.log(`BLOCKER: ${blocker}`);
  console.log(`Result: ${report.ready ? 'READY' : 'BLOCKED'}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return printHelp();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const params = [];
    const schoolClause = options.schoolId ? `AND "schoolId" = $1` : '';
    if (options.schoolId) params.push(options.schoolId);
    const result = await client.query(
      `SELECT "id", "schoolId", "role"::text, "isSuperAdmin", "isActive", "permissions"
       FROM "users"
       WHERE "role"::text = ANY($${params.length + 1}::text[])
       ${schoolClause}
       ORDER BY "role"::text, "id"`,
      [...params, ['ADMIN', 'SCHOOL_ADMIN', 'STAFF', 'SUPER_ADMIN']],
    );
    const report = classify(result.rows, options.schoolId);
    if (options.json) console.log(JSON.stringify(report, null, 2));
    else printHuman(report);
    if (!report.ready) process.exitCode = 2;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`RBAC audit failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

export { classify, parseArgs };
