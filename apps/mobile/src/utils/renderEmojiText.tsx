import React from 'react';
import { Image as ExpoImage } from 'expo-image';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { KHMER_FONT_FAMILIES } from '@/lib/khmerTypography';

const EMOJI_TOKEN_RE =
  /(?:[\uD83C][\uDDE6-\uDDFF]){2}|[#*0-9]\uFE0F?\u20E3|(?:[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF])\uFE0F?(?:[\uD83C][\uDFFB-\uDFFF])?(?:\u200D(?:[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF])\uFE0F?(?:[\uD83C][\uDFFB-\uDFFF])?)*/g;
const HAS_EMOJI_RE = new RegExp(EMOJI_TOKEN_RE.source);

/** Same detection as post body rendering (Twemoji path on iOS). */
export function postContentHasEmoji(text: string): boolean {
  if (!text) return false;
  return HAS_EMOJI_RE.test(text);
}
const KHMER_CHAR_RE = /[\u1780-\u17FF]/u;

type InlineRunKind = 'text' | 'khmer' | 'latin' | 'emoji';

type InlineRun = {
  value: string;
  kind: InlineRunKind;
};

type RenderEmojiTextOptions = {
  splitScripts?: boolean;
  khmerFontFamily?: TextStyle['fontFamily'];
  latinFontFamily?: TextStyle['fontFamily'];
};

interface EmojiSafeTextProps extends React.ComponentProps<typeof Text> {
  disableKhmerTypography?: boolean;
}

const EmojiSafeText = Text as unknown as React.FC<EmojiSafeTextProps>;

const toNumericWeight = (fontWeight: TextStyle['fontWeight']): number => {
  if (!fontWeight || fontWeight === 'normal') return 400;
  if (fontWeight === 'bold') return 700;
  const numericWeight = Number(fontWeight);
  return Number.isFinite(numericWeight) ? numericWeight : 400;
};

const flattenTextStyle = (style: StyleProp<TextStyle>): TextStyle =>
  (StyleSheet.flatten(style) || {}) as TextStyle;

const stripFontFamily = (style: StyleProp<TextStyle>): StyleProp<TextStyle> => {
  if (!style) return style;
  const flattened = flattenTextStyle(style);
  const { fontFamily: _fontFamily, ...withoutFontFamily } = flattened;
  return withoutFontFamily;
};

const resolveKhmerSpanFont = (style: StyleProp<TextStyle>): string => {
  const flattened = flattenTextStyle(style);
  const weight = toNumericWeight(flattened.fontWeight);
  const fontSize = typeof flattened.fontSize === 'number' ? flattened.fontSize : 0;

  if (fontSize >= 22 || (fontSize >= 18 && weight >= 600)) {
    return KHMER_FONT_FAMILIES.heading;
  }

  return weight >= 700 ? KHMER_FONT_FAMILIES.bodyBold : KHMER_FONT_FAMILIES.body;
};

const splitEmojiText = (value: string): InlineRun[] => {
  const parts: InlineRun[] = [];
  let cursor = 0;
  EMOJI_TOKEN_RE.lastIndex = 0;

  let match = EMOJI_TOKEN_RE.exec(value);
  while (match) {
    if (match.index > cursor) {
      parts.push({ value: value.slice(cursor, match.index), kind: 'text' });
    }

    parts.push({ value: match[0], kind: 'emoji' });
    cursor = match.index + match[0].length;
    match = EMOJI_TOKEN_RE.exec(value);
  }

  if (cursor < value.length) {
    parts.push({ value: value.slice(cursor), kind: 'text' });
  }

  return parts;
};

const splitTextIntoRuns = (value: string) => value.match(/\S+\s*|\s+/g) ?? [];

const splitTextByScript = (value: string): InlineRun[] => {
  const runs: InlineRun[] = [];
  let currentValue = '';
  let currentKind: InlineRunKind | null = null;

  const flush = () => {
    if (!currentValue || !currentKind) return;
    runs.push({ value: currentValue, kind: currentKind });
    currentValue = '';
    currentKind = null;
  };

  Array.from(value).forEach((char) => {
    const isKhmer = KHMER_CHAR_RE.test(char);
    const isNeutral = !isKhmer && !/[A-Za-z0-9]/u.test(char);
    const nextKind: InlineRunKind = isKhmer ? 'khmer' : 'latin';

    if (isNeutral && currentKind) {
      currentValue += char;
      return;
    }

    if (currentKind && currentKind !== nextKind) {
      flush();
    }

    currentKind = nextKind;
    currentValue += char;
  });

  flush();
  return runs.length > 0 ? runs : [{ value, kind: 'latin' }];
};

const splitLineIntoInlineRuns = (value: string, splitScripts = false) =>
  splitEmojiText(value).flatMap((part) => {
    if (part.kind === 'emoji') return [part];

    return splitTextIntoRuns(part.value).flatMap((text) => {
      if (!splitScripts) return [{ value: text, kind: 'text' as const }];
      return splitTextByScript(text);
    });
  });

const toTwemojiCodePoint = (value: string) =>
  Array.from(value)
    .map((char) => char.codePointAt(0))
    .filter((codePoint): codePoint is number => Boolean(codePoint) && codePoint !== 0xfe0f)
    .map((codePoint) => codePoint.toString(16))
    .join('-');

const getTwemojiUrl = (value: string) =>
  `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${toTwemojiCodePoint(value)}.png`;

const splitLayoutAndTextStyle = (
  style: StyleProp<TextStyle>,
): { containerStyle: ViewStyle; textStyle: TextStyle } => {
  const flattened = flattenTextStyle(style) as TextStyle & ViewStyle;
  const {
    margin,
    marginHorizontal,
    marginVertical,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    padding,
    paddingHorizontal,
    paddingVertical,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    width,
    minWidth,
    maxWidth,
    alignSelf,
    flex,
    flexGrow,
    flexShrink,
    flexBasis,
    opacity,
    ...textStyle
  } = flattened;

  return {
    containerStyle: {
      margin,
      marginHorizontal,
      marginVertical,
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      padding,
      paddingHorizontal,
      paddingVertical,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      width,
      minWidth,
      maxWidth,
      alignSelf,
      flex,
      flexGrow,
      flexShrink,
      flexBasis,
      opacity,
    },
    textStyle,
  };
};

const resolveNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const resolveVerticalPadding = (style: ViewStyle): number => {
  const basePadding = resolveNumber(style.padding) ?? 0;
  const verticalPadding = resolveNumber(style.paddingVertical);
  const top = resolveNumber(style.paddingTop) ?? verticalPadding ?? basePadding;
  const bottom = resolveNumber(style.paddingBottom) ?? verticalPadding ?? basePadding;
  return top + bottom;
};

const getKhmerFontFamily = (
  style: StyleProp<TextStyle>,
  options?: RenderEmojiTextOptions,
) => options?.khmerFontFamily ?? resolveKhmerSpanFont(style);

const getLatinSpanStyle = (
  style: StyleProp<TextStyle>,
  options?: RenderEmojiTextOptions,
): TextStyle => {
  const baseStyle = stripFontFamily(style) as TextStyle;
  return options?.latinFontFamily
    ? { ...baseStyle, fontFamily: options.latinFontFamily }
    : baseStyle;
};

const getKhmerSpanStyle = (
  baseStyle: TextStyle,
  fontFamily: TextStyle['fontFamily'],
): TextStyle => ({
  ...baseStyle,
  fontFamily,
  // Android treats fontFamily + fontWeight as a request for a separate weighted
  // font file. Our Khmer display font is loaded as a regular face, so keep the
  // custom font weight neutral and let Koulen's glyph design carry the heading.
  fontWeight: Platform.OS === 'android' ? '400' : baseStyle.fontWeight,
});

const renderSplitScriptText = (
  value: string,
  style?: StyleProp<TextStyle>,
  numberOfLines?: number,
  options?: RenderEmojiTextOptions,
) => {
  const khmerFontFamily = getKhmerFontFamily(style, options);
  const latinSpanStyle = getLatinSpanStyle(style, options);
  const khmerSpanStyle = getKhmerSpanStyle(latinSpanStyle, khmerFontFamily);
  const runs = splitEmojiText(value).flatMap((part) => {
    if (part.kind === 'emoji') return [part];
    return splitTextByScript(part.value);
  });

  return (
    <EmojiSafeText
      style={latinSpanStyle}
      numberOfLines={numberOfLines}
      disableKhmerTypography
    >
      {runs.map((run, index) => (
        <EmojiSafeText
          key={`${run.kind}-${index}`}
          style={run.kind === 'khmer' ? khmerSpanStyle : latinSpanStyle}
          disableKhmerTypography
        >
          {run.value}
        </EmojiSafeText>
      ))}
    </EmojiSafeText>
  );
};

export const renderEmojiText = (
  value: string,
  style?: StyleProp<TextStyle>,
  numberOfLines?: number,
  options?: RenderEmojiTextOptions,
) => {
  if (!value) return null;

  const displayValue = value;
  const hasEmoji = HAS_EMOJI_RE.test(displayValue);

  if (options?.splitScripts && (!hasEmoji || Platform.OS !== 'ios')) {
    return renderSplitScriptText(displayValue, style, numberOfLines, options);
  }

  if (!hasEmoji || Platform.OS !== 'ios') {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {displayValue}
      </Text>
    );
  }

  const { containerStyle, textStyle } = splitLayoutAndTextStyle(style);
  const fontSize = resolveNumber(textStyle.fontSize) ?? 16;
  const lineHeight = resolveNumber(textStyle.lineHeight) ?? Math.round(fontSize * 1.45);
  const emojiSize = Math.max(16, Math.round(fontSize * 1.18));
  const maxHeight = numberOfLines
    ? (lineHeight * numberOfLines) + resolveVerticalPadding(containerStyle)
    : undefined;
  const latinSpanStyle: TextStyle = {
    ...stripFontFamily(textStyle) as TextStyle,
    ...(options?.latinFontFamily ? { fontFamily: options.latinFontFamily } : null),
    lineHeight,
    flexShrink: 1,
    maxWidth: '100%',
  };
  const khmerSpanStyle: TextStyle = {
    ...getKhmerSpanStyle(latinSpanStyle, getKhmerFontFamily(style, options)),
    lineHeight,
    flexShrink: 1,
    maxWidth: '100%',
  };
  const lines = displayValue.split('\n');

  return (
    <View
      style={[
        containerStyle,
        maxHeight ? { maxHeight, overflow: 'hidden' } : null,
      ]}
    >
      {lines.map((line, lineIndex) => {
        const parts = splitLineIntoInlineRuns(line, options?.splitScripts);

        if (line.length === 0) {
          return (
            <View
              key={`empty-${lineIndex}`}
              style={{ height: lineHeight }}
            />
          );
        }

        return (
          <View
            key={`line-${lineIndex}`}
            style={[
              styles.emojiLine,
              lineIndex > 0 ? { marginTop: Math.max(2, Math.round(lineHeight * 0.15)) } : null,
            ]}
          >
            {parts.map((part, index) => {
              if (part.kind === 'emoji') {
                return (
                  <ExpoImage
                    key={`emoji-${lineIndex}-${index}`}
                    source={{ uri: getTwemojiUrl(part.value) }}
                    style={[
                      styles.emojiImage,
                      {
                        width: emojiSize,
                        height: emojiSize,
                        marginTop: Math.max(0, Math.round((lineHeight - emojiSize) / 2) - 1),
                      },
                    ]}
                    contentFit="contain"
                  />
                );
              }

              return (
                <EmojiSafeText
                  key={`text-${lineIndex}-${index}`}
                  style={part.kind === 'latin' ? latinSpanStyle : khmerSpanStyle}
                  disableKhmerTypography
                >
                  {part.value}
                </EmojiSafeText>
              );
            })}
          </View>
        );
      })}
    </View>
  );
};

export const renderPostTitleText = (
  value: string,
  style?: StyleProp<TextStyle>,
  numberOfLines?: number,
) => renderEmojiText(value, style, numberOfLines, {
  splitScripts: true,
  khmerFontFamily: KHMER_FONT_FAMILIES.heading,
});

export const renderPostBodyText = (
  value: string,
  style?: StyleProp<TextStyle>,
  numberOfLines?: number,
) => renderEmojiText(value, style, numberOfLines, {
  splitScripts: true,
  khmerFontFamily: KHMER_FONT_FAMILIES.body,
});

const styles = StyleSheet.create({
  emojiLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  emojiImage: {
    marginHorizontal: 1,
  },
});
