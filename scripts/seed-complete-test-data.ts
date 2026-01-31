import { PrismaClient, Gender } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive test data seeding...\n');

  // Find existing school
  const school = await prisma.school.findFirst({
    where: { name: 'Test High School' }
  });

  if (!school) {
    console.error('❌ Test High School not found. Please run initial setup first.');
    process.exit(1);
  }

  console.log(`✅ Found school: ${school.name} (${school.id})\n`);

  // ===========================================
  // 1. CREATE ACADEMIC YEARS
  // ===========================================
  console.log('📅 Creating Academic Years...');

  const academicYears = [
    {
      name: '2024-2025',
      startDate: new Date('2024-08-15'),
      endDate: new Date('2025-06-30'),
      status: 'ENDED' as const,
      isCurrent: false,
      isPromotionDone: true,
      promotionDate: new Date('2025-07-01'),
    },
    {
      name: '2025-2026',
      startDate: new Date('2025-08-15'),
      endDate: new Date('2026-06-30'),
      status: 'ACTIVE' as const,
      isCurrent: true,
      isPromotionDone: false,
    },
    {
      name: '2026-2027',
      startDate: new Date('2026-08-15'),
      endDate: new Date('2027-06-30'),
      status: 'PLANNING' as const,
      isCurrent: false,
      isPromotionDone: false,
    },
    {
      name: '2027-2028',
      startDate: new Date('2027-08-15'),
      endDate: new Date('2028-06-30'),
      status: 'PLANNING' as const,
      isCurrent: false,
      isPromotionDone: false,
    },
  ];

  const createdYears: any[] = [];
  for (const yearData of academicYears) {
    const existingYear = await prisma.academicYear.findFirst({
      where: { schoolId: school.id, name: yearData.name }
    });

    if (existingYear) {
      console.log(`  ⏭️  ${yearData.name} already exists`);
      createdYears.push(existingYear);
    } else {
      const year = await prisma.academicYear.create({
        data: { ...yearData, schoolId: school.id }
      });
      console.log(`  ✅ Created ${year.name} (${year.status})`);
      createdYears.push(year);
    }
  }

  const [year2024, year2025, year2026, year2027] = createdYears;

  // ===========================================
  // 2. CREATE TEACHERS
  // ===========================================
  console.log('\n👨‍🏫 Creating Teachers...');

  const teachers = [
    { firstName: 'Sokha', lastName: 'Chan', subject: 'Mathematics', email: 'sokha.chan@test.edu' },
    { firstName: 'Sophea', lastName: 'Lim', subject: 'Physics', email: 'sophea.lim@test.edu' },
    { firstName: 'Vanna', lastName: 'Prak', subject: 'Chemistry', email: 'vanna.prak@test.edu' },
    { firstName: 'Dara', lastName: 'Kong', subject: 'Biology', email: 'dara.kong@test.edu' },
    { firstName: 'Sothea', lastName: 'Heng', subject: 'Khmer Literature', email: 'sothea.heng@test.edu' },
    { firstName: 'Chanthy', lastName: 'Sok', subject: 'English', email: 'chanthy.sok@test.edu' },
    { firstName: 'Pisey', lastName: 'Mao', subject: 'History', email: 'pisey.mao@test.edu' },
    { firstName: 'Kosal', lastName: 'Chea', subject: 'Geography', email: 'kosal.chea@test.edu' },
  ];

  const createdTeachers: any[] = [];
  for (const teacherData of teachers) {
    const existing = await prisma.teacher.findFirst({
      where: { schoolId: school.id, email: teacherData.email }
    });

    if (existing) {
      console.log(`  ⏭️  ${teacherData.firstName} ${teacherData.lastName} already exists`);
      createdTeachers.push(existing);
    } else {
      const teacher = await prisma.teacher.create({
        data: {
          ...teacherData,
          schoolId: school.id,
          teacherId: `T${String(createdTeachers.length + 1).padStart(4, '0')}`,
          phone: `0${10 + createdTeachers.length}`,
          dateOfBirth: new Date('1985-01-01'),
          gender: Math.random() > 0.5 ? 'MALE' : 'FEMALE',
          status: 'ACTIVE',
          hireDate: new Date('2024-01-01'),
        }
      });
      console.log(`  ✅ Created ${teacher.firstName} ${teacher.lastName} (${teacher.subject})`);
      createdTeachers.push(teacher);
    }
  }

  // ===========================================
  // 3. CREATE CLASSES FOR EACH YEAR
  // ===========================================
  console.log('\n🏫 Creating Classes...');

  const gradeStructure = [
    { grade: '10', sections: ['A', 'B'] },
    { grade: '11', sections: ['A', 'B', 'C'] },
    { grade: '12', sections: ['A', 'B'] },
  ];

  const classesMap = new Map<string, any>();

  for (const year of createdYears) {
    console.log(`\n  📚 Year: ${year.name}`);
    
    for (const { grade, sections } of gradeStructure) {
      for (const section of sections) {
        const className = `Grade ${grade}${section}`;
        const classKey = `${year.id}-${grade}-${section}`;
        
        const existing = await prisma.class.findFirst({
          where: {
            schoolId: school.id,
            academicYearId: year.id,
            name: className,
          }
        });

        if (existing) {
          console.log(`    ⏭️  ${className} already exists`);
          classesMap.set(classKey, existing);
        } else {
          // Assign a random teacher
          const randomTeacher = createdTeachers[Math.floor(Math.random() * createdTeachers.length)];
          
          const cls = await prisma.class.create({
            data: {
              name: className,
              grade,
              section,
              schoolId: school.id,
              academicYearId: year.id,
              classTeacherId: randomTeacher.id,
              capacity: 40,
              room: `Room ${grade}0${section.charCodeAt(0) - 64}`,
              schedule: 'Monday to Friday, 7:00 AM - 11:30 AM',
            }
          });
          console.log(`    ✅ Created ${cls.name} (Teacher: ${randomTeacher.firstName})`);
          classesMap.set(classKey, cls);
        }
      }
    }
  }

  // ===========================================
  // 4. CREATE STUDENTS
  // ===========================================
  console.log('\n👨‍🎓 Creating Students...');

  const firstNames = ['Sokha', 'Sophea', 'Vanna', 'Dara', 'Sothea', 'Chanthy', 'Pisey', 'Kosal', 'Sreymom', 'Bopha', 'Leakhena', 'Chanmony'];
  const lastNames = ['Chan', 'Lim', 'Prak', 'Kong', 'Heng', 'Sok', 'Mao', 'Chea', 'Kim', 'Tan', 'Seng', 'Pich'];

  let studentCounter = await prisma.student.count({ where: { schoolId: school.id } });

  // Students in 2025-2026 (current year)
  const studentDistribution = [
    { grade: '10', section: 'A', count: 8 },
    { grade: '10', section: 'B', count: 7 },
    { grade: '11', section: 'A', count: 6 },
    { grade: '11', section: 'B', count: 8 },
    { grade: '11', section: 'C', count: 7 },
    { grade: '12', section: 'A', count: 5 },
    { grade: '12', section: 'B', count: 6 },
  ];

  console.log(`\n  📝 Adding students to ${year2025.name} (Current Year)`);
  
  for (const dist of studentDistribution) {
    const classKey = `${year2025.id}-${dist.grade}-${dist.section}`;
    const cls = classesMap.get(classKey);
    
    if (!cls) {
      console.log(`    ⚠️  Class not found: Grade ${dist.grade}${dist.section}`);
      continue;
    }

    const existingStudents = await prisma.student.count({
      where: { classId: cls.id }
    });

    if (existingStudents >= dist.count) {
      console.log(`    ⏭️  Grade ${dist.grade}${dist.section} already has ${existingStudents} students`);
      continue;
    }

    const toCreate = dist.count - existingStudents;
    console.log(`    ➕ Adding ${toCreate} students to Grade ${dist.grade}${dist.section}`);

    for (let i = 0; i < toCreate; i++) {
      studentCounter++;
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      
      await prisma.student.create({
        data: {
          studentId: `S${String(studentCounter).padStart(6, '0')}`,
          firstName,
          lastName,
          khmerName: `${firstName} ${lastName}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${studentCounter}@student.test.edu`,
          phone: `0${70000000 + studentCounter}`,
          dateOfBirth: new Date(`200${8 - parseInt(dist.grade) + 10}-05-15`),
          gender: Math.random() > 0.5 ? 'MALE' : 'FEMALE',
          schoolId: school.id,
          classId: cls.id,
          status: 'ACTIVE',
          enrollmentDate: new Date('2025-08-15'),
        }
      });
    }
  }

  // ===========================================
  // 5. VERIFY DATA
  // ===========================================
  console.log('\n📊 Verification Report:');
  
  const totalYears = await prisma.academicYear.count({ where: { schoolId: school.id } });
  const totalTeachers = await prisma.teacher.count({ where: { schoolId: school.id } });
  const totalClasses = await prisma.class.count({ where: { schoolId: school.id } });
  const totalStudents = await prisma.student.count({ where: { schoolId: school.id } });

  console.log(`  📅 Academic Years: ${totalYears}`);
  console.log(`  👨‍🏫 Teachers: ${totalTeachers}`);
  console.log(`  🏫 Classes: ${totalClasses}`);
  console.log(`  👨‍🎓 Students: ${totalStudents}`);

  // Classes by year
  for (const year of createdYears) {
    const yearClasses = await prisma.class.count({
      where: { academicYearId: year.id }
    });
    const yearStudents = await prisma.student.count({
      where: {
        class: { academicYearId: year.id }
      }
    });
    console.log(`\n  📚 ${year.name}:`);
    console.log(`     Classes: ${yearClasses}`);
    console.log(`     Students: ${yearStudents}`);
  }

  console.log('\n✅ Test data seeding completed successfully!\n');
  console.log('🎯 You can now test:');
  console.log('   ✓ Student promotion (2025-2026 → 2026-2027)');
  console.log('   ✓ Class management across years');
  console.log('   ✓ Teacher assignments');
  console.log('   ✓ Year-based filtering');
  console.log('   ✓ Historical data viewing');
  console.log('   ✓ Promotion reports and undo');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
