/**
 * Canonical quiz-question preparation — the single write-path bridge between
 * the authoring Json (`Quiz.questions`) and the `quiz_questions` table.
 *
 * Historically QUIZ posts stored questions ONLY as Json, while QuizQuestion
 * rows were created by unrelated paths (reels knowledge cards, admin seed
 * scripts) with ids that never matched the Json ids. Everything keyed on
 * QuizQuestion.id — RecallCard FKs, reels, the mastery tree — therefore
 * silently missed questions authored through the normal create-post flow.
 *
 * This module makes the Json and the rows share ONE id per question:
 *   - Json stays the grading/authoring source of truth (all 6 types).
 *   - A row is written for every question the table can represent
 *     (MULTIPLE_CHOICE and TRUE_FALSE — the same shapes reels serve), and
 *     the Json question id is set to the row id so grading results FK-match
 *     RecallCard.questionId.
 *   - Non-row-able types (short answer / fill-in-blank / ordering / matching)
 *     keep a stable Json id but get no row — they can't render as recall
 *     cards anyway (RecallCard → QuizQuestion is options-index based).
 *
 * Pure module: no Prisma imports, so the id-planning logic is unit-testable.
 */

import { randomUUID } from 'crypto';
import { getQuestionPoints } from './quizQuestions';

/** Mirror of reelsRanker's TF sentinel — options exactly ['TRUE','FALSE']. */
export const TF_SENTINEL_OPTIONS = ['TRUE', 'FALSE'];

export const QUESTION_TYPES = [
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'FILL_IN_BLANK',
  'ORDERING',
  'MATCHING',
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

const VALID_TYPES = new Set<string>(QUESTION_TYPES);

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

type RawQuestion = Record<string, unknown>;

/** Json shape stored on Quiz.questions (superset-tolerant on read via normalizeQuizQuestionsForGrading). */
export type CanonicalQuizQuestion = {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  correctAnswer: unknown;
  points: number;
  explanation: string | null;
  topicId: string | null;
};

export type QuizQuestionRowPlan = {
  /** Row id — always equals the Json question id for this question. */
  id: string;
  /** 'create' = new row; 'update' = row already exists on this post. */
  action: 'create' | 'update';
  question: string;
  options: string[];
  correctAnswer: number;
  points: number;
  position: number;
  explanation: string | null;
  topicId: string | null;
};

export type PreparedQuizQuestions = {
  questionsJson: CanonicalQuizQuestion[];
  rows: QuizQuestionRowPlan[];
};

export const normalizeQuestionType = (raw: unknown): QuestionType => {
  const t = String(raw ?? 'MULTIPLE_CHOICE').toUpperCase();
  return (VALID_TYPES.has(t) ? t : 'MULTIPLE_CHOICE') as QuestionType;
};

export const questionTextOf = (q: RawQuestion): string =>
  String(q.text ?? q.question ?? q.prompt ?? q.title ?? '').trim();

/**
 * Resolve an authoring-time correctAnswer (int index, numeric string, "A"/"B"
 * letter, or the option text itself) to an option index. Mirrors the tolerant
 * grading logic in quizGrading.ts so anything gradable is also row-able.
 */
export const resolveCorrectIndex = (answer: unknown, options: string[]): number | null => {
  if (typeof answer === 'number' && Number.isInteger(answer) && options[answer] !== undefined) {
    return answer;
  }
  const raw = String(answer ?? '').trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const index = Number(raw);
    return options[index] !== undefined ? index : null;
  }
  const letterMatch = raw.match(/^([a-f])\s*[:.)-]?\s*/i);
  if (letterMatch && raw.length <= 3) {
    const index = OPTION_LETTERS.indexOf(letterMatch[1].toUpperCase());
    if (options[index] !== undefined) return index;
  }
  const normalized = raw.replace(/\s+/g, ' ').toLowerCase();
  const byText = options.findIndex((o) => o.trim().replace(/\s+/g, ' ').toLowerCase() === normalized);
  return byText >= 0 ? byText : null;
};

const isTruthyAnswer = (answer: unknown): boolean =>
  String(answer ?? '').trim().toLowerCase() === 'true';

const cleanOptions = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.map((o) => String(o ?? '').trim()).filter(Boolean) : [];

/** Ids we're willing to adopt as row PKs when preserving legacy Json ids. */
const isSafeRowId = (id: unknown): id is string =>
  typeof id === 'string' && id.length > 0 && id.length <= 64 && /^[A-Za-z0-9_-]+$/.test(id);

export type PrepareOptions = {
  /**
   * Topic ids confirmed to exist — unknown ids are dropped to null so a stale
   * client can't fail the whole post create on a Topic FK.
   */
  validTopicIds?: Set<string>;
  /**
   * Row ids that already exist on THIS post (edit path). A question whose id
   * matches keeps its id and becomes an 'update' plan, so RecallCards pointing
   * at it survive the edit.
   */
  existingRowIds?: Set<string>;
  /**
   * Row ids taken by OTHER posts (collision guard when adopting client ids).
   * Ignored for ids in existingRowIds.
   */
  takenRowIds?: Set<string>;
  /**
   * Edit path: adopt a safe client-provided id as the row id so stored
   * QuizAttempt.answers keep matching after legacy quizzes get their first
   * rows. Create path leaves this off and always mints server ids.
   */
  preserveIncomingIds?: boolean;
};

export function prepareQuizQuestions(
  rawQuestions: unknown,
  opts: PrepareOptions = {},
): PreparedQuizQuestions {
  const raws: RawQuestion[] = Array.isArray(rawQuestions)
    ? rawQuestions.filter((q): q is RawQuestion => !!q && typeof q === 'object')
    : [];

  const questionsJson: CanonicalQuizQuestion[] = [];
  const rows: QuizQuestionRowPlan[] = [];
  const usedIds = new Set<string>();

  raws.forEach((q, index) => {
    const text = questionTextOf(q);
    const type = normalizeQuestionType(q.type);
    const points = getQuestionPoints(q);
    const explanation =
      typeof q.explanation === 'string' && q.explanation.trim() ? q.explanation.trim() : null;

    const rawTopicId = typeof q.topicId === 'string' && q.topicId.trim() ? q.topicId.trim() : null;
    const topicId =
      rawTopicId && (!opts.validTopicIds || opts.validTopicIds.has(rawTopicId)) ? rawTopicId : null;

    // Row-able shapes: what quiz_questions (Int correctAnswer + String[] options)
    // and the reels/recall surfaces can represent.
    let rowShape: { options: string[]; correctAnswer: number } | null = null;
    if (type === 'MULTIPLE_CHOICE') {
      const options = cleanOptions(q.options);
      const correctIndex = options.length >= 2 ? resolveCorrectIndex(q.correctAnswer, options) : null;
      if (correctIndex !== null) rowShape = { options, correctAnswer: correctIndex };
    } else if (type === 'TRUE_FALSE') {
      rowShape = {
        options: [...TF_SENTINEL_OPTIONS],
        correctAnswer: isTruthyAnswer(q.correctAnswer) ? 0 : 1,
      };
    }

    // Id planning. Row-backed questions must carry an id we control; others
    // just need a stable unique string for grading correlation.
    const incomingId = isSafeRowId(q.id) ? q.id : null;
    let id: string;
    let action: 'create' | 'update' = 'create';
    if (rowShape) {
      if (incomingId && opts.existingRowIds?.has(incomingId) && !usedIds.has(incomingId)) {
        id = incomingId;
        action = 'update';
      } else if (
        opts.preserveIncomingIds &&
        incomingId &&
        !usedIds.has(incomingId) &&
        !opts.takenRowIds?.has(incomingId)
      ) {
        id = incomingId;
      } else {
        id = randomUUID();
      }
    } else {
      id =
        incomingId && !usedIds.has(incomingId)
          ? incomingId
          : `q-${index}-${randomUUID().slice(0, 8)}`;
    }
    usedIds.add(id);

    questionsJson.push({
      id,
      text,
      type,
      options: rowShape && type === 'MULTIPLE_CHOICE' ? rowShape.options : cleanOptions(q.options),
      correctAnswer: q.correctAnswer ?? null,
      points,
      explanation,
      topicId,
    });

    if (rowShape) {
      rows.push({
        id,
        action,
        question: text,
        options: rowShape.options,
        correctAnswer: rowShape.correctAnswer,
        points,
        position: index,
        explanation,
        topicId,
      });
    }
  });

  return { questionsJson, rows };
}
