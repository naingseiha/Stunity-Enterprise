/**
 * Comprehensive School Management Test Data Seed
 *
 * Seeds Subjects, Grades, Attendance, Periods, Timetable entries,
 * and SubjectTeacher assignments for full feature testing.
 *
 * Prerequisites: Run `npm run seed` (base seed) first, then optionally
 * `npm run seed:test-data` (adds more academic years, teachers, students).
 *
 * Usage: npm run seed:school-management
 *
 * Production protection: blocks if DATABASE_URL points at Supabase production
 * unless ALLOW_PRODUCTION_DB=1 (CI/deploy only).
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { runDbSafetyCheck } from './db-safety-check';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../../.env') });

const prisma = new PrismaClient();

// Cambodian high school subjects (grades 7-12)
const CORE_SUBJECTS = [
  { name: 'Khmer Language', nameKh: 'ភាសាខ្មែរ', code: 'KH', grade: '7', track: null, category: 'Core', coefficient: 2.0, weeklyHours: 5, annualHours: 180 },
  { name: 'Mathematics', nameKh: 'គណិតវិទ្យា', code: 'MATH', grade: '7', track: null, category: 'Core', coefficient: 2.0, weeklyHours: 6, annualHours: 216 },
  { name: 'English', nameKh: 'អង់គ្លេស', code: 'ENG', grade: '7', track: null, category: 'Core', coefficient: 2.0, weeklyHours: 5, annualHours: 180 },
  { name: 'Physics', nameKh: 'រូបវិទ្យា', code: 'PHY', grade: '7', track: null, category: 'Core', coefficient: 1.5, weeklyHours: 4, annualHours: 144 },
  { name: 'Chemistry', nameKh: 'គីមីវិទ្យា', code: 'CHEM', grade: '7', track: null, category: 'Core', coefficient: 1.5, weeklyHours: 4, annualHours: 144 },
  { name: 'Biology', nameKh: 'ជីវវិទ្យា', code: 'BIO', grade: '7', track: null, category: 'Core', coefficient: 1.0, weeklyHours: 3, annualHours: 108 },
  { name: 'History', nameKh: 'ប្រវត្តិវិទ្យា', code: 'HIST', grade: '7', track: null, category: 'Core', coefficient: 1.0, weeklyHours: 3, annualHours: 108 },
  { name: 'Geography', nameKh: 'ភូមិវិទ្យា', code: 'GEO', grade: '7', track: null, category: 'Core', coefficient: 1.0, weeklyHours: 3, annualHours: 108 },
  { name: 'Civics & Morality', nameKh: 'សីលធម៌ពលរដ្ឋ', code: 'CIV', grade: '7', track: null, category: 'Core', coefficient: 1.0, weeklyHours: 2, annualHours: 72 },
  { name: 'Physical Education', nameKh: 'កីឡា', code: 'PE', grade: '7', track: null, category: 'Elective', coefficient: 0.5, weeklyHours: 2, annualHours: 72 },
  { name: 'Computer Science', nameKh: 'កុំព្យូទ័រ', code: 'CS', grade: '7', track: null, category: 'Elective', coefficient: 1.0, weeklyHours: 2, annualHours: 72 },
];

// Default periods for Cambodian school (7:00 - 11:30 AM)
const DEFAULT_PERIODS = [
  { name: 'Period 1', startTime: '07:00', endTime: '07:45', order: 1, isBreak: false, duration: 45 },
  { name: 'Break', startTime: '07:45', endTime: '08:00', order: 2, isBreak: true, duration: 15 },
  { name: 'Period 2', startTime: '08:00', endTime: '08:45', order: 3, isBreak: false, duration: 45 },
  { name: 'Period 3', startTime: '08:45', endTime: '09:30', order: 4, isBreak: false, duration: 45 },
  { name: 'Break', startTime: '09:30', endTime: '09:45', order: 5, isBreak: true, duration: 15 },
  { name: 'Period 4', startTime: '09:45', endTime: '10:30', order: 6, isBreak: false, duration: 45 },
  { name: 'Period 5', startTime: '10:30', endTime: '11:15', order: 7, isBreak: false, duration: 45 },
  { name: 'Period 6', startTime: '11:15', endTime: '12:00', order: 8, isBreak: false, duration: 45 },
];

const DAYS: ('MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY')[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

async function main() {
  runDbSafetyCheck();
  console.log('🌱 Starting comprehensive school management test data seed...\n');

  const school = await prisma.school.findFirst({
    where: { name: 'Test High School' },
    include: {
      academicYears: { where: { isCurrent: true } },
      teachers: true,
      students: { where: { classId: { not: null } }, include: { class: true } },
      classes: { include: { academicYear: true } },
    },
  });

  if (!school) {
    console.error('❌ Test High School not found. Run: cd packages/database && npx prisma db seed');
    process.exit(1);
  }

  const currentYear = school.academicYears[0];
  if (!currentYear) {
    console.error('❌ No current academic year found. Run: npm run seed:test-data');
    process.exit(1);
  }

  console.log(`✅ Found school: ${school.name} (${school.id})`);
  console.log(`   Current year: ${currentYear.name}\n`);

  // ===========================================
  // 1. CREATE SUBJECTS (Cambodian curriculum)
  // ===========================================
  console.log('📚 Creating subjects...');
  const subjectMap = new Map<string, string>();

  for (const grade of ['7', '8', '9', '10', '11', '12']) {
    for (const subj of CORE_SUBJECTS) {
      const code = `${subj.code}-${grade}`;
      const existing = await prisma.subject.findUnique({ where: { code } });
      if (existing) {
        subjectMap.set(code, existing.id);
        continue;
      }
      const subject = await prisma.subject.create({
        data: {
          name: subj.name,
          nameKh: subj.nameKh,
          nameEn: subj.name,
          code,
          grade,
          track: subj.track || 'General',
          category: subj.category,
          coefficient: subj.coefficient,
          weeklyHours: subj.weeklyHours,
          annualHours: subj.annualHours,
          maxScore: 100,
          isActive: true,
        },
      });
      subjectMap.set(code, subject.id);
    }
  }
  console.log(`   ✅ ${subjectMap.size} subjects ready\n`);

  // ===========================================
  // 2. CREATE PERIODS (school schedule)
  // ===========================================
  console.log('⏰ Creating periods...');
  let periods = await prisma.period.findMany({
    where: { schoolId: school.id },
    orderBy: { order: 'asc' },
  });

  if (periods.length === 0) {
    for (const p of DEFAULT_PERIODS) {
      await prisma.period.create({
        data: { ...p, schoolId: school.id },
      });
    }
    periods = await prisma.period.findMany({
      where: { schoolId: school.id },
      orderBy: { order: 'asc' },
    });
    console.log(`   ✅ Created ${periods.length} periods`);
  } else {
    console.log(`   ⏭️  ${periods.length} periods already exist`);
  }

  const teachingPeriods = periods.filter((p) => !p.isBreak);

  // ===========================================
  // 3. SUBJECT-TEACHER ASSIGNMENTS
  // ===========================================
  console.log('\n👨‍🏫 Assigning teachers to subjects...');
  const subjectsForGrades = await prisma.subject.findMany({
    where: { grade: '10', isActive: true },
    take: 8,
  });

  const teachers = school.teachers.slice(0, 8);
  for (let i = 0; i < Math.min(teachers.length, subjectsForGrades.length); i++) {
    const teacher = teachers[i];
    const subject = subjectsForGrades[i];
    const existing = await prisma.subjectTeacher.findFirst({
      where: { teacherId: teacher.id, subjectId: subject.id },
    });
    if (!existing) {
      await prisma.subjectTeacher.create({
        data: { teacherId: teacher.id, subjectId: subject.id },
      });
    }
  }
  console.log(`   ✅ Assigned teachers to subjects\n`);

  // ===========================================
  // 4. SAMPLE GRADES (current year, current month)
  // ===========================================
  console.log('📝 Creating sample grades...');
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const currentYearNum = new Date().getFullYear();
  const classesCurrentYear = school.classes.filter((c) => c.academicYearId === currentYear.id);

  if (classesCurrentYear.length > 0 && school.students.length > 0) {
    const sampleClass = classesCurrentYear[0];
    const classStudents = school.students.filter((s) => s.classId === sampleClass.id);
    const classSubjects = await prisma.subject.findMany({
      where: { grade: sampleClass.grade, isActive: true },
      take: 5,
    });

    let gradesCreated = 0;
    for (const student of classStudents.slice(0, 10)) {
      for (const subject of classSubjects) {
        const existing = await prisma.grade.findFirst({
          where: {
            studentId: student.id,
            subjectId: subject.id,
            classId: sampleClass.id,
            month: currentMonth,
            year: currentYearNum,
          },
        });
        if (!existing) {
          const score = Math.floor(Math.random() * 30) + 70;
          await prisma.grade.create({
            data: {
              studentId: student.id,
              subjectId: subject.id,
              classId: sampleClass.id,
              score,
              maxScore: 100,
              month: currentMonth,
              monthNumber: parseInt(currentMonth, 10),
              year: currentYearNum,
              percentage: score,
              weightedScore: score * subject.coefficient,
            },
          });
          gradesCreated++;
        }
      }
    }
    console.log(`   ✅ Created ${gradesCreated} sample grade entries\n`);
  } else {
    console.log('   ⏭️  No students in current year classes, skipping grades\n');
  }

  // ===========================================
  // 5. SAMPLE ATTENDANCE
  // ===========================================
  console.log('📋 Creating sample attendance...');
  if (classesCurrentYear.length > 0 && school.students.length > 0) {
    const sampleClass = classesCurrentYear[0];
    const classStudents = school.students.filter((s) => s.classId === sampleClass.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendanceCreated = 0;
    for (const student of classStudents.slice(0, 15)) {
      for (const session of ['MORNING', 'AFTERNOON'] as const) {
        const existing = await prisma.attendance.findFirst({
          where: {
            studentId: student.id,
            classId: sampleClass.id,
            date: today,
            session,
          },
        });
        if (!existing) {
          await prisma.attendance.create({
            data: {
              studentId: student.id,
              classId: sampleClass.id,
              date: today,
              session,
              status: Math.random() > 0.9 ? 'ABSENT' : 'PRESENT',
            },
          });
          attendanceCreated++;
        }
      }
    }
    console.log(`   ✅ Created ${attendanceCreated} sample attendance records\n`);
  } else {
    console.log('   ⏭️  Skipping attendance (no students)\n');
  }

  // ===========================================
  // 6. SAMPLE TIMETABLE ENTRIES
  // ===========================================
  console.log('📅 Creating sample timetable...');
  if (classesCurrentYear.length > 0 && subjectsForGrades.length > 0 && teachers.length > 0) {
    let timetableCreated = 0;
    for (const cls of classesCurrentYear.slice(0, 3)) {
      const classSubjects = await prisma.subject.findMany({
        where: { grade: cls.grade, isActive: true },
        take: 6,
      });

      let periodIdx = 0;
      for (const day of DAYS) {
        for (const subject of classSubjects.slice(0, 5)) {
          const period = teachingPeriods[periodIdx % teachingPeriods.length];
          const teacher = teachers[periodIdx % teachers.length];

          const existing = await prisma.timetableEntry.findFirst({
            where: {
              classId: cls.id,
              periodId: period.id,
              dayOfWeek: day,
              academicYearId: currentYear.id,
            },
          });

          if (!existing) {
            await prisma.timetableEntry.create({
              data: {
                schoolId: school.id,
                classId: cls.id,
                subjectId: subject.id,
                teacherId: teacher.id,
                periodId: period.id,
                dayOfWeek: day,
                academicYearId: currentYear.id,
                room: `R${cls.grade}0${period.order}`,
              },
            });
            timetableCreated++;
          }
          periodIdx++;
        }
      }
    }
    console.log(`   ✅ Created ${timetableCreated} timetable entries\n`);
  } else {
    console.log('   ⏭️  Skipping timetable (missing data)\n');
  }

  // ===========================================
  // SUMMARY
  // ===========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ School Management Test Data Seeding Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🎯 Test these features:');
  console.log('   ✓ Subjects – Settings > Subjects');
  console.log('   ✓ Grade Entry – Grades > Entry');
  console.log('   ✓ Attendance – Attendance > Mark');
  console.log('   ✓ Timetable – Timetable');
  console.log('   ✓ Student promotion – Settings > Academic Years');
  console.log('\n👤 Login: john.doe@testhighschool.edu / SecurePass123!');
  console.log('🌐 App: http://localhost:3000\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
