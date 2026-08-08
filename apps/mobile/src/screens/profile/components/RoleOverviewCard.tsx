import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/contexts';
import { navigateToMessaging } from '@/navigation/navigationRef';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import type { ProfileVisitor } from '@/api/profileApi';
import type { UserStats as ProfileUserStats } from '@/types';

const ACCENT = '#0EA5E9';

function compactNumber(value: number | undefined) {
  const n = value ?? 0;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

interface RoleOverviewProps {
  role: 'TEACHER' | 'PARENT' | 'STAFF' | 'SCHOOL_ADMIN' | 'ADMIN' | 'SUPER_ADMIN';
  profile: any;
  profileStats: ProfileUserStats | null;
  isOwnProfile: boolean;
  recentVisitors?: ProfileVisitor[];
  onViewProfileVisitors?: () => void;
}

export function RoleOverviewCard({
  role,
  profile,
  profileStats,
  isOwnProfile,
  recentVisitors = [],
  onViewProfileVisitors,
}: RoleOverviewProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const navigation = useNavigation<any>();
  const muted = colors.textSecondary;
  const divider = isDark ? colors.border : '#EEF2F6';
  const track = isDark ? colors.surfaceVariant : '#F8FAFC';

  const isTeacherLike = role === 'TEACHER' || role === 'STAFF' || role === 'SCHOOL_ADMIN';
  const isParent = role === 'PARENT';

  const title = isParent
    ? t('profile.performance.role.parentTitle', 'Parent overview')
    : t('profile.performance.role.teacherTitle', 'Teaching overview');

  const subtitle = isParent
    ? t(
        'profile.performance.role.parentSub',
        'Stay connected with teachers and follow your child’s learning activity.',
      )
    : profile?.teacher?.position ||
      profile?.professionalTitle ||
      t('profile.performance.role.teacherSub', 'Classroom tools and school presence');

  const metrics = [
    {
      label: t('profile.stats.posts'),
      value: compactNumber(profileStats?.posts),
    },
    {
      label: t('profile.stats.followers'),
      value: compactNumber(profileStats?.followers),
    },
    {
      label: t('profile.performance.views30d'),
      value: compactNumber(profileStats?.profileViews30d),
    },
  ];

  const childrenCount = Array.isArray(profile?.children) ? profile.children.length : 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: muted }]} numberOfLines={2}>
        {subtitle}
      </Text>

      {profile?.school?.name ? (
        <Text style={[styles.school, { color: muted }]} numberOfLines={1}>
          {profile.school.name}
        </Text>
      ) : null}

      <View style={[styles.metrics, { borderTopColor: divider, borderBottomColor: divider }]}>
        {metrics.map((m, i) => (
          <View
            key={m.label}
            style={[
              styles.metric,
              i < metrics.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: divider },
            ]}
          >
            <Text style={[styles.metricValue, { color: colors.text }]}>{m.value}</Text>
            <Text style={[styles.metricLabel, { color: muted }]}>{m.label}</Text>
          </View>
        ))}
      </View>

      {isParent && childrenCount > 0 ? (
        <Text style={[styles.children, { color: muted }]}>
          {t('profile.performance.role.childrenLinked', {
            count: childrenCount,
            defaultValue: `${childrenCount} linked student${childrenCount === 1 ? '' : 's'}`,
          })}
        </Text>
      ) : null}

      {isOwnProfile ? (
        <View style={styles.actions}>
          {isTeacherLike ? (
            <>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: track }]}
                onPress={() => navigation.navigate('QuizStudio' as any)}
              >
                <Ionicons name="create-outline" size={16} color={ACCENT} />
                <Text style={[styles.actionText, { color: colors.text }]}>
                  {t('profile.quizStudio', 'Quiz Studio')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: track }]}
                onPress={() => navigation.navigate('AttendanceCheckIn' as any)}
              >
                <Ionicons name="checkbox-outline" size={16} color={ACCENT} />
                <Text style={[styles.actionText, { color: colors.text }]}>
                  {t('profile.attendance', 'Attendance')}
                </Text>
              </Pressable>
            </>
          ) : null}

          {isParent && FEATURE_FLAGS.MESSAGING_ENABLED ? (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: track }]}
              onPress={() => navigateToMessaging({ screen: 'Conversations' })}
            >
              <Ionicons name="chatbubbles-outline" size={16} color={ACCENT} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                {t('profile.message', 'Messages')}
              </Text>
            </Pressable>
          ) : null}

          {onViewProfileVisitors ? (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: track }]}
              onPress={onViewProfileVisitors}
            >
              <Ionicons name="eye-outline" size={16} color={ACCENT} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                {t('profile.profileVisitors', 'Visitors')}
                {recentVisitors.length > 0 ? ` · ${recentVisitors.length}` : ''}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  school: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  metrics: {
    flexDirection: 'row',
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  children: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
