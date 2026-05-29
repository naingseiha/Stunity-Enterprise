/**
 * Mock Feynman Bounties — prototype data for the XP-staked Q&A feature.
 *
 * Replace with a real backend service once Bounty Prisma model + XP-escrow
 * service ship. Bounties surface in the feed every 8 POSTs (less frequent
 * than Recall Cards to avoid feed fatigue — a bounty is a higher-commitment
 * interaction).
 */

import type { FeedItem, FeynmanBounty } from '@/types';

const SAMPLE_BOUNTIES: FeynmanBounty[] = [
  {
    id: 'bounty-physics-1',
    asker: {
      id: 'user-dara',
      name: 'Dara',
      gradeLabel: 'Grade 11',
    },
    subject: 'Physics · Density',
    subjectColor: '#4F46E5',
    questionText:
      "Why does ice float? My teacher said it's about density but I don't get how water can be denser as a liquid than as a solid. Aren't solids supposed to be denser?",
    attachmentName: 'textbook_pg42.jpg',
    bountyXp: 250,
    hoursLeft: 2,
    tutorsWorking: 7,
    answersCount: 3,
    topTutor: { id: 'user-sophea', name: 'Sophea', tier: 'gold' },
    createdAt: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
  },
  {
    id: 'bounty-math-1',
    asker: {
      id: 'user-rotha',
      name: 'Rotha',
      gradeLabel: 'Grade 12',
    },
    subject: 'Mathematics · Calculus',
    subjectColor: '#0284C7',
    questionText:
      "I can use L'Hôpital's rule but I don't intuitively understand WHY it works. Can someone explain the geometry of why two functions' derivatives at a point tell you the limit of their ratio?",
    bountyXp: 400,
    hoursLeft: 5,
    tutorsWorking: 4,
    answersCount: 1,
    topTutor: { id: 'user-piseth', name: 'Piseth', tier: 'silver' },
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'bounty-bio-1',
    asker: {
      id: 'user-srey',
      name: 'Srey',
      gradeLabel: 'Grade 10',
    },
    subject: 'Biology · Genetics',
    subjectColor: '#16A34A',
    questionText:
      'If a mother is type O and a father is type AB, what blood types could their children have? I keep getting confused about which alleles are dominant.',
    bountyXp: 150,
    hoursLeft: 8,
    tutorsWorking: 11,
    answersCount: 5,
    topTutor: { id: 'user-thida', name: 'Thida', tier: 'bronze' },
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
];

export function getMockFeynmanBounties(): FeynmanBounty[] {
  return SAMPLE_BOUNTIES;
}

/**
 * Interleave FEYNMAN_BOUNTY slots into the feed every `intervalPosts`
 * POST items. Non-POST items pass through untouched and don't advance the
 * counter — we only count "real posts" toward the next bounty.
 */
export function injectFeynmanBounties(
  items: FeedItem[],
  bounties: FeynmanBounty[],
  intervalPosts: number = 8,
): FeedItem[] {
  if (!bounties.length || !items.length) return items;

  const result: FeedItem[] = [];
  let bountyIdx = 0;
  let postsSinceLast = 0;
  // Offset by 3 posts so bounties don't appear right next to recall cards.
  let postsSeen = 0;

  for (const item of items) {
    result.push(item);
    if (item.type !== 'POST') continue;

    postsSeen += 1;
    postsSinceLast += 1;

    if (
      postsSeen >= 3 &&
      postsSinceLast >= intervalPosts &&
      bountyIdx < bounties.length
    ) {
      result.push({ type: 'FEYNMAN_BOUNTY', data: bounties[bountyIdx] });
      bountyIdx += 1;
      postsSinceLast = 0;
    }
  }

  return result;
}
