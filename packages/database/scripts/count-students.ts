import { PrismaClient as StunityPrismaClient } from '@prisma/client';

const stunityDb = new StunityPrismaClient({
  datasourceUrl: "postgresql://postgres.mwqdsxbxqlkrahoyqqox:Iamaprogrammer2131@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
});

async function main() {
  const school = await stunityDb.school.findFirst({
    where: { name: { contains: 'Svaythom' } }
  });

  const count = await stunityDb.student.count({
    where: { schoolId: school.id }
  });
  console.log(`Total students in Stunity DB: ${count}`);
}

main();
