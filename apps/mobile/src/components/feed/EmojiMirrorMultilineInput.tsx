/**
 * iOS: RN TextInput + custom fonts often render emoji as "?" — post details fix this via Twemoji
 * in {@link renderPostBodyText}. For editing, overlay the same renderer while keeping a real TextInput.
 */

import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeSyntheticEvent,
  TextStyle,
  TextInput as TextInputType,
  TextInputContentSizeChangeEventData,
  TextInputProps,
} from 'react-native';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { postContentHasEmoji, renderPostBodyText } from '@/utils/renderEmojiText';

export type EmojiMirrorMultilineInputProps = TextInputProps;

const DEFAULTcomposerMin = 150;
const BODY_LINE_HEIGHT = 25;

export const EmojiMirrorMultilineInput = forwardRef<TextInputType, EmojiMirrorMultilineInputProps>(
  function EmojiMirrorMultilineInput(
    {
      style,
      value,
      onContentSizeChange,
      editable = true,
      ...rest
    },
    ref,
  ) {
    const flat = useMemo(() => StyleSheet.flatten(style) || {}, [style]);
    const val = typeof value === 'string' ? value : '';
    const useMirror = Platform.OS === 'ios' && postContentHasEmoji(val);

    const paddingH = typeof flat.paddingHorizontal === 'number' ? flat.paddingHorizontal : 16;
    const paddingTop = typeof flat.paddingTop === 'number' ? flat.paddingTop : 16;
    const paddingBottom = typeof flat.paddingBottom === 'number' ? flat.paddingBottom : 0;

    const minComposer =
      typeof flat.minHeight === 'number'
        ? Math.max(DEFAULTcomposerMin, flat.minHeight)
        : DEFAULTcomposerMin;

    const [composerHeight, setComposerHeight] = useState(minComposer);

    const mirrorTypographyStyle = useMemo(
      (): TextStyle => ({
          fontSize: typeof flat.fontSize === 'number' ? flat.fontSize : 16,
          lineHeight: typeof flat.lineHeight === 'number' ? flat.lineHeight : BODY_LINE_HEIGHT,
          fontWeight: flat.fontWeight,
          color: flat.color as TextStyle['color'],
          // Padding lives on overlay only — avoid double-padding from renderEmojiText layout split.
          paddingHorizontal: 0,
          paddingTop: 0,
          paddingBottom: 0,
      }),
      [flat.color, flat.fontSize, flat.fontWeight, flat.lineHeight],
    );

    const handleMirrorLayout = useCallback(
      (e: LayoutChangeEvent) => {
        const h = Math.ceil(e.nativeEvent.layout.height);
        setComposerHeight(Math.max(minComposer, h));
      },
      [minComposer],
    );

    const handleContentSizeChange = useCallback(
      (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
        onContentSizeChange?.(e);
      },
      [onContentSizeChange],
    );

    if (!useMirror) {
      return (
        <TextInput
          ref={ref}
          {...rest}
          style={style}
          value={value}
          onContentSizeChange={onContentSizeChange}
          editable={editable}
        />
      );
    }

    return (
      <View style={[styles.wrap, { minHeight: composerHeight }]}>
        <View
          pointerEvents="none"
          onLayout={handleMirrorLayout}
          style={[
            styles.mirror,
            {
              paddingHorizontal: paddingH,
              paddingTop,
              paddingBottom,
            },
          ]}
        >
          {renderPostBodyText(val, mirrorTypographyStyle)}
        </View>
        <TextInput
          ref={ref}
          {...rest}
          value={value}
          editable={editable}
          onContentSizeChange={handleContentSizeChange}
          style={[
            style,
            styles.transparentGlyphs,
            { minHeight: composerHeight },
          ]}
          selectionColor={(flat.color as string) ?? '#6366F1'}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    position: 'relative',
    zIndex: 0,
  },
  mirror: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 0,
  },
  transparentGlyphs: {
    color: 'transparent',
    position: 'relative',
    zIndex: 1,
    backgroundColor: 'transparent',
  },
});
