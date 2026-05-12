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

const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

async function uploadToR2(localPath, key) {
  if (!fs.existsSync(localPath)) return null;
  const fileBuffer = fs.readFileSync(localPath);
  await r2Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: 'image/png',
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

async function main() {
  console.log('🚀 Creating Mona Lisa and Isaac Newton articles...');

  // 1. Upload Mona Lisa Image
  const monaLisaLocal = '/Users/naingseiha/.gemini/antigravity/brain/f181d670-2a4d-43ad-ac77-0c278a1610d7/mona_lisa_painting_realistic_1778562770943.png';
  const monaLisaUrl = await uploadToR2(monaLisaLocal, 'assets/mona_lisa_realistic.png');
  console.log(`✅ Mona Lisa Image: ${monaLisaUrl}`);

  // 2. Insert Posts
  const authorId = 'cmm7zzkpf00019ay9v3c30p54'; // Admin user ID from previous logs

  const posts = [
    {
      title: "អាថ៌កំបាំងនៃស្នាមញញឹម ម៉ូណាលីសា (The Mystery of Mona Lisa's Smile)",
      content: "ម៉ូណាលីសា (Mona Lisa) គឺជាស្នាដៃឯករបស់វិចិត្រករ Leonardo da Vinci ដែលត្រូវបានគេចាត់ទុកថាជាគំនូរដ៏ល្បីល្បាញបំផុតក្នុងប្រវត្តិសាស្ត្រសិល្បៈលោក។ អ្វីដែលធ្វើឱ្យគំនូរនេះអស្ចារ្យបំផុតគឺស្នាមញញឹមដ៏អាថ៌កំបាំង និងបច្ចេកទេស 'Sfumato' (ការប្រើប្រាស់ស្រមោល និងពណ៌ឱ្យស៊ីគ្នាដោយគ្មានបន្ទាត់ច្បាស់លាស់)។\n\nហេតុការណ៍សំខាន់ៗ៖\n✅ ត្រូវបានសាងសង់ឡើងចន្លោះឆ្នាំ ១៥០៣ ដល់ ១៥០៦។\n✅ ម៉ូដែលក្នុងគំនូរត្រូវបានគេជឿថា Lisa Gherardini ភរិយារបស់ឈ្មួញសូត្រម្នាក់។\n✅ គំនូរនេះទទួលបានភាពល្បីល្បាញជាអន្តរជាតិបន្ទាប់ពីត្រូវបានគេលួចពីសារមន្ទីរ Louvre ក្នុងឆ្នាំ ១៩១១។\n\n#ArtHistory #MonaLisa #LeonardoDaVinci #Renaissance #StunityLearning",
      mediaUrls: [monaLisaUrl],
      mediaMetadata: { images: [{ width: 1024, height: 1024 }] },
      mediaAspectRatio: 1.0,
      topicTags: ['Art', 'History', 'Culture']
    },
    {
      title: "អ៊ីសាក់ ញូតុន៖ បិតានៃរូបវិទ្យា និងច្បាប់ចលនាសកល (Isaac Newton)",
      content: "លោក អ៊ីសាក់ ញូតុន (Sir Isaac Newton) គឺជាអ្នកប្រាជ្ញដ៏ឆ្នើមបំផុតម្នាក់ដែលបានបកស្រាយពីអាថ៌កំបាំងនៃចក្រវាលតាមរយៈគណិតវិទ្យា និងរូបវិទ្យា។ ការរកឃើញដ៏ធំបំផុតរបស់លោកគឺ 'ច្បាប់ទំនាញសកល' និង 'ច្បាប់ចលនាទាំង ៣' ដែលយើងសិក្សារហូតដល់សព្វថ្ងៃ។\n\nសមិទ្ធផលសំខាន់ៗ៖\n✅ ច្បាប់ទី១ (Inertia)៖ វត្ថុនឹងនៅស្ងៀម ឬមានចលនាត្រង់ស្មើ លុះត្រាតែមានកម្លាំងខាងក្រៅមកមានអំពើលើវា។\n✅ ច្បាប់ទី២ (F=ma)៖ កម្លាំងស្មើនឹងម៉ាសគុណនឹងសំទុះ។\n✅ ច្បាប់ទី៣ (Action-Reaction)៖ រាល់សកម្មភាពតែងមានប្រតិកម្មត្រឡប់មកវិញដែលមានទំហំប៉ុនគ្នា ប៉ុន្តែទិសដៅផ្ទុយគ្នា។\n\n#Physics #IsaacNewton #Science #Gravity #Education #KhmerGenius",
      mediaUrls: ["https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?q=80&w=1000&auto=format&fit=crop"],
      mediaMetadata: { images: [{ width: 1024, height: 1024 }] },
      mediaAspectRatio: 1.0,
      topicTags: ['Science', 'Physics', 'History']
    }
  ];

  for (const p of posts) {
    const created = await prisma.post.create({
      data: {
        ...p,
        authorId,
        postType: 'ARTICLE',
        visibility: 'PUBLIC',
        mediaDisplayMode: 'AUTO',
        mediaMetadata: p.mediaMetadata
      }
    });
    console.log(`✅ Created post: ${created.title}`);
  }

  console.log('\n✨ All posts created successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
