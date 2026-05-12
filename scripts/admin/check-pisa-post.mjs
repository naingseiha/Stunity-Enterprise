import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({
    where: {
      title: { contains: 'Leaning Tower of Pisa' }
    },
    select: {
      id: true,
      title: true,
      mediaUrls: true,
      mediaMetadata: true,
      mediaAspectRatio: true
    }
  });

  console.log(JSON.stringify(posts, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
