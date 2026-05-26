import React, { useCallback } from 'react';
import { useThemeContext } from '@/contexts';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Shadows } from '@/config';
import { renderPostTitleText } from '@/utils/renderEmojiText';

interface Props {
  quizzes: any[];
}

const KHMER_CHAR_RE = /[\u1780-\u17FF]/u;

const QUIZ_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=800&q=80',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
];

const getQuestionCount = (item: any) => {
  if (Array.isArray(item?.questions)) return item.questions.length;
  if (typeof item?.questionCount === 'number') return item.questionCount;
  return 0;
};

const getAuthorName = (item: any) => {
  const firstName = item?.author?.firstName || '';
  const lastName = item?.author?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || item?.author?.name || '';
};

export const SuggestedQuizzesCarousel: React.FC<Props> = ({ quizzes }) => {
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();

  const handleQuizPress = useCallback((item: any) => {
    const tabNavigation = navigation.getParent?.();
    const rootNavigation = tabNavigation?.getParent?.() || tabNavigation || navigation;
    rootNavigation.navigate('QuizDetails', {
      quiz: {
        id: item.id,
        title: item.title || 'Quiz',
        description: item.description || item.content || '',
        questions: Array.isArray(item.questions) ? item.questions : [],
        timeLimit: item.timeLimit ?? null,
        passingScore: item.passingScore ?? 70,
        totalPoints: item.totalPoints ?? 0,
        shuffleQuestions: item.shuffleQuestions,
      },
    });
  }, [navigation]);

  const handleViewAll = useCallback(() => {
    const tabNavigation = navigation.getParent?.();
    tabNavigation?.navigate('QuizTab');
  }, [navigation]);

  if (!quizzes?.length) return null;

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    if (!item) return null;

    const questionCount = getQuestionCount(item);
    const attemptCount = item.attemptCount || item.totalAttempts || 0;
    const authorName = getAuthorName(item);
    const background = item.thumbnailUrl || item.coverImageUrl || item.imageUrl || QUIZ_BACKGROUNDS[index % QUIZ_BACKGROUNDS.length];
    const quizTitle = item.title || t('feed.postTypes.quiz');
    const useKhmerTitleMetrics =
      i18n.language?.toLowerCase().startsWith('km') || KHMER_CHAR_RE.test(quizTitle);

    return (
      <TouchableOpacity
        style={[styles.card, Shadows.sm]}
        activeOpacity={0.82}
        onPress={() => handleQuizPress(item)}
      >
        <Image source={{ uri: background }} style={styles.image} contentFit="cover" />
        <LinearGradient
          colors={['rgba(7,12,22,0.12)', 'rgba(7,12,22,0.5)', 'rgba(7,12,22,0.94)']}
          locations={[0, 0.38, 1]}
          style={styles.gradient}
        />

        <View style={styles.overlay}>
          <View style={styles.topRow}>
            <View style={styles.typeBadge}>
              <Ionicons name="school" size={14} color="#FFFFFF" />
            </View>
            <View style={styles.pointsPill}>
              <Ionicons name="flash" size={12} color="#FDE68A" />
              <Text style={styles.pointsText}>
                {item.totalPoints || Math.max(questionCount * 10, 10)} XP
              </Text>
            </View>
          </View>

          <View style={styles.bottomBlock}>
            <View style={styles.titleWrap}>
              {renderPostTitleText(
                quizTitle,
                [styles.title, useKhmerTitleMetrics && styles.titleKhmer],
                2,
              )}
            </View>
            <View style={styles.meta}>
              <Ionicons name="help-circle" size={12} color="#E0F2FE" />
              <Text style={styles.metaText}>{questionCount || '--'} {t('feed.sections.questions')}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Ionicons name="time" size={12} color="#E0F2FE" />
              <Text style={styles.metaText}>
                {item.timeLimit ? t('feed.sections.minutesShort', { count: item.timeLimit }) : '∞'}
              </Text>
              {attemptCount > 0 && (
                <>
                  <Text style={styles.metaDot}>•</Text>
                  <Ionicons name="people" size={12} color="#E0F2FE" />
                  <Text style={styles.metaText}>{attemptCount}</Text>
                </>
              )}
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.authorText} numberOfLines={1}>
                {authorName || t('feed.suggestedQuizzes')}
              </Text>
              <View style={styles.startButton}>
                <Text style={styles.startText} numberOfLines={1}>{t('feed.sections.takeQuizNow')}</Text>
                <Ionicons name="arrow-forward" size={12} color="#0F172A" />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={16} color="#7C3AED" />
          </View>
          <Text style={styles.headerTitle}>{t('feed.suggestedQuizzes')}</Text>
        </View>
        <TouchableOpacity onPress={handleViewAll} style={styles.seeAllButton} activeOpacity={0.8}>
          <Text style={styles.seeAll}>{t('learn.viewAll')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={quizzes}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={renderItem}
        keyExtractor={(item, index) => item?.id || `suggested-quiz-${index}`}
        contentContainerStyle={styles.listContent}
        snapToInterval={260 + 12}
        decelerationRate="fast"
      />
    </View>
  );
};

type QuizCarouselStyles = {
  container: ViewStyle;
  header: ViewStyle;
  headerLeft: ViewStyle;
  headerIcon: ViewStyle;
  headerTitle: TextStyle;
  seeAllButton: ViewStyle;
  seeAll: TextStyle;
  listContent: ViewStyle;
  card: ViewStyle;
  image: ImageStyle;
  gradient: ViewStyle;
  overlay: ViewStyle;
  topRow: ViewStyle;
  typeBadge: ViewStyle;
  pointsPill: ViewStyle;
  pointsText: TextStyle;
  bottomBlock: ViewStyle;
  titleWrap: ViewStyle;
  title: TextStyle;
  titleKhmer: TextStyle;
  meta: ViewStyle;
  metaText: TextStyle;
  metaDot: TextStyle;
  footerRow: ViewStyle;
  authorText: TextStyle;
  startButton: ViewStyle;
  startText: TextStyle;
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create<QuizCarouselStyles>({
  container: {
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: isDark ? 'rgba(124,58,237,0.18)' : '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  seeAllButton: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 260,
    height: 178,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 30,
  },
  typeBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pointsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bottomBlock: {
    gap: 6,
  },
  titleWrap: {
    overflow: 'visible',
  },
  title: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  titleKhmer: {
    lineHeight: 30,
    paddingTop: Platform.OS === 'android' ? 4 : 6,
    ...Platform.select({
      android: { includeFontPadding: true, textAlignVertical: 'top' as const },
      default: {},
    }),
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  metaDot: {
    fontSize: 11,
    color: '#E5E7EB',
    marginHorizontal: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  authorText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    maxWidth: 112,
  },
  startText: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
  },
});
