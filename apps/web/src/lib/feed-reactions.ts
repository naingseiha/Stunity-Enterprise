import type { LucideIcon } from 'lucide-react';
import { Heart, Lightbulb, Sparkles, Rocket } from 'lucide-react';

export type ReactionType = 'LIKE' | 'INSIGHTFUL' | 'CELEBRATE' | 'SMART_TAKE';

export const REACTION_TYPES: ReactionType[] = ['LIKE', 'INSIGHTFUL', 'CELEBRATE', 'SMART_TAKE'];

export const REACTIONS: Array<{
  type: ReactionType;
  icon: LucideIcon;
  color: string;
  bg: string;
  labelKey: string;
}> = [
  { type: 'LIKE', icon: Heart, color: '#EF4444', bg: 'bg-rose-50', labelKey: 'reactions.like' },
  { type: 'INSIGHTFUL', icon: Lightbulb, color: '#F59E0B', bg: 'bg-amber-50', labelKey: 'reactions.insightful' },
  { type: 'CELEBRATE', icon: Sparkles, color: '#8B5CF6', bg: 'bg-violet-50', labelKey: 'reactions.celebrate' },
  { type: 'SMART_TAKE', icon: Rocket, color: '#0EA5E9', bg: 'bg-sky-50', labelKey: 'reactions.smartTake' },
];

export const REACTION_BY_TYPE = Object.fromEntries(REACTIONS.map((r) => [r.type, r])) as Record<
  ReactionType,
  (typeof REACTIONS)[number]
>;

export function isReactionType(value: string | null | undefined): value is ReactionType {
  return !!value && REACTION_TYPES.includes(value as ReactionType);
}

/** Top reaction types sorted by count (for stacked summary icons). */
export function topReactionTypes(counts?: Record<string, number> | null, limit = 3): ReactionType[] {
  if (!counts) return [];
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type as ReactionType)
    .filter(isReactionType)
    .slice(0, limit);
}

export function applyReactionOptimistic(args: {
  prevReaction: string | null | undefined;
  nextType: ReactionType;
  likesCount: number;
  reactionCounts?: Record<string, number>;
}) {
  const { prevReaction, nextType, likesCount, reactionCounts = {} } = args;
  const counts = { ...reactionCounts };

  if (prevReaction === nextType) {
    // toggle off
    if (prevReaction && counts[prevReaction]) {
      counts[prevReaction] = Math.max(0, counts[prevReaction] - 1);
      if (counts[prevReaction] === 0) delete counts[prevReaction];
    }
    return {
      myReaction: null as string | null,
      isLikedByMe: false,
      likesCount: Math.max(0, likesCount - 1),
      reactionCounts: counts,
    };
  }

  if (!prevReaction) {
    counts[nextType] = (counts[nextType] || 0) + 1;
    return {
      myReaction: nextType as string | null,
      isLikedByMe: true,
      likesCount: likesCount + 1,
      reactionCounts: counts,
    };
  }

  // swap
  if (counts[prevReaction]) {
    counts[prevReaction] = Math.max(0, counts[prevReaction] - 1);
    if (counts[prevReaction] === 0) delete counts[prevReaction];
  }
  counts[nextType] = (counts[nextType] || 0) + 1;
  return {
    myReaction: nextType as string | null,
    isLikedByMe: true,
    likesCount,
    reactionCounts: counts,
  };
}
