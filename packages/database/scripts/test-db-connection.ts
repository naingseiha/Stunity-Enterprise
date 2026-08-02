import { PrismaClient as StunityPrismaClient } from '@prisma/client';
import { PrismaClient as OldPrismaClient } from '../../../SchoolManagementApp/api/node_modules/@prisma/client';

async function main() {
  const stunityDb = new StunityPrismaClient();
  const oldDb = new OldPrismaClient();

  try {
    const school = await stunityDb.school.findFirst({
      where: {
        name: {
          contains: 'ស្វាយធំ'
        }
      }
    });
    console.log('Stunity School:', school?.name, school?.id);

    const oldStudentsCount = await oldDb.student.count();
    console.log('Old DB Students count:', oldStudentsCount);
    
    const newStudentsCount = await stunityDb.student.count({
      where: {
        schoolId: school?.id
      }
    });
    console.log('New DB Students count (Svay Thom):', newStudentsCount);

  } catch (error) {
    console.error('Error connecting to DBs:', error);
  } finally {
    await stunityDb.$disconnect();
    await oldDb.$disconnect();
  }
}

main();
