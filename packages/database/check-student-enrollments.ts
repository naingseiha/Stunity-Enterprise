import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  // Check StudentClass enrollments by academic year
  const enrollments2024 = await prisma.studentClass.findMany({
    where: {
      class: {
        academicYearId: 'academic-year-2024-2025'
      }
    },
    take: 3,
    include: {
      student: { select: { firstName: true, lastName: true } },
      class: { select: { name: true, academicYearId: true } }
    }
  });
  
  const enrollments2025 = await prisma.studentClass.findMany({
    where: {
      class: {
        academicYearId: 'academic-year-2025-2026'
      }
    },
    take: 3,
    include: {
      student: { select: { firstName: true, lastName: true } },
      class: { select: { name: true, academicYearId: true } }
    }
  });
  
  const count2024 = await prisma.studentClass.count({
    where: { class: { academicYearId: 'academic-year-2024-2025' } }
  });
  
  const count2025 = await prisma.studentClass.count({
    where: { class: { academicYearId: 'academic-year-2025-2026' } }
  });
  
  console.log(`\n2024-2025 Enrollments: ${count2024}`);
  if (enrollments2024.length > 0) {
    enrollments2024.forEach(e => {
      console.log(`  - ${e.student.firstName} ${e.student.lastName} → ${e.class.name}`);
    });
  }
  
  console.log(`\n2025-2026 Enrollments: ${count2025}`);
  if (enrollments2025.length > 0) {
    enrollments2025.forEach(e => {
      console.log(`  - ${e.student.firstName} ${e.student.lastName} → ${e.class.name}`);
    });
  } else {
    console.log('  (none)');
  }
  
  await prisma.$disconnect();
}

check();
