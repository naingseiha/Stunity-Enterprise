/**
 * ExamPaperBrowseScreen — lists real-exam-format Quiz posts for a subject
 * (Post.examDate/examDuration/examTotalPoints/examPassingScore set, either
 * hand-authored via seed-exams-math-*.ts or AI-drafted via
 * generate-exam-paper.ts). Tapping one hands off to the existing generic
 * QuizDetails/TakeQuiz/QuizResults flow — this screen is discovery-only,
 * it does not duplicate any taking/grading logic.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useThemeContext } from '@/contexts';
import { Haptics } from '@/services/haptics';
import { browseQuizzes, QuizItem } from '@/services/quiz';
import { LearnStackScreenProps } from '@/navigation/types';

type Props = LearnStackScreenProps<'ExamPaperBrowse'>;

export function ExamPaperBrowseScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useThemeContext();
  const styles = createStyles(colors);
  const navigation = useNavigation<any>();
  const route = useRoute<Props['route']>();
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

  const title = isKh ? subjectNameKh || subjectName : subjectName || subjectNameKh;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title ? `${t('learn.path.examPapers')} · ${title}` : t('learn.path.examPapers')}
        </Text>
        <View style={styles.headerButton} />
      </View>

      {papers === null && !loadError && (
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.textSecondary} />
      )}

      {loadError && (
        <View style={styles.centerBox}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyText}>{t('learn.path.loadError')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={load}>
            <Text style={styles.retryButtonText}>{t('learn.path.retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {papers && papers.length === 0 && (
        <View style={styles.centerBox}>
          <Ionicons name="document-text-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyText}>{t('learn.path.examPapersEmpty')}</Text>
        </View>
      )}

      {papers && papers.length > 0 && (
        <ScrollView contentContainerStyle={styles.body}>
          {papers.map((quiz) => {
            const year = quiz.examDate ? new Date(quiz.examDate).getFullYear() : null;
            return (
              <TouchableOpacity key={quiz.id} style={styles.card} activeOpacity={0.85} onPress={() => openPaper(quiz)}>
                <View style={styles.cardIcon}>
                  <Ionicons name="document-text" size={22} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {quiz.title}
                    {year ? ` (${year})` : ''}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {quiz.examDuration ? `${quiz.examDuration} min` : ''}
                    {quiz.examDuration && quiz.examTotalPoints ? ' · ' : ''}
                    {quiz.examTotalPoints ? `${quiz.examTotalPoints} pts` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 10,
      gap: 8,
    },
    headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.text },
    body: { padding: 16, paddingBottom: 32, gap: 12 },
    centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
    emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    retryButton: {
      marginTop: 8,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: '#0EA5E9',
    },
    retryButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(139, 92, 246, 0.12)',
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, lineHeight: 20 },
    cardMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  });
