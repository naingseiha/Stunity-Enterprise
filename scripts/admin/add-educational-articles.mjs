import 'dotenv/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'stunityapp';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
const ONE_YEAR_SECONDS = 31536000;
const AUTHORS = ['admin@stunity.com', 'naing.seiha.hs@moeys.gov.kh'];

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
  throw new Error('R2 is not fully configured.');
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const unsplash = (id, width, height) =>
  `https://images.unsplash.com/${id}?w=${width}&h=${height}&fit=crop&q=85&auto=format`;

const media = (id, width, height, alt) => ({
  sourceUrl: unsplash(id, width, height),
  width,
  height,
  aspectRatio: height / width,
  alt,
  source: 'Unsplash',
});

async function uploadRemoteImageToR2(item, title, index) {
  const response = await fetch(item.sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image ${item.sourceUrl}: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const buffer = Buffer.from(await response.arrayBuffer());
  const safeTitle = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'article-post';
  const key = `official-articles/${Date.now()}-${index}-${safeTitle}.${extension}`;

  await s3Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: `public, max-age=${ONE_YEAR_SECONDS}, immutable`,
    Metadata: {
      source: item.source,
      sourceUrl: item.sourceUrl,
      alt: item.alt,
      width: String(item.width),
      height: String(item.height),
      uploadedFor: 'official-article-seed',
    },
  }));

  return {
    ...item,
    url: `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`,
    key,
    type: 'image',
  };
}

const articlesData = [
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'វិធីសាស្ត្រសិក្សាឱ្យមានប្រសិទ្ធភាព: រៀនតិច តែចំណេះដឹងច្រើន',
    content: `តើអ្នកធ្លាប់មានអារម្មណ៍ថាខំរៀនយូរតែមិនសូវចូលក្បាលទេ? នេះគឺជាគន្លឹះសំខាន់ៗ៤យ៉ាងដើម្បីបង្កើនប្រសិទ្ធភាពក្នុងការសិក្សារបស់អ្នក៖

១. បច្ចេកទេស Pomodoro៖ រៀន ២៥នាទី សម្រាក ៥នាទី ដើម្បីឱ្យខួរក្បាលមិនតានតឹង។
២. Active Recall៖ កុំគ្រាន់តែអានសៀវភៅ ត្រូវព្យាយាមបិទសៀវភៅហើយទាញយកការចងចាំមកវិញ។
៣. Spaced Repetition៖ រំលឹកមេរៀនឡើងវិញតាមចន្លោះពេល (១ថ្ងៃ ៣ថ្ងៃ ១សប្តាហ៍)។
៤. បង្រៀនអ្នកដទៃ (Feynman Technique)៖ បើអ្នកមិនអាចពន្យល់វាឱ្យសាមញ្ញទេ មានន័យថាអ្នកមិនទាន់យល់ច្បាស់ឡើយ។

សាកល្បងអនុវត្តពីថ្ងៃនេះទៅ អ្នកនឹងឃើញការផ្លាស់ប្តូរ! 💡📖`,
    topicTags: ['study-tips', 'productivity', 'education', 'learning'],
    mediaDisplayMode: 'AUTO',
    media: [media('photo-1434030216411-0b793f4b4173', 1080, 1350, 'Student studying with notebook and laptop')], // Portrait image
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'គន្លឹះនៃការសរសេរគម្រោង (Project Proposal) ឱ្យមានភាពទាក់ទាញ',
    content: `ការសរសេរគម្រោង (Project Proposal) ជារឿងសំខាន់សម្រាប់និស្សិត និងអ្នកធ្វើការ។ តើត្រូវសរសេរយ៉ាងណាឱ្យទាក់ទាញ និងទទួលបានការគាំទ្រ?

១. សេចក្តីផ្តើមច្បាស់លាស់៖ បង្ហាញពីបញ្ហាដែលអ្នកចង់ដោះស្រាយ។ ហេតុអ្វីគម្រោងនេះចាំបាច់?
២. គោលបំណង (Objectives)៖ ត្រូវប្រើគោលការណ៍ SMART (Specific, Measurable, Achievable, Relevant, Time-bound)។
៣. វិធីសាស្ត្រ (Methodology)៖ រៀបរាប់លម្អិតពីរបៀបដែលអ្នកនឹងអនុវត្តគម្រោង។
៤. លទ្ធផលរំពឹងទុក (Expected Outcomes)៖ តើអ្វីជាផលប្រយោជន៍ក្រោយពេលគម្រោងចប់?
៥. ថវិកា និងកាលវិភាគ (Budget & Timeline)៖ រៀបចំឱ្យមានតម្លាភាព និងសមស្របនឹងទំហំការងារ។

បើអ្នកមានសំនួរទាក់ទងនឹងការសរសេរគម្រោង អាច Comment ខាងក្រោមបាន! 👇📝`,
    topicTags: ['project-proposal', 'writing', 'career-skills', 'academic'],
    mediaDisplayMode: 'AUTO',
    media: [media('photo-1531403009284-440f080d1e12', 1200, 675, 'Team planning a project together')], // Landscape image
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'របៀបសិក្សាភាសាអង់គ្លេសឱ្យឆាប់ចេះ និងអាចប្រើប្រាស់បានជាក់ស្តែង',
    content: `រៀនអង់គ្លេសរាប់ឆ្នាំតែមិនទាន់ក្លាហានក្នុងការនិយាយមែនទេ? សាកល្បងវិធីសាស្ត្រទាំងនេះ៖

🎧 Listening: ស្តាប់ Podcast ឬមើលរឿងជាភាសាអង់គ្លេសដោយមិនមើល Subtitle ជាភាសាខ្មែរ ដើម្បីហ្វឹកហាត់ត្រចៀក។
📖 Reading: អានអត្ថបទខ្លីៗ ឬសៀវភៅដែលត្រូវនឹងកម្រិតរបស់អ្នក។ កុំខំប្រឹងអានអ្វីដែលពិបាកពេក។
✍️ Writing: សរសេរ Journal ប្រចាំថ្ងៃជាភាសាអង់គ្លេស។ សរសេរពីអ្វីដែលអ្នកបានជួបប្រទះក្នុងថ្ងៃនេះ។
🗣️ Speaking: និយាយជាមួយខ្លួនឯងមុខកញ្ចក់ ឬរកដៃគូសន្ទនា (Language Partner)។ កុំខ្លាចខុស! ភាពក្លាហានជាកូនសោរឆ្ពោះទៅរកភាពជោគជ័យ។

តើអ្នកកំពុងជួបការលំបាកផ្នែកណាជាងគេក្នុងការរៀនភាសាអង់គ្លេស? ប្រាប់យើងផង! 🌍🗣️`,
    topicTags: ['english', 'language-learning', 'study-tips', 'skills'],
    mediaDisplayMode: 'AUTO',
    media: [media('photo-1522202176988-66273c2fd55f', 1080, 1080, 'Students discussing and learning languages')], // Square image
  }
];

async function main() {
  const authors = await prisma.user.findMany({
    where: { email: { in: AUTHORS } },
    select: { id: true, email: true, schoolId: true },
  });
  const authorByEmail = new Map(authors.map((author) => [author.email, author]));

  for (const email of AUTHORS) {
    if (!authorByEmail.has(email)) throw new Error(`Missing official author: ${email}`);
  }

  let created = 0;
  let skipped = 0;
  const createdTitles = [];

  for (const [index, article] of articlesData.entries()) {
    const exists = await prisma.post.findFirst({
      where: { title: article.title },
      select: { id: true },
    });
    if (exists) {
      skipped += 1;
      continue;
    }

    const author = authorByEmail.get(article.authorEmail);
    const uploadedMedia = [];
    for (const [mediaIndex, item] of (article.media || []).entries()) {
      uploadedMedia.push(await uploadRemoteImageToR2(item, article.title, mediaIndex));
    }

    const mediaUrls = uploadedMedia.map((item) => item.url);
    const mediaKeys = uploadedMedia.map((item) => item.key);
    const primaryRatio = uploadedMedia.length === 0
      ? null
      : uploadedMedia.length === 1
        ? uploadedMedia[0].aspectRatio
        : 1;

    // Use current date (just now)
    const createdAt = new Date(Date.now() - index * 1000); // slight difference to ensure order

    const createdPost = await prisma.post.create({
      data: {
        authorId: author.id,
        schoolId: author.schoolId,
        title: article.title,
        content: article.content,
        postType: 'ARTICLE',
        visibility: 'PUBLIC',
        mediaUrls,
        mediaKeys,
        mediaDisplayMode: article.mediaDisplayMode || 'AUTO',
        mediaMetadata: uploadedMedia,
        mediaAspectRatio: primaryRatio,
        topicTags: article.topicTags,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        trendingScore: 0,
        createdAt,
        updatedAt: createdAt,
      },
      select: { id: true, title: true },
    });

    await prisma.postScore.create({
      data: {
        postId: createdPost.id,
        engagementScore: 0,
        qualityScore: 95,
        trendingScore: 0,
        decayFactor: 1,
      },
    });

    created += 1;
    createdTitles.push(createdPost.title);
  }

  console.log(JSON.stringify({
    created,
    skipped,
    totalRequested: articlesData.length,
    createdTitles,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
