import type { QuizItem, QuizQuestion } from '@/services/quiz';

type LooseQuestion = Partial<QuizQuestion> & {
  question?: string;
  prompt?: string;
  title?: string;
};

export type NormalizedQuizQuestion = QuizQuestion & {
  id: string;
  text: string;
  points: number;
  options?: string[];
};

export type NormalizedQuiz = Omit<Partial<QuizItem>, 'questions'> & {
  id: string;
  title: string;
  description?: string;
  questions: NormalizedQuizQuestion[];
  timeLimit?: number | null;
  passingScore: number;
  totalPoints: number;
  shuffleQuestions?: boolean;
};

const VALID_QUESTION_TYPES = new Set([
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'FILL_IN_BLANK',
  'ORDERING',
  'MATCHING',
]);

const normalizeQuestionType = (type: unknown): NormalizedQuizQuestion['type'] => {
  const normalized = String(type || 'MULTIPLE_CHOICE').toUpperCase();
  return VALID_QUESTION_TYPES.has(normalized)
    ? (normalized as NormalizedQuizQuestion['type'])
    : 'MULTIPLE_CHOICE';
};

const normalizeOptions = (options: unknown): string[] | undefined => {
  if (!Array.isArray(options)) return undefined;

  return options
    .map((option) => {
      if (typeof option === 'string') return option;
      if (option && typeof option === 'object') {
        const value = (option as any).text ?? (option as any).label ?? (option as any).value;
        return value == null ? '' : String(value);
      }
      return option == null ? '' : String(option);
    })
    .filter((option) => option.trim().length > 0);
};

export const normalizeQuizQuestion = (
  question: LooseQuestion,
  index: number,
  quizId: string
): NormalizedQuizQuestion => {
  const text = String(
    question.text ?? question.question ?? question.prompt ?? question.title ?? ''
  ).trim();
  const fallbackId = `${quizId || 'quiz'}-q-${index}-${text.slice(0, 24) || 'item'}`;
  const id = String(question.id || fallbackId);
  const points = Number.isFinite(Number(question.points)) ? Number(question.points) : 10;

  return {
    id,
    text,
    type: normalizeQuestionType(question.type),
    options: normalizeOptions(question.options),
    correctAnswer: question.correctAnswer,
    points,
    explanation: question.explanation,
  };
};

export const normalizeQuiz = (quiz: any): NormalizedQuiz | null => {
  if (!quiz) return null;

  const id = String(quiz.id || quiz.quizId || quiz.postId || '');
  if (!id) return null;

  const questions = Array.isArray(quiz.questions)
    ? quiz.questions.map((question: LooseQuestion, index: number) =>
        normalizeQuizQuestion(question, index, id)
      )
    : [];

  const totalPoints = Number.isFinite(Number(quiz.totalPoints))
    ? Number(quiz.totalPoints)
    : questions.reduce((sum: number, question: NormalizedQuizQuestion) => sum + question.points, 0);

  return {
    ...quiz,
    id,
    title: String(quiz.title || 'Quiz'),
    description: quiz.description || quiz.content || '',
    questions,
    timeLimit: quiz.timeLimit ?? null,
    passingScore: Number.isFinite(Number(quiz.passingScore)) ? Number(quiz.passingScore) : 70,
    totalPoints,
    shuffleQuestions: !!quiz.shuffleQuestions,
  };
};
