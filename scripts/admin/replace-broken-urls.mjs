import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const updates = [
  {
    search: 'Carl Friedrich Gauss',
    url: 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?q=80&w=1000&auto=format&fit=crop'
  },
  {
    search: 'Dmitri Mendeleev',
    url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1000&auto=format&fit=crop'
  },
  {
    search: 'Galileo Galilei',
    url: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=1000&auto=format&fit=crop'
  },
  {
    search: 'Stephen Hawking',
    url: 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?q=80&w=1000&auto=format&fit=crop'
  },
  {
    search: 'Leaning Tower of Pisa',
    url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1000&auto=format&fit=crop'
  },
  {
    search: 'Pyramids of Giza',
    url: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?q=80&w=1000&auto=format&fit=crop'
  },
  {
    search: 'Eiffel Tower',
    url: 'https://images.unsplash.com/photo-1503917988258-f87a78e3c995?q=80&w=1000&auto=format&fit=crop'
  },
  {
    search: 'Colosseum',
    url: 'https://images.unsplash.com/photo-1498307833015-e7b400441eb8?q=80&w=1000&auto=format&fit=crop'
  }
];

async function replaceBrokenUrls() {
  console.log('🔄 Replacing 404 Unsplash URLs with working ones...');

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
      console.log(`✅ Fixed URL for: ${post.title}`);
    }
  }

  console.log('\n✨ All broken URLs replaced successfully!');
}

replaceBrokenUrls()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
