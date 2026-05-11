import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const portraits = [
  {
    name: 'Alan Turing',
    localPath: '/Users/naingseiha/.gemini/antigravity/brain/f181d670-2a4d-43ad-ac77-0c278a1610d7/alan_turing_portrait_realistic_1778514718024.png',
    key: 'portraits/alan-turing-realistic.png'
  },
  {
    name: 'Marie Curie',
    localPath: '/Users/naingseiha/.gemini/antigravity/brain/f181d670-2a4d-43ad-ac77-0c278a1610d7/marie_curie_portrait_realistic_1778514871681.png',
    key: 'portraits/marie-curie-realistic.png'
  },
  {
    name: 'Nikola Tesla',
    localPath: '/Users/naingseiha/.gemini/antigravity/brain/f181d670-2a4d-43ad-ac77-0c278a1610d7/nikola_tesla_portrait_realistic_1778514978999.png',
    key: 'portraits/nikola-tesla-realistic.png'
  },
  {
    name: 'Albert Einstein',
    localPath: '/Users/naingseiha/.gemini/antigravity/brain/f181d670-2a4d-43ad-ac77-0c278a1610d7/albert_einstein_portrait_realistic_1778515046216.png',
    key: 'portraits/albert-einstein-realistic.png'
  }
];

async function uploadAndSync() {
  console.log('🚀 Starting Portrait Upload to R2 and Database Sync...');

  for (const portrait of portraits) {
    try {
      console.log(`📤 Uploading ${portrait.name}...`);
      const fileBuffer = fs.readFileSync(portrait.localPath);
      
      await r2Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: portrait.key,
        Body: fileBuffer,
        ContentType: 'image/png',
      }));

      const publicUrl = `${process.env.R2_PUBLIC_URL}/${portrait.key}`;
      console.log(`✅ Uploaded to: ${publicUrl}`);

      // Update Database
      const posts = await prisma.post.findMany({
        where: { title: { contains: portrait.name } }
      });

      for (const post of posts) {
        await prisma.post.update({
          where: { id: post.id },
          data: {
            mediaUrls: [publicUrl],
            mediaMetadata: {
              images: [{ width: 1024, height: 1024 }]
            },
            mediaAspectRatio: 1.0, // Square portraits look best
            mediaDisplayMode: 'AUTO'
          }
        });
        console.log(`🔗 Synced DB for: ${post.title}`);
      }
    } catch (error) {
      console.error(`❌ Failed for ${portrait.name}:`, error.message);
    }
  }

  console.log('\n✨ All portraits uploaded and synced successfully!');
}

uploadAndSync()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
