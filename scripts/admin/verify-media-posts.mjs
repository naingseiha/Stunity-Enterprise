import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPosts() {
  const posts = await prisma.post.findMany({
    where: {
      title: { contains: 'Alan Turing' }
    },
    select: {
      id: true,
      title: true,
      mediaUrls: true,
      mediaMetadata: true
    }
  });

  console.log('--- Alan Turing Posts ---');
  posts.forEach(p => {
    console.log(`ID: ${p.id}`);
    console.log(`Title: ${p.title}`);
    console.log(`Media URLs: ${JSON.stringify(p.mediaUrls)}`);
    console.log(`Media Metadata: ${JSON.stringify(p.mediaMetadata)}`);
    console.log('-------------------------');
  });
}

checkPosts().finally(() => prisma.$disconnect());
