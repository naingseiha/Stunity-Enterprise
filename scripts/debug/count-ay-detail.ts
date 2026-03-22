import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const school = await prisma.school.findFirst({ where: { name: 'Svaythom High School' } });
  const ay2025 = await prisma.academicYear.findFirst({ where: { schoolId: school!.id, name: '2025-2026' } });
  
  const distinct = await prisma.studentClass.groupBy({
    by: ['studentId'],
    where: { academicYearId: ay2025!.id }
  });
  console.log("Distinct students in 2025-2026:", distinct.length);
  const total = await prisma.studentClass.count({ where: { academicYearId: ay2025!.id } });
  console.log("Total StudentClass rows in 2025-2026:", total);
}
main().finally(() => prisma.$disconnect());
