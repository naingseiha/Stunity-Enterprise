import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  // Check StudentProgression records
  const progressionCount = await prisma.studentProgression.count();
  console.log(`\n📊 StudentProgression records: ${progressionCount}`);
  
  if (progressionCount > 0) {
    const samples = await prisma.studentProgression.findMany({
      take: 3,
      include: {
        student: { select: { firstName: true, lastName: true } },
        fromClass: { select: { name: true } },
        toClass: { select: { name: true } }
      }
    });
    
    console.log('\nSample progressions:');
    samples.forEach(p => {
      console.log(`  ✅ ${p.student.firstName} ${p.student.lastName}: ${p.fromClass.name} → ${p.toClass?.name || `Grade ${p.toGrade || '?'} · section pending`} (${p.promotionType})`);
    });
  }
  
  // Check StudentClass enrollments by year
  const enrollments2024 = await prisma.studentClass.count({
    where: { class: { academicYearId: 'academic-year-2024-2025' } }
  });
  
  const enrollments2025 = await prisma.studentClass.count({
    where: { class: { academicYearId: 'academic-year-2025-2026' } }
  });
  
  console.log(`\n📚 StudentClass Enrollments:`);
  console.log(`  2024-2025: ${enrollments2024} enrollments`);
  console.log(`  2025-2026: ${enrollments2025} enrollments`);
  
  if (enrollments2025 > 0) {
    const samples2025 = await prisma.studentClass.findMany({
      where: { class: { academicYearId: 'academic-year-2025-2026' } },
      take: 3,
      include: {
        student: { select: { firstName: true, lastName: true } },
        class: { select: { name: true } }
      }
    });
    
    console.log('\nSample 2025-2026 enrollments:');
    samples2025.forEach(e => {
      console.log(`  - ${e.student.firstName} ${e.student.lastName} → ${e.class.name} (${e.status})`);
    });
  }
  
  // Check academic year
  const year2024 = await prisma.academicYear.findUnique({
    where: { id: 'academic-year-2024-2025' },
    select: { isPromotionDone: true }
  });
  
  console.log(`\n✅ 2024-2025 isPromotionDone: ${year2024?.isPromotionDone}`);
  
  await prisma.$disconnect();
}

check();
