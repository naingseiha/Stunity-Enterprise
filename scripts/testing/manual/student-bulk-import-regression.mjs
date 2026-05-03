#!/usr/bin/env node

const AUTH_URL = process.env.AUTH_BASE_URL || 'http://127.0.0.1:3001';
const STUDENT_URL = process.env.STUDENT_BASE_URL || 'http://127.0.0.1:3003';
const CLASS_URL = process.env.CLASS_BASE_URL || 'http://127.0.0.1:3005';
const QA_EMAIL = process.env.QA_EMAIL || 'qa-admin-20260322064250@stunity.test';
const QA_PASSWORD = process.env.QA_PASSWORD || 'QaSchool2026!';
const ROWS_PER_GROUP = Number(process.env.ROWS_PER_GROUP || 4);

async function request(url, options = {}, timeoutMs = 90000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text };
    }

    if (!response.ok) {
      const error = new Error(`${options.method || 'GET'} ${url} failed ${response.status}`);
      error.status = response.status;
      error.body = body;
      throw error;
    }

    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function assert(condition, message, detail) {
  if (!condition) {
    const error = new Error(message);
    error.detail = detail;
    throw error;
  }
}

function makeStudent(batch, group, index, classId) {
  const row = String(index).padStart(2, '0');
  const suffix = `${batch}${group}${row}`;
  return {
    firstName: `Regression${group}${row}`,
    lastName: 'Bulk',
    khmerName: `Bulk Regression${group}${row}`,
    englishName: `Regression ${group} Student ${row}`,
    englishFirstName: `Regression${group}${row}`,
    englishLastName: 'Bulk',
    gender: index % 2 === 0 ? 'FEMALE' : 'MALE',
    dateOfBirth: `2010-08-${String((index % 20) + 1).padStart(2, '0')}`,
    phoneNumber: `85588${suffix.slice(-8)}`,
    email: `qa.regression.${group.toLowerCase()}.${suffix}@stunity.test`,
    placeOfBirth: 'Phnom Penh',
    currentAddress: 'QA regression address',
    parentPhone: `85589${suffix.slice(-8)}`,
    previousSchool: `QA Regression ${group} Previous School`,
    grade9ExamCenter: `QA Regression ${group} Grade 9 Center`,
    grade12Track: 'Science',
    remarks: `QA regression bulk ${group} ${batch}`,
    futureRegionalStudentCode: `FUTURE-${suffix}`,
    ...(classId ? { classId } : {}),
  };
}

const started = Date.now();
const batch = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

try {
  const login = await request(`${AUTH_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });
  const session = login.data || login;
  const token = session.tokens?.accessToken;
  assert(token, 'Login did not return an access token');
  assert(session.school?.educationModel === 'KHM_MOEYS', 'QA school is not configured for KHM_MOEYS', session.school);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const classes = await request(`${CLASS_URL}/classes`, { headers });
  const classList = Array.isArray(classes.data) ? classes.data : [];
  const targetClass =
    classList.find(item => String(item.grade) === '12' && String(item.section).toUpperCase() === 'B') ||
    classList[0];
  assert(targetClass?.id, 'No target class found for regression test');

  const students = [
    ...Array.from({ length: ROWS_PER_GROUP }, (_, index) => makeStudent(batch, 'A', index + 1, targetClass.id)),
    ...Array.from({ length: ROWS_PER_GROUP }, (_, index) => makeStudent(batch, 'U', index + 1)),
  ];

  const imported = await request(`${STUDENT_URL}/students/import`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ students }),
  });

  assert(imported.success === true, 'Student import endpoint did not succeed', imported);
  assert(imported.data?.count === students.length, 'Unexpected import count', imported.data);
  assert(imported.data?.assignedCount === ROWS_PER_GROUP, 'Unexpected assigned count', imported.data);

  const allStudents = await request(`${STUDENT_URL}/students`, { headers });
  const classRoster = await request(`${CLASS_URL}/classes/${targetClass.id}/students`, { headers });
  const rows = (allStudents.data || []).filter(student =>
    (student.customFields?.regional?.remarks || '').endsWith(batch)
  );
  const assigned = rows.filter(student => (student.customFields?.regional?.remarks || '').includes('bulk A'));
  const unassigned = rows.filter(student => (student.customFields?.regional?.remarks || '').includes('bulk U'));
  const rosterIds = new Set((classRoster.data || []).map(student => student.id));

  assert(assigned.length === ROWS_PER_GROUP, 'Assigned row count mismatch', assigned.length);
  assert(assigned.every(student => student.classId === targetClass.id), 'Assigned students are missing classId');
  assert(assigned.every(student => rosterIds.has(student.id)), 'Assigned students are missing from class roster');
  assert(unassigned.length === ROWS_PER_GROUP, 'Unassigned row count mismatch', unassigned.length);
  assert(unassigned.every(student => !student.classId), 'Unassigned students should not have classId');

  const sampleAssigned = assigned[0]?.customFields?.regional || {};
  assert(sampleAssigned.previousSchool, 'Cambodia previousSchool field was not saved');
  assert(sampleAssigned.grade9ExamCenter, 'Cambodia grade9ExamCenter field was not saved');
  assert(sampleAssigned.grade12Track === 'Science', 'Cambodia grade12Track field was not saved');
  assert(sampleAssigned.futureRegionalStudentCode?.startsWith('FUTURE-'), 'Future custom field was not passed through');

  let invalidClassRejected = false;
  try {
    await request(`${STUDENT_URL}/students/import`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ students: [makeStudent(batch, 'BADCLASS', 1, 'not-a-real-class')] }),
    });
  } catch (error) {
    invalidClassRejected = error.status === 400;
  }
  assert(invalidClassRejected, 'Invalid class import was not rejected');

  let validationErrors = [];
  try {
    await request(`${STUDENT_URL}/students/import`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        students: [
          { lastName: 'MissingFirst', gender: 'MALE', dateOfBirth: '2010-01-01' },
          { firstName: 'MissingGender', lastName: 'Bulk', khmerName: 'Bulk MissingGender', dateOfBirth: '2010-01-01' },
        ],
      }),
    });
  } catch (error) {
    validationErrors = error.body?.errors || [];
  }
  assert(validationErrors.length >= 2, 'Expected multiple row validation errors', validationErrors);

  const elapsedMs = Date.now() - started;
  console.log(JSON.stringify({
    success: true,
    batch,
    elapsedMs,
    rowsImported: students.length,
    targetClass: { id: targetClass.id, name: targetClass.name },
    checks: {
      assignedRows: assigned.length,
      unassignedRows: unassigned.length,
      assignedInRoster: assigned.filter(student => rosterIds.has(student.id)).length,
      invalidClassRejected,
      validationErrorCount: validationErrors.length,
    },
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    success: false,
    message: error.message,
    detail: error.detail || error.body || null,
  }, null, 2));
  process.exit(1);
}
