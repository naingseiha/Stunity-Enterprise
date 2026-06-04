/**
 * CreateQuestionCardScreen — the fast "knowledge card" authoring flow.
 *
 * No video, no upload: a question + 2–4 options + the correct answer (and an
 * optional explanation) becomes a QUIZ_QUESTION reel and feeds spaced
 * repetition. This is the high-supply primitive — meant to be ~10 seconds to
 * create, so the learning feed is never starved for active-retrieval content.
 * Educator-gated at the entry point and on the server.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useThemeContext } from '@/contexts';
import { Haptics } from '@/services/haptics';
import { track } from '@/services/analytics';
import { createQuestionCard } from '@/api/reels';

const SUBJECTS = [
  'physics', 'mathematics', 'biology', 'chemistry',
  'english', 'history', 'geography', 'general',
] as const;

export const CreateQuestionCardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useThemeContext();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [format, setFormat] = useState<'MCQ' | 'TF' | 'CLOZE'>('MCQ');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  // For True/False: 0 = True, 1 = False.
  const [tfAnswer, setTfAnswer] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [subject, setSubject] = useState<string>('general');
  const [submitting, setSubmitting] = useState(false);
  const isTF = format === 'TF';
  const isCloze = format === 'CLOZE';

  const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

  const setOption = (idx: number, text: string) =>
    setOptions((o) => o.map((v, i) => (i === idx ? text : v)));
  const addOption = () => {
    if (options.length >= 4) return;
    animate();
    setOptions((o) => [...o, '']);
  };
  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    animate();
    setOptions((o) => o.filter((_, i) => i !== idx));
    setCorrectAnswer((c) => (c === idx ? 0 : c > idx ? c - 1 : c));
  };

  const validationError = useMemo((): string | null => {
    if (isTF) {
      if (!question.trim()) return t('reels.createCard.errNoStatement', { defaultValue: 'Write a statement.' });
      return null;
    }
    if (isCloze) {
      if (!question.trim()) return t('reels.createCard.errNoSentence', { defaultValue: 'Write a sentence.' });
      if (!/_{3,}/.test(question)) return t('reels.createCard.errNoBlank', { defaultValue: 'Mark the blank with ___ (3+ underscores).' });
    } else if (!question.trim()) {
      return t('reels.createCard.errNoQuestion', { defaultValue: 'Write a question.' });
    }
    const filled = options.filter((o) => o.trim());
    if (filled.length < 2) return t('reels.createCard.errOptions', { defaultValue: 'Add at least 2 options.' });
    if (!options[correctAnswer]?.trim()) return t('reels.createCard.errCorrect', { defaultValue: 'Mark the correct answer.' });
    return null;
  }, [isTF, isCloze, question, options, correctAnswer, t]);

  const canPublish = !validationError && !submitting;

  const handlePublish = useCallback(async () => {
    if (validationError) {
      Alert.alert(t('reels.createCard.cantPublish', { defaultValue: "Can't publish yet" }), validationError);
      return;
    }
    setSubmitting(true);
    try {
      if (isTF) {
        await createQuestionCard({
          question: question.trim(),
          correctAnswer: tfAnswer,
          explanation: explanation.trim() || undefined,
          subject,
          format: 'TF',
        });
        track('question_card_created', { subject, format: 'tf' });
      } else {
        const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
        await createQuestionCard({
          question: question.trim(),
          options: cleanOptions,
          correctAnswer: Math.min(correctAnswer, cleanOptions.length - 1),
          explanation: explanation.trim() || undefined,
          subject,
          format: isCloze ? 'CLOZE' : 'MCQ',
        });
        track('question_card_created', { subject, format: isCloze ? 'cloze' : 'mcq', options: cleanOptions.length });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t('reels.createCard.publishedTitle', { defaultValue: 'Card published!' }),
        t('reels.createCard.publishedBody', { defaultValue: 'It’s live in the learning feed.' }),
        [{ text: t('common.ok', { defaultValue: 'OK' }), onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t('reels.createCard.publishFailed', { defaultValue: 'Publish failed' }),
        err?.message || t('reels.createCard.publishFailedBody', { defaultValue: 'Please try again.' }),
      );
    } finally {
      setSubmitting(false);
    }
  }, [validationError, isTF, isCloze, options, question, correctAnswer, tfAnswer, explanation, subject, navigation, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('reels.createCard.title', { defaultValue: 'Quick question' })}</Text>
        <TouchableOpacity
          onPress={handlePublish}
          disabled={!canPublish}
          style={[styles.publishBtn, !canPublish && styles.publishBtnDisabled]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.publishBtnText}>{t('reels.createCard.publish', { defaultValue: 'Publish' })}</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hintCard}>
            <Ionicons name="bulb-outline" size={18} color={colors.primary} />
            <Text style={styles.hintText}>
              {t('reels.createCard.hint', { defaultValue: 'A great question takes ~10 seconds and gives every learner a rep.' })}
            </Text>
          </View>

          {/* Format selector — multiple choice, one-tap True/False, or cloze. */}
          <View style={styles.formatRow}>
            {([
              { key: 'MCQ' as const, icon: 'list-outline' as const, label: t('reels.createCard.formatMcq', { defaultValue: 'Multiple choice' }) },
              { key: 'TF' as const, icon: 'swap-horizontal-outline' as const, label: t('reels.createCard.formatTf', { defaultValue: 'True / False' }) },
              { key: 'CLOZE' as const, icon: 'create-outline' as const, label: t('reels.createCard.formatCloze', { defaultValue: 'Fill the blank' }) },
            ]).map((f) => {
              const active = format === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => { animate(); setFormat(f.key); }}
                  style={[styles.formatBtn, active && styles.formatBtnActive]}
                  activeOpacity={0.85}
                >
                  <Ionicons name={f.icon} size={18} color={active ? '#FFF' : colors.textSecondary} />
                  <Text style={[styles.formatBtnText, active && styles.formatBtnTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>
            {isTF
              ? t('reels.createCard.fieldStatement', { defaultValue: 'Statement' })
              : isCloze
                ? t('reels.createCard.fieldSentence', { defaultValue: 'Sentence (use ___ for the blank)' })
                : t('reels.createCard.fieldQuestion', { defaultValue: 'Question' })}
          </Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={question}
            onChangeText={setQuestion}
            placeholder={isTF
              ? t('reels.createCard.statementPlaceholder', { defaultValue: 'e.g. The mitochondria is the powerhouse of the cell.' })
              : isCloze
                ? t('reels.createCard.sentencePlaceholder', { defaultValue: 'e.g. The powerhouse of the cell is the ___.' })
                : t('reels.createCard.questionPlaceholder', { defaultValue: 'e.g. What organelle powers the cell?' })}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={500}
          />

          {isTF ? (
            <>
              <Text style={styles.label}>{t('reels.createCard.fieldAnswer', { defaultValue: 'Correct answer' })}</Text>
              <View style={styles.tfAnswerRow}>
                {([
                  { val: 0, icon: 'checkmark-circle' as const, label: t('reels.tf.true', { defaultValue: 'True' }), tint: colors.success },
                  { val: 1, icon: 'close-circle' as const, label: t('reels.tf.false', { defaultValue: 'False' }), tint: colors.error },
                ]).map((a) => {
                  const active = tfAnswer === a.val;
                  return (
                    <TouchableOpacity
                      key={a.val}
                      onPress={() => setTfAnswer(a.val)}
                      style={[styles.tfAnswerBtn, active && { borderColor: a.tint, backgroundColor: a.tint + '22' }]}
                      activeOpacity={0.85}
                    >
                      <Ionicons name={a.icon} size={28} color={active ? a.tint : colors.textTertiary} />
                      <Text style={[styles.tfAnswerText, active && { color: a.tint }]}>{a.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : (
          <>
          <Text style={styles.label}>
            {isCloze
              ? t('reels.createCard.fieldWords', { defaultValue: 'Word choices (tap the circle to mark the answer)' })
              : t('reels.createCard.fieldOptions', { defaultValue: 'Options (tap the circle to mark correct)' })}
          </Text>
          {options.map((opt, idx) => {
            const correct = correctAnswer === idx;
            return (
              <View key={idx} style={styles.optionRow}>
                <TouchableOpacity onPress={() => setCorrectAnswer(idx)} hitSlop={8}>
                  <Ionicons
                    name={correct ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={correct ? colors.success : colors.textTertiary}
                  />
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, styles.optionInput]}
                  value={opt}
                  onChangeText={(v) => setOption(idx, v)}
                  placeholder={`${t('reels.createCard.option', { defaultValue: 'Option' })} ${String.fromCharCode(65 + idx)}`}
                  placeholderTextColor={colors.textTertiary}
                  maxLength={200}
                />
                {options.length > 2 && (
                  <TouchableOpacity onPress={() => removeOption(idx)} hitSlop={8}>
                    <Ionicons name="close" size={20} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
          {options.length < 4 && (
            <TouchableOpacity onPress={addOption} style={styles.addOptionBtn} hitSlop={6}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.addOptionText}>{t('reels.createCard.addOption', { defaultValue: 'Add option' })}</Text>
            </TouchableOpacity>
          )}
          </>
          )}

          <Text style={styles.label}>{t('reels.createCard.fieldExplanation', { defaultValue: 'Explanation (optional)' })}</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={explanation}
            onChangeText={setExplanation}
            placeholder={t('reels.createCard.explanationPlaceholder', { defaultValue: 'Why is that the answer? Shown after they answer.' })}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={1000}
          />

          <Text style={styles.label}>{t('reels.createCard.fieldSubject', { defaultValue: 'Subject' })}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {SUBJECTS.map((s) => {
              const active = subject === s;
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSubject(s)}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {t(`feed.subjects.${s}`, s.charAt(0).toUpperCase() + s.slice(1))}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {!!validationError && <Text style={styles.validationHint}>{validationError}</Text>}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any, _isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
    headerTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
    publishBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: 20,
      minWidth: 84,
      alignItems: 'center',
    },
    publishBtnDisabled: { backgroundColor: colors.buttonDisabled },
    publishBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },

    scroll: { padding: 16 },
    hintCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 12,
      padding: 12,
      marginBottom: 18,
    },
    hintText: { color: colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 18 },

    label: { color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 8, marginTop: 4 },
    input: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 12 : 9,
      color: colors.text,
      fontSize: 15,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
    },
    inputMultiline: { minHeight: 64, textAlignVertical: 'top' },

    optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    optionInput: { flex: 1, marginBottom: 10 },
    addOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, marginBottom: 8 },
    addOptionText: { color: colors.primary, fontSize: 13, fontWeight: '700' },

    chipRow: { gap: 8, paddingVertical: 2, paddingRight: 8, marginBottom: 14 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor: colors.surfaceVariant,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
    chipTextActive: { color: '#FFF' },

    validationHint: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 16 },

    formatRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
    formatBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor: colors.surfaceVariant,
      borderWidth: 1,
      borderColor: colors.border,
    },
    formatBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    formatBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
    formatBtnTextActive: { color: '#FFF' },

    tfAnswerRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    tfAnswerBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 18,
      borderRadius: 14,
      backgroundColor: colors.surfaceVariant,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    tfAnswerText: { color: colors.textSecondary, fontSize: 16, fontWeight: '800' },
  });

export default CreateQuestionCardScreen;
