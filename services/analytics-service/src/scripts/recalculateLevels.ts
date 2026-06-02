import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const calculateXPForLevel = (level: number): number => {
  return 100 + (level - 1) * 50;
};

const calculateLevelFromXP = (xp: number): number => {
  let level = 1;
  let xpRequired = calculateXPForLevel(level);

  while (xp >= xpRequired) {
    xp -= xpRequired;
    level++;
    xpRequired = calculateXPForLevel(level);
  }

  return level;
};

async function main() {
  console.log('Starting level recalculation for all users...');

  const userStats = await prisma.userStats.findMany({
    select: { userId: true, xp: true, totalPoints: true, level: true }
  });

  console.log(`Found ${userStats.length} user stats records.`);

  let successCount = 0;
  let errorCount = 0;
  let usersLeveledUp = 0;

  for (const stats of userStats) {
    try {
      const newLevel = calculateLevelFromXP(stats.xp);

      if (newLevel !== stats.level) {
        usersLeveledUp++;
      }

      await prisma.$transaction([
        prisma.userStats.update({
          where: { userId: stats.userId },
          data: { level: newLevel }
        }),
        prisma.user.update({
          where: { id: stats.userId },
          data: { 
            level: newLevel,
            totalPoints: stats.totalPoints // Sync totalPoints from stats to user just in case
          }
        })
      ]);

      successCount++;
      if (successCount % 10 === 0) {
        console.log(`Processed ${successCount} users...`);
      }
    } catch (error) {
      console.error(`Failed to update stats for user ${stats.userId}:`, error);
      errorCount++;
    }
  }

  console.log(`\nFinished level recalculation.`);
  console.log(`Successfully updated: ${successCount}`);
  console.log(`Total users who got a different level: ${usersLeveledUp}`);
  console.log(`Failed to update: ${errorCount}`);
}

main()
  .catch((e) => {
    console.error('Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
