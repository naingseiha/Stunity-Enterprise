/**
 * Reel DTO author passthrough — every card type must surface its source author
 * so the mobile reel can deep-link the avatar/@username to that user's profile.
 *
 * Regression guard for the bug where Quiz / TF / Cloze / Recall cards shipped
 * no author in their payload, so the reel fell back to a non-clickable
 * "@stunity" placeholder (FOCUS_REEL/Post/Bounty already carried creator/
 * author/asker). The author is the underlying quiz question's post author.
 */
import { toQuizDto, toTfDto, toClozeDto, toRecallDto } from './reelsRanker';

const author = {
  id: 'u-teacher-1',
  firstName: 'Albert',
  lastName: 'Einstein',
  profilePictureUrl: 'https://cdn/x.png',
  isVerified: true,
};

const quizRow = (post: any) => ({
  id: 'q1',
  question: 'Which word means…',
  options: ['Temporary', 'Fragile', 'Unstable', 'Sustainable'],
  correctAnswer: 3,
  explanation: 'def',
  points: 10,
  createdAt: new Date('2026-06-04T00:00:00Z'),
  postId: post?.id ?? null,
  post,
});

describe('reel DTO author passthrough', () => {
  it('toQuizDto carries the post author', () => {
    expect(toQuizDto(quizRow({ id: 'p1', author }), 'viewer').payload).toMatchObject({
      author: { id: 'u-teacher-1', lastName: 'Einstein' },
    });
  });

  it('toTfDto carries the post author', () => {
    expect((toTfDto(quizRow({ id: 'p1', author })).payload as any).author).toEqual(author);
  });

  it('toClozeDto carries the post author', () => {
    expect((toClozeDto(quizRow({ id: 'p1', author })).payload as any).author).toEqual(author);
  });

  it('toRecallDto carries the nested question.post author', () => {
    const card = {
      id: 'r1',
      subject: 'english',
      createdAt: new Date('2026-06-04T00:00:00Z'),
      question: {
        id: 'q1',
        postId: 'p1',
        question: 'Which word…',
        options: ['a', 'b'],
        correctAnswer: 0,
        explanation: 'x',
        post: { author },
      },
    };
    expect((toRecallDto(card).payload as any).author).toEqual(author);
  });

  it('degrades to null author when the question has no post (no crash, no placeholder id)', () => {
    expect((toQuizDto(quizRow(null), 'viewer').payload as any).author).toBeNull();
    expect((toRecallDto({
      id: 'r2',
      subject: 's',
      createdAt: new Date('2026-06-04T00:00:00Z'),
      question: { id: 'q2', postId: null, question: 'q', options: [], correctAnswer: 0 },
    }).payload as any).author).toBeNull();
  });
});
