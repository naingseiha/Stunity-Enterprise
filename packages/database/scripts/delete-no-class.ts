import { PrismaClient as StunityPrismaClient } from '@prisma/client';

const stunityDb = new StunityPrismaClient({
  datasourceUrl: "postgresql://postgres.mwqdsxbxqlkrahoyqqox:Iamaprogrammer2131@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
});

async function main() {
  console.log('--- Deleting 4 students without class ---');
  
  const school = await stunityDb.school.findFirst({
    where: { name: { contains: 'Svaythom' } }
  });

  if (!school) {
    console.error('School not found!');
    return;
  }

  const result = await stunityDb.student.deleteMany({
    where: { 
      schoolId: school.id,
      classId: null
    }
  });

  console.log(`Successfully deleted ${result.count} students without class.`);
  
  const finalCount = await stunityDb.student.count({
    where: { schoolId: school.id }
  });
  console.log(`Total students remaining in Stunity DB: ${finalCount}`);
}

main();
