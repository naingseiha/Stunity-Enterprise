import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Setup R2 Client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const prisma = new PrismaClient();
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'stunityapp';

// Images to upload and update
const imagesToProcess = [
  {
    filePath: '/Users/naingseiha/.gemini/antigravity/brain/f181d670-2a4d-43ad-ac77-0c278a1610d7/pythagoras_portrait_test_1778559982656.png',
    fileName: 'scholars/pythagoras_portrait.png',
    searchTitle: 'Pythagoras',
  },
  {
    filePath: '/Users/naingseiha/.gemini/antigravity/brain/f181d670-2a4d-43ad-ac77-0c278a1610d7/leaning_tower_of_pisa_1778560060702.png',
    fileName: 'architecture/leaning_tower_of_pisa.png',
    searchTitle: 'Leaning Tower of Pisa',
  },
  {
    filePath: '/Users/naingseiha/.gemini/antigravity/brain/f181d670-2a4d-43ad-ac77-0c278a1610d7/leonardo_da_vinci_portrait_1778560097639.png',
    fileName: 'scholars/leonardo_da_vinci_portrait.png',
    searchTitle: 'Leonardo da Vinci',
  },
  {
    filePath: '/Users/naingseiha/.gemini/antigravity/brain/f181d670-2a4d-43ad-ac77-0c278a1610d7/stephen_hawking_portrait_1778560146354.png',
    fileName: 'scholars/stephen_hawking_portrait.png',
    searchTitle: 'Stephen Hawking',
  },
  {
    filePath: '/Users/naingseiha/.gemini/antigravity/brain/f181d670-2a4d-43ad-ac77-0c278a1610d7/carl_friedrich_gauss_portrait_1778560329769.png',
    fileName: 'scholars/carl_friedrich_gauss_portrait.png',
    searchTitle: 'Carl Friedrich Gauss',
  },
  {
    filePath: '/Users/naingseiha/.gemini/antigravity/brain/f181d670-2a4d-43ad-ac77-0c278a1610d7/dmitri_mendeleev_portrait_1778560491390.png',
    fileName: 'scholars/dmitri_mendeleev_portrait.png',
    searchTitle: 'Dmitri Mendeleev',
  }
];

async function uploadFile(filePath, fileName) {
  try {
    const fileContent = fs.readFileSync(filePath);
    
    await r2Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileContent,
      ContentType: 'image/png',
    }));

    return `${R2_PUBLIC_URL}/${fileName}`;
  } catch (error) {
    console.error(`Failed to upload ${fileName}:`, error);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting image upload & DB update process...\n');

  for (const item of imagesToProcess) {
    console.log(`Processing ${item.searchTitle}...`);
    
    if (!fs.existsSync(item.filePath)) {
      console.log(`❌ File not found: ${item.filePath}`);
      continue;
    }

    // 1. Upload to R2
    console.log(`   Uploading to Cloudflare R2: ${item.fileName}`);
    const publicUrl = await uploadFile(item.filePath, item.fileName);
    
    if (!publicUrl) continue;
    console.log(`   ✅ Uploaded! URL: ${publicUrl}`);

    // 2. Update DB
    console.log(`   Searching for post containing '${item.searchTitle}'...`);
    const posts = await prisma.post.findMany({
      where: { title: { contains: item.searchTitle } }
    });

    for (const post of posts) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          mediaUrls: [publicUrl],
          mediaMetadata: { images: [{ width: 1024, height: 1024 }] },
          mediaAspectRatio: 1.0,
          mediaDisplayMode: 'AUTO'
        }
      });
      console.log(`   ✅ Updated database for post ID: ${post.id}`);
    }
    console.log('-----------------------------------');
  }

  console.log('✨ All tasks completed successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
