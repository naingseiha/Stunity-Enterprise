import { PrismaClient as StunityPrismaClient } from '@prisma/client';
import { PrismaClient as OldPrismaClient } from '../old-prisma/client';

const stunityDb = new StunityPrismaClient({
  datasourceUrl: "postgresql://postgres.mwqdsxbxqlkrahoyqqox:Iamaprogrammer2131@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
});
const oldDb = new OldPrismaClient({
  datasourceUrl: "postgresql://neondb_owner:npg_5jxpTLtY4RvD@ep-damp-cloud-ah8x671v-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
});

async function main() {
  const oldStudents = await oldDb.student.findMany({
    where: { firstName: 'សុធារ៉ា', lastName: 'គង់' },
    include: { class: true }
  });
  console.log('Old DB:');
  oldStudents.forEach(s => console.log(s.id, s.firstName, s.lastName, s.class?.name));

  const newStudents = await stunityDb.student.findMany({
    where: { firstName: 'សុធារ៉ា', lastName: 'គង់' },
    include: { class: true }
  });
  console.log('\nNew DB:');
  newStudents.forEach(s => console.log(s.id, s.firstName, s.lastName, s.class?.name));
}

main();
