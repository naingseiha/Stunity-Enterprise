import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/contexts';
import { useAuthStore } from '@/stores';
import { statsAPI, type StreakScope, type StreakLeaderEntry } from '@/services/stats';
import { useFeatureFlag } from '@/config/featureFlags';

interface StreakLeaderboardProps {
  profileUserId?: string;
}

const SCOPES: StreakScope[] = ['class', 'club', 'school'];
const TOP_N = 8;
const ACCENT = '#0EA5E9';

function Avatar({ name, uri }: { name: string; uri: string | null }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');

  if (uri) {
    return <Image source={{ uri }} style={styles.avatar} />;
  }

  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarInitials}>{initials || '?'}</Text>
    </View>
  );
}

function Row({
  entry,
  colors,
  muted,
  divider,
  isLast,
  youLabel,
}: {
  entry: StreakLeaderEntry;
  colors: any;
  muted: string;
  divider: string;
  isLast: boolean;
  youLabel: string;
}) {
  return (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: divider },
      ]}
    >
      <Text style={[styles.rank, { color: muted }]}>{entry.rank}</Text>
      <Avatar name={entry.name} uri={entry.avatar} />
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
        {entry.name}
        {entry.isMe ? (
          <Text style={[styles.you, { color: muted }]}>{` · ${youLabel}`}</Text>
        ) : null}
      </Text>
      <Text style={[styles.streak, { color: colors.text }]}>
        {entry.currentStreak}
        <Text style={[styles.streakUnit, { color: muted }]}>d</Text>
      </Text>
    </View>
  );
}

export function StreakLeaderboard({ profileUserId }: StreakLeaderboardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const flagOn = useFeatureFlag('streak_leaderboard');
  const isOwn = !!currentUserId && (!profileUserId || profileUserId === currentUserId);

  const [scope, setScope] = useState<StreakScope>('class');
  const [entries, setEntries] = useState<StreakLeaderEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOwn || !flagOn) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    statsAPI
      .getStreakLeaderboard(scope)
      .then((data) => {
        if (cancelled) return;
        setEntries(data.entries);
        setMyRank(data.myRank);
      })
      .catch(() => {
        if (!cancelled) {
          setEntries([]);
          setMyRank(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, isOwn, flagOn]);

  const onScope = useCallback((s: StreakScope) => setScope(s), []);

  if (!isOwn || !flagOn) return null;

  const top = entries.slice(0, TOP_N);
  const meInTop = top.some((e) => e.isMe);
  const muted = colors.textSecondary;
  const divider = isDark ? colors.border : '#EEF2F6';
  const tabTrack = isDark ? '#ffffff10' : '#F8FAFC';
  const youLabel = t('profile.performance.you', 'you');

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.header, { borderBottomColor: divider }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('profile.performance.streakLeaderboard')}
        </Text>
      </View>

      <View style={[styles.tabs, { backgroundColor: tabTrack }]}>
        {SCOPES.map((s) => {
          const active = scope === s;
          return (
            <Pressable
              key={s}
              onPress={() => onScope(s)}
              style={[
                styles.tab,
                active && {
                  backgroundColor: colors.card,
                  borderColor: isDark ? colors.border : '#E2E8F0',
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: active ? colors.text : muted },
                  active && styles.tabTextActive,
                ]}
              >
                {t(`profile.performance.scope.${s}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loading} color={ACCENT} />
      ) : top.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: muted }]}>
            {t('profile.performance.leaderboardEmpty')}
          </Text>
        </View>
      ) : (
        <View>
          {top.map((e, i) => (
            <Row
              key={e.userId}
              entry={e}
              colors={colors}
              muted={muted}
              divider={divider}
              isLast={i === top.length - 1 && !(!meInTop && myRank)}
              youLabel={youLabel}
            />
          ))}
          {!meInTop && myRank ? (
            <View style={[styles.myRankRow, { borderTopColor: divider }]}>
              <Text style={[styles.myRankText, { color: muted }]}>
                {t('profile.performance.yourRank', { rank: myRank })}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  header: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEF2F6',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: 4,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabTextActive: {
    fontWeight: '700',
  },
  loading: {
    marginVertical: 24,
  },
  empty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },
  rank: {
    width: 18,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  name: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  you: {
    fontWeight: '500',
  },
  streak: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 28,
    textAlign: 'right',
  },
  streakUnit: {
    fontSize: 11,
    fontWeight: '500',
  },
  myRankRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  myRankText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
