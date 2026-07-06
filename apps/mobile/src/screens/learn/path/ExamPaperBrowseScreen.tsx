/**
 * ExamPaperBrowseScreen — Flat-design card list with collapsible header.
 * Cards use soft pastel backgrounds (first card is vibrant).
 * Header collapses on scroll via Animated API.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
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

// ── Card palette (cycles). Index 0 = vibrant, rest = soft pastel ──
const CARD_PALETTE = [
  { bg: '#F87171', textColor: '#FFFFFF',  metaColor: 'rgba(255,255,255,0.75)', tagBg: 'rgba(255,255,255,0.22)', tagText: '#FFF', numColor: 'rgba(255,255,255,0.5)' },
  { bg: '#EDE9FE', textColor: '#3730A3',  metaColor: '#6D6BAA',               tagBg: '#DDD6FE',               tagText: '#4C1D95', numColor: '#A5B4FC' },
  { bg: '#FEF9C3', textColor: '#713F12',  metaColor: '#92712A',               tagBg: '#FDE68A',               tagText: '#78350F', numColor: '#FCD34D' },
  { bg: '#DCFCE7', textColor: '#14532D',  metaColor: '#3A7A50',               tagBg: '#BBF7D0',               tagText: '#166534', numColor: '#6EE7B7' },
  { bg: '#FCE7F3', textColor: '#831843',  metaColor: '#9D6070',               tagBg: '#FBCFE8',               tagText: '#9D174D', numColor: '#F9A8D4' },
  { bg: '#E0F2FE', textColor: '#0C4A6E',  metaColor: '#2D7A9A',               tagBg: '#BAE6FD',               tagText: '#075985', numColor: '#7DD3FC' },
];

// Dark mode palette
const CARD_PALETTE_DARK = [
  { bg: '#7F1D1D', textColor: '#FEF2F2',  metaColor: 'rgba(254,242,242,0.7)', tagBg: 'rgba(255,255,255,0.15)', tagText: '#FCA5A5', numColor: '#FCA5A5' },
  { bg: '#1E1B4B', textColor: '#EDE9FE',  metaColor: '#A5B4FC',               tagBg: 'rgba(139,92,246,0.2)',   tagText: '#C4B5FD', numColor: '#818CF8' },
  { bg: '#1C1400', textColor: '#FEF9C3',  metaColor: '#D4A955',               tagBg: 'rgba(234,179,8,0.2)',    tagText: '#FCD34D', numColor: '#F59E0B' },
  { bg: '#052E16', textColor: '#DCFCE7',  metaColor: '#6EE7B7',               tagBg: 'rgba(16,185,129,0.2)',   tagText: '#6EE7B7', numColor: '#34D399' },
  { bg: '#500724', textColor: '#FCE7F3',  metaColor: '#F9A8D4',               tagBg: 'rgba(236,72,153,0.2)',   tagText: '#F9A8D4', numColor: '#F472B6' },
  { bg: '#082F49', textColor: '#E0F2FE',  metaColor: '#7DD3FC',               tagBg: 'rgba(14,165,233,0.2)',   tagText: '#7DD3FC', numColor: '#38BDF8' },
];

const HEADER_MAX = 140;
const HEADER_MIN = 0;
const SCROLL_THRESHOLD = 80;

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

  // Animated scroll value
  const scrollY = useRef(new Animated.Value(0)).current;

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
  const palette = isDark ? CARD_PALETTE_DARK : CARD_PALETTE;

  // Animated interpolations
  const extraHeaderHeight = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD],
    outputRange: [HEADER_MAX, HEADER_MIN],
    extrapolate: 'clamp',
  });
  const subHeaderOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD * 0.6],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const headerElevation = scrollY.interpolate({
    inputRange: [0, 10],
    outputRange: [0, 6],
    extrapolate: 'clamp',
  });

  const NavBar = (
    <View style={[styles.navBar, { paddingTop: insets.top + 4 }]}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={22} color="#FFF" />
      </TouchableOpacity>
      <Text style={styles.navTitle} numberOfLines={1}>
        {displayTitle || t('learn.path.examPapers')}
      </Text>
      <View style={{ width: 36 }} />
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Animated collapsible gradient header ── */}
      <Animated.View style={{ elevation: headerElevation }}>
        <LinearGradient
          colors={['#5B21B6', '#7C3AED', '#C084FC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {/* Blobs */}
          <View style={styles.hdrBlob1} />
          <View style={styles.hdrBlob2} />

          {/* Fixed nav bar */}
          {NavBar}

          {/* Collapsible subtitle area */}
          <Animated.View style={[styles.headerExpanded, { height: extraHeaderHeight, opacity: subHeaderOpacity }]}>
            <Text style={styles.headerSub}>
              {t('learn.path.examPapers')}
            </Text>
            {papers && papers.length > 0 && (
              <View style={styles.statsStrip}>
                <View style={styles.statPill}>
                  <Ionicons name="document-text-outline" size={13} color="#FDE68A" />
                  <Text style={styles.statPillText}>{papers.length} Papers</Text>
                </View>
                <View style={styles.statPill}>
                  <Ionicons name="school-outline" size={13} color="#FDE68A" />
                  <Text style={styles.statPillText}>Official Exams</Text>
                </View>
              </View>
            )}
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      {/* ── States ── */}
      {papers === null && !loadError && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.stateText}>Loading...</Text>
        </View>
      )}

      {loadError && (
        <View style={styles.centerBox}>
          <View style={styles.stateIconWrap}><Ionicons name="cloud-offline-outline" size={34} color="#8B5CF6" /></View>
          <Text style={styles.stateTitle}>{t('learn.path.loadError')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Ionicons name="refresh-outline" size={15} color="#FFF" />
            <Text style={styles.retryText}>{t('learn.path.retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {papers && papers.length === 0 && (
        <View style={styles.centerBox}>
          <View style={styles.stateIconWrap}><Ionicons name="document-text-outline" size={34} color="#8B5CF6" /></View>
          <Text style={styles.stateTitle}>{t('learn.path.examPapersEmpty')}</Text>
        </View>
      )}

      {/* ── Paper list ── */}
      {papers && papers.length > 0 && (
        <Animated.ScrollView
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        >
          {papers.map((quiz, index) => {
            const year = quiz.examDate ? new Date(quiz.examDate).getFullYear() : null;
            const p = palette[index % palette.length];
            const num = String(index + 1).padStart(2, '0');

            return (
              <TouchableOpacity
                key={quiz.id}
                style={[styles.card, { backgroundColor: p.bg }]}
                activeOpacity={0.78}
                onPress={() => openPaper(quiz)}
              >
                {/* Number label */}
                <Text style={[styles.cardNum, { color: p.numColor }]}>{num}</Text>

                {/* Title + Year */}
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitle, { color: p.textColor }]} numberOfLines={2}>
                    {quiz.title}
                    {year ? ` (${year})` : ''}
                  </Text>
                </View>

                {/* Tags row */}
                {(!!quiz.examDuration || !!quiz.examTotalPoints) && (
                  <View style={styles.cardTagRow}>
                    {!!quiz.examDuration && (
                      <View style={[styles.cardTag, { backgroundColor: p.tagBg }]}>
                        <Ionicons name="time-outline" size={12} color={p.tagText} />
                        <Text style={[styles.cardTagText, { color: p.tagText }]}>
                          {quiz.examDuration} min
                        </Text>
                      </View>
                    )}
                    {!!quiz.examTotalPoints && (
                      <View style={[styles.cardTag, { backgroundColor: p.tagBg }]}>
                        <Ionicons name="star-outline" size={12} color={p.tagText} />
                        <Text style={[styles.cardTagText, { color: p.tagText }]}>
                          {quiz.examTotalPoints} pts
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.ScrollView>
      )}
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    root: { flex: 1 },

    // Header
    headerGradient: {
      overflow: 'hidden',
    },
    hdrBlob1: {
      position: 'absolute', top: -50, right: -50,
      width: 160, height: 160, borderRadius: 80,
      backgroundColor: 'rgba(255,255,255,0.07)',
    },
    hdrBlob2: {
      position: 'absolute', bottom: -20, left: -20,
      width: 90, height: 90, borderRadius: 45,
      backgroundColor: 'rgba(255,255,255,0.05)',
    },

    // Fixed nav bar inside gradient
    navBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center', justifyContent: 'center',
    },
    navTitle: {
      flex: 1,
      textAlign: 'center',
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
      paddingHorizontal: 8,
    },

    // Collapsible expanded area
    headerExpanded: {
      paddingHorizontal: 20,
      paddingBottom: 18,
      overflow: 'hidden',
      justifyContent: 'flex-end',
      gap: 10,
    },
    headerSub: {
      color: 'rgba(255,255,255,0.65)',
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    statsStrip: { flexDirection: 'row', gap: 8 },
    statPill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(255,255,255,0.15)',
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    },
    statPillText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

    // Center states
    centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
    stateIconWrap: {
      width: 68, height: 68, borderRadius: 34,
      backgroundColor: 'rgba(139,92,246,0.1)',
      alignItems: 'center', justifyContent: 'center',
    },
    stateTitle: { fontSize: 15, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
    stateText: { fontSize: 14, color: colors.textSecondary },
    retryBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: '#8B5CF6',
      paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14,
    },
    retryText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

    // List
    listContent: { padding: 16, gap: 14 },

    // Card — flat design
    card: {
      borderRadius: 20,
      padding: 18,
      gap: 8,
    },

    // Number label (top-left, inside card)
    cardNum: {
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },

    // Title row
    cardTitleRow: { gap: 2 },
    cardTitle: {
      fontSize: 17,
      fontWeight: '800',
      lineHeight: 24,
      letterSpacing: -0.3,
    },

    // Tags
    cardTagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
    cardTag: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
    },
    cardTagText: { fontSize: 12, fontWeight: '700' },
  });
