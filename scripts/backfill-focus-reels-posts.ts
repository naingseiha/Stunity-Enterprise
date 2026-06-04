import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting backfill of backing posts for existing FocusReels...');

  const reels = await prisma.focusReel.findMany();
  console.log(`Found ${reels.length} FocusReel(s) to inspect.`);

  let createdCount = 0;
  for (const r of reels) {
    const existingPost = await prisma.post.findUnique({
      where: { id: r.id },
    });

    if (existingPost) {
      console.log(`- FocusReel "${r.title}" (ID: ${r.id}) already has a backing Post.`);
    } else {
      console.log(`- FocusReel "${r.title}" (ID: ${r.id}) is missing a backing Post. Creating...`);
      await prisma.post.create({
        data: {
          id: r.id, // match ID!
          authorId: r.creatorId,
          content: r.description || r.title,
          title: r.title,
          postType: 'TUTORIAL',
          visibility: 'PUBLIC',
          courseCode: r.subject,
          topicTags: [r.subject],
          mediaUrls: [r.videoUrl],
        },
      });
      createdCount++;
    }
  }

  console.log(`✅ Backfill complete. Created ${createdCount} backing Post(s).`);
}

main()
  .catch((err) => {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
