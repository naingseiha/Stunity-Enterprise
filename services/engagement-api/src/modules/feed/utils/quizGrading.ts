import {
  normalizeQuizQuestionsForGrading,
  resolveQuestionForAnswer,
  type GradingQuestion,
} from './quizQuestions';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const normalizeAnswerText = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const stripChoicePrefix = (value: string): string =>
  value.replace(/^[a-f]\s*[:.)-]\s*/i, '').trim();

const getChoiceIndex = (answer: unknown, options: unknown): number | null => {
  if (!Array.isArray(options)) return null;

  if (typeof answer === 'number' && Number.isInteger(answer) && options[answer] !== undefined) {
    return answer;
  }

  const raw = String(answer ?? '').trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const index = Number(raw);
    return options[index] !== undefined ? index : null;
  }

  const letterMatch = raw.match(/^([a-f])(?:\s*[:.)-]\s*(.*))?$/i);
  if (letterMatch) {
    const index = OPTION_LETTERS.indexOf(letterMatch[1].toUpperCase());
    if (options[index] !== undefined) return index;
  }

  const normalizedRaw = normalizeAnswerText(raw);
  const normalizedWithoutPrefix = normalizeAnswerText(stripChoicePrefix(raw));

  const optionIndex = options.findIndex((option) => {
    const normalizedOption = normalizeAnswerText(option);
    return normalizedOption === normalizedRaw || normalizedOption === normalizedWithoutPrefix;
  });

  return optionIndex >= 0 ? optionIndex : null;
};

const isMultipleChoiceCorrect = (
  userAnswer: unknown,
  correctAnswer: unknown,
  options: unknown,
): boolean => {
  const userChoiceIndex = getChoiceIndex(userAnswer, options);
  const correctChoiceIndex = getChoiceIndex(correctAnswer, options);

  if (userChoiceIndex !== null && correctChoiceIndex !== null) {
    return userChoiceIndex === correctChoiceIndex;
  }

  return normalizeAnswerText(userAnswer) === normalizeAnswerText(correctAnswer);
};

const gradeAnswer = (question: GradingQuestion, userAnswer: unknown): boolean => {
  switch (question.type) {
    case 'MULTIPLE_CHOICE':
      return isMultipleChoiceCorrect(userAnswer, question.correctAnswer, question.options);
    case 'TRUE_FALSE': {
      const userAnswerStr = String(userAnswer).toLowerCase();
      const correctAnswerStr = String(question.correctAnswer).toLowerCase();
      return userAnswerStr === correctAnswerStr;
    }
    case 'SHORT_ANSWER':
    case 'FILL_IN_BLANK': {
      const userAns = String(userAnswer ?? '').toLowerCase().trim();
      const correctAns = String(question.correctAnswer ?? '').toLowerCase().trim();
      return userAns === correctAns;
    }
    case 'ORDERING': {
      try {
        const userOrder = typeof userAnswer === 'string' ? JSON.parse(userAnswer) : userAnswer;
        const correctOrder = question.options;
        return (
          Array.isArray(userOrder) &&
          Array.isArray(correctOrder) &&
          JSON.stringify(userOrder) === JSON.stringify(correctOrder)
        );
      } catch {
        return false;
      }
    }
    case 'MATCHING': {
      try {
        const userMatches = typeof userAnswer === 'string' ? JSON.parse(userAnswer) : userAnswer;
        const correctMatches: Record<string, string> = {};
        if (Array.isArray(question.options)) {
          question.options.forEach((opt) => {
            const parts = opt.split(':::');
            if (parts.length === 2) correctMatches[parts[0]] = parts[1];
          });
        }
        if (!userMatches || typeof userMatches !== 'object') return false;
        const userKeys = Object.keys(userMatches);
        const correctKeys = Object.keys(correctMatches);
        if (userKeys.length !== correctKeys.length) return false;
        return userKeys.every((key) => userMatches[key] === correctMatches[key]);
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
};

export type GradedQuizAttempt = {
  score: number;
  passed: boolean;
  pointsEarned: number;
  totalPoints: number;
  results: Array<{
    questionId: string;
    correct: boolean;
    pointsEarned: number;
    userAnswer: unknown;
    correctAnswer: unknown;
  }>;
};

export const gradeQuizSubmission = (
  rawQuestions: unknown,
  quizId: string,
  answers: Array<{ questionId: string; answer: unknown }>,
  passingScore: number,
): GradedQuizAttempt => {
  const questions = normalizeQuizQuestionsForGrading(rawQuestions, quizId);
  const possiblePoints = questions.reduce((sum, q) => sum + q.points, 0);

  let pointsEarned = 0;
  const results = answers.map((userAnswer) => {
    const question = resolveQuestionForAnswer(questions, userAnswer.questionId);
    if (!question) {
      return {
        questionId: userAnswer.questionId,
        correct: false,
        pointsEarned: 0,
        userAnswer: userAnswer.answer,
        correctAnswer: null,
      };
    }

    const isCorrect = gradeAnswer(question, userAnswer.answer);
    const points = isCorrect ? question.points : 0;
    pointsEarned += points;

    return {
      questionId: userAnswer.questionId,
      correct: isCorrect,
      pointsEarned: points,
      userAnswer: userAnswer.answer,
      correctAnswer: question.correctAnswer,
    };
  });

  const score = possiblePoints > 0 ? Math.round((pointsEarned / possiblePoints) * 100) : 0;

  return {
    score,
    passed: score >= passingScore,
    pointsEarned,
    totalPoints: possiblePoints,
    results,
  };
};
