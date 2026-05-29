/**
 * TeacherVerifiedBadge — a teacher in the post's school has reviewed this
 * post and marked it canonical. Distinct from User.isVerified (the blue
 * tick on the author) — this is *post-level* verification.
 *
 * Matches the existing role-badge vocabulary in PostHeader so it slots in
 * naturally next to "Teacher" / "Admin" / EdScore pills.
 *
 * Visual: amber school icon + "Verified" label on soft amber background.
 * Prestigious without being loud.
 *
 * Data source (prototype): mocked by utils/mockEdScores.ts.
 * Production: needs Post.verifiedByTeacherId + Post.verificationStatus
 * on the Prisma model.
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
        {t('feed.edScore.teacherVerified', { defaultValue: 'Verified' })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create<{ badge: ViewStyle; text: TextStyle }>({
  // Matches PostHeader.roleBadge layout exactly
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
    marginLeft: 4,
    backgroundColor: '#FEF3C7',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
    letterSpacing: 0.1,
  },
});

export default TeacherVerifiedBadge;
