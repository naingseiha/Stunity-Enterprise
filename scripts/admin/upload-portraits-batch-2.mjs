import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
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
    name: 'Charles Darwin',
    localPath: '/Users/naingseiha/.gemini/antigravity/brain/f181d670-2a4d-43ad-ac77-0c278a1610d7/charles_darwin_portrait_realistic_1778517938584.png',
    key: 'portraits/charles-darwin-realistic.png'
  },
  {
    name: 'Louis Pasteur',
    localPath: '/Users/naingseiha/.gemini/antigravity/brain/f181d670-2a4d-43ad-ac77-0c278a1610d7/louis_pasteur_portrait_realistic_1778518300491.png',
    key: 'portraits/louis-pasteur-realistic.png'
  }
];

async function uploadAndSync() {
  console.log('🚀 Starting Portrait Upload (Batch 2) to R2 and Database Sync...');

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
            mediaAspectRatio: 1.0,
            mediaDisplayMode: 'AUTO'
          }
        });
        console.log(`🔗 Synced DB for: ${post.title}`);
      }
    } catch (error) {
      console.error(`❌ Failed for ${portrait.name}:`, error.message);
    }
  }

  // Handle Da Vinci separately with Unsplash as fallback since quota exhausted
  console.log('🎨 Handling Leonardo da Vinci (Unsplash Fallback)...');
  const daVinciPosts = await prisma.post.findMany({
    where: { title: { contains: 'Leonardo da Vinci' } }
  });
  for (const post of daVinciPosts) {
    await prisma.post.update({
      where: { id: post.id },
      data: {
        mediaUrls: ['https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1000&auto=format&fit=crop'],
        mediaMetadata: {
          images: [{ width: 1000, height: 1500 }]
        },
        mediaAspectRatio: 0.67,
        mediaDisplayMode: 'AUTO'
      }
    });
    console.log(`🔗 Synced DB for: Leonardo da Vinci (Unsplash)`);
  }

  console.log('\n✨ Batch 2 portraits processed successfully!');
}

uploadAndSync()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
