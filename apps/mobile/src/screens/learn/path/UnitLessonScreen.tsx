/**
 * UnitLessonScreen — a unit's mini-lesson + formula sheet, shown before
 * practice (Duolingo "guidebook" equivalent). Content comes from
 * GET /learn/lesson (Topic.miniLesson[Kh] + formulaSheet Json).
 * "Start practice" replaces this screen with the PracticeSession so Back
 * from practice returns to the path, not the lesson.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useThemeContext } from '@/contexts';
import { Haptics } from '@/services/haptics';
import { learnPathService, UnitLesson } from '@/services/learnPath.service';
import { LearnStackScreenProps } from '@/navigation/types';

type Props = LearnStackScreenProps<'UnitLesson'>;

export function UnitLessonScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<Props['navigation']>();
  const route = useRoute<Props['route']>();
  const { topicId, title } = route.params;
  const isKh = i18n.language?.startsWith('km');

  const [lesson, setLesson] = useState<UnitLesson | null | undefined>(undefined);

  useEffect(() => {
    learnPathService
      .getLesson(topicId)
      .then(setLesson)
      .catch(() => setLesson(null));
  }, [topicId]);

  const startPractice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.replace('PracticeSession', { topicId, title });
  };

  const lessonText = lesson
    ? (isKh ? lesson.miniLessonKh || lesson.miniLesson : lesson.miniLesson || lesson.miniLessonKh) ?? ''
    : '';
  const paragraphs = lessonText.split('\n\n').filter(Boolean);
  const formulas = Array.isArray(lesson?.formulaSheet) ? lesson!.formulaSheet : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerButton} />
      </View>

      {lesson === undefined && (
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.textSecondary} />
      )}

      {lesson !== undefined && (
        <>
          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.lessonBadge}>
              <Ionicons name="book" size={16} color="#0EA5E9" />
              <Text style={styles.lessonBadgeText}>{t('learn.path.miniLesson')}</Text>
            </View>

            {paragraphs.length === 0 && (
              <Text style={styles.paragraph}>{t('learn.path.lessonEmpty')}</Text>
            )}
            {paragraphs.map((p, i) => (
              <Text key={i} style={styles.paragraph}>
                {p}
              </Text>
            ))}

            {formulas.length > 0 && (
              <>
                <View style={[styles.lessonBadge, { marginTop: 20 }]}>
                  <Ionicons name="calculator" size={16} color="#8B5CF6" />
                  <Text style={[styles.lessonBadgeText, { color: '#8B5CF6' }]}>
                    {t('learn.path.formulaSheet')}
                  </Text>
                </View>
                <View style={styles.formulaList}>
                  {formulas.map((f, i) => (
                    <View key={i} style={styles.formulaCard}>
                      <Text style={styles.formulaExpr}>{f.expr}</Text>
                      {!!f.noteKh && <Text style={styles.formulaNote}>{f.noteKh}</Text>}
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.startButton} onPress={startPractice}>
              <Text style={styles.startButtonText}>{t('learn.path.startPractice')}</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
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
      paddingVertical: 10,
      gap: 8,
    },
    headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.text },
    body: { padding: 20, paddingBottom: 32 },
    lessonBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: colors.surfaceVariant,
      marginBottom: 14,
    },
    lessonBadgeText: { fontSize: 13, fontWeight: '800', color: '#0EA5E9' },
    paragraph: {
      fontSize: 15,
      lineHeight: 24,
      color: colors.text,
      marginBottom: 14,
    },
    formulaList: { gap: 10 },
    formulaCard: {
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderLeftWidth: 4,
      borderLeftColor: '#8B5CF6',
    },
    formulaExpr: { fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 24 },
    formulaNote: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    footer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    startButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 15,
      borderRadius: 16,
      backgroundColor: '#0EA5E9',
    },
    startButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });
