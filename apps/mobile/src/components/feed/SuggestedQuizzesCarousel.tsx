import React, { useCallback } from 'react';
import { useThemeContext } from '@/contexts';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
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
  const { t } = useTranslation();
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

    return (
      <TouchableOpacity
        style={[styles.card, Shadows.sm]}
        activeOpacity={0.82}
        onPress={() => handleQuizPress(item)}
      >
        <Image source={{ uri: background }} style={styles.image} contentFit="cover" />
        <LinearGradient
          colors={['rgba(7,12,22,0.05)', 'rgba(7,12,22,0.44)', 'rgba(7,12,22,0.92)']}
          locations={[0, 0.42, 1]}
          style={styles.gradient}
        />

        <View style={styles.topRow}>
          <View style={styles.typePill}>
            <Ionicons name="school" size={12} color="#FFFFFF" />
            <Text style={styles.typeText}>{t('feed.quiz', 'Quiz')}</Text>
          </View>
          <View style={styles.pointsPill}>
            <Ionicons name="flash" size={12} color="#FDE68A" />
            <Text style={styles.pointsText}>
              {item.totalPoints || Math.max(questionCount * 10, 10)} XP
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          {renderPostTitleText(item.title || t('feed.postTypes.quiz'), styles.title, 2)}
          <View style={styles.meta}>
            <Ionicons name="help-circle" size={12} color="#E0F2FE" />
            <Text style={styles.metaText}>{questionCount || '--'} {t('feed.sections.questions')}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Ionicons name="time" size={12} color="#E0F2FE" />
            <Text style={styles.metaText}>
              {item.timeLimit ? t('feed.sections.minutesShort', { count: item.timeLimit }) : '∞'}
            </Text>
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

        {attemptCount > 0 && (
          <View style={styles.socialProof}>
            <Ionicons name="people" size={11} color="#F8FAFC" />
            <Text style={styles.socialProofText}>{attemptCount}</Text>
          </View>
        )}
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
  topRow: ViewStyle;
  typePill: ViewStyle;
  typeText: TextStyle;
  pointsPill: ViewStyle;
  pointsText: TextStyle;
  content: ViewStyle;
  title: TextStyle;
  meta: ViewStyle;
  metaText: TextStyle;
  metaDot: TextStyle;
  footerRow: ViewStyle;
  authorText: TextStyle;
  startButton: ViewStyle;
  startText: TextStyle;
  socialProof: ViewStyle;
  socialProofText: TextStyle;
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
    height: 148,
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
  topRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.54)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.54)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  pointsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12,
  },
  title: {
    fontSize: 14,
    lineHeight: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    paddingTop: 3,
    paddingBottom: 1,
    textShadowColor: 'rgba(0,0,0,0.48)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    marginTop: 9,
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
  socialProof: {
    position: 'absolute',
    right: 12,
    bottom: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  socialProofText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F8FAFC',
  },
});
