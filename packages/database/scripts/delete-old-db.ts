import { PrismaClient as OldPrismaClient } from '../old-prisma/client';

const oldDb = new OldPrismaClient({
  datasourceUrl: "postgresql://neondb_owner:npg_5jxpTLtY4RvD@ep-damp-cloud-ah8x671v-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
});

async function main() {
  console.log('--- Deleting from Old DB (SchoolManagement) ---');
  
  // 1. Delete 4 students without class
  const studentsWithoutClass = await oldDb.student.findMany({
    where: { classId: null }
  });

  if (studentsWithoutClass.length > 0) {
    for (const student of studentsWithoutClass) {
      console.log(`Deleting student without class: ${student.firstName} ${student.lastName}`);
      await oldDb.student.delete({
        where: { id: student.id }
      });
    }
    console.log(`Deleted ${studentsWithoutClass.length} students without class.`);
  } else {
    console.log('No students without class found.');
  }

  // 2. Delete the duplicate "សុធារ៉ា គង់" that we didn't keep
  // We keep 'cmit6p4rx005nyok0186y2e8y' which is the one present in Stunity DB.
  // We delete 'cmpnqemmv006n7gewa0he25se'
  try {
    const dupStudent = await oldDb.student.findUnique({
      where: { id: 'cmpnqemmv006n7gewa0he25se' }
    });
    
    if (dupStudent) {
      console.log(`Deleting duplicate student: ${dupStudent.firstName} ${dupStudent.lastName} (ID: ${dupStudent.id})`);
      await oldDb.student.delete({
        where: { id: 'cmpnqemmv006n7gewa0he25se' }
      });
      console.log('Deleted 1 duplicate student.');
    } else {
      console.log('Duplicate student not found (already deleted?).');
    }
  } catch (error) {
    console.log('Error deleting duplicate student:', error.message);
  }

  const finalCount = await oldDb.student.count();
  console.log(`Total students remaining in Old DB: ${finalCount}`);
}

main();
