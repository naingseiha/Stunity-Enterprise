import React, { useCallback } from 'react';
import { useThemeContext } from '@/contexts';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

interface Props {
  quizzes: any[];
}

const ACCENT_COLORS = ['#14B8A6', '#F59E0B', '#EC4899', '#6366F1'];

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

    const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];
    const questionCount = getQuestionCount(item);
    const attemptCount = item.attemptCount || item.totalAttempts || 0;
    const authorName = getAuthorName(item);

    return (
      <TouchableOpacity
        style={[styles.card, { borderColor: `${accent}55` }]}
        activeOpacity={0.86}
        onPress={() => handleQuizPress(item)}
      >
        <View style={[styles.accentRail, { backgroundColor: accent }]} />
        <View style={styles.cardTopRow}>
          <View style={[styles.iconBubble, { backgroundColor: `${accent}1F` }]}>
            <Ionicons name="flash" size={17} color={accent} />
          </View>
          <View style={styles.pointsPill}>
            <Ionicons name="trophy-outline" size={12} color={accent} />
            <Text style={[styles.pointsText, { color: accent }]}>
              {item.totalPoints || Math.max(questionCount * 10, 10)} XP
            </Text>
          </View>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title || t('feed.postTypes.quiz')}
        </Text>

        {!!item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Ionicons name="help-circle-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>{questionCount || '--'} {t('feed.sections.questions')}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {item.timeLimit ? t('feed.sections.minutesShort', { count: item.timeLimit }) : '∞'}
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.authorText} numberOfLines={1}>
            {authorName || t('feed.suggestedQuizzes')}
          </Text>
          <View style={styles.startButton}>
            <Text style={styles.startText}>{t('feed.sections.takeQuizNow')}</Text>
            <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
          </View>
        </View>

        {attemptCount > 0 && (
          <View style={styles.socialProof}>
            <Ionicons name="people-outline" size={11} color={colors.textSecondary} />
            <Text style={styles.socialProofText}>{attemptCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ['#10201F', '#151923'] : ['#ECFDF5', '#F8FAFC']}
        style={styles.panel}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Ionicons name="sparkles" size={16} color="#0F766E" />
            </View>
            <View>
              <Text style={styles.eyebrow}>{t('feed.quiz', 'Quiz')}</Text>
              <Text style={styles.headerTitle}>{t('feed.suggestedQuizzes')}</Text>
            </View>
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
          snapToInterval={234}
          decelerationRate="fast"
        />
      </LinearGradient>
    </View>
  );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  panel: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: isDark ? 'rgba(20,184,166,0.18)' : '#D1FAE5',
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
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: isDark ? 'rgba(20,184,166,0.16)' : '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F766E',
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.text,
    marginTop: 1,
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
    width: 222,
    minHeight: 182,
    backgroundColor: isDark ? '#111827' : '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    overflow: 'hidden',
  },
  accentRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC',
  },
  pointsText: {
    fontSize: 11,
    fontWeight: '900',
  },
  cardTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    color: colors.text,
  },
  description: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  metaGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  authorText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#0F766E',
  },
  startText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  socialProof: {
    position: 'absolute',
    right: 12,
    bottom: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  socialProofText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
  },
});
