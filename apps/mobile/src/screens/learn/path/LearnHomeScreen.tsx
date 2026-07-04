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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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

/** Timeline dot accent colors, cycled per unit. */

/** Bold accent colors, cycled along the path / tiles / cards. */
const ACCENTS = ['#0EA5E9', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899', '#F97316'];

/** Vibrant 2-stop gradient per accent — the rich mockup look. */
const GRADIENTS: Record<string, [string, string]> = {
  '#0EA5E9': ['#38BDF8', '#6366F1'], // sky → indigo
  '#8B5CF6': ['#A78BFA', '#EC4899'], // violet → pink
  '#F59E0B': ['#FBBF24', '#F97316'], // amber → orange
  '#10B981': ['#34D399', '#06B6D4'], // emerald → cyan
  '#EC4899': ['#F472B6', '#8B5CF6'], // pink → violet
  '#F97316': ['#FB923C', '#EF4444'], // orange → red
};
const gradientFor = (accent: string): [string, string] =>
  GRADIENTS[accent] ?? [accent, accent];
const GRAD_START = { x: 0, y: 0 };
const GRAD_END = { x: 1, y: 1 };

/** Distinct per-unit glyphs so every path node feels like its own topic. */
const UNIT_ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  'calculator',
  'extension-puzzle',
  'scale',
  'swap-horizontal',
  'git-compare',
  'trending-up',
  'stats-chart',
  'triangle',
  'analytics',
  'ellipse-outline',
  'cube',
  'compass',
];


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

/** Course category icon map helper for top courses grid */
const getCourseCategoryIcon = (category?: string): keyof typeof Ionicons.glyphMap => {
  const cat = (category || '').toLowerCase().trim();
  if (cat.includes('math') || cat.includes('គណិត')) return 'calculator-outline';
  if (cat.includes('science') || cat.includes('chem') || cat.includes('flask') || cat.includes('គីមី') || cat.includes('រូប')) return 'flask-outline';
  if (cat.includes('prog') || cat.includes('code') || cat.includes('dev') || cat.includes('web') || cat.includes('tech')) return 'code-slash-outline';
  if (cat.includes('design') || cat.includes('art') || cat.includes('សិល្បៈ')) return 'color-palette-outline';
  if (cat.includes('lang') || cat.includes('english') || cat.includes('khmer') || cat.includes('ភាសា')) return 'language-outline';
  if (cat.includes('data') || cat.includes('analyt')) return 'analytics-outline';
  if (cat.includes('business') || cat.includes('finance') || cat.includes('សេដ្ឋ')) return 'briefcase-outline';
  return 'book-outline';
};

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
  const [loadError, setLoadError] = useState(false);
  const [pathError, setPathError] = useState(false);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [path, setPath] = useState<LearnPath | null>(null);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [stats, setStats] = useState<PerformanceStatsSummary | null>(null);
  const [hubCourses, setHubCourses] = useState<any[]>([]);
  const [editingPath, setEditingPath] = useState(false);

  // Onboarding state
  const [obGrade, setObGrade] = useState<string | null>(null);
  const [obSubjects, setObSubjects] = useState<TopicSubject[] | null>(null);
  const [obSubjectsError, setObSubjectsError] = useState(false);
  const [obSelected, setObSelected] = useState<Set<string>>(new Set());
  const [obSaving, setObSaving] = useState(false);
  const [readyGrades, setReadyGrades] = useState<Set<string>>(new Set());
  const [obStarted, setObStarted] = useState(false);

  // Onboarding animation
  const obFloatVal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(obFloatVal, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(obFloatVal, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Streak flame pulse animation — loops scale 1→1.25→1 + opacity 1→0.7→1
  const streakPulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(streakPulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(streakPulseAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [streakPulseAnim]);

  // XP bar fill animation — runs once when stats load
  const xpBarAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!stats) return;
    const targetPct = Math.min(1, stats.xpProgress ?? 0);
    Animated.timing(xpBarAnim, {
      toValue: targetPct,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [stats, xpBarAnim]);

  const subjectName = useCallback(
    (s: { name: string; nameEn: string | null; nameKh: string | null }) => {
      const norm = (s.nameKh || s.nameEn || s.name || '').toLowerCase();
      if (norm.startsWith('math') || norm.includes('គណិត')) return 'គណិតវិទ្យា';
      if (norm.startsWith('chem') || norm.includes('គីមី')) return 'គីមីវិទ្យា';
      if (norm.startsWith('phys') || norm.includes('រូប')) return 'រូបវិទ្យា';
      if (norm.startsWith('bio') || norm.includes('ជីវ')) return 'ជីវវិទ្យា';
      if (norm.startsWith('eng') || norm.includes('អង់គ្លេស')) return 'អង់គ្លេស';
      return s.nameKh || s.nameEn || s.name;
    },
    [],
  );
  const unitName = useCallback((u: LearnUnit) => (isKh ? u.nameKh || u.name : u.name), [isKh]);

  // Catches its own errors (rather than throwing) so a path-specific failure
  // — e.g. switching subjects — never gets confused with a full profile-load
  // failure by callers; each has its own error UI (renderPath's inline retry
  // vs. the full-screen retry in the main render).
  const loadPath = useCallback(async (subjectId: string) => {
    try {
      setPathError(false);
      const data = await learnPathService.getPath(subjectId);
      setPath(data);
    } catch (err) {
      console.warn('[LearnHome] loadPath failed', err);
      setPath(null);
      setPathError(true);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setLoadError(false);
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
      setLoadError(true);
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
  const showOnboarding = !loading && !loadError && (editingPath || !profile || profile.subjects.length === 0);
  useEffect(() => {
    if (!showOnboarding || readyGrades.size > 0) return;
    topicsService
      .getSubjects()
      .then((all) => setReadyGrades(new Set(all.map((s) => s.grade))))
      .catch(() => {});
  }, [showOnboarding, readyGrades.size]);

  // Onboarding: load pickable subjects when a grade is chosen.
  const loadObSubjects = useCallback(() => {
    if (!obGrade) return;
    setObSubjects(null);
    setObSubjectsError(false);
    topicsService
      .getSubjects(obGrade)
      .then((subjects) => {
        setObSubjects(subjects);
        setObSelected((prev) => new Set([...prev].filter((id) => subjects.some((s) => s.id === id))));
      })
      .catch(() => {
        setObSubjects([]);
        setObSubjectsError(true);
      });
  }, [obGrade]);

  useEffect(() => {
    loadObSubjects();
  }, [loadObSubjects]);

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
    const params = {
      topicId: unit.topicId,
      title: unitName(unit),
      grade: path?.subject?.grade,
      subjectName: path?.subject?.nameEn || path?.subject?.name,
      subjectNameKh: path?.subject?.nameKh,
    };
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

  const renderHero = () => {
    const streakScale = streakPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
    const streakOpacity = streakPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.72] });
    const hasStreak = (stats?.currentStreak ?? 0) > 0;
    const xp = stats?.xp ?? 0;

    return (
      <View style={styles.hero}>
        {/* Left: Avatar + level badge */}
        <View style={styles.avatarContainer}>
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

        {/* Right: Streak pill + XP badge + tutor */}
        <View style={styles.heroActions}>
          {/* Animated streak fire pill */}
          <Animated.View
            style={[
              styles.heroStreakPill,
              hasStreak && { transform: [{ scale: streakScale }], opacity: streakOpacity },
            ]}
          >
            <Ionicons name="flame" size={15} color={hasStreak ? '#F97316' : colors.textTertiary} />
            <Text style={[styles.heroStreakText, hasStreak && styles.heroStreakTextActive]}>
              {stats?.currentStreak ?? 0}
            </Text>
          </Animated.View>

          {/* XP star badge */}
          {xp > 0 && (
            <View style={styles.heroXpBadge}>
              <Ionicons name="star" size={11} color="#F59E0B" />
              <Text style={styles.heroXpText}>{xp >= 1000 ? `${(xp / 1000).toFixed(1)}k` : xp} XP</Text>
            </View>
          )}

          {/* Tutor chat FAB */}
          <TouchableOpacity
            style={styles.tutorFabHero}
            activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('TutorChat', { grade: path?.subject?.grade });
            }}
          >
            <Ionicons name="chatbubble-ellipses" size={18} color="#0EA5E9" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };


  // ── Week-streak calendar card ─────────────────────────────

  const renderWeekCard = () => (
    <View style={styles.weekCard}>
      <View style={styles.weekCardTop}>
        <Text style={styles.weekCardTitle}>{t('learn.path.thisWeek')}</Text>
        <View style={styles.streakBadge}>
          <Ionicons name="flame" size={15} color="#F97316" />
          <Text style={styles.streakBadgeText}>{stats?.currentStreak ?? 0}</Text>
        </View>
      </View>
      <View style={styles.weekRow}>
        {weekDays.map((d, i) => {
          const active = !!stats?.weekActivity?.[i];
          const isToday = i === todayIndex;
          return (
            <View
              key={`${d}-${i}`}
              style={[
                styles.weekDayCapsule,
                isToday && styles.weekDayCapsuleToday,
                active && styles.weekDayCapsuleActive,
              ]}
            >
              <Text
                style={[
                  styles.weekDayLabel,
                  isToday && styles.weekDayLabelToday,
                  active && styles.weekDayLabelActive,
                ]}
              >
                {d}
              </Text>
              <View
                style={[
                  styles.weekDot,
                  active && styles.weekDotActive,
                  isToday && styles.weekDotToday,
                ]}
              >
                {active ? (
                  <Ionicons name="flame" size={12} color="#FFFFFF" />
                ) : (
                  <View style={[styles.weekDotEmpty, isToday && styles.weekDotEmptyToday]} />
                )}
              </View>
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
      <TouchableOpacity activeOpacity={0.9} onPress={() => openUnit(activeUnit)}>
        <LinearGradient
          colors={gradientFor('#F97316')}
          start={GRAD_START}
          end={GRAD_END}
          style={[styles.nudgeCard, styles.nudgeShadow]}
        >
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
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // ── Subject card with completion ring + Continue ──────────

  // ── Subject rail: switch between enrolled subjects + add more ──
  const renderSubjectRail = () => {
    if (!profile || profile.subjects.length === 0) return null;
    return (
      <View style={styles.railWrap}>
        <Text style={styles.railTitle}>{t('learn.path.mySubjects')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.railRow}
        >
          {profile.subjects.map((s, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            const active = activeSubjectId === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.subjectSquircleCard,
                  active
                    ? { backgroundColor: isDark ? `${accent}2A` : `${accent}15` }
                    : { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : `${accent}06` },
                ]}
                activeOpacity={0.8}
                onPress={() => switchSubject(s.id)}
              >
                <View style={styles.graphicWrapper}>
                  <View style={styles.graphicScale}>
                    <SubjectGraphic code={s.code} />
                  </View>
                </View>
                <Text
                  style={[
                    styles.subjectSquircleCardLabel,
                    active
                      ? [styles.subjectSquircleCardLabelActive, { color: accent }]
                      : { color: isDark ? colors.textSecondary : '#475569' },
                  ]}
                  numberOfLines={1}
                >
                  {subjectName(s)}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={styles.subjectSquircleCardAdd}
            activeOpacity={0.8}
            onPress={startEditing}
          >
            <Ionicons name="add" size={24} color={colors.textSecondary} style={{ marginTop: 6 }} />
            <Text style={styles.subjectSquircleCardLabel} numberOfLines={1}>
              {t('learn.path.addSubject')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const renderSubjectCard = () => {
    if (!path) return null;
    const total = path.units.length;
    const done = path.units.filter((u) => u.state === 'completed').length;
    const pct = total > 0 ? done / total : 0;
    const ring = 58;
    const rc = 2 * Math.PI * ((ring - 8) / 2);
    const code = (path.subject as any).code ?? '';

    return (
      <View style={[styles.subjectCardWrap, styles.subjectCardShadow]}>
      <LinearGradient
        colors={['#0EA5E9', '#4F46E5']}
        start={GRAD_START}
        end={GRAD_END}
        style={styles.subjectCard}
      >
        {/* Decorative circles + floating mini icons (illustration-style) */}
        <View style={[styles.deco, { width: 150, height: 150, top: -54, right: -40 }]} />
        <View style={[styles.deco, { width: 80, height: 80, bottom: -30, right: 60 }]} />
        <View style={[styles.deco, { width: 44, height: 44, top: 20, left: -18, opacity: 0.5 }]} />
        <View style={[styles.floatIcon, { top: 8, right: 96, backgroundColor: '#F59E0B' }]}>
          <Ionicons name="star" size={12} color="#FFFFFF" />
        </View>
        <View style={[styles.floatIcon, { bottom: 64, right: 4, backgroundColor: '#10B981', width: 28, height: 28 }]}>
          <Ionicons name="rocket" size={14} color="#FFFFFF" />
        </View>

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
            <Ionicons name="arrow-forward" size={16} color="#4F46E5" />
          </TouchableOpacity>
        )}
      </LinearGradient>
      </View>
    );
  };

  // ── XP Level Progress Bar ─────────────────────────────────
  const renderXpBar = () => {
    if (!stats) return null;
    const level = stats.level ?? 1;
    const xpProgress = stats.xpProgress ?? 0;   // 0..1 fraction within current level
    const xpToNext  = stats.xpToNextLevel ?? 100;
    const xpEarned  = Math.round(xpProgress * xpToNext);

    const barWidth = xpBarAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={styles.xpBarWrap}>
        {/* Level label row */}
        <View style={styles.xpBarLabelRow}>
          <View style={styles.xpLevelPill}>
            <Ionicons name="star" size={10} color="#F59E0B" />
            <Text style={styles.xpLevelPillText}>Lv. {level}</Text>
          </View>
          <Text style={styles.xpBarCaption}>{xpEarned} / {xpToNext} XP</Text>
          <View style={[styles.xpLevelPill, { backgroundColor: isDark ? 'rgba(245,158,11,0.14)' : '#FEF3C7' }]}>
            <Text style={styles.xpLevelPillText}>Lv. {level + 1}</Text>
          </View>
        </View>
        {/* Animated bar */}
        <View style={styles.xpBarTrack}>
          <Animated.View style={[styles.xpBarFill, { width: barWidth }]}>
            <LinearGradient
              colors={['#FBBF24', '#F97316']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.xpBarGradient}
            />
            {/* Shimmer dot on tip */}
            <View style={styles.xpBarTipDot} />
          </Animated.View>
        </View>
      </View>
    );
  };

  // ── Vector Graphics representing subjects ─────────────────

  const MathPieChartGraphic = () => (
    <View style={{ width: 70, height: 70, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          overflow: 'hidden',
          position: 'relative',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1, flexDirection: 'column' }}>
            <View style={{ flex: 1, backgroundColor: '#FFB74D' }} />
            <View style={{ flex: 1, backgroundColor: '#29B6F6' }} />
          </View>
          <View style={{ flex: 1, flexDirection: 'column' }}>
            <View style={{ flex: 1, backgroundColor: '#FFCC80' }} />
            <View style={{ flex: 1, backgroundColor: '#EF5350' }} />
          </View>
        </View>
        {/* White center donut circle */}
        <View
          style={{
            position: 'absolute',
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: '#FFFFFF',
            top: 15,
            left: 15,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 2,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '900', color: '#5C6BC0' }}>%</Text>
        </View>
      </View>
    </View>
  );

  const ChemBeakerGraphic = () => (
    <View style={{ width: 70, height: 70, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {/* Diagonal Rod */}
      <View
        style={{
          position: 'absolute',
          width: 4,
          height: 48,
          backgroundColor: '#9FA8DA',
          borderRadius: 2,
          left: 44,
          top: 8,
          transform: [{ rotate: '15deg' }],
          zIndex: 3,
        }}
      />
      
      {/* Beaker Lip */}
      <View
        style={{
          position: 'absolute',
          width: 32,
          height: 5,
          backgroundColor: '#C5CAE9',
          borderRadius: 2.5,
          top: 12,
          zIndex: 2,
        }}
      />

      {/* Beaker Body */}
      <View
        style={{
          width: 42,
          height: 46,
          borderRadius: 6,
          borderWidth: 3.5,
          borderColor: '#C5CAE9',
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          overflow: 'hidden',
          justifyContent: 'flex-end',
          position: 'relative',
          top: 2,
        }}
      >
        {/* Green Liquid */}
        <View
          style={{
            height: 22,
            width: '100%',
            backgroundColor: '#66BB6A',
            borderBottomLeftRadius: 2.5,
            borderBottomRightRadius: 2.5,
          }}
        />
        {/* Liquid bubble 1 */}
        <View style={{ position: 'absolute', bottom: 24, left: 10, width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#81C784' }} />
        {/* Liquid bubble 2 */}
        <View style={{ position: 'absolute', bottom: 26, left: 24, width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#81C784' }} />
      </View>
    </View>
  );

  const BiologyStructureGraphic = () => (
    <View style={{ width: 70, height: 70, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {/* Center Horizontal connection bar */}
      <View style={{ position: 'absolute', width: 54, height: 6, backgroundColor: '#B0BEC5', borderRadius: 3, top: 32 }} />
      
      {/* Left and Right panels */}
      <View style={{ position: 'absolute', width: 14, height: 22, backgroundColor: '#0288D1', borderRadius: 3, left: 6, top: 24 }} />
      <View style={{ position: 'absolute', width: 14, height: 22, backgroundColor: '#0288D1', borderRadius: 3, right: 6, top: 24 }} />

      {/* Center Vertical pillar */}
      <View
        style={{
          width: 12,
          height: 38,
          backgroundColor: '#E0E0E0',
          borderWidth: 2,
          borderColor: '#B0BEC5',
          borderRadius: 3,
          position: 'relative',
          top: 2,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      />

      {/* Top Dome */}
      <View
        style={{
          position: 'absolute',
          width: 24,
          height: 14,
          backgroundColor: '#29B6F6',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          top: 8,
        }}
      />
    </View>
  );

  const LanguageTranslationGraphic = () => (
    <View style={{ width: 70, height: 70, position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
      {/* Back blue card (文) */}
      <View
        style={{
          width: 32,
          height: 42,
          borderRadius: 8,
          backgroundColor: '#29B6F6',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute',
          right: 10,
          top: 10,
          zIndex: 1,
          shadowColor: '#000',
          shadowOffset: { width: 1, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 3,
          elevation: 2,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>文</Text>
      </View>

      {/* Front purple card (A) */}
      <View
        style={{
          width: 32,
          height: 42,
          borderRadius: 8,
          backgroundColor: '#EDE7F6',
          borderWidth: 2,
          borderColor: '#D1C4E9',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute',
          left: 10,
          top: 18,
          zIndex: 2,
          shadowColor: '#000',
          shadowOffset: { width: 1, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 3,
          elevation: 3,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#29B6F6' }}>A</Text>
      </View>

      {/* Swap arrow icon on top */}
      <View style={{ position: 'absolute', top: 2, left: 27, zIndex: 3 }}>
        <Ionicons name="swap-horizontal" size={16} color="#66BB6A" />
      </View>
    </View>
  );

  const SubjectGraphic = ({ code }: { code: string }) => {
    const norm = code.toUpperCase();
    if (norm.startsWith('MATH')) return <MathPieChartGraphic />;
    if (norm.startsWith('CHEM')) return <ChemBeakerGraphic />;
    if (norm.startsWith('BIO')) return <BiologyStructureGraphic />;
    if (norm.startsWith('ENG') || norm.startsWith('KHM') || norm.startsWith('LANG')) return <LanguageTranslationGraphic />;
    // fallback graphic: beautiful book
    return (
      <View style={{ width: 70, height: 70, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#E1BEE7', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="book" size={28} color="#8E24AA" />
        </View>
      </View>
    );
  };

  // ── Onboarding ────────────────────────────────────────────

  const renderOnboarding = () => {
    const pillY1 = obFloatVal.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
    const pillY2 = obFloatVal.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });
    const sphereY = obFloatVal.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] });

    // ── Phase 1: Full-Screen Welcome (before pressing Start Now) ──
    if (!obStarted) {
      return (
        <LinearGradient
          colors={isDark ? ['#030B18', '#061828', '#020B14'] : ['#EFF7FE', '#E2EEF9', '#F5FAFD']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.obWelcomeScreen}
        >
          {/* Ambient aura blobs */}
          <View style={[styles.obAuraBlob, { top: -110, right: -90, backgroundColor: isDark ? '#09CFF7' : '#06A8CC' }]} />
          <View style={[styles.obAuraBlob, { bottom: -80, left: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: isDark ? '#3B82F6' : '#93C5FD' }]} />

          {/* Sphere Hero */}
          <View style={styles.obHero}>
            <View style={styles.obRingOuter}>
              <View style={styles.obRingInner} />
            </View>
            <Animated.View style={[styles.obSphere, { transform: [{ translateY: sphereY }] }]}>
              <LinearGradient
                colors={['#09CFF7', '#06A8CC', '#0284C7']}
                start={GRAD_START}
                end={GRAD_END}
                style={styles.obSphereBadge}
              >
                <Ionicons name="school" size={52} color="#FFFFFF" />
                <View style={styles.obSphereStarBadge}>
                  <Ionicons name="star" size={13} color="#FDE047" />
                </View>
              </LinearGradient>
            </Animated.View>
            <Animated.View style={[styles.obPill, styles.obPillTopLeft, { transform: [{ translateY: pillY1 }] }]}>
              <View style={[styles.obPillIcon, { backgroundColor: 'rgba(9,207,247,0.2)' }]}>
                <Ionicons name="compass" size={13} color="#09CFF7" />
              </View>
              <Text style={styles.obPillText}>{t('learn.path.onboardPillSmartPath')}</Text>
            </Animated.View>
            <Animated.View style={[styles.obPill, styles.obPillTopRight, { transform: [{ translateY: pillY2 }] }]}>
              <View style={[styles.obPillIcon, { backgroundColor: 'rgba(251,191,36,0.2)' }]}>
                <Ionicons name="sparkles" size={13} color="#FBBF24" />
              </View>
              <Text style={styles.obPillText}>{t('learn.path.onboardPillAiMastery')}</Text>
            </Animated.View>
            <Animated.View style={[styles.obPill, styles.obPillBottom, { transform: [{ translateY: pillY2 }] }]}>
              <View style={[styles.obPillIcon, { backgroundColor: 'rgba(52,211,153,0.2)' }]}>
                <Ionicons name="trophy" size={13} color="#34D399" />
              </View>
              <Text style={styles.obPillText}>{t('learn.path.onboardPillEarnXp')}</Text>
            </Animated.View>
          </View>

          {/* Title & subtitle */}
          <View style={styles.obWelcomeContent}>
            <Text style={styles.obTitle}>{t('learn.path.onboardTitle')}</Text>
            <Text style={styles.obSubtitle}>{t('learn.path.onboardSubtitle')}</Text>

            {/* Start Now CTA */}
            <TouchableOpacity
              style={styles.obStartNowButton}
              activeOpacity={0.88}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setObStarted(true);
              }}
            >
              <LinearGradient
                colors={['#09CFF7', '#06A8CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.obStartNowGradient}
              >
                <Text style={styles.obStartNowText}>{t('learn.path.startNow', { defaultValue: 'Start Now' })}</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      );
    }

    // ── Phase 2: Grade & Subject Selection (Find Your Course Discovery Screen) ──
    return (
      <View style={[styles.courseDiscoveryFullScreen, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
        {/* Mockup Top Header Row (Greeting + Search Button) */}
        <View style={styles.courseDiscoveryHeader}>
          <View>
            <Text style={styles.courseDiscoveryGreeting}>
              {t('learn.path.helloGreeting', { name: user?.firstName || t('learn.path.learnerFallback') })}
            </Text>
            <Text style={styles.courseDiscoveryTitle}>
              {t('learn.path.findYourCourse', { defaultValue: 'Find your course' })}
            </Text>
          </View>
          <TouchableOpacity style={styles.searchIconButtonNeutral} activeOpacity={0.85}>
            <View style={[styles.searchCircleNeutral, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF', borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0' }]}>
              <Ionicons name="search" size={20} color={isDark ? '#E2E8F0' : '#1E293B'} />
            </View>
          </TouchableOpacity>
        </View>

        {/* World-Class Enterprise Hero Banner Card (Quiz Screen Inspired) */}
        <View style={styles.promoBannerWrap}>
          <LinearGradient
            colors={['#09CFF7', '#06A8CC', '#0284C7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.promoBanner}
          >
            {/* Subtle background gradient overlay */}
            <LinearGradient
              colors={['rgba(15, 23, 42, 0.35)', 'rgba(15, 23, 42, 0.0)']}
              style={StyleSheet.absoluteFill}
            />

            {/* Clean Giant Watermark Silhouette Icon on Bottom Right (Exactly like Quiz Screen) */}
            <View style={styles.promoWatermarkIconWrap}>
              <Ionicons name="trophy" size={140} color="rgba(255,255,255,0.14)" />
            </View>

            {/* Spacious, Clean Text & Action Button Content */}
            <View style={styles.promoContentWrap}>
              <View style={styles.promoTopRow}>
                <View style={styles.promoOfferBadge}>
                  <Ionicons name="flash" size={13} color="#FDE047" style={{ marginRight: 5 }} />
                  <Text style={styles.promoOfferBadgeText}>{t('learn.path.limitedTimeOffer')}</Text>
                </View>
              </View>

              <Text style={styles.promoDiscount}>
                {t('learn.path.promoDiscount', { defaultValue: '60% OFF' })}
              </Text>

              <View style={styles.promoDateRow}>
                <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.9)" style={{ marginRight: 6 }} />
                <Text style={styles.promoDate}>
                  {t('learn.path.promoDate', { defaultValue: 'Feb 14 - Mar 20' })}
                </Text>
              </View>

              <TouchableOpacity style={styles.promoJoinButtonWhite} activeOpacity={0.85}>
                <Text style={styles.promoJoinTextWhite}>{t('learn.path.joinNow', { defaultValue: 'Claim Offer' })}</Text>
                <Ionicons name="arrow-forward" size={15} color="#06A8CC" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Grade Selection */}
        <Text style={styles.exploreTitle}>{t('learn.path.pickGrade')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gradeChipRow}
        >
          {GRADES.map((g) => {
            const selected = obGrade === g;
            const ready = readyGrades.has(g);
            return (
              <TouchableOpacity
                key={g}
                style={[
                  styles.gradeChip,
                  selected && styles.gradeChipSelected,
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.selectionAsync();
                  setObGrade(g);
                }}
              >
                <Text style={[styles.gradeChipText, selected && styles.gradeChipTextSelected]}>
                  {t('learn.path.gradeShort', { grade: g })}
                </Text>
                {ready && !selected && <View style={styles.gradeReadyIndicator} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Pick Your Subjects */}
        {obGrade && (
          <>
            <Text style={styles.exploreTitle}>{t('learn.path.pickSubjects')}</Text>
            {!obSubjects && (
              <ActivityIndicator style={{ marginVertical: 16 }} color={colors.textSecondary} />
            )}
            {obSubjectsError && (
              <View style={styles.obEmptyCard}>
                <Ionicons name="cloud-offline-outline" size={26} color={colors.textSecondary} />
                <Text style={styles.obEmptyText}>{t('learn.path.loadError')}</Text>
                <TouchableOpacity style={styles.loadErrorRetryButton} onPress={loadObSubjects}>
                  <Text style={styles.loadErrorRetryText}>{t('learn.path.retry')}</Text>
                </TouchableOpacity>
              </View>
            )}
            {obSubjects && obSubjects.length === 0 && !obSubjectsError && (
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
                        onPress={() => { Haptics.selectionAsync(); setObGrade(g); }}
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
                const selected = obSelected.has(s.id);
                const meta = t('learn.path.topicsCount', { count: s.topicCount });
                // Fake a small progress for visual richness (0% if not started yet)
                const fakeProgress = 0;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.exploreGridCard,
                      selected && styles.exploreGridCardSelected,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.selectionAsync();
                      const next = new Set(obSelected);
                      if (selected) next.delete(s.id);
                      else next.add(s.id);
                      setObSelected(next);
                    }}
                  >
                    {selected && (
                      <View style={styles.exploreCardCheck}>
                        <Ionicons name="checkmark-circle" size={24} color="#06A8CC" />
                      </View>
                    )}
                    <View style={styles.exploreCardGraphicContainer}>
                      <SubjectGraphic code={s.code} />
                    </View>
                    <View style={styles.exploreCardFooterCentered}>
                      <Text style={styles.exploreCardNameBold} numberOfLines={1}>
                        {subjectName(s)}
                      </Text>
                      <Text style={styles.exploreCardMetadata}>{meta}</Text>
                      {/* Lesson progress bar */}
                      <View style={styles.subjectProgressBarBg}>
                        <View
                          style={[
                            styles.subjectProgressBarFill,
                            { width: `${fakeProgress * 100}%` },
                          ]}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <View style={styles.bottomActionsWrap}>
          {/* Start Learning Button — full-width cyan gradient */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.startButtonWrap,
              (!obGrade || obSelected.size === 0 || obSaving) && styles.startButtonDisabled
            ]}
            disabled={!obGrade || obSelected.size === 0 || obSaving}
            onPress={completeOnboarding}
          >
            <LinearGradient
              colors={['#09CFF7', '#06A8CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.obStartNowGradient}
            >
              <Text style={styles.obStartNowText}>
                {obSaving ? t('learn.path.saving') : t('learn.path.startLearning')}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

           {/* Cancel / Go Back button */}
          <TouchableOpacity
            style={styles.cancelEditButton}
            activeOpacity={0.75}
            onPress={() => {
              if (profile && profile.subjects.length > 0) {
                setEditingPath(false);
              } else {
                setObStarted(false);
              }
            }}
          >
            <Text style={[styles.cancelEditButtonText, { color: colors.textSecondary }]}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Active unit rendering (Centered circular progress node) ──────────
  const renderActiveUnit = (unit: LearnUnit, index: number) => {
    const accent = ACCENTS[index % ACCENTS.length];
    const [gradStart, gradEnd] = gradientFor(accent);
    const pct = unit.target > 0 ? Math.min(1, unit.correct / unit.target) : 0;
    const size = 96;
    const circR = (size - 8) / 2;
    const circ = 2 * Math.PI * circR;

    return (
      <View key={unit.topicId} style={styles.activeUnitContainer}>
        {/* START speech bubble */}
        <View style={styles.activeStartBubble}>
          <View style={[styles.activeStartBubbleInner, { borderColor: accent }]}>
            <Text style={[styles.activeStartBubbleText, { color: accent }]}>{t('learn.path.start')}</Text>
          </View>
          <View style={[styles.activeStartBubbleArrow, { borderTopColor: accent }]} />
        </View>

        {/* Large Circle Node */}
        <TouchableOpacity
          onPress={() => openUnit(unit)}
          activeOpacity={0.85}
          style={styles.activeCircleWrapper}
        >
          {/* Progress Ring */}
          <Svg width={size + 12} height={size + 12} style={StyleSheet.absoluteFill}>
            <Circle
              cx={(size + 12) / 2}
              cy={(size + 12) / 2}
              r={circR + 3}
              stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}
              strokeWidth={5}
              fill="none"
            />
            <Circle
              cx={(size + 12) / 2}
              cy={(size + 12) / 2}
              r={circR + 3}
              stroke={accent}
              strokeWidth={5}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${circ * pct} ${circ}`}
              transform={`rotate(-90 ${(size + 12) / 2} ${(size + 12) / 2})`}
            />
          </Svg>

          {/* Inner Circle Gradient */}
          <LinearGradient
            colors={[gradStart, gradEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activeCircleInner}
          >
            <Ionicons name={UNIT_ICONS[index % UNIT_ICONS.length]} size={36} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Title and Progress */}
        <Text style={styles.activeUnitTitle}>{unitName(unit)}</Text>
        <Text style={styles.activeUnitProgress}>
          {isKh ? `មេរៀនទី ${index + 1}` : `Unit ${index + 1}`} ·{' '}
          {unit.target > 0
            ? `${unit.correct} / ${unit.target} correct`
            : t('learn.path.inProgress', { defaultValue: 'In Progress' })}
        </Text>
      </View>
    );
  };

  // ── Standard unit row (Horizontal colored card on the timeline) ──────────
  const renderUnitCardRow = (unit: LearnUnit, index: number, isLast: boolean) => {
    const accent = ACCENTS[index % ACCENTS.length];
    const [gradStart, gradEnd] = gradientFor(accent);
    const completed = unit.state === 'completed';
    const locked = unit.state === 'locked';
    const comingSoon = unit.state === 'no_content';

    return (
      <View key={unit.topicId} style={styles.unitRow}>
        {/* ── Left timeline track ── */}
        <View style={styles.timelineTrack}>
          {/* Continuous vertical connector line */}
          <View style={styles.timelineLine} />

          {/* Dot: Colored ring with transparent center */}
          <View
            style={[
              styles.timelineDotRing,
              { borderColor: accent },
            ]}
          />
        </View>

        {/* ── Card content ── */}
        <View style={styles.unitCardOuter}>
          <TouchableOpacity
            onPress={() => openUnit(unit)}
            activeOpacity={locked || comingSoon ? 0.95 : 0.82}
            style={[
              styles.unitCard,
              styles.softShadow,
              { shadowColor: accent },
            ]}
          >
            {/* Gradient background for the card */}
            <LinearGradient
              colors={[gradStart, gradEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />

            {/* Left inside: White circle with colored icon */}
            <View style={styles.unitCardIconCircleWhite}>
              {completed ? (
                <Ionicons name="checkmark" size={20} color={accent} />
              ) : (
                <Ionicons name={UNIT_ICONS[index % UNIT_ICONS.length]} size={20} color={accent} />
              )}
            </View>

            {/* Title + subtitle */}
            <View style={styles.unitCardText}>
              <Text style={styles.unitCardTitleTextWhite} numberOfLines={1}>
                {unitName(unit)}
              </Text>
              <Text style={styles.unitCardSubTextWhite} numberOfLines={1}>
                {isKh ? `មេរៀនទី ${index + 1}` : `Unit ${index + 1}`} ·{' '}
                {completed
                  ? t('learn.path.completed')
                  : comingSoon
                  ? t('learn.path.comingSoon')
                  : locked
                  ? t('learn.path.locked', { defaultValue: 'Locked' })
                  : t('learn.path.inProgress', { defaultValue: 'In Progress' })}
              </Text>
            </View>

            {/* Right: Lock icon or chevron/checkmark */}
            <View style={styles.unitCardRight}>
              {locked || comingSoon ? (
                <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
              ) : completed ? (
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTrophyRow = (allDone: boolean) => (
    <View style={styles.unitRow}>
      <View style={styles.timelineTrack}>
        {/* Continuous vertical connector line ending at dot ring center */}
        <View style={[styles.timelineLine, styles.timelineLineLast]} />

        <View
          style={[
            styles.timelineDotRing,
            { borderColor: '#F59E0B' },
          ]}
        />
      </View>
      <View style={[styles.unitCardOuter, { paddingBottom: 8 }]}>
        <TouchableOpacity
          activeOpacity={allDone ? 0.82 : 0.95}
          style={[
            styles.trophyRow,
            styles.softShadow,
            allDone ? { shadowColor: '#F59E0B', borderWidth: 0 } : { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {allDone && (
            <LinearGradient
              colors={['#FBBF24', '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          )}

          <View style={styles.trophyIconCircleWhite}>
            <Ionicons name="trophy" size={20} color={allDone ? '#F59E0B' : colors.textTertiary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.trophyLabel,
                allDone ? { color: '#FFFFFF' } : { color: colors.textSecondary },
              ]}
            >
              {t('learn.path.finishTrophy')}
            </Text>
          </View>

          {allDone && (
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLoadError = (onRetry: () => void, compact?: boolean) => (
    <View style={compact ? styles.pathErrorBox : styles.fullLoadErrorBox}>
      <Ionicons name="cloud-offline-outline" size={compact ? 36 : 48} color={colors.textTertiary} />
      <Text style={styles.loadErrorText}>{t('learn.path.loadError')}</Text>
      <TouchableOpacity style={styles.loadErrorRetryButton} onPress={onRetry}>
        <Text style={styles.loadErrorRetryText}>{t('learn.path.retry')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPath = () => {
    if (pathError) {
      return renderLoadError(() => activeSubjectId && loadPath(activeSubjectId), true);
    }
    if (!path) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.textSecondary} />;
    const activeIndex = path.units.findIndex((u) => u.state === 'unlocked');
    const allDone = path.units.every((u) => u.state === 'completed' || u.state === 'no_content');

    return (
      <View style={styles.pathList}>
        {path.units.map((u, i) => {
          const isLast = i === path.units.length - 1;
          if (u.state === 'unlocked') {
            return renderActiveUnit(u, i);
          } else {
            return renderUnitCardRow(u, i, isLast);
          }
        })}
        {renderTrophyRow(allDone)}
      </View>
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
        <View style={styles.coursesGrid}>
          {topCourses.map((course, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            return (
              <TouchableOpacity
                key={course.id ?? i}
                style={styles.courseCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
              >
                <View style={[styles.courseCardIcon, { backgroundColor: `${accent}22` }]}>
                  <Ionicons name={getCourseCategoryIcon(course.category)} size={22} color={accent} />
                </View>
                <Text style={styles.courseCardTitle} numberOfLines={2}>
                  {course.title}
                </Text>
                <View style={styles.courseCardMeta}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.courseCardMetaText}>
                    {(course.rating ?? 0).toFixed(1)}
                  </Text>
                  <Ionicons name="people" size={12} color={colors.textTertiary} style={{ marginLeft: 6 }} />
                  <Text style={styles.courseCardMetaText}>{course.enrolledCount ?? 0}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Phase 1 welcome takes over the whole screen */}
      {showOnboarding && !obStarted && renderOnboarding()}

      {/* Phase 2 (grade/subject) and normal learn screen both live in the ScrollView */}
      {(!showOnboarding || obStarted) && (
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
          {showOnboarding && obStarted && renderOnboarding()}
          {!loading && loadError && renderLoadError(() => {
            setLoading(true);
            load();
          })}
          {!loading && !loadError && !showOnboarding && (
            <>
              {renderSubjectCard()}
              {renderXpBar()}
              {renderSubjectRail()}
              {renderWeekCard()}
              {renderNudge()}
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
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    // Subtle tint in light mode so white/gradient cards visibly float.
    safe: { flex: 1, backgroundColor: isDark ? colors.background : '#F1F5F9' },
    scrollContent: { paddingBottom: 48 },

    // Shared elevation — cards "float" on the light background (mockup look).
    softShadow: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.35 : 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    subjectCardShadow: {
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
    },
    nudgeShadow: {
      borderWidth: 1,
      borderColor: isDark ? '#C2410C' : '#FFEDD5',
    },

    // Hero
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    heroActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    heroStreakPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(249,115,22,0.15)' : '#FFF7ED',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(249,115,22,0.3)' : '#FFEDD5',
    },
    heroStreakText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textTertiary,
    },
    heroStreakTextActive: {
      color: '#F97316',
    },
    heroXpBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FFFBEB',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(245,158,11,0.3)' : '#FDE68A',
    },
    heroXpText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#D97706',
    },
    tutorFabHero: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
    },
    avatarContainer: {
      position: 'relative',
    },
    avatar: { width: 38, height: 38, borderRadius: 19 },
    avatarFallback: { backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
    levelBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      minWidth: 15,
      height: 15,
      borderRadius: 7.5,
      paddingHorizontal: 2,
      backgroundColor: '#F59E0B',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: isDark ? colors.background : '#F1F5F9', // Matches screen background perfectly!
    },
    levelBadgeText: { fontSize: 8, fontWeight: '900', color: '#FFFFFF', lineHeight: 10 },

    // XP Level Progress Bar
    xpBarWrap: {
      marginHorizontal: 20,
      marginTop: 12,
      marginBottom: 4,
    },
    xpBarLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    xpLevelPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(245,158,11,0.14)' : '#FEF3C7',
    },
    xpLevelPillText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#D97706',
    },
    xpBarCaption: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    xpBarTrack: {
      height: 10,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
      overflow: 'hidden',
    },
    xpBarFill: {
      height: '100%',
      borderRadius: 6,
      overflow: 'hidden',
      position: 'relative',
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    xpBarGradient: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 6,
    },
    xpBarTipDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#FFFFFF',
      marginRight: 2,
      opacity: 0.9,
    },

    // Week streak card
    weekCard: {

      marginHorizontal: 20,
      marginTop: 16,
      padding: 16,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
    },
    weekCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    weekCardTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: isDark ? '#431407' : '#FFF7ED',
      borderWidth: 1,
      borderColor: isDark ? '#F97316' : '#FFEDD5',
    },
    streakBadgeText: { fontSize: 14, fontWeight: '900', color: '#F97316' },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
    weekDayCapsule: {
      width: 40,
      paddingVertical: 8,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    weekDayCapsuleActive: {
      backgroundColor: isDark ? '#431407' : '#FFF7ED',
      borderColor: isDark ? '#F97316' : '#FFEDD5',
    },
    weekDayCapsuleToday: {
      borderColor: '#F97316',
      backgroundColor: isDark ? 'rgba(249,115,22,0.08)' : 'rgba(249,115,22,0.05)',
    },
    weekDayLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
    weekDayLabelActive: { color: '#F97316', fontWeight: '800' },
    weekDayLabelToday: { color: '#F97316', fontWeight: '800' },
    weekDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0',
    },
    weekDotActive: { backgroundColor: '#F97316' },
    weekDotToday: { borderWidth: 1.5, borderColor: '#F97316' },
    weekDotEmpty: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
    },
    weekDotEmptyToday: {
      backgroundColor: '#F97316',
    },

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
    nudgeTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', lineHeight: 22 },
    nudgeBody: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginTop: 2, lineHeight: 18 },

    // Subject card — shadow lives on the wrapper (a gradient with
    // overflow:hidden can't cast a shadow on iOS).
    subjectCardWrap: {
      marginHorizontal: 20,
      marginTop: 12,
      borderRadius: 22,
    },
    subjectCard: {
      padding: 18,
      borderRadius: 22,
      overflow: 'hidden',
    },
    deco: {
      position: 'absolute',
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    floatIcon: {
      position: 'absolute',
      width: 24,
      height: 24,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
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
    subjectTitle: {
      fontFamily: 'Koulen-Regular',
      fontSize: 24,
      color: '#FFFFFF',
      marginTop: 8,
      paddingTop: 6,
      lineHeight: 38,
    },
    subjectMeta: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 4, lineHeight: 18 },
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
      borderRadius: 18,
      backgroundColor: '#FFFFFF',
    },
    continueButtonText: { fontSize: 15, fontWeight: '800', color: '#4F46E5' },
    editPathLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      marginTop: 10,
    },
    editPathLinkText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },

    // Load-error + retry (full-screen and inline-within-path variants)
    fullLoadErrorBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 32,
      gap: 12,
    },
    pathErrorBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
      paddingHorizontal: 24,
      gap: 10,
    },
    loadErrorText: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    loadErrorRetryButton: {
      marginTop: 4,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: '#0EA5E9',
    },
    loadErrorRetryText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

    // Subject rail
    railWrap: { marginTop: 6 },
    railTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    railRow: { paddingHorizontal: 20, gap: 12 },
    subjectSquircleCard: {
      width: 84,
      height: 88,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderWidth: 0,
    },
    subjectSquircleCardAdd: {
      width: 84,
      height: 88,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: 'dashed',
      backgroundColor: colors.card,
    },
    graphicWrapper: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    graphicScale: {
      width: 70,
      height: 70,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ scale: 0.58 }],
    },
    subjectSquircleCardLabel: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '600',
      textAlign: 'center',
      width: '100%',
      marginBottom: 2,
    },
    subjectSquircleCardLabelActive: {
      fontWeight: '800',
    },

    // ── Vertical timeline path ──────────────────────────────────────
    pathList: {
      marginTop: 8,
      paddingLeft: 16,
      paddingRight: 20,
      paddingBottom: 8,
    },
    activeUnitContainer: {
      alignItems: 'center',
      marginVertical: 20,
      width: '100%',
    },
    activeStartBubble: {
      alignItems: 'center',
      marginBottom: 8,
    },
    activeStartBubbleInner: {
      paddingHorizontal: 18,
      paddingVertical: 6,
      borderRadius: 15,
      borderWidth: 2.2,
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 3,
    },
    activeStartBubbleText: {
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 1.2,
    },
    activeStartBubbleArrow: {
      width: 0,
      height: 0,
      borderLeftWidth: 6,
      borderRightWidth: 6,
      borderTopWidth: 6,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      marginTop: -1.5,
    },
    activeCircleWrapper: {
      width: 108,
      height: 108,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeCircleInner: {
      width: 88,
      height: 88,
      borderRadius: 44,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
    activeUnitTitle: {
      fontFamily: 'Koulen-Regular',
      fontSize: 20,
      color: colors.text,
      textAlign: 'center',
      marginTop: 12,
      paddingTop: 4,
      lineHeight: 32,
    },
    activeUnitProgress: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 16,
      lineHeight: 22,
    },
    unitRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      marginBottom: 0,
    },
    timelineTrack: {
      width: 28,
      alignItems: 'center',
    },
    timelineDotRing: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 3.5,
      backgroundColor: '#FFFFFF',
      zIndex: 2,
      marginTop: 24,
    },
    timelineLine: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 2.5,
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
      zIndex: 1,
    },
    timelineLineLast: {
      bottom: undefined,
      height: 32,
    },
    unitCardOuter: {
      flex: 1,
      paddingBottom: 12,
      paddingLeft: 8,
    },
    unitCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 32,
      height: 64,
      paddingHorizontal: 14,
      overflow: 'hidden',
      gap: 12,
      borderWidth: 0,
    },
    unitCardIconCircleWhite: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    unitCardText: {
      flex: 1,
    },
    unitCardTitleTextWhite: {
      fontFamily: 'Koulen-Regular',
      fontSize: 17,
      color: '#FFFFFF',
      paddingTop: 4,
      lineHeight: 28,
    },
    unitCardSubTextWhite: {
      fontSize: 11.5,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.75)',
      marginTop: 1,
      lineHeight: 18,
    },
    unitCardRight: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingLeft: 4,
    },
    trophyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 32,
      height: 64,
      paddingHorizontal: 14,
      overflow: 'hidden',
      gap: 12,
      borderWidth: 1,
      flex: 1,
    },
    trophyIconCircleWhite: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    trophyLabel: {
      fontSize: 15,
      fontWeight: '800',
    },

    // ── Onboarding (Premium Enterprise Redesign) ──────────────

    // Phase 1: Full-screen welcome styles
    obWelcomeScreen: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'space-evenly',
      overflow: 'hidden',
      paddingHorizontal: 28,
      paddingBottom: 32,
    },
    obAuraBlob: {
      position: 'absolute',
      width: 320,
      height: 320,
      borderRadius: 160,
      opacity: isDark ? 0.13 : 0.08,
    },
    obWelcomeContent: {
      width: '100%',
      alignItems: 'center',
    },
    obStartNowButton: {
      width: '100%',
      marginTop: 28,
      borderRadius: 28,
      shadowColor: '#06A8CC',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.38,
      shadowRadius: 16,
      elevation: 8,
    },
    obStartNowGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 18,
      borderRadius: 28,
      gap: 8,
    },
    obStartNowText: {
      fontSize: 17,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },

    // Phase 2: Find Your Course Screen Styles
    courseDiscoveryFullScreen: {
      flex: 1,
      width: '100%',
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    courseDiscoveryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
      paddingHorizontal: 4,
    },
    courseDiscoveryGreeting: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 2,
    },
    courseDiscoveryTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
    },
    searchIconButtonNeutral: {
      borderRadius: 22,
    },
    searchCircleNeutral: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    promoBannerWrap: {
      marginBottom: 24,
      borderRadius: 26,
      overflow: 'hidden',
      shadowColor: '#06A8CC',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.28,
      shadowRadius: 20,
      elevation: 8,
    },
    promoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 24,
      borderRadius: 26,
      minHeight: 156,
      position: 'relative',
      overflow: 'hidden',
    },
    promoWatermarkIconWrap: {
      position: 'absolute',
      right: -20,
      bottom: -30,
      opacity: 0.85,
    },
    promoContentWrap: {
      flex: 1.35,
      zIndex: 2,
    },
    promoTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    promoOfferBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    promoOfferBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    promoDiscount: {
      fontSize: 32,
      fontWeight: '900',
      color: '#FFFFFF',
      marginBottom: 6,
      letterSpacing: -0.5,
      textShadowColor: 'rgba(0,0,0,0.15)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    promoDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginBottom: 16,
    },
    promoDate: {
      fontSize: 13,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.85)',
    },
    promoJoinButtonWhite: {
      paddingVertical: 10,
      paddingHorizontal: 22,
      borderRadius: 20,
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
    },
    promoJoinTextWhite: {
      fontSize: 14,
      fontWeight: '800',
      color: '#06A8CC',
    },
    exploreTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 12,
      marginTop: 8,
    },
    gradeChipRow: {
      paddingVertical: 4,
      gap: 12,
      marginBottom: 20,
    },
    gradeChip: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: isDark ? colors.card : '#F1F5F9',
      borderWidth: 1.5,
      borderColor: isDark ? colors.border : '#E2E8F0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    gradeChipSelected: {
      backgroundColor: '#06A8CC',
      borderColor: '#06A8CC',
      shadowColor: '#06A8CC',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    gradeChipText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    gradeChipTextSelected: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    gradeReadyIndicator: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#38BDF8',
    },
    subjectGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 20,
    },
    exploreGridCard: {
      width: '47%',
      padding: 20,
      borderRadius: 28,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 185,
      borderWidth: 1.5,
      borderColor: 'transparent',
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.04,
      shadowRadius: 10,
      elevation: 2,
      position: 'relative',
    },
    exploreGridCardSelected: {
      borderColor: '#06A8CC',
      backgroundColor: isDark ? 'rgba(6, 168, 204, 0.12)' : '#E0F9FD',
      shadowColor: '#06A8CC',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 4,
    },
    exploreCardCheck: {
      position: 'absolute',
      top: 12,
      right: 12,
      zIndex: 2,
    },
    exploreCardGraphicContainer: {
      marginVertical: 8,
    },
    exploreCardFooterCentered: {
      alignItems: 'center',
      width: '100%',
    },
    exploreCardNameBold: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 2,
    },
    exploreCardMetadata: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    subjectProgressBarBg: {
      width: '85%',
      height: 4,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
      borderRadius: 2,
      overflow: 'hidden',
      marginTop: 8,
    },
    subjectProgressBarFill: {
      height: '100%',
      backgroundColor: '#06A8CC',
      borderRadius: 2,
    },
    bottomActionsWrap: {
      width: '100%',
      gap: 12,
      marginTop: 18,
      alignItems: 'center',
    },
    cancelEditButton: {
      paddingVertical: 12,
      paddingHorizontal: 28,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    cancelEditButtonText: {
      fontSize: 14,
      fontWeight: '700',
    },
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
      backgroundColor: '#06A8CC',
    },
    readyChipText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
    startButtonWrap: {
      width: '100%',
      borderRadius: 26,
      overflow: 'hidden',
      shadowColor: '#06A8CC',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.38,
      shadowRadius: 18,
      elevation: 8,
    },
    startButtonDisabled: { opacity: 0.4 },

    // Hero zone: concentric rings + sphere + floating pills
    obHero: {
      position: 'relative',
      width: 280,
      height: 280,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 28,
    },
    obRingOuter: {
      position: 'absolute',
      width: 252,
      height: 252,
      borderRadius: 126,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(9,207,247,0.22)' : 'rgba(6,168,204,0.22)',
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    obRingInner: {
      width: 196,
      height: 196,
      borderRadius: 98,
      borderWidth: 1.2,
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)',
    },
    obSphere: {
      width: 148,
      height: 148,
      borderRadius: 74,
      backgroundColor: isDark ? 'rgba(9,207,247,0.12)' : 'rgba(255,255,255,0.85)',
      borderWidth: 2,
      borderColor: isDark ? 'rgba(9,207,247,0.45)' : 'rgba(6,168,204,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#06A8CC',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: isDark ? 0.45 : 0.22,
      shadowRadius: 24,
      elevation: 10,
    },
    obSphereBadge: {
      width: 116,
      height: 116,
      borderRadius: 58,
      alignItems: 'center',
      justifyContent: 'center',
    },
    obSphereStarBadge: {
      position: 'absolute',
      top: 14,
      right: 16,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: 'rgba(0,0,0,0.25)',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    obPill: {
      position: 'absolute',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.97)',
      borderWidth: 1.2,
      borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.08)',
      gap: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.28 : 0.08,
      shadowRadius: 10,
      elevation: 6,
    },
    obPillTopLeft: { top: 14, left: 0 },
    obPillTopRight: { top: 42, right: 0 },
    obPillBottom: { bottom: 20, left: 8 },
    obPillIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    obPillText: {
      fontSize: 12,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      letterSpacing: 0.3,
    },

    obTitle: {
      fontSize: 26,
      fontWeight: '900',
      color: isDark ? '#FFFFFF' : '#0F172A',
      textAlign: 'center',
      letterSpacing: -0.5,
      marginBottom: 8,
    },
    obSubtitle: {
      fontSize: 14,
      fontWeight: '500',
      color: isDark ? '#94A3B8' : '#475569',
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: 8,
      marginBottom: 4,
    },

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
    coursesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      paddingHorizontal: 20,
    },
    courseCard: {
      width: '47.5%',
      padding: 14,
      borderRadius: 18,
      gap: 9,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
    },
    courseCardIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    courseCardTitle: { fontSize: 13, fontWeight: '700', color: colors.text, lineHeight: 18 },
    courseCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    courseCardMetaText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  });
