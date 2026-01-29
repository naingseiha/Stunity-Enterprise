import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (optional - be careful in production!)
  console.log('🗑️  Cleaning existing data...');
  await prisma.studentClass.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.class.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();

  // Create Test Schools
  console.log('🏫 Creating test schools...');
  const testHighSchool = await prisma.school.create({
    data: {
      id: 'school-test-high-001',
      name: 'Test High School',
      slug: 'test-high-school',
      email: 'admin@testhighschool.edu',
      phone: '+855-12-345-678',
      address: 'Phnom Penh, Cambodia',
      subscriptionTier: 'FREE_TRIAL_1M',
      subscriptionStart: new Date(),
      subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      isActive: true,
      isTrial: true,
      maxStudents: 100,
      maxTeachers: 10,
      maxStorage: BigInt(1073741824), // 1GB
    },
  });

  const stunityAcademy = await prisma.school.create({
    data: {
      id: 'school-stunity-academy-001',
      name: 'Stunity Academy',
      slug: 'stunity-academy',
      email: 'admin@stunityacademy.edu',
      phone: '+855-12-876-543',
      address: 'Siem Reap, Cambodia',
      subscriptionTier: 'PREMIUM',
      subscriptionStart: new Date(),
      subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      isActive: true,
      isTrial: false,
      maxStudents: 1000,
      maxTeachers: 100,
      maxStorage: BigInt(10737418240), // 10GB
    },
  });

  console.log(`✅ Created schools: ${testHighSchool.name}, ${stunityAcademy.name}`);

  // Create Academic Years
  console.log('📅 Creating academic years...');
  const academicYear1 = await prisma.academicYear.create({
    data: {
      id: 'academic-year-2026-2027',
      schoolId: testHighSchool.id,
      name: '2026-2027',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
    },
  });

  const academicYear2 = await prisma.academicYear.create({
    data: {
      id: 'academic-year-2026-2027-stunity',
      schoolId: stunityAcademy.id,
      name: '2026-2027',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
    },
  });

  console.log(`✅ Created academic years for both schools`);

  // Create Test Users (Admin, Teachers)
  console.log('👤 Creating test users...');
  const hashedPassword = await bcrypt.hash('SecurePass123!', 10);

  const adminUser = await prisma.user.create({
    data: {
      id: 'user-admin-001',
      schoolId: testHighSchool.id,
      email: 'john.doe@testhighschool.edu',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: 'ADMIN',
      isActive: true,
      isDefaultPassword: false,
    },
  });

  console.log(`✅ Created admin user: ${adminUser.email} / SecurePass123!`);

  // Create Classes
  console.log('📚 Creating classes...');
  const grade10A = await prisma.class.create({
    data: {
      id: 'class-grade10a',
      schoolId: testHighSchool.id,
      classId: 'G10A',
      name: 'Grade 10A',
      grade: '10',
      section: 'A',
      academicYear: '2026-2027',
      capacity: 40,
      track: 'Science',
    },
  });

  const grade11B = await prisma.class.create({
    data: {
      id: 'class-grade11b',
      schoolId: testHighSchool.id,
      classId: 'G11B',
      name: 'Grade 11B',
      grade: '11',
      section: 'B',
      academicYear: '2026-2027',
      capacity: 35,
      track: 'Social Science',
    },
  });

  const grade12A = await prisma.class.create({
    data: {
      id: 'class-grade12a',
      schoolId: testHighSchool.id,
      classId: 'G12A',
      name: 'Grade 12A',
      grade: '12',
      section: 'A',
      academicYear: '2026-2027',
      capacity: 30,
      track: 'Science',
    },
  });

  console.log(`✅ Created classes: ${grade10A.name}, ${grade11B.name}, ${grade12A.name}`);

  // Create Teachers
  console.log('👨‍🏫 Creating teachers...');
  const teachers = [
    {
      firstName: 'Sokha',
      lastName: 'Pheap',
      khmerName: 'សុខា ភាព',
      email: 'sokha.pheap@testhighschool.edu',
      phone: '+855-12-111-111',
      gender: 'MALE',
      dateOfBirth: '1985-03-15',
      position: 'Mathematics Teacher',
      hireDate: '2020-08-01',
    },
    {
      firstName: 'Sreypov',
      lastName: 'Chan',
      khmerName: 'ស្រីពៅ ចាន',
      email: 'sreypov.chan@testhighschool.edu',
      phone: '+855-12-222-222',
      gender: 'FEMALE',
      dateOfBirth: '1988-07-20',
      position: 'English Teacher',
      hireDate: '2021-01-15',
    },
    {
      firstName: 'Dara',
      lastName: 'Kong',
      khmerName: 'ដារា គង់',
      email: 'dara.kong@testhighschool.edu',
      phone: '+855-12-333-333',
      gender: 'MALE',
      dateOfBirth: '1990-11-05',
      position: 'Physics Teacher',
      hireDate: '2022-03-01',
    },
    {
      firstName: 'Channary',
      lastName: 'Rath',
      khmerName: 'ចន្ទារី រ័ត្ន',
      email: 'channary.rath@testhighschool.edu',
      phone: '+855-12-444-444',
      gender: 'FEMALE',
      dateOfBirth: '1987-05-12',
      position: 'Chemistry Teacher',
      hireDate: '2019-09-01',
    },
  ];

  for (const teacherData of teachers) {
    await prisma.teacher.create({
      data: {
        schoolId: testHighSchool.id,
        teacherId: `T${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        firstName: teacherData.firstName,
        lastName: teacherData.lastName,
        khmerName: teacherData.khmerName,
        email: teacherData.email,
        phone: teacherData.phone,
        gender: teacherData.gender as any,
        dateOfBirth: teacherData.dateOfBirth,
        position: teacherData.position,
        hireDate: teacherData.hireDate,
      },
    });
  }

  console.log(`✅ Created ${teachers.length} teachers`);

  // Create Students
  console.log('👨‍🎓 Creating students...');
  const studentsData = [
    // Grade 10A students
    {
      firstName: 'Sophea',
      lastName: 'Mao',
      khmerName: 'សុភា ម៉ៅ',
      gender: 'FEMALE',
      dateOfBirth: '2010-01-15',
      classId: grade10A.id,
    },
    {
      firstName: 'Vuthy',
      lastName: 'Lim',
      khmerName: 'វុធី លឹម',
      gender: 'MALE',
      dateOfBirth: '2010-03-22',
      classId: grade10A.id,
    },
    {
      firstName: 'Sopheak',
      lastName: 'Heng',
      khmerName: 'សុភាព ហេង',
      gender: 'MALE',
      dateOfBirth: '2010-05-10',
      classId: grade10A.id,
    },
    {
      firstName: 'Mealea',
      lastName: 'Seng',
      khmerName: 'មាលា សេង',
      gender: 'FEMALE',
      dateOfBirth: '2010-07-08',
      classId: grade10A.id,
    },
    {
      firstName: 'Borey',
      lastName: 'Tan',
      khmerName: 'បូរី តាន់',
      gender: 'MALE',
      dateOfBirth: '2010-02-14',
      classId: grade10A.id,
    },
    // Grade 11B students
    {
      firstName: 'Chanthy',
      lastName: 'Kem',
      khmerName: 'ចន្ថី កែម',
      gender: 'FEMALE',
      dateOfBirth: '2009-04-20',
      classId: grade11B.id,
    },
    {
      firstName: 'Virak',
      lastName: 'Chhay',
      khmerName: 'វីរៈ ឆាយ',
      gender: 'MALE',
      dateOfBirth: '2009-06-18',
      classId: grade11B.id,
    },
    {
      firstName: 'Sreymom',
      lastName: 'Touch',
      khmerName: 'ស្រីម៉ម ទូច',
      gender: 'FEMALE',
      dateOfBirth: '2009-08-25',
      classId: grade11B.id,
    },
    {
      firstName: 'Ratha',
      lastName: 'Chea',
      khmerName: 'រ័ត្ន ជា',
      gender: 'MALE',
      dateOfBirth: '2009-10-30',
      classId: grade11B.id,
    },
    // Grade 12A students
    {
      firstName: 'Vanna',
      lastName: 'Chhouk',
      khmerName: 'វណ្ណា ឈូក',
      gender: 'FEMALE',
      dateOfBirth: '2008-03-12',
      classId: grade12A.id,
    },
    {
      firstName: 'Piseth',
      lastName: 'Sok',
      khmerName: 'ពិសិដ្ឋ សុខ',
      gender: 'MALE',
      dateOfBirth: '2008-05-28',
      classId: grade12A.id,
    },
    {
      firstName: 'Srey',
      lastName: 'Neang',
      khmerName: 'ស្រី នាង',
      gender: 'FEMALE',
      dateOfBirth: '2008-07-15',
      classId: grade12A.id,
    },
  ];

  for (const studentData of studentsData) {
    await prisma.student.create({
      data: {
        schoolId: testHighSchool.id,
        studentId: `S${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        khmerName: studentData.khmerName,
        gender: studentData.gender as any,
        dateOfBirth: studentData.dateOfBirth,
        classId: studentData.classId,
        placeOfBirth: 'ភ្នំពេញ',
        currentAddress: 'ភ្នំពេញ',
      },
    });
  }

  console.log(`✅ Created ${studentsData.length} students`);

  // Update school counts
  const studentCount = await prisma.student.count({ where: { schoolId: testHighSchool.id } });
  const teacherCount = await prisma.teacher.count({ where: { schoolId: testHighSchool.id } });

  await prisma.school.update({
    where: { id: testHighSchool.id },
    data: {
      currentStudents: studentCount,
      currentTeachers: teacherCount,
    },
  });

  console.log('📊 Updated school statistics');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ DATABASE SEEDED SUCCESSFULLY!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('🎓 Schools Created:');
  console.log(`   • ${testHighSchool.name} (${testHighSchool.slug})`);
  console.log(`   • ${stunityAcademy.name} (${stunityAcademy.slug})`);
  console.log('');
  console.log('👤 Login Credentials:');
  console.log(`   Email:    ${adminUser.email}`);
  console.log(`   Password: SecurePass123!`);
  console.log('');
  console.log('📊 Test Data:');
  console.log(`   • ${teacherCount} Teachers`);
  console.log(`   • ${studentCount} Students`);
  console.log(`   • 3 Classes`);
  console.log('');
  console.log('🌐 Access the app at: http://localhost:3000/en');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
