const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const achievements = [
  { id: 'FIRST_PERFECT', key: 'first_perfect', name: 'Perfect Score', description: 'Get your first perfect score on a quiz', icon: '🎯', category: 'performance', tier: 'bronze', xpReward: 50 },
  { id: 'STREAK_7_DAYS', key: 'streak_7_days', name: '7-Day Streak', description: 'Complete quizzes for 7 days in a row', icon: '🔥', category: 'streak', tier: 'bronze', xpReward: 100 },
  { id: 'STREAK_30_DAYS', key: 'streak_30_days', name: '30-Day Streak', description: 'Complete quizzes for 30 days in a row', icon: '💎', category: 'streak', tier: 'silver', xpReward: 500 },
  { id: 'STREAK_100_DAYS', key: 'streak_100_days', name: '100-Day Streak', description: 'Complete quizzes for 100 days in a row', icon: '👑', category: 'streak', tier: 'platinum', xpReward: 2000 },
  { id: 'SPEED_DEMON', key: 'speed_demon', name: 'Speed Demon', description: 'Complete a quiz in under 50% of the time limit', icon: '⚡', category: 'performance', tier: 'silver', xpReward: 75 },
  { id: 'KNOWLEDGE_MASTER', key: 'knowledge_master', name: 'Knowledge Master', description: 'Complete 100 quizzes', icon: '🧠', category: 'milestone', tier: 'gold', xpReward: 300 },
  { id: 'TOP_PERFORMER', key: 'top_performer', name: 'Top Performer', description: 'Reach level 10', icon: '⭐', category: 'milestone', tier: 'silver', xpReward: 200 },
  { id: 'QUIZ_MASTER', key: 'quiz_master', name: 'Quiz Master', description: 'Reach level 20', icon: '🏆', category: 'milestone', tier: 'platinum', xpReward: 500 },
  { id: 'FIRST_WIN', key: 'first_win', name: 'First Win', description: 'Win your first live quiz session', icon: '🥇', category: 'competition', tier: 'bronze', xpReward: 100 },
  { id: 'CHAMPION', key: 'champion', name: 'Champion', description: 'Win 10 live quiz sessions', icon: '🏅', category: 'competition', tier: 'gold', xpReward: 300 },
  { id: 'CHALLENGER', key: 'challenger', name: 'Challenger', description: 'Win your first challenge', icon: '⚔️', category: 'competition', tier: 'bronze', xpReward: 75 },
  { id: 'UNDEFEATED', key: 'undefeated', name: 'Undefeated', description: 'Win 10 challenges in a row', icon: '🛡️', category: 'competition', tier: 'platinum', xpReward: 400 },
];

async function main() {
  console.log('🌱 Seeding achievements...');
  
  for (const achievement of achievements) {
    await prisma.gameAchievement.upsert({
      where: { key: achievement.key },
      update: achievement,
      create: achievement,
    });
    console.log(`  ✅ ${achievement.icon} ${achievement.name}`);
  }
  
  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
