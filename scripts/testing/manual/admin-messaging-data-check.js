const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    const school = await prisma.school.findFirst({
      where: { name: 'Svaythom High School' },
      select: { id: true, name: true },
    });

    if (!school) {
      throw new Error('Svaythom High School not found');
    }

    const admin = await prisma.user.findUnique({
      where: { email: 'admin@svaythom.edu.kh' },
      select: {
        id: true,
        email: true,
        role: true,
        schoolId: true,
        teacherId: true,
        parentId: true,
      },
    });

    const [
      parentCountInSchool,
      studentParentCountInSchool,
      studentsWithParents,
      totalParents,
      totalStudentParents,
      sampleStudentWithParent,
    ] = await Promise.all([
      prisma.parent.count({
        where: {
          studentParents: {
            some: {
              student: {
                schoolId: school.id,
              },
            },
          },
        },
      }),
      prisma.studentParent.count({
        where: {
          student: {
            schoolId: school.id,
          },
        },
      }),
      prisma.student.count({
        where: {
          schoolId: school.id,
          studentParents: {
            some: {},
          },
        },
      }),
      prisma.parent.count(),
      prisma.studentParent.count(),
      prisma.student.findFirst({
        where: {
          schoolId: school.id,
          studentParents: {
            some: {},
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          studentParents: {
            select: {
              parent: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
            take: 1,
          },
        },
      }),
    ]);

    console.log(
      JSON.stringify(
        {
          school,
          admin,
          counts: {
            totalParents,
            totalStudentParents,
            parentCountInSchool,
            studentParentCountInSchool,
            studentsWithParents,
          },
          sampleStudentWithParent,
        },
        null,
        2
      )
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
