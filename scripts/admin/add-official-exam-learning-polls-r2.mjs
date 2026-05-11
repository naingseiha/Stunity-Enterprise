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
      uploadedFor: 'official-poll-feed-seed',
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
    title: 'Poll: English Beginner តើអ្នកចង់រៀនអ្វីមុនគេ?',
    content: 'សម្រាប់អ្នកចាប់ផ្តើមរៀន English សូមជ្រើសរើស skill ដែលអ្នកចង់ឱ្យ Stunity រៀបចំមេរៀនខ្លីៗមុនគេ។',
    topicTags: ['poll', 'english', 'beginner', 'language-learning'],
    options: ['Basic vocabulary', 'Simple grammar', 'Daily conversation', 'Pronunciation'],
    media: [media('photo-1522202176988-66273c2fd55f', 1200, 675, 'Students learning English together')],
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll: English Pre-Intermediate តើ skill ណាដែលអ្នកពិបាកជាងគេ?',
    content: 'បើអ្នកនៅកម្រិត pre-intermediate សូម vote ចំណុចដែលអ្នកចង់អនុវត្តបន្ថែមក្នុងសប្តាហ៍នេះ។',
    topicTags: ['poll', 'english', 'pre-intermediate', 'study-plan'],
    options: ['Past tense', 'Speaking fluency', 'Reading short articles', 'Writing paragraph'],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Poll: English Intermediate តើអ្នកចង់បាន challenge ប្រភេទណា?',
    content: 'កម្រិត intermediate ត្រូវការ practice ដែលមាន context ពិត។ ជ្រើសរើស challenge ដែលអ្នកចង់ឱ្យយើងបង្កើត។',
    topicTags: ['poll', 'english', 'intermediate', 'challenge'],
    options: ['Debate topic', 'Email writing', 'Presentation practice', 'News summary'],
    media: [
      media('photo-1516321318423-f06f85e504b3', 1200, 1200, 'Online learning on laptop'),
      media('photo-1552664730-d307ca884978', 1200, 1200, 'Group presentation practice'),
      media('photo-1522202176988-66273c2fd55f', 1200, 1200, 'Students discussing learning topics'),
    ],
    mediaDisplayMode: 'CAROUSEL',
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll: English Upper-Intermediate តើ exam skill ណាត្រូវការជំនួយ?',
    content: 'សម្រាប់អ្នកត្រៀមប្រឡង ឬ scholarship សូមជ្រើស skill ដែលត្រូវការជំនួយខ្លាំងជាងគេ។',
    topicTags: ['poll', 'english', 'upper-intermediate', 'exam-prep'],
    options: ['Academic writing', 'Listening note-taking', 'Speaking confidence', 'Reading speed'],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Poll: Grade 9 English តើ topic ណាគួររំលឹកមុនប្រឡង?',
    content: 'សិស្សថ្នាក់ទី ៩ អាច vote topic ដែលចង់ឱ្យមាន post សង្ខេបមុនប្រឡងជាតិ។',
    topicTags: ['poll', 'grade-9', 'english', 'national-exam'],
    options: ['Grammar patterns', 'Reading comprehension', 'Vocabulary by theme', 'Writing short answer'],
    media: [media('photo-1517841905240-472988babdf9', 1200, 675, 'Student preparing for exams')],
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll: Grade 12 English តើអ្នកត្រូវការមេរៀនសង្ខេបអ្វី?',
    content: 'សម្រាប់ថ្នាក់ទី ១២ ដែលកំពុងត្រៀមប្រឡង សូមជ្រើសរើសចំណុចដែលចង់រៀនបន្ថែម។',
    topicTags: ['poll', 'grade-12', 'english', 'national-exam'],
    options: ['Essay structure', 'Translation practice', 'Reading strategy', 'Useful expressions'],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Poll: ប្រវត្តិសាស្ត្រខ្មែរ ថ្នាក់ទី ៩ តើមេរៀនណាគួររំលឹក?',
    content: 'ត្រៀមប្រឡងថ្នាក់ទី ៩៖ vote មេរៀនប្រវត្តិសាស្ត្រខ្មែរដែលអ្នកចង់ឱ្យមាន summary និង quiz បន្ថែម។',
    topicTags: ['poll', 'grade-9', 'khmer-history', 'national-exam'],
    options: ['សម័យអង្គរ', 'សង្គម និងវប្បធម៌ខ្មែរ', 'ឯករាជ្យ និងការអភិវឌ្ឍ', 'មេរៀនសង្ខេបតាម timeline'],
    media: [media('photo-1605640840605-14ac1855827b', 1200, 675, 'Temple architecture in Cambodia and Southeast Asia')],
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll: ប្រវត្តិសាស្ត្រខ្មែរ ថ្នាក់ទី ១២ តើចំណុចណាពិបាក?',
    content: 'សម្រាប់សិស្សថ្នាក់ទី ១២ សូមជ្រើសរើស topic ប្រវត្តិសាស្ត្រដែលត្រូវការពន្យល់ជាច្រើនជាងគេ។',
    topicTags: ['poll', 'grade-12', 'khmer-history', 'exam-prep'],
    options: ['ការវិភាគមូលហេតុ-ផល', 'កាលបរិច្ឆេទសំខាន់ៗ', 'តួអង្គប្រវត្តិសាស្ត្រ', 'របៀបសរសេរចម្លើយវែង'],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Poll: Chemistry ថ្នាក់ទី ១២ តើ chapter ណាគួរធ្វើ quiz មុន?',
    content: 'Chemistry សម្រាប់ប្រឡងជាតិ ត្រូវការអនុវត្តច្រើន។ Vote chapter ដែលអ្នកចង់ឱ្យ Stunity រៀបចំ quiz មុនគេ។',
    topicTags: ['poll', 'grade-12', 'chemistry', 'national-exam'],
    options: ['Organic chemistry', 'Acid-base reaction', 'Mole calculation', 'Chemical equilibrium'],
    media: [
      media('photo-1532094349884-543bc11b234d', 1200, 1200, 'Chemistry glassware and experiment'),
      media('photo-1603126857599-f6e157fa2fe6', 1200, 1200, 'Chemistry lab equipment'),
      media('photo-1576086213369-97a306d36557', 1200, 1200, 'Scientific research samples'),
    ],
    mediaDisplayMode: 'CAROUSEL',
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll: Biology ថ្នាក់ទី ១២ តើ topic ណាត្រូវការរូបភាពពន្យល់?',
    content: 'Biology មាន concept ដែលយល់ងាយជាងមុនពេលមាន diagram។ Vote topic ដែលអ្នកចង់ឱ្យបង្ហាញជារូបភាព។',
    topicTags: ['poll', 'grade-12', 'biology', 'diagram-learning'],
    options: ['DNA to protein', 'Cell division', 'Human body systems', 'Genetics problems'],
    media: [media('photo-1532187863486-abf9dbad1b69', 1200, 675, 'Biology lab microscope and research equipment')],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Poll: Physics ថ្នាក់ទី ៩ តើលំហាត់ណាគួរអនុវត្តបន្ថែម?',
    content: 'សម្រាប់ថ្នាក់ទី ៩ សូមជ្រើសរើសប្រភេទលំហាត់ Physics ដែលអ្នកចង់ឱ្យមាន post ពន្យល់ជាជំហានៗ។',
    topicTags: ['poll', 'grade-9', 'physics', 'practice'],
    options: ['Force and motion', 'Electric circuit', 'Heat and temperature', 'Simple machines'],
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll: National Exam Prep តើអ្នកចង់បាន content ប្រភេទណា?',
    content: 'ដើម្បីរៀបចំ feed សម្រាប់សិស្សត្រៀមប្រឡងជាតិ សូម vote ប្រភេទមាតិកាដែលមានប្រយោជន៍បំផុត។',
    topicTags: ['poll', 'national-exam', 'grade-9', 'grade-12'],
    options: ['Daily quiz', 'Summary note', 'Past paper walkthrough', 'Formula/cheat sheet'],
    media: [media('photo-1519389950473-47ba0277781c', 1200, 675, 'Students working with laptops and notes')],
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
