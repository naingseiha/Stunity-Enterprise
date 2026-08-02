import { PrismaClient as StunityPrismaClient } from '@prisma/client';

const stunityDb = new StunityPrismaClient({
  datasourceUrl: "postgresql://postgres.mwqdsxbxqlkrahoyqqox:Iamaprogrammer2131@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
});

async function main() {
  const school = await stunityDb.school.findFirst({
    where: { name: { contains: 'Svaythom' } }
  });

  const duplicates = await stunityDb.student.findMany({
    where: { 
      schoolId: school.id,
      studentId: {
        contains: '-dup-'
      }
    }
  });

  if (duplicates.length === 0) {
    console.log('No duplicate students found to remove.');
  } else {
    for (const dup of duplicates) {
      console.log(`Deleting duplicate student: ${dup.firstName} ${dup.lastName} (ID: ${dup.studentId})`);
      await stunityDb.student.delete({
        where: { id: dup.id }
      });
    }
    console.log(`Deleted ${duplicates.length} duplicate students.`);
  }

  const count = await stunityDb.student.count({
    where: { schoolId: school.id }
  });
  console.log(`Total students in Stunity DB now: ${count}`);
}

main();
