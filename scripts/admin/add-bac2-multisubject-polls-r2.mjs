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
    .slice(0, 64) || 'poll-post';
  const key = `official-polls/multisubject/${Date.now()}-${index}-${safeTitle}.${extension}`;

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
      uploadedFor: 'official-poll-multisubject-seed',
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
  // Biology
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll: តេស្តជីវវិទ្យាទី១២ (បាក់ឌុប ២០២៦) - លក្ខណៈខុសគ្នារវាង ADN និង ARN',
    content: 'តើ ADN និង ARN ខុសគ្នាដូចម្តេចខ្លះ? សូមជ្រើសរើសចម្លើយដែលត្រឹមត្រូវបំផុត!',
    topicTags: ['poll', 'grade-12', 'biology', 'bac2-2026', 'national-exam'],
    options: ['ADN មានស្ករដេអុកស៊ីរីបូស ឯ ARN មានស្កររីបូស', 'ADN ច្រវាក់ទោល ឯ ARN ច្រវាក់ពីរ', 'ADN មានបាស U ឯ ARN មានបាស T', 'ADN រកឃើញតែក្នុុងស៊ីតូប្លាស'],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Poll: តេស្តជីវវិទ្យាទី១២ (បាក់ឌុប ២០២៦) - ថាមពលកោសិកា',
    content: 'សំណួរត្រៀមប្រឡង៖ តើសរីរាង្គកោសិកាណាដែលមានមុខងារផលិតថាមពល (ATP) សម្រាប់កោសិកា?',
    topicTags: ['poll', 'grade-12', 'biology', 'bac2-2026', 'national-exam'],
    options: ['មីតូកុងឌ្រី', 'រីបូសូម', 'ក្លរ៉ូប្លាស', 'ណ្វៃយ៉ូ'],
    media: [media('photo-1532187863486-abf9dbad1b69', 1200, 675, 'Biology cells and research equipment')], // Biology specific image
  },

  // Chemistry
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll: តេស្តគីមីវិទ្យាទី១២ (បាក់ឌុប ២០២៦) - ល្បឿនប្រតិកម្ម',
    content: 'តើល្បឿននៃប្រតិកម្មគីមីមួយអាចប្រែប្រួល ឬអាស្រ័យទៅនឹងកត្តាអ្វីខ្លះ?',
    topicTags: ['poll', 'grade-12', 'chemistry', 'bac2-2026', 'national-exam'],
    options: ['កំហាប់ សីតុណ្ហភាព និងកាតាលីករ', 'មាឌ និង សម្ពាធ', 'ម៉ាស និង ដង់ស៊ីតេ', 'ពណ៌ និង ក្លិន'],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Poll: តេស្តគីមីវិទ្យាទី១២ (បាក់ឌុប ២០២៦) - លក្ខណៈអាស៊ីតខ្លាំង',
    content: 'សម្រាប់សិស្សត្រៀមប្រឡងបាក់ឌុប! តើអាស៊ីតខ្លាំងមានលក្ខណៈសម្គាល់ដូចម្តេចនៅពេលរលាយក្នុងទឹក?',
    topicTags: ['poll', 'grade-12', 'chemistry', 'bac2-2026', 'national-exam'],
    options: ['បំបែកជាអ៊ីយ៉ុងសព្វល្អក្នុងទឹក', 'មាន pH ធំជាង ៧', 'បំបែកជាអ៊ីយ៉ុងបានមួយភាគតូច', 'មិនចម្លងចរន្តអគ្គិសនី'],
    media: [media('photo-1532094349884-543bc11b234d', 1200, 675, 'Chemistry experiment and glassware')],
  },

  // Physics
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll: តេស្តរូបវិទ្យាទី១២ (បាក់ឌុប ២០២៦) - ចលនាស៊ីនុយកូល',
    content: 'នៅក្នុងចលនាស៊ីនុយកូលនៃរ៉ឺស័រ តើទំហំរូបវិទ្យាណាមួយដែលរក្សាតម្លៃថេរជានិច្ច (មិនប្រែប្រួល)?',
    topicTags: ['poll', 'grade-12', 'physics', 'bac2-2026', 'national-exam'],
    options: ['ថាមពលមេកានិច', 'ថាមពលស៊ីនេទិច', 'ថាមពលប៉ូតង់ស្យែល', 'ល្បឿន'],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: "Poll: តេស្តរូបវិទ្យាទី១២ (បាក់ឌុប ២០២៦) - ច្បាប់អូម (Ohm's Law)",
    content: "សំណួររំលឹកមេរៀន៖ តើច្បាប់អូម (Ohm's Law) មានរូបមន្តទូទៅដូចម្តេច?",
    topicTags: ['poll', 'grade-12', 'physics', 'bac2-2026', 'national-exam'],
    options: ['V = R × I', 'P = V × I', 'R = V × P', 'I = V × R'],
  },

  // Morality (Civics)
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll: តេស្តសីលធម៌-ពលរដ្ឋវិជ្ជាទី១២ (បាក់ឌុប ២០២៦) - ប្រជាធិបតេយ្យ',
    content: 'តាមនិយមន័យទូទៅ តើរបប "ប្រជាធិបតេយ្យ" មានន័យដូចម្តេច?',
    topicTags: ['poll', 'grade-12', 'morality', 'civics', 'bac2-2026', 'national-exam'],
    options: ['អំណាចជារបស់ប្រជាពលរដ្ឋ', 'អំណាចជារបស់រដ្ឋាភិបាល', 'អំណាចជារបស់តុលាការ', 'អំណាចជារបស់អ្នកមាន'],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Poll: តេស្តសីលធម៌-ពលរដ្ឋវិជ្ជាទី១២ (បាក់ឌុប ២០២៦) - សិទ្ធិមនុស្ស',
    content: 'តើសេចក្តីប្រកាសជាសកលស្តីពីសិទ្ធិមនុស្ស ត្រូវបានមហាសន្និបាតអង្គការសហប្រជាជាតិអនុម័តនៅថ្ងៃខែឆ្នាំណា?',
    topicTags: ['poll', 'grade-12', 'morality', 'civics', 'bac2-2026', 'national-exam'],
    options: ['១០ ធ្នូ ១៩៤៨', '២៣ តុលា ១៩៩១', '១ មករា ១៩៥០', '២៤ កញ្ញា ១៩៩៣'],
  },

  // Khmer Literature
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll: តេស្តអក្សរសាស្ត្រខ្មែរទី១២ (បាក់ឌុប ២០២៦) - រឿងទុំទាវ',
    content: 'តើអ្នកនិពន្ធរឿង "ទុំទាវ" ដែលជាស្នាដៃអក្សរសិល្ប៍ខ្មែរដ៏ល្បីល្បាញ មានឈ្មោះអ្វី?',
    topicTags: ['poll', 'grade-12', 'khmer-literature', 'bac2-2026', 'national-exam'],
    options: ['ភិក្ខុសោម', 'ក្រមង៉ុយ', 'នូ ហាច', 'សុតន្តប្រីជាឥន្ទ'],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Poll: តេស្តអក្សរសាស្ត្រខ្មែរទី១២ (បាក់ឌុប ២០២៦) - រឿងកុលាបប៉ៃលិន',
    content: 'នៅក្នុងប្រលោមលោករឿង "កុលាបប៉ៃលិន" តើតួឯកប្រុសដែលមានអត្តចរិតស្លូតបូត សុចរិត និងតស៊ូ មានឈ្មោះអ្វី?',
    topicTags: ['poll', 'grade-12', 'khmer-literature', 'bac2-2026', 'national-exam'],
    options: ['ចៅចិត្រ', 'ទុំ', 'មាន', 'សូផាត'],
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

    // Use current date (just now)
    const createdAt = new Date();

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
