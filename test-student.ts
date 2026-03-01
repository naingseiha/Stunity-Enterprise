import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const students = await prisma.student.findMany({
    where: { 
      OR: [
        { studentId: "25080083" },
        { email: "25080083@student.edu.kh" }
      ]
    }
  });

  console.log("Found in DB:", students);
}
main();
