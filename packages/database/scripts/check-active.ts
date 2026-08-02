import { PrismaClient as StunityPrismaClient } from '@prisma/client';

const stunityDb = new StunityPrismaClient({
  datasourceUrl: "postgresql://postgres.mwqdsxbxqlkrahoyqqox:Iamaprogrammer2131@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
});

async function main() {
  const school = await stunityDb.school.findFirst({
    where: { name: { contains: 'Svaythom' } }
  });

  const activeCount = await stunityDb.student.count({
    where: { schoolId: school.id, isAccountActive: true }
  });
  const inactiveCount = await stunityDb.student.count({
    where: { schoolId: school.id, isAccountActive: false }
  });
  
  const withoutClassCount = await stunityDb.student.count({
    where: { schoolId: school.id, classId: null }
  });

  console.log(`Active: ${activeCount}, Inactive: ${inactiveCount}, Total: ${activeCount + inactiveCount}`);
  console.log(`Without Class: ${withoutClassCount}`);
}

main();
