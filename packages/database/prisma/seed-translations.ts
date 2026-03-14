import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function flattenKeys(obj: any, prefix = ''): Record<string, string> {
  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenKeys(obj[k], pre + k));
    } else {
      acc[pre + k] = String(obj[k]);
    }
    return acc;
  }, {} as Record<string, string>);
}

async function main() {
  console.log('🌱 Seeding translations...');

  const files = [
    { app: 'web', locale: 'en', path: '../../../apps/web/src/messages/en.json' },
    { app: 'web', locale: 'km', path: '../../../apps/web/src/messages/km.json' },
    { app: 'mobile', locale: 'en', path: '../../../apps/mobile/src/assets/locales/en.json' },
    { app: 'mobile', locale: 'km', path: '../../../apps/mobile/src/assets/locales/km.json' },
  ];

  for (const file of files) {
    const filePath = path.resolve(__dirname, file.path);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ File not found: ${filePath}`);
      continue;
    }

    console.log(`Processing ${file.app} [${file.locale}]...`);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const flat = flattenKeys(content);

    const entries = Object.entries(flat);
    console.log(`Adding ${entries.length} keys...`);

    for (const [key, value] of entries) {
      await prisma.translation.upsert({
        where: {
          app_locale_key: {
            app: file.app,
            locale: file.locale,
            key: key,
          },
        },
        update: { value },
        create: {
          app: file.app,
          locale: file.locale,
          key: key,
          value,
        },
      });
    }
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
