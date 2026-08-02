import { PrismaClient as StunityPrismaClient } from '@prisma/client';
import { PrismaClient as OldPrismaClient } from '../old-prisma/client';

const stunityDb = new StunityPrismaClient({
  datasourceUrl: "postgresql://postgres.mwqdsxbxqlkrahoyqqox:Iamaprogrammer2131@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
});
// Explicitly pass the old database connection URL
const oldDb = new OldPrismaClient({
  datasourceUrl: "postgresql://neondb_owner:npg_5jxpTLtY4RvD@ep-damp-cloud-ah8x671v-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
});

async function main() {
  console.log('--- Starting Verification ---');
  
  try {
    // 1. Get Hun Sen Svay Thom High School from Stunity
    const school = await stunityDb.school.findFirst({
      where: { name: { contains: 'Svaythom' } }
    });

    if (!school) {
      console.error('School not found by Svaythom name! Listing all schools:');
      const allSchools = await stunityDb.school.findMany({ select: { id: true, name: true, slug: true }});
      console.log(allSchools);
      return;
    }
    console.log(`Found school: ${school.name} (ID: ${school.id})`);

    // 2. Fetch all students and classes from old DB
    const oldClasses = await oldDb.class.findMany();
    const oldStudents = await oldDb.student.findMany();
    
    console.log(`Old DB: ${oldClasses.length} classes, ${oldStudents.length} students`);

    // 3. Fetch all students and classes from new DB for this school
    const newClasses = await stunityDb.class.findMany({
      where: { schoolId: school.id }
    });
    const newStudents = await stunityDb.student.findMany({
      where: { schoolId: school.id }
    });

    console.log(`New DB: ${newClasses.length} classes, ${newStudents.length} students`);

    // Helper map for new classes
    const newClassMap = new Map();
    for (const c of newClasses) {
      // Map by name (e.g., '12A1')
      newClassMap.set(c.name.trim().toLowerCase(), c);
    }
    
    // Helper map for old classes
    const oldClassMap = new Map();
    for (const c of oldClasses) {
      oldClassMap.set(c.id, c);
    }

    // 4. Compare
    let studentsToUpdateClass = [];
    let studentsToCreate = [];
    let studentsNotFoundInOld = [];
    let unchanged = 0;

    // Map new students by multiple keys
    const newStudentMap = new Map();
    for (const s of newStudents) {
      // Key 1: studentId (if exists)
      if (s.studentId) newStudentMap.set(`id:${s.studentId}`, s);
      // Key 2: exact name match
      newStudentMap.set(`name:${s.firstName.trim().toLowerCase()} ${s.lastName.trim().toLowerCase()}`, s);
      // Key 3: reversed name match
      newStudentMap.set(`name:${s.lastName.trim().toLowerCase()} ${s.firstName.trim().toLowerCase()}`, s);
    }

    for (const oldStudent of oldStudents) {
      // Try to find by ID first, then names
      let newStudent = null;
      if (oldStudent.studentId) {
        newStudent = newStudentMap.get(`id:${oldStudent.studentId}`);
      }
      
      if (!newStudent) {
        newStudent = newStudentMap.get(`name:${oldStudent.firstName.trim().toLowerCase()} ${oldStudent.lastName.trim().toLowerCase()}`);
      }
      if (!newStudent && oldStudent.khmerName) {
        // sometimes khmerName has spaces, sometimes it doesn't. 
        // We can try to see if firstName+lastName in new db equals khmerName
        // but let's stick to just reversing first/last for now.
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
        // Compare class
        const newClassForStudent = newStudent.classId ? newClasses.find(c => c.id === newStudent.classId) : null;
        const newClassName = newClassForStudent ? newClassForStudent.name.trim() : null;

        if (oldClassName !== newClassName) {
          studentsToUpdateClass.push({
            newStudent,
            oldStudent,
            oldClassName,
            newClassName,
            intendedNewClassId: oldClassName ? (newClassMap.get(oldClassName.toLowerCase())?.id || null) : null
          });
        } else {
          unchanged++;
        }
        
        // Remove from map to track who is left
        if (newStudent.studentId) newStudentMap.delete(`id:${newStudent.studentId}`);
        newStudentMap.delete(`name:${newStudent.firstName.trim().toLowerCase()} ${newStudent.lastName.trim().toLowerCase()}`);
        newStudentMap.delete(`name:${newStudent.lastName.trim().toLowerCase()} ${newStudent.firstName.trim().toLowerCase()}`);
      }
    }

    // Deduplicate remaining students in newStudentMap
    const leftOvers = new Set();
    for (const [key, student] of newStudentMap.entries()) {
      leftOvers.add(student);
    }
    studentsNotFoundInOld = Array.from(leftOvers);

    console.log('--- Verification Results ---');
    console.log(`Unchanged students: ${unchanged}`);
    console.log(`Students needing class update: ${studentsToUpdateClass.length}`);
    console.log(`Students missing in new DB (need creation): ${studentsToCreate.length}`);
    console.log(`Students in new DB but NOT active/found in old DB: ${studentsNotFoundInOld.length}`);

    // Print some examples
    if (studentsToUpdateClass.length > 0) {
      console.log('\nExamples of class updates needed:');
      studentsToUpdateClass.slice(0, 5).forEach(s => {
        console.log(`- ${s.newStudent.firstName} ${s.newStudent.lastName}: Stunity Class '${s.newClassName}' -> Old Class '${s.oldClassName}'`);
      });
    }

    if (studentsToCreate.length > 0) {
      console.log('\nExamples of students to create:');
      studentsToCreate.slice(0, 5).forEach(s => {
        console.log(`- ${s.oldStudent.firstName} ${s.oldStudent.lastName} (Class: ${s.intendedClassName})`);
      });
    }

  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await stunityDb.$disconnect();
    await oldDb.$disconnect();
  }
}

main();
