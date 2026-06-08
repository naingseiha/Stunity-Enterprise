import { pickSkillGapCard, shortSubjectName, SKILL_GAP_MIN_DAYS } from './skillGapNudge';
import type { RecallCard } from '@/types';

function card(overrides: Partial<RecallCard> = {}): RecallCard {
  return {
    id: 'c1',
    questionId: 'q1',
    subject: 'english',
    subjectLabel: 'English · Tenses',
    questionText: 'q',
    answerText: 'a',
    daysSinceLastSeen: 3,
    recallStrength: 0.4,
    classmatesReviewingCount: 0,
    xpReward: 5,
    protectsStreak: true,
    ...overrides,
  } as RecallCard;
}

describe('pickSkillGapCard', () => {
  it('returns null for empty / nullish input', () => {
    expect(pickSkillGapCard([])).toBeNull();
    expect(pickSkillGapCard(null)).toBeNull();
    expect(pickSkillGapCard(undefined)).toBeNull();
  });

  it('returns null when no card has a real gap (too recent)', () => {
    const fresh = card({ daysSinceLastSeen: SKILL_GAP_MIN_DAYS - 1, recallStrength: 0.2 });
    expect(pickSkillGapCard([fresh])).toBeNull();
  });

  it('excludes cards whose memory is still strong', () => {
    const strong = card({ daysSinceLastSeen: 10, recallStrength: 0.9 });
    expect(pickSkillGapCard([strong])).toBeNull();
  });

  it('picks the most-neglected weak card', () => {
    const a = card({ id: 'a', daysSinceLastSeen: 3, recallStrength: 0.3 });
    const b = card({ id: 'b', daysSinceLastSeen: 9, recallStrength: 0.5, subject: 'mathematics' });
    const picked = pickSkillGapCard([a, b]);
    expect(picked?.card.id).toBe('b');
    expect(picked?.daysSince).toBe(9);
    expect(picked?.subject).toBe('mathematics');
  });

  it('breaks day ties by weaker memory first', () => {
    const a = card({ id: 'a', daysSinceLastSeen: 5, recallStrength: 0.5 });
    const b = card({ id: 'b', daysSinceLastSeen: 5, recallStrength: 0.2 });
    expect(pickSkillGapCard([a, b])?.card.id).toBe('b');
  });
});

describe('shortSubjectName', () => {
  it('takes the part before the dot separator', () => {
    expect(shortSubjectName(card({ subjectLabel: 'Biology · Cell Structure' }))).toBe('Biology');
  });
  it('falls back to the whole label when there is no separator', () => {
    expect(shortSubjectName(card({ subjectLabel: 'Physics' }))).toBe('Physics');
  });
});
