import { PrismaClient } from '@prisma/client';
import { generateUniqueUsername } from '../utils/username';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting username generation for existing users...');

  // Find all users who don't have a username
  const users = await prisma.user.findMany({
    where: { username: null },
    select: { id: true, firstName: true, lastName: true },
  });

  console.log(`Found ${users.length} users without a username.`);

  let successCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      const username = await generateUniqueUsername(prisma, user.firstName, user.lastName, user.id);

      await prisma.user.update({
        where: { id: user.id },
        data: { username },
      });

      successCount++;
      if (successCount % 10 === 0) {
        console.log(`Processed ${successCount} users...`);
      }
    } catch (error) {
      console.error(`Failed to update username for user ${user.id}:`, error);
      errorCount++;
    }
  }

  console.log(`\nFinished username generation.`);
  console.log(`Successfully updated: ${successCount}`);
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
