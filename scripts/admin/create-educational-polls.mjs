import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const pollsData = [
  {
    question: 'តើរឿង "កុលាបប៉ៃលិន" ត្រូវបានបោះពុម្ពផ្សាយជាលើកដំបូងនៅក្នុងឆ្នាំណា?',
    options: ['១៩៣៦', '១៩៤៣', '១៩៥១', '១៩៥៣'],
    topicTags: ['អក្សរសាស្ត្រខ្មែរ', 'បាក់ឌុប', 'ចំណេះដឹងទូទៅ'],
  },
  {
    question: 'តើកម្ពុជាទទួលបានឯករាជ្យបរិបូរណ៍ពីប្រទេសបារាំងនៅថ្ងៃទីប៉ុន្មាន?',
    options: ['០៩ វិច្ឆិកា ១៩៥៣', '០៧ មករា ១៩៧៩', '២៣ តុលា ១៩៩១', '០២ ធ្នូ ១៩៩៨'],
    topicTags: ['ប្រវត្តិវិទ្យា', 'បាក់ឌុប', 'ឯករាជ្យជាតិ'],
  },
  {
    question: 'English Grammar: Choose the correct form to complete the sentence: "He ________ English for five years before he moved to London."',
    options: ['has studied', 'had been studying', 'is studying', 'studies'],
    topicTags: ['English', 'Grammar', 'Education'],
  },
  {
    question: 'តើនរណាជាអ្នកនិពន្ធរឿង "ភូមិតិរច្ឆាន"?',
    options: ['ឌឹក គាម និង ឌឿក អំ', 'ញ៉ុក ថែម', 'នូ ហាច', 'រីម គីន'],
    topicTags: ['អក្សរសាស្ត្រខ្មែរ', 'បាក់ឌុប', 'អក្សរសិល្ប៍'],
  },
  {
    question: 'តើប្រាសាទអង្គរវត្តត្រូវបានសាងសង់ឡើងក្នុងរជ្ជកាលព្រះមហាក្សត្រអង្គណា?',
    options: ['ព្រះបាទសូរ្យវរ្ម័នទី២', 'ព្រះបាទជ័យវរ្ម័នទី៧', 'ព្រះបាទជ័យវរ្ម័នទី២', 'ព្រះបាទយសោវរ្ម័នទី១'],
    topicTags: ['ប្រវត្តិវិទ្យា', 'បាក់ឌុប', 'មរតកដូនតា'],
  },
  {
    question: 'តើ "សម្ភារនិយម" មានន័យដូចម្តេចក្នុងបរិបទសង្គមសាស្ត្រ?',
    options: ['ការឲ្យតម្លៃលើរបស់ក្រៅខ្លួន', 'ការស្រឡាញ់ចំណេះដឹង', 'ការគោរពចាស់ទុំ', 'ការធ្វើអំពើល្អ'],
    topicTags: ['សីលធម៌-ពលរដ្ឋ', 'បាក់ឌុប', 'ចំណេះដឹងទូទៅ'],
  }
];

async function createEducationalPolls() {
  const targetEmail = 'naing.seiha.hs@moeys.gov.kh';
  console.log(`🔍 Finding user with email: ${targetEmail}...`);
  
  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
  });

  if (!user) {
    console.error(`❌ User with email ${targetEmail} not found!`);
    return;
  }

  console.log(`🚀 Creating ${pollsData.length} Educational Polls...`);

  for (const pollData of pollsData) {
    const createdPost = await prisma.post.create({
      data: {
        authorId: user.id,
        title: pollData.question,
        content: pollData.question, // Use question as content too for feed visibility
        postType: 'POLL',
        visibility: 'PUBLIC',
        topicTags: pollData.topicTags,
        pollExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        pollAllowMultiple: false,
        pollOptions: {
          create: pollData.options.map((option, index) => ({
            text: option,
            position: index
          }))
        },
        difficultyLevel: 1.5,
      },
    });
    console.log(`✅ Created Poll: ${pollData.question.substring(0, 50)}... (ID: ${createdPost.id})`);
  }

  console.log('\n✨ All educational polls created successfully!');
}

createEducationalPolls()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
