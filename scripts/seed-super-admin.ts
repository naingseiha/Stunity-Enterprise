/**
 * Promote an existing user to Super Admin.
 * Usage: npx tsx scripts/seed-super-admin.ts [email]
 * Example: npx tsx scripts/seed-super-admin.ts admin@stunity.com
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'john.doe@testhighschool.edu';

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, firstName: true, lastName: true, isSuperAdmin: true },
  });

  if (!user) {
    console.error(`❌ User not found: ${email}`);
    console.log('Create a user first, or run with a valid email:');
    console.log('  npx tsx scripts/seed-super-admin.ts your@email.com');
    process.exit(1);
  }

  if (user.isSuperAdmin) {
    console.log(`✅ ${user.email} is already a Super Admin`);
    process.exit(0);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isSuperAdmin: true },
  });

  console.log(`✅ Promoted ${user.email} to Super Admin`);
  console.log(`   Log in at /auth/login to access the Super Admin dashboard at /super-admin`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
