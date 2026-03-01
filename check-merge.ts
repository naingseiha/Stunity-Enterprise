import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const school = await prisma.school.findFirst({ where: { name: 'Svaythom High School' } });
  const ays = await prisma.academicYear.findMany({ where: { schoolId: school!.id } });
  const ay2025 = ays.find(ay => ay.name === '2025-2026')!;
  const ay2026 = ays.find(ay => ay.name === '2026-2027')!;

  console.log("--- 2025-2026 Counts ---");
  const c1 = await prisma.class.count({ where: { academicYearId: ay2025.id } });
  const sc1 = await prisma.studentClass.count({ where: { academicYearId: ay2025.id } });
  console.log("Classes:", c1);
  console.log("Student Enrollments:", sc1);

  console.log("\n--- 2026-2027 Counts ---");
  const c2 = await prisma.class.count({ where: { academicYearId: ay2026.id } });
  const sc2 = await prisma.studentClass.count({ where: { academicYearId: ay2026.id } });
  console.log("Classes:", c2);
  console.log("Student Enrollments:", sc2);
}
main().finally(() => prisma.$disconnect());
