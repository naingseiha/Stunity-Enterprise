import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  const year = await prisma.academicYear.findUnique({
    where: { id: 'academic-year-2024-2025' },
    select: { isPromotionDone: true }
  });
  
  const enrollments2025 = await prisma.studentClass.count({
    where: { class: { academicYearId: 'academic-year-2025-2026' } }
  });
  
  const progressions = await prisma.studentProgression.count();
  
  console.log('\n📊 Current State:');
  console.log(`  2024-2025 isPromotionDone: ${year?.isPromotionDone}`);
  console.log(`  2025-2026 enrollments: ${enrollments2025}`);
  console.log(`  StudentProgression records: ${progressions}`);
  console.log('\n✅ System ready for promotion test!');
  
  await prisma.$disconnect();
}

verify();
