/**
 * UnitLessonScreen — a unit's mini-lesson + formula sheet, shown before
 * practice (Duolingo "guidebook" equivalent). Content comes from
 * GET /learn/lesson (Topic.miniLesson[Kh] + formulaSheet Json).
 * "Start practice" replaces this screen with the PracticeSession so Back
 * from practice returns to the path, not the lesson.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useThemeContext } from '@/contexts';
import { useReducedMotion } from '@/hooks';
import { Haptics } from '@/services/haptics';
import { UnitLesson } from '@/services/learnPath.service';
import { LearnStackScreenProps } from '@/navigation/types';
import { MarkdownMathView, FormulaListView } from '@/components/learn/MarkdownMathView';
import {
  fetchUnitLesson,
  getCachedUnitLesson,
} from './unitLessonCache';

type Props = LearnStackScreenProps<'UnitLesson'>;

const ACCENT = '#0EA5E9';
const ACCENT_DEEP = '#0284C7';
const VIOLET = '#8B5CF6';

function SkeletonBlock({
  width,
  height,
  style,
  colors,
}: {
  width: number | `${number}%`;
  height: number;
  style?: object;
  colors: { surfaceVariant: string; border: string };
}) {
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: 10,
          backgroundColor: colors.surfaceVariant,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        style,
      ]}
    />
  );
}

export function UnitLessonScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<Props['navigation']>();
  const route = useRoute<Props['route']>();
  const { topicId, title, grade, subjectName, subjectNameKh } = route.params;
  const isKh = i18n.language?.startsWith('km');
  const reduceMotion = useReducedMotion();

  const initialCached = useMemo(() => getCachedUnitLesson(topicId), [topicId]);
  const [lesson, setLesson] = useState<UnitLesson | null | undefined>(initialCached);
  const [loadError, setLoadError] = useState(false);

  const contentOpacity = useRef(new Animated.Value(initialCached !== undefined ? 1 : 0)).current;
  const contentTranslate = useRef(new Animated.Value(initialCached !== undefined ? 0 : 16)).current;
  const footerTranslate = useRef(new Animated.Value(initialCached !== undefined ? 0 : 28)).current;
  const footerOpacity = useRef(new Animated.Value(initialCached !== undefined ? 1 : 0)).current;
  const ctaScale = useRef(new Animated.Value(1)).current;
  const shimmer = useRef(new Animated.Value(0.35)).current;
  const hasPlayedEnter = useRef(initialCached !== undefined);

  const playEnter = useCallback(() => {
    if (hasPlayedEnter.current) return;
    hasPlayedEnter.current = true;
    if (reduceMotion) {
      contentOpacity.setValue(1);
      contentTranslate.setValue(0);
      footerOpacity.setValue(1);
      footerTranslate.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslate, {
        toValue: 0,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(80),
        Animated.parallel([
          Animated.timing(footerOpacity, {
            toValue: 1,
            duration: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(footerTranslate, {
            toValue: 0,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [
    contentOpacity,
    contentTranslate,
    footerOpacity,
    footerTranslate,
    reduceMotion,
  ]);

  const loadLesson = useCallback(
    (force = false) => {
      setLoadError(false);
      const cached = getCachedUnitLesson(topicId);
      if (cached !== undefined && !force) {
        setLesson(cached);
        playEnter();
      } else if (cached === undefined) {
        setLesson(undefined);
      }

      fetchUnitLesson(topicId, force)
        .then((data) => {
          setLesson(data);
          playEnter();
        })
        .catch(() => {
          if (getCachedUnitLesson(topicId) === undefined) {
            setLesson(null);
            setLoadError(true);
          }
        });
    },
    [playEnter, topicId],
  );

  useEffect(() => {
    loadLesson(false);
  }, [loadLesson]);

  // Soft skeleton pulse while waiting for first paint.
  useEffect(() => {
    if (lesson !== undefined || loadError || reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 0.85,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.35,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [lesson, loadError, reduceMotion, shimmer]);

  const startPractice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.replace('PracticeSession', { topicId, title, grade, subjectName, subjectNameKh });
  };

  const openTutor = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('TutorChat', { topicId, title, grade, subjectName, subjectNameKh });
  };

  const onCtaPressIn = () => {
    if (reduceMotion) return;
    Animated.spring(ctaScale, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 7,
      tension: 200,
    }).start();
  };

  const onCtaPressOut = () => {
    if (reduceMotion) return;
    Animated.spring(ctaScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 160,
    }).start();
  };

  const lessonText = lesson
    ? (isKh ? lesson.miniLessonKh || lesson.miniLesson : lesson.miniLesson || lesson.miniLessonKh) ?? ''
    : '';
  const formulas = Array.isArray(lesson?.formulaSheet) ? lesson!.formulaSheet : [];
  const subjectLabel = isKh
    ? subjectNameKh || subjectName || ''
    : subjectName || subjectNameKh || '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', { defaultValue: 'Back' })}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          {!!subjectLabel && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {subjectLabel}
              {grade ? ` · ${isKh ? `ថ្នាក់ទី${grade}` : `Grade ${grade}`}` : ''}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={openTutor}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel={t('learn.path.askTutor', { defaultValue: 'Ask tutor' })}
        >
          <View style={styles.tutorBadge}>
            <Ionicons name="chatbubble-ellipses" size={18} color={ACCENT} />
          </View>
        </TouchableOpacity>
      </View>

      {lesson === undefined && !loadError && (
        <Animated.View style={[styles.skeletonWrap, { opacity: shimmer }]}>
          <SkeletonBlock width={120} height={28} colors={colors} style={{ marginBottom: 18 }} />
          <SkeletonBlock width="100%" height={16} colors={colors} style={{ marginBottom: 10 }} />
          <SkeletonBlock width="92%" height={16} colors={colors} style={{ marginBottom: 10 }} />
          <SkeletonBlock width="88%" height={16} colors={colors} style={{ marginBottom: 10 }} />
          <SkeletonBlock width="70%" height={16} colors={colors} style={{ marginBottom: 24 }} />
          <SkeletonBlock width={140} height={28} colors={colors} style={{ marginBottom: 14 }} />
          <SkeletonBlock width="100%" height={56} colors={colors} style={{ marginBottom: 10 }} />
          <SkeletonBlock width="100%" height={56} colors={colors} />
        </Animated.View>
      )}

      {loadError && (
        <View style={styles.centerBox}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="cloud-offline-outline" size={36} color={colors.textTertiary} />
          </View>
          <Text style={styles.errorText}>{t('learn.path.loadError')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadLesson(true)} activeOpacity={0.85}>
            <Text style={styles.retryButtonText}>{t('learn.path.retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {lesson !== undefined && !loadError && (
        <>
          <Animated.View
            style={{
              flex: 1,
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslate }],
            }}
          >
            <ScrollView
              contentContainerStyle={styles.body}
              showsVerticalScrollIndicator={false}
            >
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(14,165,233,0.18)', 'rgba(14,165,233,0.04)']
                    : ['#E0F2FE', '#F0F9FF']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.lessonBadge}>
                  <Ionicons name="book" size={15} color={ACCENT_DEEP} />
                  <Text style={styles.lessonBadgeText}>{t('learn.path.miniLesson')}</Text>
                </View>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {title}
                </Text>
                <Text style={styles.heroHint}>
                  {t('learn.path.lessonHint', {
                    defaultValue: isKh
                      ? 'អានសង្ខេបមេរៀននេះ មុនពេលចាប់ផ្តើមហ្វឹកហាត់'
                      : 'Skim this summary before you start practicing',
                  })}
                </Text>
              </LinearGradient>

              {lessonText.length === 0 && (
                <Text style={styles.paragraph}>{t('learn.path.lessonEmpty')}</Text>
              )}
              {lessonText.length > 0 && (
                <View style={styles.lessonCard}>
                  <MarkdownMathView text={lessonText} colors={colors} isDark={isDark} />
                </View>
              )}

              {formulas.length > 0 && (
                <View style={styles.formulaSection}>
                  <View style={[styles.lessonBadge, styles.formulaBadge]}>
                    <Ionicons name="calculator" size={15} color={VIOLET} />
                    <Text style={[styles.lessonBadgeText, { color: VIOLET }]}>
                      {t('learn.path.formulaSheet')}
                    </Text>
                  </View>
                  <View style={styles.formulaList}>
                    <FormulaListView
                      formulas={formulas}
                      colors={colors}
                      isDark={isDark}
                      minHeight={40 * formulas.length}
                    />
                  </View>
                </View>
              )}
            </ScrollView>
          </Animated.View>

          <Animated.View
            style={[
              styles.footer,
              {
                opacity: footerOpacity,
                transform: [{ translateY: footerTranslate }],
              },
            ]}
          >
            <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
              <Pressable
                onPress={startPractice}
                onPressIn={onCtaPressIn}
                onPressOut={onCtaPressOut}
                style={styles.startButtonPressable}
              >
                <LinearGradient
                  colors={[ACCENT, ACCENT_DEEP]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.startButton}
                >
                  <Text style={styles.startButtonText}>{t('learn.path.startPractice')}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 8,
      gap: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerButton: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
    headerTitle: {
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    headerSubtitle: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tutorBadge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(14,165,233,0.18)' : '#E0F2FE',
    },
    skeletonWrap: { padding: 20, paddingTop: 28 },
    body: { padding: 16, paddingBottom: 28 },
    heroCard: {
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(14,165,233,0.25)' : '#BAE6FD',
    },
    heroTitle: {
      marginTop: 10,
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.2,
    },
    heroHint: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    lessonBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(14,165,233,0.16)' : 'rgba(255,255,255,0.75)',
    },
    formulaBadge: {
      backgroundColor: isDark ? 'rgba(139,92,246,0.18)' : '#F3E8FF',
      marginBottom: 12,
    },
    lessonBadgeText: { fontSize: 12, fontWeight: '800', color: ACCENT_DEEP },
    lessonCard: {
      borderRadius: 16,
      padding: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    formulaSection: { marginTop: 20 },
    centerBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 10,
    },
    errorIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceVariant,
      marginBottom: 4,
    },
    errorText: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    retryButton: {
      marginTop: 8,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: ACCENT,
    },
    retryButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
    paragraph: {
      fontSize: 15,
      lineHeight: 24,
      color: colors.text,
      marginBottom: 14,
    },
    formulaList: { gap: 10 },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    startButtonPressable: { borderRadius: 16, overflow: 'hidden' },
    startButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      borderRadius: 16,
    },
    startButtonText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  });
