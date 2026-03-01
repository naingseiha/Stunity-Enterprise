import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  const users = await prisma.user.findMany({
    where: { 
        role: 'TEACHER', 
        schoolId: { not: null },
        teacherId: null 
    },
    include: { school: true }
  });
  
  console.log(`Found ${users.length} users needing Teacher records.`);
  
  for(const user of users) {
      if(!user.schoolId) continue;
      
      const newTeacher = await prisma.teacher.create({
          data: {
              schoolId: user.schoolId,
              firstName: user.firstName,
              lastName: user.lastName,
              khmerName: user.khmerName || `${user.firstName} ${user.lastName}`,
              email: user.email,
              phone: user.phone || `+855${Math.floor(Math.random() * 1000000000)}`,
              gender: 'MALE', 
          }
      });
      
      await prisma.user.update({
          where: { id: user.id },
          data: { teacherId: newTeacher.id }
      });
      
      console.log(`Fixed user ${user.email}, created teacher ${newTeacher.id}`);
  }
}

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
