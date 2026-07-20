/**
 * ExamPaperBrowseScreen — Exact Design Match to Reference Screenshot
 *
 * 1. Rich Purple Gradient Header: Centered title with 2 left-aligned badge pills below.
 * 2. Clean White Cards: Generous rounded corners (borderRadius: 24) and soft shadow.
 * 3. Left Bullet Badges: Vertical rounded rectangles (01, 02, 03) in solid vibrant colors.
 * 4. Soft Pastel Tag Pills & Action Circle: High contrast, clean modern typography.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useThemeContext } from '@/contexts';
import { Haptics } from '@/services/haptics';
import { browseQuizzes, QuizItem } from '@/services/quiz';
import { LearnStackScreenProps } from '@/navigation/types';

type Props = LearnStackScreenProps<'ExamPaperBrowse'>;

// ── Left Bullet Badge Palette (matches 01 Purple, 02 Blue, 03 Amber from screenshot) ──
const BADGE_PALETTE = [
  '#8B5CF6', // 01: Purple
  '#0EA5E9', // 02: Blue/Teal
  '#F59E0B', // 03: Amber/Orange
  '#10B981', // 04: Emerald Green
  '#EC4899', // 05: Rose/Pink
  '#6366F1', // 06: Indigo
];

export function ExamPaperBrowseScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = createStyles(colors, isDark);
  const navigation = useNavigation<any>();
  const route = useRoute<Props['route']>();
  const insets = useSafeAreaInsets();
  const { courseCode, subjectName, subjectNameKh } = route.params;
  const isKh = i18n.language?.startsWith('km');

  const [papers, setPapers] = useState<QuizItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    setLoadError(false);
    setPapers(null);
    browseQuizzes({ courseCode, examOnly: true, limit: 50 })
      .then((res) => setPapers(res.data))
      .catch(() => {
        setPapers(null);
        setLoadError(true);
      });
  }, [courseCode]);

  useEffect(() => {
    load();
  }, [load]);

  const openPaper = (quiz: QuizItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('QuizDetails', { quiz });
  };

  const displayTitle = isKh ? subjectNameKh || subjectName : subjectName || subjectNameKh;

  return (
    <View style={styles.root}>
      {/* ── Rich Purple Gradient Header (exact match to screenshot) ── */}
      <LinearGradient
        colors={isDark ? ['#312E81', '#1E1B4B'] : ['#7C3AED', '#8B5CF6', '#A855F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        {/* Decorative Blobs */}
        <View style={styles.hdrBlobRight} />
        <View style={styles.hdrBlobLeft} />

        {/* Top Nav Row */}
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.titleWrap}>
            <Text style={styles.headerSubTitle}>{t('learn.path.examPapers')}</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {displayTitle || t('learn.path.examPapers')}
            </Text>
          </View>

          <View style={{ width: 38 }} />
        </View>

        {/* Bottom Pills Row (Left Aligned under title) */}
        {papers && papers.length > 0 && (
          <View style={styles.headerPillsRow}>
            <View style={styles.headerPill}>
              <Ionicons name="document-text" size={14} color="#FDE68A" />
              <Text style={styles.headerPillText}>
                {papers.length} {t('learn.path.examPapers', { defaultValue: 'Papers' })}
              </Text>
            </View>
            <View style={styles.headerPill}>
              <Ionicons name="school" size={14} color="#FDE68A" />
              <Text style={styles.headerPillText}>Official Exams</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* ── States ── */}
      {papers === null && !loadError && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.stateText}>{t('common.loading', { defaultValue: 'Loading papers...' })}</Text>
        </View>
      )}

      {loadError && (
        <View style={styles.centerBox}>
          <View style={styles.stateIconWrap}>
            <Ionicons name="cloud-offline-outline" size={36} color="#8B5CF6" />
          </View>
          <Text style={styles.stateTitle}>{t('learn.path.loadError')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Ionicons name="refresh-outline" size={16} color="#FFF" />
            <Text style={styles.retryText}>{t('learn.path.retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {papers && papers.length === 0 && (
        <View style={styles.centerBox}>
          <View style={styles.stateIconWrap}>
            <Ionicons name="document-text-outline" size={36} color="#8B5CF6" />
          </View>
          <Text style={styles.stateTitle}>{t('learn.path.examPapersEmpty')}</Text>
        </View>
      )}

      {/* ── White Cards List with Left Bullet Badges (100% Native Smooth Scroll) ── */}
      {papers && papers.length > 0 && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 28 }]}
        >
          {papers.map((quiz, index) => {
            const badgeColor = BADGE_PALETTE[index % BADGE_PALETTE.length];
            const numStr = String(index + 1).padStart(2, '0');

            return (
              <TouchableOpacity
                key={quiz.id}
                style={styles.card}
                activeOpacity={0.82}
                onPress={() => openPaper(quiz)}
              >
                {/* Left Column: Vertical Bullet Badge (#01, #02, #03) */}
                <View style={[styles.bulletBadge, { backgroundColor: badgeColor }]}>
                  <Text style={styles.bulletNum}>{numStr}</Text>
                  <Ionicons name="document-text" size={15} color="rgba(255,255,255,0.85)" style={{ marginTop: 2 }} />
                </View>

                {/* Middle Column: Title + Tag Pills */}
                <View style={styles.cardMiddle}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {quiz.title}
                  </Text>

                  <View style={styles.tagsRow}>
                    {!!quiz.examDuration && (
                      <View style={styles.durationPill}>
                        <Ionicons name="time-outline" size={13} color="#6D28D9" />
                        <Text style={styles.durationText}>{quiz.examDuration} min</Text>
                      </View>
                    )}
                    {!!quiz.examTotalPoints && (
                      <View style={styles.pointsPill}>
                        <Ionicons name="star" size={13} color="#D97706" />
                        <Text style={styles.pointsText}>{quiz.examTotalPoints} pts</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Right Column: Circular Action Arrow */}
                <View style={styles.actionCircle}>
                  <Ionicons name="arrow-forward" size={18} color="#7C3AED" />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: isDark ? colors.background : '#F8FAFC',
    },

    // ── Rich Purple Gradient Header ──
    header: {
      paddingHorizontal: 16,
      paddingBottom: 22,
      overflow: 'hidden',
    },
    hdrBlobRight: {
      position: 'absolute',
      top: -30,
      right: -30,
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    hdrBlobLeft: {
      position: 'absolute',
      bottom: -40,
      left: -40,
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleWrap: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    headerSubTitle: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    },
    headerTitle: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '900',
      marginTop: 2,
    },
    headerPillsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 4,
    },
    headerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    headerPillText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },

    // ── States ──
    centerBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 12,
    },
    stateIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: 'rgba(139,92,246,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stateTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    stateText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#8B5CF6',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 16,
      marginTop: 4,
    },
    retryText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFF',
    },

    // ── List & White Cards ──
    listContent: {
      padding: 16,
      gap: 14,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? colors.card : '#FFFFFF',
      borderRadius: 24,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.0 : 0.05,
      shadowRadius: 12,
      elevation: 3,
    },

    // Left Column: Vertical Bullet Badge
    bulletBadge: {
      width: 58,
      height: 76,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bulletNum: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '900',
      letterSpacing: -0.5,
    },

    // Middle Column: Title + Tags
    cardMiddle: {
      flex: 1,
      paddingHorizontal: 14,
      justifyContent: 'center',
    },
    cardTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
      lineHeight: 22,
    },
    tagsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
      flexWrap: 'wrap',
    },
    durationPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(139,92,246,0.18)' : '#EDE9FE',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
    },
    durationText: {
      color: isDark ? '#C4B5FD' : '#6D28D9',
      fontSize: 12,
      fontWeight: '700',
    },
    pointsPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(245,158,11,0.18)' : '#FEF3C7',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
    },
    pointsText: {
      color: isDark ? '#FDE68A' : '#D97706',
      fontSize: 12,
      fontWeight: '700',
    },

    // Right Column: Action Circle Arrow
    actionCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : '#F3E8FF',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
