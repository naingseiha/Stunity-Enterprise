import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addStudents() {
  try {
    console.log('👨‍🎓 Adding sample students to 2025-2026...');
    
    // Get classes in 2025-2026
    const classes = await prisma.class.findMany({
      where: {
        schoolId: 'school-test-high-001',
        academicYearId: 'academic-year-2025-2026',
        grade: '7'
      }
    });
    
    console.log(`Found ${classes.length} Grade 7 classes in 2025-2026`);
    
    if (classes.length === 0) {
      console.log('No Grade 7 classes found!');
      return;
    }
    
    // Create 5 students per Grade 7 class
    let totalCreated = 0;
    for (const classItem of classes) {
      for (let i = 1; i <= 5; i++) {
        const student = await prisma.student.create({
          data: {
            schoolId: 'school-test-high-001',
            studentId: `S2025-${classItem.section}-${i}`,
            firstName: `Student${i}`,
            lastName: `${classItem.section}`,
            khmerName: `សិស្ស ${i}`,
            gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
            dateOfBirth: '2012-01-15',
            status: 'ACTIVE',
          }
        });
        
        // Enroll in class
        await prisma.studentClass.create({
          data: {
            studentId: student.id,
            classId: classItem.id,
            status: 'ACTIVE',
          }
        });
        
        totalCreated++;
      }
    }
    
    console.log(`✅ Created ${totalCreated} students in 2025-2026!`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addStudents();
