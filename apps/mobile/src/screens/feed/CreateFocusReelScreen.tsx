/**
 * CreateFocusReelScreen — educator authoring for EduReels.
 *
 * Pick a video, add title/subject, and (optionally) timed pause-point
 * questions, then publish to POST /reels. Video uploads to R2 via the shared
 * presigned-URL flow (api/reels.uploadReelVideo). Educator-gated at the entry
 * point (Reels header) and again on the server.
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
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useThemeContext } from '@/contexts';
import { Haptics } from '@/services/haptics';
import { track } from '@/services/analytics';
import { createFocusReel, uploadReelVideo, type ReelPausePoint } from '@/api/reels';

// Subjects map to the reel gradient / mastery palette keys.
const SUBJECTS = [
  'physics', 'mathematics', 'biology', 'chemistry',
  'english', 'history', 'geography', 'general',
] as const;

interface DraftOption {
  text: string;
}
interface DraftPausePoint {
  id: string;
  time: string; // seconds, as text for the input
  question: string;
  options: DraftOption[];
  correctAnswer: number;
  xp: string;
}

const newPausePoint = (): DraftPausePoint => ({
  id: `pp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  time: '',
  question: '',
  options: [{ text: '' }, { text: '' }],
  correctAnswer: 0,
  xp: '15',
});

export const CreateFocusReelScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useThemeContext();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState<string>('physics');
  const [pausePoints, setPausePoints] = useState<DraftPausePoint[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  // Preview of the picked video — muted + looping; tap to play/pause.
  const previewPlayer = useVideoPlayer(videoUri, (p) => {
    p.muted = true;
    p.loop = true;
  });
  const togglePreview = useCallback(() => {
    try {
      if (previewPlaying) previewPlayer.pause();
      else previewPlayer.play();
      setPreviewPlaying((v) => !v);
    } catch {
      /* player mid-source-swap — non-fatal */
    }
  }, [previewPlaying, previewPlayer]);

  const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

  const pickVideo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('reels.create.permissionTitle', { defaultValue: 'Permission needed' }),
        t('reels.create.permissionBody', { defaultValue: 'Allow library access to pick a video.' }),
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setVideoUri(asset.uri);
      setPreviewPlaying(false);
      // expo-image-picker reports duration in ms.
      const secs = asset.duration ? Math.max(1, Math.round(asset.duration / 1000)) : 0;
      setDurationSec(secs);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [t]);

  const addPausePoint = () => {
    animate();
    setPausePoints((p) => [...p, newPausePoint()]);
  };
  const removePausePoint = (id: string) => {
    animate();
    setPausePoints((p) => p.filter((pp) => pp.id !== id));
  };
  const patchPP = (id: string, patch: Partial<DraftPausePoint>) =>
    setPausePoints((p) => p.map((pp) => (pp.id === id ? { ...pp, ...patch } : pp)));
  const patchOption = (id: string, idx: number, text: string) =>
    setPausePoints((p) =>
      p.map((pp) =>
        pp.id === id
          ? { ...pp, options: pp.options.map((o, i) => (i === idx ? { text } : o)) }
          : pp,
      ),
    );
  const addOption = (id: string) =>
    setPausePoints((p) =>
      p.map((pp) =>
        pp.id === id && pp.options.length < 4 ? { ...pp, options: [...pp.options, { text: '' }] } : pp,
      ),
    );
  const removeOption = (id: string, idx: number) =>
    setPausePoints((p) =>
      p.map((pp) => {
        if (pp.id !== id || pp.options.length <= 2) return pp;
        const options = pp.options.filter((_, i) => i !== idx);
        const correctAnswer = pp.correctAnswer >= options.length ? 0 : pp.correctAnswer;
        return { ...pp, options, correctAnswer };
      }),
    );

  // ── Validation ──────────────────────────────────────────────────────
  const validationError = useMemo((): string | null => {
    if (!videoUri) return t('reels.create.errNoVideo', { defaultValue: 'Pick a video first.' });
    if (!title.trim()) return t('reels.create.errNoTitle', { defaultValue: 'Add a title.' });
    for (const pp of pausePoints) {
      const time = Number(pp.time);
      if (!pp.time.trim() || !Number.isFinite(time) || time < 0)
        return t('reels.create.errPpTime', { defaultValue: 'Each checkpoint needs a valid time.' });
      if (durationSec > 0 && time > durationSec)
        return t('reels.create.errPpTimeRange', { defaultValue: 'A checkpoint time is past the video end.' });
      if (!pp.question.trim())
        return t('reels.create.errPpQuestion', { defaultValue: 'Each checkpoint needs a question.' });
      const filled = pp.options.filter((o) => o.text.trim());
      if (filled.length < 2)
        return t('reels.create.errPpOptions', { defaultValue: 'Each checkpoint needs at least 2 options.' });
      if (!pp.options[pp.correctAnswer]?.text.trim())
        return t('reels.create.errPpCorrect', { defaultValue: 'Mark the correct answer on each checkpoint.' });
    }
    return null;
  }, [videoUri, title, pausePoints, durationSec, t]);

  const canPublish = !validationError && !submitting;

  const handlePublish = useCallback(async () => {
    if (validationError) {
      Alert.alert(t('reels.create.cantPublish', { defaultValue: "Can't publish yet" }), validationError);
      return;
    }
    if (!videoUri) return;
    setSubmitting(true);
    try {
      const videoUrl = await uploadReelVideo(videoUri);
      const cleanPausePoints: ReelPausePoint[] = pausePoints.map((pp) => {
        const options = pp.options.map((o) => o.text.trim()).filter(Boolean);
        return {
          time: Number(pp.time),
          question: pp.question.trim(),
          options,
          correctAnswer: Math.min(pp.correctAnswer, options.length - 1),
          xp: Number(pp.xp) > 0 ? Number(pp.xp) : 15,
        };
      });
      await createFocusReel({
        title: title.trim(),
        description: description.trim() || undefined,
        subject,
        videoUrl,
        duration: durationSec > 0 ? durationSec : 15,
        pausePoints: cleanPausePoints,
      });
      track('reel_created', { subject, pausePoints: cleanPausePoints.length, duration: durationSec });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t('reels.create.publishedTitle', { defaultValue: 'Reel published!' }),
        t('reels.create.publishedBody', { defaultValue: 'Your reel is live in the feed.' }),
        [{ text: t('common.ok', { defaultValue: 'OK' }), onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t('reels.create.publishFailed', { defaultValue: 'Publish failed' }),
        err?.message || t('reels.create.publishFailedBody', { defaultValue: 'Please try again.' }),
      );
    } finally {
      setSubmitting(false);
    }
  }, [validationError, videoUri, pausePoints, title, description, subject, durationSec, navigation, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('reels.create.title', { defaultValue: 'New Reel' })}</Text>
        <TouchableOpacity
          onPress={handlePublish}
          disabled={!canPublish}
          style={[styles.publishBtn, !canPublish && styles.publishBtnDisabled]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.publishBtnText}>{t('reels.create.publish', { defaultValue: 'Publish' })}</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Video picker / preview */}
          {videoUri ? (
            <View style={styles.previewWrap}>
              <TouchableOpacity activeOpacity={0.95} onPress={togglePreview} style={styles.previewVideoBox}>
                <VideoView
                  player={previewPlayer}
                  style={StyleSheet.absoluteFill}
                  contentFit="contain"
                  nativeControls={false}
                  pointerEvents="none"
                />
                {!previewPlaying && (
                  <View style={styles.previewPlayOverlay} pointerEvents="none">
                    <Ionicons name="play-circle" size={56} color="rgba(255,255,255,0.92)" />
                  </View>
                )}
                {durationSec > 0 && (
                  <View style={styles.previewDuration}>
                    <Ionicons name="time-outline" size={12} color="#FFF" />
                    <Text style={styles.previewDurationText}>{durationSec}s</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.changeVideoBtn} onPress={pickVideo} activeOpacity={0.8}>
                <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
                <Text style={styles.changeVideoBtnText}>{t('reels.create.changeVideo', { defaultValue: 'Change video' })}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.videoPicker} onPress={pickVideo} activeOpacity={0.85}>
              <View style={styles.videoEmpty}>
                <Ionicons name="cloud-upload-outline" size={34} color={colors.primary} />
                <Text style={styles.videoEmptyTitle}>{t('reels.create.pickVideo', { defaultValue: 'Pick a video' })}</Text>
                <Text style={styles.videoEmptyHint}>
                  {t('reels.create.pickVideoHint', { defaultValue: 'Short, vertical videos work best' })}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Title */}
          <Text style={styles.label}>{t('reels.create.fieldTitle', { defaultValue: 'Title' })}</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t('reels.create.titlePlaceholder', { defaultValue: 'e.g. Wave–Particle Duality in 60s' })}
            placeholderTextColor={colors.textTertiary}
            maxLength={120}
          />

          {/* Description */}
          <Text style={styles.label}>{t('reels.create.fieldDescription', { defaultValue: 'Description (optional)' })}</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('reels.create.descriptionPlaceholder', { defaultValue: 'A one-line hook…' })}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={500}
          />

          {/* Subject */}
          <Text style={styles.label}>{t('reels.create.fieldSubject', { defaultValue: 'Subject' })}</Text>
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

          {/* Pause points */}
          <View style={styles.ppHeader}>
            <Text style={styles.label}>{t('reels.create.checkpoints', { defaultValue: 'Checkpoint questions' })}</Text>
            <Text style={styles.ppHeaderHint}>{t('reels.create.checkpointsHint', { defaultValue: 'Optional · pauses the video to ask' })}</Text>
          </View>

          {pausePoints.map((pp, ppIdx) => (
            <View key={pp.id} style={styles.ppCard}>
              <View style={styles.ppCardHeader}>
                <Text style={styles.ppCardTitle}>{t('reels.create.checkpointN', { count: ppIdx + 1, defaultValue: `Checkpoint ${ppIdx + 1}` })}</Text>
                <TouchableOpacity onPress={() => removePausePoint(pp.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>

              <View style={styles.ppRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ppMiniLabel}>{t('reels.create.atSeconds', { defaultValue: 'At (sec)' })}</Text>
                  <TextInput
                    style={styles.ppSmallInput}
                    value={pp.time}
                    onChangeText={(v) => patchPP(pp.id, { time: v.replace(/[^0-9]/g, '') })}
                    keyboardType="number-pad"
                    placeholder="5"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ppMiniLabel}>XP</Text>
                  <TextInput
                    style={styles.ppSmallInput}
                    value={pp.xp}
                    onChangeText={(v) => patchPP(pp.id, { xp: v.replace(/[^0-9]/g, '') })}
                    keyboardType="number-pad"
                    placeholder="15"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>

              <Text style={styles.ppMiniLabel}>{t('reels.create.question', { defaultValue: 'Question' })}</Text>
              <TextInput
                style={styles.input}
                value={pp.question}
                onChangeText={(v) => patchPP(pp.id, { question: v })}
                placeholder={t('reels.create.questionPlaceholder', { defaultValue: 'Ask something…' })}
                placeholderTextColor={colors.textTertiary}
                maxLength={500}
              />

              <Text style={styles.ppMiniLabel}>{t('reels.create.options', { defaultValue: 'Options (tap the circle to mark correct)' })}</Text>
              {pp.options.map((opt, oIdx) => {
                const correct = pp.correctAnswer === oIdx;
                return (
                  <View key={oIdx} style={styles.optionRow}>
                    <TouchableOpacity onPress={() => patchPP(pp.id, { correctAnswer: oIdx })} hitSlop={8}>
                      <Ionicons
                        name={correct ? 'checkmark-circle' : 'ellipse-outline'}
                        size={24}
                        color={correct ? colors.success : colors.textTertiary}
                      />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.input, styles.optionInput]}
                      value={opt.text}
                      onChangeText={(v) => patchOption(pp.id, oIdx, v)}
                      placeholder={`${t('reels.create.option', { defaultValue: 'Option' })} ${String.fromCharCode(65 + oIdx)}`}
                      placeholderTextColor={colors.textTertiary}
                      maxLength={200}
                    />
                    {pp.options.length > 2 && (
                      <TouchableOpacity onPress={() => removeOption(pp.id, oIdx)} hitSlop={8}>
                        <Ionicons name="close" size={20} color={colors.textTertiary} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
              {pp.options.length < 4 && (
                <TouchableOpacity onPress={() => addOption(pp.id)} style={styles.addOptionBtn} hitSlop={6}>
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={styles.addOptionText}>{t('reels.create.addOption', { defaultValue: 'Add option' })}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.addPpBtn} onPress={addPausePoint} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.addPpText}>{t('reels.create.addCheckpoint', { defaultValue: 'Add checkpoint question' })}</Text>
          </TouchableOpacity>

          {!!validationError && (
            <Text style={styles.validationHint}>{validationError}</Text>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any, isDark: boolean) =>
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

    videoPicker: {
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: 'dashed',
      backgroundColor: colors.surfaceVariant,
      marginBottom: 18,
      overflow: 'hidden',
    },
    videoEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 34, gap: 6 },
    videoEmptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 4 },
    videoEmptyHint: { color: colors.textSecondary, fontSize: 13 },

    previewWrap: { marginBottom: 18 },
    previewVideoBox: {
      height: 240,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: '#000',
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewPlayOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    previewDuration: {
      position: 'absolute',
      bottom: 10,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
    },
    previewDurationText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
    changeVideoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
    changeVideoBtnText: { color: colors.primary, fontSize: 14, fontWeight: '700' },

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

    ppHeader: { marginTop: 6, marginBottom: 6 },
    ppHeaderHint: { color: colors.textSecondary, fontSize: 12, marginTop: -4, marginBottom: 6 },
    ppCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
    },
    ppCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    ppCardTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
    ppRow: { flexDirection: 'row', gap: 12 },
    ppMiniLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 },
    ppSmallInput: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 10 : 7,
      color: colors.text,
      fontSize: 15,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    optionInput: { flex: 1, marginBottom: 10 },
    addOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
    addOptionText: { color: colors.primary, fontSize: 13, fontWeight: '700' },

    addPpBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      marginTop: 4,
    },
    addPpText: { color: colors.primary, fontSize: 14, fontWeight: '800' },

    validationHint: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 16 },
  });

export default CreateFocusReelScreen;
