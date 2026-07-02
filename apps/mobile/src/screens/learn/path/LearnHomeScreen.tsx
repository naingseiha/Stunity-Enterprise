/**
 * LearnHomeScreen — the Learn tab's main screen.
 *
 * Duolingo-style learning home: streak/XP hero, a winding (serpentine) unit
 * path with big colorful nodes and a progress ring on the active unit, inline
 * grade/subject onboarding on first visit, and a compact Courses section at
 * the bottom that links to the full course hub (the old LearnHub screen).
 *
 * Progress comes from GET /learn/path (derived server-side); practice answers
 * flow through the reels pipeline, so finishing a session and coming back
 * here (focus refresh) moves the path.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
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
const SERPENTINE = [0, 46, 74, 46, 0, -46, -74, -46];

/** Bold flat unit colors, cycled along the path. */
const UNIT_COLORS = ['#0EA5E9', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899', '#F97316'];

const NODE_SIZE = 72;
const RING_SIZE = 88;

export function LearnHomeScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<NavigationProp>();
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

  // Onboarding: load pickable subjects when a grade is chosen.
  useEffect(() => {
    if (!obGrade) return;
    setObSubjects(null);
    topicsService
      .getSubjects(obGrade)
      .then((subjects) => {
        setObSubjects(subjects);
        // Keep still-valid selections when editing an existing path.
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
    navigation.navigate('PracticeSession', { topicId: unit.topicId, title: unitName(unit) });
  };

  const topCourses = useMemo(() => {
    return [...hubCourses]
      .sort(
        (a, b) =>
          (b.isFeatured ? 100000 : 0) + Math.round((b.rating ?? 0) * 1000) + (b.enrolledCount ?? 0) -
          ((a.isFeatured ? 100000 : 0) + Math.round((a.rating ?? 0) * 1000) + (a.enrolledCount ?? 0)),
      )
      .slice(0, 4);
  }, [hubCourses]);

  // ── Hero header ───────────────────────────────────────────

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{t('learn.path.title')}</Text>
      <View style={styles.headerPills}>
        <View style={styles.pill}>
          <Ionicons name="flame" size={15} color="#F97316" />
          <Text style={styles.pillText}>{stats?.currentStreak ?? 0}</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="flash" size={15} color="#F59E0B" />
          <Text style={styles.pillText}>{stats?.xp ?? 0}</Text>
        </View>
        {!!profile && (
          <TouchableOpacity style={styles.pill} onPress={startEditing}>
            <Ionicons name="options-outline" size={15} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ── Onboarding ────────────────────────────────────────────

  const renderOnboarding = () => (
    <View style={styles.obContainer}>
      <View style={styles.obHero}>
        <View style={styles.obHeroBadge}>
          <Ionicons name="school" size={36} color="#FFFFFF" />
        </View>
        <Text style={styles.obTitle}>{t('learn.path.onboardTitle')}</Text>
        <Text style={styles.obSubtitle}>{t('learn.path.onboardSubtitle')}</Text>
      </View>

      <Text style={styles.obSectionLabel}>{t('learn.path.pickGrade')}</Text>
      <View style={styles.gradeGrid}>
        {GRADES.map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.gradeCell, obGrade === g && styles.gradeCellSelected]}
            onPress={() => {
              Haptics.selectionAsync();
              setObGrade(g);
            }}
          >
            <Text style={[styles.gradeCellText, obGrade === g && styles.gradeCellTextSelected]}>
              {t('learn.path.gradeShort', { grade: g })}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {obGrade && (
        <>
          <Text style={styles.obSectionLabel}>{t('learn.path.pickSubjects')}</Text>
          {!obSubjects && (
            <ActivityIndicator style={{ marginVertical: 16 }} color={colors.textSecondary} />
          )}
          {obSubjects && obSubjects.length === 0 && (
            <Text style={styles.obEmpty}>{t('learn.path.noSubjectsForGrade')}</Text>
          )}
          <View style={styles.subjectWrap}>
            {obSubjects?.map((s) => {
              const selected = obSelected.has(s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.subjectChip, selected && styles.subjectChipSelected]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    const next = new Set(obSelected);
                    if (selected) next.delete(s.id);
                    else next.add(s.id);
                    setObSelected(next);
                  }}
                >
                  {selected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  <Text style={[styles.subjectChipText, selected && styles.subjectChipTextSelected]}>
                    {subjectName(s)}
                  </Text>
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

  // ── Path nodes ────────────────────────────────────────────

  const renderNode = (unit: LearnUnit, index: number, activeIndex: number) => {
    const color = UNIT_COLORS[index % UNIT_COLORS.length];
    const offset = SERPENTINE[index % SERPENTINE.length];
    const completed = unit.state === 'completed';
    const active = index === activeIndex && unit.state === 'unlocked';
    const locked = unit.state === 'locked';
    const comingSoon = unit.state === 'no_content';
    const pct = unit.target > 0 ? Math.min(1, unit.correct / unit.target) : 0;

    const circumference = 2 * Math.PI * ((RING_SIZE - 6) / 2);

    return (
      <View key={unit.topicId} style={styles.nodeSlot}>
        <TouchableOpacity
          style={[styles.nodeWrap, { transform: [{ translateX: offset }] }]}
          onPress={() => openUnit(unit)}
          activeOpacity={locked || comingSoon ? 1 : 0.8}
        >
          {active && (
            <View style={styles.startBubble}>
              <Text style={styles.startBubbleText}>{t('learn.path.start')}</Text>
              <View style={styles.startBubbleArrow} />
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
                  stroke={color}
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
                { backgroundColor: completed ? '#10B981' : active ? color : colors.surfaceVariant },
                (locked || comingSoon) && styles.nodeLocked,
                // Solid "3D" base edge, Duolingo-style, kept flat (no gradient).
                !locked && !comingSoon && {
                  borderBottomWidth: 5,
                  borderBottomColor: 'rgba(0,0,0,0.22)',
                },
              ]}
            >
              {completed ? (
                <Ionicons name="checkmark" size={30} color="#FFFFFF" />
              ) : locked ? (
                <Ionicons name="lock-closed" size={22} color={colors.textTertiary} />
              ) : comingSoon ? (
                <Ionicons name="time-outline" size={22} color={colors.textTertiary} />
              ) : (
                <Ionicons name="star" size={28} color="#FFFFFF" />
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
      </View>
    );
  };

  const renderPath = () => {
    if (!path) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.textSecondary} />;
    const activeIndex = path.units.findIndex((u) => u.state === 'unlocked');
    const completedCount = path.units.filter((u) => u.state === 'completed').length;

    return (
      <>
        {/* Subject banner */}
        <View style={styles.subjectBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.subjectBannerKicker}>
              {t('learn.path.gradeShort', { grade: path.subject.grade })}
            </Text>
            <Text style={styles.subjectBannerTitle}>{subjectName(path.subject)}</Text>
            <Text style={styles.subjectBannerMeta}>
              {t('learn.path.unitsDone', { done: completedCount, total: path.units.length })}
            </Text>
          </View>
          <View style={styles.subjectBannerIcon}>
            <Ionicons name="calculator" size={26} color="#FFFFFF" />
          </View>
        </View>

        {/* Subject switcher */}
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

        {/* Serpentine path */}
        <View style={styles.pathArea}>
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
          {topCourses.map((course, i) => (
            <TouchableOpacity
              key={course.id ?? i}
              style={styles.courseCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
            >
              <View
                style={[
                  styles.courseCardIcon,
                  { backgroundColor: UNIT_COLORS[i % UNIT_COLORS.length] },
                ]}
              >
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
          ))}
        </ScrollView>
      </View>
    );
  };

  const showOnboarding = !loading && (editingPath || !profile || profile.subjects.length === 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {renderHeader()}
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
        {loading && <ActivityIndicator style={{ marginTop: 60 }} color={colors.textSecondary} />}
        {showOnboarding && renderOnboarding()}
        {!loading && !showOnboarding && renderPath()}
        {!loading && !showOnboarding && renderCourses()}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: 48 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    headerTitle: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    headerPills: { flexDirection: 'row', gap: 8 },
    pill: {
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
    pillText: { fontSize: 14, fontWeight: '800', color: colors.text },

    // Subject banner
    subjectBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginHorizontal: 20,
      marginTop: 4,
      marginBottom: 8,
      padding: 18,
      borderRadius: 20,
      backgroundColor: '#0EA5E9',
    },
    subjectBannerKicker: {
      fontSize: 12,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.85)',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    subjectBannerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
    subjectBannerMeta: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 4 },
    subjectBannerIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.22)',
    },
    switcherRow: { paddingHorizontal: 20, gap: 8, paddingVertical: 6 },
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
    pathArea: { paddingVertical: 18, alignItems: 'center' },
    nodeSlot: { width: '100%', alignItems: 'center', marginBottom: 26 },
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
      marginTop: 8,
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      lineHeight: 19,
    },
    nodeMeta: { marginTop: 3, fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    startBubble: {
      position: 'absolute',
      top: -34,
      zIndex: 2,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: '#0EA5E9',
      alignItems: 'center',
    },
    startBubbleText: { fontSize: 12, fontWeight: '900', color: '#0EA5E9', letterSpacing: 1 },
    startBubbleArrow: {
      position: 'absolute',
      bottom: -6,
      width: 10,
      height: 10,
      backgroundColor: colors.card,
      borderRightWidth: 1.5,
      borderBottomWidth: 1.5,
      borderColor: '#0EA5E9',
      transform: [{ rotate: '45deg' }],
    },

    // Onboarding
    obContainer: { padding: 20 },
    obHero: { alignItems: 'center', marginBottom: 28, gap: 10 },
    obHeroBadge: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: '#0EA5E9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    obTitle: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
    obSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    obSectionLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12, marginTop: 8 },
    gradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    gradeCell: {
      width: '30%',
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
    },
    gradeCellSelected: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
    gradeCellText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
    gradeCellTextSelected: { color: '#FFFFFF' },
    subjectWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
    subjectChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    subjectChipSelected: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
    subjectChipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    subjectChipTextSelected: { color: '#FFFFFF' },
    obEmpty: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
    startButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 28,
      paddingVertical: 15,
      borderRadius: 16,
      backgroundColor: '#0EA5E9',
    },
    startButtonDisabled: { opacity: 0.4 },
    startButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    cancelEdit: { alignItems: 'center', marginTop: 14 },
    cancelEditText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },

    // Courses section
    coursesSection: {
      marginTop: 10,
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
      width: 150,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      gap: 8,
    },
    courseCardIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    courseCardTitle: { fontSize: 13, fontWeight: '700', color: colors.text, lineHeight: 18 },
    courseCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    courseCardMetaText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  });
