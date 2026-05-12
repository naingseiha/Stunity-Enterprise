import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Fixing Grade 12 Math Quiz (Removing JSON.stringify)...');

  // Find the existing quiz to delete or update
  const existingPost = await prisma.post.findFirst({
    where: { title: { contains: 'វិញ្ញាសាត្រៀមប្រឡងបាក់ឌុប៖ គណិតវិទ្យា ថ្នាក់ទី១២' } }
  });

  if (existingPost) {
    console.log(`🗑️ Deleting existing quiz post: ${existingPost.id}`);
    await prisma.post.delete({ where: { id: existingPost.id } });
  }

  const authorId = 'cmm7zzkpf00019ay9v3c30p54'; // Admin user ID
  const coverImageUrl = 'https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=2000&auto=format&fit=crop';

  const questions = [
    {
      id: 'q1',
      type: 'MULTIPLE_CHOICE',
      text: 'គណនាអាំងតេក្រាលមិនកំណត់ $I = \\int (3x^2 - 4x + 5) dx$ ។',
      options: [
        'A. $x^3 - 2x^2 + 5x + C$',
        'B. $3x^3 - 4x^2 + 5x + C$',
        'C. $x^3 - 4x^2 + 5x + C$',
        'D. $x^3 - 2x^2 + C$'
      ],
      correctAnswer: '0',
      points: 10,
      explanation: 'តាមរូបមន្ត $\\int x^n dx = \\frac{x^{n+1}}{n+1} + C$ ។ ដូច្នេះ $\\int 3x^2 dx = x^3$, $\\int -4x dx = -2x^2$, និង $\\int 5 dx = 5x$ ។'
    },
    {
      id: 'q2',
      type: 'TRUE_FALSE',
      text: 'បើ $z = 1 + i$ នោះទម្រង់ត្រីកោណមាត្រនៃ $z$ គឺ $z = \\sqrt{2}(\\cos \\frac{\\pi}{4} + i \\sin \\frac{\\pi}{4})$ ។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      points: 10,
      explanation: 'ម៉ូឌុល $r = \\sqrt{1^2 + 1^2} = \\sqrt{2}$ ។ អាគុយម៉ង់ $\\theta$ កំណត់ដោយ $\\cos \\theta = \\frac{1}{\\sqrt{2}}$ និង $\\sin \\theta = \\frac{1}{\\sqrt{2}}$ នាំឱ្យ $\\theta = \\frac{\\pi}{4}$ ។'
    },
    {
      id: 'q3',
      type: 'MULTIPLE_CHOICE',
      text: 'រកដេរីវេនៃអនុគមន៍ $f(x) = \\ln(x^2 + 1)$ ។',
      options: [
        'A. $f\'(x) = \\frac{1}{x^2 + 1}$',
        'B. $f\'(x) = \\frac{2x}{x^2 + 1}$',
        'C. $f\'(x) = \\frac{2}{x^2 + 1}$',
        'D. $f\'(x) = \\frac{x}{x^2 + 1}$'
      ],
      correctAnswer: '1',
      points: 10,
      explanation: 'តាមរូបមន្ត $[\\ln(u)]\' = \\frac{u\'}{u}$ ។ ក្នុងករណីនេះ $u = x^2 + 1$ នាំឱ្យ $u\' = 2x$ ។'
    },
    {
      id: 'q4',
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងរូបមន្តត្រីកោណមាត្រខាងក្រោមឱ្យបានត្រឹមត្រូវ៖',
      options: [
        '$\\sin^2 x + \\cos^2 x$:::1',
        '$\\tan x$:::$\\frac{\\sin x}{\\cos x}$',
        '$1 + \\tan^2 x$:::$\\frac{1}{\\cos^2 x}$',
        '$\\sin 2x$:::$2\\sin x \\cos x$'
      ],
      correctAnswer: JSON.stringify({
        '$\\sin^2 x + \\cos^2 x$': '1',
        '$\\tan x$': '$\\frac{\\sin x}{\\cos x}$',
        '$1 + \\tan^2 x$': '$\\frac{1}{\\cos^2 x}$',
        '$\\sin 2x$': '$2\\sin x \\cos x$'
      }),
      points: 20,
      explanation: 'ទាំងនេះជារូបមន្តគ្រឹះនៃត្រីកោណមាត្រដែលសិស្សានុសិស្សត្រូវចងចាំ។'
    },
    {
      id: 'q5',
      type: 'SHORT_ANSWER',
      text: 'ក្នុងថង់មួយមានឃ្លីក្រហម ៥ និងឃ្លីខៀវ ៥។ ចាប់យកឃ្លី ២ ព្រមគ្នា។ រកចំនួនករណីអាចទាំងអស់ (Total possible outcomes)។',
      correctAnswer: '45',
      points: 10,
      explanation: 'ចំនួនករណីអាចគឺ $C(10, 2) = \\frac{10 \\times 9}{2 \\times 1} = 45$ ។'
    }
  ];

  const post = await prisma.post.create({
    data: {
      title: "វិញ្ញាសាត្រៀមប្រឡងបាក់ឌុប៖ គណិតវិទ្យា ថ្នាក់ទី១២ (Grade 12 Math - Bac II Preparation)",
      content: "វិញ្ញាសាសាកល្បងនេះត្រូវបានរៀបចំឡើងយ៉ាងសម្រិតសម្រាំងបំផុត ដើម្បីជួយដល់សិស្សានុសិស្សក្នុងការត្រៀមខ្លួនសម្រាប់សញ្ញាបត្រមធ្យមសិក្សាទុតិយភូមិ។\n\nសូមជូនពរសិស្សានុសិស្សទទួលបានជោគជ័យ និងនិទ្ទេសល្អគ្រប់ៗគ្នា! 📚✨",
      postType: 'QUIZ',
      authorId,
      mediaUrls: [coverImageUrl],
      mediaMetadata: { images: [{ width: 1000, height: 600 }] },
      mediaAspectRatio: 1.67,
      visibility: 'PUBLIC'
    }
  });

  await prisma.quiz.create({
    data: {
      postId: post.id,
      questions: questions, // ✅ DO NOT use JSON.stringify here, Prisma expects an object/array for Json type
      timeLimit: 15,
      passingScore: 30,
      totalPoints: 60,
      resultsVisibility: 'AFTER_SUBMISSION',
      shuffleQuestions: true,
      shuffleAnswers: true,
      showReview: true,
      showExplanations: true
    }
  });

  console.log(`✅ Quiz fixed and recreated with Post ID: ${post.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
