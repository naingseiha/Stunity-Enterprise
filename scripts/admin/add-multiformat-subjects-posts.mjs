import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const AUTHORS = ['admin@stunity.com', 'naing.seiha.hs@moeys.gov.kh'];

function expiresInDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

const postsData = [
  // Quizzes
  {
    type: 'QUIZ',
    authorEmail: 'admin@stunity.com',
    title: 'Quiz: អង់គ្លេសថ្នាក់ទី១២ - Vocabulary',
    content: 'សាកល្បងចំណេះដឹងពាក្យអង់គ្លេសដែលតែងតែចេញប្រឡង។',
    topicTags: ['quiz', 'english', 'grade-12', 'bac2-2026'],
    questions: [
      {
        question: 'What is the synonym of "Comprehensive"?',
        options: ['Complete', 'Short', 'Difficult', 'Easy'],
        correctAnswer: 0,
        points: 10,
        explanation: 'Comprehensive means complete and including everything that is necessary.',
      },
      {
        question: 'Which word means "able to be maintained at a certain rate or level"?',
        options: ['Sustainable', 'Temporary', 'Fragile', 'Unstable'],
        correctAnswer: 0,
        points: 10,
        explanation: 'Sustainable refers to the ability to be maintained.',
      }
    ]
  },
  {
    type: 'QUIZ',
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Quiz: គណិតវិទ្យាថ្នាក់ទី១២ - លីមីត និងដេរីវេ',
    content: 'តេស្តសមត្ថភាពគណិតវិទ្យាមុនប្រឡងបាក់ឌុបឆ្នាំ ២០២៦។',
    topicTags: ['quiz', 'math', 'grade-12', 'bac2-2026'],
    questions: [
      {
        question: 'តើដេរីវេនៃ f(x) = x² ស្មើនឹងប៉ុន្មាន?',
        options: ['x', '2x', '2', 'x³/3'],
        correctAnswer: 1,
        points: 10,
        explanation: "តាមរូបមន្ត (x^n)' = n*x^(n-1) ដូចនេះ (x²)' = 2x។",
      },
      {
        question: 'តើ lim(x->0) នៃ sin(x)/x ស្មើនឹងប៉ុន្មាន?',
        options: ['0', '1', 'អនន្ត', 'មិនអាចរកបាន'],
        correctAnswer: 1,
        points: 10,
        explanation: 'នេះជារូបមន្តគ្រឹះនៃលីមីតត្រីកោណមាត្រ។',
      }
    ]
  },
  {
    type: 'QUIZ',
    authorEmail: 'admin@stunity.com',
    title: 'Quiz: ផែនដីវិទ្យាទី១២ - រចនាសម្ព័ន្ធផែនដី',
    content: 'តេស្តចំណេះដឹងអំពីផែនដីវិទ្យាត្រៀមប្រឡងបាក់ឌុប។',
    topicTags: ['quiz', 'earth-science', 'grade-12', 'bac2-2026'],
    questions: [
      {
        question: 'តើផែនដីមានប៉ុន្មានស្រទាប់ធំៗ?',
        options: ['២ ស្រទាប់', '៣ ស្រទាប់', '៤ ស្រទាប់', '៥ ស្រទាប់'],
        correctAnswer: 1,
        points: 10,
        explanation: 'ផែនដីមាន ៣ ស្រទាប់ធំៗគឺ សំបកផែនដី ម៉ង់តូ និងស្នូល។',
      },
      {
        question: 'តើស្រទាប់ណាដែលមានកម្រាស់ស្តើងជាងគេ?',
        options: ['សំបកផែនដី', 'ម៉ង់តូ', 'ស្នូលក្រៅ', 'ស្នូលក្នុង'],
        correctAnswer: 0,
        points: 10,
        explanation: 'សំបកផែនដីជាស្រទាប់ក្រៅបង្អស់ និងមានកម្រាស់ស្តើងជាងគេ។',
      }
    ]
  },

  // Polls
  {
    type: 'POLL',
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll: តើមេរៀនគណិតវិទ្យាណាដែលអ្នកគិតថាពិបាក?',
    content: 'សម្រាប់សិស្សថ្នាក់ទី១២ តើមេរៀនមួយណាដែលអ្នកគិតថាពិបាកយល់ជាងគេ?',
    topicTags: ['poll', 'math', 'grade-12', 'bac2-2026'],
    options: ['ចំនួនកុំផ្លិច', 'លីមីត', 'ដេរីវេ', 'អាំងតេក្រាល']
  },
  {
    type: 'POLL',
    authorEmail: 'admin@stunity.com',
    title: 'Poll: តើវិញ្ញាសាអង់គ្លេសមួយណាដែលអ្នកខ្សោយជាងគេ?',
    content: 'សិស្សទី១២ តើអ្នកជួបការលំបាកផ្នែកណាជាងគេក្នុងការរៀនភាសាអង់គ្លេស?',
    topicTags: ['poll', 'english', 'grade-12', 'bac2-2026'],
    options: ['Grammar', 'Vocabulary', 'Reading', 'Writing']
  },
  {
    type: 'POLL',
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Poll: ប្រធានបទផែនដីវិទ្យាដែលគួររំលឹក',
    content: 'តើមេរៀនផែនដីវិទ្យាមួយណាដែលអ្នកចង់ឱ្យមានសេចក្តីសង្ខេបបន្ថែម?',
    topicTags: ['poll', 'earth-science', 'grade-12', 'bac2-2026'],
    options: ['រចនាសម្ព័ន្ធផែនដី', 'ចលនាផ្លាកតិចតូនិច', 'រ៉ែ និងសិលា', 'ធនធានធម្មជាតិ']
  },

  // Questions
  {
    type: 'QUESTION',
    authorEmail: 'admin@stunity.com',
    title: 'Question: តិចនិកក្នុងការរៀនពាក្យអង់គ្លេស',
    content: 'តើអ្នកមានតិចនិកអ្វីខ្លះក្នុងការរៀនពាក្យថ្មីៗឱ្យឆាប់ចាំ ហើយមិនងាយភ្លេច? សូមជួយចែករំលែកបទពិសោធន៍របស់អ្នកទាំងអស់គ្នា។',
    topicTags: ['question', 'english', 'study-tips'],
  },
  {
    type: 'QUESTION',
    authorEmail: 'naing.seiha.hs@moeys.gov.kh',
    title: 'Question: វិធីសាស្ត្ររៀនរូបមន្តគណិតវិទ្យា',
    content: 'រូបមន្តគណិតវិទ្យាថ្នាក់ទី១២មានច្រើនណាស់។ តើប្អូនៗមានវិធីសាស្ត្រយ៉ាងណាដើម្បីចាំរូបមន្តទាំងនោះ?',
    topicTags: ['question', 'math', 'study-tips'],
  },
  {
    type: 'QUESTION',
    authorEmail: 'admin@stunity.com',
    title: 'Question: ផែនដីវិទ្យា - ការរញ្ជួយដី',
    content: 'ហេតុអ្វីបានជាប្រទេសកម្ពុជាយើងកម្រជួបប្រទះនូវបាតុភូតរញ្ជួយដីធ្ងន់ធ្ងរ? តើអ្នកណាខ្លះយល់ពីចលនាផ្លាកតិចតូនិចជួយពន្យល់បន្តិចមើល។',
    topicTags: ['question', 'earth-science', 'geography'],
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

  for (const postData of postsData) {
    const exists = await prisma.post.findFirst({
      where: { title: postData.title },
      select: { id: true },
    });
    if (exists) {
      skipped += 1;
      continue;
    }

    const author = authorByEmail.get(postData.authorEmail);
    const createdAt = new Date();

    let createData = {
      authorId: author.id,
      schoolId: author.schoolId,
      title: postData.title,
      content: postData.content,
      postType: postData.type,
      visibility: 'PUBLIC',
      topicTags: postData.topicTags,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      trendingScore: 0,
      createdAt,
      updatedAt: createdAt,
    };

    if (postData.type === 'POLL') {
      createData = {
        ...createData,
        pollExpiresAt: expiresInDays(30),
        pollAllowMultiple: false,
        pollMaxChoices: 1,
        pollIsAnonymous: false,
        pollOptions: {
          create: postData.options.map((text, optionIndex) => ({
            text,
            position: optionIndex,
            votesCount: 0,
          })),
        },
      };
    } else if (postData.type === 'QUIZ') {
      createData = {
        ...createData,
        difficultyLevel: 2.5,
        quiz: {
          create: {
            questions: postData.questions,
            timeLimit: 10,
            passingScore: 50,
            totalPoints: postData.questions.reduce((sum, q) => sum + (q.points || 0), 0),
            resultsVisibility: 'AFTER_SUBMISSION',
            shuffleQuestions: false,
            shuffleAnswers: false,
            maxAttempts: 3,
            showReview: true,
            showExplanations: true,
          },
        },
        quizQuestions: {
          create: postData.questions.map((q, idx) => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            points: q.points,
            position: idx,
            explanation: q.explanation,
          })),
        },
      };
    } else if (postData.type === 'QUESTION') {
      createData = {
        ...createData,
        questionBounty: 0,
      };
    }

    const createdPost = await prisma.post.create({
      data: createData,
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
    totalRequested: postsData.length,
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
