import type { TextStyle } from 'react-native';

/**
 * Feed type scale — aligned with LinkedIn/X density, with slightly taller
 * leading when Khmer is present so stacked vowels/subscripts don't clip.
 *
 * Prefer these tokens over ad-hoc fontSize/lineHeight in PostCard pieces.
 */
export const FeedType = {
  name: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 20,
    // Koulen ascenders need room; keep modest so name→meta gap stays tight.
    lineHeightKhmer: 24,
  },
  meta: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    lineHeightKhmer: 20,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
    lineHeightKhmer: 24,
  },
  bodyDetail: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    lineHeightKhmer: 26,
  },
  quote: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    lineHeightKhmer: 20,
  },
  quoteAuthor: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
    lineHeightKhmer: 20,
  },
  action: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    lineHeightKhmer: 18,
  },
  chip: {
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 14,
    lineHeightKhmer: 16,
  },
} as const;

const KHMER_CHAR_RE = /[\u1780-\u17FF]/u;

export const textContainsKhmer = (value?: string | null): boolean =>
  Boolean(value) && KHMER_CHAR_RE.test(value as string);

type FeedTypeKey = keyof typeof FeedType;

/**
 * Resolve a feed text style. Pass `preferKhmer` when the UI locale is km or
 * the string contains Khmer (mixed posts should use Khmer leading).
 */
export const feedTextStyle = (
  key: FeedTypeKey,
  options?: { preferKhmer?: boolean; color?: string },
): TextStyle => {
  const token = FeedType[key];
  const preferKhmer = options?.preferKhmer === true;
  return {
    fontSize: token.fontSize,
    fontWeight: token.fontWeight,
    lineHeight: preferKhmer ? token.lineHeightKhmer : token.lineHeight,
    ...(options?.color ? { color: options.color } : null),
  };
};

export const feedBodyPreferKhmer = (
  content?: string | null,
  uiLocale?: string | null,
): boolean => {
  const locale = (uiLocale || '').toLowerCase().split('-')[0];
  return locale === 'km' || textContainsKhmer(content);
};

/** Feed CTAs only for posts that need a distinct next action (not passive reading). */
export const ACTIONABLE_FEED_CTA_TYPES = new Set([
  'QUIZ',
  'COURSE',
  'ASSIGNMENT',
  'EXAM',
  'EVENT',
  'PROJECT',
  'RESOURCE',
  'TUTORIAL',
  'RESEARCH',
  'COLLABORATION',
]);
