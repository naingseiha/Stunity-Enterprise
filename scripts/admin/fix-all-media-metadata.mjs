import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixAllMissingMetadata() {
  console.log('🔄 Fixing missing mediaMetadata for ALL posts...');

  const allPosts = await prisma.post.findMany({
    where: {
      postType: 'ARTICLE',
    }
  });

  let fixedCount = 0;

  for (const post of allPosts) {
    if (post.mediaUrls && post.mediaUrls.length > 0) {
      // Check if mediaMetadata is missing the 'images' array
      let needsFix = false;
      let currentMetadata = post.mediaMetadata;
      
      if (!currentMetadata) {
        needsFix = true;
      } else if (typeof currentMetadata === 'object' && !Array.isArray(currentMetadata) && !currentMetadata.images) {
        needsFix = true;
      }

      if (needsFix) {
        // Prepare correct metadata format based on number of urls
        const newImages = post.mediaUrls.map(() => ({
          width: 1000,
          height: 1500 // default vertical aspect
        }));

        await prisma.post.update({
          where: { id: post.id },
          data: {
            mediaMetadata: { images: newImages },
            mediaDisplayMode: 'AUTO',
            // Only set aspect ratio if not already set, or force it if it's currently invalid
            mediaAspectRatio: post.mediaAspectRatio || 0.67
          }
        });
        
        console.log(`✅ Fixed metadata for: ${post.title}`);
        fixedCount++;
      }
    }
  }

  console.log(`\n✨ Successfully fixed metadata for ${fixedCount} posts!`);
}

fixAllMissingMetadata()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
