import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkWorkingPost() {
  const posts = await prisma.post.findMany({
    where: {
      title: { contains: 'Big Ben' }
    },
    take: 1
  });

  console.log('--- Working Post (Big Ben) ---');
  console.log(JSON.stringify(posts[0], null, 2));
}

checkWorkingPost().finally(() => prisma.$disconnect());
