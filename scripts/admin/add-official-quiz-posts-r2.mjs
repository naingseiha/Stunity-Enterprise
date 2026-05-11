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
  throw new Error('R2 is not fully configured. Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL.');
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function unsplash(id, width, height) {
  return `https://images.unsplash.com/${id}?w=${width}&h=${height}&fit=crop&q=85&auto=format`;
}

function media(id, width, height, alt) {
  return {
    sourceUrl: unsplash(id, width, height),
    width,
    height,
    aspectRatio: height / width,
    alt,
    source: 'Unsplash',
  };
}

function daysAgo(index) {
  const date = new Date();
  date.setHours(6 + (index % 10), (index * 13) % 60, 0, 0);
  date.setDate(date.getDate() - Math.floor(index / 2));
  return date;
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
    .slice(0, 64) || 'quiz-post';
  const key = `official-quizzes/${Date.now()}-${index}-${safeTitle}.${extension}`;

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
      uploadedFor: 'official-quiz-feed-seed',
    },
  }));

  return {
    ...item,
    url: `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`,
    key,
    type: 'image',
  };
}

const quizPosts = [
  {
    authorEmail: 'admin@stunity.com',
    title: 'Quiz: ចំណេះដឹងទូទៅអំពីពិភពលោក',
    content: 'សាកល្បង quiz ចំណេះដឹងទូទៅខ្លីៗ ដើម្បីពិនិត្យការយល់ដឹងអំពីពិភពលោក វប្បធម៌ និងវិទ្យាសាស្ត្រប្រចាំថ្ងៃ។',
    topicTags: ['quiz', 'general-knowledge', 'world', 'study'],
    mediaDisplayMode: 'AUTO',
    media: [media('photo-1451187580459-43490279c0fa', 1200, 675, 'Earth and global technology network')],
    questions: [
      {
        question: 'តើភពណាដែលនៅជិតព្រះអាទិត្យជាងគេ?',
        options: ['Mercury', 'Venus', 'Earth', 'Mars'],
        correctAnswer: 0,
        points: 10,
        explanation: 'Mercury គឺជាភពដែលនៅជិតព្រះអាទិត្យជាងគេ។',
      },
      {
        question: 'តើទឹកគ្របដណ្តប់ផ្ទៃផែនដីប្រហែលប៉ុន្មានភាគរយ?',
        options: ['៣០%', '៥០%', '៧១%', '៩០%'],
        correctAnswer: 2,
        points: 10,
        explanation: 'ផ្ទៃផែនដីប្រហែល ៧១% គ្របដណ្តប់ដោយទឹក។',
      },
    ],
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Quiz: គណិតវិទ្យាមូលដ្ឋានសម្រាប់ problem solving',
    content: 'Quiz ខ្លីសម្រាប់រំលឹក logic គណិតវិទ្យា percentage និង algebra ដែលប្រើបានទាំងក្នុងថ្នាក់ និងជីវិតប្រចាំថ្ងៃ។',
    topicTags: ['quiz', 'math', 'algebra', 'problem-solving'],
    mediaDisplayMode: 'AUTO',
    media: [media('photo-1509228468518-180dd4864904', 1200, 675, 'Mathematics formulas on a board')],
    questions: [
      {
        question: 'បើ x + 7 = 15 តើ x ស្មើប៉ុន្មាន?',
        options: ['6', '7', '8', '9'],
        correctAnswer: 2,
        points: 10,
        explanation: 'x = 15 - 7 = 8។',
      },
      {
        question: '២០% នៃ ៥០០ ស្មើប៉ុន្មាន?',
        options: ['50', '75', '100', '125'],
        correctAnswer: 2,
        points: 10,
        explanation: '20% × 500 = 100។',
      },
    ],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Quiz: ប្រវត្តិសាស្ត្រពិភពលោក និងអរិយធម៌',
    content: 'សាកល្បងចំណេះដឹងប្រវត្តិសាស្ត្រដោយសំណួរខ្លីៗអំពីអរិយធម៌ និងព្រឹត្តិការណ៍សំខាន់ៗ។',
    topicTags: ['quiz', 'history', 'civilization', 'humanities'],
    mediaDisplayMode: 'AUTO',
    media: [media('photo-1500530855697-b586d89ba3ee', 1200, 675, 'Historical architecture and ancient-style buildings')],
    questions: [
      {
        question: 'តើអរិយធម៌អេហ្ស៊ីបបុរាណល្បីដោយសំណង់អ្វី?',
        options: ['Pyramids', 'Skyscrapers', 'Space stations', 'Railways'],
        correctAnswer: 0,
        points: 10,
        explanation: 'Pyramids គឺជាសំណង់ល្បីបំផុតមួយនៃអេហ្ស៊ីបបុរាណ។',
      },
      {
        question: 'តើប្រវត្តិសាស្ត្រជួយយើងអ្វី?',
        options: ['យល់ពីមូលហេតុ និងផលប៉ះពាល់នៃព្រឹត្តិការណ៍', 'ចាំលេខទូរស័ព្ទ', 'បង្កើត database', 'គណនាល្បឿន internet'],
        correctAnswer: 0,
        points: 10,
        explanation: 'ប្រវត្តិសាស្ត្រជួយយើងយល់ពី pattern, decision និងផលវិបាកក្នុងសង្គម។',
      },
    ],
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Quiz: Biology កោសិកា DNA និងប្រព័ន្ធរស់',
    content: 'Quiz Biology សម្រាប់សិស្សដែលចង់រំលឹកពីកោសិកា DNA និងមូលដ្ឋានប្រព័ន្ធរស់។',
    topicTags: ['quiz', 'biology', 'dna', 'science'],
    mediaDisplayMode: 'CAROUSEL',
    media: [
      media('photo-1532187863486-abf9dbad1b69', 1200, 1200, 'Biology laboratory microscope'),
      media('photo-1576086213369-97a306d36557', 1200, 1200, 'Research lab samples'),
      media('photo-1581093588401-fbb62a02f120', 1200, 1200, 'Science learning and laboratory work'),
    ],
    questions: [
      {
        question: 'តើកោសិកាជាអ្វី?',
        options: ['ឯកតាមូលដ្ឋាននៃជីវិត', 'ប្រភេទថ្ម', 'រលកសំឡេង', 'រូបមន្តគណិតវិទ្យា'],
        correctAnswer: 0,
        points: 10,
        explanation: 'កោសិកាគឺឯកតាមូលដ្ឋាននៃសារពាង្គកាយរស់។',
      },
      {
        question: 'តើ DNA ផ្ទុកអ្វី?',
        options: ['ព័ត៌មានតំណពូជ', 'ថាមពលអគ្គិសនី', 'ទឹកស្អាត', 'សំឡេង'],
        correctAnswer: 0,
        points: 10,
        explanation: 'DNA ផ្ទុក genetic information សម្រាប់មុខងារ និងលក្ខណៈរបស់សារពាង្គកាយ។',
      },
    ],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Quiz: Physics កម្លាំង ចលនា និងថាមពល',
    content: 'សំណួរ Physics ខ្លីៗអំពី force, motion និង energy ដើម្បីពង្រឹងគំនិតមូលដ្ឋាន។',
    topicTags: ['quiz', 'physics', 'energy', 'motion'],
    mediaDisplayMode: 'AUTO',
    media: [media('photo-1518770660439-4636190af475', 1200, 675, 'Electronics and physics circuit board')],
    questions: [
      {
        question: 'តើ unit នៃ force ក្នុង SI system គឺអ្វី?',
        options: ['Newton', 'Watt', 'Volt', 'Meter'],
        correctAnswer: 0,
        points: 10,
        explanation: 'Force វាស់ជា Newton (N)។',
      },
      {
        question: 'តើ energy អាចបាត់បង់ទាំងស្រុងបានទេ?',
        options: ['មិនបាន តែអាចបម្លែងទម្រង់', 'បានគ្រប់ពេល', 'មានតែក្នុងមេរៀនគណិត', 'ពាក់ព័ន្ធតែ Biology'],
        correctAnswer: 0,
        points: 10,
        explanation: 'ច្បាប់ conservation of energy បញ្ជាក់ថា energy មិនបាត់បង់ទេ តែបម្លែងទម្រង់។',
      },
    ],
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Quiz: Chemistry អាតូម ម៉ូលេគុល និងសុវត្ថិភាព lab',
    content: 'Quiz Chemistry សម្រាប់រំលឹកមូលដ្ឋានអាតូម ម៉ូលេគុល និងការប្រុងប្រយ័ត្នពេលធ្វើពិសោធន៍។',
    topicTags: ['quiz', 'chemistry', 'lab-safety', 'science'],
    mediaDisplayMode: 'AUTO',
    media: [media('photo-1532094349884-543bc11b234d', 1200, 675, 'Chemistry lab glassware and experiment')],
    questions: [
      {
        question: 'តើម៉ូលេគុលបង្កើតពីអ្វី?',
        options: ['អាតូមពីរ ឬច្រើនភ្ជាប់គ្នា', 'តែពន្លឺ', 'តែលោហៈ', 'តែទឹក'],
        correctAnswer: 0,
        points: 10,
        explanation: 'ម៉ូលេគុលបង្កើតពីអាតូមពីរ ឬច្រើនដែលភ្ជាប់គ្នា។',
      },
      {
        question: 'ពេលធ្វើ lab តើគួរធ្វើអ្វីជាមុន?',
        options: ['អាន safety instruction', 'លាយសារធាតុភ្លាមៗ', 'បិទភ្លើងទាំងអស់', 'មិនកត់ observation'],
        correctAnswer: 0,
        points: 10,
        explanation: 'Safety instruction ជាចំណុចដំបូង មុនប៉ះឧបករណ៍ ឬសារធាតុគីមី។',
      },
    ],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Quiz: ភូមិសាស្ត្រ ផែនទី និងបរិស្ថាន',
    content: 'សាកល្បងសំណួរភូមិសាស្ត្រខ្លីៗអំពីផែនទី ទិសដៅ និងបរិស្ថាន។',
    topicTags: ['quiz', 'geography', 'environment', 'map-skills'],
    mediaDisplayMode: 'CAROUSEL',
    media: [
      media('photo-1524661135-423995f22d0b', 1200, 1200, 'World map and geography study'),
      media('photo-1500530855697-b586d89ba3ee', 1200, 1200, 'Landscape and environment'),
      media('photo-1509391366360-2e959784a276', 1200, 1200, 'Renewable energy and environment'),
    ],
    questions: [
      {
        question: 'តើ compass ប្រើសម្រាប់អ្វី?',
        options: ['រកទិសដៅ', 'វាស់សីតុណ្ហភាព', 'គណនាពិន្ទុ', 'បង្កើតអ៊ីមែល'],
        correctAnswer: 0,
        points: 10,
        explanation: 'Compass ប្រើសម្រាប់រកទិសដៅដូចជា North, South, East, West។',
      },
      {
        question: 'តើ renewable energy មានន័យថាអ្វី?',
        options: ['ថាមពលដែលអាចកកើតឡើងវិញ', 'ថាមពលដែលប្រើបានម្តង', 'ថាមពលពីថ្មតែមួយប្រភេទ', 'ថាមពលគ្មានការប្រើប្រាស់'],
        correctAnswer: 0,
        points: 10,
        explanation: 'Renewable energy ដូចជា solar និង wind អាចកកើតឡើងវិញតាមធម្មជាតិ។',
      },
    ],
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Quiz: Khmer និង English Vocabulary សម្រាប់ការសិក្សា',
    content: 'Quiz ពាក្យគន្លឹះសម្រាប់រៀន និងសរសេរអត្ថបទ។ សាកល្បងមើលថាអ្នកចេះប្រើពាក្យទាំងនេះក្នុង context បានប៉ុណ្ណា។',
    topicTags: ['quiz', 'english', 'khmer', 'vocabulary'],
    mediaDisplayMode: 'AUTO',
    media: [media('photo-1522202176988-66273c2fd55f', 1200, 675, 'Students studying language together')],
    questions: [
      {
        question: 'ពាក្យ “analyze” មានន័យជិតបំផុតនឹងអ្វី?',
        options: ['ពិនិត្យបំបែកចំណុចដើម្បីយល់', 'ចម្លងដូចដើម', 'បោះចោល', 'គូររូប'],
        correctAnswer: 0,
        points: 10,
        explanation: 'Analyze មានន័យថាពិនិត្យឱ្យយល់ពីផ្នែក និងទំនាក់ទំនង។',
      },
      {
        question: 'ពាក្យ “summarize” មានន័យថាអ្វី?',
        options: ['សង្ខេបចំណុចសំខាន់', 'បន្ថែមអត្ថបទឱ្យវែង', 'បិទសៀវភៅ', 'ប្តូរពណ៌'],
        correctAnswer: 0,
        points: 10,
        explanation: 'Summarize គឺសង្ខេបចំណុចសំខាន់ៗដោយខ្លី និងច្បាស់។',
      },
    ],
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Quiz: Technology និង AI ចំណេះដឹងឌីជីថល',
    content: 'Quiz សម្រាប់ពិនិត្យចំណេះដឹង digital literacy, AI និងសុវត្ថិភាពបច្ចេកវិទ្យា។',
    topicTags: ['quiz', 'technology', 'ai', 'digital-literacy'],
    mediaDisplayMode: 'AUTO',
    media: [media('photo-1516321318423-f06f85e504b3', 1200, 675, 'Online learning and technology on laptop')],
    questions: [
      {
        question: 'តើ two-factor authentication ជួយអ្វី?',
        options: ['បន្ថែមសុវត្ថិភាពពេល login', 'ធ្វើឱ្យ screen ភ្លឺ', 'បង្កើតរូបភាព', 'បិទ internet'],
        correctAnswer: 0,
        points: 10,
        explanation: '2FA បន្ថែមជំហានផ្ទៀងផ្ទាត់ ដើម្បីកាត់បន្ថយហានិភ័យគណនីត្រូវបានចូលប្រើដោយអ្នកផ្សេង។',
      },
      {
        question: 'តើ AI output គួរត្រូវធ្វើអ្វីមុនប្រើផ្លូវការ?',
        options: ['ពិនិត្យ និង verify', 'copy ទាំងស្រុងភ្លាមៗ', 'មិនអាន', 'លុបទិន្នន័យទាំងអស់'],
        correctAnswer: 0,
        points: 10,
        explanation: 'AI អាចខុសបាន ដូច្នេះត្រូវ verify ជាពិសេសសម្រាប់ចំណេះដឹងសំខាន់។',
      },
    ],
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Quiz: Cambodia និងអាស៊ីអាគ្នេយ៍',
    content: 'សំណួរខ្លីៗអំពីកម្ពុជា និងតំបន់អាស៊ីអាគ្នេយ៍ សម្រាប់ជួយរំលឹកចំណេះដឹងសង្គម។',
    topicTags: ['quiz', 'cambodia', 'history', 'southeast-asia'],
    mediaDisplayMode: 'AUTO',
    media: [media('photo-1605640840605-14ac1855827b', 1200, 675, 'Temple architecture in Southeast Asia')],
    questions: [
      {
        question: 'តើរាជធានីនៃប្រទេសកម្ពុជាគឺអ្វី?',
        options: ['ភ្នំពេញ', 'សៀមរាប', 'បាត់ដំបង', 'កំពត'],
        correctAnswer: 0,
        points: 10,
        explanation: 'ភ្នំពេញគឺជារាជធានីនៃប្រទេសកម្ពុជា។',
      },
      {
        question: 'តើការរៀនប្រវត្តិសាស្ត្រជាតិជួយអ្វី?',
        options: ['យល់ពីអត្តសញ្ញាណ និងមេរៀនពីអតីតកាល', 'បង្កើត password', 'ធ្វើឱ្យ battery ច្រើន', 'គណនាល្បឿន app'],
        correctAnswer: 0,
        points: 10,
        explanation: 'ប្រវត្តិសាស្ត្រជាតិជួយយើងយល់អត្តសញ្ញាណ វប្បធម៌ និងមេរៀនសង្គម។',
      },
    ],
  },
];

async function main() {
  const authors = await prisma.user.findMany({
    where: { email: { in: AUTHORS } },
    select: { id: true, email: true, schoolId: true },
  });
  const authorByEmail = new Map(authors.map((author) => [author.email, author]));

  for (const email of AUTHORS) {
    if (!authorByEmail.has(email)) {
      throw new Error(`Missing official author: ${email}`);
    }
  }

  let created = 0;
  let skipped = 0;
  const createdTitles = [];

  for (const [index, post] of quizPosts.entries()) {
    const exists = await prisma.post.findFirst({
      where: { title: post.title },
      select: { id: true },
    });

    if (exists) {
      skipped += 1;
      continue;
    }

    const author = authorByEmail.get(post.authorEmail);
    const uploadedMedia = [];
    for (const [mediaIndex, item] of post.media.entries()) {
      uploadedMedia.push(await uploadRemoteImageToR2(item, post.title, mediaIndex));
    }

    const mediaUrls = uploadedMedia.map((item) => item.url);
    const mediaKeys = uploadedMedia.map((item) => item.key);
    const primaryRatio = uploadedMedia.length === 1 ? uploadedMedia[0].aspectRatio : 1;
    const createdAt = daysAgo(index);

    const createdPost = await prisma.post.create({
      data: {
        authorId: author.id,
        schoolId: author.schoolId,
        title: post.title,
        content: post.content,
        postType: 'QUIZ',
        visibility: 'PUBLIC',
        mediaUrls,
        mediaKeys,
        mediaDisplayMode: post.mediaDisplayMode,
        mediaMetadata: uploadedMedia,
        mediaAspectRatio: primaryRatio,
        topicTags: post.topicTags,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        trendingScore: 0,
        difficultyLevel: 2.2,
        createdAt,
        updatedAt: createdAt,
        quiz: {
          create: {
            questions: post.questions,
            timeLimit: 6,
            passingScore: 70,
            totalPoints: post.questions.reduce((sum, question) => sum + (question.points || 0), 0),
            resultsVisibility: 'AFTER_SUBMISSION',
            shuffleQuestions: false,
            shuffleAnswers: false,
            maxAttempts: 3,
            showReview: true,
            showExplanations: true,
          },
        },
        quizQuestions: {
          create: post.questions.map((question, questionIndex) => ({
            question: question.question,
            options: question.options,
            correctAnswer: question.correctAnswer,
            points: question.points,
            position: questionIndex,
            explanation: question.explanation,
          })),
        },
      },
      select: { id: true, title: true },
    });

    await prisma.postScore.create({
      data: {
        postId: createdPost.id,
        engagementScore: 0,
        qualityScore: 92,
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
    totalRequested: quizPosts.length,
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
