import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TITLE = 'Quiz: អង់គ្លេសថ្នាក់ទី១២ - Vocabulary';

const questions = [
  {
    question: 'What is the synonym of "Comprehensive"?',
    options: ['Complete', 'Short', 'Difficult', 'Easy'],
    correctAnswer: 0,
    points: 10,
    explanation: 'Comprehensive means complete and including everything that is necessary.'
  },
  {
    question: 'Which word means "able to be maintained at a certain rate or level"?',
    options: ['Sustainable', 'Temporary', 'Fragile', 'Unstable'],
    correctAnswer: 0,
    points: 10,
    explanation: 'Sustainable refers to the ability to be maintained.'
  },
  {
    question: 'What is the antonym of "Abundant"?',
    options: ['Scarce', 'Plentiful', 'Copious', 'Heavy'],
    correctAnswer: 0,
    points: 10,
    explanation: 'Abundant means existing or available in large quantities; plentiful. Its opposite is Scarce.'
  },
  {
    question: 'A person who is very enthusiastic and dedicated to something is called...',
    options: ['Zealous', 'Apathetic', 'Indifferent', 'Lazy'],
    correctAnswer: 0,
    points: 10,
    explanation: 'Zealous means showing great energy or enthusiasm in pursuit of a cause or an objective.'
  },
  {
    question: 'The committee decided to ______ the new policy immediately.',
    options: ['implement', 'implementations', 'implemented', 'implements'],
    correctAnswer: 0,
    points: 10,
    explanation: 'After "to", we use the base form of the verb (infinitive).'
  },
  {
    question: 'True or False: The word "Inevitable" means something that can be avoided.',
    options: ['True', 'False'],
    correctAnswer: 1,
    points: 10,
    explanation: 'Inevitable means certain to happen; unavoidable. So the statement is False.'
  },
  {
    question: 'She made a huge ______ in her career when she moved to the new company.',
    options: ['leap', 'jump', 'skip', 'hop'],
    correctAnswer: 0,
    points: 10,
    explanation: '"A huge leap" is a common collocation meaning a significant advance or improvement.'
  },
  {
    question: 'To "hit the nail on the head" means...',
    options: ['To do exactly the right thing', 'To make a mistake', 'To build a house', 'To have a headache'],
    correctAnswer: 0,
    points: 10,
    explanation: 'This idiom means to describe exactly what is causing a situation or problem, or to do exactly the right thing.'
  },
  {
    question: 'They had to ______ the meeting because the manager was sick.',
    options: ['call off', 'call out', 'call in', 'call on'],
    correctAnswer: 0,
    points: 10,
    explanation: '"Call off" is a phrasal verb meaning to cancel an event or agreement.'
  },
  {
    question: 'Despite the heavy rain, the students were ______ to finish their project.',
    options: ['determined', 'hesitant', 'reluctant', 'afraid'],
    correctAnswer: 0,
    points: 10,
    explanation: '"Determined" fits the context of showing resolve despite the obstacle (heavy rain).'
  }
];

async function updateQuiz() {
  const post = await prisma.post.findFirst({
    where: { title: TITLE },
    include: { quiz: true, quizQuestions: true }
  });

  if (!post || !post.quiz) {
    console.error('Quiz post not found');
    return;
  }

  // Delete existing quiz questions
  await prisma.quizQuestion.deleteMany({
    where: { postId: post.id }
  });

  // Update Quiz model
  await prisma.quiz.update({
    where: { id: post.quiz.id },
    data: {
      questions: questions,
      totalPoints: questions.reduce((sum, q) => sum + q.points, 0)
    }
  });

  // Re-create QuizQuestions
  await prisma.quizQuestion.createMany({
    data: questions.map((q, idx) => ({
      postId: post.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      points: q.points,
      position: idx,
      explanation: q.explanation
    }))
  });

  console.log('Successfully updated quiz with 10 questions!');
}

updateQuiz().catch(console.error).finally(() => prisma.$disconnect());
