/**
 * EdScoreBadge — small pill rendering a post's aggregate "Educational Value"
 * score (0–5). Matches the existing role-badge vocabulary in PostHeader
 * (paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 3,
 * marginLeft: 4) so it slots in naturally next to "Teacher" / "Admin" pills.
 *
 * Color-graded by score:
 *   ≥4.5   gold (#D97706 on #FEF3C7) — top-tier educational value
 *   ≥3.5   emerald (#059669 on #D1FAE5) — high educational value
 *   <3.5   not rendered — low scores are silently un-badged, never stigmatized
 *
 * Data source (prototype): mocked by utils/mockEdScores.ts.
 * Production: nightly job aggregates EducationalValueRating.averageRating
 * onto Post.edScore + Post.edScoreCount.
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
      bg: '#FEF3C7',
      icon: 'star' as const,
    };
  }
  if (score >= 3.5) {
    return {
      color: '#059669',
      bg: '#D1FAE5',
      icon: 'star' as const,
    };
  }
  return null;
};

export const EdScoreBadge: React.FC<Props> = ({ score }) => {
  const tone = getTone(score);
  if (!tone) return null; // silently un-badged for sub-3.5 posts

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Ionicons name={tone.icon} size={10} color={tone.color} />
      <Text style={[styles.text, { color: tone.color }]}>
        {score.toFixed(1)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create<{ badge: ViewStyle; text: TextStyle }>({
  // Matches PostHeader.roleBadge style exactly for visual cohesion
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
