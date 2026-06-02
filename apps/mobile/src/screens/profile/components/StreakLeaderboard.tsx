import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/contexts';
import { useAuthStore } from '@/stores';
import { statsAPI, type StreakScope, type StreakLeaderEntry } from '@/services/stats';
import { useFeatureFlag } from '@/config/featureFlags';

interface StreakLeaderboardProps {
  /** The viewed profile. Leaderboard is the caller's own scope, so own-profile only. */
  profileUserId?: string;
}

const SCOPES: StreakScope[] = ['class', 'club', 'school'];
const TOP_N = 10;

function Avatar({ name, uri, isMe }: { name: string; uri: string | null; isMe: boolean }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join('');
  if (uri) {
    return <Image source={{ uri }} style={styles.avatar} />;
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback, isMe && { backgroundColor: '#FDBA74' }]}>
      <Text style={styles.avatarInitials}>{initials || '?'}</Text>
    </View>
  );
}

function Row({ entry, colors }: { entry: StreakLeaderEntry; colors: any }) {
  const medal = entry.rank === 1 ? '#F59E0B' : entry.rank === 2 ? '#9CA3AF' : entry.rank === 3 ? '#B45309' : null;
  return (
    <View style={[styles.row, entry.isMe && { backgroundColor: colors.surfaceVariant, borderRadius: 10 }]}>
      <View style={styles.rankCol}>
        {medal ? (
          <Ionicons name="medal" size={18} color={medal} />
        ) : (
          <Text style={[styles.rankText, { color: colors.textSecondary }]}>{entry.rank}</Text>
        )}
      </View>
      <Avatar name={entry.name} uri={entry.avatar} isMe={entry.isMe} />
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
        {entry.isMe ? `${entry.name} ` : entry.name}
        {entry.isMe ? <Text style={styles.youTag}>· you</Text> : null}
      </Text>
      <View style={styles.streakCol}>
        <Ionicons name="flame" size={14} color="#EA580C" />
        <Text style={styles.streakNum}>{entry.currentStreak}</Text>
      </View>
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
    if (!isOwn || !flagOn) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    statsAPI.getStreakLeaderboard(scope)
      .then((data) => {
        if (cancelled) return;
        setEntries(data.entries);
        setMyRank(data.myRank);
      })
      .catch(() => { if (!cancelled) { setEntries([]); setMyRank(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [scope, isOwn, flagOn]);

  const onScope = useCallback((s: StreakScope) => setScope(s), []);

  if (!isOwn || !flagOn) return null;

  const top = entries.slice(0, TOP_N);
  const meInTop = top.some((e) => e.isMe);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: '#FFF1E6' }]}>
          <Ionicons name="trophy" size={18} color="#EA580C" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{t('profile.performance.streakLeaderboard')}</Text>
      </View>

      {/* Scope tabs */}
      <View style={[styles.tabs, { backgroundColor: isDark ? '#ffffff10' : '#0000000a' }]}>
        {SCOPES.map((s) => (
          <Pressable
            key={s}
            onPress={() => onScope(s)}
            style={[styles.tab, scope === s && { backgroundColor: colors.card }]}
          >
            <Text style={[styles.tabText, { color: scope === s ? colors.text : colors.textSecondary }]}>
              {t(`profile.performance.scope.${s}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginVertical: 20 }} color="#EA580C" />
      ) : top.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          {t('profile.performance.leaderboardEmpty')}
        </Text>
      ) : (
        <>
          {top.map((e) => <Row key={e.userId} entry={e} colors={colors} />)}
          {!meInTop && myRank ? (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.myRankRow}>
                <Text style={[styles.myRankText, { color: colors.textSecondary }]}>
                  {t('profile.performance.yourRank', { rank: myRank })}
                </Text>
              </View>
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  headerIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800' },
  tabs: { flexDirection: 'row', borderRadius: 10, padding: 3, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  tabText: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 6 },
  rankCol: { width: 22, alignItems: 'center' },
  rankText: { fontSize: 13, fontWeight: '800' },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: { backgroundColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 12, fontWeight: '800', color: '#fff' },
  name: { flex: 1, fontSize: 14, fontWeight: '600' },
  youTag: { fontWeight: '700', color: '#EA580C' },
  streakCol: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  streakNum: { fontSize: 14, fontWeight: '800', color: '#EA580C' },
  divider: { height: 1, marginVertical: 8 },
  myRankRow: { paddingVertical: 4, paddingHorizontal: 6 },
  myRankText: { fontSize: 13, fontWeight: '700' },
  empty: { fontSize: 13, textAlign: 'center', marginVertical: 18 },
});
