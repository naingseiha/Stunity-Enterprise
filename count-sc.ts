import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const allSC = await prisma.studentClass.count();
  console.log("Total StudentClass rows:", allSC);
  const distinctStudents = await prisma.studentClass.groupBy({
    by: ['studentId'],
    _count: true
  });
  console.log("Distinct students enrolled:", distinctStudents.length);
  
  const allStudents = await prisma.student.count();
  console.log("Total Students rows:", allStudents);
}
main().finally(() => prisma.$disconnect());
