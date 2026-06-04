import { resolve } from 'path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load env variables
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../../.env') });

const prisma = new PrismaClient();

const MOEYS_EMAIL = 'naing.seiha.hs@moeys.gov.kh';
const ADMIN_EMAIL = 'admin@stunity.com';

type PollPostData = {
  title: string;
  content: string;
  topicTags: string[];
  options: string[];
};

type QuizPostData = {
  title: string;
  content: string;
  topicTags: string[];
  question: string;
  options: string[];
  correctAnswer: number; // 0-indexed
  explanation: string;
};

type RegularPostData = {
  title: string | null;
  content: string;
  postType: 'ARTICLE' | 'RESOURCE';
  topicTags: string[];
  mediaUrls?: string[];
};

const MOEYS_POLLS: PollPostData[] = [
  {
    title: 'តើការសរសេរមួយណាជាអក្ខរាវិរុទ្ធត្រឹមត្រូវ?',
    content: 'ភាសាខ្មែរយើងមានភាពសម្បូរបែប ប៉ុន្តែក៏ងាយនឹងច្រឡំអក្ខរាវិរុទ្ធផងដែរ។ ចូរជ្រើសរើសពាក្យដែលសរសេរបានត្រឹមត្រូវបំផុតតាមវចនានុក្រមសម្តេចព្រះសង្ឃរាជ ជួន ណាត៖',
    topicTags: ['ភាសាខ្មែរ', 'អក្ខរាវិរុទ្ធ', 'ចំណេះដឹងទូទៅ', 'orthography'],
    options: [
      'សំយោគ (ការផ្សំផ្គុំគ្នា)',
      'សំយោក',
      'សង្សោគ',
      'សម្យោគ'
    ]
  }
];

const MOEYS_QUIZZES: QuizPostData[] = [
  {
    title: 'វិភាគតួអង្គក្នុងរឿងទុំទាវ៖ តើតួអង្គយាយនូឆ្លុះបញ្ចាំងពីអ្វីខ្លះក្នុងសង្គមខ្មែរបុរាណ?',
    content: 'រឿងទុំទាវ ជានិមិត្តរូបនៃស្នេហាកំសត់ ប៉ុន្តែក៏ជាកញ្ចក់ឆ្លុះបញ្ចាំងពីតថភាពសង្គមដ៏ចាក់ស្រែះ។ យាយនូ ដែលជាម្តាយរបស់នាងទាវ តំណាងឱ្យ៖\n\n- ផ្នត់គំនិត "នំមិនធំជាងនាឡិ"\n- ភាពលោភលន់ និងការគោរពបុណ្យស័ក្តិជាងសេចក្តីស្នេហានិងគុណធម៌\n- អំណាចមេគ្រួសារដែលសម្រេចវាសនាកូនដោយគ្មានការយល់ព្រម\n\nស្វែងយល់បន្ថែមអំពីប្រធានបទនេះ ដើម្បីត្រៀមប្រលងបាក់ឌុប! 🎯\n\n#អក្សរសិល្ប៍ខ្មែរ #ទុំទាវ #បាក់ឌុប #Stunity',
    topicTags: ['អក្សរសិល្ប៍ខ្មែរ', 'ទុំទាវ', 'បាក់ឌុប', 'literature'],
    question: 'តើនរណាជាអ្នកនិពន្ធរឿងទុំទាវជាបទកាកគតិ?',
    options: [
      'ព្រះភិក្ខុសោម (ឬព្រះបទុមត្ថេរ សោម)',
      'ឧកញ៉ាសុត្តន្តប្រីជាឥន្ទ',
      'ក្រមង៉ុយ',
      'សន្ធរម៉ុក'
    ],
    correctAnswer: 0,
    explanation: 'តាមការស្រាវជ្រាវស្នាដៃអក្សរសិល្ប៍ខ្មែរ រឿងទុំទាវជាបទកាកគតិ ត្រូវបានតែងនិពន្ធឡើងដោយ ព្រះភិក្ខុសោម (ឬព្រះបទុមត្ថេរ សោម) នៅក្នុងឆ្នាំ ១៩១៥។'
  }
];

const MOEYS_REGULAR_POSTS: RegularPostData[] = [
  {
    title: 'រូបមន្តគន្លឹះរូបវិទ្យាថ្នាក់ទី១២៖ ទ្រឹស្តីស៊ីនេទិចនៃឧស្ម័ន (Kinetic Theory of Gases)',
    content: 'សម្រាប់ប្អូនៗថ្នាក់ទី១២ ដែលកំពុងត្រៀមប្រលងបាក់ឌុប! នេះជារូបមន្តសំខាន់ៗដែលត្រូវចាំក្នុងជំពូកទី១៖\n\n1️⃣ សម្ពាធឧស្ម័ន៖ $P = \\frac{1}{3} \\frac{N}{V} m \\overline{v^2}$\n2️⃣ ថាមពលស៊ីនេទិចមធ្យមនៃម៉ូលេគុល៖ $K_{avg} = \\frac{3}{2} k_B T$\n3️⃣ ល្បឿនប្រលោត (rms speed)៖ $v_{rms} = \\sqrt{\\frac{3RT}{M}}$\n\nរក្សាទុកនិងចែករំលែកទៅកាន់មិត្តភក្តិដើម្បីរៀនជាមួយគ្នា! 📚✨\n\n#រូបវិទ្យា #បាក់ឌុប #StunityPhysics #ExamPrep',
    postType: 'RESOURCE',
    topicTags: ['រូបវិទ្យា', 'បាក់ឌុប', 'ទ្រឹស្តីស៊ីនេទិច', 'physics']
  },
  {
    title: 'គន្លឹះ ៥ យ៉ាងដើម្បីរៀនបានពូកែ និងមានប្រសិទ្ធភាពខ្ពស់ដោយមិនបាច់ទន្ទេញចាំមាត់',
    content: '1️⃣ **Active Recall (ការទាញយកចំណេះដឹងមកវិញ)**៖ សាកល្បងសួរខ្លួនឯងឡើងវិញបន្ទាប់ពីអានចប់ មធ្យោបាយដ៏ល្អគឺបង្កើតជាសំណួរ។\n2️⃣ **Spaced Repetition (ការរំលឹកឡើងវិញដោយមានចន្លោះពេល)**៖ រំលឹកមេរៀនបន្ទាប់ពី ១ ថ្ងៃ, ៣ ថ្ងៃ, ៧ ថ្ងៃ និង ១ ខែ។\n3️⃣ **Feynman Technique (បង្រៀនអ្នកដទៃ)**៖ ពន្យល់មេរៀនទៅកាន់មិត្តភក្តិក្នុងភាសាងាយយល់បំផុត។ បើអ្នកអាចបង្រៀនគេឱ្យយល់បាន នោះអ្នកពិតជាយល់ច្បាស់ហើយ។\n4️⃣ **Pomodoro Technique (បែងចែកពេលសម្រាក)**៖ រៀន ២៥ នាទី សម្រាក ៥ នាទី។\n5️⃣ **គេងឱ្យបានគ្រប់គ្រាន់**៖ ការគេងជួយឱ្យខួរក្បាលរៀបចំនិងរក្សាទុកការចងចាំបានល្អ។\n\n#StudyTips #FeynmanTechnique #ActiveLearning #StunityKhmer',
    postType: 'ARTICLE',
    topicTags: ['គន្លឹះរៀនសូត្រ', 'ActiveRecall', 'FeynmanTechnique', 'study-tips']
  },
  {
    title: 'ឆ្នេរសមុទ្រអាម៉ាល់ហ្វី៖ ស្ថាបត្យកម្មដ៏អស្ចារ្យ និងទេសភាពធម្មជាតិដ៏ប្រណីតនៃប្រទេសអ៊ីតាលី',
    content: 'ឆ្នេរសមុទ្រអាម៉ាល់ហ្វី (Amalfi Coast) ស្ថិតនៅភាគខាងត្បូងនៃប្រទេសអ៊ីតាលី គឺជាតំបន់ឆ្នេរដ៏ស្រស់ស្អាតបំផុតមួយនៅលើពិភពលោក ដែលត្រូវបានចុះបញ្ជីជាបេតិកភណ្ឌពិភពលោករបស់អង្គការយូណេស្កូ (UNESCO) ក្នុងឆ្នាំ ១៩៩៧។ តំបន់នេះល្បីល្បាញដោយសារស្ថាបត្យកម្មផ្ទះសម្បែងចម្រុះពណ៌ ដែលត្រូវបានសាងសង់ឡើងតាមចម្រាក់ភ្នំចោតៗជាប់មាត់សមុទ្រមេឌីទែរ៉ាណេ。\n\nក្រៅពីទេសភាពធម្មជាតិដ៏ស្រស់ត្រកាល អាម៉ាល់ហ្វីក៏មានប្រវត្តិសាស្ត្រដ៏សម្បូរបែបផងដែរ ដោយធ្លាប់ជាសាធារណរដ្ឋសមុទ្រដ៏មានអំណាចមួយនៅក្នុងយុគសម័យកណ្តាល។ ស្ថាបត្យកម្មនៅទីនោះឆ្លុះបញ្ចាំងពីការលាយឡំគ្នានៃវប្បធម៌ប្លែកៗ ដែលទាក់ទាញភ្ញៀវទេសចររាប់លាននាក់ជារៀងរាល់ឆ្នាំមកទស្សនាកម្សាន្ត និងសិក្សាស្វែងយល់។\n\n#Travel #History #Architecture #Italy #AmalfiCoast',
    postType: 'ARTICLE',
    topicTags: ['Travel', 'History', 'Architecture', 'Italy', 'AmalfiCoast'],
    mediaUrls: ['https://images.pexels.com/photos/3225528/pexels-photo-3225528.jpeg?auto=compress&cs=tinysrgb&w=800']
  },
  {
    title: 'ឆាល ដាវីន និងទ្រឹស្តីនៃការវិវត្ត៖ ការផ្លាស់ប្តូរការយល់ដឹងរបស់មនុស្សជាតិអំពីជីវិត',
    content: 'ឆាល ដាវីន (Charles Darwin) គឺជាអ្នកធម្មជាតិវិទ្យាជនជាតិអង់គ្លេសដែលបានបង្កើតទ្រឹស្តីនៃការវិវត្តតាមរយៈ "ការជ្រើសរើសដោយធម្មជាតិ" (Natural Selection)។ នៅក្នុងសៀវភៅដ៏ល្បីល្បាញរបស់លោក "On the Origin of Species" (ឆ្នាំ ១៨៥៩) លោកបានពន្យល់ថា សត្វនិងរុក្ខជាតិទាំងអស់មានការប្រែប្រួលសណ្ឋានតាមពេលវេលា ដើម្បីសម្របខ្លួនទៅនឹងមជ្ឈដ្ឋានរស់នៅ។\n\nអ្នកដែលមានលក្ខណៈសម្បត្តិសមស្របបំផុតទៅនឹងបរិស្ថាន (Survival of the Fittest) នឹងមានឱកាសរស់រានមានជីវិត និងបន្តពូជទៅជំនាន់ក្រោយ។ ទ្រឹស្តីរបស់លោកបានក្លាយជាសសរទ្រូងដ៏រឹងមាំមួយនៃជីវវិទ្យាសម័យទំនើប និងបានបដិវត្តន៍វិធីសាស្ត្រដែលយើងមើលឃើញពិភពលោកធម្មជាតិ។\n\n#Biology #Science #Evolution #History',
    postType: 'ARTICLE',
    topicTags: ['Biology', 'Science', 'Evolution', 'History'],
    mediaUrls: ['https://pub-772730709ea64ee7824db864842e5bc0.r2.dev/portraits/charles-darwin-realistic.png']
  }
];

const ADMIN_REGULAR_POSTS: RegularPostData[] = [
  {
    title: 'របៀបប្រើប្រាស់ "Brain Mode" និង "Recall Cards" ដើម្បីបង្កើនល្បឿននៃការចងចាំ',
    content: 'សួស្តីសមាជិក Stunity ទាំងអស់គ្នា! 🎉\n\nថ្ងៃនេះ Stunity Team ចង់ណែនាំមុខងារថ្មី ២ ដែលនឹងជួយឱ្យការ scroll feed របស់អ្នកកាន់តែមានប្រយោជន៍៖\n\n1️⃣ **Brain Mode (របៀបខួរក្បាល)**៖ នៅពេលបើកមុខងារនេះ feed របស់អ្នកនឹងបង្ហាញតែមាកិកាណាដែលមានពិន្ទុអប់រំខ្ពស់ (Ed-Score) ដែលវាយតម្លៃដោយគ្រូៗនិងសហគមន៍។\n2️⃣ **Recall Cards (កាតរំលឹកការចងចាំ)**៖ ជា flashcard ដែលលេចឡើងរៀងរាល់ ៥ post ម្តង ដើម្បីសួររំលឹកសំណួរដែលអ្នកធ្លាប់ឆ្លើយខុស កាលពីមុន ដោយប្រើប្រាស់ប្រព័ន្ធ Spaced Repetition (SM-2)។\n\nសាកល្បងចុចលើប៊ូតុង "Brain" នៅខាងលើគេនៃ Feed ឥឡូវនេះ! 🧠✨\n\n#StunityGuide #ActiveRecall #BrainMode',
    postType: 'ARTICLE',
    topicTags: ['StunityGuide', 'BrainMode', 'RecallCards', 'user-onboarding']
  },
  {
    title: 'ម៉ារី គ្យូរី៖ វិទ្យាសាស្ត្រស្រីដំបូងគេដែលទទួលបានរង្វាន់ណូបែលពីរលើក',
    content: 'ម៉ារី គ្យូរី (Marie Curie) គឺជាអ្នកវិទ្យាសាស្ត្រជនជាតិប៉ូឡូញ-បារាំងដ៏ល្បីល្បាញបំផុត។ លោកស្រីគឺជាមនុស្សដំបូងគេបង្អស់ និងជាស្ត្រីតែម្នាក់គត់ដែលទទួលបានរង្វាន់ណូបែលចំនួនពីរដង ក្នុងវិស័យរូបវិទ្យា (ឆ្នាំ ១៩០៣) និងគីមីវិទ្យា (ឆ្នាំ ១៩១១)។\n\nរបកគំហើញដ៏អស្ចារ្យរបស់លោកស្រីគឺការស្រាវជ្រាវលើបាតុភូតវិទ្យុសកម្ម និងការរកឃើញធាតុគីមីថ្មីពីរគឺ ប៉ូឡូញ៉ូម (Polonium) និងរ៉ាដ្យូម (Radium)។ លោកស្រីបានលះបង់ជីវិតដើម្បីការស្រាវជ្រាវវិទ្យាសាស្ត្រ ដែលជាមូលដ្ឋានគ្រឹះនៃការព្យាបាលជំងឺមហារីកដោយប្រើវិទ្យុសកម្ម និងការអភិវឌ្ទន៍ម៉ាស៊ីនអ៊ិចរ៉េ (X-ray) ក្នុងសមរភូមិសង្គ្រាមលោកលើកទី១។\n\n#Science #Chemistry #History #Biography',
    postType: 'ARTICLE',
    topicTags: ['Science', 'Chemistry', 'History', 'Biography'],
    mediaUrls: ['https://pub-772730709ea64ee7824db864842e5bc0.r2.dev/portraits/marie-curie-realistic.png']
  }
];

const ADMIN_POLLS: PollPostData[] = [
  {
    title: 'តើពាក្យ "បច្ចេកវិទ្យា" មកពីពាក្យផ្សំអ្វីខ្លះ និងមានន័យដូចម្តេច?',
    content: 'ភាសាខ្មែរយើងមានការបង្កើតពាក្យថ្មីៗជាច្រើនតាមរយៈការផ្សំពាក្យសំស្ក្រឹតឬបាលី។ តើពាក្យ "បច្ចេកវិទ្យា" ផ្សំឡើងពីអ្វីខ្លះ? ចូរជ្រើសរើសការវិភាគពាក្យ និងអត្ថន័យដែលត្រឹមត្រូវបំផុត៖',
    topicTags: ['ភាសាខ្មែរ', 'ពាក្យកម្ចី', 'ចំណេះដឹងទូទៅ', 'vocabulary'],
    options: [
      'បច្ចេក + វិទ្យា (វិទ្យាសាស្ត្រនៃការធ្វើឱ្យសម្រេចបាននូវសិល្បៈឬរបរផ្សេងៗ)',
      'បច្ច័យ + វិទ្យា (វិទ្យាសាស្ត្រនៃការបង្កហេតុ)',
      'បច្ចេកៈ + វិទ្យា (ការដឹងអំពីរបៀបរៀបចំ)',
      'បច្ចេក + វិទ្យា (វិជ្ជាដែលកើតឡើងដោយខ្លួនឯង)'
    ]
  }
];

async function seedKhmerPosts() {
  console.log('🌱 Starting Khmer educational posts seeding...\n');

  // Find users
  const moeysUser = await prisma.user.findUnique({
    where: { email: MOEYS_EMAIL }
  });

  const adminUser = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL }
  });

  if (!moeysUser) {
    console.error(`❌ Official MoEYS User with email "${MOEYS_EMAIL}" not found. Please create this user first.`);
    process.exit(1);
  } else {
    console.log(`✅ Found MoEYS Official Account: ${moeysUser.firstName} ${moeysUser.lastName} (ID: ${moeysUser.id})`);
  }

  if (!adminUser) {
    console.error(`❌ Stunity Admin User with email "${ADMIN_EMAIL}" not found. Please create this user first.`);
    process.exit(1);
  } else {
    console.log(`✅ Found Stunity Admin Account: ${adminUser.firstName} ${adminUser.lastName} (ID: ${adminUser.id})`);
  }

  // Helper to check existing post by prefix of content
  const checkPostExists = async (authorId: string, content: string) => {
    const prefix = content.substring(0, 50);
    const existing = await prisma.post.findFirst({
      where: {
        authorId,
        content: { startsWith: prefix }
      }
    });
    return existing;
  };

  // Seeding MoEYS Regular Posts
  console.log('\n📝 Seeding MoEYS regular posts (Articles/Resources)...');
  for (const post of MOEYS_REGULAR_POSTS) {
    const existing = await checkPostExists(moeysUser.id, post.content);
    if (existing) {
      console.log(`  ⏭️  Post already exists: "${post.title}". Syncing mediaUrls...`);
      await prisma.post.update({
        where: { id: existing.id },
        data: {
          mediaUrls: post.mediaUrls || [],
          title: post.title
        }
      });
    } else {
      await prisma.post.create({
        data: {
          authorId: moeysUser.id,
          schoolId: moeysUser.schoolId,
          title: post.title,
          content: post.content,
          postType: post.postType,
          visibility: 'PUBLIC',
          topicTags: post.topicTags,
          mediaUrls: post.mediaUrls || [],
          mediaKeys: [],
          likesCount: 12,
          commentsCount: 3,
          sharesCount: 5,
          trendingScore: 12 * 0.4 + 3 * 0.3 + 5 * 0.3,
          createdAt: new Date()
        }
      });
      console.log(`  ✅ Created MoEYS post: "${post.title}"`);
    }
  }

  // Seeding MoEYS Polls
  console.log('\n📊 Seeding MoEYS Polls...');
  for (const poll of MOEYS_POLLS) {
    const existing = await checkPostExists(moeysUser.id, poll.content);
    if (existing) {
      console.log(`  ⏭️  Poll already exists: "${poll.title}"`);
    } else {
      await prisma.post.create({
        data: {
          authorId: moeysUser.id,
          schoolId: moeysUser.schoolId,
          title: poll.title,
          content: poll.content,
          postType: 'POLL',
          visibility: 'PUBLIC',
          topicTags: poll.topicTags,
          mediaUrls: [],
          mediaKeys: [],
          pollOptions: {
            create: poll.options.map((text, idx) => ({
              text,
              position: idx,
              votesCount: 0
            }))
          },
          likesCount: 8,
          commentsCount: 2,
          sharesCount: 1,
          trendingScore: 8 * 0.4 + 2 * 0.3 + 1 * 0.3,
          createdAt: new Date()
        }
      });
      console.log(`  ✅ Created MoEYS Poll: "${poll.title}"`);
    }
  }

  // Seeding MoEYS Quizzes (Post + QuizQuestion)
  console.log('\n❓ Seeding MoEYS Quizzes (Question post + QuizQuestion)...');
  for (const quiz of MOEYS_QUIZZES) {
    const existing = await checkPostExists(moeysUser.id, quiz.content);
    if (existing) {
      console.log(`  ⏭️  Quiz already exists: "${quiz.title}"`);
    } else {
      await prisma.post.create({
        data: {
          authorId: moeysUser.id,
          schoolId: moeysUser.schoolId,
          title: quiz.title,
          content: quiz.content,
          postType: 'QUESTION',
          visibility: 'PUBLIC',
          topicTags: quiz.topicTags,
          mediaUrls: [],
          mediaKeys: [],
          quizQuestions: {
            create: {
              question: quiz.question,
              options: quiz.options,
              correctAnswer: quiz.correctAnswer,
              explanation: quiz.explanation,
              points: 15,
              position: 0
            }
          },
          likesCount: 15,
          commentsCount: 6,
          sharesCount: 9,
          trendingScore: 15 * 0.4 + 6 * 0.3 + 9 * 0.3,
          createdAt: new Date()
        }
      });
      console.log(`  ✅ Created MoEYS Quiz Post & Question: "${quiz.title}"`);
    }
  }

  // Seeding Admin Regular Posts
  console.log('\n📝 Seeding Stunity Admin regular posts...');
  for (const post of ADMIN_REGULAR_POSTS) {
    const existing = await checkPostExists(adminUser.id, post.content);
    if (existing) {
      console.log(`  ⏭️  Post already exists: "${post.title}". Syncing mediaUrls...`);
      await prisma.post.update({
        where: { id: existing.id },
        data: {
          mediaUrls: post.mediaUrls || [],
          title: post.title
        }
      });
    } else {
      await prisma.post.create({
        data: {
          authorId: adminUser.id,
          schoolId: adminUser.schoolId,
          title: post.title,
          content: post.content,
          postType: post.postType,
          visibility: 'PUBLIC',
          topicTags: post.topicTags,
          mediaUrls: post.mediaUrls || [],
          mediaKeys: [],
          likesCount: 25,
          commentsCount: 5,
          sharesCount: 12,
          trendingScore: 25 * 0.4 + 5 * 0.3 + 12 * 0.3,
          createdAt: new Date()
        }
      });
      console.log(`  ✅ Created Admin post: "${post.title}"`);
    }
  }

  // Seeding Admin Polls
  console.log('\n📊 Seeding Stunity Admin Polls...');
  for (const poll of ADMIN_POLLS) {
    const existing = await checkPostExists(adminUser.id, poll.content);
    if (existing) {
      console.log(`  ⏭️  Poll already exists: "${poll.title}"`);
    } else {
      await prisma.post.create({
        data: {
          authorId: adminUser.id,
          schoolId: adminUser.schoolId,
          title: poll.title,
          content: poll.content,
          postType: 'POLL',
          visibility: 'PUBLIC',
          topicTags: poll.topicTags,
          mediaUrls: [],
          mediaKeys: [],
          pollOptions: {
            create: poll.options.map((text, idx) => ({
              text,
              position: idx,
              votesCount: 0
            }))
          },
          likesCount: 14,
          commentsCount: 4,
          sharesCount: 2,
          trendingScore: 14 * 0.4 + 4 * 0.3 + 2 * 0.3,
          createdAt: new Date()
        }
      });
      console.log(`  ✅ Created Admin Poll: "${poll.title}"`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 KHMER EDUCATIONAL POSTS SEED COMPLETE!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

seedKhmerPosts()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
