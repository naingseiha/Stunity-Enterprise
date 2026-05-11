import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const updates = [
  {
    search: 'Alan Turing',
    url: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=1000&auto=format&fit=crop'
  },
  {
    search: 'Marie Curie',
    url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1000&auto=format&fit=crop'
  },
  {
    search: 'Nikola Tesla',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop'
  },
  {
    search: 'Albert Einstein',
    url: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=1000&auto=format&fit=crop'
  }
];

async function replaceBrokenImages() {
  console.log('🔄 Replacing broken Wikimedia images with reliable Unsplash images...');

  for (const update of updates) {
    const posts = await prisma.post.findMany({
      where: { title: { contains: update.search } }
    });

    for (const post of posts) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          mediaUrls: [update.url],
          mediaMetadata: {
            images: [{ width: 1000, height: 1500 }]
          },
          mediaAspectRatio: 0.67,
          mediaDisplayMode: 'AUTO'
        }
      });
      console.log(`✅ Fixed image for: ${post.title}`);
    }
  }

  console.log('\n✨ All broken images replaced successfully!');
}

replaceBrokenImages()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
