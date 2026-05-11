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

function daysAgo(index) {
  const date = new Date();
  date.setHours(6 + (index % 9), (index * 9) % 60, 0, 0);
  date.setDate(date.getDate() - Math.floor(index / 3));
  return date;
}

function expiresInDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

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
    .slice(0, 64) || 'poll-post';
  const key = `official-polls/history/${Date.now()}-${index}-${safeTitle}.${extension}`;

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
      uploadedFor: 'official-poll-history-seed',
    },
  }));

  return {
    ...item,
    url: `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`,
    key,
    type: 'image',
  };
}

const polls = [
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll: តេស្តប្រវត្តិវិទ្យាទី១២ (បាក់ឌុប ២០២៦) - ថ្ងៃរំដោះ',
    content: 'តើរបបកម្ពុជាប្រជាធិបតេយ្យ (ប៉ុល ពត) ត្រូវបានដួលរលំទាំងស្រុងនៅថ្ងៃ ខែ ឆ្នាំណា? សូមបោះឆ្នោតជ្រើសរើសចម្លើយត្រឹមត្រូវ!',
    topicTags: ['poll', 'grade-12', 'khmer-history', 'bac2-2026', 'national-exam'],
    options: ['៧ មករា ១៩៧៩', '១៧ មេសា ១៩៧៥', '២៣ តុលា ១៩៩១', '២៤ កញ្ញា ១៩៩៣'],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Poll: តេស្តប្រវត្តិវិទ្យាទី១២ (បាក់ឌុប ២០២៦) - កិច្ចព្រមព្រៀងប៉ារីស',
    content: 'សិស្សថ្នាក់ទី១២ ដែលត្រៀមប្រឡងបាក់ឌុប ២០២៦ ទាំងអស់គ្នា! តើកិច្ចព្រមព្រៀងសន្តិភាពទីក្រុងប៉ារីសស្តីពីកម្ពុជា ត្រូវបានចុះហត្ថលេខានៅថ្ងៃខែឆ្នាំណា?',
    topicTags: ['poll', 'grade-12', 'khmer-history', 'bac2-2026', 'national-exam'],
    options: ['២៣ តុលា ១៩៩១', '២៣ តុលា ១៩៩៣', '២៤ កញ្ញា ១៩៩៣', '៧ មករា ១៩៧៩'],
    media: [media('photo-1517841905240-472988babdf9', 1200, 675, 'Historical documents and preparation')],
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll: តេស្តប្រវត្តិវិទ្យាទី១២ (បាក់ឌុប ២០២៦) - អាណានិគមបារាំង',
    content: 'សំណួរត្រៀមប្រឡងបាក់ឌុប៖ តើអាណានិគមបារាំងមកលើប្រទេសកម្ពុជាចាប់ផ្តើម និងបញ្ចប់នៅឆ្នាំណា?',
    topicTags: ['poll', 'grade-12', 'khmer-history', 'bac2-2026', 'national-exam'],
    options: ['១៨៦៣ ដល់ ១៩៥៣', '១៨៦០ ដល់ ១៩៥៤', '១៨៨៤ ដល់ ១៩៥៣', '១៨៦៣ ដល់ ១៩៥៤'],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Poll: តេស្តប្រវត្តិវិទ្យាទី១២ (បាក់ឌុប ២០២៦) - ព្រះរាជាណាចក្រកម្ពុជាទី២',
    content: 'តើព្រះរាជាណាចក្រកម្ពុជាទី២ ដែលជារបបរាជានិយមអាស្រ័យរដ្ឋធម្មនុញ្ញ ចាប់បដិសន្ធិឡើងវិញនៅថ្ងៃ ខែ ឆ្នាំណា?',
    topicTags: ['poll', 'grade-12', 'khmer-history', 'bac2-2026', 'national-exam'],
    options: ['២៤ កញ្ញា ១៩៩៣', '៩ វិច្ឆិកា ១៩៥៣', '២៣ តុលា ១៩៩១', '៧ មករា ១៩៧៩'],
    media: [media('photo-1605640840605-14ac1855827b', 1200, 675, 'Cambodian historical sites')],
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll: តេស្តប្រវត្តិវិទ្យាទី១២ (បាក់ឌុប ២០២៦) - របបសាធារណរដ្ឋខ្មែរ',
    content: 'សិស្សានុសិស្សទាំងអស់ តើអ្នកណាជាប្រមុខរដ្ឋ ឬប្រធានាធិបតីនៃរបបសាធារណរដ្ឋខ្មែរ (១៩៧០-១៩៧៥)?',
    topicTags: ['poll', 'grade-12', 'khmer-history', 'bac2-2026', 'national-exam'],
    options: ['លោកសេនាប្រមុខ លន់ នល់', 'ព្រះអង្គម្ចាស់ សិរិមតៈ', 'លោក សឺន ង៉ុកថាញ់', 'លោក ចេង ហេង'],
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

  for (const [index, poll] of polls.entries()) {
    const exists = await prisma.post.findFirst({
      where: { title: poll.title },
      select: { id: true },
    });
    if (exists) {
      skipped += 1;
      continue;
    }

    const author = authorByEmail.get(poll.authorEmail);
    const uploadedMedia = [];
    for (const [mediaIndex, item] of (poll.media || []).entries()) {
      uploadedMedia.push(await uploadRemoteImageToR2(item, poll.title, mediaIndex));
    }

    const mediaUrls = uploadedMedia.map((item) => item.url);
    const mediaKeys = uploadedMedia.map((item) => item.key);
    const primaryRatio = uploadedMedia.length === 0
      ? null
      : uploadedMedia.length === 1
        ? uploadedMedia[0].aspectRatio
        : 1;
    const createdAt = daysAgo(index);

    const createdPost = await prisma.post.create({
      data: {
        authorId: author.id,
        schoolId: author.schoolId,
        title: poll.title,
        content: poll.content,
        postType: 'POLL',
        visibility: 'PUBLIC',
        mediaUrls,
        mediaKeys,
        mediaDisplayMode: poll.mediaDisplayMode || 'AUTO',
        mediaMetadata: uploadedMedia,
        mediaAspectRatio: primaryRatio,
        topicTags: poll.topicTags,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        trendingScore: 0,
        pollExpiresAt: expiresInDays(30),
        pollAllowMultiple: false,
        pollMaxChoices: 1,
        pollIsAnonymous: false,
        createdAt,
        updatedAt: createdAt,
        pollOptions: {
          create: poll.options.map((text, optionIndex) => ({
            text,
            position: optionIndex,
            votesCount: 0,
          })),
        },
      },
      select: { id: true, title: true },
    });

    await prisma.postScore.create({
      data: {
        postId: createdPost.id,
        engagementScore: 0,
        qualityScore: 90,
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
    totalRequested: polls.length,
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
