import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const quizzes = [
  {
    title: 'Quiz: ប្រវត្តិ - សង្គ្រាមត្រជាក់ (Cold War)',
    content: 'ចំណេះដឹង Cold War & Geopolitics - ថ្នាក់ ១២ ប្រវត្តិវិទ្យា',
    topicTags: ['ប្រវត្តិវិទ្យា', 'បាក់ឌុប', 'Cold War'],
    questions: [
      { question: 'Cold War កើតឡើងរវាង?', options: ['USA vs China', 'USA vs USSR', 'UK vs France', 'Europe vs Asia'], correctAnswer: 1, explanation: 'Cold War = ការប្រកួតប្រជែង Ideological & Political រវាង USA (Capitalism) vs USSR (Communism)', points: 10 },
      { question: 'NATO ត្រូវបានបង្កើតក្នុងឆ្នាំ?', options: ['1945', '1947', '1949', '1955'], correctAnswer: 2, explanation: 'NATO (North Atlantic Treaty Organization) បង្កើតឆ្នាំ ១៩៤៩', points: 10 },
      { question: 'Marshall Plan គឺជា?', options: ['Military Alliance', 'Economic Aid Program', 'Nuclear Treaty', 'Trade Agreement'], correctAnswer: 1, explanation: 'Marshall Plan ជាកម្មវិធីជំនួយសេដ្ឋកិច្ចរបស់ USA ដើម្បីកសាង Europe ឡើងវិញ', points: 10 },
      { question: 'Berlin Wall ត្រូវបានសង់ក្នុងឆ្នាំ?', options: ['1955', '1958', '1961', '1965'], correctAnswer: 2, explanation: 'Berlin Wall សង់ ១៣ សីហា ១៩៦១ ដោយ East Germany ដើម្បីបិទចេញពី West', points: 10 },
      { question: 'Cuban Missile Crisis (1962) ជាអ្វី?', options: ['ការប្រយុទ្ធ Cuba vs USA', 'USSR ដាក់ Missiles នៅ Cuba', 'Cuba ចូល NATO', 'USA ឈ្លានពាន Cuba'], correctAnswer: 1, explanation: 'USSR ដាក់ Nuclear Missiles នៅ Cuba → ការប្រឈមមុខ USA-USSR ខ្លាំងជាងគេ', points: 10 },
      { question: 'Space Race ចាប់ផ្តើមនៅ?', options: ['1945', '1947', '1957', '1960'], correctAnswer: 2, explanation: 'USSR បើក Sputnik (Satellite ដំបូង) ១៩៥៧ → ចាប់ Space Race', points: 10 },
      { question: 'Korea War (1950-53) ចាប់ផ្តើមព្រោះ?', options: ['Japan ឈ្លានពាន', 'North Korea ឈ្លានពាន South', 'USA ចូល Korea', 'China ចូល'], correctAnswer: 1, explanation: 'North Korea (Communism) ឈ្លានពាន South Korea (Democracy) ២៥ មិថុនា ១៩៥០', points: 10 },
      { question: 'Truman Doctrine (1947) ផ្តោតលើ?', options: ['ការការពារ Europe', 'ការប្រឆាំង Communism', 'Military Build-up', 'Nuclear Treaty'], correctAnswer: 1, explanation: 'Truman Doctrine = USA ជួយប្រទេសណាដែលប្រឈមមុខ Communist Threat', points: 10 },
      { question: 'USSR ពកខ្ទេចក្នុងឆ្នាំ?', options: ['1985', '1989', '1991', '1993'], correctAnswer: 2, explanation: 'Soviet Union (USSR) ចុះខ្ទេចផ្លូវការ ២៦ ធ្នូ ១៩៩១', points: 10 },
      { question: 'Vietnam War បញ្ចប់ក្នុង?', options: ['1970', '1973', '1975', '1978'], correctAnswer: 2, explanation: 'North Vietnam ចូលដណ្ដើម Saigon ៣០ មេសា ១៩៧៥ = Vietnam War End', points: 10 }
    ],
    timeLimit: 15, passingScore: 60, totalPoints: 100
  },
  {
    title: 'Quiz: ប្រវត្តិ - បដិវត្ដន៍ និងការផ្លាស់ប្ដូរ',
    content: 'French Revolution, Industrial Revolution & More - ថ្នាក់ ១២',
    topicTags: ['ប្រវត្តិវិទ្យា', 'បាក់ឌុប', 'Revolution'],
    questions: [
      { question: 'French Revolution ចាប់ផ្តើមនៅ?', options: ['1776', '1789', '1800', '1815'], correctAnswer: 1, explanation: 'French Revolution ចាប់ ១៧៨៩ ក្រោយ Storming of Bastille ១៤ កក្កដា ១៧៨៩', points: 10 },
      { question: 'Slogan ចំណុច French Revolution?', options: ['Life Liberty Happiness', 'Liberté Égalité Fraternité', 'God King Country', 'Power People Peace'], correctAnswer: 1, explanation: '"Liberté, Égalité, Fraternité" (Freedom, Equality, Brotherhood) ជា Slogan Revolution', points: 10 },
      { question: 'Napoleon Bonaparte ជា?', options: ['ស្ដេចបារាំង', 'Emperor France', 'General ប្ដូល', 'President'], correctAnswer: 1, explanation: 'Napoleon Bonaparte = Emperor of the French (ឆ្នាំ 1804-1814)', points: 10 },
      { question: 'Industrial Revolution ចាប់ផ្តើមដំបូងក្នុងប្រទេស?', options: ['France', 'Germany', 'United Kingdom', 'USA'], correctAnswer: 2, explanation: 'Industrial Revolution ចាប់ UK (Britain) ចុងសតវត្ស ១៨ ជាមួយ Steam Engine & Textile', points: 10 },
      { question: 'Steam Engine (ម៉ាស៊ីនហ្វីងចំហេីន) ត្រូវបានធ្វើ Improvement ដោយ?', options: ['Isaac Newton', 'James Watt', 'Charles Darwin', 'Albert Einstein'], correctAnswer: 1, explanation: 'James Watt (1769) ធ្វើ Improvement Steam Engine → Revolution Industry', points: 10 },
      { question: 'American Independence ប្រកាស?', options: ['1774', '1776', '1783', '1788'], correctAnswer: 1, explanation: 'Declaration of Independence ០៤ កក្កដា ១៧៧៦', points: 10 },
      { question: 'Russian Revolution 1917 ដើម្បី?', options: ['ដំឡើង Tsar', 'ដំឡើង Democracy', 'ដំឡើង Communism', 'ដំឡើង Monarchy'], correctAnswer: 2, explanation: 'Bolshevik Revolution (October 1917) ដោយ Lenin → Communist Government', points: 10 },
      { question: 'Karl Marx បោះពុម្ព "Communist Manifesto" ក្នុង?', options: ['1840', '1848', '1860', '1867'], correctAnswer: 1, explanation: 'Communist Manifesto (1848) ដោយ Marx & Engels - ស្នាដៃឯកសារ Communism', points: 10 },
      { question: 'Enlightenment (Age of Reason) ប៉ះពាល់ Government ដោយ?', options: ['ការ强化 Monarchy', 'Democratic Ideas', 'ការ強化 Church', 'Military Rule'], correctAnswer: 1, explanation: 'Enlightenment Ideas (Locke, Rousseau, Voltaire) → Democratic Rights, Separation of Powers', points: 10 },
      { question: 'Nelson Mandela ជាប្រធានាធិបតី South Africa ដំបូង?', options: ['1990', '1992', '1994', '1996'], correctAnswer: 2, explanation: 'Mandela ជ្រើសរើស (elected) ជា President ឆ្នាំ ១៩៩៤ ក្រោយ End of Apartheid', points: 10 }
    ],
    timeLimit: 15, passingScore: 60, totalPoints: 100
  },
  {
    title: 'Quiz: ប្រវត្តិ - អាស៊ី និង Decolonization',
    content: 'ប្រវត្តិ Asia, Independence Movements - ថ្នាក់ ១២',
    topicTags: ['ប្រវត្តិវិទ្យា', 'បាក់ឌុប', 'Asia'],
    questions: [
      { question: 'India ទទួលបានឯករាជ្យពីអង់គ្លេសនៅ?', options: ['1945', '1947', '1950', '1955'], correctAnswer: 1, explanation: 'India Independence = ១៥ សីហា ១៩៤៧ ក្រោយ British Rule ជាង ២០០ ឆ្នាំ', points: 10 },
      { question: 'Gandhi ដែលជាអ្វី?', options: ['General', 'Non-Violent Resistance Leader', 'Prime Minister', 'King'], correctAnswer: 1, explanation: 'Mahatma Gandhi = មេដឹកនាំ Non-Violent Resistance (Satyagraha) ប្រឆាំង British', points: 10 },
      { question: 'China Communist Republic ត្រូវបានបង្កើត?', options: ['1945', '1947', '1949', '1951'], correctAnswer: 2, explanation: 'Mao Zedong ប្រកាស People\'s Republic of China ០១ តុលា ១៩៤៩', points: 10 },
      { question: 'Ho Chi Minh ជាអ្វីទៅ?', options: ['Vietnam King', 'Communist Leader of Vietnam', 'General Thailand', 'President Cambodia'], correctAnswer: 1, explanation: 'Ho Chi Minh = Communist Leader ដែលដឹកនាំ Vietnam Independence ពី France', points: 10 },
      { question: 'Korean Peninsula បែកចែករវាង?', options: ['Japan & China', 'USA-backed South & USSR-backed North', 'Britain & France', 'China & Japan'], correctAnswer: 1, explanation: 'Korea ចែក: North (USSR/Communist) & South (USA/Democratic) ក្នុង 1945', points: 10 },
      { question: 'Japan ចុះចោលក្នុងឆ្នាំ WWII?', options: ['1944', '1945', '1946', '1947'], correctAnswer: 1, explanation: 'Japan ចុះចោល ០២ កញ្ញា ១៩៤៥ ក្រោយ Atomic Bombs', points: 10 },
      { question: 'ASEAN ត្រូវបានបង្កើតឡើងនៅ?', options: ['1960', '1963', '1967', '1970'], correctAnswer: 2, explanation: 'ASEAN (Association of Southeast Asian Nations) បង្កើត ០៨ សីហា ១៩៦៧', points: 10 },
      { question: 'Tiananmen Square Incident (1989) ជា?', options: ['Election', 'Economic Reform', 'Pro-Democracy Protest crushed', 'Military Parade'], correctAnswer: 2, explanation: 'Tiananmen = Student Pro-Democracy Protest 1989 ដែល China Gov crush', points: 10 },
      { question: 'Aung San Suu Kyi ជាមេដឹកនាំ Democracy ក្នុង?', options: ['Thailand', 'Vietnam', 'Myanmar', 'Indonesia'], correctAnswer: 2, explanation: 'Aung San Suu Kyi = Nobel Peace Prize Winner & Myanmar Democracy Leader', points: 10 },
      { question: 'Hirohito ជា Emperor Japan ក្នុង WWII - ប្រទេស Japan ចុះចោលព្រោះ?', options: ['Soviet Invasion', 'Atomic Bombs', 'Economic Collapse', 'Military Defeat'], correctAnswer: 1, explanation: 'Atomic Bombs Hiroshima (6 Aug) & Nagasaki (9 Aug) 1945 → Japan Surrender', points: 10 }
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
        authorId: admin.id, title: q.title, content: q.content,
        postType: 'QUIZ', visibility: 'PUBLIC', topicTags: q.topicTags,
        quiz: {
          create: {
            questions: q.questions, timeLimit: q.timeLimit,
            passingScore: q.passingScore, totalPoints: q.totalPoints,
            resultsVisibility: 'AFTER_SUBMISSION', shuffleQuestions: false,
            shuffleAnswers: false, maxAttempts: 3, showReview: true, showExplanations: true,
          }
        }
      }
    });
    console.log(`✅ ${q.title} - ${q.questions.length}Q (ID: ${post.id})`);
  }
  console.log('\n🎉 Done! 3 more history quizzes created.');
}
run().catch(console.error).finally(() => prisma.$disconnect());
