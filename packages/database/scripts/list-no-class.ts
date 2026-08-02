import { PrismaClient as StunityPrismaClient } from '@prisma/client';

const stunityDb = new StunityPrismaClient({
  datasourceUrl: "postgresql://postgres.mwqdsxbxqlkrahoyqqox:Iamaprogrammer2131@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
});

async function main() {
  const school = await stunityDb.school.findFirst({
    where: { name: { contains: 'Svaythom' } }
  });

  const studentsWithoutClass = await stunityDb.student.findMany({
    where: { schoolId: school.id, classId: null }
  });

  console.log("សិស្សដែលគ្មានថ្នាក់រៀនមានចំនួន:", studentsWithoutClass.length);
  studentsWithoutClass.forEach((s, idx) => {
    console.log(`${idx + 1}. ឈ្មោះ: ${s.firstName} ${s.lastName} (ID: ${s.studentId || 'គ្មាន'})`);
  });
}

main();
