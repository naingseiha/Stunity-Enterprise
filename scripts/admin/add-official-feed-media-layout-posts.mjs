import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const AUTHORS = ['admin@stunity.com', 'naing.seiha.hs@moeys.gov.kh'];

const image = (url, width, height, alt) => ({
  url,
  type: 'image',
  width,
  height,
  aspectRatio: height / width,
  alt,
  source: 'Unsplash',
});

const portrait = (id, alt) => image(
  `https://images.unsplash.com/${id}?w=900&h=1200&fit=crop&q=85&auto=format`,
  900,
  1200,
  alt
);

const square = (id, alt) => image(
  `https://images.unsplash.com/${id}?w=1200&h=1200&fit=crop&q=85&auto=format`,
  1200,
  1200,
  alt
);

const landscape = (id, alt) => image(
  `https://images.unsplash.com/${id}?w=1200&h=675&fit=crop&q=85&auto=format`,
  1200,
  675,
  alt
);

function daysAgo(index) {
  const date = new Date();
  date.setHours(7 + (index % 8), (index * 11) % 60, 0, 0);
  date.setDate(date.getDate() - Math.floor(index / 2));
  return date;
}

const posts = [
  {
    authorEmail: 'admin@stunity.com',
    title: 'Portrait Study Note: រៀន coding ដោយ focus ៩០ នាទី',
    postType: 'TUTORIAL',
    mediaDisplayMode: 'PORTRAIT',
    media: [
      portrait('photo-1515879218367-8466d910aaa4', 'Developer studying code on a laptop'),
    ],
    topicTags: ['programming', 'study-habits', 'focus', 'productivity'],
    content: 'បើអ្នករៀន programming តែមិនឃើញលទ្ធផល សាកល្បងប្រើ “90-minute deep work block”។\n\nវិធីធ្វើ៖\n- ជ្រើស topic តូចមួយ ដូចជា array methods ឬ API call\n- បិទ notification\n- សរសេរ code ពិត មិនមែនអានតែ theory\n- ចុងម៉ោង សរសេរ note ថា stuck ត្រង់ណា\n\n១ block ល្អ ជួយបានច្រើនជាង scroll tutorial ១០ វីដេអូ។',
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Portrait Post: English speaking practice សម្រាប់សិស្ស',
    postType: 'ARTICLE',
    mediaDisplayMode: 'PORTRAIT',
    media: [
      portrait('photo-1522202176988-66273c2fd55f', 'Students learning together in a study group'),
    ],
    topicTags: ['english', 'speaking', 'communication', 'study-skills'],
    content: 'ការនិយាយ English ល្អ មិនចាប់ផ្តើមពី grammar perfect ទេ។ ចាប់ផ្តើមពី sentence ខ្លីៗដែលប្រើរាល់ថ្ងៃ។\n\nលំហាត់ ៧ ថ្ងៃ៖\n- ថ្ងៃទី១៖ introduce yourself\n- ថ្ងៃទី២៖ explain your school day\n- ថ្ងៃទី៣៖ describe one problem you solved\n- ថ្ងៃទី៤៖ summarize one article\n\nថតសំឡេងខ្លួនឯង ១ នាទីរាល់ថ្ងៃ។ ការស្តាប់ខ្លួនឯងជួយកែលម្អ pronunciation បានលឿន។',
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Portrait Post: Biology lab observation គួរកត់ត្រាអ្វីខ្លះ?',
    postType: 'RESOURCE',
    mediaDisplayMode: 'PORTRAIT',
    media: [
      portrait('photo-1532187863486-abf9dbad1b69', 'Biology lab microscope and research setup'),
    ],
    topicTags: ['biology', 'science', 'lab-notes', 'observation'],
    content: 'Lab note ល្អគួរមាន ៤ ផ្នែក៖\n\n1. គោលបំណងពិសោធន៍\n2. សម្ភារៈ និងលក្ខខណ្ឌសំខាន់ៗ\n3. Observation ជាក់ស្តែង មិនបន្ថែមការសន្និដ្ឋានមុនពេលវេលា\n4. សំណួរដែលត្រូវសាកល្បងបន្ថែម\n\nចំណាំ៖ “ឃើញពណ៌ប្រែពីខៀវទៅបៃតងក្នុង ៤ នាទី” ល្អជាង “វាដំណើរការល្អ”។',
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Portrait Post: Architecture sketch ពី idea ទៅ structure',
    postType: 'PROJECT',
    mediaDisplayMode: 'PORTRAIT',
    media: [
      portrait('photo-1503387762-592deb58ef4e', 'Architecture planning and building design'),
    ],
    topicTags: ['architecture', 'engineering', 'design-thinking', 'project'],
    content: 'ពេលរៀន architecture ឬ engineering កុំចាប់ផ្តើមពីភាពស្អាតតែប៉ុណ្ណោះ។ ចាប់ផ្តើមពី function។\n\nសំណួរដែលគួរសួរ៖\n- អ្នកណាប្រើទីតាំងនេះ?\n- ពន្លឺ និងខ្យល់ចេញចូលយ៉ាងដូចម្តេច?\n- តើ structure ទ្រាំ load ត្រង់ណា?\n- តើសម្ភារៈសមស្របនឹងអាកាសធាតុដែរឬទេ?\n\nSketch ល្អគឺ sketch ដែលពន្យល់ decision បាន។',
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Carousel: AI learning workflow ពី prompt ទៅ project',
    postType: 'ARTICLE',
    mediaDisplayMode: 'CAROUSEL',
    media: [
      square('photo-1677442136019-21780ecad995', 'AI concept and neural network visualization'),
      square('photo-1516321318423-f06f85e504b3', 'Online learning on laptop'),
      square('photo-1551288049-bebda4e38f71', 'Data dashboard and analytics screen'),
    ],
    topicTags: ['ai', 'workflow', 'project-based-learning', 'digital-literacy'],
    content: 'AI អាចជួយរៀនបានល្អ បើអ្នកប្រើវាជា coach មិនមែនជាអ្នកធ្វើ homework ជំនួស។\n\nWorkflow សម្រាប់ project មួយ៖\n1. សួរ AI ឱ្យពន្យល់ concept\n2. សុំ example តូចមួយ\n3. សរសេរ version ផ្ទាល់ខ្លួន\n4. ឱ្យ AI review bug និង edge cases\n5. កត់ note អ្វីដែលអ្នកមិនទាន់យល់\n\nគោលដៅគឺ build skill មិនមែន copy answer។',
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Carousel: STEM classroom idea សម្រាប់គម្រោងវិទ្យាសាស្ត្រ',
    postType: 'PROJECT',
    mediaDisplayMode: 'CAROUSEL',
    media: [
      square('photo-1509228468518-180dd4864904', 'Mathematics formulas and learning board'),
      square('photo-1532094349884-543bc11b234d', 'Science lab glassware and experiment'),
      square('photo-1518770660439-4636190af475', 'Electronics circuit board closeup'),
    ],
    topicTags: ['stem', 'math', 'physics', 'science-project'],
    content: 'គម្រោង STEM ល្អគួររួមបញ្ចូល math, science និងការពន្យល់ជាភាសាសាមញ្ញ។\n\nProject idea៖ បង្កើត mini weather station ដោយវាស់ temperature, humidity និង light level។ បន្ទាប់មក plot graph ហើយពន្យល់ trend។\n\nអ្វីដែលសិស្សរៀនបាន៖ sensor, data collection, graph reading និង scientific explanation។',
  },
  {
    authorEmail: 'admin@stunity.com',
    title: 'Carousel: System design checklist មុន scale app',
    postType: 'RESOURCE',
    mediaDisplayMode: 'CAROUSEL',
    media: [
      landscape('photo-1451187580459-43490279c0fa', 'Cloud network and technology infrastructure'),
      landscape('photo-1558494949-ef010cbdcc31', 'Server room infrastructure'),
      landscape('photo-1558494949-ef010cbdcc31', 'Backend infrastructure and servers'),
    ],
    topicTags: ['system-design', 'backend', 'scalability', 'architecture'],
    content: 'មុននិយាយថា “app ត្រូវ scale” សូមវាស់ឱ្យច្បាស់ថា bottleneck នៅណា។\n\nChecklist៖\n- slow query មាន index ត្រឹមត្រូវឬអត់?\n- endpoint ណាដែល request ច្រើនជាងគេ?\n- cache hit rate ប៉ុន្មាន?\n- image/media loading មាន resize និង CDN ឬនៅ?\n- real-time event មាន reconnect និង backoff ឬទេ?\n\nការរចនាល្អ ចាប់ផ្តើមពី metric មិនមែន guess។',
  },
  {
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Carousel: Business presentation ដែលមើលទៅ professional',
    postType: 'TUTORIAL',
    mediaDisplayMode: 'CAROUSEL',
    media: [
      square('photo-1552664730-d307ca884978', 'Business team discussion and presentation'),
      square('photo-1460925895917-afdab827c52f', 'Business analytics charts on laptop'),
      square('photo-1551836022-d5d88e9218df', 'Team collaboration in office'),
    ],
    topicTags: ['business', 'presentation', 'communication', 'career'],
    content: 'Presentation ល្អមិនមែនដាក់អក្សរច្រើនទេ។ វាត្រូវមាន story និង decision។\n\nSlide structure ងាយប្រើ៖\n1. Problem\n2. Evidence\n3. Options\n4. Recommendation\n5. Next step\n\nTip៖ មួយ slide គួរឆ្លើយសំណួរមួយ។ បើមនុស្សមើល ៥ វិនាទី គួរយល់ message សំខាន់។',
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

  for (const [index, post] of posts.entries()) {
    const exists = await prisma.post.findFirst({
      where: { title: post.title },
      select: { id: true },
    });
    if (exists) {
      skipped += 1;
      continue;
    }

    const author = authorByEmail.get(post.authorEmail);
    const mediaUrls = post.media.map((item) => item.url);
    const primaryRatio = post.media.length === 1
      ? post.media[0].aspectRatio
      : 1;
    const createdAt = daysAgo(index);

    const createdPost = await prisma.post.create({
      data: {
        authorId: author.id,
        schoolId: author.schoolId,
        title: post.title,
        content: post.content,
        postType: post.postType,
        visibility: 'PUBLIC',
        mediaUrls,
        mediaKeys: [],
        mediaDisplayMode: post.mediaDisplayMode,
        mediaMetadata: post.media,
        mediaAspectRatio: primaryRatio,
        topicTags: post.topicTags,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        trendingScore: 0,
        difficultyLevel: 2.4,
        createdAt,
        updatedAt: createdAt,
      },
      select: { id: true },
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
  }

  console.log(JSON.stringify({
    created,
    skipped,
    totalRequested: posts.length,
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
