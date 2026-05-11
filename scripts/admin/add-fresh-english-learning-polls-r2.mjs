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
    .slice(0, 64) || 'fresh-english-poll';
  const key = `official-polls/${Date.now()}-${index}-${safeTitle}.${extension}`;

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
      uploadedFor: 'fresh-official-english-poll-seed',
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
    authorEmail: 'admin@stunity.com',
    title: 'Poll Now: English Beginner តើថ្ងៃនេះអ្នកចង់រៀន topic អ្វី?',
    content: 'សម្រាប់អ្នកចាប់ផ្តើមរៀន English ថ្ងៃនេះ សូម vote topic ដែលចង់ឱ្យមាន post ពន្យល់ខ្លីៗជាភាសាខ្មែរ។',
    topicTags: ['poll', 'english', 'beginner', 'fresh'],
    options: ['Greeting sentences', 'Numbers and time', 'Classroom vocabulary', 'Simple present tense'],
    media: [media('photo-1522202176988-66273c2fd55f', 1200, 675, 'Students learning English together')],
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll Now: English Beginner តើអ្នករៀនបានល្អបំផុតតាមវិធីណា?',
    content: 'Beginner level គួររៀនដោយមាន repetition និង example ច្រើន។ Vote វិធីសាស្ត្រដែលសមនឹងអ្នកបំផុត។',
    topicTags: ['poll', 'english', 'beginner', 'learning-style'],
    options: ['Picture + word', 'Short dialogue', 'Audio pronunciation', 'Mini quiz'],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Poll Now: English Pre-Intermediate តើ grammar topic ណាគួររំលឹក?',
    content: 'Pre-intermediate learners តែងជួបបញ្ហាពេលនិយាយអំពីអតីតកាល និងផែនការ។ ជ្រើស topic ដែលអ្នកចង់ practice ថ្ងៃនេះ។',
    topicTags: ['poll', 'english', 'pre-intermediate', 'grammar'],
    options: ['Past simple', 'Future plans', 'Comparatives', 'Countable nouns'],
    media: [
      media('photo-1516321318423-f06f85e504b3', 1200, 1200, 'Online English learning on laptop'),
      media('photo-1522202176988-66273c2fd55f', 1200, 1200, 'Group discussion and study'),
      media('photo-1517841905240-472988babdf9', 1200, 1200, 'Student studying for language class'),
    ],
    mediaDisplayMode: 'CAROUSEL',
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll Now: English Pre-Intermediate តើ speaking prompt ណាគួរអនុវត្ត?',
    content: 'Speaking practice ប្រចាំថ្ងៃជួយបង្កើន confidence។ Vote prompt ដែលអ្នកចង់ឱ្យយើងដាក់ជាលំហាត់មុនគេ។',
    topicTags: ['poll', 'english', 'pre-intermediate', 'speaking'],
    options: ['Describe your school', 'Talk about weekend', 'Explain your hobby', 'Ask for directions'],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Poll Now: English Intermediate តើ writing skill ណាត្រូវការ template?',
    content: 'Intermediate level ត្រូវការរចនាសម្ព័ន្ធច្បាស់ក្នុងការសរសេរ។ Vote template ដែលអ្នកចង់បានសម្រាប់ practice។',
    topicTags: ['poll', 'english', 'intermediate', 'writing'],
    options: ['Opinion paragraph', 'Problem-solution essay', 'Formal email', 'Summary writing'],
    media: [media('photo-1455390582262-044cdead277a', 1200, 675, 'Writing notes and English study')],
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll Now: English Intermediate តើអ្នកចង់បាន reading challenge បែបណា?',
    content: 'Reading skill ល្អកើតពីការអានអត្ថបទខ្លីៗជាប្រចាំ។ ជ្រើស challenge ដែលសាកសមនឹងអ្នកថ្ងៃនេះ។',
    topicTags: ['poll', 'english', 'intermediate', 'reading'],
    options: ['Science article', 'Business article', 'Short story', 'Exam passage'],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Poll Now: English Upper-Intermediate តើ skill ណាគួរបង្កើត live practice?',
    content: 'សម្រាប់ upper-intermediate learners យើងចង់រៀបចំ practice ដែលមាន challenge ខ្ពស់ជាងមុន។ Vote skill ដែលអ្នកត្រូវការខ្លាំងជាងគេ។',
    topicTags: ['poll', 'english', 'upper-intermediate', 'live-practice'],
    options: ['Debate', 'Presentation Q&A', 'Academic listening', 'Advanced vocabulary'],
    media: [media('photo-1552664730-d307ca884978', 1200, 675, 'Presentation and speaking practice')],
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll Now: English Exam Prep តើអ្នកចង់បាន daily practice ម៉ោងណា?',
    content: 'បើមាន daily English practice នៅ Stunity តើម៉ោងណាដែលអ្នកងាយចូលរួមបំផុត? Vote ដើម្បីជួយយើងរៀបចំ content schedule។',
    topicTags: ['poll', 'english', 'exam-prep', 'schedule'],
    options: ['Morning', 'Afternoon', 'Evening', 'Weekend only'],
  },
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
    const createdAt = new Date(Date.now() + index * 1000);

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
        pollExpiresAt: expiresInDays(14),
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
      select: { id: true, title: true, createdAt: true },
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
    createdTitles.push({ title: createdPost.title, createdAt: createdPost.createdAt });
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
