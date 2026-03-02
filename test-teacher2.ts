import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.findFirst({
    where: { name: 'Svaythom High School' }
  });

  if (!school) return console.log("No school found!");

  const ay = await prisma.academicYear.findFirst({
      where: { schoolId: school.id, isCurrent: true }
  });
  
  if (!ay) return console.log("No active AY found!");
  
  const teachersCount = await prisma.teacher.count({ where: { schoolId: school.id } });
  
  const teachersWithClassCount = await prisma.teacher.count({
      where: {
          schoolId: school.id,
          teacherClasses: {
              some: {
                  class: { academicYearId: ay.id }
              }
          }
      }
  });
  
  console.log(`Total Teachers in School: ${teachersCount}`);
  console.log(`Teachers with Class in AY ${ay.name}: ${teachersWithClassCount}`);
}
main().finally(() => prisma.$disconnect());
