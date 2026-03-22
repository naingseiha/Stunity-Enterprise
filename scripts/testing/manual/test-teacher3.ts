import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const allTeachersCount = await prisma.teacher.count();
  console.log(`Total Teachers Across Entire DB: ${allTeachersCount}`);
}
main().finally(() => prisma.$disconnect());
