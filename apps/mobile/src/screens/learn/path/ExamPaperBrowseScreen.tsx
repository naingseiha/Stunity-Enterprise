/**
 * ExamPaperBrowseScreen — lists real-exam-format Quiz posts for a subject.
 * Creative redesign: immersive header, numbered cards, gradient icon badges.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useThemeContext } from '@/contexts';
import { Haptics } from '@/services/haptics';
import { browseQuizzes, QuizItem } from '@/services/quiz';
import { LearnStackScreenProps } from '@/navigation/types';

type Props = LearnStackScreenProps<'ExamPaperBrowse'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Gradient pairs for cards (cycles)
const CARD_GRADIENTS: [string, string][] = [
  ['#7C3AED', '#A855F7'],
  ['#0284C7', '#38BDF8'],
  ['#B45309', '#F59E0B'],
  ['#065F46', '#34D399'],
  ['#9D174D', '#F472B6'],
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
      .catch(() => { setPapers(null); setLoadError(true); });
  }, [courseCode]);

  useEffect(() => { load(); }, [load]);

  const openPaper = (quiz: QuizItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('QuizDetails', { quiz });
  };

  const displayTitle = isKh ? subjectNameKh || subjectName : subjectName || subjectNameKh;

  return (
    <View style={styles.root}>
      {/* ── Immersive Header ── */}
      <LinearGradient
        colors={['#5B21B6', '#7C3AED', '#C084FC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 4 }]}
      >
        {/* Decorative shapes */}
        <View style={styles.hdrBlob1} />
        <View style={styles.hdrBlob2} />

        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerSubtitle}>{t('learn.path.examPapers')}</Text>
            {!!displayTitle && (
              <Text style={styles.headerTitle} numberOfLines={1}>{displayTitle}</Text>
            )}
          </View>
          <View style={styles.backBtn} />
        </View>

        {/* Stats strip */}
        {papers && papers.length > 0 && (
          <View style={styles.statsStrip}>
            <View style={styles.statPill}>
              <Ionicons name="document-text-outline" size={14} color="#FDE68A" />
              <Text style={styles.statPillText}>{papers.length} Papers</Text>
            </View>
            <View style={styles.statPill}>
              <Ionicons name="school-outline" size={14} color="#FDE68A" />
              <Text style={styles.statPillText}>Official Exams</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* ── Content ── */}
      {papers === null && !loadError && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading papers...</Text>
        </View>
      )}

      {loadError && (
        <View style={styles.centerBox}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="cloud-offline-outline" size={36} color="#8B5CF6" />
          </View>
          <Text style={styles.emptyTitle}>{t('learn.path.loadError')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Ionicons name="refresh-outline" size={16} color="#FFF" />
            <Text style={styles.retryText}>{t('learn.path.retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {papers && papers.length === 0 && (
        <View style={styles.centerBox}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="document-text-outline" size={36} color="#8B5CF6" />
          </View>
          <Text style={styles.emptyTitle}>{t('learn.path.examPapersEmpty')}</Text>
        </View>
      )}

      {papers && papers.length > 0 && (
        <ScrollView
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {papers.map((quiz, index) => {
            const year = quiz.examDate ? new Date(quiz.examDate).getFullYear() : null;
            const [gradStart, gradEnd] = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

            return (
              <TouchableOpacity
                key={quiz.id}
                style={styles.card}
                activeOpacity={0.82}
                onPress={() => openPaper(quiz)}
              >
                {/* Left: gradient number badge */}
                <LinearGradient
                  colors={[gradStart, gradEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardBadge}
                >
                  <Text style={styles.cardBadgeNum}>{String(index + 1).padStart(2, '0')}</Text>
                  <Ionicons name="document-text" size={14} color="rgba(255,255,255,0.7)" />
                </LinearGradient>

                {/* Middle: text content */}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {quiz.title}{year ? ` (${year})` : ''}
                  </Text>
                  <View style={styles.cardTagRow}>
                    {!!quiz.examDuration && (
                      <View style={[styles.cardTag, { backgroundColor: isDark ? '#1E1B4B' : '#EDE9FE' }]}>
                        <Ionicons name="time-outline" size={12} color="#8B5CF6" />
                        <Text style={[styles.cardTagText, { color: '#8B5CF6' }]}>{quiz.examDuration} min</Text>
                      </View>
                    )}
                    {!!quiz.examTotalPoints && (
                      <View style={[styles.cardTag, { backgroundColor: isDark ? '#1C1917' : '#FEF9C3' }]}>
                        <Ionicons name="star" size={12} color="#D97706" />
                        <Text style={[styles.cardTagText, { color: '#D97706' }]}>{quiz.examTotalPoints} pts</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Right: arrow */}
                <View style={[styles.cardArrow, { backgroundColor: isDark ? '#1E1B4B' : '#EDE9FE' }]}>
                  <Ionicons name="arrow-forward" size={16} color="#8B5CF6" />
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
    root: { flex: 1, backgroundColor: colors.background },

    // Header
    headerGradient: {
      paddingHorizontal: 16,
      paddingBottom: 20,
      overflow: 'hidden',
    },
    hdrBlob1: {
      position: 'absolute', top: -40, right: -50,
      width: 160, height: 160, borderRadius: 80,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    hdrBlob2: {
      position: 'absolute', bottom: -20, left: -20,
      width: 100, height: 100, borderRadius: 50,
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    backBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
    headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 2 },

    statsStrip: { flexDirection: 'row', gap: 8, marginTop: 12 },
    statPill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(255,255,255,0.15)',
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    },
    statPillText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

    // Center states
    centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
    errorIconWrap: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: '#8B5CF618',
      alignItems: 'center', justifyContent: 'center',
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
    loadingText: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
    retryBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: '#8B5CF6',
      paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14,
      marginTop: 4,
    },
    retryText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

    // List
    listContent: { padding: 16, gap: 12 },

    // Card
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 14,
      borderRadius: 22,
      backgroundColor: colors.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.0 : 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    cardBadge: {
      width: 52,
      height: 64,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    cardBadgeNum: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    cardBody: { flex: 1 },
    cardTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
      lineHeight: 22,
    },
    cardTagRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
    cardTag: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
    },
    cardTagText: { fontSize: 12, fontWeight: '700' },
    cardArrow: {
      width: 34, height: 34, borderRadius: 17,
      alignItems: 'center', justifyContent: 'center',
    },
  });
