import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const quizzes = [
  {
    title: 'Quiz: ប្រវត្តិ - ចលនាសិទ្ធិ​មនុស្ស (Human Rights Movements)',
    content: 'Civil Rights, Feminism & Social Movements - ថ្នាក់ ១២',
    topicTags: ['ប្រវត្តិវិទ្យា', 'បាក់ឌុប', 'Human Rights'],
    questions: [
      { question: 'Martin Luther King Jr. ល្បីព្រោះ?', options: ['Military Leader', 'Civil Rights Leader (USA)', 'President USA', 'Union Leader'], correctAnswer: 1, explanation: 'MLK Jr. = Leader of American Civil Rights Movement 1950-60s (Non-violent)', points: 10 },
      { question: '"I Have a Dream" Speech ដោយ MLK Jr. ក្នុង?', options: ['1960', '1963', '1965', '1968'], correctAnswer: 1, explanation: '"I Have a Dream" = ២៨ សីហា ១៩៦៣ ក្នុង March on Washington', points: 10 },
      { question: 'Apartheid បញ្ចប់ South Africa?', options: ['1990', '1992', '1994', '1996'], correctAnswer: 2, explanation: 'Apartheid ផ្លូវការ End ១៩៩៤ ក្រោយ First Democratic Election - Mandela Win', points: 10 },
      { question: 'Suffragette Movement ជា?', options: ['Workers Rights', "Women's Right to Vote", 'Anti-War', 'Anti-Slavery'], correctAnswer: 1, explanation: "Suffragettes = Women Fight for Right to Vote (Early 20th Century)", points: 10 },
      { question: 'Rosa Parks ល្បីព្រោះ?', options: ['Scientist', 'Refused to Give Up Bus Seat (1955)', 'Politician', 'Writer'], correctAnswer: 1, explanation: 'Rosa Parks ១ ធ្នូ ១៩៥៥ ប្រឈមមុខ Segregation ក្នុង Bus → Spark Civil Rights', points: 10 },
      { question: 'Mahatma Gandhi ប្រើប្រាស់ Strategy?', options: ['Armed Rebellion', 'Non-violent Resistance (Satyagraha)', 'Political Campaign', 'Economic Boycott only'], correctAnswer: 1, explanation: 'Gandhi Satyagraha = Non-violent Resistance → Inspire Civil Rights Worldwide', points: 10 },
      { question: 'UN Declaration of Human Rights ប្រកាស?', options: ['1945', '1947', '1948', '1950'], correctAnswer: 2, explanation: 'Universal Declaration of Human Rights = ១០ ធ្នូ ១៩៤៨', points: 10 },
      { question: 'Anti-Apartheid Leader ដ៏ ល្បី Nelson Mandela?', options: ['Imprisoned 10 Years', 'Imprisoned 27 Years', 'Imprisoned 5 Years', 'Never Imprisoned'], correctAnswer: 1, explanation: 'Nelson Mandela ជាប់ Robben Island Prison ២៧ ឆ្នាំ (1964-1990)', points: 10 },
      { question: 'Civil Rights Act (USA) ចុះហត្ថលេខានៅ?', options: ['1960', '1962', '1964', '1968'], correctAnswer: 2, explanation: 'Civil Rights Act 1964 = USA Law ហាមមិនឱ្យ Discriminate Race, Color, Religion, Sex', points: 10 },
      { question: 'Malala Yousafzai ល្បីព្រោះ?', options: ["Fight for Girls' Education in Pakistan", 'Climate Activist', 'Anti-War Leader', 'Economic Rights'], correctAnswer: 0, explanation: "Malala = Youngest Nobel Peace Prize (2014) Fight for Girls' Education ប្រឆាំង Taliban", points: 10 }
    ],
    timeLimit: 15, passingScore: 60, totalPoints: 100
  },
  {
    title: 'Quiz: ប្រវត្តិ - អរិយធម៌ចិន និងជប៉ុន (China & Japan)',
    content: 'East Asian History - ថ្នាក់ ១២ ប្រវត្តិវិទ្យា',
    topicTags: ['ប្រវត្តិវិទ្យា', 'បាក់ឌុប', 'East Asia'],
    questions: [
      { question: 'Great Wall of China ធ្វើ?', options: ['Trade Route', 'Protect from Northern Invaders', 'Irrigation', 'Prison'], correctAnswer: 1, explanation: 'Great Wall of China = ការពារ Northern Nomads (Mongols, etc.) ចាប់ 7th BCE', points: 10 },
      { question: 'Silk Road ភ្ជាប់?', options: ['China to Rome', 'China to India', 'Japan to Korea', 'Egypt to Persia'], correctAnswer: 0, explanation: 'Silk Road = Ancient Trade Network ពី China → Central Asia → Middle East → Rome', points: 10 },
      { question: 'Confucius ជា?', options: ['Chinese Emperor', 'Chinese Philosopher', 'Military General', 'Religious Leader'], correctAnswer: 1, explanation: 'Confucius (551-479 BCE) = Chinese Philosopher ដ៏ ហ្សសំខាន់ ប្រចំ East Asian Society', points: 10 },
      { question: 'Genghis Khan បង្កើត?', options: ['Chinese Empire', 'Mongol Empire', 'Persian Empire', 'Ottoman Empire'], correctAnswer: 1, explanation: 'Genghis Khan = Founder of Mongol Empire - Largest Contiguous Empire in History', points: 10 },
      { question: 'Japan Feudal Period ដែល Samurai ជំនាន់?', options: ['Meiji Period', 'Edo Period', 'Edo & Before', 'Modern Japan'], correctAnswer: 2, explanation: 'Samurai = Japan Warrior Class ពី Heian Period (794) → Meiji Restoration (1868)', points: 10 },
      { question: 'Meiji Restoration (1868) ផ្លាស់ប្ដូរ Japan?', options: ['Return to Old Tradition', 'Modernize like West', 'Military Dictatorship', 'Democracy'], correctAnswer: 1, explanation: 'Meiji Restoration = Japan Rapid Modernization/Westernization ដើម្បី Compete ជាមួយ West', points: 10 },
      { question: 'Mao Zedong ដើរតួ?', options: ['First President of China Republic', 'Founder of Communist China', 'Military General Only', 'Emperor China'], correctAnswer: 1, explanation: 'Mao Zedong = Founder & First Leader of People\'s Republic of China (1949)', points: 10 },
      { question: 'Cultural Revolution China (1966-76) ជា?', options: ['Education Reform', 'Mao Mass Campaign to Purge Enemies', 'Economic Development', 'Military Reform'], correctAnswer: 1, explanation: 'Cultural Revolution = Mao Campaign Eliminate Opposition → Million Died/Imprisoned', points: 10 },
      { question: 'Hiroshima Day = ?', options: ['6 August 1945', '9 August 1945', '15 August 1945', '2 September 1945'], correctAnswer: 0, explanation: 'Hiroshima Atomic Bomb = ០៦ សីហា ១៩៤៥ → Nagasaki ០៩ សីហា ១៩៤៥', points: 10 },
      { question: 'Deng Xiaoping Reform China?', options: ['Open Market Economy', 'Pure Communism', 'Military Rule', 'Democracy'], correctAnswer: 0, explanation: 'Deng Xiaoping (1978+) = "Socialism with Chinese Characteristics" = Market Economy', points: 10 }
    ],
    timeLimit: 15, passingScore: 60, totalPoints: 100
  },
  {
    title: 'Quiz: ប្រវត្តិ - ការតស៊ូ និង Revolution នៃ ១៩-២០ Century',
    content: 'Key Revolutions & Struggles ក្នុងសតវត្ស ១៩-២០ - ថ្នាក់ ១២',
    topicTags: ['ប្រវត្តិវិទ្យា', 'បាក់ឌុប', '19-20 Century'],
    questions: [
      { question: 'Bolshevik Revolution (1917) ដឹកនាំ?', options: ['Marx', 'Lenin', 'Stalin', 'Trotsky'], correctAnswer: 1, explanation: 'Vladimir Lenin ដឹកនាំ Bolshevik Revolution October 1917 → Communist Soviet', points: 10 },
      { question: 'Spanish Civil War (1936-39) ចប់ Fascist Francisco Franco Win ព្រោះ?', options: ['Popular Vote', 'German & Italian Support', 'British Support', 'USA Support'], correctAnswer: 1, explanation: 'Franco Win ព្រោះ Germany (Nazi) & Italy (Fascist) Support = ចំណុច WWII Preview', points: 10 },
      { question: 'Chinese Civil War ជ័យជម្នះ Mao Zedong ក្នុង?', options: ['1945', '1947', '1949', '1951'], correctAnswer: 2, explanation: 'Mao Win Chinese Civil War 1949 → Chiang Kai-shek Flee to Taiwan', points: 10 },
      { question: 'Mexican Revolution (1910-20) ប្រឆាំង?', options: ['USA Invasion', 'Dictator Porfirio Diaz', 'Spanish Rule', 'French Rule'], correctAnswer: 1, explanation: 'Mexican Revolution = People Rise Against 35-Year Dictatorship of Porfirio Diaz', points: 10 },
      { question: 'Iranian Revolution (1979) = ?', options: ['Democracy', 'Islamist Republic', 'Communist', 'Military Rule'], correctAnswer: 1, explanation: 'Iranian Revolution 1979 = Ayatollah Khomeini Overthrow Shah → Islamic Republic', points: 10 },
      { question: 'Cuban Revolution (1959) ជ័យជម្នះ Fidel Castro?', options: ['Batista', 'USA Army', 'Spain', 'Britain'], correctAnswer: 0, explanation: 'Castro Overthrow Fulgencio Batista (USA-backed Dictator) ១ January 1959', points: 10 },
      { question: 'Zapatista Movement (1994) ក្នុង?', options: ['Cuba', 'Venezuela', 'Mexico', 'Bolivia'], correctAnswer: 2, explanation: 'EZLN (Zapatistas) = Indigenous Rights Movement ក្នុង Chiapas Mexico', points: 10 },
      { question: 'Arab Spring (2010-12) ចាប់ ពី?', options: ['Egypt', 'Tunisia', 'Libya', 'Syria'], correctAnswer: 1, explanation: 'Arab Spring ចាប់ Tunisia (2010) → ផ្សព្វ Egypt, Libya, Syria, Yemen...', points: 10 },
      { question: 'Velvet Revolution (1989) ក្នុង Czechoslovakia ជា?', options: ['Violent Uprising', 'Peaceful Democratic Transition', 'Military Coup', 'Election Dispute'], correctAnswer: 1, explanation: 'Velvet Revolution = Peaceful Non-violent Transition from Communist to Democracy', points: 10 },
      { question: 'Fall of Berlin Wall (1989) = ?', options: ['Start of Cold War', 'End of Cold War Symbol', 'WWII End', 'NATO Formation'], correctAnswer: 1, explanation: 'Berlin Wall Fall ០៩ វិច្ឆិកា ១៩៨៩ = Symbol of Cold War End & German Reunification', points: 10 }
    ],
    timeLimit: 15, passingScore: 60, totalPoints: 100
  }
];

async function run() {
  const admin = await prisma.user.findFirst({ where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } } });
  if (!admin) { console.error('No admin'); return; }
  for (const q of quizzes) {
    const post = await prisma.post.create({
      data: {
        authorId: admin.id, title: q.title, content: q.content,
        postType: 'QUIZ', visibility: 'PUBLIC', topicTags: q.topicTags,
        quiz: { create: { questions: q.questions, timeLimit: q.timeLimit, passingScore: q.passingScore, totalPoints: q.totalPoints, resultsVisibility: 'AFTER_SUBMISSION', shuffleQuestions: false, shuffleAnswers: false, maxAttempts: 3, showReview: true, showExplanations: true } }
      }
    });
    console.log(`✅ ${q.title} - ${q.questions.length}Q (ID: ${post.id})`);
  }
  console.log('\n🎉 Done! 3 more quizzes.');
}
run().catch(console.error).finally(() => prisma.$disconnect());
