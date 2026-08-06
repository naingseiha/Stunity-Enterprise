import type { Ionicons } from '@expo/vector-icons';

export type PostReactionType = 'LIKE' | 'INSIGHTFUL' | 'CELEBRATE' | 'SMART_TAKE';

export interface PostReactionMeta {
  type: PostReactionType;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
}

/** Reaction palette — Ionicons only (no emoji). Matches engagement-api REACTION_TYPES. */
export const POST_REACTIONS: PostReactionMeta[] = [
  { type: 'LIKE', icon: 'heart', color: '#EF4444', label: 'Like' },
  { type: 'INSIGHTFUL', icon: 'bulb', color: '#F59E0B', label: 'Insightful' },
  { type: 'CELEBRATE', icon: 'sparkles', color: '#8B5CF6', label: 'Celebrate' },
  { type: 'SMART_TAKE', icon: 'rocket', color: '#0EA5E9', label: 'Smart take' },
];

export const POST_REACTION_BY_TYPE = new Map<string, PostReactionMeta>(
  POST_REACTIONS.map((r) => [r.type, r]),
);
