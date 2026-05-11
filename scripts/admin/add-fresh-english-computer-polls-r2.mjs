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
    .slice(0, 64) || 'learning-poll';
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
      uploadedFor: 'fresh-official-english-computer-poll-seed',
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
    title: 'Poll Now: Present Simple តើប្រយោគណាត្រឹមត្រូវ?',
    content: 'រំលឹក Present Simple៖ ប្រើសម្រាប់ habits, facts និង routines។ ជ្រើសរើសប្រយោគដែលត្រឹមត្រូវបំផុត។',
    topicTags: ['poll', 'english', 'present-simple', 'grammar'],
    options: ['She goes to school every day.', 'She go to school every day.', 'She going to school every day.', 'She gone to school every day.'],
    media: [media('photo-1517841905240-472988babdf9', 1200, 675, 'Student studying English grammar')],
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll Now: Past Simple តើ signal word ណាដែលជួយសម្គាល់?',
    content: 'Past Simple ប្រើសម្រាប់សកម្មភាពកើតឡើង និងបញ្ចប់នៅអតីតកាល។ តើពាក្យណាជា signal word ញឹកញាប់?',
    topicTags: ['poll', 'english', 'past-simple', 'grammar'],
    options: ['Yesterday', 'Every day', 'Now', 'At the moment'],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Poll Now: Future Simple តើទម្រង់ណាត្រឹមត្រូវ?',
    content: 'Future Simple ប្រើ `will + verb base form` សម្រាប់ prediction ឬ decision ភ្លាមៗ។ ជ្រើសរើសចម្លើយត្រឹមត្រូវ។',
    topicTags: ['poll', 'english', 'future-simple', 'grammar'],
    options: ['I will study tonight.', 'I will studying tonight.', 'I will studied tonight.', 'I will studies tonight.'],
    media: [media('photo-1455390582262-044cdead277a', 1200, 675, 'Writing English study notes')],
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll Now: Present Perfect តើប្រយោគណាសមរម្យ?',
    content: 'Present Perfect ប្រើ `have/has + past participle` ដើម្បីភ្ជាប់អតីតកាលជាមួយបច្ចុប្បន្ន។',
    topicTags: ['poll', 'english', 'present-perfect', 'grammar'],
    options: ['I have finished my homework.', 'I has finished my homework.', 'I have finish my homework.', 'I finished now my homework.'],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Poll Now: English Tenses តើ tense ណាដែលអ្នកចង់បាន cheat sheet?',
    content: 'សូមជ្រើស tense ដែលអ្នកចង់ឱ្យ Stunity រៀបចំ cheat sheet ជាភាសាខ្មែរ និងឧទាហរណ៍ប្រើប្រាស់។',
    topicTags: ['poll', 'english', 'tenses', 'cheatsheet'],
    options: ['Present Simple', 'Past Simple', 'Future Simple', 'Present Perfect'],
    media: [
      media('photo-1516321318423-f06f85e504b3', 1200, 1200, 'Online English learning'),
      media('photo-1522202176988-66273c2fd55f', 1200, 1200, 'Students discussing English practice'),
      media('photo-1455390582262-044cdead277a', 1200, 1200, 'Writing study notes'),
    ],
    mediaDisplayMode: 'CAROUSEL',
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll Now: Computer Fundamentals តើ CPU មានតួនាទីអ្វី?',
    content: 'ចំណេះដឹងកុំព្យូទ័រមូលដ្ឋានសំខាន់សម្រាប់សិស្សទាំងអស់។ តើ CPU ត្រូវបានគេហៅថាអ្វី?',
    topicTags: ['poll', 'computer-fundamentals', 'ict', 'digital-literacy'],
    options: ['Brain of the computer', 'Screen only', 'Keyboard storage', 'Internet cable'],
    media: [media('photo-1518770660439-4636190af475', 1200, 675, 'Computer circuit board and hardware')],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Poll Now: Computer Fundamentals តើ RAM ប្រើសម្រាប់អ្វី?',
    content: 'RAM ជួយកុំព្យូទ័រដំណើរការកម្មវិធីដែលកំពុងប្រើ។ តើចម្លើយណាសមរម្យបំផុត?',
    topicTags: ['poll', 'computer-fundamentals', 'hardware', 'ict'],
    options: ['Temporary working memory', 'Permanent paper document', 'Mouse pointer', 'Printer ink'],
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll Now: Microsoft Word តើ feature ណាជួយរៀបចំឯកសារ?',
    content: 'Microsoft Word មិនមែនសម្រាប់វាយអត្ថបទតែប៉ុណ្ណោះ។ វាមាន tools ជួយឱ្យ document មានរបៀប។',
    topicTags: ['poll', 'microsoft-word', 'office', 'digital-skills'],
    options: ['Styles and headings', 'Slide transition', 'Cell formula', 'Video timeline'],
    media: [media('photo-1497366754035-f200968a6e72', 1200, 675, 'Office desk and document work')],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Poll Now: Microsoft Excel តើ formula ណាគេប្រើសម្រាប់បូក?',
    content: 'Excel គឺជាជំនាញ data literacy មូលដ្ឋាន។ តើ formula ណាដែលប្រើសម្រាប់បូកលេខច្រើន cell?',
    topicTags: ['poll', 'microsoft-excel', 'office', 'data-literacy'],
    options: ['=SUM(A1:A10)', '=WRITE(A1:A10)', '=SLIDE(A1:A10)', '=PAINT(A1:A10)'],
    media: [media('photo-1460925895917-afdab827c52f', 1200, 675, 'Spreadsheet and business analytics on laptop')],
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll Now: Microsoft PowerPoint តើ slide ល្អគួរមានអ្វី?',
    content: 'Presentation ល្អគួរច្បាស់ មិនមែនដាក់អក្សរច្រើន។ Vote ចំណុចសំខាន់បំផុតសម្រាប់ slide មួយ។',
    topicTags: ['poll', 'microsoft-powerpoint', 'presentation', 'office'],
    options: ['One clear message', 'Many paragraphs', 'Tiny text', 'No title'],
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
