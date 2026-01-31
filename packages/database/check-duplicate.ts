import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  // Check for students with multiple active enrollments
  const duplicates = await prisma.$queryRaw`
    SELECT s.id, s."firstName", s."lastName", COUNT(*) as enrollment_count
    FROM students s
    JOIN student_classes sc ON sc."studentId" = s.id
    WHERE sc.status = 'ACTIVE'
    GROUP BY s.id, s."firstName", s."lastName"
    HAVING COUNT(*) > 1
  `;
  
  console.log('Students with multiple active enrollments:', duplicates);
  
  await prisma.$disconnect();
}

check();
