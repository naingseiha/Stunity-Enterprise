/**
 * Normalize legacy quiz question JSON (matches mobile normalizeQuizQuestion).
 * Many quizzes store { question, options, correctAnswer } without id/type.
 */

const VALID_TYPES = new Set([
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'FILL_IN_BLANK',
  'ORDERING',
  'MATCHING',
]);

export type GradingQuestion = {
  id: string;
  text: string;
  type: string;
  options?: string[];
  correctAnswer: unknown;
  points: number;
};

export const getQuestionPoints = (question: { points?: unknown }): number => {
  const points = Number(question?.points);
  return Number.isFinite(points) && points > 0 ? points : 1;
};

export const normalizeQuizQuestionsForGrading = (
  rawQuestions: unknown,
  quizId: string,
): GradingQuestion[] => {
  if (!Array.isArray(rawQuestions)) return [];

  return rawQuestions.map((raw, index) => {
    const q = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const text = String(q.text ?? q.question ?? q.prompt ?? q.title ?? '').trim();
    const fallbackId = `${quizId || 'quiz'}-q-${index}-${text.slice(0, 24) || 'item'}`;
    const id = String(q.id || fallbackId);
    const typeRaw = String(q.type || 'MULTIPLE_CHOICE').toUpperCase();

    return {
      id,
      text,
      type: VALID_TYPES.has(typeRaw) ? typeRaw : 'MULTIPLE_CHOICE',
      options: Array.isArray(q.options) ? q.options.map((o) => String(o)) : undefined,
      correctAnswer: q.correctAnswer,
      points: getQuestionPoints(q),
    };
  });
};

/** Resolve a submitted answer to its question (id match, then index embedded in client id). */
export const resolveQuestionForAnswer = (
  questions: GradingQuestion[],
  questionId: string,
): GradingQuestion | undefined => {
  if (!questionId) return undefined;

  const byId = questions.find((q) => q.id === questionId);
  if (byId) return byId;

  const indexMatch = String(questionId).match(/-q-(\d+)-/);
  if (indexMatch) {
    const index = Number(indexMatch[1]);
    if (Number.isInteger(index) && index >= 0 && index < questions.length) {
      return questions[index];
    }
  }

  return undefined;
};
