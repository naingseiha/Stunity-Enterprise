import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
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

const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

async function main() {
  const localPath = '/Users/naingseiha/Documents/projects/Stunity-Enterprise/scripts/admin/newton_portrait.jpg';
  const key = 'scholars/isaac_newton_official.jpg';

  console.log(`📤 Uploading Isaac Newton portrait to R2...`);
  const fileBuffer = fs.readFileSync(localPath);
  await r2Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: 'image/jpeg',
  }));

  const publicUrl = `${R2_PUBLIC_URL}/${key}`;
  console.log(`✅ Uploaded! URL: ${publicUrl}`);

  // Update DB
  const posts = await prisma.post.findMany({
    where: { title: { contains: 'Isaac Newton' } }
  });

  for (const post of posts) {
    await prisma.post.update({
      where: { id: post.id },
      data: {
        mediaUrls: [publicUrl],
        mediaMetadata: { images: [{ width: 1000, height: 1250 }] },
        mediaAspectRatio: 0.8,
        mediaDisplayMode: 'AUTO'
      }
    });
    console.log(`🔗 Updated DB for: ${post.title}`);
  }

  console.log('✨ Success!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
