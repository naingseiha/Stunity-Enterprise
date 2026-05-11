import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const quizzes = [
  {
    title: 'Quiz: ប្រវត្តិពិភពលោក - សង្គ្រាមលោកលើកទី១',
    content: 'តេស្តចំណេះដឹងអំពីសង្គ្រាមលោកលើកទី១ - មុខវិជ្ជាប្រវត្តិវិទ្យា ថ្នាក់ ១២',
    topicTags: ['ប្រវត្តិវិទ្យា', 'បាក់ឌុប', 'សង្គ្រាមលោក'],
    questions: [
      { question: 'សង្គ្រាមលោកលើកទី១ ចាប់ផ្តើមនៅឆ្នាំណា?', options: ['១៩១៤', '១៩១៨', '១៩០០', '១៩១០'], correctAnswer: 0, explanation: 'សង្គ្រាមលោកលើកទី១ចាប់ផ្តើមនៅឆ្នាំ ១៩១៤ ក្រោយការសម្លាប់ Franz Ferdinand', points: 10 },
      { question: 'តើអ្វីជាបុព្វហេតុផ្ទាល់ (Immediate Cause) នៃសង្គ្រាមលោកលើកទី១?', options: ['ការប្រកួតផ្នែកសេដ្ឋកិច្ច', 'ការស្លាប់ Franz Ferdinand', 'ជម្លោះ Balkan', 'ការបង្វែរន័យ Imperialism'], correctAnswer: 1, explanation: 'ការស្លាប់ Archduke Franz Ferdinand នៃអូស្ត្រីស-ហុងគ្រីនៅ Sarajevo ជាបុព្វហេតុផ្ទាល់', points: 10 },
      { question: 'ក្រុម Triple Alliance (ពាក្យពេចន៍ ១ ម.ស. ១៤) ថ្ងៃប្រកប?', options: ['អាល្លឺម៉ង់ អូស្ត្រីស អ៊ីតាលី', 'បារាំង រុស្ស៊ី អង់គ្លេស', 'អាល្លឺម៉ង់ ជប៉ុន តួគ្គី', 'ជប៉ុន ចិន កូរ៉េ'], correctAnswer: 0, explanation: 'Triple Alliance = អាល្លឺម៉ង់ + អូស្ត្រីស-ហុងគ្រី + អ៊ីតាលី', points: 10 },
      { question: 'Triple Entente ប្រកបដោយ?', options: ['អាល្លឺម៉ង់ ប្រទេស អ៊ីតាលី', 'បារាំង រុស្ស៊ី អង់គ្លេស', 'អាមេរិក ប្រទេស ជប៉ុន', 'អូស្ត្រ៊ីស ហុងគ្រី សែប'], correctAnswer: 1, explanation: 'Triple Entente = France + Russia + United Kingdom', points: 10 },
      { question: 'សង្គ្រាមលោកលើកទី១ បញ្ចប់ក្នុងឆ្នាំណា?', options: ['១៩១៦', '១៩១៨', '១៩២០', '១៩២២'], correctAnswer: 1, explanation: 'សន្ធិសញ្ញាភ្ជាប់សន្ទនា (Armistice) ចុះហត្ថលេខានៅ ១១ វិច្ឆិកា ១៩១៨', points: 10 },
      { question: 'សន្ធិសញ្ញានៃ Versailles ចុះហត្ថលេខានៅ?', options: ['១៩១៨', '១៩១៩', '១៩២០', '១៩២១'], correctAnswer: 1, explanation: 'Treaty of Versailles ចុះហត្ថលេខា ២៨ មិថុនា ១៩១៩ ដោយ Germany ជាដើម', points: 10 },
      { question: 'ប្រទេស America ចូលរួមសង្គ្រាមលោកលើកទី១ ក្នុងឆ្នាំណា?', options: ['១៩១៤', '១៩១៥', '១៩១៧', '១៩១៨'], correctAnswer: 2, explanation: 'USA ចូលរួមនៅ ១៩១៧ ក្រោយ Zimmermann Telegram និងការវាយប្រហារ Lusitania', points: 10 },
      { question: 'League of Nations ត្រូវបានបង្កើតដោយ?', options: ['Winston Churchill', 'Woodrow Wilson', 'Franklin Roosevelt', 'Lloyd George'], correctAnswer: 1, explanation: 'ប្រធានាធិបតី Woodrow Wilson (USA) ជាអ្នកស្នើ League of Nations ក្នុងចំណុច ១៤ (14 Points)', points: 10 },
      { question: 'Gallipoli Campaign (1915) ជាការប្រយុទ្ធរវាង?', options: ['France vs Germany', 'Allied vs Ottoman Empire', 'Britain vs Russia', 'USA vs Germany'], correctAnswer: 1, explanation: 'Gallipoli ជា Operation ល្បីលើ Ottoman Empire (Turkey) ដោយ Allied Forces', points: 10 },
      { question: 'Trench Warfare ពិសេសនៅ?', options: ['Front ប៉ុស្ដ', 'Western Front', 'Pacific Front', 'Eastern Front'], correctAnswer: 1, explanation: 'Trench Warfare ពេញនិយមបំផុតនៅ Western Front (France/Belgium border)', points: 10 }
    ],
    timeLimit: 15, passingScore: 60, totalPoints: 100
  },
  {
    title: 'Quiz: ប្រវត្តិពិភពលោក - សង្គ្រាមលោកលើកទី២',
    content: 'ពង្រឹងចំណេះដឹង WWI I - ថ្នាក់ ១២ ប្រវត្តិវិទ្យា',
    topicTags: ['ប្រវត្តិវិទ្យា', 'បាក់ឌុប', 'WWII'],
    questions: [
      { question: 'សង្គ្រាមលោកលើកទី២ ចាប់ផ្តើមយ៉ាងជាផ្លូវការ?', options: ['១ កញ្ញា ១៩៣៩', '១ កញ្ញា ១៩៤០', '៧ ធ្នូ ១៩៤១', '១ មករា ១៩៤០'], correctAnswer: 0, explanation: 'Germany ឈ្លានពាន Poland ១ កញ្ញា ១៩៣៩ = ចំណុចចាប់ផ្តើមផ្លូវការ', points: 10 },
      { question: 'Hitler ជាប្រមុខដឹកនាំ?', options: ['ហ្សែម៉ា', 'អ៊ីតាលី', 'អាល្លឺម៉ង់', 'ជប៉ុន'], correctAnswer: 2, explanation: 'Adolf Hitler ជាមេដឹកនាំ (Führer) នៃ Nazi Germany', points: 10 },
      { question: 'D-Day ឬ Normandy Landings កើតឡើងនៅ?', options: ['ខែមិថុនា ១៩៤៤', 'ខែធ្នូ ១៩៤១', 'ខែសីហា ១៩៤២', 'ខែឧសភា ១៩៤៥'], correctAnswer: 0, explanation: 'D-Day = ០៦ មិថុនា ១៩៤៤ Allied Forces ចូលដើម្បីរំដោះ France', points: 10 },
      { question: 'Pearl Harbor ត្រូវវាយប្រហារដោយ?', options: ['Germany', 'Italy', 'Japan', 'Russia'], correctAnswer: 2, explanation: 'ជប៉ុន (Japan) វាយប្រហារ Pearl Harbor ០៧ ធ្នូ ១៩៤១ → USA ចូលរួមសង្គ្រាម', points: 10 },
      { question: 'Holocaust ជាអ្វី?', options: ['ដំណឹងជ័យជម្នះ', 'ការប្រល័យពូជសាសន៍ Jews', 'ការទម្លាក់គ្រាប់បែក', 'ការលុកលុយ Berlin'], correctAnswer: 1, explanation: 'Holocaust = ការប្រល័យពូជសាសន៍ Jew 6 Million នាក់ ដោយ Nazi Germany', points: 10 },
      { question: 'Atomic Bomb ត្រូវបានទម្លាក់លើ?', options: ['Tokyo', 'Osaka', 'Hiroshima & Nagasaki', 'Kyoto'], correctAnswer: 2, explanation: 'USA ទម្លាក់គ្រាប់បែក Atomic លើ Hiroshima (6 Aug) & Nagasaki (9 Aug) ១៩៤៥', points: 10 },
      { question: 'VJ Day (Victory over Japan Day) ឈប់ជំនុំ?', options: ['ខែឧសភា ១៩៤៥', 'ខែសីហា ១៩៤៥', 'ខែធ្នូ ១៩៤៥', 'ខែ តុលា ១៩៤៥'], correctAnswer: 1, explanation: 'Japan ប្រកាសចុះចោល ១៥ សីហា ១៩៤៥ = VJ Day', points: 10 },
      { question: 'United Nations ត្រូវបានបង្កើតឡើងក្នុងឆ្នាំ?', options: ['១៩៤៤', '១៩៤៥', '១៩៤៦', '១៩៤៨'], correctAnswer: 1, explanation: 'United Nations (UN) ត្រូវបានបង្កើតផ្លូវការ ២៤ តុលា ១៩៤៥', points: 10 },
      { question: 'Axis Powers (ផ្នែក Axis) ក្នុង WWII = ?', options: ['US UK France', 'Germany Italy Japan', 'Russia China USA', 'Britain Canada Australia'], correctAnswer: 1, explanation: 'Axis Powers = Germany + Italy + Japan (+ allies)', points: 10 },
      { question: 'Battle of Stalingrad (1942-43) សំខាន់ព្រោះ?', options: ['Allied ចូល Normandy', 'Germany ចាប់ផ្តើមចាញ់', 'Japan ចុះចោល', 'Italy ចាញ់'], correctAnswer: 1, explanation: 'Stalingrad ជាចំណុចប្រែប្រួល (Turning Point) - Germany ចាញ់ក្នុង Eastern Front', points: 10 }
    ],
    timeLimit: 15, passingScore: 60, totalPoints: 100
  },
  {
    title: 'Quiz: ប្រវត្តិ - ការដែលបរទេសគ្រប់គ្រងកម្ពុជា (អាណានិគម)',
    content: 'ចំណេះដឹង​ ថ្នាក់ ១២ - ប្រវត្តិ​ Cambodia under Colonial Rule',
    topicTags: ['ប្រវត្តិវិទ្យា', 'បាក់ឌុប', 'អាណានិគម'],
    questions: [
      { question: 'បារាំង (France) បានសម្រេចចិត្តការពារ (Protectorate) កម្ពុជា ដោយមូលហេតុ?', options: ['ចង់ជួយ', 'ត្រូវការទឹកដី', 'ជួញដូរ', 'ការពារពីថៃ'], correctAnswer: 1, explanation: 'France ចង់បន្ថែមទឹកដីក្នុង Indochina និងការពារ Trading Routes', points: 10 },
      { question: 'ស្តេចខ្មែរអង្គណាចុះហត្ថលេខាលើសន្ធិសញ្ញា Protectorate ១៨៦៣?', options: ['នរោត្តម', 'ស៊ីសុវត្ថិ', 'មុនីវង្ស', 'ស្ទ្រី'], correctAnswer: 0, explanation: 'ព្រះបាទ នរោត្តម ចុះហត្ថលេខា ១១ សីហា ១៨៦៣ ជាមួយ Admiral de la Grandière', points: 10 },
      { question: 'ប្រព័ន្ធ Corvée ក្នុងបារាំង = ?', options: ['ពន្ធដារ', 'ការងារជំនួស', 'ប្រព័ន្ធច្បាប់', 'ការបង្រៀន'], correctAnswer: 1, explanation: 'Corvée = ការងារជំនួសសម្រាប់ State Project ដែលប្រជាជននៅបង្ខំធ្វើ', points: 10 },
      { question: 'French Indochina រួមមានប្រទេសណា?', options: ['Vietnam Laos Cambodia', 'Vietnam Cambodia Thailand', 'Laos Thailand Burma', 'Cambodia Vietnam Singapore'], correctAnswer: 0, explanation: 'French Indochina (Indochine Française) = Vietnam + Laos + Cambodia', points: 10 },
      { question: 'Yem Sambaur ដែលជា?', options: ['នាយករដ្ឋមន្ត្រី', 'ស្ដេចខ្មែរ', 'អ្នកតស៊ូ', 'ព្រះសង្ឃ'], correctAnswer: 0, explanation: 'Yem Sambaur ជានាយករដ្ឋមន្ត្រី ១ ក្នុងចំណោម PM ដំបូងៗ', points: 10 },
      { question: 'ចលនា Issarak តាងអ្វី?', options: ['ការតស៊ូប្រឆាំងអាណានិគម', 'ការបង្ហាត់ Soldiers', 'ចលនា Arts', 'Sports'], correctAnswer: 0, explanation: 'Khmer Issarak = ចលនា Nationalist ប្រឆាំង French ដើម្បី Independence', points: 10 },
      { question: 'France បានឱ្យ Cambodia ឯករាជ្យ ដោយ?', options: ['ការប្រយុទ្ធ', 'ការចរចា', 'ការឆ្នោត', 'ការដេញ'], correctAnswer: 1, explanation: 'ការចរចា Diplomatic ដោយ ព្រះករុណា សីហនុ ធ្វើឱ្យ France ប្រគល់ Sovereignty ១៩៥៣', points: 10 },
      { question: 'Geneva Accords ១៩៥៤ ជាអ្វី?', options: ['សន្ធិ ASEAN', 'ការបញ្ចប់សង្គ្រាម Indochina', 'ការបង្កើត UN', 'ការបំបែក China'], correctAnswer: 1, explanation: 'Geneva Accords 1954 = ការបញ្ចប់ First Indochina War (France vs Viet Minh)', points: 10 },
      { question: 'Colonial Economy ក្នុងកម្ពុជាផ្តោតលើ?', options: ['Industrial', 'Rubber & Rice', 'Technology', 'Finance'], correctAnswer: 1, explanation: 'France បានវិនិយោគ Rubber Plantation & Rice Export ក្នុង Cambodia', points: 10 },
      { question: 'ចលនា Crusade for Independence (១៩៥៣) ធ្វើដោយ?', options: ['Son Ngoc Thanh', 'Lon Nol', 'Norodom Sihanouk', 'Khmer Issarak'], correctAnswer: 2, explanation: 'ព្រះករុណា Sihanouk ដឹកនាំ Crusade for Independence ធ្វើ Diplomatic Tour', points: 10 }
    ],
    timeLimit: 15, passingScore: 60, totalPoints: 100
  }
];

async function run() {
  const admin = await prisma.user.findFirst({ where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } } });
  if (!admin) { console.error('No admin found'); return; }

  for (const q of quizzes) {
    const post = await prisma.post.create({
      data: {
        authorId: admin.id,
        title: q.title,
        content: q.content,
        postType: 'QUIZ',
        visibility: 'PUBLIC',
        topicTags: q.topicTags,
        quiz: {
          create: {
            questions: q.questions,
            timeLimit: q.timeLimit,
            passingScore: q.passingScore,
            totalPoints: q.totalPoints,
            resultsVisibility: 'AFTER_SUBMISSION',
            shuffleQuestions: false,
            shuffleAnswers: false,
            maxAttempts: 3,
            showReview: true,
            showExplanations: true,
          }
        }
      }
    });
    console.log(`✅ ${q.title} - ${q.questions.length}Q (ID: ${post.id})`);
  }
  console.log('\n🎉 Done! 3 more history quizzes created.');
}

run().catch(console.error).finally(() => prisma.$disconnect());
