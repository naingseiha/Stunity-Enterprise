/**
 * prepareQuizQuestions — the Json↔row unification planner.
 *
 * Covers: row-ability per question type, id minting vs preservation,
 * edit-path adoption of existing row ids, collision guards, topic filtering,
 * and grading compatibility of the canonical Json.
 */

import {
  prepareQuizQuestions,
  resolveCorrectIndex,
  TF_SENTINEL_OPTIONS,
} from './quizQuestionRows';
import { normalizeQuizQuestionsForGrading } from './quizQuestions';
import { gradeQuizSubmission } from './quizGrading';

const mcQuestion = (over: Record<string, unknown> = {}) => ({
  id: '1751443200000',
  text: 'Capital of France?',
  type: 'MULTIPLE_CHOICE',
  options: ['Paris', 'London', 'Berlin'],
  correctAnswer: '0',
  points: 2,
  ...over,
});

describe('resolveCorrectIndex', () => {
  const options = ['Paris', 'London', 'Berlin'];

  it('resolves int, numeric string, letter, and option text', () => {
    expect(resolveCorrectIndex(1, options)).toBe(1);
    expect(resolveCorrectIndex('2', options)).toBe(2);
    expect(resolveCorrectIndex('B', options)).toBe(1);
    expect(resolveCorrectIndex('london', options)).toBe(1);
  });

  it('rejects out-of-range and unknown answers', () => {
    expect(resolveCorrectIndex(5, options)).toBeNull();
    expect(resolveCorrectIndex('9', options)).toBeNull();
    expect(resolveCorrectIndex('Madrid', options)).toBeNull();
    expect(resolveCorrectIndex('', options)).toBeNull();
  });
});

describe('prepareQuizQuestions — create path', () => {
  it('mints server row ids for MC questions and mirrors them in the Json', () => {
    const { questionsJson, rows } = prepareQuizQuestions([mcQuestion()]);
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('create');
    expect(rows[0].id).toBe(questionsJson[0].id);
    // Create path never trusts client ids (Date.now collisions across posts).
    expect(rows[0].id).not.toBe('1751443200000');
    expect(rows[0].correctAnswer).toBe(0);
    expect(rows[0].position).toBe(0);
  });

  it('maps TRUE_FALSE onto the reels TF sentinel with 0/1 answers', () => {
    const { rows } = prepareQuizQuestions([
      { id: '2', text: 'Is water wet?', type: 'TRUE_FALSE', options: [], correctAnswer: 'true', points: 1 },
      { id: '3', text: 'Is fire cold?', type: 'TRUE_FALSE', options: [], correctAnswer: 'false', points: 1 },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].options).toEqual(TF_SENTINEL_OPTIONS);
    expect(rows[0].correctAnswer).toBe(0);
    expect(rows[1].correctAnswer).toBe(1);
  });

  it('keeps non-row-able types in the Json without a row', () => {
    const { questionsJson, rows } = prepareQuizQuestions([
      { id: 'sa1', text: 'Name the process', type: 'SHORT_ANSWER', correctAnswer: 'osmosis', points: 1 },
      { id: 'm1', text: 'Match', type: 'MATCHING', options: ['a:::1'], correctAnswer: '', points: 1 },
      mcQuestion(),
    ]);
    expect(rows).toHaveLength(1);
    expect(questionsJson).toHaveLength(3);
    expect(questionsJson[0].id).toBe('sa1');
    expect(questionsJson[0].type).toBe('SHORT_ANSWER');
  });

  it('skips a row for an MC question whose correct answer cannot be resolved', () => {
    const { questionsJson, rows } = prepareQuizQuestions([
      mcQuestion({ correctAnswer: 'Madrid' }),
    ]);
    expect(rows).toHaveLength(0);
    expect(questionsJson).toHaveLength(1);
  });

  it('drops topicIds not in the valid set and keeps valid ones', () => {
    const { rows } = prepareQuizQuestions(
      [mcQuestion({ topicId: 'topic-good' }), mcQuestion({ id: 'x2', topicId: 'topic-bad' })],
      { validTopicIds: new Set(['topic-good']) },
    );
    expect(rows[0].topicId).toBe('topic-good');
    expect(rows[1].topicId).toBeNull();
  });
});

describe('prepareQuizQuestions — edit path', () => {
  it('updates in place when the incoming id is an existing row on this post', () => {
    const { rows } = prepareQuizQuestions([mcQuestion({ id: 'row-abc' })], {
      existingRowIds: new Set(['row-abc']),
      preserveIncomingIds: true,
    });
    expect(rows[0].action).toBe('update');
    expect(rows[0].id).toBe('row-abc');
  });

  it('adopts a safe legacy Json id as the new row id (attempt history keeps matching)', () => {
    const { questionsJson, rows } = prepareQuizQuestions([mcQuestion()], {
      existingRowIds: new Set(),
      preserveIncomingIds: true,
    });
    expect(rows[0].action).toBe('create');
    expect(rows[0].id).toBe('1751443200000');
    expect(questionsJson[0].id).toBe('1751443200000');
  });

  it('mints a fresh id when the incoming id belongs to another post', () => {
    const { rows } = prepareQuizQuestions([mcQuestion({ id: 'stolen' })], {
      existingRowIds: new Set(),
      takenRowIds: new Set(['stolen']),
      preserveIncomingIds: true,
    });
    expect(rows[0].id).not.toBe('stolen');
  });

  it('never assigns the same id twice even with duplicate incoming ids', () => {
    const { rows } = prepareQuizQuestions(
      [mcQuestion({ id: 'dup' }), mcQuestion({ id: 'dup' })],
      { existingRowIds: new Set(['dup']), preserveIncomingIds: true },
    );
    expect(rows[0].id).toBe('dup');
    expect(rows[1].id).not.toBe('dup');
    expect(rows[0].action).toBe('update');
    expect(rows[1].action).toBe('create');
  });
});

describe('canonical Json ↔ grading compatibility', () => {
  it('grades a submission against the canonical Json with the shared ids', () => {
    const { questionsJson } = prepareQuizQuestions([
      mcQuestion(),
      { id: 'tf', text: 'True?', type: 'TRUE_FALSE', options: [], correctAnswer: 'true', points: 1 },
      { id: 'sa', text: 'Answer?', type: 'SHORT_ANSWER', correctAnswer: 'Osmosis', points: 1 },
    ]);

    const graded = gradeQuizSubmission(
      questionsJson,
      'quiz-1',
      // Clients answer with the ids from the served payload — TF/MC ids are
      // server-minted on create, SHORT_ANSWER keeps its Json id.
      [
        { questionId: questionsJson[0].id, answer: 'Paris' },
        { questionId: questionsJson[1].id, answer: 'true' },
        { questionId: questionsJson[2].id, answer: ' osmosis ' },
      ],
      70,
    );

    expect(graded.results.every((r) => r.correct)).toBe(true);
    expect(graded.totalPoints).toBe(4);
    expect(graded.passed).toBe(true);
  });

  it('normalizes cleanly through normalizeQuizQuestionsForGrading', () => {
    const { questionsJson } = prepareQuizQuestions([mcQuestion()]);
    const normalized = normalizeQuizQuestionsForGrading(questionsJson, 'quiz-1');
    expect(normalized[0].id).toBe(questionsJson[0].id);
    expect(normalized[0].type).toBe('MULTIPLE_CHOICE');
    expect(normalized[0].points).toBe(2);
  });
});
