const { PrismaClient } = require('@prisma/client');

const fetch = global.fetch;
const prisma = new PrismaClient({ log: ['error'] });

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const SCHOOL_SERVICE_URL = process.env.SCHOOL_SERVICE_URL || 'http://localhost:3002';
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'superadmin@stunity.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'StunityAdmin2026!';
const KEEP_PRODUCTION_SCHOOL_NAME = process.env.KEEP_PRODUCTION_SCHOOL_NAME || 'Svaythom High School';
const KEEP_TEST_ADMIN_EMAIL = process.env.KEEP_TEST_ADMIN_EMAIL || 'qa-admin-20260322064250@stunity.test';
const EXECUTE = process.argv.includes('--execute');

async function requestJson(url, options = {}, action = url) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.message || data?.error || `Request failed for ${action}`;
    throw new Error(`${action}: ${response.status} ${message}`);
  }

  return data;
}

async function getSuperAdminToken() {
  const response = await requestJson(
    `${AUTH_SERVICE_URL}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: SUPER_ADMIN_EMAIL,
        password: SUPER_ADMIN_PASSWORD,
      }),
    },
    'super admin login'
  );

  const token = response?.data?.tokens?.accessToken || response?.data?.accessToken;
  if (!token) {
    throw new Error('super admin login: access token missing');
  }

  return token;
}

async function listSchools(token) {
  const response = await requestJson(
    `${SCHOOL_SERVICE_URL}/super-admin/schools?page=1&limit=100`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
    'list schools'
  );

  return response?.data?.schools || [];
}

async function findKeeperTestSchool(token) {
  const response = await requestJson(
    `${SCHOOL_SERVICE_URL}/super-admin/users?page=1&limit=100&role=ADMIN&search=${encodeURIComponent(KEEP_TEST_ADMIN_EMAIL)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
    'find keeper test admin'
  );

  const users = response?.data?.users || [];
  return users.find((user) => user.email === KEEP_TEST_ADMIN_EMAIL) || null;
}

async function deleteSchool(token, school) {
  return requestJson(
    `${SCHOOL_SERVICE_URL}/super-admin/schools/${school.id}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
    `delete school ${school.name}`
  );
}

async function deleteSchoolDirect(school) {
  const [classes, parents] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId: school.id },
      select: { id: true },
    }),
    prisma.studentParent.findMany({
      where: {
        student: {
          schoolId: school.id,
        },
      },
      select: { parentId: true },
    }),
  ]);

  const classIds = classes.map((entry) => entry.id);
  const parentIds = [...new Set(parents.map((entry) => entry.parentId))];
  await prisma.message.deleteMany({
    where: {
      conversation: {
        schoolId: school.id,
      },
    },
  });

  await prisma.conversation.deleteMany({
    where: { schoolId: school.id },
  });

  if (classIds.length > 0) {
    await prisma.gradeConfirmation.deleteMany({
      where: {
        classId: {
          in: classIds,
        },
      },
    });
  }

  await prisma.event.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.studyClub.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.timetableEntry.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.timetablePublish.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.timetableTemplate.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.student.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.teacher.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.class.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.academicYear.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.schoolShift.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.period.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.schoolLocation.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.featureFlag.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.claimCode.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.idGenerationLog.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.onboardingChecklist.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.schoolSettings.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.user.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.school.delete({
    where: { id: school.id },
  });

  for (const parentId of parentIds) {
    const linkCount = await prisma.studentParent.count({
      where: { parentId },
    });

    if (linkCount === 0) {
      await prisma.parent.delete({
        where: { id: parentId },
      }).catch(() => null);
    }
  }
}

async function main() {
  const token = await getSuperAdminToken();
  const schools = await listSchools(token);
  const keeperTestAdmin = await findKeeperTestSchool(token);

  if (!keeperTestAdmin?.schoolId) {
    throw new Error(`Could not resolve keeper test school from admin ${KEEP_TEST_ADMIN_EMAIL}`);
  }

  const productionSchool = schools.find((school) => school.name === KEEP_PRODUCTION_SCHOOL_NAME);
  if (!productionSchool) {
    throw new Error(`Could not find production school named ${KEEP_PRODUCTION_SCHOOL_NAME}`);
  }

  const keepSchoolIds = new Set([productionSchool.id, keeperTestAdmin.schoolId]);
  const keepSchools = schools.filter((school) => keepSchoolIds.has(school.id));
  const deleteCandidates = schools.filter((school) => !keepSchoolIds.has(school.id));

  console.log(JSON.stringify({
    execute: EXECUTE,
    keepProductionSchoolName: KEEP_PRODUCTION_SCHOOL_NAME,
    keepTestAdminEmail: KEEP_TEST_ADMIN_EMAIL,
    keepSchools: keepSchools.map((school) => ({
      id: school.id,
      name: school.name,
      email: school.email,
      registrationStatus: school.registrationStatus,
      isActive: school.isActive,
    })),
    deleteCandidates: deleteCandidates.map((school) => ({
      id: school.id,
      name: school.name,
      email: school.email,
      registrationStatus: school.registrationStatus,
      isActive: school.isActive,
    })),
  }, null, 2));

  if (!EXECUTE) {
    return;
  }

  const results = [];
  for (const school of deleteCandidates) {
    try {
      await deleteSchool(token, school);
      results.push({ id: school.id, name: school.name, deleted: true });
    } catch (error) {
      try {
        await deleteSchoolDirect(school);
        results.push({
          id: school.id,
          name: school.name,
          deleted: true,
          mode: 'direct-db-fallback',
        });
      } catch (directError) {
        results.push({
          id: school.id,
          name: school.name,
          deleted: false,
          error: error.message,
          directError: directError.message,
        });
      }
    }
  }

  const remainingSchools = await listSchools(token);
  console.log(JSON.stringify({
    deletedCount: results.filter((result) => result.deleted).length,
    failedCount: results.filter((result) => !result.deleted).length,
    results,
    remainingSchools: remainingSchools.map((school) => ({
      id: school.id,
      name: school.name,
      email: school.email,
      registrationStatus: school.registrationStatus,
      isActive: school.isActive,
    })),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
