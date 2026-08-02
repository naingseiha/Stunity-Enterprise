import { PrismaClient as StunityPrismaClient } from '@prisma/client';
import { PrismaClient as OldPrismaClient } from '../old-prisma/client';

const stunityDb = new StunityPrismaClient({
  datasourceUrl: "postgresql://postgres.mwqdsxbxqlkrahoyqqox:Iamaprogrammer2131@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
});
const oldDb = new OldPrismaClient({
  datasourceUrl: "postgresql://neondb_owner:npg_5jxpTLtY4RvD@ep-damp-cloud-ah8x671v-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
});

async function main() {
  console.log('--- Starting Synchronization ---');
  
  try {
    const school = await stunityDb.school.findFirst({
      where: { name: { contains: 'Svaythom' } }
    });

    if (!school) {
      console.error('School not found!');
      return;
    }

    const oldClasses = await oldDb.class.findMany();
    const oldStudents = await oldDb.student.findMany();
    
    const newClasses = await stunityDb.class.findMany({
      where: { schoolId: school.id }
    });
    const newStudents = await stunityDb.student.findMany({
      where: { schoolId: school.id }
    });

    const newClassMap = new Map();
    for (const c of newClasses) {
      newClassMap.set(c.name.trim().toLowerCase(), c);
    }
    const oldClassMap = new Map();
    for (const c of oldClasses) {
      oldClassMap.set(c.id, c);
    }

    let studentsToUpdateClass = [];
    let studentsToCreate = [];

    const newStudentMap = new Map();
    for (const s of newStudents) {
      if (s.studentId) newStudentMap.set(`id:${s.studentId}`, s);
      newStudentMap.set(`name:${s.firstName.trim().toLowerCase()} ${s.lastName.trim().toLowerCase()}`, s);
      newStudentMap.set(`name:${s.lastName.trim().toLowerCase()} ${s.firstName.trim().toLowerCase()}`, s);
    }

    for (const oldStudent of oldStudents) {
      let newStudent = null;
      if (oldStudent.studentId) {
        newStudent = newStudentMap.get(`id:${oldStudent.studentId}`);
      }
      if (!newStudent) {
        newStudent = newStudentMap.get(`name:${oldStudent.firstName.trim().toLowerCase()} ${oldStudent.lastName.trim().toLowerCase()}`);
      }
      if (!newStudent && oldStudent.khmerName) {
        newStudent = newStudentMap.get(`name:${oldStudent.lastName.trim().toLowerCase()} ${oldStudent.firstName.trim().toLowerCase()}`);
      }
      
      const oldClass = oldStudent.classId ? oldClassMap.get(oldStudent.classId) : null;
      const oldClassName = oldClass ? oldClass.name.trim() : null;

      if (!newStudent) {
        studentsToCreate.push({
          oldStudent,
          intendedClassName: oldClassName
        });
      } else {
        const newClassForStudent = newStudent.classId ? newClasses.find(c => c.id === newStudent.classId) : null;
        const newClassName = newClassForStudent ? newClassForStudent.name.trim() : null;

        if (oldClassName !== newClassName) {
          const intendedNewClassId = oldClassName ? (newClassMap.get(oldClassName.toLowerCase())?.id || null) : null;
          studentsToUpdateClass.push({
            newStudent,
            oldStudent,
            oldClassName,
            newClassName,
            intendedNewClassId
          });
        }
        
        // Remove from map to track who is left and prevent multiple matches
        if (newStudent.studentId) newStudentMap.delete(`id:${newStudent.studentId}`);
        newStudentMap.delete(`name:${newStudent.firstName.trim().toLowerCase()} ${newStudent.lastName.trim().toLowerCase()}`);
        newStudentMap.delete(`name:${newStudent.lastName.trim().toLowerCase()} ${newStudent.firstName.trim().toLowerCase()}`);
      }
    }

    console.log(`Updates: ${studentsToUpdateClass.length}, Creates: ${studentsToCreate.length}`);

    // 1. Update existing students' classes
    for (const update of studentsToUpdateClass) {
      if (update.intendedNewClassId) {
        await stunityDb.student.update({
          where: { id: update.newStudent.id },
          data: { classId: update.intendedNewClassId }
        });
        console.log(`Updated class for ${update.newStudent.firstName} ${update.newStudent.lastName}`);
      } else if (update.oldClassName === null) {
        await stunityDb.student.update({
          where: { id: update.newStudent.id },
          data: { classId: null }
        });
        console.log(`Removed class for ${update.newStudent.firstName} ${update.newStudent.lastName}`);
      } else {
        console.warn(`Could not find target class '${update.oldClassName}' in Stunity DB for ${update.newStudent.firstName} ${update.newStudent.lastName}`);
      }
    }

    // 2. Create missing students
    let createdCount = 0;
    for (const item of studentsToCreate) {
      const { oldStudent, intendedClassName } = item;
      const intendedClassId = intendedClassName ? (newClassMap.get(intendedClassName.toLowerCase())?.id || null) : null;

      // Extract gender (enum mapping)
      // Old DB: MALE, FEMALE
      // New DB: MALE, FEMALE
      let gender = oldStudent.gender;

      try {
        await stunityDb.student.create({
          data: {
            schoolId: school.id,
            studentId: oldStudent.studentId,
            firstName: oldStudent.firstName,
            lastName: oldStudent.lastName,
            englishFirstName: oldStudent.englishName?.split(' ')[0] || null,
            englishLastName: oldStudent.englishName?.split(' ').slice(1).join(' ') || null,
            dateOfBirth: oldStudent.dateOfBirth,
            gender: gender,
            email: oldStudent.email || null,
            phoneNumber: oldStudent.phoneNumber || null,
            classId: intendedClassId,
            photoUrl: oldStudent.photoUrl || null,
            isAccountActive: oldStudent.isAccountActive,
            studentRole: oldStudent.studentRole
          }
        });
        createdCount++;
        console.log(`Created student: ${oldStudent.firstName} ${oldStudent.lastName}`);
      } catch (err: any) {
        if (err.code === 'P2002') {
          console.warn(`Duplicate studentId ${oldStudent.studentId} for ${oldStudent.firstName} ${oldStudent.lastName}. Creating with null studentId...`);
          await stunityDb.student.create({
            data: {
              schoolId: school.id,
              studentId: oldStudent.studentId ? `${oldStudent.studentId}-dup-${Math.floor(Math.random()*1000)}` : null,
              firstName: oldStudent.firstName,
              lastName: oldStudent.lastName,
              englishFirstName: oldStudent.englishName?.split(' ')[0] || null,
              englishLastName: oldStudent.englishName?.split(' ').slice(1).join(' ') || null,
              dateOfBirth: oldStudent.dateOfBirth,
              gender: gender,
              email: oldStudent.email ? `dup-${Math.floor(Math.random()*1000)}@${oldStudent.email}` : null,
              phoneNumber: oldStudent.phoneNumber || null,
              classId: intendedClassId,
              photoUrl: oldStudent.photoUrl || null,
              isAccountActive: oldStudent.isAccountActive,
              studentRole: oldStudent.studentRole
            }
          });
          createdCount++;
          console.log(`Created student (with dup ID): ${oldStudent.firstName} ${oldStudent.lastName}`);
        } else {
          throw err;
        }
      }
    }

    console.log(`\n--- Synchronization Complete ---`);
    console.log(`Created ${createdCount} students. Updated ${studentsToUpdateClass.length} student classes.`);

  } catch (error) {
    console.error('Error during synchronization:', error);
  } finally {
    await stunityDb.$disconnect();
    await oldDb.$disconnect();
  }
}

main();
