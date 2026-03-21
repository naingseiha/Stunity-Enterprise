const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const currentAcademicYear = await prisma.academicYear.findFirst({
    where: { schoolId: 'cmm7yhssh0000lwcvao23npok', isCurrent: true }
  });
  
  const dups = await prisma.class.findMany({where: {name: 'ថ្នាក់ទី10ខ'}});
  if (dups.length > 1) {
     const toKeep = dups[0].id;
     await prisma.class.deleteMany({
       where: { id: { in: dups.slice(1).map(d => d.id) } }
     });
     console.log('Cleaned duplicates');
  } else {
     console.log('No duplicates found');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
