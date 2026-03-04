/**
 * Database safety check — prevents destructive or schema-changing commands
 * from running against production Supabase (or other production DBs) by mistake.
 *
 * Use for: db push, migrate dev, seed, reset-to-clean, or any script that
 * modifies schema or deletes/overwrites data.
 *
 * Set ALLOW_PRODUCTION_DB=1 only in CI/deploy when you intentionally target production
 * (e.g. running migrations in a release pipeline). Never set it for local dev.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from repo root (when run from root) or cwd so DATABASE_URL is set
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL || '';
const DIRECT_URL = process.env.DIRECT_URL || '';
const ALLOW = process.env.ALLOW_PRODUCTION_DB === '1' || process.env.ALLOW_PRODUCTION_DB === 'true';

// Patterns that indicate production / Supabase (do not use for local dev with real prod data)
const PRODUCTION_PATTERNS = [
  'supabase.co',
  'pooler.supabase.com',
  '.supabase.com:6543',
  '.supabase.com:5432',
];

function red(s: string): string {
  return `\x1b[31m${s}\x1b[0m`;
}
function yellow(s: string): string {
  return `\x1b[33m${s}\x1b[0m`;
}
function bold(s: string): string {
  return `\x1b[1m${s}\x1b[0m`;
}

function looksLikeProduction(url: string): boolean {
  if (!url || url.includes('localhost') || url.includes('127.0.0.1')) return false;
  const lower = url.toLowerCase();
  return PRODUCTION_PATTERNS.some((p) => lower.includes(p));
}

function maskUrl(url: string): string {
  try {
    const u = url.replace(/:[^:@]+@/, ':****@');
    return u.length > 60 ? u.slice(0, 57) + '...' : u;
  } catch {
    return '(invalid url)';
  }
}

/**
 * Run the safety check. Exits process with code 1 if target looks like production
 * and ALLOW_PRODUCTION_DB is not set. Returns normally otherwise.
 */
export function runDbSafetyCheck(): void {
  const urlToCheck = DATABASE_URL || DIRECT_URL;
  if (!urlToCheck) {
    console.error(red('DATABASE_URL (and optionally DIRECT_URL) must be set.'));
    process.exit(1);
  }

  if (ALLOW) {
    return; // Intended production run (e.g. deploy pipeline).
  }

  if (looksLikeProduction(urlToCheck)) {
    console.error('');
    console.error(bold(red('⚠️  Supabase / production database — destructive commands blocked')));
    console.error('');
    console.error(yellow('Your DATABASE_URL points at Supabase (real data).'));
    console.error(yellow('This command would change or wipe data, so it is blocked to keep your data safe.'));
    console.error('');
    console.error('  URL: ' + maskUrl(urlToCheck));
    console.error('');
    console.error('  Blocked commands: db push, migrate dev, seed, reset-to-clean.');
    console.error('  Running the app or services (normal read/write via API) is still allowed.');
    console.error('');
    console.error('  To run this command anyway (e.g. in a deploy pipeline), set:');
    console.error('    ALLOW_PRODUCTION_DB=1');
    console.error('');
    process.exit(1);
  }
}

// When run directly (e.g. tsx scripts/db-safety-check.ts): run the check and exit 0 if safe
const entryScript = process.argv[1] ?? '';
if (entryScript.includes('db-safety-check')) {
  runDbSafetyCheck();
  process.exit(0);
}
