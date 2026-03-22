#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const SCHOOL_SERVICE_URL = process.env.SCHOOL_SERVICE_URL || 'http://localhost:3002';
const STUDENT_SERVICE_URL = process.env.STUDENT_SERVICE_URL || 'http://localhost:3003';
const TEACHER_SERVICE_URL = process.env.TEACHER_SERVICE_URL || 'http://localhost:3004';
const CLASS_SERVICE_URL = process.env.CLASS_SERVICE_URL || 'http://localhost:3005';
const SUBJECT_SERVICE_URL = process.env.SUBJECT_SERVICE_URL || 'http://localhost:3006';
const GRADE_SERVICE_URL = process.env.GRADE_SERVICE_URL || 'http://localhost:3007';
const ATTENDANCE_SERVICE_URL = process.env.ATTENDANCE_SERVICE_URL || 'http://localhost:3008';
const TIMETABLE_SERVICE_URL = process.env.TIMETABLE_SERVICE_URL || 'http://localhost:3009';
const MESSAGING_SERVICE_URL = process.env.MESSAGING_SERVICE_URL || 'http://localhost:3011';

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'superadmin@stunity.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'StunityAdmin2026!';

const SCHOOL_TYPE = process.env.TEST_SCHOOL_TYPE || 'HIGH_SCHOOL';
const TRIAL_MONTHS = Number(process.env.TEST_SCHOOL_TRIAL_MONTHS || '3');
const STUDENTS_PER_CLASS = Number(process.env.TEST_STUDENTS_PER_CLASS || '4');
const DEFAULT_ADMIN_PASSWORD = process.env.TEST_SCHOOL_ADMIN_PASSWORD || 'QaSchool2026!';
const DEFAULT_PARENT_PASSWORD = process.env.TEST_PARENT_PASSWORD || 'ParentPass2026!';

const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const schoolName = process.env.TEST_SCHOOL_NAME || `Stunity QA School ${stamp}`;
const schoolEmail = process.env.TEST_SCHOOL_EMAIL || `qa-school-${stamp}@stunity.test`;
const adminEmail = process.env.TEST_SCHOOL_ADMIN_EMAIL || `qa-admin-${stamp}@stunity.test`;
const uniquePhoneSuffix = stamp.slice(-6);
const uniqueAdminPhone = process.env.TEST_SCHOOL_ADMIN_PHONE || `+85512${uniquePhoneSuffix}`;
const uniqueClassPrefix = `QA-${stamp.slice(-8)}`;

const GRADES = ['10', '11', '12'];
const SECTIONS = ['A', 'B'];
const GRADE_TRACKS = {
  '10': 'Foundation',
  '11': 'Science',
  '12': 'Exam Prep',
};

const TEACHER_BLUEPRINTS = [
  { key: 'KH', firstName: 'Sophal', lastName: 'Chan', khmerName: 'សុផល ចាន់', position: 'Khmer Language Teacher', subjectCodes: ['KH'] },
  { key: 'MATH', firstName: 'Piseth', lastName: 'Mao', khmerName: 'ពិសិដ្ឋ ម៉ៅ', position: 'Mathematics Teacher', subjectCodes: ['MATH'] },
  { key: 'ENG', firstName: 'Sreyleak', lastName: 'Kim', khmerName: 'ស្រីលាក់ គឹម', position: 'English Teacher', subjectCodes: ['ENG'] },
  { key: 'SCI', firstName: 'Dara', lastName: 'Prak', khmerName: 'ដារា ប្រក់', position: 'Science Teacher', subjectCodes: ['PHY', 'CHEM'] },
  { key: 'BIO', firstName: 'Vanna', lastName: 'Heng', khmerName: 'វណ្ណា ហេង', position: 'Biology Teacher', subjectCodes: ['BIO'] },
  { key: 'SOC', firstName: 'Chanthy', lastName: 'Sok', khmerName: 'ចន្ទី សុខ', position: 'Social Studies Teacher', subjectCodes: ['HIST', 'GEO', 'CIV'] },
  { key: 'PE', firstName: 'Rithy', lastName: 'Chea', khmerName: 'រិទ្ធី ជា', position: 'Physical Education Teacher', subjectCodes: ['PE'] },
  { key: 'CS', firstName: 'Sothea', lastName: 'Ly', khmerName: 'សុធា លី', position: 'Computer Science Teacher', subjectCodes: ['CS'] },
  { key: 'ART', firstName: 'Bopha', lastName: 'Tan', khmerName: 'បុប្ផា តាន់', position: 'Arts Teacher', subjectCodes: ['ART', 'MUS'] },
  { key: 'VOC', firstName: 'Kosal', lastName: 'Lim', khmerName: 'កុសល លឹម', position: 'Life Skills Teacher', subjectCodes: ['HE', 'AGR'] },
];

const STUDENT_FIRST_NAMES = ['Sokha', 'Sophea', 'Vanna', 'Dara', 'Sothea', 'Chanthy', 'Piseth', 'Kosal', 'Sreymom', 'Bopha', 'Leakhena', 'Chanmony'];
const STUDENT_LAST_NAMES = ['Chan', 'Lim', 'Prak', 'Kong', 'Heng', 'Sok', 'Mao', 'Chea', 'Kim', 'Tan', 'Seng', 'Pich'];
const PARENT_FIRST_NAMES = ['Maly', 'Sokun', 'Rina', 'Sopheap', 'Mony', 'Sreypov', 'Savuth', 'Rathana'];
const PARENT_LAST_NAMES = ['Chan', 'Lim', 'Prak', 'Kong', 'Heng', 'Sok', 'Mao', 'Chea'];
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || '12');

let prismaClient = null;

function logSection(title) {
  console.log(`\n=== ${title} ===`);
}

function getPrisma() {
  if (!prismaClient) {
    prismaClient = new PrismaClient();
  }

  return prismaClient;
}

async function disconnectPrisma() {
  if (!prismaClient) {
    return;
  }

  await prismaClient.$disconnect();
  prismaClient = null;
}

function buildSeedPhone(prefix, index) {
  const runOffset = Number(uniquePhoneSuffix);
  return `+855${prefix}${String((runOffset + index) % 1000000).padStart(6, '0')}`;
}

function buildParentProfile(student, index) {
  return {
    relationship: index % 2 === 0 ? 'MOTHER' : 'FATHER',
    firstName: PARENT_FIRST_NAMES[index % PARENT_FIRST_NAMES.length],
    lastName: PARENT_LAST_NAMES[index % PARENT_LAST_NAMES.length],
    email: `qa-parent-${stamp}-${index}@stunity.test`,
    phone: student.parentPhone,
  };
}

async function requestJson(url, options = {}, label = url) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.error || data.message || `${label} failed`;
    throw new Error(`${label} [${response.status}]: ${message}`);
  }

  return data;
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function schoolRegistrationPayload() {
  return {
    schoolName,
    email: schoolEmail,
    phone: '+855 23 900 001',
    address: 'Phnom Penh, Cambodia (QA Test School)',
    adminFirstName: 'QA',
    adminLastName: 'Admin',
    adminEmail: adminEmail,
    adminPassword: DEFAULT_ADMIN_PASSWORD,
    adminPhone: uniqueAdminPhone,
    schoolType: SCHOOL_TYPE,
    trialMonths: TRIAL_MONTHS,
  };
}

async function loginAdmin(email, password) {
  const result = await requestJson(
    `${AUTH_SERVICE_URL}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
    `login ${email}`
  );

  return result.data.tokens.accessToken;
}

async function registerSchool() {
  return requestJson(
    `${SCHOOL_SERVICE_URL}/schools/register`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schoolRegistrationPayload()),
    },
    'school registration'
  );
}

async function approveSchool(superToken, schoolId) {
  return requestJson(
    `${SCHOOL_SERVICE_URL}/super-admin/schools/${schoolId}/approve`,
    {
      method: 'POST',
      headers: authHeaders(superToken),
    },
    'approve school'
  );
}

async function getCurrentAcademicYear(adminToken, schoolId) {
  const result = await requestJson(
    `${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/current`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    },
    'current academic year'
  );

  return result.data;
}

async function getOnboardingStatus(schoolId) {
  const result = await requestJson(
    `${SCHOOL_SERVICE_URL}/schools/${schoolId}/onboarding/status`,
    undefined,
    'onboarding status'
  );

  return result.data;
}

async function setOnboardingStep(schoolId, step, completed, skipped = false) {
  return requestJson(
    `${SCHOOL_SERVICE_URL}/schools/${schoolId}/onboarding/step`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step, completed, skipped }),
    },
    `onboarding step ${step}`
  );
}

async function completeOnboarding(schoolId) {
  return requestJson(
    `${SCHOOL_SERVICE_URL}/schools/${schoolId}/onboarding/complete`,
    {
      method: 'POST',
    },
    'complete onboarding'
  );
}

async function ensureDefaultPeriods(adminToken) {
  const result = await requestJson(
    `${TIMETABLE_SERVICE_URL}/periods/bulk`,
    {
      method: 'POST',
      headers: authHeaders(adminToken),
    },
    'create default periods'
  );

  return result.data.periods;
}

async function fetchSubjectsByGrade(adminToken, grades) {
  const subjectMap = new Map();

  for (const grade of grades) {
    const subjects = await requestJson(
      `${SUBJECT_SERVICE_URL}/subjects/lightweight?grade=${grade}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      },
      `subjects for grade ${grade}`
    );

    subjects.forEach((subject) => {
      subjectMap.set(`${subject.code}:${subject.grade}`, subject);
    });
  }

  return subjectMap;
}

async function createClasses(adminToken, academicYearId) {
  const classes = [];

  for (const grade of GRADES) {
    for (const section of SECTIONS) {
      const name = `Grade ${grade}${section}`;
      const classResult = await requestJson(
        `${CLASS_SERVICE_URL}/classes`,
        {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            classId: `${uniqueClassPrefix}-${grade}${section}`,
            name,
            grade,
            section,
            track: GRADE_TRACKS[grade],
            academicYearId,
            capacity: 40,
            room: `QA-${grade}${section}`,
          }),
        },
        `create class ${name}`
      );

      classes.push(classResult.data);
    }
  }

  return classes;
}

async function createTeachers(adminToken, subjectMap, classes) {
  const classIds = classes.map((entry) => entry.id);
  const teachers = [];

  for (let index = 0; index < TEACHER_BLUEPRINTS.length; index += 1) {
    const blueprint = TEACHER_BLUEPRINTS[index];
    const subjectIds = [];

    for (const grade of GRADES) {
      for (const code of blueprint.subjectCodes) {
        const subject = subjectMap.get(`${code}-${grade}:${grade}`) || subjectMap.get(`${code}:${grade}`);
        if (!subject) {
          throw new Error(`Missing subject ${code}-${grade} required for ${blueprint.position}`);
        }
        subjectIds.push(subject.id);
      }
    }

    const homeroomClass = classes[index] || null;
    const phone = buildSeedPhone('31', index);
    const teacherResult = await requestJson(
      `${TEACHER_SERVICE_URL}/teachers`,
      {
        method: 'POST',
        headers: authHeaders(adminToken),
        body: JSON.stringify({
          firstName: blueprint.firstName,
          lastName: blueprint.lastName,
          khmerName: blueprint.khmerName,
          englishName: `${blueprint.firstName} ${blueprint.lastName}`,
          email: `${blueprint.key.toLowerCase()}.${stamp}@stunity.test`,
          phone,
          gender: index % 2 === 0 ? 'MALE' : 'FEMALE',
          dateOfBirth: `198${index % 10}-0${(index % 9) + 1}-15`,
          hireDate: `2024-0${(index % 9) + 1}-01`,
          address: 'Phnom Penh, Cambodia',
          position: blueprint.position,
          subjectIds,
          classIds,
          homeroomClassId: homeroomClass?.id || undefined,
        }),
      },
      `create teacher ${blueprint.position}`
    );

    teachers.push({
      ...teacherResult.data,
      subjectCodes: blueprint.subjectCodes,
    });
  }

  return teachers;
}

async function assignHomeroomTeachers(adminToken, classes, teachers) {
  for (let index = 0; index < classes.length; index += 1) {
    const teacher = teachers[index % teachers.length];
    await requestJson(
      `${CLASS_SERVICE_URL}/classes/${classes[index].id}`,
      {
        method: 'PUT',
        headers: authHeaders(adminToken),
        body: JSON.stringify({
          homeroomTeacherId: teacher.id,
        }),
      },
      `assign homeroom teacher to ${classes[index].name}`
    );
  }
}

async function assignTeacherSubjectsForTimetable(adminToken, teachers, subjectMap) {
  for (const teacher of teachers) {
    for (const code of teacher.subjectCodes) {
      for (const grade of GRADES) {
        const subject = subjectMap.get(`${code}-${grade}:${grade}`) || subjectMap.get(`${code}:${grade}`);
        if (!subject) continue;

        await requestJson(
          `${TIMETABLE_SERVICE_URL}/teacher-subjects`,
          {
            method: 'POST',
            headers: authHeaders(adminToken),
            body: JSON.stringify({
              teacherId: teacher.id,
              subjectId: subject.id,
              isPrimary: true,
              maxPeriodsPerWeek: 40,
              preferredGrades: [grade],
            }),
          },
          `assign timetable subject ${subject.code} to ${teacher.firstName}`
        );
      }
    }
  }
}

async function autoAssignTimetables(adminToken, classes, academicYearId) {
  const results = [];

  for (const entry of classes) {
    const result = await requestJson(
      `${TIMETABLE_SERVICE_URL}/timetable/auto-assign`,
      {
        method: 'POST',
        headers: authHeaders(adminToken),
        body: JSON.stringify({
          classId: entry.id,
          academicYearId,
          options: {
            clearExisting: true,
            balanceWorkload: true,
          },
        }),
      },
      `auto assign timetable for ${entry.name}`
    );

    results.push({
      classId: entry.id,
      className: entry.name,
      ...result.data,
    });
  }

  return results;
}

async function createStudents(adminToken, classes) {
  const students = [];
  let index = 0;

  for (const entry of classes) {
    for (let i = 0; i < STUDENTS_PER_CLASS; i += 1) {
      const firstName = STUDENT_FIRST_NAMES[index % STUDENT_FIRST_NAMES.length];
      const lastName = STUDENT_LAST_NAMES[(index + i) % STUDENT_LAST_NAMES.length];
      const gender = index % 2 === 0 ? 'MALE' : 'FEMALE';
      const parentPhone = buildSeedPhone('88', index);

      const result = await requestJson(
        `${STUDENT_SERVICE_URL}/students`,
        {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            firstName,
            lastName,
            khmerName: `${firstName} ${lastName}`,
            englishName: `${firstName} ${lastName}`,
            gender,
            dateOfBirth: `200${8 + (index % 3)}-0${(i % 9) + 1}-1${i % 8}`,
            placeOfBirth: 'Phnom Penh',
            currentAddress: 'Phnom Penh, Cambodia',
            phoneNumber: buildSeedPhone('97', index),
            parentPhone,
            parentOccupation: 'Farmer',
            fatherName: `Father ${lastName}`,
            motherName: `Mother ${lastName}`,
            remarks: 'Created by onboarding QA bootstrap',
            classId: entry.id,
          }),
        },
        `create student ${entry.name} #${i + 1}`
      );

      students.push({
        ...result.data,
        classId: entry.id,
        className: entry.name,
        grade: entry.grade,
        parentPhone,
      });

      index += 1;
    }
  }

  return students;
}

async function registerParents(students) {
  const parents = [];
  let apiValidated = false;
  let directSeedOnly = process.env.TEST_PARENT_SEED_MODE === 'db';

  for (let index = 0; index < students.length; index += 1) {
    const student = students[index];
    const profile = buildParentProfile(student, index);

    if (!directSeedOnly && !apiValidated) {
      try {
        const result = await requestJson(
          `${AUTH_SERVICE_URL}/auth/parent/register`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName: profile.firstName,
              lastName: profile.lastName,
              email: profile.email,
              phone: profile.phone,
              password: DEFAULT_PARENT_PASSWORD,
              studentId: student.id,
              relationship: profile.relationship,
            }),
          },
          `register parent for ${student.studentId || student.id}`
        );

        parents.push({
          ...result.data,
          phone: profile.phone,
          relationship: profile.relationship,
          studentId: student.id,
          studentCode: student.studentId || null,
          seedMode: 'api',
        });

        apiValidated = true;
        continue;
      } catch (error) {
        if (!String(error).includes('[429]')) {
          throw error;
        }

        directSeedOnly = true;
        console.warn('Parent registration rate limit reached; falling back to direct QA seeding for remaining parents.');
      }
    }

    const prisma = getPrisma();
    const hashedPassword = await bcrypt.hash(DEFAULT_PARENT_PASSWORD, BCRYPT_ROUNDS);
    const parent = await prisma.$transaction(async (tx) => {
      const createdParent = await tx.parent.create({
        data: {
          parentId: `PQA-${uniquePhoneSuffix}-${String(index + 1).padStart(3, '0')}`,
          firstName: profile.firstName,
          lastName: profile.lastName,
          englishName: `${profile.firstName} ${profile.lastName}`,
          email: profile.email,
          phone: profile.phone,
          relationship: profile.relationship,
          occupation: 'QA Test Parent',
          isAccountActive: true,
          customFields: {
            regional: {
              khmerName: `${profile.firstName} ${profile.lastName}`,
            },
          },
        },
      });

      await tx.studentParent.create({
        data: {
          studentId: student.id,
          parentId: createdParent.id,
          relationship: profile.relationship,
          isPrimary: true,
        },
      });

      await tx.user.create({
        data: {
          email: profile.email,
          phone: profile.phone,
          password: hashedPassword,
          firstName: profile.firstName,
          lastName: profile.lastName,
          role: 'PARENT',
          parentId: createdParent.id,
          schoolId: student.schoolId,
          isActive: true,
          isDefaultPassword: false,
        },
      });

      return createdParent;
    });

    parents.push({
      parentId: parent.id,
      userId: null,
      phone: profile.phone,
      relationship: profile.relationship,
      studentId: student.id,
      studentCode: student.studentId || null,
      seedMode: 'db',
    });
  }

  return parents;
}

async function seedAttendance(adminToken, classes, students) {
  const today = new Date().toISOString().slice(0, 10);

  for (const entry of classes) {
    const classStudents = students.filter((student) => student.classId === entry.id);
    if (classStudents.length === 0) continue;

    await requestJson(
      `${ATTENDANCE_SERVICE_URL}/attendance/bulk`,
      {
        method: 'POST',
        headers: authHeaders(adminToken),
        body: JSON.stringify({
          classId: entry.id,
          date: today,
          session: 'MORNING',
          attendance: classStudents.map((student, index) => ({
            studentId: student.id,
            status: index === 0 ? 'LATE' : 'PRESENT',
            remarks: index === 0 ? 'QA late sample' : undefined,
          })),
        }),
      },
      `seed attendance for ${entry.name}`
    );
  }
}

async function seedGrades(adminToken, classes, students, subjectMap) {
  for (const entry of classes) {
    const classStudents = students.filter((student) => student.classId === entry.id);
    const classSubjects = Array.from(subjectMap.values())
      .filter((subject) => subject.grade === entry.grade)
      .slice(0, 5);

    if (classStudents.length === 0 || classSubjects.length === 0) continue;

    await requestJson(
      `${GRADE_SERVICE_URL}/grades/batch`,
      {
        method: 'POST',
        headers: authHeaders(adminToken),
        body: JSON.stringify({
          grades: classStudents.flatMap((student, studentIndex) =>
            classSubjects.map((subject, subjectIndex) => ({
              studentId: student.id,
              subjectId: subject.id,
              classId: entry.id,
              score: 72 + ((studentIndex + subjectIndex) % 24),
              month: 'Month 1',
              monthNumber: 1,
              maxScore: 100,
              remarks: 'Seeded by onboarding QA bootstrap',
            }))
          ),
        }),
      },
      `seed grades for ${entry.name}`
    );
  }
}

async function createMessagingSample(adminToken, parents, teachers, students) {
  const parent = parents[0];
  const teacher = teachers[0];
  const student = students[0];

  if (!parent || !teacher || !student) {
    return null;
  }

  const conversation = await requestJson(
    `${MESSAGING_SERVICE_URL}/conversations`,
    {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        targetParentId: parent.parentId,
        targetTeacherId: teacher.id,
        studentId: student.id,
      }),
    },
    'create messaging conversation'
  );

  await requestJson(
    `${MESSAGING_SERVICE_URL}/conversations/${conversation.data.id}/messages`,
    {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        content: 'Welcome to the QA test school. This is a seeded admin message.',
      }),
    },
    'seed admin message'
  );

  const parentLogin = await requestJson(
    `${AUTH_SERVICE_URL}/auth/parent/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: parent.phone,
        password: DEFAULT_PARENT_PASSWORD,
      }),
    },
    'parent login'
  );

  await requestJson(
    `${MESSAGING_SERVICE_URL}/conversations/${conversation.data.id}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${parentLogin.data.tokens.accessToken}`,
      },
      body: JSON.stringify({
        content: 'Parent reply from the QA bootstrap.',
      }),
    },
    'seed parent reply'
  );

  return {
    conversationId: conversation.data.id,
    parentPhone: parent.phone,
  };
}

async function main() {
  logSection('Logging In As Super Admin');
  const superToken = await loginAdmin(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);
  console.log(`Super admin authenticated: ${SUPER_ADMIN_EMAIL}`);

  logSection('Registering Test School');
  const registration = await registerSchool();
  const schoolId = registration.data.school.id;
  console.log(`Registered school: ${registration.data.school.name}`);
  console.log(`School ID: ${schoolId}`);

  logSection('Approving School');
  await approveSchool(superToken, schoolId);
  console.log('School approved');

  logSection('Logging In As School Admin');
  const adminToken = await loginAdmin(adminEmail, DEFAULT_ADMIN_PASSWORD);
  console.log(`School admin authenticated: ${adminEmail}`);

  logSection('Checking Initial Onboarding Status');
  const initialOnboarding = await getOnboardingStatus(schoolId);
  console.log(
    JSON.stringify(
      {
        school: initialOnboarding.school,
        checklist: initialOnboarding.checklist,
        academicYear: initialOnboarding.academicYear,
      },
      null,
      2
    )
  );

  const academicYear = await getCurrentAcademicYear(adminToken, schoolId);
  const periods = await ensureDefaultPeriods(adminToken);
  const subjectMap = await fetchSubjectsByGrade(adminToken, GRADES);

  logSection('Creating Classes');
  const classes = await createClasses(adminToken, academicYear.id);
  console.log(`Created ${classes.length} classes`);

  logSection('Creating Teachers');
  const teachers = await createTeachers(adminToken, subjectMap, classes);
  await assignHomeroomTeachers(adminToken, classes, teachers);
  await assignTeacherSubjectsForTimetable(adminToken, teachers, subjectMap);
  console.log(`Created ${teachers.length} teachers and linked timetable subject assignments`);
  await setOnboardingStep(schoolId, 'teachers', true);
  await setOnboardingStep(schoolId, 'classes', true);

  logSection('Creating Students');
  const students = await createStudents(adminToken, classes);
  console.log(`Created ${students.length} students`);
  await setOnboardingStep(schoolId, 'students', true);

  logSection('Registering Parents');
  const parents = await registerParents(students);
  console.log(`Registered ${parents.length} parent accounts`);

  logSection('Generating Timetable');
  const timetableResults = await autoAssignTimetables(adminToken, classes, academicYear.id);
  console.log(JSON.stringify(timetableResults, null, 2));

  logSection('Seeding Attendance And Grades');
  await seedAttendance(adminToken, classes, students);
  await seedGrades(adminToken, classes, students, subjectMap);
  console.log('Attendance and grade samples created');

  logSection('Creating Messaging Sample');
  const messaging = await createMessagingSample(adminToken, parents, teachers, students);
  if (messaging) {
    console.log(JSON.stringify(messaging, null, 2));
  }

  await completeOnboarding(schoolId);
  const finalOnboarding = await getOnboardingStatus(schoolId);

  logSection('Summary');
  console.log(JSON.stringify({
    school: {
      id: schoolId,
      name: schoolName,
      email: schoolEmail,
      adminEmail,
      adminPassword: DEFAULT_ADMIN_PASSWORD,
      onboardingUrl: `http://localhost:3000/en/onboarding?schoolId=${schoolId}`,
    },
    academicYear: {
      id: academicYear.id,
      name: academicYear.name,
    },
    counts: {
      grades: GRADES.length,
      classes: classes.length,
      teachers: teachers.length,
      students: students.length,
      parents: parents.length,
      periods: periods.length,
      canonicalSubjects: subjectMap.size,
    },
    parentLoginSample: parents[0]
      ? {
          phone: parents[0].phone,
          password: DEFAULT_PARENT_PASSWORD,
        }
      : null,
    parentSeedModes: parents.reduce((acc, parent) => {
      const mode = parent.seedMode || 'unknown';
      acc[mode] = (acc[mode] || 0) + 1;
      return acc;
    }, {}),
    finalChecklist: finalOnboarding.checklist,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('\nBootstrap failed:');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma().catch(() => {});
  });
