import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import type { LayoutBreakpoint } from '@/utils/layout';

const FORM_NARROW = 520;
const FORM_STANDARD = 600;
const FORM_WIDE = 720;

type Props = {
  layout: LayoutBreakpoint;
  children: React.ReactNode;
  /** 'auth' = login-sized; 'register' = wider wizard */
  variant?: 'auth' | 'register';
  style?: ViewStyle;
};

/**
 * Centers auth content on tablet with a soft card chrome so forms
 * do not look like a stretched phone column.
 */
export function AuthTabletShell({ layout, children, variant = 'auth', style }: Props) {
  if (!layout.isTablet) {
    return <>{children}</>;
  }

  const cap =
    variant === 'register'
      ? Math.min(FORM_WIDE, layout.contentColumnWidth)
      : Math.min(layout.isLargeTablet ? FORM_STANDARD : FORM_NARROW, layout.contentColumnWidth);

  return (
    <View style={[styles.outer, style]}>
      <View
        style={[
          styles.card,
          { maxWidth: cap, width: '100%' },
          layout.isLargeTablet && styles.cardLarge,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 24,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 28,
      },
      android: {
        elevation: 6,
      },
    }),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  cardLarge: {
    borderRadius: 32,
    paddingHorizontal: 32,
    paddingVertical: 32,
  },
});
