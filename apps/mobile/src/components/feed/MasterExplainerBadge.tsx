/**
 * MasterExplainerBadge — tutor reputation tier shown next to their name in
 * Feynman Bounty cards (and elsewhere a tutor's expertise needs surfacing).
 *
 * Tiers:
 *   bronze   10+ winning explanations (color: #92400E, bg: #FEF3C7)
 *   silver   50+ winning explanations (color: #475569, bg: #E2E8F0)
 *   gold     200+ winning explanations (color: #B45309, bg: #FDE68A)
 *
 * Matches PostHeader.roleBadge vocabulary (paddingH 6, paddingV 2,
 * radius 4, gap 3) for visual cohesion with the existing badge family.
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import type { MasterExplainerTier } from '@/types';

interface Props {
  tier: MasterExplainerTier;
}

const TIER_CONFIG: Record<MasterExplainerTier, { color: string; bg: string; label: string }> = {
  bronze: { color: '#92400E', bg: '#FEF3C7', label: 'Bronze' },
  silver: { color: '#475569', bg: '#E2E8F0', label: 'Silver' },
  gold:   { color: '#B45309', bg: '#FDE68A', label: 'Gold'   },
};

export const MasterExplainerBadge: React.FC<Props> = ({ tier }) => {
  const { t } = useTranslation();
  const cfg = TIER_CONFIG[tier];

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Ionicons name="ribbon" size={10} color={cfg.color} />
      <Text style={[styles.text, { color: cfg.color }]}>
        {t(`feed.bounty.masterExplainerTier.${tier}`, { defaultValue: cfg.label })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create<{ badge: ViewStyle; text: TextStyle }>({
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

export default MasterExplainerBadge;
