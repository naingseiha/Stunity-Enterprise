import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/contexts';
import { useAuthStore } from '@/stores';
import { fetchMasteryTree, type MasterySubject } from '@/api/recall';
import { useFeatureFlag } from '@/config/featureFlags';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SubjectMasteryTreeProps {
  /** The profile being viewed. The tree is the signed-in user's own data, so it
   *  only renders on your own profile. */
  profileUserId?: string;
}

function masteryColor(pct: number): string {
  if (pct >= 80) return '#16A34A'; // mastered
  if (pct >= 50) return '#F59E0B'; // progressing
  return '#EF4444'; // needs work
}

function MasteryBar({ pct }: { pct: number }) {
  const { isDark } = useThemeContext();
  return (
    <View style={[styles.track, { backgroundColor: isDark ? '#ffffff14' : '#0000000d' }]}>
      <View style={[styles.fill, { width: `${Math.max(2, pct)}%`, backgroundColor: masteryColor(pct) }]} />
    </View>
  );
}

export function SubjectMasteryTree({ profileUserId }: SubjectMasteryTreeProps) {
  const { t } = useTranslation();
  const { colors } = useThemeContext();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const flagOn = useFeatureFlag('mastery_tree');
  const isOwn = !!currentUserId && (!profileUserId || profileUserId === currentUserId);

  const [subjects, setSubjects] = useState<MasterySubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOwn || !flagOn) { setLoading(false); return; }
    let cancelled = false;
    fetchMasteryTree()
      .then((s) => { if (!cancelled) setSubjects(s); })
      .catch(() => { /* optional section */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOwn, flagOn]);

  const toggle = useCallback((subject: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => ({ ...prev, [subject]: !prev[subject] }));
  }, []);

  if (!isOwn || !flagOn || loading || subjects.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: '#EFF6FF' }]}>
          <Ionicons name="git-branch" size={18} color="#0EA5E9" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{t('profile.performance.subjectMastery')}</Text>
      </View>

      {subjects.map((subj) => {
        const open = !!expanded[subj.subject];
        return (
          <View key={subj.subject} style={styles.subjectBlock}>
            <Pressable onPress={() => toggle(subj.subject)} style={styles.subjectRow}>
              <View style={styles.subjectTop}>
                <Text style={[styles.subjectLabel, { color: colors.text }]} numberOfLines={1}>
                  {subj.label}
                </Text>
                <View style={styles.subjectRight}>
                  {subj.dueCount > 0 ? (
                    <View style={styles.duePill}>
                      <Ionicons name="time-outline" size={11} color="#B45309" />
                      <Text style={styles.dueText}>{t('profile.performance.masteryDue', { count: subj.dueCount })}</Text>
                    </View>
                  ) : null}
                  <Text style={[styles.pct, { color: masteryColor(subj.mastery) }]}>{subj.mastery}%</Text>
                  <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textTertiary}
                  />
                </View>
              </View>
              <MasteryBar pct={subj.mastery} />
            </Pressable>

            {open ? (
              <View style={styles.topics}>
                {subj.topics.map((tp) => (
                  <View key={tp.label} style={styles.topicRow}>
                    <View style={styles.topicLeft}>
                      <Text style={[styles.topicLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                        {tp.label}
                      </Text>
                      <MasteryBar pct={tp.mastery} />
                    </View>
                    <Text style={[styles.topicPct, { color: masteryColor(tp.mastery) }]}>{tp.mastery}%</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  headerIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800' },
  subjectBlock: { marginBottom: 14 },
  subjectRow: { gap: 7 },
  subjectTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  subjectLabel: { fontSize: 14, fontWeight: '700', flex: 1 },
  subjectRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  duePill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  dueText: { fontSize: 10, fontWeight: '700', color: '#B45309' },
  pct: { fontSize: 14, fontWeight: '800' },
  track: { height: 7, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  topics: { marginTop: 12, paddingLeft: 10, gap: 10, borderLeftWidth: 2, borderLeftColor: '#E2E8F0' },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topicLeft: { flex: 1, gap: 5 },
  topicLabel: { fontSize: 12, fontWeight: '600' },
  topicPct: { fontSize: 12, fontWeight: '700', minWidth: 36, textAlign: 'right' },
});
