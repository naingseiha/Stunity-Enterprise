import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPromotion() {
  console.log('🔧 Fixing incomplete promotion...');
  
  // Reset 2024-2025 year
  await prisma.academicYear.update({
    where: { id: 'academic-year-2024-2025' },
    data: {
      isPromotionDone: false,
      promotionDate: null,
    }
  });
  console.log('✅ Reset 2024-2025 year');
  
  // Delete any StudentClass enrollments in 2025-2026
  const deleted = await prisma.studentClass.deleteMany({
    where: {
      class: {
        academicYearId: 'academic-year-2025-2026'
      }
    }
  });
  console.log(`✅ Deleted ${deleted.count} partial enrollments in 2025-2026`);
  
  // Delete any StudentProgression records
  const deletedProgression = await prisma.studentProgression.deleteMany({});
  console.log(`✅ Deleted ${deletedProgression.count} progression records`);
  
  // Reset student classIds back to 2024-2025 classes
  const students2024 = await prisma.studentClass.findMany({
    where: {
      class: {
        academicYearId: 'academic-year-2024-2025'
      }
    },
    select: {
      studentId: true,
      classId: true,
    }
  });
  
  for (const enrollment of students2024) {
    await prisma.student.update({
      where: { id: enrollment.studentId },
      data: { classId: enrollment.classId }
    });
  }
  console.log(`✅ Reset ${students2024.length} student classIds`);
  
  console.log('\n✅ Ready to try promotion again!');
  
  await prisma.$disconnect();
}

fixPromotion();
