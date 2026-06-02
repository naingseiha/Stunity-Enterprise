import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// One-shot backfill: the old schema default granted every user 3 streak freezes.
// The freeze policy is now "at most 1 held at a time" (growth-plan §3.2), so clamp
// any existing record above the cap down to 1.
const MAX_FREEZES_AVAILABLE = 1;

async function main() {
  console.log('Clamping streak freezes to the cap...');

  const result = await prisma.learningStreak.updateMany({
    where: { freezesTotal: { gt: MAX_FREEZES_AVAILABLE } },
    data: { freezesTotal: MAX_FREEZES_AVAILABLE },
  });

  console.log(`Clamped ${result.count} streak records to freezesTotal=${MAX_FREEZES_AVAILABLE}.`);
}

main()
  .catch((e) => {
    console.error('Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
