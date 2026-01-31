import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const count = await prisma.teacherClass.count();
  console.log(`TeacherClass records: ${count}`);
  
  if (count > 0) {
    const samples = await prisma.teacherClass.findMany({
      take: 3,
      include: {
        teacher: { select: { firstName: true, lastName: true } },
        class: { select: { name: true, academicYearId: true } }
      }
    });
    console.log('\nSample records:');
    samples.forEach(tc => {
      console.log(`- ${tc.teacher.firstName} ${tc.teacher.lastName} → ${tc.class.name} (Year: ${tc.class.academicYearId})`);
    });
  }
  
  await prisma.$disconnect();
}

check();
