/**
 * Export V1 (SchoolManagementApp) data to JSON files
 *
 * Usage:
 *   V1_DATABASE_URL="postgresql://user:pass@host:5432/school_db_v1" \
 *     npx tsx scripts/migrate-v1-to-v2/export-v1-data.ts
 *
 * Output: scripts/migrate-v1-to-v2/data/export-YYYY-MM-DDTHH-MM-SS/
 *   ├── metadata.json     (table counts, timestamps, version)
 *   ├── classes.json
 *   ├── subjects.json
 *   ├── teachers.json
 *   ├── students.json
 *   ├── parents.json
 *   └── ... (all tables)
 */

import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

const V1_DATABASE_URL = process.env.V1_DATABASE_URL;
if (!V1_DATABASE_URL) {
  console.error('');
  console.error('❌  V1_DATABASE_URL is required.');
  console.error('    Example:');
  console.error('    V1_DATABASE_URL="postgresql://user:pass@localhost:5432/school_db" \\');
  console.error('      npx tsx scripts/migrate-v1-to-v2/export-v1-data.ts');
  console.error('');
  process.exit(1);
}

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT_DIR = path.join(__dirname, 'data', `export-${TIMESTAMP}`);

// V1 tables to export (in dependency order)
const TABLES = [
  'classes',
  'subjects',
  'teachers',
  'students',
  'parents',
  'student_parents',
  'subject_teachers',
  'teacher_classes',
  'grades',
  'attendance',
  'student_monthly_summaries',
  'users',
  'grade_confirmations',
  'audit_logs',
];

// Optional tables – skip gracefully if missing
const OPTIONAL_TABLES: string[] = [];

async function tableExists(client: Client, tableName: string): Promise<boolean> {
  const res = await client.query(
    `SELECT EXISTS (
       SELECT FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     )`,
    [tableName]
  );
  return res.rows[0].exists;
}

async function getColumnNames(client: Client, tableName: string): Promise<Set<string>> {
  const res = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return new Set(res.rows.map((r: any) => r.column_name));
}

async function exportTable(
  client: Client,
  tableName: string,
  outDir: string,
  optional = false
): Promise<{ table: string; count: number; skipped: boolean }> {
  const exists = await tableExists(client, tableName);
  if (!exists) {
    if (optional) {
      console.log(`  ⚠️  ${tableName}: table not found (optional – skipping)`);
      return { table: tableName, count: 0, skipped: true };
    }
    throw new Error(`Required table "${tableName}" does not exist in V1 database.`);
  }

  // Detect best sort column — V1 tables are inconsistent (some have createdAt, some updatedAt, some id)
  const columns = await getColumnNames(client, tableName);
  const orderBy = columns.has('createdAt')
    ? `ORDER BY "createdAt" ASC NULLS LAST`
    : columns.has('updatedAt')
      ? `ORDER BY "updatedAt" ASC NULLS LAST`
      : columns.has('id')
        ? `ORDER BY "id" ASC`
        : '';  // no suitable sort column – return in natural order

  const res = await client.query(`SELECT * FROM "${tableName}" ${orderBy}`);
  const filePath = path.join(outDir, `${tableName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(res.rows, null, 2), 'utf8');

  const sizeKb = (Buffer.byteLength(JSON.stringify(res.rows)) / 1024).toFixed(1);
  console.log(`  ✅  ${tableName.padEnd(30)} ${String(res.rows.length).padStart(6)} rows  (${sizeKb} KB)`);
  return { table: tableName, count: res.rows.length, skipped: false };
}

async function main() {
  const startTime = Date.now();
  console.log('');
  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│  V1 → V2 Migration:  Export V1 Data             │');
  console.log('└─────────────────────────────────────────────────┘');
  console.log('');
  console.log(`  Source DB : ${V1_DATABASE_URL!.replace(/:\/\/[^@]+@/, '://<credentials>@')}`);
  console.log(`  Output    : ${OUT_DIR}`);
  console.log('');

  const client = new Client({ connectionString: V1_DATABASE_URL });

  try {
    await client.connect();
    console.log('  ✅  Connected to V1 database');
    console.log('');

    fs.mkdirSync(OUT_DIR, { recursive: true });

    const counts: Record<string, number> = {};
    const skipped: string[] = [];

    // Export required tables
    for (const table of TABLES) {
      const result = await exportTable(client, table, OUT_DIR, false);
      counts[table] = result.count;
    }

    // Export optional tables
    for (const table of OPTIONAL_TABLES) {
      const result = await exportTable(client, table, OUT_DIR, true);
      if (result.skipped) {
        skipped.push(table);
      } else {
        counts[table] = result.count;
      }
    }

    // Write metadata
    const metadata = {
      exportedAt: new Date().toISOString(),
      source: 'V1_SchoolManagementApp',
      exportVersion: '2.0',
      durationMs: Date.now() - startTime,
      tableCounts: counts,
      skippedTables: skipped,
    };
    fs.writeFileSync(path.join(OUT_DIR, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

    const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('');
    console.log('┌─────────────────────────────────────────────────┐');
    console.log('│  Export Complete                                 │');
    console.log('└─────────────────────────────────────────────────┘');
    console.log(`  Total rows : ${totalRows.toLocaleString()}`);
    console.log(`  Duration   : ${duration}s`);
    console.log(`  Output dir : ${OUT_DIR}`);
    console.log('');
    console.log('  Next step – import to V2:');
    console.log(`    IMPORT_DIR="${OUT_DIR}" DRY_RUN=true npx tsx scripts/migrate-v1-to-v2/import-to-v2.ts`);
    console.log('');
  } catch (err) {
    console.error('');
    console.error('❌  Export failed:', err);
    console.error('');
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
