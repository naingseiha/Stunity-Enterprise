/**
 * WI1 + WI2 — server-side poll/quiz limit enforcement.
 * The server is authoritative; these guard against over-cap / malformed payloads
 * regardless of what the client sends.
 */
import { createPostSchema } from './post.validator';
import {
  POLL_MAX_OPTIONS,
  POLL_OPTION_MAX_LEN,
  QUIZ_MAX_OPTIONS,
  QUIZ_OPTION_MAX_LEN,
} from '../constants/limits';

const basePoll = (options: string[]) => ({
  content: 'Which one?',
  postType: 'POLL' as const,
  pollOptions: options,
});

const baseQuiz = (questions: any[]) => ({
  content: 'Quiz time',
  postType: 'QUIZ' as const,
  quizData: { questions },
});

describe('poll option limits (WI1)', () => {
  it('accepts a poll at the max option count', () => {
    const opts = Array.from({ length: POLL_MAX_OPTIONS }, (_, i) => `Option ${i + 1}`);
    expect(createPostSchema.safeParse(basePoll(opts)).success).toBe(true);
  });

  it('rejects more than the max options', () => {
    const opts = Array.from({ length: POLL_MAX_OPTIONS + 1 }, (_, i) => `Option ${i + 1}`);
    expect(createPostSchema.safeParse(basePoll(opts)).success).toBe(false);
  });

  it('rejects fewer than 2 options', () => {
    expect(createPostSchema.safeParse(basePoll(['Only one'])).success).toBe(false);
  });

  it('rejects an option longer than the char limit', () => {
    const opts = ['ok', 'x'.repeat(POLL_OPTION_MAX_LEN + 1)];
    expect(createPostSchema.safeParse(basePoll(opts)).success).toBe(false);
  });

  it('rejects an empty option string', () => {
    expect(createPostSchema.safeParse(basePoll(['good', ''])).success).toBe(false);
  });
});

describe('quiz question limits (WI2)', () => {
  const goodQuestion = {
    question: 'Capital of France?',
    options: ['Paris', 'London', 'Berlin'],
    correctAnswer: 0,
  };

  it('accepts a valid quiz', () => {
    expect(createPostSchema.safeParse(baseQuiz([goodQuestion])).success).toBe(true);
  });

  it('accepts a question at the max option count', () => {
    const options = Array.from({ length: QUIZ_MAX_OPTIONS }, (_, i) => `Opt ${i + 1}`);
    expect(createPostSchema.safeParse(baseQuiz([{ ...goodQuestion, options, correctAnswer: 0 }])).success).toBe(true);
  });

  it('rejects more than the max options', () => {
    const options = Array.from({ length: QUIZ_MAX_OPTIONS + 1 }, (_, i) => `Opt ${i + 1}`);
    expect(createPostSchema.safeParse(baseQuiz([{ ...goodQuestion, options }])).success).toBe(false);
  });

  it('rejects fewer than 2 options', () => {
    expect(createPostSchema.safeParse(baseQuiz([{ ...goodQuestion, options: ['Paris'] }])).success).toBe(false);
  });

  it('rejects an option longer than the char limit', () => {
    const options = ['ok', 'x'.repeat(QUIZ_OPTION_MAX_LEN + 1)];
    expect(createPostSchema.safeParse(baseQuiz([{ ...goodQuestion, options }])).success).toBe(false);
  });

  it('rejects a correctAnswer that is out of range', () => {
    expect(createPostSchema.safeParse(baseQuiz([{ ...goodQuestion, correctAnswer: 5 }])).success).toBe(false);
  });

  it('rejects an empty questions array', () => {
    expect(createPostSchema.safeParse(baseQuiz([])).success).toBe(false);
  });

  it('rejects a question with empty text', () => {
    expect(createPostSchema.safeParse(baseQuiz([{ ...goodQuestion, question: '' }])).success).toBe(false);
  });
});
