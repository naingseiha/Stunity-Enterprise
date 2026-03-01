/**
 * Create or promote a Super Admin user.
 *
 * Usage:
 *   # Promote existing user by email:
 *   npx tsx scripts/seed-super-admin.ts admin@stunity.com
 *
 *   # Create a brand new super admin from scratch:
 *   npx tsx scripts/seed-super-admin.ts --create \
 *     --email admin@stunity.com \
 *     --password SecurePass123! \
 *     --first Platform \
 *     --last Admin
 *
 *   # Using env vars:
 *   SUPER_ADMIN_EMAIL=admin@stunity.com SUPER_ADMIN_PASSWORD=SecurePass123! \
 *   SUPER_ADMIN_FIRST=Platform SUPER_ADMIN_LAST=Admin \
 *     npx tsx scripts/seed-super-admin.ts --create
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const CREATE_MODE = args.includes('--create');

function getArg(flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
}

// Positional arg (email) for the "promote" mode
const POSITIONAL_EMAIL = args.find((a) => !a.startsWith('--') && a.includes('@'));

const email = getArg('--email') || process.env.SUPER_ADMIN_EMAIL || POSITIONAL_EMAIL;
const password = getArg('--password') || process.env.SUPER_ADMIN_PASSWORD;
const firstName = getArg('--first') || process.env.SUPER_ADMIN_FIRST || 'Platform';
const lastName = getArg('--last') || process.env.SUPER_ADMIN_LAST || 'Admin';

async function main() {
  if (!email) {
    console.error('');
    console.error('❌  Email is required.');
    console.error('');
    console.error('  Promote existing user:');
    console.error('    npx tsx scripts/seed-super-admin.ts admin@stunity.com');
    console.error('');
    console.error('  Create new super admin:');
    console.error('    npx tsx scripts/seed-super-admin.ts --create \\');
    console.error('      --email admin@stunity.com --password SecurePass123!');
    console.error('');
    process.exit(1);
  }

  if (CREATE_MODE) {
    // ── Create mode ─────────────────────────────────────────────────────────
    if (!password) {
      console.error('❌  --password is required in --create mode.');
      process.exit(1);
    }
    if (password.length < 8) {
      console.error('❌  Password must be at least 8 characters.');
      process.exit(1);
    }

    const hashedPassword = await hash(password, 12);

    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      // Promote existing user
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          isSuperAdmin: true,
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true,
        },
      });
      console.log('');
      console.log(`✅  Updated existing user to super admin.`);
      console.log(`    Email : ${email}`);
      console.log(`    ID    : ${existing.id}`);
      console.log('');
    } else {
      // Create from scratch
      const sa = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
          role: 'ADMIN',
          isSuperAdmin: true,
          isActive: true,
          isDefaultPassword: false,
          schoolId: null,
        },
      });
      console.log('');
      console.log(`✅  Super admin created successfully.`);
      console.log(`    Name  : ${firstName} ${lastName}`);
      console.log(`    Email : ${sa.email}`);
      console.log(`    ID    : ${sa.id}`);
      console.log('');
    }
  } else {
    // ── Promote mode ─────────────────────────────────────────────────────────
    const user = await prisma.user.findFirst({
      where: { email },
      select: { id: true, email: true, firstName: true, lastName: true, isSuperAdmin: true },
    });

    if (!user) {
      console.error('');
      console.error(`❌  User not found: ${email}`);
      console.error('    To create a new super admin use --create:');
      console.error(`    npx tsx scripts/seed-super-admin.ts --create --email ${email} --password SecurePass123!`);
      console.error('');
      process.exit(1);
    }

    if (user.isSuperAdmin) {
      console.log('');
      console.log(`✅  ${user.email} is already a Super Admin.`);
      console.log('');
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isSuperAdmin: true },
    });

    console.log('');
    console.log(`✅  Promoted ${user.firstName} ${user.lastName} to Super Admin.`);
    console.log(`    Email : ${user.email}`);
    console.log(`    ID    : ${user.id}`);
    console.log('');
  }

  console.log('  Login at: /[locale]/auth/login');
  console.log('  Super admin dashboard: /[locale]/super-admin');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌  Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
