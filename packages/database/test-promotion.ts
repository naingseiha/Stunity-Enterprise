import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPromotion() {
  // Get all students in 2024-2025
  const students = await prisma.studentClass.findMany({
    where: {
      class: {
        academicYearId: 'academic-year-2024-2025'
      },
      status: 'ACTIVE'
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      class: { select: { id: true, name: true, grade: true, section: true } }
    }
  });
  
  console.log(`Found ${students.length} student enrollments in 2024-2025`);
  
  // Get target classes in 2025-2026
  const targetClasses = await prisma.class.findMany({
    where: {
      academicYearId: 'academic-year-2025-2026'
    },
    orderBy: { grade: 'asc' }
  });
  
  console.log(`Found ${targetClasses.length} classes in 2025-2026`);
  
  // Build promotion mapping
  const promotions = [];
  for (const enrollment of students) {
    const currentGrade = parseInt(enrollment.class.grade);
    const nextGrade = currentGrade + 1;
    
    // Find target class (same section if possible)
    const targetClass = targetClasses.find(
      c => c.grade === nextGrade.toString() && c.section === enrollment.class.section
    ) || targetClasses.find(
      c => c.grade === nextGrade.toString()
    );
    
    if (targetClass) {
      promotions.push({
        studentId: enrollment.student.id,
        fromClassId: enrollment.class.id,
        toClassId: targetClass.id,
        promotionType: 'AUTOMATIC'
      });
    }
  }
  
  console.log(`\nBuilt ${promotions.length} promotion requests`);
  console.log('\nFirst 3 promotions:');
  promotions.slice(0, 3).forEach(p => {
    const student = students.find(s => s.student.id === p.studentId);
    const targetClass = targetClasses.find(c => c.id === p.toClassId);
    console.log(`- ${student?.student.firstName} ${student?.student.lastName}: ${student?.class.name} → ${targetClass?.name}`);
  });
  
  await prisma.$disconnect();
}

testPromotion();
