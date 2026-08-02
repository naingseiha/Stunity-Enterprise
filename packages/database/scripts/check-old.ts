import { PrismaClient as OldPrismaClient } from '../old-prisma/client';

const oldDb = new OldPrismaClient({
  datasourceUrl: "postgresql://neondb_owner:npg_5jxpTLtY4RvD@ep-damp-cloud-ah8x671v-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
});

async function main() {
  const withoutClassCount = await oldDb.student.count({
    where: { classId: null }
  });
  console.log(`Old DB Without Class: ${withoutClassCount}`);
}

main();
