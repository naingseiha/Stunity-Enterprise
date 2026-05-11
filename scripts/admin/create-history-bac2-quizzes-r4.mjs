import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const quizzes = [
  {
    title: 'Quiz: ប្រវត្តិ - អរិយធម៌ក្រិក និងរ៉ូម (Ancient Greece & Rome)',
    content: 'ប្រវត្តិអរិយធម៌បុរាណ - ថ្នាក់ ១២ ប្រវត្តិវិទ្យា',
    topicTags: ['ប្រវត្តិវិទ្យា', 'បាក់ឌុប', 'Ancient History'],
    questions: [
      { question: 'ប្រជាធិបតេយ្យ (Democracy) ដំបូងកើតនៅ?', options: ['Rome', 'Athens (Greece)', 'Egypt', 'Persia'], correctAnswer: 1, explanation: 'Athens (Greece) ជាកន្លែងកំណើតនៃ Democracy ដំបូងបង្អស់ក្នុង ៥ BCE', points: 10 },
      { question: 'Alexander the Great ជាស្ដេចមកពី?', options: ['Greece', 'Macedonia', 'Persia', 'Egypt'], correctAnswer: 1, explanation: 'Alexander the Great ជាស្ដេច Macedonia ដែលបង្កើតចក្រភពធំបំផុតក្នុងប្រវត្តិ', points: 10 },
      { question: 'Olympic Games ដើមកំណើតនៅ?', options: ['Rome', 'Greece', 'Egypt', 'Turkey'], correctAnswer: 1, explanation: 'Olympic Games ដំបូង (Ancient) ប្រព្រឹត្ត ះ Olympia, Greece ក្នុង ७७৬ BCE', points: 10 },
      { question: 'Roman Republic ប្រែក្លាយជា Roman Empire ដោយ?', options: ['Julius Caesar', 'Augustus Caesar', 'Nero', 'Constantine'], correctAnswer: 1, explanation: 'Augustus Caesar (ដើម 27 BCE) ជាស្ដេចដំបូងនៃ Roman Empire', points: 10 },
      { question: 'ក្នុង Ancient Greece Sparta ល្បីលើ?', options: ['Arts & Culture', 'Military Training', 'Philosophy', 'Trade'], correctAnswer: 1, explanation: 'Sparta ល្បីលើ Military Discipline & Warriors - Boys Train ពីអាយុ ៧ ឆ្នាំ', points: 10 },
      { question: 'Julius Caesar ត្រូវគេ Kill ក្នុង?', options: ['15 March 44 BCE', '15 March 46 BCE', '1 Jan 44 BCE', '25 Dec 44 BCE'], correctAnswer: 0, explanation: 'Julius Caesar ត្រូវ Assassinate ១៥ March ៤៤ BCE (Ides of March) ក្នុង Senate', points: 10 },
      { question: 'Colosseum ស្ថិតក្នុងទីក្រុងណា?', options: ['Athens', 'Carthage', 'Rome', 'Constantinople'], correctAnswer: 2, explanation: 'Colosseum (Flavian Amphitheatre) ស្ថិតក្នុង Rome Italy', points: 10 },
      { question: 'Socrates, Plato & Aristotle ជា?', options: ['Roman Generals', 'Greek Philosophers', 'Persian Kings', 'Egyptian Priests'], correctAnswer: 1, explanation: 'Socrates, Plato & Aristotle ជា Greek Philosophers ដ៏ល្បីបំផុត', points: 10 },
      { question: 'Fall of Rome (Western) = ?', options: ['476 CE', '400 CE', '550 CE', '330 CE'], correctAnswer: 0, explanation: 'Western Roman Empire ដួលរលំ ៤៧៦ CE ដោយ Odoacer', points: 10 },
      { question: 'Cleopatra ជាប្រមុខ?', options: ['Rome', 'Greece', 'Egypt', 'Persia'], correctAnswer: 2, explanation: 'Cleopatra VII Philopator ជា Queen Egypt (Ptolemaic Dynasty) ចុងក្រោយ', points: 10 }
    ],
    timeLimit: 15, passingScore: 60, totalPoints: 100
  },
  {
    title: 'Quiz: ប្រវត្តិ - Imperialism & World Powers',
    content: 'ការស្វែងយល់ Imperialism ពី ១៨-១៩ Century - ថ្នាក់ ១២',
    topicTags: ['ប្រវត្តិវិទ្យា', 'បាក់ឌុប', 'Imperialism'],
    questions: [
      { question: 'Imperialism = ?', options: ['ការបង្ហូរ Capital', 'ការ Dominate ប្រទេសផ្សេង', 'ចលនា Workers', 'Democracy Building'], correctAnswer: 1, explanation: 'Imperialism = Strong Country Dominate & Control Weaker Countries (Politically/Economically)', points: 10 },
      { question: '"The Sun Never Sets on the British Empire" - ព្រោះ?', options: ['UK មានប្រទេស Colonies ក្រៅ', 'UK ស្ថិតខាងជើង', 'UK មានម Colonies ជារ', 'UK ជាប្រទេសធំ'], correctAnswer: 0, explanation: 'British Empire Control Territories ទូទៅពិភពលោក → Always Daylight Somewhere', points: 10 },
      { question: 'Scramble for Africa (1880-1900) = ?', options: ['African Revolution', 'European Competition for African Colonies', 'Trade Routes', 'Religion Spread'], correctAnswer: 1, explanation: 'European Powers Rush to Colonize Africa → "Scramble for Africa"', points: 10 },
      { question: 'Opium Wars ជាជម្លោះ?', options: ['UK vs France', 'UK vs China', 'USA vs China', 'France vs China'], correctAnswer: 1, explanation: 'Opium Wars (1839-42 & 1856-60) = UK force China to allow Opium Trade', points: 10 },
      { question: 'Berlin Conference (1884-85) ដោះស្រាយ?', options: ['WWI Peace', 'African Partition Rules', 'Asian Trade', 'NATO Formation'], correctAnswer: 1, explanation: 'Berlin Conference = European Powers បែងចែក (Partition) Africa ដោយ Force', points: 10 },
      { question: 'Monroe Doctrine (1823) ជា Policy?', options: ['USA Military Expansion', 'USA "Stay out of Americas" for Europe', 'European Trade Policy', 'Latin America Revolution'], correctAnswer: 1, explanation: 'Monroe Doctrine = USA ប្រកាស European Powers "Stay out of Western Hemisphere"', points: 10 },
      { question: 'Meiji Restoration (1868) ជា?', options: ['Japan Revolution', 'Japan Modernization', 'Japan Civil War', 'Japan Surrender'], correctAnswer: 1, explanation: 'Meiji Restoration = Japan Modernize (Western Style) after 200+ Years Isolation', points: 10 },
      { question: 'Suez Canal ជាវិស្វកម្ម?', options: ['ចំនួន ១ UK', 'ចំនួន Egypt-France', 'ចំនួន USA-UK', 'ចំនួន France-Spain'], correctAnswer: 1, explanation: 'Suez Canal (1869) សាង ដោយ Egypt ជាមួយ French Engineer Ferdinand de Lesseps', points: 10 },
      { question: 'Decolonization Movement ធំជាងក្នុង?', options: ['1920-1930', '1940-1960', '1960-1980', '1980-2000'], correctAnswer: 1, explanation: '1940-1960 ជា Decade ធំនៃ Independence: India, Pakistan, Vietnam, Ghana...', points: 10 },
      { question: 'Spanish-American War (1898) ដែល USA ឈ្នះ Philippines Cuba Puerto Rico = ?', options: ['USA Join WWI', 'USA become Imperial Power', 'Spain Expand', 'Latin America Join USA'], correctAnswer: 1, explanation: 'Spanish-American War → USA ចាប់ Cuba, Puerto Rico & Philippines = USA Imperialist', points: 10 }
    ],
    timeLimit: 15, passingScore: 60, totalPoints: 100
  },
  {
    title: 'Quiz: ប្រវត្តិ - ពិភពលោកក្រោយ WWII (Post-War World)',
    content: 'ប្រវត្តិពិភពលោក ១៩៤៥-១៩៩០ - ថ្នាក់ ១២',
    topicTags: ['ប្រវត្តិវិទ្យា', 'បាក់ឌុប', 'Post-War'],
    questions: [
      { question: 'Marshall Plan ទឹកប្រាក់ប្រហែល?', options: ['$1 Billion', '$13 Billion', '$50 Billion', '$100 Million'], correctAnswer: 1, explanation: 'Marshall Plan ២ ១៩៤៨-១៩៥២ = ១ $13 Billion Aid to Rebuild Europe', points: 10 },
      { question: 'Iron Curtain ជា Term ដោយ?', options: ['Roosevelt', 'Churchill', 'Stalin', 'Truman'], correctAnswer: 1, explanation: 'Winston Churchill ប្រើ "Iron Curtain" ក្នុង Fulton Speech 1946 = European Division', points: 10 },
      { question: 'Universal Declaration of Human Rights ចុះ?', options: ['1945', '1946', '1948', '1950'], correctAnswer: 2, explanation: 'UDHR ចុះ ១០ ធ្នូ ១៩៤៨ ដោយ UN General Assembly', points: 10 },
      { question: 'State of Israel ជ្រើសឡើង?', options: ['1945', '1946', '1947', '1948'], correctAnswer: 3, explanation: 'State of Israel ប្រកាស ១៤ ឧសភា ១៩៤៨ → Arab-Israeli War ចាប់', points: 10 },
      { question: 'Korean War Armistice (1953) បែងចែក Korea?', options: ['38th Parallel', '35th Parallel', '40th Parallel', 'Yalu River'], correctAnswer: 0, explanation: '38th Parallel = DMZ (Demilitarized Zone) ដែលបែង North & South Korea', points: 10 },
      { question: 'Sputnik (1957) ជា?', options: ['USA Satellite', 'USSR Satellite', 'Joint Satellite', 'French Satellite'], correctAnswer: 1, explanation: 'Sputnik = Soviet First Artificial Satellite (4 Oct 1957) → Start Space Race', points: 10 },
      { question: 'Moon Landing ជា First Human ដោយ?', options: ['Yuri Gagarin', 'Neil Armstrong', 'Buzz Aldrin', 'Alan Shepard'], correctAnswer: 1, explanation: 'Neil Armstrong First Human On Moon ២០ កក្កដា ១៩៦៩ - Apollo 11', points: 10 },
      { question: 'Vietnam War: USA ចាប់ Withdraw ក្នុង?', options: ['1969', '1971', '1973', '1975'], correctAnswer: 2, explanation: 'Paris Peace Accords ១៩៧៣ → USA ចាប់ Withdraw Troops ពី Vietnam', points: 10 },
      { question: 'Apartheid ក្នុង South Africa = ?', options: ['Trade Policy', 'Racial Segregation System', 'Military Rule', 'Economic Plan'], correctAnswer: 1, explanation: 'Apartheid = Legal Racial Segregation System ក្នុង South Africa (1948-1994)', points: 10 },
      { question: 'Mikhail Gorbachev Reform Policy = ?', options: ['Glasnost & Perestroika', 'Communism & Socialism', 'NATO & Warsaw', 'Stalin & Lenin'], correctAnswer: 0, explanation: 'Glasnost (Openness) & Perestroika (Restructuring) = Gorbachev Reform USSR 1980s', points: 10 }
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
  console.log('\n🎉 Done! 3 more quizzes added.');
}
run().catch(console.error).finally(() => prisma.$disconnect());
