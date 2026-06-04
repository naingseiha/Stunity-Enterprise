import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Checking FocusReels in DB...');
  const reels = await prisma.focusReel.findMany();
  console.log(`Found ${reels.length} FocusReel(s).`);
  for (const r of reels) {
    const post = await prisma.post.findUnique({ where: { id: r.id } });
    console.log(`- Reel: "${r.title}" (ID: ${r.id}) -> Backing Post exists: ${!!post}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
