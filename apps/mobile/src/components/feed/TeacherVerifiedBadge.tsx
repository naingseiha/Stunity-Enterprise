/**
 * TeacherVerifiedBadge — a teacher in the post's school has reviewed this
 * post and marked it canonical. Distinct from User.isVerified (the blue
 * tick on the author) — this is *post-level* verification.
 *
 * Shown in the meta row next to date / visibility (not beside the name),
 * so it is not confused with account verification.
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface Props {
  verifierName?: string; // e.g. "Ms. Sopheap" — currently unused in v1, reserved for popover
}

export const TeacherVerifiedBadge: React.FC<Props> = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.badge}>
      <Ionicons name="school" size={10} color="#D97706" />
      <Text style={styles.text}>
        {t('feed.edScore.teacherVerified', { defaultValue: 'Teacher verified' })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create<{ badge: ViewStyle; text: TextStyle }>({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
    letterSpacing: 0.1,
  },
});

export default TeacherVerifiedBadge;
