import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const fixes = [
  {
    search: 'Alan Turing',
    newTitle: 'Alan Turing: The Father of Computer Science',
    portraitUrl: 'https://images.unsplash.com/photo-1516110833967-0b5716ca1387?q=80&w=1000&auto=format&fit=crop' // Using Unsplash as fallback if wikimedia fails
  },
  {
    search: 'Marie Curie',
    newTitle: 'Marie Curie: Pioneer of Radioactivity',
    portraitUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1000&auto=format&fit=crop'
  }
];

async function fixMediaPosts() {
  console.log('🛠️ Fixing Media Posts Metadata and URLs...');

  const posts = await prisma.post.findMany({
    where: {
      OR: [
        { title: { contains: 'Alan Turing' } },
        { title: { contains: 'Marie Curie' } },
        { title: { contains: 'Nikola Tesla' } },
        { title: { contains: 'Albert Einstein' } }
      ]
    }
  });

  for (const post of posts) {
    let updatedUrl = post.mediaUrls[0];
    
    // If it's a wikimedia URL, let's keep it but ensure metadata is correct.
    // If it's failing, we might need a proxy or different source.
    
    const imagesMetadata = post.mediaUrls.map(() => ({
      width: 1000,
      height: 1500
    }));

    await prisma.post.update({
      where: { id: post.id },
      data: {
        mediaMetadata: { images: imagesMetadata },
        mediaDisplayMode: 'AUTO',
        mediaAspectRatio: 0.67
      }
    });
    console.log(`✅ Updated Metadata for: ${post.title}`);
  }

  console.log('\n✨ All posts updated with correct metadata structure.');
}

fixMediaPosts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
