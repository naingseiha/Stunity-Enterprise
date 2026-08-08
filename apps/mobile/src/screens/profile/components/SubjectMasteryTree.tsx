import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/contexts';
import { useAuthStore } from '@/stores';
import { fetchMasteryTree, type MasterySubject, type MasteryTopic } from '@/api/recall';
import { useFeatureFlag } from '@/config/featureFlags';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SubjectMasteryTreeProps {
  profileUserId?: string;
}

const INITIAL_VISIBLE = 5;
const ACCENT = '#0EA5E9';

function normalizeKey(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function prettyLabel(raw: string) {
  const cleaned = raw.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  if (!cleaned) return raw;
  return cleaned
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

function mergeSubjects(list: MasterySubject[]): MasterySubject[] {
  const map = new Map<string, MasterySubject>();
  for (const item of list) {
    const key = normalizeKey(item.subject || item.label);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...item,
        subject: key,
        label: prettyLabel(item.label || item.subject),
        topics: [...(item.topics || [])],
      });
      continue;
    }
    const cardCount = existing.cardCount + item.cardCount;
    const dueCount = existing.dueCount + item.dueCount;
    const weighted =
      cardCount > 0
        ? Math.round(
            (existing.mastery * existing.cardCount + item.mastery * item.cardCount) /
              cardCount,
          )
        : Math.round((existing.mastery + item.mastery) / 2);

    const topicMap = new Map<string, MasteryTopic>();
    for (const tp of [...existing.topics, ...(item.topics || [])]) {
      const tKey = normalizeKey(tp.label);
      const prev = topicMap.get(tKey);
      if (!prev) {
        topicMap.set(tKey, { ...tp, label: prettyLabel(tp.label) });
      } else {
        const tc = prev.cardCount + tp.cardCount;
        topicMap.set(tKey, {
          label: prettyLabel(tp.label),
          cardCount: tc,
          dueCount: prev.dueCount + tp.dueCount,
          mastery:
            tc > 0
              ? Math.round((prev.mastery * prev.cardCount + tp.mastery * tp.cardCount) / tc)
              : Math.round((prev.mastery + tp.mastery) / 2),
        });
      }
    }

    map.set(key, {
      subject: key,
      label: prettyLabel(existing.label || item.label || key),
      mastery: weighted,
      cardCount,
      dueCount,
      topics: Array.from(topicMap.values()),
    });
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.dueCount !== a.dueCount) return b.dueCount - a.dueCount;
    return a.label.localeCompare(b.label);
  });
}

function ProgressBar({
  pct,
  trackColor,
}: {
  pct: number;
  trackColor: string;
}) {
  return (
    <View style={[styles.track, { backgroundColor: trackColor }]}>
      <View
        style={[
          styles.fill,
          { width: `${Math.max(2, Math.min(100, pct))}%`, backgroundColor: ACCENT },
        ]}
      />
    </View>
  );
}

export function SubjectMasteryTree({ profileUserId }: SubjectMasteryTreeProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const flagOn = useFeatureFlag('mastery_tree');
  const isOwn = !!currentUserId && (!profileUserId || profileUserId === currentUserId);

  const [subjects, setSubjects] = useState<MasterySubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!isOwn || !flagOn) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchMasteryTree()
      .then((s) => {
        if (!cancelled) setSubjects(mergeSubjects(s));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOwn, flagOn]);

  const toggle = useCallback((subject: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => ({ ...prev, [subject]: !prev[subject] }));
  }, []);

  const summary = useMemo(() => {
    if (subjects.length === 0) return null;
    const due = subjects.reduce((n, s) => n + (s.dueCount || 0), 0);
    const avg = Math.round(
      subjects.reduce((n, s) => n + s.mastery, 0) / subjects.length,
    );
    return { due, avg, count: subjects.length };
  }, [subjects]);

  if (!isOwn || !flagOn || loading || subjects.length === 0) return null;

  const visible = showAll ? subjects : subjects.slice(0, INITIAL_VISIBLE);
  const hiddenCount = Math.max(0, subjects.length - INITIAL_VISIBLE);
  const divider = isDark ? colors.border : '#EEF2F6';
  const track = isDark ? '#ffffff12' : '#F1F5F9';
  const muted = colors.textSecondary;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.header, { borderBottomColor: divider }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('profile.performance.subjectMastery')}
        </Text>
        {summary ? (
          <Text style={[styles.meta, { color: muted }]}>
            {t('profile.performance.masterySummary', {
              count: summary.count,
              avg: summary.avg,
              defaultValue: `${summary.count} subjects · ${summary.avg}% avg`,
            })}
            {summary.due > 0
              ? ` · ${t('profile.performance.masteryDue', { count: summary.due })}`
              : ''}
          </Text>
        ) : null}
      </View>

      <View>
        {visible.map((subj, index) => {
          const open = !!expanded[subj.subject];
          const isLast = index === visible.length - 1 && hiddenCount === 0;

          return (
            <View
              key={subj.subject}
              style={!isLast ? [styles.rowWrap, { borderBottomColor: divider }] : styles.rowWrapLast}
            >
              <Pressable
                onPress={() => toggle(subj.subject)}
                style={styles.row}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
              >
                <View style={styles.rowMain}>
                  <View style={styles.rowTop}>
                    <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
                      {prettyLabel(subj.label || subj.subject)}
                    </Text>
                    <Text style={[styles.pct, { color: colors.text }]}>{subj.mastery}%</Text>
                  </View>
                  <ProgressBar pct={subj.mastery} trackColor={track} />
                  {subj.dueCount > 0 ? (
                    <Text style={[styles.due, { color: muted }]}>
                      {t('profile.performance.masteryDue', { count: subj.dueCount })}
                    </Text>
                  ) : null}
                </View>
                <Ionicons
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={muted}
                  style={styles.chevron}
                />
              </Pressable>

              {open ? (
                <View style={[styles.topics, { borderLeftColor: divider }]}>
                  {subj.topics.length === 0 ? (
                    <Text style={[styles.topicEmpty, { color: muted }]}>
                      {t('profile.performance.noTopics', 'No topics yet')}
                    </Text>
                  ) : (
                    subj.topics.map((tp) => (
                      <View key={tp.label} style={styles.topicRow}>
                        <Text style={[styles.topicLabel, { color: muted }]} numberOfLines={1}>
                          {prettyLabel(tp.label)}
                        </Text>
                        <View style={styles.topicBarWrap}>
                          <ProgressBar pct={tp.mastery} trackColor={track} />
                        </View>
                        <Text style={[styles.topicPct, { color: colors.text }]}>{tp.mastery}%</Text>
                      </View>
                    ))
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {hiddenCount > 0 ? (
        <Pressable
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowAll((v) => !v);
          }}
          style={styles.moreBtn}
          hitSlop={8}
        >
          <Text style={styles.moreText}>
            {showAll
              ? t('profile.performance.showLess', 'Show less')
              : t('profile.performance.showMoreSubjects', {
                  count: hiddenCount,
                  defaultValue: `Show ${hiddenCount} more`,
                })}
          </Text>
        </Pressable>
      ) : null}
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
    marginBottom: 4,
    paddingBottom: 12,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEF2F6',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  meta: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  rowWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  rowWrapLast: {
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  pct: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'right',
  },
  due: {
    fontSize: 11,
    fontWeight: '500',
  },
  chevron: {
    marginTop: -2,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  topics: {
    marginTop: 12,
    marginLeft: 2,
    paddingLeft: 12,
    borderLeftWidth: 2,
    gap: 10,
  },
  topicEmpty: {
    fontSize: 12,
    fontWeight: '500',
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topicLabel: {
    width: '34%',
    fontSize: 12,
    fontWeight: '500',
  },
  topicBarWrap: {
    flex: 1,
  },
  topicPct: {
    width: 36,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  moreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  moreText: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
  },
});
