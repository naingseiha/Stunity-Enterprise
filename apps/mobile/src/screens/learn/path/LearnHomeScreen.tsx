/**
 * LearnHomeScreen — the Learn tab's main screen.
 *
 * Playful learning home in the style of top education apps:
 *   · greeting hero with avatar + level badge
 *   · week-streak calendar card (live weekActivity from the stats summary)
 *   · subject card with an SVG completion ring + "Continue" CTA
 *   · winding unit path with a dashed SVG connector behind big colorful
 *     nodes (progress ring + START bubble on the active unit)
 *   · streak-nudge card when the learner hasn't studied today
 *   · colorful onboarding (grade tiles, subject cards, ready-grade hints)
 *   · tinted course mini-cards linking to the full course hub
 *
 * Progress derives from GET /learn/path; practice answers flow through the
 * reels pipeline, so finishing a session and returning here moves the path.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useThemeContext } from '@/contexts';
import { Haptics } from '@/services/haptics';
import { useAuthStore } from '@/stores';
import { statsAPI, PerformanceStatsSummary } from '@/services/stats';
import { topicsService, TopicSubject } from '@/services/topics.service';
import {
  learnPathService,
  LearnerProfile,
  LearnPath,
  LearnUnit,
} from '@/services/learnPath.service';
import { fetchLearnHub } from '../learnHubCache';
// Side-effect import: registers the learn-hub course normalizers that
// fetchLearnHub requires (api/learn.ts calls _setLearnHubNormalizers on load).
import '@/api/learn';
import { LearnStackScreenProps } from '@/navigation/types';

type NavigationProp = LearnStackScreenProps<'LearnHome'>['navigation'];

const GRADES = ['7', '8', '9', '10', '11', '12'];

/** Horizontal offsets tracing the winding path (Duolingo-style). */
const SERPENTINE = [0, 52, 82, 52, 0, -52, -82, -52];

/** Bold flat accent colors, cycled along the path / tiles / cards. */
const ACCENTS = ['#0EA5E9', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899', '#F97316'];

/** Subject icon by MoEYS category-ish code prefix. */
const subjectIcon = (code: string): keyof typeof Ionicons.glyphMap => {
  if (code.startsWith('MATH')) return 'calculator';
  if (code.startsWith('PHY')) return 'magnet';
  if (code.startsWith('CHEM')) return 'flask';
  if (code.startsWith('BIO')) return 'leaf';
  if (code.startsWith('ENG')) return 'chatbubbles';
  if (code.startsWith('ICT')) return 'laptop';
  return 'book';
};

const NODE_SIZE = 76;
const RING_SIZE = 94;
const SLOT_H = 156;
const PATH_TOP_PAD = 46; // room for the START bubble above the first node

export function LearnHomeScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<NavigationProp>();
  const { width: screenWidth } = useWindowDimensions();
  const isKh = i18n.language?.startsWith('km');
  const { user } = useAuthStore();
  const userId = user?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [path, setPath] = useState<LearnPath | null>(null);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [stats, setStats] = useState<PerformanceStatsSummary | null>(null);
  const [hubCourses, setHubCourses] = useState<any[]>([]);
  const [editingPath, setEditingPath] = useState(false);

  // Onboarding state
  const [obGrade, setObGrade] = useState<string | null>(null);
  const [obSubjects, setObSubjects] = useState<TopicSubject[] | null>(null);
  const [obSelected, setObSelected] = useState<Set<string>>(new Set());
  const [obSaving, setObSaving] = useState(false);
  const [readyGrades, setReadyGrades] = useState<Set<string>>(new Set());

  const subjectName = useCallback(
    (s: { name: string; nameEn: string | null; nameKh: string | null }) =>
      isKh ? s.nameKh || s.name : s.nameEn || s.name,
    [isKh],
  );
  const unitName = useCallback((u: LearnUnit) => (isKh ? u.nameKh || u.name : u.name), [isKh]);

  const loadPath = useCallback(async (subjectId: string) => {
    const data = await learnPathService.getPath(subjectId);
    setPath(data);
  }, []);

  const load = useCallback(async () => {
    try {
      const [p] = await Promise.all([
        learnPathService.getProfile(),
        // Secondary data — each guarded, never blocks the path render.
        userId
          ? statsAPI
              .getUserStatsSummary(userId)
              .then(setStats)
              .catch(() => {})
          : Promise.resolve(),
        fetchLearnHub({ userId })
          .then((hub) => setHubCourses(hub?.courses ?? []))
          .catch(() => {}),
      ]);
      setProfile(p);
      if (p && p.subjects.length > 0) {
        const subjectId =
          activeSubjectId && p.subjects.some((s) => s.id === activeSubjectId)
            ? activeSubjectId
            : p.subjects[0].id;
        setActiveSubjectId(subjectId);
        await loadPath(subjectId);
      }
    } catch (err) {
      console.warn('[LearnHome] load failed', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubjectId, loadPath, userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Onboarding: which grades have ready taxonomies (hint dots + quick-jump).
  const showOnboarding = !loading && (editingPath || !profile || profile.subjects.length === 0);
  useEffect(() => {
    if (!showOnboarding || readyGrades.size > 0) return;
    topicsService
      .getSubjects()
      .then((all) => setReadyGrades(new Set(all.map((s) => s.grade))))
      .catch(() => {});
  }, [showOnboarding, readyGrades.size]);

  // Onboarding: load pickable subjects when a grade is chosen.
  useEffect(() => {
    if (!obGrade) return;
    setObSubjects(null);
    topicsService
      .getSubjects(obGrade)
      .then((subjects) => {
        setObSubjects(subjects);
        setObSelected((prev) => new Set([...prev].filter((id) => subjects.some((s) => s.id === id))));
      })
      .catch(() => setObSubjects([]));
  }, [obGrade]);

  const startEditing = () => {
    Haptics.selectionAsync();
    setObGrade(profile?.grade ?? null);
    setObSelected(new Set(profile?.subjects.map((s) => s.id) ?? []));
    setEditingPath(true);
  };

  const completeOnboarding = async () => {
    if (!obGrade || obSelected.size === 0) return;
    setObSaving(true);
    try {
      await learnPathService.saveProfile(obGrade, [...obSelected]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingPath(false);
      setLoading(true);
      setActiveSubjectId(null);
      await load();
    } catch (err) {
      console.warn('[LearnHome] onboarding save failed', err);
    } finally {
      setObSaving(false);
    }
  };

  const switchSubject = async (subjectId: string) => {
    Haptics.selectionAsync();
    setActiveSubjectId(subjectId);
    setPath(null);
    await loadPath(subjectId);
  };

  const openUnit = (unit: LearnUnit) => {
    if (unit.state === 'locked' || unit.state === 'no_content') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const params = { topicId: unit.topicId, title: unitName(unit) };
    if (unit.hasLesson) navigation.navigate('UnitLesson', params);
    else navigation.navigate('PracticeSession', params);
  };

  const activeUnit = useMemo(
    () => path?.units.find((u) => u.state === 'unlocked') ?? null,
    [path],
  );

  const topCourses = useMemo(() => {
    return [...hubCourses]
      .sort(
        (a, b) =>
          (b.isFeatured ? 100000 : 0) + Math.round((b.rating ?? 0) * 1000) + (b.enrolledCount ?? 0) -
          ((a.isFeatured ? 100000 : 0) + Math.round((a.rating ?? 0) * 1000) + (a.enrolledCount ?? 0)),
      )
      .slice(0, 4);
  }, [hubCourses]);

  const greetingKey = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'learn.path.goodMorning';
    if (h < 18) return 'learn.path.goodAfternoon';
    return 'learn.path.goodEvening';
  }, []);

  const weekDays = isKh
    ? ['ច', 'អ', 'ពុ', 'ព្រ', 'សុ', 'ស', 'អា']
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayIndex = (new Date().getDay() + 6) % 7; // Mon=0 … Sun=6

  // ── Hero: greeting + avatar ───────────────────────────────

  const renderHero = () => (
    <View style={styles.hero}>
      <View style={{ flex: 1 }}>
        <Text style={styles.heroKicker}>{t(greetingKey)} 👋</Text>
        <Text style={styles.heroName} numberOfLines={1}>
          {user?.firstName || t('learn.path.title')}
        </Text>
      </View>
      <View style={styles.heroRight}>
        <View style={styles.xpPillHero}>
          <Ionicons name="flash" size={14} color="#F59E0B" />
          <Text style={styles.xpPillHeroText}>{stats?.xp ?? 0}</Text>
        </View>
        <View>
          {user?.profilePictureUrl ? (
            <Image source={{ uri: user.profilePictureUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{(user?.firstName || 'S')[0]}</Text>
            </View>
          )}
          {!!stats?.level && (
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{stats.level}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  // ── Week-streak calendar card ─────────────────────────────

  const renderWeekCard = () => (
    <View style={styles.weekCard}>
      <View style={styles.weekCardTop}>
        <Text style={styles.weekCardTitle}>{t('learn.path.thisWeek')}</Text>
        <View style={styles.streakBadge}>
          <Ionicons name="flame" size={16} color="#F97316" />
          <Text style={styles.streakBadgeText}>{stats?.currentStreak ?? 0}</Text>
        </View>
      </View>
      <View style={styles.weekRow}>
        {weekDays.map((d, i) => {
          const active = !!stats?.weekActivity?.[i];
          const isToday = i === todayIndex;
          return (
            <View key={`${d}-${i}`} style={styles.weekDay}>
              <View
                style={[
                  styles.weekDot,
                  active && styles.weekDotActive,
                  isToday && styles.weekDotToday,
                ]}
              >
                {active ? (
                  <Ionicons name="flame" size={15} color="#FFFFFF" />
                ) : (
                  <View style={styles.weekDotEmpty} />
                )}
              </View>
              <Text style={[styles.weekDayLabel, isToday && styles.weekDayLabelToday]}>{d}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  // ── Streak nudge ──────────────────────────────────────────

  const renderNudge = () => {
    if (!activeUnit || stats?.studiedToday) return null;
    return (
      <TouchableOpacity style={styles.nudgeCard} activeOpacity={0.85} onPress={() => openUnit(activeUnit)}>
        <View style={styles.nudgeIcon}>
          <Ionicons name="flame" size={22} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.nudgeTitle}>
            {stats?.currentStreak ? t('learn.path.nudgeKeepStreak') : t('learn.path.nudgeStartToday')}
          </Text>
          <Text style={styles.nudgeBody} numberOfLines={2}>
            {t('learn.path.nudgeBody', { unit: unitName(activeUnit) })}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    );
  };

  // ── Subject card with completion ring + Continue ──────────

  const renderSubjectCard = () => {
    if (!path) return null;
    const total = path.units.length;
    const done = path.units.filter((u) => u.state === 'completed').length;
    const pct = total > 0 ? done / total : 0;
    const ring = 58;
    const rc = 2 * Math.PI * ((ring - 8) / 2);
    const code = (path.subject as any).code ?? '';

    return (
      <View style={styles.subjectCard}>
        {/* Decorative flat circles */}
        <View style={[styles.deco, { width: 130, height: 130, top: -46, right: -34 }]} />
        <View style={[styles.deco, { width: 70, height: 70, bottom: -26, right: 66 }]} />

        <View style={styles.subjectCardRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.subjectKickerPill}>
              <Ionicons name={subjectIcon(code)} size={13} color="#FFFFFF" />
              <Text style={styles.subjectKickerText}>
                {t('learn.path.gradeShort', { grade: path.subject.grade })}
              </Text>
            </View>
            <Text style={styles.subjectTitle}>{subjectName(path.subject)}</Text>
            <Text style={styles.subjectMeta}>
              {t('learn.path.unitsDone', { done, total })}
            </Text>
          </View>
          <View style={styles.subjectRing}>
            <Svg width={ring} height={ring}>
              <Circle cx={ring / 2} cy={ring / 2} r={(ring - 8) / 2} stroke="rgba(255,255,255,0.3)" strokeWidth={6} fill="none" />
              <Circle
                cx={ring / 2}
                cy={ring / 2}
                r={(ring - 8) / 2}
                stroke="#FFFFFF"
                strokeWidth={6}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${rc * pct} ${rc}`}
                transform={`rotate(-90 ${ring / 2} ${ring / 2})`}
              />
            </Svg>
            <Text style={styles.subjectRingText}>{Math.round(pct * 100)}%</Text>
          </View>
        </View>

        {activeUnit && (
          <TouchableOpacity style={styles.continueButton} onPress={() => openUnit(activeUnit)}>
            <Text style={styles.continueButtonText}>{t('learn.path.continueLearning')}</Text>
            <Ionicons name="arrow-forward" size={16} color="#0EA5E9" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── Onboarding ────────────────────────────────────────────

  const renderOnboarding = () => (
    <View style={styles.obContainer}>
      <View style={styles.obHero}>
        <View style={styles.obHeroArt}>
          <View style={[styles.obHeroCircle, { backgroundColor: '#8B5CF6', top: 2, left: -14, width: 34, height: 34 }]}>
            <Ionicons name="star" size={16} color="#FFFFFF" />
          </View>
          <View style={[styles.obHeroCircle, { backgroundColor: '#F59E0B', bottom: -4, right: -16, width: 38, height: 38 }]}>
            <Ionicons name="calculator" size={17} color="#FFFFFF" />
          </View>
          <View style={[styles.obHeroCircle, { backgroundColor: '#10B981', top: -12, right: 6, width: 26, height: 26 }]}>
            <Ionicons name="flask" size={13} color="#FFFFFF" />
          </View>
          <View style={styles.obHeroBadge}>
            <Ionicons name="school" size={40} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.obTitle}>{t('learn.path.onboardTitle')}</Text>
        <Text style={styles.obSubtitle}>{t('learn.path.onboardSubtitle')}</Text>
      </View>

      <Text style={styles.obSectionLabel}>{t('learn.path.pickGrade')}</Text>
      <View style={styles.gradeGrid}>
        {GRADES.map((g, i) => {
          const accent = ACCENTS[i % ACCENTS.length];
          const selected = obGrade === g;
          const ready = readyGrades.has(g);
          return (
            <TouchableOpacity
              key={g}
              style={[
                styles.gradeCell,
                { backgroundColor: selected ? accent : isDark ? colors.card : `${accent}14` },
                selected && { borderColor: accent },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setObGrade(g);
              }}
            >
              <Text style={[styles.gradeCellText, { color: selected ? '#FFFFFF' : accent }]}>
                {t('learn.path.gradeShort', { grade: g })}
              </Text>
              {ready && !selected && <View style={[styles.gradeReadyDot, { backgroundColor: accent }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {obGrade && (
        <>
          <Text style={styles.obSectionLabel}>{t('learn.path.pickSubjects')}</Text>
          {!obSubjects && (
            <ActivityIndicator style={{ marginVertical: 16 }} color={colors.textSecondary} />
          )}
          {obSubjects && obSubjects.length === 0 && (
            <View style={styles.obEmptyCard}>
              <Ionicons name="hourglass-outline" size={26} color={colors.textSecondary} />
              <Text style={styles.obEmptyText}>{t('learn.path.noSubjectsForGrade')}</Text>
              {readyGrades.size > 0 && (
                <View style={styles.readyRow}>
                  <Text style={styles.readyLabel}>{t('learn.path.readyGrades')}:</Text>
                  {[...readyGrades].sort().map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={styles.readyChip}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setObGrade(g);
                      }}
                    >
                      <Text style={styles.readyChipText}>{t('learn.path.gradeShort', { grade: g })}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
          <View style={styles.subjectGrid}>
            {obSubjects?.map((s, i) => {
              const accent = ACCENTS[i % ACCENTS.length];
              const selected = obSelected.has(s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.subjectCell,
                    { backgroundColor: selected ? accent : colors.card },
                    !selected && { borderColor: colors.border, borderWidth: 1 },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    const next = new Set(obSelected);
                    if (selected) next.delete(s.id);
                    else next.add(s.id);
                    setObSelected(next);
                  }}
                >
                  <View style={[styles.subjectCellIcon, { backgroundColor: selected ? 'rgba(255,255,255,0.25)' : `${accent}22` }]}>
                    <Ionicons name={subjectIcon(s.code)} size={20} color={selected ? '#FFFFFF' : accent} />
                  </View>
                  <Text style={[styles.subjectCellName, selected && { color: '#FFFFFF' }]} numberOfLines={1}>
                    {subjectName(s)}
                  </Text>
                  <Text style={[styles.subjectCellMeta, selected && { color: 'rgba(255,255,255,0.85)' }]}>
                    {t('learn.path.topicsCount', { count: s.topicCount })}
                  </Text>
                  {selected && (
                    <View style={styles.subjectCellCheck}>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      <TouchableOpacity
        style={[
          styles.startButton,
          (!obGrade || obSelected.size === 0 || obSaving) && styles.startButtonDisabled,
        ]}
        disabled={!obGrade || obSelected.size === 0 || obSaving}
        onPress={completeOnboarding}
      >
        <Text style={styles.startButtonText}>
          {obSaving ? t('learn.path.saving') : t('learn.path.startLearning')}
        </Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>
      {editingPath && (
        <TouchableOpacity style={styles.cancelEdit} onPress={() => setEditingPath(false)}>
          <Text style={styles.cancelEditText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Serpentine path with SVG connector ────────────────────

  const nodeCenter = (index: number) => ({
    x: screenWidth / 2 + SERPENTINE[index % SERPENTINE.length],
    y: PATH_TOP_PAD + index * SLOT_H + RING_SIZE / 2,
  });

  const renderConnector = (count: number) => {
    if (count < 2) return null;
    let d = '';
    for (let i = 0; i < count - 1; i++) {
      const a = nodeCenter(i);
      const b = nodeCenter(i + 1);
      const midY = (a.y + b.y) / 2;
      d += `M ${a.x} ${a.y} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y} `;
    }
    return (
      <Svg
        width={screenWidth}
        height={PATH_TOP_PAD + count * SLOT_H}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Path
          d={d}
          stroke={isDark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.3)'}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray="1 14"
          fill="none"
        />
      </Svg>
    );
  };

  const renderNode = (unit: LearnUnit, index: number, activeIndex: number) => {
    const accent = ACCENTS[index % ACCENTS.length];
    const center = nodeCenter(index);
    const completed = unit.state === 'completed';
    const active = index === activeIndex && unit.state === 'unlocked';
    const locked = unit.state === 'locked';
    const comingSoon = unit.state === 'no_content';
    const pct = unit.target > 0 ? Math.min(1, unit.correct / unit.target) : 0;
    const circumference = 2 * Math.PI * ((RING_SIZE - 6) / 2);

    return (
      <TouchableOpacity
        key={unit.topicId}
        style={[
          styles.nodeWrap,
          { position: 'absolute', top: center.y - RING_SIZE / 2 - (active ? 38 : 0), left: center.x - 95 },
        ]}
        onPress={() => openUnit(unit)}
        activeOpacity={locked || comingSoon ? 1 : 0.8}
      >
        {active && (
          <View style={[styles.startBubble, { borderColor: accent }]}>
            <Text style={[styles.startBubbleText, { color: accent }]}>{t('learn.path.start')}</Text>
            <View style={[styles.startBubbleArrow, { borderColor: accent }]} />
          </View>
        )}

        <View style={styles.ringHolder}>
          {active && (
            <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={(RING_SIZE - 6) / 2}
                stroke={isDark ? colors.border : '#E5E7EB'}
                strokeWidth={5}
                fill="none"
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={(RING_SIZE - 6) / 2}
                stroke={accent}
                strokeWidth={5}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${circumference * pct} ${circumference}`}
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>
          )}
          <View
            style={[
              styles.node,
              { backgroundColor: completed ? '#10B981' : active ? accent : colors.surfaceVariant },
              (locked || comingSoon) && styles.nodeLocked,
              !locked && !comingSoon && {
                borderBottomWidth: 6,
                borderBottomColor: 'rgba(0,0,0,0.25)',
              },
            ]}
          >
            {completed ? (
              <Ionicons name="checkmark" size={32} color="#FFFFFF" />
            ) : locked ? (
              <Ionicons name="lock-closed" size={23} color={colors.textTertiary} />
            ) : comingSoon ? (
              <Ionicons name="time-outline" size={23} color={colors.textTertiary} />
            ) : (
              <Ionicons name="star" size={30} color="#FFFFFF" />
            )}
          </View>
        </View>

        <Text
          style={[styles.nodeLabel, (locked || comingSoon) && { color: colors.textTertiary }]}
          numberOfLines={2}
        >
          {unitName(unit)}
        </Text>
        {!locked && !comingSoon && unit.target > 0 && (
          <Text style={[styles.nodeMeta, completed && { color: '#10B981' }]}>
            {completed
              ? t('learn.path.completed')
              : t('learn.path.unitProgress', { correct: unit.correct, target: unit.target })}
          </Text>
        )}
        {comingSoon && <Text style={styles.nodeMeta}>{t('learn.path.comingSoon')}</Text>}
      </TouchableOpacity>
    );
  };

  const renderPath = () => {
    if (!path) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.textSecondary} />;
    const activeIndex = path.units.findIndex((u) => u.state === 'unlocked');

    return (
      <>
        {profile && profile.subjects.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.switcherRow}
          >
            {profile.subjects.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.switcherChip, activeSubjectId === s.id && styles.switcherChipActive]}
                onPress={() => switchSubject(s.id)}
              >
                <Text
                  style={[
                    styles.switcherChipText,
                    activeSubjectId === s.id && styles.switcherChipTextActive,
                  ]}
                >
                  {subjectName(s)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={[styles.pathArea, { height: PATH_TOP_PAD + path.units.length * SLOT_H }]}>
          {renderConnector(path.units.length)}
          {path.units.map((u, i) => renderNode(u, i, activeIndex))}
        </View>
      </>
    );
  };

  // ── Courses section (secondary) ───────────────────────────

  const renderCourses = () => {
    if (topCourses.length === 0) return null;
    return (
      <View style={styles.coursesSection}>
        <View style={styles.coursesHeader}>
          <Text style={styles.coursesTitle}>{t('learn.path.coursesSection')}</Text>
          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={() => navigation.navigate('LearnHub', undefined)}
          >
            <Text style={styles.seeAllText}>{t('learn.path.seeAll')}</Text>
            <Ionicons name="chevron-forward" size={14} color="#0EA5E9" />
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.coursesRow}
        >
          {topCourses.map((course, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            return (
              <TouchableOpacity
                key={course.id ?? i}
                style={[styles.courseCard, { backgroundColor: isDark ? colors.card : `${accent}14` }]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
              >
                <View style={[styles.courseCardIcon, { backgroundColor: accent }]}>
                  <Ionicons name="book" size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.courseCardTitle} numberOfLines={2}>
                  {course.title}
                </Text>
                <View style={styles.courseCardMeta}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.courseCardMetaText}>
                    {(course.rating ?? 0).toFixed(1)} · {course.enrolledCount ?? 0}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.textSecondary}
          />
        }
      >
        {renderHero()}
        {loading && <ActivityIndicator style={{ marginTop: 60 }} color={colors.textSecondary} />}
        {showOnboarding && renderOnboarding()}
        {!loading && !showOnboarding && (
          <>
            {renderWeekCard()}
            {renderNudge()}
            {renderSubjectCard()}
            {!!profile && (
              <TouchableOpacity style={styles.editPathLink} onPress={startEditing}>
                <Ionicons name="options-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.editPathLinkText}>{t('learn.path.editPath')}</Text>
              </TouchableOpacity>
            )}
            {renderPath()}
            {renderCourses()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: 48 },

    // Hero
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 6,
      gap: 12,
    },
    heroKicker: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    heroName: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5, marginTop: 2 },
    heroRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    xpPillHero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    xpPillHeroText: { fontSize: 14, fontWeight: '800', color: colors.text },
    avatar: { width: 46, height: 46, borderRadius: 23 },
    avatarFallback: { backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
    levelBadge: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 4,
      backgroundColor: '#F59E0B',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },
    levelBadgeText: { fontSize: 10, fontWeight: '900', color: '#FFFFFF' },

    // Week streak card
    weekCard: {
      marginHorizontal: 20,
      marginTop: 10,
      padding: 16,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    weekCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    weekCardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      backgroundColor: isDark ? '#431407' : '#FFF7ED',
    },
    streakBadgeText: { fontSize: 15, fontWeight: '900', color: '#F97316' },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
    weekDay: { alignItems: 'center', gap: 6 },
    weekDot: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceVariant,
    },
    weekDotActive: { backgroundColor: '#F97316' },
    weekDotToday: { borderWidth: 2, borderColor: '#F97316' },
    weekDotEmpty: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    weekDayLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
    weekDayLabelToday: { color: '#F97316', fontWeight: '800' },

    // Nudge
    nudgeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 20,
      marginTop: 12,
      padding: 14,
      borderRadius: 18,
      backgroundColor: '#F97316',
    },
    nudgeIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    nudgeTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
    nudgeBody: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginTop: 2 },

    // Subject card
    subjectCard: {
      marginHorizontal: 20,
      marginTop: 12,
      padding: 18,
      borderRadius: 22,
      backgroundColor: '#0EA5E9',
      overflow: 'hidden',
    },
    deco: {
      position: 'absolute',
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    subjectCardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    subjectKickerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.22)',
    },
    subjectKickerText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.4 },
    subjectTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: 8 },
    subjectMeta: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 4 },
    subjectRing: { alignItems: 'center', justifyContent: 'center' },
    subjectRingText: {
      position: 'absolute',
      fontSize: 13,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    continueButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 16,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: '#FFFFFF',
    },
    continueButtonText: { fontSize: 15, fontWeight: '800', color: '#0EA5E9' },
    editPathLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      marginTop: 10,
    },
    editPathLinkText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },

    // Switcher
    switcherRow: { paddingHorizontal: 20, gap: 8, paddingVertical: 10 },
    switcherChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    switcherChipActive: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
    switcherChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    switcherChipTextActive: { color: '#FFFFFF' },

    // Path
    pathArea: { marginTop: 8 },
    nodeWrap: { alignItems: 'center', width: 190 },
    ringHolder: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    node: {
      width: NODE_SIZE,
      height: NODE_SIZE,
      borderRadius: NODE_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nodeLocked: { borderWidth: 1, borderColor: colors.border },
    nodeLabel: {
      marginTop: 6,
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      lineHeight: 18,
    },
    nodeMeta: { marginTop: 2, fontSize: 11.5, fontWeight: '600', color: colors.textSecondary },
    startBubble: {
      marginBottom: 8,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      alignItems: 'center',
    },
    startBubbleText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    startBubbleArrow: {
      position: 'absolute',
      bottom: -6,
      width: 10,
      height: 10,
      backgroundColor: colors.card,
      borderRightWidth: 1.5,
      borderBottomWidth: 1.5,
      transform: [{ rotate: '45deg' }],
    },

    // Onboarding
    obContainer: { padding: 20 },
    obHero: { alignItems: 'center', marginBottom: 28, gap: 10 },
    obHeroArt: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
    obHeroBadge: {
      width: 84,
      height: 84,
      borderRadius: 28,
      backgroundColor: '#0EA5E9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    obHeroCircle: {
      position: 'absolute',
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    obTitle: { fontSize: 23, fontWeight: '800', color: colors.text, textAlign: 'center' },
    obSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
    obSectionLabel: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 12, marginTop: 10 },
    gradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    gradeCell: {
      width: '30.5%',
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    gradeCellText: { fontSize: 15, fontWeight: '800' },
    gradeReadyDot: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    subjectCell: {
      width: '47.5%',
      padding: 14,
      borderRadius: 18,
      gap: 8,
    },
    subjectCellIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    subjectCellName: { fontSize: 14, fontWeight: '800', color: colors.text },
    subjectCellMeta: { fontSize: 11.5, fontWeight: '600', color: colors.textSecondary },
    subjectCellCheck: { position: 'absolute', top: 10, right: 10 },
    obEmptyCard: {
      alignItems: 'center',
      gap: 10,
      padding: 20,
      borderRadius: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    obEmptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
    readyRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    readyLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    readyChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: '#0EA5E9',
    },
    readyChipText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
    startButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 28,
      paddingVertical: 16,
      borderRadius: 18,
      backgroundColor: '#0EA5E9',
      borderBottomWidth: 4,
      borderBottomColor: 'rgba(0,0,0,0.25)',
    },
    startButtonDisabled: { opacity: 0.4 },
    startButtonText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
    cancelEdit: { alignItems: 'center', marginTop: 14 },
    cancelEditText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },

    // Courses
    coursesSection: {
      marginTop: 18,
      paddingTop: 18,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    coursesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    coursesTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
    seeAllButton: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    seeAllText: { fontSize: 13, fontWeight: '700', color: '#0EA5E9' },
    coursesRow: { paddingHorizontal: 20, gap: 12 },
    courseCard: {
      width: 156,
      padding: 14,
      borderRadius: 18,
      gap: 8,
      borderWidth: isDark ? 1 : 0,
      borderColor: colors.border,
    },
    courseCardIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    courseCardTitle: { fontSize: 13, fontWeight: '700', color: colors.text, lineHeight: 18 },
    courseCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    courseCardMetaText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  });
