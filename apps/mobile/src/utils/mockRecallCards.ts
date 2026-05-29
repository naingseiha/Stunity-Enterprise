/**
 * Mock Recall Cards — prototype data for the "Smart Scroll" feature.
 *
 * Replace with a real service backed by an SM-2 / FSRS scheduler once the
 * Prisma `RecallCard` model and review-queue endpoint are in place.
 */

import type { FeedItem, RecallCard } from '@/types';

const SAMPLE_CARDS: RecallCard[] = [
  {
    id: 'recall-bio-1',
    questionId: 'q-bio-mito-1',
    subject: 'biology',
    subjectLabel: 'Biology · Cell Structure',
    questionText: 'The _______ are the powerhouse of the cell.',
    answerText: 'Mitochondria',
    hint: 'Greek: "mitos" (thread) + "chondros" (granule)',
    daysSinceLastSeen: 3,
    recallStrength: 0.42,
    classmatesReviewingCount: 12,
    xpReward: 5,
    protectsStreak: true,
    courseTitle: 'Grade 11 Biology',
  },
  {
    id: 'recall-math-1',
    questionId: 'q-math-disc-1',
    subject: 'mathematics',
    subjectLabel: 'Mathematics · Quadratics',
    questionText: 'What is the discriminant of  x² − 5x + 6 = 0 ?',
    answerText: '1',
    hint: 'b² − 4ac',
    daysSinceLastSeen: 6,
    recallStrength: 0.22,
    classmatesReviewingCount: 8,
    xpReward: 8,
    protectsStreak: true,
    courseTitle: 'Algebra II',
  },
  {
    id: 'recall-hist-1',
    questionId: 'q-hist-angkor-1',
    subject: 'history',
    subjectLabel: 'History · Khmer Empire',
    questionText: 'Angkor Wat was built during the reign of which king?',
    answerText: 'Suryavarman II',
    daysSinceLastSeen: 2,
    recallStrength: 0.58,
    classmatesReviewingCount: 14,
    xpReward: 6,
    protectsStreak: false,
    courseTitle: 'Khmer Civilization',
  },
  {
    id: 'recall-chem-1',
    questionId: 'q-chem-lechat-1',
    subject: 'chemistry',
    subjectLabel: 'Chemistry · Equilibrium',
    questionText:
      "Le Chatelier's principle — if pressure rises, equilibrium shifts toward...",
    answerText: 'fewer moles of gas',
    daysSinceLastSeen: 1,
    recallStrength: 0.78,
    classmatesReviewingCount: 19,
    xpReward: 4,
    protectsStreak: false,
    courseTitle: 'Grade 12 Chemistry',
  },
  {
    id: 'recall-eng-1',
    questionId: 'q-eng-ephemeral-1',
    subject: 'english',
    subjectLabel: 'English · Vocabulary',
    questionText: '"Ephemeral" most nearly means:',
    answerText: 'Lasting for a very short time',
    daysSinceLastSeen: 4,
    recallStrength: 0.36,
    classmatesReviewingCount: 6,
    xpReward: 5,
    protectsStreak: true,
    courseTitle: 'IELTS Prep',
  },
];

export function getMockRecallCards(): RecallCard[] {
  return SAMPLE_CARDS;
}

/**
 * Interleave RECALL_CARD slots into a normalized feed every `intervalPosts`
 * POST items. Non-POST items (carousels) are passed through untouched and do
 * not advance the counter — we only count "real posts" toward the next recall.
 */
export function injectRecallCards(
  items: FeedItem[],
  cards: RecallCard[],
  intervalPosts: number = 5,
): FeedItem[] {
  if (!cards.length || !items.length) return items;

  const result: FeedItem[] = [];
  let cardIdx = 0;
  let postsSinceLastCard = 0;

  for (const item of items) {
    result.push(item);
    if (item.type !== 'POST') continue;

    postsSinceLastCard += 1;
    if (postsSinceLastCard >= intervalPosts && cardIdx < cards.length) {
      result.push({ type: 'RECALL_CARD', data: cards[cardIdx] });
      cardIdx += 1;
      postsSinceLastCard = 0;
    }
  }

  return result;
}
