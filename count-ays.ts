import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const scs = await prisma.studentClass.groupBy({
    by: ['academicYearId'],
    _count: true
  });

  const ays = await prisma.academicYear.findMany();
  for (const sc of scs) {
    const ay = ays.find(a => a.id === sc.academicYearId);
    console.log(`AY ${ay?.name} -> Count: ${sc._count}`);
  }
}
main().finally(() => prisma.$disconnect());
