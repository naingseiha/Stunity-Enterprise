/**
 * QA smoke against attendance-service school-ops endpoints.
 * Prerequisites: auth-service + attendance-service running.
 *
 * Required env (never commit real passwords):
 *   ATTENDANCE_SMOKE_ADMIN_EMAIL
 *   ATTENDANCE_SMOKE_ADMIN_PASSWORD
 *
 * Usage:
 *   ATTENDANCE_SMOKE_ADMIN_EMAIL=x ATTENDANCE_SMOKE_ADMIN_PASSWORD=y node scripts/testing/manual/attendance-ops-api-smoke.mjs
 *
 * Env overrides:
 *   AUTH_BASE_URL, ATTENDANCE_BASE_URL
 *   ATTENDANCE_SMOKE_TEACHER_EMAIL, ATTENDANCE_SMOKE_TEACHER_PASSWORD (optional — TEACHER 403 assertions)
 */

const authBase = process.env.AUTH_BASE_URL || 'http://127.0.0.1:3001';
const attendanceBase = process.env.ATTENDANCE_BASE_URL || 'http://127.0.0.1:3008';
const adminEmail = (process.env.ATTENDANCE_SMOKE_ADMIN_EMAIL || '').trim();
const adminPassword = process.env.ATTENDANCE_SMOKE_ADMIN_PASSWORD || '';
const teacherEmail = process.env.ATTENDANCE_SMOKE_TEACHER_EMAIL || '';
const teacherPassword = process.env.ATTENDANCE_SMOKE_TEACHER_PASSWORD || '';
const timeoutMs = Number(process.env.ATTENDANCE_SMOKE_TIMEOUT_MS || 15000);

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, ...detail });
}

async function http(base, path, { method = 'GET', token, accept } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (accept) headers.Accept = accept;

  try {
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: res.status, ok: res.ok, headers: res.headers, text, json };
  } catch (e) {
    return {
      status: 0,
      ok: false,
      headers: null,
      text: String(e?.message || e),
      json: null,
      error: e,
    };
  }
}

async function login(email, password) {
  let bodyRes;
  try {
    bodyRes = await fetch(`${authBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw new Error(`Cannot reach auth: ${e?.message || e}`);
  }
  const txt = await bodyRes.text();
  let json;
  try {
    json = JSON.parse(txt);
  } catch {
    throw new Error(`Login parse error ${bodyRes.status}: ${txt.slice(0, 200)}`);
  }
  if (!json.success || !json.data?.tokens?.accessToken) {
    throw new Error(`Login failed (${email}): ${bodyRes.status} ${txt.slice(0, 240)}`);
  }
  return json.data.tokens.accessToken;
}

function monthRangeISO() {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const end = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
  return { start, end };
}

async function main() {
  if (!adminEmail || !adminPassword) {
    console.error(
      'Missing ATTENDANCE_SMOKE_ADMIN_EMAIL or ATTENDANCE_SMOKE_ADMIN_PASSWORD. Refusing to run with baked-in credentials.',
    );
    process.exit(1);
  }

  const health = await http(attendanceBase, '/health');
  record('GET /health returns 200', health.status === 200 && health.json?.success === true, {
    status: health.status,
  });

  const ready = await http(attendanceBase, '/health/ready');
  record(
    'GET /health/ready returns 200 + ready (DB up)',
    ready.status === 200 && ready.json?.ready === true && ready.json?.success === true,
    { status: ready.status },
  );

  const unauthorized = await http(attendanceBase, '/attendance/school/summary?startDate=2026-05-01&endDate=2026-05-03');
  record(
    'GET school/summary without token returns 401 or 403',
    unauthorized.status === 401 || unauthorized.status === 403,
    { status: unauthorized.status }
  );

  let adminToken;
  try {
    adminToken = await login(adminEmail, adminPassword);
  } catch (e) {
    record('login admin', false, { error: String(e?.message || e) });
    printSummary(true);
    process.exit(1);
  }
  record('login admin', true, {});

  const { start, end } = monthRangeISO();
  const qs = `startDate=${start}&endDate=${end}`;

  const adminSummary = await http(
    attendanceBase,
    `/attendance/school/summary?${qs}`,
    { token: adminToken }
  );
  record(
    'GET school/summary as admin returns 200 + success JSON',
    adminSummary.status === 200 && adminSummary.json?.success === true && adminSummary.json?.data,
    { status: adminSummary.status }
  );

  const adminExport = await http(
    attendanceBase,
    `/attendance/school/audit-export?${qs}`,
    { token: adminToken }
  );
  const csvLikely =
    adminExport.status === 200 &&
    typeof adminExport.text === 'string' &&
    (adminExport.text.includes(',') || adminExport.text.includes('\ufeff'));
  record(
    'GET school/audit-export as admin returns 200 CSV-like body',
    csvLikely,
    { status: adminExport.status, bytes: adminExport.text?.length }
  );

  if (teacherEmail && teacherPassword) {
    try {
      const teacherToken = await login(teacherEmail, teacherPassword);
      const tSummary = await http(
        attendanceBase,
        `/attendance/school/summary?${qs}`,
        { token: teacherToken }
      );
      record('GET school/summary as teacher returns 403', tSummary.status === 403, { status: tSummary.status });

      const tExport = await http(
        attendanceBase,
        `/attendance/school/audit-export?${qs}`,
        { token: teacherToken }
      );
      record('GET audit-export as teacher returns 403', tExport.status === 403, { status: tExport.status });
    } catch (e) {
      record('teacher-role checks skipped (login failed)', false, { error: String(e?.message || e) });
    }
  } else {
    record('teacher-role checks skipped (set ATTENDANCE_SMOKE_TEACHER_EMAIL/PASSWORD)', true, {});
  }

  printSummary();
  const failed = results.filter((r) => !r.ok).length;
  process.exitCode = failed ? 1 : 0;
}

function printSummary(fromAuthFailure = false) {
  console.log(`\nattendance-ops-api-smoke (${fromAuthFailure ? 'partial' : 'done'})\n`);
  for (const r of results) {
    console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.name}`);
    const { name, ok, ...rest } = r;
    if (Object.keys(rest).length) console.log('       ', JSON.stringify(rest));
  }
  const failed = results.filter((x) => !x.ok).length;
  console.log(`\n${failed ? failed + ' failed' : 'all passed'}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
