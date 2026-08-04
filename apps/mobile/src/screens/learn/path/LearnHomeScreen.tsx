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
import Svg, { Circle, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useThemeContext } from '@/contexts';
import { Colors, ColorScale, Typography, Spacing, BorderRadius, Shadows } from '@/config';
import { Haptics } from '@/services/haptics';
import { useAuthStore } from '@/stores';
import type { PerformanceStatsSummary } from '@/services/stats';
import { topicsService, TopicSubject } from '@/services/topics.service';
import {
  learnPathService,
  LearnerProfile,
  LearnPath,
  LearnUnit,
} from '@/services/learnPath.service';
import { fetchLearnHub } from '../learnHubCache';
import {
  fetchLearnHome,
  hydrateLearnHomeFromDisk,
  isLearnHomeCacheFresh,
  learnHomeCache,
  readLearnHomeFromCache,
  writeLearnHomeToCache,
  persistLearnHomeToDisk,
  invalidateLearnHomeCache,
} from './learnHomeCache';
import { prefetchUnitLesson } from './unitLessonCache';
// Side-effect import: registers the learn-hub course normalizers that
// fetchLearnHub requires (api/learn.ts calls _setLearnHubNormalizers on load).
import '@/api/learn';
import { LearnStackScreenProps } from '@/navigation/types';

type NavigationProp = LearnStackScreenProps<'LearnHome'>['navigation'];

const GRADES = ['7', '8', '9', '10', '11', '12'];

/** Timeline dot accent colors, cycled per unit. */

/** Bold accent colors, cycled along the path / tiles / cards. */
const ACCENTS = [Colors.primary, '#8B5CF6', '#F59E0B', '#10B981', '#EC4899', ColorScale.secondary[500]];

/** Vibrant 2-stop gradient per accent — the rich mockup look. */
// Keyed by the literal accent hex above (object keys can't hold expressions),
// so these stay as plain string keys even though some values reference tokens.
const GRADIENTS: Record<string, [string, string]> = {
  '#0EA5E9': [ColorScale.primary[400], Colors.secondary], // sky → indigo
  '#8B5CF6': ['#A78BFA', '#EC4899'], // violet → pink
  '#F59E0B': ['#FBBF24', ColorScale.secondary[500]], // amber → orange
  '#10B981': ['#34D399', '#06B6D4'], // emerald → cyan
  '#EC4899': ['#F472B6', '#8B5CF6'], // pink → violet
  '#F97316': [ColorScale.secondary[400], Colors.error], // orange → red
};
const gradientFor = (accent: string): [string, string] =>
  GRADIENTS[accent] ?? [accent, accent];
const GRAD_START = { x: 0, y: 0 };
const GRAD_END = { x: 1, y: 1 };

/** Cycling accent + its 2-stop gradient for the Nth unit/subject card. */
const accentAndGradientFor = (index: number) => {
  const accent = ACCENTS[index % ACCENTS.length];
  const [gradStart, gradEnd] = gradientFor(accent);
  return { accent, gradStart, gradEnd };
};

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

  // Synchronous cache read — MainNavigator hydrates from disk at boot and
  // deferred-prefetches, so revisits / warm opens paint without a spinner.
  const cachedHome = readLearnHomeFromCache();
  if (cachedHome && __DEV__) {
    console.log('[LearnHome TTI] memory/disk hit');
  }

  const [loading, setLoading] = useState(!cachedHome);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [pathError, setPathError] = useState(false);
  const [profile, setProfile] = useState<LearnerProfile | null>(cachedHome?.profile ?? null);
  const [path, setPath] = useState<LearnPath | null>(cachedHome?.path ?? null);
  const hasFocusedOnceRef = useRef(false);
  const hasVisibleContentRef = useRef(Boolean(cachedHome?.profile || cachedHome?.path));
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(
    cachedHome?.activeSubjectId ?? null
  );
  const [stats, setStats] = useState<PerformanceStatsSummary | null>(cachedHome?.stats ?? null);
  const [hubCourses, setHubCourses] = useState<any[]>([]);
  const [editingPath, setEditingPath] = useState(false);
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(() => {
    const units = cachedHome?.path?.units;
    const active = units?.find((u) => u.state === 'unlocked');
    return active?.topicId ?? null;
  });

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
    (s: { name: string; nameEn: string | null; nameKh: string | null; grade?: string; code?: string }) => {
      const norm = (s.nameKh || s.nameEn || s.name || '').toLowerCase();
      let base = s.nameKh || s.nameEn || s.name;
      if (norm.startsWith('math') || norm.includes('គណិត')) base = 'គណិតវិទ្យា';
      else if (norm.startsWith('chem') || norm.includes('គីមី')) base = 'គីមីវិទ្យា';
      else if (norm.startsWith('phys') || norm.includes('រូប')) base = 'រូបវិទ្យា';
      else if (norm.startsWith('bio') || norm.includes('ជីវ')) base = 'ជីវវិទ្យា';
      else if (norm.startsWith('eng') || norm.includes('អង់គ្លេស')) base = 'អង់គ្លេស';

      const grade = (s as any).grade;
      const code = (s as any).code || '';
      if (!grade) return base;
      const khGrade = grade === '12' ? '១២' : grade === '11' ? '១១' : grade === '10' ? '១០' : grade === '9' ? '៩' : grade === '8' ? '៨' : grade === '7' ? '៧' : grade;
      let trackStr = '';
      if (code.includes('SCIENCE') || (s.nameKh && s.nameKh.includes('វិទ្យាសាស្ត្រ'))) trackStr = ' (វិទ្យា.)';
      else if (code.includes('SOCIAL') || (s.nameKh && s.nameKh.includes('សង្គម'))) trackStr = ' (សង្គម)';
      return `${base} ថ្នាក់ទី${khGrade}${trackStr}`;
    },
    [],
  );
  const unitName = useCallback((u: LearnUnit) => (isKh ? u.nameKh || u.name : u.name), [isKh]);
  const unitNumberLabel = useCallback(
    (index: number) => (isKh ? `មេរៀនទី ${index + 1}` : `Unit ${index + 1}`),
    [isKh],
  );

  // Catches its own errors (rather than throwing) so a path-specific failure
  // — e.g. switching subjects — never gets confused with a full profile-load
  // failure by callers; each has its own error UI (renderPath's inline retry
  // vs. the full-screen retry in the main render).
  const applyHomePayload = useCallback((payload: {
    profile: LearnerProfile | null;
    path: LearnPath | null;
    activeSubjectId: string | null;
    stats: PerformanceStatsSummary | null;
  }) => {
    setProfile(payload.profile);
    setPath(payload.path);
    if (payload.activeSubjectId) setActiveSubjectId(payload.activeSubjectId);
    if (payload.stats) setStats(payload.stats);
    if (payload.path?.units) {
      const active = payload.path.units.find((u) => u.state === 'unlocked');
      if (active) setExpandedUnitId(active.topicId);
    }
    if (payload.profile || payload.path) {
      hasVisibleContentRef.current = true;
    }
  }, []);

  const loadPath = useCallback(async (subjectId: string) => {
    try {
      setPathError(false);
      const data = await learnPathService.getPath(subjectId);
      setPath(data);
      setActiveSubjectId(subjectId);
      if (data && data.units) {
        const active = data.units.find((u) => u.state === 'unlocked');
        if (active) {
          setExpandedUnitId(active.topicId);
        }
      }
      // Keep module cache in sync so next tab entry is instant.
      writeLearnHomeToCache({
        profile: learnHomeCache.profile,
        path: data,
        activeSubjectId: subjectId,
        stats: learnHomeCache.stats,
      });
      if (userId) void persistLearnHomeToDisk(userId);
    } catch (err) {
      console.warn('[LearnHome] loadPath failed', err);
      if (!path) {
        setPath(null);
        setPathError(true);
      }
    }
  }, [path, userId]);

  const load = useCallback(async (opts?: { silent?: boolean; force?: boolean }) => {
    const silent = (opts?.silent === true || hasVisibleContentRef.current) && !opts?.force;
    const t0 = Date.now();
    try {
      setLoadError(false);
      // Never blank the screen when we already painted from cache.
      if (!silent && !hasVisibleContentRef.current) setLoading(true);

      const [payload] = await Promise.all([
        fetchLearnHome({
          force: opts?.force === true,
          userId,
          subjectId: activeSubjectId || undefined,
        }),
        // Secondary — never blocks first paint.
        fetchLearnHub({ userId })
          .then((hub) => setHubCourses(hub?.courses ?? []))
          .catch(() => {}),
      ]);

      if (payload) {
        applyHomePayload(payload);
        if (__DEV__) {
          console.log(
            `[LearnHome TTI] ${silent ? 'silent-refresh' : 'network'} settle (${Date.now() - t0}ms)`
          );
        }
      } else if (!hasVisibleContentRef.current) {
        setLoadError(true);
      }
    } catch (err) {
      console.warn('[LearnHome] load failed', err);
      if (!hasVisibleContentRef.current) setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeSubjectId, applyHomePayload, userId]);

  // Mount: hydrate disk if needed → fresh cache skip → join inFlight → else fetch.
  useEffect(() => {
    let cancelled = false;
    const mountTs = Date.now();

    (async () => {
      // Cover the race where the user taps Learn before MainNavigator hydrate finishes.
      if (userId && !readLearnHomeFromCache()) {
        await hydrateLearnHomeFromDisk(userId);
        if (cancelled) return;
        const hydrated = readLearnHomeFromCache();
        if (hydrated) {
          applyHomePayload(hydrated);
          setLoading(false);
          if (__DEV__) console.log(`[LearnHome TTI] disk-hydrate hit=${Date.now() - mountTs}ms`);
        }
      }

      if (isLearnHomeCacheFresh()) {
        setLoading(false);
        if (__DEV__) console.log(`[LearnHome TTI] memory-cache hit=${Date.now() - mountTs}ms`);
        return;
      }
      if (learnHomeCache.inFlight) {
        const payload = await learnHomeCache.inFlight;
        if (cancelled) return;
        if (payload) {
          applyHomePayload(payload);
          setLoading(false);
          if (__DEV__) {
            console.log(`[LearnHome TTI] prefetch-await first-paint=${Date.now() - mountTs}ms`);
          }
        } else {
          load({ silent: hasVisibleContentRef.current });
        }
        return;
      }
      load({ silent: hasVisibleContentRef.current });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      // First focus already handled by mount effect — skip to avoid double fetch.
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }
      load({ silent: true });
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
        // Retain selected subjects across multiple grades when switching tabs
        setObSelected((prev) => prev);
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
      invalidateLearnHomeCache();
      hasVisibleContentRef.current = false;
      setActiveSubjectId(null);
      await load({ force: true });
    } catch (err) {
      console.warn('[LearnHome] onboarding save failed', err);
    } finally {
      setObSaving(false);
    }
  };

  const switchSubject = async (subjectId: string) => {
    Haptics.selectionAsync();
    setActiveSubjectId(subjectId);
    // Keep previous path visible until the new subject path lands (no blank flash).
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
    if (unit.hasLesson) {
      prefetchUnitLesson(unit.topicId);
      navigation.navigate('UnitLesson', params);
    } else {
      navigation.navigate('PracticeSession', params);
    }
  };

  const activeUnit = useMemo(
    () => path?.units.find((u) => u.state === 'unlocked') ?? null,
    [path],
  );

  // Warm the next lesson so Continue / READ feels instant.
  useEffect(() => {
    if (activeUnit?.hasLesson) prefetchUnitLesson(activeUnit.topicId);
  }, [activeUnit?.hasLesson, activeUnit?.topicId]);

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
            <Ionicons name="flame" size={15} color={hasStreak ? ColorScale.secondary[500] : colors.textTertiary} />
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
            <Ionicons name="chatbubble-ellipses" size={18} color={Colors.primary} />
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
          <Ionicons name="flame" size={15} color={ColorScale.secondary[500]} />
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
                  <Ionicons name="flame" size={12} color={Colors.white} />
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
          colors={gradientFor(ColorScale.secondary[500])}
          start={GRAD_START}
          end={GRAD_END}
          style={[styles.nudgeCard, styles.nudgeShadow]}
        >
          <View style={styles.nudgeIcon}>
            <Ionicons name="flame" size={22} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nudgeTitle}>
              {stats?.currentStreak ? t('learn.path.nudgeKeepStreak') : t('learn.path.nudgeStartToday')}
            </Text>
            <Text style={styles.nudgeBody} numberOfLines={2}>
              {t('learn.path.nudgeBody', { unit: unitName(activeUnit) })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.white} />
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
                    ? {
                        backgroundColor: isDark ? `${accent}22` : `${accent}12`,
                        borderColor: accent,
                        ...Shadows.xl,
                        shadowColor: accent,
                        shadowOpacity: 0.22,
                      }
                    : {
                        backgroundColor: isDark ? colors.card : Colors.white,
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : ColorScale.gray[200],
                        ...Shadows.lg,
                        shadowColor: ColorScale.gray[900],
                        shadowOpacity: isDark ? 0.2 : 0.04,
                      },
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
                      : { color: isDark ? colors.text : ColorScale.gray[800] },
                  ]}
                >
                  {subjectName(s)}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: Spacing.sm,
                    paddingHorizontal: Spacing.sm,
                    paddingVertical: 3,
                    borderRadius: BorderRadius.lg,
                    backgroundColor: active ? `${accent}20` : (isDark ? 'rgba(255,255,255,0.05)' : ColorScale.gray[100]),
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: active ? accent : (isDark ? colors.textSecondary : ColorScale.gray[400]),
                      marginRight: 5,
                    }}
                  />
                  <Text
                    style={[
                      styles.subjectCardSubLabel,
                      { color: active ? accent : (isDark ? colors.textSecondary : ColorScale.gray[500]) },
                    ]}
                  >
                    {active ? t('learn.path.activeSubject', { defaultValue: 'កំពុងសិក្សា' }) : t('learn.path.tapToStudy', { defaultValue: 'ចុចដើម្បីរៀន' })}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[
              styles.subjectSquircleCardAdd,
              {
                borderColor: isDark ? 'rgba(255,255,255,0.18)' : ColorScale.gray[300],
                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,250,252,0.6)',
              },
            ]}
            activeOpacity={0.8}
            onPress={startEditing}
          >
            <View style={styles.graphicWrapper}>
              <View
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 31,
                  backgroundColor: isDark ? 'rgba(56,189,248,0.12)' : 'rgba(14,165,233,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: isDark ? ColorScale.primary[400] : Colors.primary,
                }}
              >
                <Ionicons name="add" size={36} color={isDark ? ColorScale.primary[400] : Colors.primary} />
              </View>
            </View>
            <Text
              style={[
                styles.subjectSquircleCardLabel,
                { color: isDark ? colors.text : ColorScale.gray[700], marginTop: 2 },
              ]}
            >
              {t('learn.path.addSubject')}
            </Text>
            <View
              style={{
                marginTop: Spacing.sm,
                paddingHorizontal: Spacing.sm,
                paddingVertical: 3,
                borderRadius: BorderRadius.lg,
                backgroundColor: 'transparent',
              }}
            >
              <Text
                style={[
                  styles.subjectCardSubLabel,
                  { color: isDark ? colors.textSecondary : ColorScale.gray[400], fontSize: 10 },
                ]}
              >
                + ជ្រើសរើសបន្ថែម
              </Text>
            </View>
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
        colors={[Colors.primary, '#4F46E5']}
        start={GRAD_START}
        end={GRAD_END}
        style={styles.subjectCard}
      >
        {/* Decorative circles + floating mini icons (illustration-style) */}
        <View style={[styles.deco, { width: 150, height: 150, top: -54, right: -40 }]} />
        <View style={[styles.deco, { width: 80, height: 80, bottom: -30, right: 60 }]} />
        <View style={[styles.deco, { width: 44, height: 44, top: 20, left: -18, opacity: 0.5 }]} />
        <View style={[styles.floatIcon, { top: 8, right: 96, backgroundColor: '#F59E0B' }]}>
          <Ionicons name="star" size={12} color={Colors.white} />
        </View>
        <View style={[styles.floatIcon, { bottom: 64, right: 4, backgroundColor: '#10B981', width: 28, height: 28 }]}>
          <Ionicons name="rocket" size={14} color={Colors.white} />
        </View>

        <View style={styles.subjectCardRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.subjectKickerPill}>
              <Ionicons name={subjectIcon(code)} size={13} color={Colors.white} />
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
                stroke={Colors.white}
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
              colors={['#FBBF24', ColorScale.secondary[500]]}
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
          shadowColor: Colors.black,
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
        {/* Center donut circle */}
        <View
          style={{
            position: 'absolute',
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: isDark ? colors.card : Colors.white,
            top: 15,
            left: 15,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: Colors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 3,
            elevation: 2,
          }}
        >
          <Text style={{ fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.black, color: '#5C6BC0' }}>%</Text>
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
          borderColor: isDark ? 'rgba(197, 202, 233, 0.4)' : '#C5CAE9',
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.4)',
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
          shadowColor: Colors.black,
          shadowOffset: { width: 1, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 3,
          elevation: 2,
        }}
      >
        <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.black, color: Colors.white }}>文</Text>
      </View>

      {/* Front purple card (A) */}
      <View
        style={{
          width: 32,
          height: 42,
          borderRadius: 8,
          backgroundColor: isDark ? 'rgba(209, 196, 233, 0.16)' : '#EDE7F6',
          borderWidth: 2,
          borderColor: isDark ? 'rgba(209, 196, 233, 0.4)' : '#D1C4E9',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute',
          left: 10,
          top: 18,
          zIndex: 2,
          shadowColor: Colors.black,
          shadowOffset: { width: 1, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 3,
          elevation: 3,
        }}
      >
        <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.black, color: '#29B6F6' }}>A</Text>
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
          <View style={[styles.obAuraBlob, { top: -110, right: -90, backgroundColor: isDark ? Colors.brand : '#06A8CC' }]} />
          <View style={[styles.obAuraBlob, { bottom: -80, left: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: isDark ? Colors.info.main : '#93C5FD' }]} />

          {/* Sphere Hero */}
          <View style={styles.obHero}>
            <View style={styles.obRingOuter}>
              <View style={styles.obRingInner} />
            </View>
            <Animated.View style={[styles.obSphere, { transform: [{ translateY: sphereY }] }]}>
              <LinearGradient
                colors={[Colors.brand, '#06A8CC', ColorScale.primary[600]]}
                start={GRAD_START}
                end={GRAD_END}
                style={styles.obSphereBadge}
              >
                <Ionicons name="school" size={52} color={Colors.white} />
                <View style={styles.obSphereStarBadge}>
                  <Ionicons name="star" size={13} color={Colors.warning.light} />
                </View>
              </LinearGradient>
            </Animated.View>
            <Animated.View style={[styles.obPill, styles.obPillTopLeft, { transform: [{ translateY: pillY1 }] }]}>
              <View style={[styles.obPillIcon, { backgroundColor: 'rgba(9,207,247,0.2)' }]}>
                <Ionicons name="compass" size={13} color={Colors.brand} />
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
                colors={[Colors.brand, '#06A8CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.obStartNowGradient}
              >
                <Text style={styles.obStartNowText}>{t('learn.path.startNow', { defaultValue: 'Start Now' })}</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      );
    }

    // ── Phase 2: Grade & Subject Selection (Find Your Course Discovery Screen) ──
    return (
      <View style={[styles.courseDiscoveryFullScreen, { backgroundColor: isDark ? colors.background : ColorScale.gray[50] }]}>
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
            <View style={[styles.searchCircleNeutral, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : Colors.white, borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : ColorScale.gray[200] }]}>
              <Ionicons name="search" size={20} color={isDark ? ColorScale.gray[200] : ColorScale.gray[800]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* World-Class Enterprise Hero Banner Card (Quiz Screen Inspired) */}
        <View style={styles.promoBannerWrap}>
          <LinearGradient
            colors={[Colors.brand, '#06A8CC', ColorScale.primary[600]]}
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
                  <Ionicons name="flash" size={13} color={Colors.warning.light} style={{ marginRight: Spacing.xs }} />
                  <Text style={styles.promoOfferBadgeText}>{t('learn.path.limitedTimeOffer')}</Text>
                </View>
              </View>

              <Text style={styles.promoDiscount}>
                {t('learn.path.promoDiscount', { defaultValue: '60% OFF' })}
              </Text>

              <View style={styles.promoDateRow}>
                <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.9)" style={{ marginRight: Spacing.sm }} />
                <Text style={styles.promoDate}>
                  {t('learn.path.promoDate', { defaultValue: 'Feb 14 - Mar 20' })}
                </Text>
              </View>

              <TouchableOpacity style={styles.promoJoinButtonWhite} activeOpacity={0.85}>
                <Text style={styles.promoJoinTextWhite}>{t('learn.path.joinNow', { defaultValue: 'Claim Offer' })}</Text>
                <Ionicons name="arrow-forward" size={15} color="#06A8CC" style={{ marginLeft: Spacing.sm }} />
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
                <TouchableOpacity style={styles.obRetryButton} onPress={loadObSubjects}>
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
                      <Text style={styles.exploreCardNameBold}>
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
              colors={[Colors.brand, '#06A8CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.obStartNowGradient}
            >
              <Text style={styles.obStartNowText}>
                {obSaving ? t('learn.path.saving') : t('learn.path.startLearning')}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
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

  const renderSubTimeline = (unit: LearnUnit, index: number) => {
    const { accent } = accentAndGradientFor(index);

    const subSteps: Array<{
      id: string;
      type: 'LESSON' | 'PRACTICE';
      titleKh: string;
      titleEn: string;
      icon: keyof typeof Ionicons.glyphMap;
      state: 'locked' | 'unlocked' | 'completed';
      targetVal?: number;
      minDifficulty?: number;
      maxDifficulty?: number;
    }> = [];

    // 1. Add Lesson step if present
    if (unit.hasLesson) {
      subSteps.push({
        id: 'lesson',
        type: 'LESSON',
        titleKh: 'អានមេរៀនសង្ខេប',
        titleEn: 'Read Lesson Summary',
        icon: 'book',
        state: unit.correct > 0 ? 'completed' : 'unlocked',
      });
    }

    // 2. Add Practice Quiz steps dynamically based on grade, question bank size,
    // and — new — how much difficulty-tagged content actually exists. The ladder
    // only promises a stage's difficulty label if that band has enough real
    // content to back it; otherwise it degrades to a plain, unfiltered stage
    // (today's behavior) rather than silently recycling the same few questions
    // under an "Advanced"/"Exam Prep" label that doesn't mean anything yet.
    const bandCounts = unit.difficultyCounts ?? {};
    const countInRange = (lo: number, hi: number) => {
      let sum = 0;
      for (let lvl = lo; lvl <= hi; lvl++) sum += bandCounts[lvl as 1 | 2 | 3 | 4 | 5] ?? 0;
      return sum;
    };
    const MIN_PER_BAND = 2;
    const has5DistinctBands = [1, 2, 3, 4, 5].every((lvl) => countInRange(lvl, lvl) >= MIN_PER_BAND);
    const has3DistinctBands =
      countInRange(1, 2) >= MIN_PER_BAND && countInRange(3, 3) >= MIN_PER_BAND && countInRange(4, 5) >= MIN_PER_BAND;
    const wantsLongLadder = (unit.totalQuestions > 12) || (path?.subject?.grade === '12');

    const rawSteps = wantsLongLadder && has5DistinctBands ? [
      { id: 'p1', ratio: 0.2, titleKh: 'លំហាត់អនុវត្តន៍ ១ (កម្រិតមូលដ្ឋាន)', titleEn: 'Practice Quiz 1 (Basic)', icon: 'extension-puzzle' as const, minDifficulty: 1, maxDifficulty: 1 },
      { id: 'p2', ratio: 0.4, titleKh: 'លំហាត់អនុវត្តន៍ ២ (កម្រិតមធ្យម)', titleEn: 'Practice Quiz 2 (Medium)', icon: 'flash' as const, minDifficulty: 2, maxDifficulty: 2 },
      { id: 'p3', ratio: 0.65, titleKh: 'លំហាត់អនុវត្តន៍ ៣ (កម្រិតខ្ពស់)', titleEn: 'Practice Quiz 3 (Advanced)', icon: 'flame' as const, minDifficulty: 3, maxDifficulty: 3 },
      { id: 'p4', ratio: 0.85, titleKh: 'លំហាត់អនុវត្តន៍ ៤ (ត្រៀមប្រឡង)', titleEn: 'Practice Quiz 4 (Exam Prep)', icon: 'rocket' as const, minDifficulty: 4, maxDifficulty: 4 },
      { id: 'p5', ratio: 1.0, titleKh: 'លំហាត់ផ្ដាច់ព្រ័ត្រ (បាក់ឌុប)', titleEn: 'Final Challenge (Bac II)', icon: 'trophy' as const, minDifficulty: 5, maxDifficulty: 5 },
    ] : has3DistinctBands ? [
      { id: 'p1', ratio: 0.4, titleKh: 'លំហាត់អនុវត្តន៍ ១', titleEn: 'Practice Quiz 1', icon: 'extension-puzzle' as const, minDifficulty: 1, maxDifficulty: 2 },
      { id: 'p2', ratio: 0.8, titleKh: 'លំហាត់អនុវត្តន៍ ២', titleEn: 'Practice Quiz 2', icon: 'flash' as const, minDifficulty: 3, maxDifficulty: 3 },
      { id: 'p3', ratio: 1.0, titleKh: 'លំហាត់ផ្ដាច់ព្រ័ត្រ', titleEn: 'Final Challenge', icon: 'trophy' as const, minDifficulty: 4, maxDifficulty: 5 },
    ] : [
      { id: 'p1', ratio: 0.4, titleKh: 'លំហាត់អនុវត្តន៍ ១', titleEn: 'Practice Quiz 1', icon: 'extension-puzzle' as const, minDifficulty: undefined, maxDifficulty: undefined },
      { id: 'p2', ratio: 0.8, titleKh: 'លំហាត់អនុវត្តន៍ ២', titleEn: 'Practice Quiz 2', icon: 'flash' as const, minDifficulty: undefined, maxDifficulty: undefined },
      { id: 'p3', ratio: 1.0, titleKh: 'លំហាត់ផ្ដាច់ព្រ័ត្រ', titleEn: 'Final Challenge', icon: 'trophy' as const, minDifficulty: undefined, maxDifficulty: undefined },
    ];

    const practiceSteps: Array<{
      id: string;
      type: 'PRACTICE';
      targetVal: number;
      titleKh: string;
      titleEn: string;
      icon: keyof typeof Ionicons.glyphMap;
      state: 'locked' | 'unlocked' | 'completed';
      minDifficulty?: number;
      maxDifficulty?: number;
    }> = [];

    for (const raw of rawSteps) {
      const targetVal = Math.max(1, Math.min(unit.target, Math.round(unit.target * raw.ratio)));
      practiceSteps.push({
        id: raw.id,
        type: 'PRACTICE',
        targetVal,
        titleKh: raw.titleKh,
        titleEn: raw.titleEn,
        icon: raw.icon,
        state: 'locked',
        minDifficulty: raw.minDifficulty,
        maxDifficulty: raw.maxDifficulty,
      });
    }

    // Map correct step state based on progress
    practiceSteps.forEach((step, idx) => {
      if (unit.correct >= step.targetVal) {
        step.state = 'completed';
      } else {
        const prevStep = practiceSteps[idx - 1];
        const isPrevCompleted = prevStep 
          ? prevStep.state === 'completed' 
          : (unit.hasLesson ? unit.correct > 0 : true);

        if (isPrevCompleted) {
          step.state = 'unlocked';
        }
      }
      subSteps.push(step);
    });

    // Find active step (first unlocked step)
    const activeStepIdx = subSteps.findIndex((s) => s.state === 'unlocked');

    // Winding path layout constants
    const H = 155; // vertical step height (increased for plenty of label space)
    const containerWidth = 240; // compact width for nice left/right margins
    const centerX = containerWidth / 2; // 120
    const circleRadius = 32; // diameter 64

    // Screen background color to mask out background lines behind elements
    const screenBg = isDark ? colors.background : ColorScale.gray[100];

    // Generate step positions
    const positions = subSteps.map((_, sIdx) => {
      // Stagger: e.g. -32, 32, -32, 32...
      const offset = sIdx % 2 === 0 ? -32 : 32;
      return {
        cx: centerX + offset,
        cy: 58 + sIdx * H + circleRadius,
      };
    });

    return (
      <View
        style={[
          styles.subTimelineContainer,
          {
            width: containerWidth,
            alignSelf: 'center',
            paddingTop: 32, // Gives 90px total distance to circle center (58px to top edge), preventing bubble overlay
            marginLeft: -18, // Shift left by 18px to center perfectly on the screen
          },
        ]}
      >
        {/* SVG Winding Path with individual colored segments */}
        {positions.length > 1 && (
          <Svg style={StyleSheet.absoluteFill} width={containerWidth} height={subSteps.length * H + 80}>
            {positions.slice(0, -1).map((p1, idx) => {
              const p2 = positions[idx + 1];
              const segPath = `M ${p1.cx} ${p1.cy} C ${p1.cx} ${p1.cy + H/2}, ${p2.cx} ${p2.cy - H/2}, ${p2.cx} ${p2.cy}`;
              const isSegActive = subSteps[idx].state === 'completed' || subSteps[idx].state === 'unlocked';
              return (
                <Path
                  key={`seg-${idx}`}
                  d={segPath}
                  fill="none"
                  stroke={isSegActive ? accent : (isDark ? 'rgba(255,255,255,0.15)' : ColorScale.gray[200])}
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeDasharray="6,12"
                  opacity={isSegActive ? 0.7 : 1}
                />
              );
            })}
          </Svg>
        )}

        {subSteps.map((step, sIdx) => {
          const isCompleted = step.state === 'completed';
          const isLocked = step.state === 'locked';
          const isLesson = step.type === 'LESSON';
          const pos = positions[sIdx];
          const stepTitle = isKh ? step.titleKh : step.titleEn;

          return (
            <View
              key={step.id}
              style={{
                position: 'absolute',
                left: pos.cx - 100, // width 200 centered at pos.cx
                top: pos.cy - circleRadius, // Centered exactly at pos.cy (removed -10px bug)
                width: 200,
                alignItems: 'center',
                zIndex: 5,
              }}
            >
              {/* Progress Ring wrapping the Touchable Inner Circle */}
              <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                
                {/* Solid background mask to hide the winding path line directly behind the circle */}
                <View
                  style={{
                    position: 'absolute',
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: screenBg,
                    zIndex: 0,
                  }}
                />

                {/* Speech Bubble sits perfectly relative to the circle (140px width prevents vertical letter wrapping!) */}
                {sIdx === activeStepIdx && (
                  <View style={[styles.subStepBubble, { width: 140, left: -38, bottom: 68, zIndex: 20 }]}>
                    <View style={[styles.subStepBubbleInner, { backgroundColor: Colors.white, borderColor: accent, borderWidth: 2.5 }]}>
                      <Text style={[styles.subStepBubbleText, { color: accent }]}>
                        {isLesson ? (isKh ? 'អាន' : 'READ') : (isKh ? 'ចាប់ផ្ដើម' : 'START')}
                      </Text>
                    </View>
                    <View style={[styles.subStepBubbleArrow, { borderTopColor: accent }]} />
                  </View>
                )}

                <Svg style={[StyleSheet.absoluteFill, { zIndex: 1 }]} width={64} height={64}>
                  <Circle
                    cx={32}
                    cy={32}
                    r={30}
                    stroke={isLocked ? (isDark ? 'rgba(255,255,255,0.06)' : ColorScale.gray[200]) : isCompleted ? '#10B981' : ColorScale.gray[200]}
                    strokeWidth={3}
                    fill="none"
                  />
                  {!isLocked && !isCompleted && (
                    <Circle
                      cx={32}
                      cy={32}
                      r={30}
                      stroke={accent}
                      strokeWidth={4}
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 30 * 0.45} ${2 * Math.PI * 30}`}
                      transform="rotate(-90 32 32)"
                    />
                  )}
                </Svg>

                <TouchableOpacity
                  activeOpacity={isLocked ? 0.95 : 0.8}
                  disabled={isLocked}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const params = {
                      topicId: unit.topicId,
                      title: unitName(unit),
                      grade: path?.subject?.grade,
                      subjectName: path?.subject?.nameEn || path?.subject?.name,
                      subjectNameKh: path?.subject?.nameKh,
                    };
                    if (isLesson) {
                      prefetchUnitLesson(unit.topicId);
                      navigation.navigate('UnitLesson', params);
                    } else {
                      navigation.navigate('PracticeSession', {
                        ...params,
                        minDifficulty: step.minDifficulty,
                        maxDifficulty: step.maxDifficulty,
                      });
                    }
                  }}
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 27,
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...Shadows.lg,
                    shadowColor: Colors.black,
                    shadowOpacity: isLocked ? 0 : 0.12,
                    elevation: isLocked ? 0 : 3,
                    zIndex: 2,
                  }}
                >
                  <LinearGradient
                    colors={isLocked ? (isDark ? [ColorScale.gray[700], ColorScale.gray[800]] : [ColorScale.gray[200], ColorScale.gray[300]]) : ['#A855F7', '#EC4899']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {isLocked ? (
                    <Ionicons name="lock-closed" size={18} color={isDark ? ColorScale.gray[500] : ColorScale.gray[400]} />
                  ) : (
                    <Ionicons name={step.icon} size={22} color={Colors.white} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Label directly below Circle, masked to hide the winding path line behind it */}
              <Text
                numberOfLines={2}
                style={[
                  styles.subStepLabel,
                  {
                    marginTop: 12,
                    textAlign: 'center',
                    color: isLocked ? colors.textTertiary : colors.text,
                    fontWeight: isCompleted || step.state === 'unlocked' ? Typography.fontWeight.bold : Typography.fontWeight.medium,
                    maxWidth: 140,
                    backgroundColor: screenBg, // MASK the line passing behind text!
                    paddingHorizontal: 8,
                    borderRadius: BorderRadius.sm,
                    overflow: 'hidden',
                  },
                ]}
              >
                {stepTitle}
              </Text>
            </View>
          );
        })}

        {/* Dynamic spacer to push layout height to fit absolute children cleanly without huge gaps */}
        <View style={{ height: subSteps.length * H - 4 }} />
      </View>
    );
  };

  const renderUnitCard = (unit: LearnUnit, index: number, isLast: boolean) => {
    const { accent, gradStart, gradEnd } = accentAndGradientFor(index);
    const completed = unit.state === 'completed';
    const locked = unit.state === 'locked';
    const comingSoon = unit.state === 'no_content';
    const isExpanded = expandedUnitId === unit.topicId;

    return (
      <View key={unit.topicId} style={styles.unitRow}>
        {/* ── Left timeline track ── */}
        <View style={styles.timelineTrack}>
          {/* Continuous vertical connector line */}
          <View style={[styles.timelineLine, isLast && styles.timelineLineLast]} />

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
            onPress={() => {
              if (locked || comingSoon) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                return;
              }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setExpandedUnitId(isExpanded ? null : unit.topicId);
            }}
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
                {unitNumberLabel(index)} ·{' '}
                {completed
                  ? t('learn.path.completed')
                  : comingSoon
                  ? t('learn.path.comingSoon')
                  : locked
                  ? t('learn.path.locked', { defaultValue: 'Locked' })
                  : t('learn.path.inProgress', { defaultValue: 'In Progress' })}
              </Text>
            </View>

            {/* Right: Chevron or Lock */}
            <View style={styles.unitCardRight}>
              {locked || comingSoon ? (
                <Ionicons name="lock-closed" size={18} color={Colors.white} />
              ) : (
                <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={Colors.white} />
              )}
            </View>
          </TouchableOpacity>

          {isExpanded && renderSubTimeline(unit, index)}
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
                allDone ? { color: Colors.white } : { color: colors.textSecondary },
              ]}
            >
              {t('learn.path.finishTrophy')}
            </Text>
          </View>

          {allDone && (
            <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
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
    const allDone = path.units.every((u) => u.state === 'completed' || u.state === 'no_content');

    return (
      <View style={styles.pathList}>
        {path.units.map((u, i) => {
          const isLast = i === path.units.length - 1;
          return renderUnitCard(u, i, isLast);
        })}
        {renderTrophyRow(allDone)}
        {renderMixedReviewCard()}
        {renderExamPapersCard()}
      </View>
    );
  };

  // ── Mixed Review — cross-unit exam-prep quiz over the whole subject ──
  const renderMixedReviewCard = () => {
    if (!path || path.units.every((u) => u.state === 'no_content')) return null;
    return (
      <View style={[styles.unitCardOuter, { paddingBottom: 8 }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.trophyRow, styles.softShadow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('PracticeSession', {
              subjectId: path.subject.id,
              title: t('learn.path.mixedReview', 'Mixed Review'),
              grade: path.subject.grade,
              subjectName: path.subject.nameEn || path.subject.name,
              subjectNameKh: path.subject.nameKh,
            });
          }}
        >
          <View style={styles.trophyIconCircleWhite}>
            <Ionicons name="shuffle" size={20} color={colors.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.trophyLabel, { color: colors.textSecondary }]}>
              {t('learn.path.mixedReview', 'Mixed Review')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
    );
  };

  // ── Exam Papers — real-exam-format quizzes for this subject ──
  const renderExamPapersCard = () => {
    if (!path?.subject?.code) return null;
    return (
      <View style={[styles.unitCardOuter, { paddingBottom: 8 }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.trophyRow, styles.softShadow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('ExamPaperBrowse', {
              courseCode: path.subject.code,
              subjectName: path.subject.nameEn || path.subject.name,
              subjectNameKh: path.subject.nameKh,
            });
          }}
        >
          <View style={styles.trophyIconCircleWhite}>
            <Ionicons name="document-text" size={20} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.trophyLabel, { color: colors.textSecondary }]}>
              {t('learn.path.examPapers', 'Exam Papers')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
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
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
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
                  <Ionicons name="people" size={12} color={colors.textTertiary} style={{ marginLeft: Spacing.sm }} />
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
                invalidateLearnHomeCache();
                load({ force: true });
              }}
              tintColor={colors.textSecondary}
            />
          }
        >
          {renderHero()}
          {loading && !profile && !path && (
            <ActivityIndicator style={{ marginTop: 60 }} color={colors.textSecondary} />
          )}
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

const createStyles = (colors: ReturnType<typeof useThemeContext>['colors'], isDark: boolean) =>
  StyleSheet.create({
    // Subtle tint in light mode so white/gradient cards visibly float.
    safe: { flex: 1, backgroundColor: isDark ? colors.background : ColorScale.gray[100] },
    scrollContent: { paddingBottom: 48 },

    // Flat design style without box shadow
    softShadow: {
      elevation: 0,
    },
    subjectCardShadow: {
      borderWidth: 1,
      borderColor: isDark ? colors.border : ColorScale.gray[200],
    },
    nudgeShadow: {
      borderWidth: 1,
      borderColor: isDark ? ColorScale.secondary[700] : ColorScale.secondary[100],
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
      gap: Spacing.sm,
    },
    heroStreakPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.sm,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(249,115,22,0.15)' : ColorScale.secondary[50],
      borderWidth: 1,
      borderColor: isDark ? 'rgba(249,115,22,0.3)' : ColorScale.secondary[100],
    },
    heroStreakText: {
      fontSize: Typography.fontSize[13],
      fontWeight: Typography.fontWeight.extrabold,
      color: colors.textTertiary,
    },
    heroStreakTextActive: {
      color: ColorScale.secondary[500],
    },
    heroXpBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: Spacing.sm,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FFFBEB',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(245,158,11,0.3)' : '#FDE68A',
    },
    heroXpText: {
      fontSize: Typography.fontSize[11],
      fontWeight: Typography.fontWeight.extrabold,
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
      borderColor: isDark ? colors.border : ColorScale.gray[200],
    },
    avatarContainer: {
      position: 'relative',
    },
    avatar: { width: 38, height: 38, borderRadius: 19 },
    avatarFallback: { backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.extrabold, color: Colors.white },
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
      borderColor: isDark ? colors.background : ColorScale.gray[100], // Matches screen background perfectly!
    },
    levelBadgeText: { fontSize: 8, fontWeight: Typography.fontWeight.black, color: Colors.white, lineHeight: 10 },

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
      fontSize: Typography.fontSize[11],
      fontWeight: Typography.fontWeight.extrabold,
      color: '#D97706',
    },
    xpBarCaption: {
      fontSize: Typography.fontSize[11],
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
    },
    xpBarTrack: {
      height: 10,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : ColorScale.gray[200],
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
      backgroundColor: Colors.white,
      marginRight: Spacing.xs,
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
      borderColor: isDark ? colors.border : ColorScale.gray[200],
    },
    weekCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    weekCardTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.extrabold, color: colors.text },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: isDark ? '#431407' : ColorScale.secondary[50],
      borderWidth: 1,
      borderColor: isDark ? ColorScale.secondary[500] : ColorScale.secondary[100],
    },
    streakBadgeText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.black, color: ColorScale.secondary[500] },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
    weekDayCapsule: {
      width: 40,
      paddingVertical: 8,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : ColorScale.gray[50],
      borderWidth: 1,
      borderColor: 'transparent',
    },
    weekDayCapsuleActive: {
      backgroundColor: isDark ? '#431407' : ColorScale.secondary[50],
      borderColor: isDark ? ColorScale.secondary[500] : ColorScale.secondary[100],
    },
    weekDayCapsuleToday: {
      borderColor: ColorScale.secondary[500],
      backgroundColor: isDark ? 'rgba(249,115,22,0.08)' : 'rgba(249,115,22,0.05)',
    },
    weekDayLabel: { fontSize: Typography.fontSize[11], fontWeight: Typography.fontWeight.semibold, color: colors.textSecondary },
    weekDayLabelActive: { color: ColorScale.secondary[500], fontWeight: Typography.fontWeight.extrabold },
    weekDayLabelToday: { color: ColorScale.secondary[500], fontWeight: Typography.fontWeight.extrabold },
    weekDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : ColorScale.gray[200],
    },
    weekDotActive: { backgroundColor: ColorScale.secondary[500] },
    weekDotToday: { borderWidth: 1.5, borderColor: ColorScale.secondary[500] },
    weekDotEmpty: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
    },
    weekDotEmptyToday: {
      backgroundColor: ColorScale.secondary[500],
    },

    // Nudge
    nudgeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 20,
      marginTop: 12,
      padding: Spacing.md,
      borderRadius: BorderRadius[20],
      backgroundColor: ColorScale.secondary[500],
    },
    nudgeIcon: {
      width: 42,
      height: 42,
      borderRadius: BorderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    nudgeTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.extrabold, color: Colors.white, lineHeight: 22 },
    nudgeBody: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, color: 'rgba(255,255,255,0.9)', marginTop: Spacing.xs, lineHeight: 18 },

    // Subject card — shadow lives on the wrapper (a gradient with
    // overflow:hidden can't cast a shadow on iOS).
    subjectCardWrap: {
      marginHorizontal: 20,
      marginTop: 12,
      borderRadius: BorderRadius['2xl'],
    },
    subjectCard: {
      padding: Spacing[5],
      borderRadius: BorderRadius['2xl'],
      overflow: 'hidden',
    },
    deco: {
      position: 'absolute',
      borderRadius: 9999,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    floatIcon: {
      position: 'absolute',
      width: 24,
      height: 24,
      borderRadius: 9999,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    subjectCardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    subjectKickerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      alignSelf: 'flex-start',
      paddingHorizontal: Spacing[3],
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.lg,
      backgroundColor: 'rgba(255,255,255,0.22)',
    },
    subjectKickerText: { fontSize: Typography.fontSize[11], fontWeight: Typography.fontWeight.extrabold, color: Colors.white, letterSpacing: 0.4 },
    subjectTitle: {
      fontFamily: 'Koulen-Regular',
      fontSize: Typography.fontSize['2xl'],
      color: Colors.white,
      marginTop: 8,
      paddingTop: Spacing.sm,
      lineHeight: 38,
    },
    subjectMeta: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, color: 'rgba(255,255,255,0.85)', marginTop: 4, lineHeight: 18 },
    subjectRing: { alignItems: 'center', justifyContent: 'center' },
    subjectRingText: {
      position: 'absolute',
      fontSize: Typography.fontSize[13],
      fontWeight: Typography.fontWeight.black,
      color: Colors.white,
    },
    continueButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 16,
      paddingVertical: 12,
      borderRadius: BorderRadius[20],
      backgroundColor: Colors.white,
    },
    continueButtonText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.extrabold, color: '#4F46E5' },
    editPathLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      marginTop: Spacing[3],
    },
    editPathLinkText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, color: colors.textSecondary },

    // Load-error + retry (full-screen and inline-within-path variants)
    fullLoadErrorBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing[16],
      paddingHorizontal: 32,
      gap: 12,
    },
    pathErrorBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
      paddingHorizontal: 24,
      gap: Spacing[3],
    },
    loadErrorText: {
      fontSize: Typography.fontSize.base,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    loadErrorRetryButton: {
      marginTop: 4,
      paddingHorizontal: 20,
      paddingVertical: Spacing[3],
      borderRadius: 12,
      backgroundColor: Colors.primary,
    },
    loadErrorRetryText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold, color: Colors.white },

    // Subject rail
    railWrap: { marginTop: Spacing.sm },
    railTitle: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.extrabold,
      color: colors.text,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    railRow: { paddingHorizontal: 20, gap: 12 },
    subjectSquircleCard: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: Spacing[5],
      borderRadius: BorderRadius['2xl'],
      borderWidth: 1.5,
      minWidth: 155,
      height: 174,
    },
    subjectSquircleCardAdd: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: Spacing[5],
      borderRadius: BorderRadius['2xl'],
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: 'dashed',
      backgroundColor: colors.card,
      minWidth: 145,
      height: 174,
    },
    graphicWrapper: {
      height: 70,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: Spacing.xs,
    },
    graphicScale: {
      width: 70,
      height: 70,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ scale: 0.86 }],
    },
    subjectSquircleCardLabel: {
      fontSize: Typography.fontSize.sm,
      lineHeight: 24,
      fontWeight: Typography.fontWeight.extrabold,
      textAlign: 'center',
      letterSpacing: 0.2,
      paddingVertical: 4,
    },
    subjectSquircleCardLabelActive: {
      fontWeight: Typography.fontWeight.extrabold,
    },
    subjectCardSubLabel: {
      fontSize: Typography.fontSize[11],
      lineHeight: 18,
      fontWeight: Typography.fontWeight.semibold,
      textAlign: 'center',
      paddingTop: Spacing.xs,
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
      paddingHorizontal: Spacing[5],
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.xl,
      borderWidth: 2.2,
      backgroundColor: Colors.white,
    },
    activeStartBubbleText: {
      fontSize: Typography.fontSize[13],
      fontWeight: Typography.fontWeight.black,
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
    },
    activeUnitTitle: {
      fontFamily: 'Koulen-Regular',
      fontSize: Typography.fontSize.xl,
      color: colors.text,
      textAlign: 'center',
      marginTop: 12,
      paddingTop: 4,
      lineHeight: 32,
    },
    activeUnitProgress: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
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
      backgroundColor: Colors.white,
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
      borderRadius: 32, // = height / 2 — keeps this a fully rounded pill, not a card-corner radius
      height: 64,
      paddingHorizontal: Spacing.md,
      overflow: 'hidden',
      gap: 12,
      borderWidth: 0,
    },
    unitCardIconCircleWhite: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: Colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unitCardText: {
      flex: 1,
    },
    unitCardTitleTextWhite: {
      fontFamily: 'Koulen-Regular',
      fontSize: Typography.fontSize[17],
      color: Colors.white,
      paddingTop: 4,
      lineHeight: 28,
    },
    unitCardSubTextWhite: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold,
      color: 'rgba(255,255,255,0.75)',
      marginTop: 0,
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
      borderRadius: 32, // = height / 2 — fully rounded pill, matches unitCard
      height: 64,
      paddingHorizontal: Spacing.md,
      overflow: 'hidden',
      gap: 12,
      borderWidth: 1,
      flex: 1,
    },
    trophyIconCircleWhite: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: Colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trophyLabel: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.extrabold,
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
      borderRadius: BorderRadius['2xl'],
      ...Shadows.xl,
      shadowColor: '#06A8CC',
      shadowOpacity: 0.38,
    },
    obStartNowGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing[5],
      borderRadius: BorderRadius['2xl'],
      gap: 8,
    },
    obStartNowText: {
      fontSize: Typography.fontSize[17],
      fontWeight: Typography.fontWeight.extrabold,
      color: Colors.white,
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
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
      marginBottom: Spacing.xs,
    },
    courseDiscoveryTitle: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.extrabold,
      color: colors.text,
      letterSpacing: -0.3,
    },
    searchIconButtonNeutral: {
      borderRadius: 22, // = size / 2 (44x44 touch target) — keeps this circular
    },
    searchCircleNeutral: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      ...Shadows.lg,
      shadowColor: Colors.black,
    },
    promoBannerWrap: {
      marginBottom: 24,
      borderRadius: BorderRadius['2xl'],
      overflow: 'hidden',
      ...Shadows.xl,
      shadowColor: '#06A8CC',
      shadowOpacity: 0.28,
    },
    promoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 24,
      borderRadius: BorderRadius['2xl'],
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
      gap: Spacing.xs,
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: Spacing[3],
      paddingVertical: 4,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    promoOfferBadgeText: {
      fontSize: Typography.fontSize[11],
      fontWeight: Typography.fontWeight.extrabold,
      color: Colors.white,
      letterSpacing: 0.5,
    },
    promoDiscount: {
      fontSize: Typography.fontSize['3xl'],
      fontWeight: Typography.fontWeight.black,
      color: Colors.white,
      marginBottom: Spacing.sm,
      letterSpacing: -0.5,
      textShadowColor: 'rgba(0,0,0,0.15)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    promoDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginBottom: 16,
    },
    promoDate: {
      fontSize: Typography.fontSize[13],
      fontWeight: Typography.fontWeight.semibold,
      color: 'rgba(255,255,255,0.85)',
    },
    promoJoinButtonWhite: {
      paddingVertical: Spacing[3],
      paddingHorizontal: Spacing.lg,
      borderRadius: 20,
      backgroundColor: Colors.white,
      ...Shadows.lg,
      shadowColor: Colors.black,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
    },
    promoJoinTextWhite: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.extrabold,
      color: '#06A8CC',
    },
    exploreTitle: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.extrabold,
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
      paddingVertical: Spacing[3],
      borderRadius: 20,
      backgroundColor: isDark ? colors.card : ColorScale.gray[100],
      borderWidth: 1.5,
      borderColor: isDark ? colors.border : ColorScale.gray[200],
      alignItems: 'center',
      justifyContent: 'center',
    },
    gradeChipSelected: {
      backgroundColor: '#06A8CC',
      borderColor: '#06A8CC',
      ...Shadows.lg,
      shadowColor: '#06A8CC',
      shadowOpacity: 0.3,
    },
    gradeChipText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textSecondary,
    },
    gradeChipTextSelected: {
      color: Colors.white,
      fontWeight: Typography.fontWeight.extrabold,
    },
    gradeReadyIndicator: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: ColorScale.primary[400],
    },
    subjectGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 20,
    },
    exploreGridCard: {
      minWidth: '47%',
      flexGrow: 1,
      width: 'auto',
      padding: 20,
      borderRadius: BorderRadius['2xl'],
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 185,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : ColorScale.gray[200],
      position: 'relative',
    },
    exploreGridCardSelected: {
      borderColor: '#06A8CC',
      backgroundColor: isDark ? 'rgba(6, 168, 204, 0.12)' : '#E0F9FD',
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
      fontSize: Typography.fontSize.sm,
      lineHeight: 24,
      fontWeight: Typography.fontWeight.extrabold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: 4,
      paddingVertical: 2,
    },
    exploreCardMetadata: {
      fontSize: Typography.fontSize[11],
      fontWeight: Typography.fontWeight.medium,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    subjectProgressBarBg: {
      width: '85%',
      height: 4,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : ColorScale.gray[200],
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
      marginTop: Spacing[5],
      alignItems: 'center',
    },
    cancelEditButton: {
      paddingVertical: 12,
      paddingHorizontal: 28,
      borderRadius: BorderRadius['2xl'],
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    cancelEditButtonText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
    },
    obEmptyCard: {
      alignItems: 'center',
      gap: Spacing[3],
      padding: 20,
      borderRadius: BorderRadius[20],
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    obEmptyText: { fontSize: Typography.fontSize[13], color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
    readyRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    readyLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, color: colors.textSecondary },
    readyChip: {
      paddingHorizontal: 12,
      paddingVertical: Spacing.sm,
      borderRadius: 12,
      backgroundColor: '#06A8CC',
    },
    readyChipText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.extrabold, color: Colors.white },
    // Matches the onboarding flow's own cyan identity (#06A8CC/#09CFF7),
    // not the main app's ACCENTS[0] sky blue used by the shared
    // loadErrorRetryButton style — this card only ever appears mid-onboarding.
    obRetryButton: {
      marginTop: 4,
      paddingHorizontal: 20,
      paddingVertical: Spacing[3],
      borderRadius: 12,
      backgroundColor: '#06A8CC',
    },
    startButtonWrap: {
      width: '100%',
      borderRadius: BorderRadius['2xl'],
      overflow: 'hidden',
      ...Shadows.xl,
      shadowColor: '#06A8CC',
      shadowOpacity: 0.38,
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
      ...Shadows.xl,
      shadowColor: '#06A8CC',
      shadowOpacity: isDark ? 0.45 : 0.22,
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
      paddingVertical: Spacing.sm,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.97)',
      borderWidth: 1.2,
      borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.08)',
      gap: 6,
      ...Shadows.xl,
      shadowColor: Colors.black,
      shadowOpacity: isDark ? 0.28 : 0.08,
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
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.extrabold,
      color: isDark ? Colors.white : ColorScale.gray[900],
      letterSpacing: 0.3,
    },

    obTitle: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.black,
      color: isDark ? Colors.white : ColorScale.gray[900],
      textAlign: 'center',
      letterSpacing: -0.5,
      marginBottom: 8,
    },
    obSubtitle: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
      color: isDark ? ColorScale.gray[400] : ColorScale.gray[600],
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: 8,
      marginBottom: 4,
    },

    // Courses
    coursesSection: {
      marginTop: Spacing[5],
      paddingTop: Spacing[5],
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
    coursesTitle: { fontSize: Typography.fontSize[17], fontWeight: Typography.fontWeight.extrabold, color: colors.text },
    seeAllButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    seeAllText: { fontSize: Typography.fontSize[13], fontWeight: Typography.fontWeight.bold, color: Colors.primary },
    coursesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      paddingHorizontal: 20,
    },
    courseCard: {
      width: '47.5%',
      padding: Spacing.md,
      borderRadius: BorderRadius[20],
      gap: Spacing.sm,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: isDark ? colors.border : ColorScale.gray[200],
    },
    courseCardIcon: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    courseCardTitle: { fontSize: Typography.fontSize[13], fontWeight: Typography.fontWeight.bold, color: colors.text, lineHeight: 18 },
    courseCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    courseCardMetaText: { fontSize: Typography.fontSize[11], fontWeight: Typography.fontWeight.semibold, color: colors.textSecondary },

    // Sub-timeline styles
    subTimelineContainer: {
      position: 'relative',
      alignItems: 'center',
      marginBottom: 16,
    },
    subStepLabel: {
      fontSize: Typography.fontSize.xs,
      lineHeight: 16,
      textAlign: 'center',
    },
    subStepBubble: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    subStepBubbleInner: {
      paddingHorizontal: 16,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius[20],
      ...Shadows.lg,
      shadowColor: Colors.black,
    },
    subStepBubbleText: {
      fontSize: Typography.fontSize[13],
      fontWeight: Typography.fontWeight.extrabold,
      letterSpacing: 0.5,
      textAlign: 'center',
    },
    subStepBubbleArrow: {
      width: 0,
      height: 0,
      borderLeftWidth: 6,
      borderRightWidth: 6,
      borderTopWidth: 6,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      marginTop: -1,
    },
  });
