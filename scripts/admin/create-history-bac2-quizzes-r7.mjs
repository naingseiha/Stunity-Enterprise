import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const quizzes = [
  {
    title: 'Quiz: ប្រវត្តិ - ចក្រភពបុរាណ (Great Empires of the World)',
    content: 'Roman, Ottoman, Mongol, British Empires - ថ្នាក់ ១២',
    topicTags: ['ប្រវត្តិវិទ្យា', 'បាក់ឌុប', 'Empires'],
    questions: [
      { question: 'Roman Empire ធំបំផុតក្នុងរជ្ជកាល?', options: ['Julius Caesar', 'Trajan', 'Augustus', 'Nero'], correctAnswer: 1, explanation: 'Roman Empire ធំជាងគេ = Emperor Trajan (98-117 CE)', points: 10 },
      { question: 'Ottoman Empire មានរាជធានី?', options: ['Cairo', 'Baghdad', 'Constantinople (Istanbul)', 'Damascus'], correctAnswer: 2, explanation: 'Ottoman Capital = Constantinople (ឥឡូវ Istanbul, Turkey)', points: 10 },
      { question: 'Mongol Empire ធំជាងគេ = ?', options: ['Roman Empire', 'British Empire', 'Mongol Empire', 'Ottoman Empire'], correctAnswer: 2, explanation: 'Mongol Empire = Largest Contiguous Land Empire ក្នុងប្រវត្តិ', points: 10 },
      { question: 'British Empire ដ៏ ធំបំផុតដែល Control?', options: ['25% of World', '50% of World', '10% of World', '35% of World'], correctAnswer: 0, explanation: 'British Empire Peak = ~25% of World Land Area & Population', points: 10 },
      { question: 'Pax Romana ជា?', options: ['Roman War', '200 Years of Roman Peace', 'Roman Religion', 'Roman Trade'], correctAnswer: 1, explanation: 'Pax Romana (27 BCE - 180 CE) = Period of Relative Peace within Roman Empire', points: 10 },
      { question: 'Suleiman the Magnificent ជា?', options: ['Mongol Khan', 'Ottoman Sultan', 'Persian Shah', 'Mughal Emperor'], correctAnswer: 1, explanation: 'Suleiman I = Ottoman Sultan ដ៏ ល្បីបំផុត - Expanded Empire to its Greatest Extent', points: 10 },
      { question: 'Kublai Khan ដែលជា Mongol Leader ក្លាយជា?', options: ['Chinese Emperor', 'Japan King', 'Korean King', 'Indian Sultan'], correctAnswer: 0, explanation: 'Kublai Khan = Founder of Yuan Dynasty - Emperor of China (1271-1294)', points: 10 },
      { question: 'Fall of Ottoman Empire ក្នុង?', options: ['1918', '1920', '1922', '1924'], correctAnswer: 2, explanation: 'Ottoman Empire ផ្លូវការ End 1922 → Republic of Turkey ប្រកាស ១៩២៣', points: 10 },
      { question: 'Mughal Empire = Empire of?', options: ['Turkey', 'India', 'Persia', 'Arabia'], correctAnswer: 1, explanation: 'Mughal Empire = Islamic Empire ដែល Rule India 1526-1857', points: 10 },
      { question: 'Taj Mahal ត្រូវ Build ដោយ Emperor?', options: ['Akbar', 'Aurangzeb', 'Shah Jahan', 'Babur'], correctAnswer: 2, explanation: 'Shah Jahan Build Taj Mahal (1632-53) ជា Memorial ដល់ Wife Mumtaz Mahal', points: 10 }
    ],
    timeLimit: 15, passingScore: 60, totalPoints: 100
  },
  {
    title: 'Quiz: ប្រវត្តិ - ចំណេះដឹងពិភពលោក (World Knowledge Mix)',
    content: 'Mixed World History Knowledge Test - ថ្នាក់ ១២ ប្រវត្តិ',
    topicTags: ['ប្រវត្តិវិទ្យា', 'បាក់ឌុប', 'World History'],
    questions: [
      { question: 'First country to give Women Right to Vote?', options: ['USA', 'UK', 'New Zealand', 'France'], correctAnswer: 2, explanation: 'New Zealand (1893) = First Country Women Right to Vote', points: 10 },
      { question: 'Panama Canal ភ្ជាប់?', options: ['Pacific & Indian', 'Atlantic & Pacific', 'Arctic & Atlantic', 'Indian & Pacific'], correctAnswer: 1, explanation: 'Panama Canal ភ្ជាប់ Atlantic & Pacific Ocean - Complete 1914', points: 10 },
      { question: 'Red Cross ត្រូវ Found ដោយ?', options: ['Florence Nightingale', 'Henry Dunant', 'Louis Pasteur', 'Albert Schweitzer'], correctAnswer: 1, explanation: 'Henry Dunant (Swiss) = Founder of Red Cross 1863 → Nobel Peace Prize 1901', points: 10 },
      { question: 'Printing Press Invented by?', options: ['Leonardo da Vinci', 'Johannes Gutenberg', 'Galileo Galilei', 'Copernicus'], correctAnswer: 1, explanation: 'Johannes Gutenberg (Germany) Invented Printing Press ~1440 → Revolution Information', points: 10 },
      { question: 'Christopher Columbus "Discover" Americas = ?', options: ['1490', '1492', '1498', '1500'], correctAnswer: 1, explanation: 'Columbus Reach Caribbean ១២ October ១៤៩២ (ហៅ "Discovery" of New World)', points: 10 },
      { question: 'Magellan Expedition = First to?', options: ['Discover America', 'Circumnavigate the Globe', 'Find India', 'Reach China'], correctAnswer: 1, explanation: 'Magellan Expedition (1519-22) = First Circumnavigation of Globe (Magellan died en route)', points: 10 },
      { question: 'Age of Enlightenment (17-18th Century) = ?', options: ['Religious Revival', 'Reason & Science Over Superstition', 'Military Expansion', 'Colonial Rule'], correctAnswer: 1, explanation: 'Enlightenment = Intellectual Movement → Reason, Individual Rights, Democracy', points: 10 },
      { question: 'Black Death (1347-51) ជា?', options: ['War', 'Plague Killed 1/3 of Europe', 'Famine', 'Flood'], correctAnswer: 1, explanation: 'Black Death (Bubonic Plague) = Killed 75-200 Million People - 1/3 of Europe', points: 10 },
      { question: 'Renaissance ចាប់ Begin ក្នុង?', options: ['Germany', 'Italy', 'France', 'Spain'], correctAnswer: 1, explanation: 'Renaissance (14th-17th Century) = Rebirth of Art & Learning - Began in Italy (Florence)', points: 10 },
      { question: 'Galileo Galilei ល្បី?', options: ['Earth is Flat Theory', 'Earth Orbits the Sun (Heliocentric)', 'Invented Telescope', 'Both B and C'], correctAnswer: 3, explanation: 'Galileo = Confirmed Heliocentric Model & Improved Telescope for Astronomy', points: 10 }
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
