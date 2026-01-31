import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignTeachers() {
  try {
    console.log('🔧 Assigning teachers to classes...');
    
    // Get all teachers
    const teachers = await prisma.teacher.findMany({
      where: { schoolId: 'school-test-high-001' }
    });
    
    // Get all classes in 2025-2026
    const classes = await prisma.class.findMany({
      where: {
        schoolId: 'school-test-high-001',
        academicYearId: 'academic-year-2025-2026'
      }
    });
    
    console.log(`Found ${teachers.length} teachers and ${classes.length} classes`);
    
    let created = 0;
    // Assign each teacher to all classes (simple for now)
    for (const teacher of teachers) {
      for (const classItem of classes) {
        try {
          await prisma.teacherClass.create({
            data: {
              teacherId: teacher.id,
              classId: classItem.id,
            }
          });
          created++;
        } catch (error) {
          // Ignore duplicates
        }
      }
    }
    
    console.log(`✅ Created ${created} teacher-class assignments!`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignTeachers();
