/**
 * Quiz payload validation — the shapes clients ACTUALLY send.
 *
 * QuizForm.tsx sends `text` + a string correctAnswer (and six question
 * types); the original WI2 schema only accepted `question` + an int index,
 * which 400'd every quiz created from the mobile app. These tests pin the
 * real authoring shapes so that regression can't come back.
 */

import { createPostSchema } from './post.validator';

const baseQuiz = (questions: any[]) => ({
  content: 'Quiz body',
  postType: 'QUIZ',
  quizData: { questions },
});

const valid = (questions: any[]) => createPostSchema.safeParse(baseQuiz(questions)).success;

describe('mobile QuizForm shapes', () => {
  it('accepts MC with `text` + string index correctAnswer', () => {
    expect(
      valid([{ id: '1751443200000', text: 'Capital?', type: 'MULTIPLE_CHOICE', options: ['Paris', 'London'], correctAnswer: '0', points: 1 }]),
    ).toBe(true);
  });

  it('accepts TRUE_FALSE with empty options and "true"/"false" answers', () => {
    expect(
      valid([{ id: '2', text: 'Is water wet?', type: 'TRUE_FALSE', options: [], correctAnswer: 'true', points: 1 }]),
    ).toBe(true);
  });

  it('accepts SHORT_ANSWER / FILL_IN_BLANK with a text answer', () => {
    expect(valid([{ id: '3', text: 'Name it', type: 'SHORT_ANSWER', correctAnswer: 'osmosis', points: 1 }])).toBe(true);
    expect(valid([{ id: '4', text: 'The ___ cycle', type: 'FILL_IN_BLANK', correctAnswer: 'water', points: 1 }])).toBe(true);
  });

  it('accepts ORDERING (options are the correct order) and MATCHING pairs', () => {
    expect(valid([{ id: '5', text: 'Order these', type: 'ORDERING', options: ['first', 'second'], correctAnswer: '', points: 1 }])).toBe(true);
    expect(valid([{ id: '6', text: 'Match these', type: 'MATCHING', options: ['H2O:::Water'], correctAnswer: '', points: 1 }])).toBe(true);
  });

  it('accepts an optional per-question topicId', () => {
    expect(
      valid([{ id: '7', text: 'Solve x+1=2', type: 'MULTIPLE_CHOICE', options: ['1', '2'], correctAnswer: '0', points: 1, topicId: 'cmc123topic' }]),
    ).toBe(true);
  });

  it('still accepts the legacy `question` + int index shape', () => {
    expect(valid([{ question: 'Capital?', options: ['Paris', 'London'], correctAnswer: 0 }])).toBe(true);
  });
});

describe('rejections', () => {
  it('rejects a question with no text at all', () => {
    expect(valid([{ type: 'MULTIPLE_CHOICE', options: ['a', 'b'], correctAnswer: 0 }])).toBe(false);
  });

  it('rejects MC whose correctAnswer resolves to nothing', () => {
    expect(valid([{ text: 'Q', type: 'MULTIPLE_CHOICE', options: ['a', 'b'], correctAnswer: '9', points: 1 }])).toBe(false);
    expect(valid([{ text: 'Q', type: 'MULTIPLE_CHOICE', options: ['a', 'b'], correctAnswer: 'nope', points: 1 }])).toBe(false);
  });

  it('rejects MC with fewer than 2 non-empty options (untouched QuizForm defaults)', () => {
    expect(valid([{ text: 'Q', type: 'MULTIPLE_CHOICE', options: ['', ''], correctAnswer: '0', points: 1 }])).toBe(false);
  });

  it('rejects TRUE_FALSE with a non-boolean answer', () => {
    expect(valid([{ text: 'Q', type: 'TRUE_FALSE', correctAnswer: 'maybe', points: 1 }])).toBe(false);
  });

  it('rejects SHORT_ANSWER with an empty answer', () => {
    expect(valid([{ text: 'Q', type: 'SHORT_ANSWER', correctAnswer: '', points: 1 }])).toBe(false);
  });

  it('rejects MATCHING without a single left:::right pair', () => {
    expect(valid([{ text: 'Q', type: 'MATCHING', options: ['broken-pair'], correctAnswer: '', points: 1 }])).toBe(false);
  });

  it('keeps the WI2 option cap', () => {
    const options = ['a', 'b', 'c', 'd', 'e', 'f', 'g']; // 7 > QUIZ_MAX_OPTIONS
    expect(valid([{ text: 'Q', type: 'MULTIPLE_CHOICE', options, correctAnswer: '0', points: 1 }])).toBe(false);
  });
});
