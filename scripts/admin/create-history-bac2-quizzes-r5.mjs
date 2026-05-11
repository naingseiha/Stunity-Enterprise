import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const quizzes = [
  {
    title: 'Quiz: ប្រវត្តិ - អរិយធម៌អេស៊ីព្ទ បុរាណ (Ancient Egypt)',
    content: 'ចំណេះដឹង Ancient Egypt & Pharaohs - ថ្នាក់ ១២',
    topicTags: ['ប្រវត្តិវិទ្យា', 'បាក់ឌុប', 'Ancient Egypt'],
    questions: [
      { question: 'ព្រះពុទ្ធសញ្ញា Sphinx ស្ថិតនៅ?', options: ['Cairo', 'Giza', 'Luxor', 'Alexandria'], correctAnswer: 1, explanation: 'Great Sphinx of Giza ស្ថិតនៅ Giza Plateau ជិត Great Pyramids', points: 10 },
      { question: 'Pyramids of Giza ត្រូវបានសាង?', options: ['400 BCE', '2500 BCE', '1000 BCE', '100 CE'], correctAnswer: 1, explanation: 'Great Pyramid of Giza សង្ហ ២,០០០ BCE ក្នុង Old Kingdom Egypt', points: 10 },
      { question: 'Pharaoh Tutankhamun ល្បីព្រោះ?', options: ['Military Conquest', 'Discovery of Tomb 1922', 'Built Pyramids', 'United Egypt'], correctAnswer: 1, explanation: 'King Tut ល្បីព្រោះ Howard Carter Discover Tomb 1922 - ពោរពេញ Gold Treasure', points: 10 },
      { question: 'Nile River ហូរពី?', options: ['North to South', 'South to North', 'East to West', 'West to East'], correctAnswer: 1, explanation: 'Nile ហូរ South to North (unique) → Mediterranean Sea', points: 10 },
      { question: 'Hieroglyphics ជា?', options: ['Greek Writing', 'Egyptian Writing System', 'Roman Script', 'Sumerian Writing'], correctAnswer: 1, explanation: 'Hieroglyphics = Egyptian Pictographic Writing System - 5000+ Years Old', points: 10 },
      { question: 'Rosetta Stone ជ្រូយជួយ Decode Hieroglyphics ព្រោះ?', options: ['មាន Map', 'មាន Translation Greek & Egyptian', 'មាន Key', 'មាន Dictionary'], correctAnswer: 1, explanation: 'Rosetta Stone (196 BCE) = Same Text ជា Hieroglyphic, Demotic & Greek → Key to Decode', points: 10 },
      { question: 'Cleopatra VII ជា?', options: ['Last Queen Ptolemaic Egypt', 'First Pharaoh', 'Roman Empress', 'Greek Princess'], correctAnswer: 0, explanation: 'Cleopatra VII = Last Active Pharaoh of Ptolemaic Egypt (died 30 BCE)', points: 10 },
      { question: 'Ancient Egypt ចែកជា?', options: ['2 Kingdoms', '3 Kingdoms (Old Middle New)', '4 Kingdoms', '5 Kingdoms'], correctAnswer: 1, explanation: 'Egypt History = Old Kingdom, Middle Kingdom, New Kingdom (+ Intermediate Periods)', points: 10 },
      { question: 'Mummification ជា?', options: ['Religious Sacrifice', 'Body Preservation for Afterlife', 'Medical Treatment', 'Punishment'], correctAnswer: 1, explanation: 'Mummification = Preserve Body for Afterlife Belief in Ancient Egypt', points: 10 },
      { question: 'Ra (Re) ក្នុង Egyptian Mythology ជា?', options: ['God of Death', 'Sun God', 'God of War', 'God of Water'], correctAnswer: 1, explanation: 'Ra = Egyptian Sun God - Most Important Deity in Ancient Egypt', points: 10 }
    ],
    timeLimit: 15, passingScore: 60, totalPoints: 100
  },
  {
    title: 'Quiz: ប្រវត្តិ - ការផ្លាស់ប្ដូររបស់អាស៊ីអាគ្នេយ៍ (SEA History)',
    content: 'Southeast Asia History - ថ្នាក់ ១២ ប្រវត្តិ',
    topicTags: ['ប្រវត្តិវិទ្យា', 'បាក់ឌុប', 'Southeast Asia'],
    questions: [
      { question: 'ASEAN ត្រូវបានបង្កើតនៅ Bangkok ក្នុង?', options: ['1965', '1967', '1970', '1975'], correctAnswer: 1, explanation: 'ASEAN Bangkok Declaration = ០៨ សីហា ១៩៦៧ ដោយ 5 Founding Members', points: 10 },
      { question: 'Founding Members of ASEAN = ?', options: ['Thailand Vietnam Philippines Indonesia Malaysia', 'Thailand Philippines Indonesia Malaysia Singapore', 'Thailand Myanmar Vietnam Laos Cambodia', 'Vietnam Laos Cambodia Thailand Myanmar'], correctAnswer: 1, explanation: 'ASEAN Original 5: Thailand, Philippines, Indonesia, Malaysia, Singapore', points: 10 },
      { question: 'Vietnam ដណ្ដើម Independence ពី France ក្នុង?', options: ['1945', '1954', '1960', '1975'], correctAnswer: 1, explanation: 'Geneva Accords 1954 = France ចុះហត្ថលេខា End First Indochina War → Vietnam Split', points: 10 },
      { question: 'Pol Pot ជា Leader ប្រទេស?', options: ['Vietnam', 'Cambodia', 'Laos', 'Myanmar'], correctAnswer: 1, explanation: 'Pol Pot = Leader of Khmer Rouge ដែលគ្រប់គ្រង Cambodia (1975-1979)', points: 10 },
      { question: 'Suharto គ្រប់គ្រង Indonesia?', options: ['1945-1965', '1965-1998', '1998-2000', '1955-1975'], correctAnswer: 1, explanation: 'Suharto = President Indonesia 1967-1998 (31 Years)', points: 10 },
      { question: 'Singapore ដណ្ដើម Independence ពី Malaysia?', options: ['1963', '1965', '1967', '1970'], correctAnswer: 1, explanation: 'Singapore Independent ០៩ សីហា ១៩៦៥ ក្រោយ Separate ពី Malaysia', points: 10 },
      { question: 'Lee Kuan Yew ជា?', options: ['Malaysia PM', 'Singapore First PM', 'Indonesia President', 'Thailand King'], correctAnswer: 1, explanation: 'Lee Kuan Yew = First Prime Minister of Singapore (1959-1990)', points: 10 },
      { question: 'Khmer Empire (Angkor) ជា Empire ធំក្នុង?', options: ['14th Century', '9th-15th Century', '5th Century', '17th Century'], correctAnswer: 1, explanation: 'Khmer Empire = ~800 CE - 1431 CE (9th to 15th Century)', points: 10 },
      { question: 'Philippines ទទួល Independence ពី USA?', options: ['1944', '1946', '1950', '1955'], correctAnswer: 1, explanation: 'Philippines Independence = ០៤ កក្កដា ១៩៤៦', points: 10 },
      { question: 'Myanmar (Burma) ដណ្ដើម Independence ពី?', options: ['France', 'Netherlands', 'United Kingdom', 'Japan'], correctAnswer: 2, explanation: 'Burma (Myanmar) Independence ពី UK = ០៤ មករា ១៩៤៨', points: 10 }
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
  console.log('\n🎉 Done!');
}
run().catch(console.error).finally(() => prisma.$disconnect());
