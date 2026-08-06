/**
 * EdScoreBadge — compact educational-value score next to the author name.
 * Tint-only (icon + label), no fill — matches LinkedIn/X density and avoids
 * chip clutter when Admin / Ed-Score / Verified sit on one row.
 *
 * Color-graded by score:
 *   ≥4.5   gold (#D97706) — top-tier educational value
 *   ≥3.5   emerald (#059669) — high educational value
 *   <3.5   not rendered — low scores are silently un-badged, never stigmatized
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  score: number;          // 0–5
  count?: number;         // optional rating count (not shown in v1 — reserved for popover)
}

const getTone = (score: number) => {
  if (score >= 4.5) {
    return {
      color: '#D97706',
      icon: 'star' as const,
    };
  }
  if (score >= 3.5) {
    return {
      color: '#059669',
      icon: 'star' as const,
    };
  }
  return null;
};

export const EdScoreBadge: React.FC<Props> = ({ score }) => {
  const tone = getTone(score);
  if (!tone) return null; // silently un-badged for sub-3.5 posts

  return (
    <View style={styles.badge}>
      <Ionicons name={tone.icon} size={10} color={tone.color} />
      <Text style={[styles.text, { color: tone.color }]}>
        {score.toFixed(1)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create<{ badge: ViewStyle; text: TextStyle }>({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingVertical: 1,
    gap: 3,
    marginLeft: 4,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});

export default EdScoreBadge;
