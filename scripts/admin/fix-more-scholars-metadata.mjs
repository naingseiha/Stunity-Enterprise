import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const updates = [
  { search: 'Carl Friedrich Gauss' },
  { search: 'Dmitri Mendeleev' },
  { search: 'Galileo Galilei' },
  { search: 'Stephen Hawking' }
];

async function fixScholarMetadata() {
  console.log('🔄 Fixing missing mediaMetadata for Scholar posts...');

  for (const update of updates) {
    const posts = await prisma.post.findMany({
      where: { title: { contains: update.search } }
    });

    for (const post of posts) {
      if (post.mediaUrls && post.mediaUrls.length > 0) {
        await prisma.post.update({
          where: { id: post.id },
          data: {
            mediaMetadata: {
              images: [{ width: 1000, height: 1500 }]
            },
            mediaAspectRatio: 0.67,
            mediaDisplayMode: 'AUTO'
          }
        });
        console.log(`✅ Fixed metadata for: ${post.title}`);
      }
    }
  }

  console.log('\n✨ All scholar posts fixed successfully!');
}

fixScholarMetadata()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
