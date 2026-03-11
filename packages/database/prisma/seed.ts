import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (optional - be careful in production!)
  console.log('🗑️  Cleaning existing data...');

  // Delete Course related data first 
  await prisma.learningPathCourse.deleteMany();
  await prisma.pathEnrollment.deleteMany();
  await prisma.learningPath.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.courseReview.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.course.deleteMany();

  await prisma.studentProgression.deleteMany();
  await prisma.studentClass.deleteMany();
  await prisma.teacherClass.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.class.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.user.deleteMany();
  await prisma.schoolLocation.deleteMany(); // added from new feature
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

  // Previous year (2024-2025) - ENDED status, ready for promotion
  const academicYear2024 = await prisma.academicYear.create({
    data: {
      id: 'academic-year-2024-2025',
      schoolId: testHighSchool.id,
      name: '2024-2025',
      startDate: new Date('2024-11-01'),
      endDate: new Date('2025-09-30'),
      isCurrent: false,
      status: 'ENDED',
      isPromotionDone: false, // Ready for promotion
    },
  });

  // Current year (2025-2026) - ACTIVE
  const academicYear2025 = await prisma.academicYear.create({
    data: {
      id: 'academic-year-2025-2026',
      schoolId: testHighSchool.id,
      name: '2025-2026',
      startDate: new Date('2025-11-01'),
      endDate: new Date('2026-09-30'),
      isCurrent: true,
      status: 'ACTIVE',
    },
  });

  // Next year (2026-2027) - PLANNING
  const academicYear2026 = await prisma.academicYear.create({
    data: {
      id: 'academic-year-2026-2027',
      schoolId: testHighSchool.id,
      name: '2026-2027',
      startDate: new Date('2026-11-01'),
      endDate: new Date('2027-09-30'),
      isCurrent: false,
      status: 'PLANNING',
    },
  });

  // For Stunity Academy
  const academicYear2025Stunity = await prisma.academicYear.create({
    data: {
      id: 'academic-year-2025-2026-stunity',
      schoolId: stunityAcademy.id,
      name: '2025-2026',
      startDate: new Date('2025-11-01'),
      endDate: new Date('2026-09-30'),
      isCurrent: true,
      status: 'ACTIVE',
    },
  });

  console.log(`✅ Created academic years: 2024-2025, 2025-2026, 2026-2027`);

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
      accountType: 'SCHOOL_ONLY',
      isActive: true,
      isDefaultPassword: false,
    },
  });

  console.log(`✅ Created admin user: ${adminUser.email} / SecurePass123!`);

  // Create Classes for 2024-2025 (source year for promotion)
  console.log('📚 Creating classes for 2024-2025...');

  // Grade 7 classes (2024-2025)
  const grade7A_2024 = await prisma.class.create({
    data: {
      schoolId: testHighSchool.id,
      classId: 'G7A-2024',
      name: 'Grade 7A',
      grade: '7',
      section: 'A',
      academicYearId: academicYear2024.id,
      capacity: 35,
      track: 'General',
    },
  });

  const grade7B_2024 = await prisma.class.create({
    data: {
      schoolId: testHighSchool.id,
      classId: 'G7B-2024',
      name: 'Grade 7B',
      grade: '7',
      section: 'B',
      academicYearId: academicYear2024.id,
      capacity: 35,
      track: 'General',
    },
  });

  // Grade 8 classes (2024-2025)
  const grade8A_2024 = await prisma.class.create({
    data: {
      schoolId: testHighSchool.id,
      classId: 'G8A-2024',
      name: 'Grade 8A',
      grade: '8',
      section: 'A',
      academicYearId: academicYear2024.id,
      capacity: 35,
      track: 'General',
    },
  });

  const grade8B_2024 = await prisma.class.create({
    data: {
      schoolId: testHighSchool.id,
      classId: 'G8B-2024',
      name: 'Grade 8B',
      grade: '8',
      section: 'B',
      academicYearId: academicYear2024.id,
      capacity: 35,
      track: 'General',
    },
  });

  // Grade 9 classes (2024-2025)
  const grade9A_2024 = await prisma.class.create({
    data: {
      schoolId: testHighSchool.id,
      classId: 'G9A-2024',
      name: 'Grade 9A',
      grade: '9',
      section: 'A',
      academicYearId: academicYear2024.id,
      capacity: 35,
      track: 'General',
    },
  });

  console.log(`✅ Created 5 classes for 2024-2025 (Grades 7-9)`);

  // Create Classes for 2025-2026 (current year)
  console.log('📚 Creating classes for 2025-2026...');

  // Grade 7 classes (2025-2026) - For repeating students
  const grade7A_2025 = await prisma.class.create({
    data: {
      schoolId: testHighSchool.id,
      classId: 'G7A-2025',
      name: 'Grade 7A',
      grade: '7',
      section: 'A',
      academicYearId: academicYear2025.id,
      capacity: 35,
      track: 'General',
    },
  });

  const grade7B_2025 = await prisma.class.create({
    data: {
      schoolId: testHighSchool.id,
      classId: 'G7B-2025',
      name: 'Grade 7B',
      grade: '7',
      section: 'B',
      academicYearId: academicYear2025.id,
      capacity: 35,
      track: 'General',
    },
  });

  // Grade 8 classes (2025-2026) - Promotion target for Grade 7
  const grade8A_2025 = await prisma.class.create({
    data: {
      schoolId: testHighSchool.id,
      classId: 'G8A-2025',
      name: 'Grade 8A',
      grade: '8',
      section: 'A',
      academicYearId: academicYear2025.id,
      capacity: 35,
      track: 'General',
    },
  });

  const grade8B_2025 = await prisma.class.create({
    data: {
      schoolId: testHighSchool.id,
      classId: 'G8B-2025',
      name: 'Grade 8B',
      grade: '8',
      section: 'B',
      academicYearId: academicYear2025.id,
      capacity: 35,
      track: 'General',
    },
  });

  // Grade 9 classes (2025-2026) - Promotion target for Grade 8
  const grade9A_2025 = await prisma.class.create({
    data: {
      schoolId: testHighSchool.id,
      classId: 'G9A-2025',
      name: 'Grade 9A',
      grade: '9',
      section: 'A',
      academicYearId: academicYear2025.id,
      capacity: 35,
      track: 'General',
    },
  });

  const grade9B_2025 = await prisma.class.create({
    data: {
      schoolId: testHighSchool.id,
      classId: 'G9B-2025',
      name: 'Grade 9B',
      grade: '9',
      section: 'B',
      academicYearId: academicYear2025.id,
      capacity: 35,
      track: 'General',
    },
  });

  // Grade 10 classes (2025-2026) - Promotion target for Grade 9
  const grade10A_2025 = await prisma.class.create({
    data: {
      schoolId: testHighSchool.id,
      classId: 'G10A-2025',
      name: 'Grade 10A',
      grade: '10',
      section: 'A',
      academicYearId: academicYear2025.id,
      capacity: 40,
      track: 'Science',
    },
  });

  const grade10B_2025 = await prisma.class.create({
    data: {
      schoolId: testHighSchool.id,
      classId: 'G10B-2025',
      name: 'Grade 10B',
      grade: '10',
      section: 'B',
      academicYearId: academicYear2025.id,
      capacity: 40,
      track: 'Social Science',
    },
  });

  console.log(`✅ Created 8 classes for 2025-2026 (Grades 7-10)`);

  // Create Classes for 2026-2027 (next year, for promotion target)
  console.log('📚 Creating classes for 2026-2027...');

  const grade8A_2026 = await prisma.class.create({
    data: {
      schoolId: testHighSchool.id,
      classId: 'G8A-2026',
      name: 'Grade 8A',
      grade: '8',
      section: 'A',
      academicYearId: academicYear2026.id,
      capacity: 35,
      track: 'General',
    },
  });

  const grade9A_2026 = await prisma.class.create({
    data: {
      schoolId: testHighSchool.id,
      classId: 'G9A-2026',
      name: 'Grade 9A',
      grade: '9',
      section: 'A',
      academicYearId: academicYear2026.id,
      capacity: 35,
      track: 'General',
    },
  });

  const grade10A_2026 = await prisma.class.create({
    data: {
      schoolId: testHighSchool.id,
      classId: 'G10A-2026',
      name: 'Grade 10A',
      grade: '10',
      section: 'A',
      academicYearId: academicYear2026.id,
      capacity: 40,
      track: 'Science',
    },
  });

  console.log(`✅ Created 3 classes for 2026-2027 (Grades 8-10)`);

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

  // Create TeacherClass assignments (teachers assigned to classes by year)
  console.log('👨‍🏫 Assigning teachers to classes...');

  // Get created teachers
  const createdTeachers = await prisma.teacher.findMany({
    where: { schoolId: testHighSchool.id },
    select: { id: true, firstName: true }
  });

  // Assign teachers to 2024-2025 classes
  const classes2024 = [grade7A_2024, grade7B_2024, grade8A_2024, grade8B_2024, grade9A_2024];
  for (let i = 0; i < classes2024.length; i++) {
    const teacher = createdTeachers[i % createdTeachers.length];
    await prisma.teacherClass.create({
      data: {
        teacherId: teacher.id,
        classId: classes2024[i].id,
      }
    });
  }

  // Assign teachers to 2025-2026 classes  
  const classes2025 = [grade7A_2025, grade7B_2025, grade8A_2025, grade8B_2025, grade9A_2025, grade9B_2025, grade10A_2025, grade10B_2025];
  for (let i = 0; i < classes2025.length; i++) {
    const teacher = createdTeachers[i % createdTeachers.length];
    await prisma.teacherClass.create({
      data: {
        teacherId: teacher.id,
        classId: classes2025[i].id,
      }
    });
  }

  // Assign teachers to 2026-2027 classes
  const classes2026 = [grade8A_2026, grade9A_2026, grade10A_2026];
  for (let i = 0; i < classes2026.length; i++) {
    const teacher = createdTeachers[i % createdTeachers.length];
    await prisma.teacherClass.create({
      data: {
        teacherId: teacher.id,
        classId: classes2026[i].id,
      }
    });
  }

  console.log(`✅ Assigned teachers to ${classes2024.length + classes2025.length + classes2026.length} classes`);

  // Create Students for 2024-2025 (ready for promotion)
  console.log('👨‍🎓 Creating students for 2024-2025...');

  // Grade 7A students (20 students)
  const grade7A_students = [];
  const firstNames = ['Sophea', 'Vuthy', 'Mealea', 'Borey', 'Chanthy', 'Virak', 'Sreymom', 'Ratha', 'Vanna', 'Piseth',
    'Srey', 'Dara', 'Kunthea', 'Rithy', 'Nita', 'Sokha', 'Leakhena', 'Pheaktra', 'Samnang', 'Rotana'];
  const lastNames = ['Mao', 'Lim', 'Seng', 'Tan', 'Kem', 'Chhay', 'Touch', 'Chea', 'Chhouk', 'Sok',
    'Neang', 'Kong', 'Hour', 'Yin', 'Sok', 'Pheap', 'Chan', 'Keo', 'San', 'Long'];

  for (let i = 0; i < 20; i++) {
    const student = await prisma.student.create({
      data: {
        schoolId: testHighSchool.id,
        studentId: `S7A-${(i + 1).toString().padStart(3, '0')}`,
        firstName: firstNames[i],
        lastName: lastNames[i],
        khmerName: `${firstNames[i]} ${lastNames[i]}`,
        gender: i % 2 === 0 ? 'FEMALE' : 'MALE',
        dateOfBirth: `2011-${((i % 12) + 1).toString().padStart(2, '0')}-15`,
        classId: grade7A_2024.id,
        placeOfBirth: 'ភ្នំពេញ',
        currentAddress: 'ភ្នំពេញ',
      },
    });
    grade7A_students.push(student);
  }

  // Grade 7B students (18 students)
  const grade7B_students = [];
  for (let i = 0; i < 18; i++) {
    const student = await prisma.student.create({
      data: {
        schoolId: testHighSchool.id,
        studentId: `S7B-${(i + 1).toString().padStart(3, '0')}`,
        firstName: firstNames[i % 20],
        lastName: lastNames[(i + 10) % 20],
        khmerName: `${firstNames[i % 20]} ${lastNames[(i + 10) % 20]}`,
        gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
        dateOfBirth: `2011-${((i % 12) + 1).toString().padStart(2, '0')}-20`,
        classId: grade7B_2024.id,
        placeOfBirth: 'ភ្នំពេញ',
        currentAddress: 'ភ្នំពេញ',
      },
    });
    grade7B_students.push(student);
  }

  // Grade 8A students (22 students)
  const grade8A_students = [];
  for (let i = 0; i < 22; i++) {
    const student = await prisma.student.create({
      data: {
        schoolId: testHighSchool.id,
        studentId: `S8A-${(i + 1).toString().padStart(3, '0')}`,
        firstName: firstNames[i % 20],
        lastName: lastNames[i % 20],
        khmerName: `${firstNames[i % 20]} ${lastNames[i % 20]}`,
        gender: i % 3 === 0 ? 'FEMALE' : 'MALE',
        dateOfBirth: `2010-${((i % 12) + 1).toString().padStart(2, '0')}-10`,
        classId: grade8A_2024.id,
        placeOfBirth: 'ភ្នំពេញ',
        currentAddress: 'ភ្នំពេញ',
      },
    });
    grade8A_students.push(student);
  }

  // Grade 8B students (20 students)
  const grade8B_students = [];
  for (let i = 0; i < 20; i++) {
    const student = await prisma.student.create({
      data: {
        schoolId: testHighSchool.id,
        studentId: `S8B-${(i + 1).toString().padStart(3, '0')}`,
        firstName: firstNames[(i + 5) % 20],
        lastName: lastNames[(i + 5) % 20],
        khmerName: `${firstNames[(i + 5) % 20]} ${lastNames[(i + 5) % 20]}`,
        gender: i % 3 === 0 ? 'MALE' : 'FEMALE',
        dateOfBirth: `2010-${((i % 12) + 1).toString().padStart(2, '0')}-15`,
        classId: grade8B_2024.id,
        placeOfBirth: 'ភ្នំពេញ',
        currentAddress: 'ភ្នំពេញ',
      },
    });
    grade8B_students.push(student);
  }

  // Grade 9A students (25 students)
  const grade9A_students = [];
  for (let i = 0; i < 25; i++) {
    const student = await prisma.student.create({
      data: {
        schoolId: testHighSchool.id,
        studentId: `S9A-${(i + 1).toString().padStart(3, '0')}`,
        firstName: firstNames[i % 20],
        lastName: lastNames[(i + 7) % 20],
        khmerName: `${firstNames[i % 20]} ${lastNames[(i + 7) % 20]}`,
        gender: i % 2 === 0 ? 'FEMALE' : 'MALE',
        dateOfBirth: `2009-${((i % 12) + 1).toString().padStart(2, '0')}-05`,
        classId: grade9A_2024.id,
        placeOfBirth: 'ភ្នំពេញ',
        currentAddress: 'ភ្នំពេញ',
      },
    });
    grade9A_students.push(student);
  }

  const totalStudents2024 = 20 + 18 + 22 + 20 + 25;
  console.log(`✅ Created ${totalStudents2024} students for 2024-2025 (105 total)`);

  // Create StudentClass enrollments for 2024-2025
  console.log('📝 Creating student-class enrollments for 2024-2025...');

  for (const student of grade7A_students) {
    await prisma.studentClass.create({
      data: {
        studentId: student.id,
        classId: grade7A_2024.id,
        academicYearId: academicYear2024.id,
        status: 'ACTIVE',
      },
    });
  }

  for (const student of grade7B_students) {
    await prisma.studentClass.create({
      data: {
        studentId: student.id,
        classId: grade7B_2024.id,
        academicYearId: academicYear2024.id,
        status: 'ACTIVE',
      },
    });
  }

  for (const student of grade8A_students) {
    await prisma.studentClass.create({
      data: {
        studentId: student.id,
        classId: grade8A_2024.id,
        academicYearId: academicYear2024.id,
        status: 'ACTIVE',
      },
    });
  }

  for (const student of grade8B_students) {
    await prisma.studentClass.create({
      data: {
        studentId: student.id,
        classId: grade8B_2024.id,
        academicYearId: academicYear2024.id,
        status: 'ACTIVE',
      },
    });
  }

  for (const student of grade9A_students) {
    await prisma.studentClass.create({
      data: {
        studentId: student.id,
        classId: grade9A_2024.id,
        academicYearId: academicYear2024.id,
        status: 'ACTIVE',
      },
    });
  }

  console.log(`✅ Created ${totalStudents2024} student-class enrollments`);

  // Update school counts
  const studentCount = await prisma.student.count({ where: { schoolId: testHighSchool.id } });
  const teacherCount = await prisma.teacher.count({ where: { schoolId: testHighSchool.id } });
  const classCount = await prisma.class.count({ where: { schoolId: testHighSchool.id } });

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
  console.log('📅 Academic Years:');
  console.log(`   • 2024-2025 (ENDED) - Ready for promotion ✅`);
  console.log(`   • 2025-2026 (ACTIVE - Current)`);
  console.log(`   • 2026-2027 (PLANNING)`);
  console.log('');
  console.log('📊 Test Data for Test High School:');
  console.log(`   • ${teacherCount} Teachers`);
  console.log(`   • ${studentCount} Students`);
  console.log(`   • ${classCount} Classes across 3 academic years`);
  console.log('');
  console.log('👨‍🎓 Students by Year & Grade (2024-2025):');
  console.log(`   • Grade 7A: 20 students`);
  console.log(`   • Grade 7B: 18 students`);
  console.log(`   • Grade 8A: 22 students`);
  console.log(`   • Grade 8B: 20 students`);
  console.log(`   • Grade 9A: 25 students`);
  console.log(`   Total: 105 students ready for promotion!`);
  console.log('');
  console.log('🎯 Next Steps:');
  console.log(`   1. Login at http://localhost:3000`);
  console.log(`   2. Navigate to Academic Years`);
  console.log(`   3. View 2024-2025 year (ENDED status)`);
  console.log(`   4. Click "Promote Students" to start promotion wizard`);
  console.log('');
  console.log('🌐 Access the app at: http://localhost:3000');
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
