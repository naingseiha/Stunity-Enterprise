import { isValidElement } from 'react';
import type { ForwardedRef, ReactElement, ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextStyle } from 'react-native';

export const KHMER_FONT_FAMILIES = {
  heading: 'Koulen-Regular',
  body: 'Battambang-Regular',
  bodyBold: 'Battambang-Bold',
  quote: 'Metal-Regular',
} as const;

export const KHMER_FONT_ASSETS = {
  [KHMER_FONT_FAMILIES.heading]: require('../assets/fonts/khmer/Koulen/Koulen-Regular.ttf'),
  [KHMER_FONT_FAMILIES.body]: require('../assets/fonts/khmer/Battambang/Battambang-Regular.ttf'),
  [KHMER_FONT_FAMILIES.bodyBold]: require('../assets/fonts/khmer/Battambang/Battambang-Bold.ttf'),
  [KHMER_FONT_FAMILIES.quote]: require('../assets/fonts/khmer/Metal/Metal-Regular.ttf'),
} as const;

export type KhmerTextRole = 'heading' | 'body' | 'quote';

type PatchableComponent<P extends { style?: StyleProp<TextStyle>; children?: ReactNode }> = {
  render?: (props: P, ref: ForwardedRef<unknown>) => ReactElement | null;
};

const DEFAULT_LOCALE = 'en';
const KHMER_LOCALE = 'km';
const NUMERIC_ONLY_TEXT_RE = /^[\d\s.,/%:+\-()]+$/;
const NAME_LIKE_TEXT_RE = /^[A-Za-z\u1780-\u17FF\s.'’-]+$/;
// Match display-layer emoji detection so TextInput gets system/emoji fallback too.
/** Non-global — safe for `.test()` without mutating lastIndex */
const CONTAINS_EMOJI_RE =
  /(?:[\uD83C][\uDDE6-\uDDFF]){2}|[#*0-9]\uFE0F?\u20E3|(?:[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF])\uFE0F?(?:[\uD83C][\uDFFB-\uDFFF])?(?:\u200D(?:[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF])\uFE0F?(?:[\uD83C][\uDFFB-\uDFFF])?)*/;
let activeLocale = DEFAULT_LOCALE;
let patchApplied = false;

const normalizeLocale = (locale: string | null | undefined): string =>
  (locale || DEFAULT_LOCALE).toLowerCase().split('-')[0];

const isKhmerLocale = (locale: string | null | undefined): boolean =>
  normalizeLocale(locale) === KHMER_LOCALE;

const extractChildrenText = (children: ReactNode): string => {
  if (children === null || children === undefined || typeof children === 'boolean') {
    return '';
  }

  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map((item) => extractChildrenText(item)).join('');
  }

  if (isValidElement(children)) {
    const elementChildren = (children.props as { children?: ReactNode }).children;
    return extractChildrenText(elementChildren);
  }

  return '';
};

const isNumericOnlyText = (text: string): boolean => {
  const plainText = text.trim();
  if (!plainText) return false;
  return NUMERIC_ONLY_TEXT_RE.test(plainText);
};

const containsEmojiInString = (text: string): boolean =>
  Boolean(text) && CONTAINS_EMOJI_RE.test(text);

const containsEmoji = (children: ReactNode): boolean => {
  const plainText = extractChildrenText(children);
  return containsEmojiInString(plainText);
};

const normalizeText = (text: string): string => text.replace(/\s+/g, ' ').trim();

const toNumericWeight = (fontWeight: TextStyle['fontWeight']): number => {
  if (!fontWeight || fontWeight === 'normal') return 400;
  if (fontWeight === 'bold') return 700;
  const numericWeight = Number(fontWeight);
  return Number.isFinite(numericWeight) ? numericWeight : 400;
};

const flattenTextStyle = (style: StyleProp<TextStyle>): TextStyle =>
  (StyleSheet.flatten(style) || {}) as TextStyle;

const SYSTEM_FONT_FAMILIES = new Set(['System', 'system', 'default']);

const hasExistingCustomFont = (style: TextStyle): boolean => {
  if (typeof style.fontFamily !== 'string' || style.fontFamily.length === 0) {
    return false;
  }

  // System/default fonts are common in shared styles and should still become
  // Khmer-aware. Explicit custom fonts such as monospace remain opt-outs.
  return !SYSTEM_FONT_FAMILIES.has(style.fontFamily);
};

const isLikelyProfileNameText = (style: TextStyle, plainText: string): boolean => {
  const weight = toNumericWeight(style.fontWeight);
  const fontSize = typeof style.fontSize === 'number' ? style.fontSize : 0;
  const normalized = normalizeText(plainText);

  if (!normalized || normalized.length < 2 || normalized.length > 40) {
    return false;
  }

  if (weight < 600 || fontSize < 14 || fontSize > 24) {
    return false;
  }

  if (!NAME_LIKE_TEXT_RE.test(normalized)) {
    return false;
  }

  const words = normalized.split(' ').filter(Boolean);
  return words.length >= 1 && words.length <= 4;
};

const inferRole = (style: TextStyle, plainText: string): KhmerTextRole => {
  if (style.fontStyle === 'italic') {
    return 'quote';
  }

  if (isLikelyProfileNameText(style, plainText)) {
    return 'heading';
  }

  const weight = toNumericWeight(style.fontWeight);
  const fontSize = typeof style.fontSize === 'number' ? style.fontSize : 0;

  if (fontSize >= 22 || (fontSize >= 18 && weight >= 600)) {
    return 'heading';
  }

  return 'body';
};

const resolveFontFamily = (role: KhmerTextRole, style: TextStyle): string => {
  if (role === 'heading') return KHMER_FONT_FAMILIES.heading;
  if (role === 'quote') return KHMER_FONT_FAMILIES.quote;
  return toNumericWeight(style.fontWeight) >= 700
    ? KHMER_FONT_FAMILIES.bodyBold
    : KHMER_FONT_FAMILIES.body;
};

const appendFontFamily = (
  style: StyleProp<TextStyle>,
  fontFamily: TextStyle['fontFamily']
): StyleProp<TextStyle> => {
  if (Array.isArray(style)) {
    return [...style, { fontFamily }];
  }
  if (style) {
    return [style, { fontFamily }];
  }
  return { fontFamily };
};

// Named emoji font families. On iOS we no longer set 'Apple Color Emoji' explicitly
// (we use undefined so CoreText can resolve it naturally), but keep the set so any
// legacy instances are still whitelisted.
const EMOJI_FONT_FAMILIES = new Set(['Apple Color Emoji', 'Noto Color Emoji']);

const stripFontFamily = (style: StyleProp<TextStyle>): StyleProp<TextStyle> => {
  if (!style) return style;
  const flattened = flattenTextStyle(style);
  const { fontFamily: _fontFamily, ...withoutFontFamily } = flattened;
  return withoutFontFamily;
};

const getKhmerAwareStyle = (
  style: StyleProp<TextStyle>,
  children: ReactNode,
  options: { forceRole?: KhmerTextRole; inputText?: string } = {},
): StyleProp<TextStyle> => {
  if (!isKhmerLocale(activeLocale)) {
    return style;
  }

  // TextInput carries its text in value/defaultValue — children are usually empty,
  // so combine with optional input text for typography (emoji/system font, Khmer shaping).
  const textFromChildren = extractChildrenText(children);
  const corpus = `${textFromChildren}${options.inputText ?? ''}`;

  // Keep pure numeric strings in Latin/system glyphs (e.g., ring counters like "1", "95%").
  if (isNumericOnlyText(corpus)) {
    return style;
  }

  // Force system font for text containing emoji. Returning the original style is
  // not enough on iOS because an inherited/custom font can still render emoji as tofu.
  // We strip any custom font so CoreText / Skia can fall back to the platform emoji font.
  // Exception: preserve nodes that already use a named emoji font family, a system font,
  // or have no fontFamily at all (undefined); the latter is the iOS emoji-span style.
  if (containsEmoji(children) || containsEmojiInString(corpus)) {
    const flattened = flattenTextStyle(style);
    const ff = flattened.fontFamily;
    if (
      typeof ff !== 'string' ||
      EMOJI_FONT_FAMILIES.has(ff) ||
      SYSTEM_FONT_FAMILIES.has(ff)
    ) {
      // fontFamily is undefined/null, a system font, or an emoji font; leave it alone.
      return style;
    }
    return stripFontFamily(style);
  }

  const plainText = normalizeText(corpus.replace(/\u200b/g, '').trim());
  const flattened = flattenTextStyle(style);
  if (hasExistingCustomFont(flattened)) {
    return style;
  }

  const role = options.forceRole || inferRole(flattened, plainText);
  const family = resolveFontFamily(role, flattened);
  return appendFontFamily(style, family);
};

const patchComponentRender = <
  P extends {
    style?: StyleProp<TextStyle>;
    children?: ReactNode;
    value?: string;
    defaultValue?: string;
    disableKhmerTypography?: boolean;
  },
>(
  component: PatchableComponent<P>,
  options: { forceRole?: KhmerTextRole; inferInputText?: boolean } = {},
) => {
  const originalRender = component.render;
  if (!originalRender) {
    console.warn('[KhmerTypography] Unable to patch text renderer; falling back to default font behavior.');
    return;
  }

  component.render = (props: P, ref: ForwardedRef<unknown>) => {
    const safeProps = (props || {}) as P;
    const {
      disableKhmerTypography,
      ...nativeProps
    } = safeProps as P & { disableKhmerTypography?: boolean };
    
    if (disableKhmerTypography) {
      return originalRender(nativeProps as P, ref);
    }

    const inputText =
      options.inferInputText &&
      typeof (nativeProps as { value?: string }).value === 'string'
        ? (nativeProps as { value: string }).value
        : options.inferInputText &&
          typeof (nativeProps as { defaultValue?: string }).defaultValue === 'string'
          ? (nativeProps as { defaultValue: string }).defaultValue
          : undefined;

    const nextStyle = getKhmerAwareStyle(nativeProps.style, nativeProps.children, {
      forceRole: options.forceRole,
      inputText,
    });
    return originalRender({ ...nativeProps, style: nextStyle } as P, ref);
  };
};

export const setKhmerTypographyLanguage = (language: string) => {
  activeLocale = normalizeLocale(language);
};

export const initializeKhmerTypography = (initialLanguage: string) => {
  setKhmerTypographyLanguage(initialLanguage);
  if (patchApplied) return;

  patchComponentRender(
    Text as unknown as PatchableComponent<{ style?: StyleProp<TextStyle>; children?: ReactNode }>
  );
  patchComponentRender(
    TextInput as unknown as PatchableComponent<{
      style?: StyleProp<TextStyle>;
      children?: ReactNode;
      value?: string;
      defaultValue?: string;
    }>,
    { forceRole: 'body', inferInputText: true },
  );

  patchApplied = true;
};

export const getKhmerRoleStyle = (
  role: KhmerTextRole,
  language: string
): TextStyle => {
  if (!isKhmerLocale(language)) return {};
  if (role === 'heading') return { fontFamily: KHMER_FONT_FAMILIES.heading };
  if (role === 'quote') return { fontFamily: KHMER_FONT_FAMILIES.quote };
  return { fontFamily: KHMER_FONT_FAMILIES.body };
};
