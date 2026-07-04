/**
 * TutorChatScreen — AI Tutor for a Learn-path unit (Phase 1: text only).
 * Grounded in the unit's mini-lesson/formula sheet (fetched the same way
 * UnitLessonScreen does), the tutor always explains step-by-step, never
 * a bare final answer.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useThemeContext } from '@/contexts';
import { Haptics } from '@/services/haptics';
import { learnPathService, UnitLesson } from '@/services/learnPath.service';
import { aiApi } from '@/api/ai';
import { LearnStackScreenProps } from '@/navigation/types';
import { MarkdownMathView } from '@/components/learn/MarkdownMathView';

type Props = LearnStackScreenProps<'TutorChat'>;

interface TutorMessage {
  id: string;
  role: 'user' | 'tutor';
  text: string;
  imageUri?: string;
  pending?: boolean;
  error?: boolean;
}

export function TutorChatScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<Props['navigation']>();
  const route = useRoute<Props['route']>();
  const { topicId, title, grade, subjectName, subjectNameKh } = route.params;
  const isKh = i18n.language?.startsWith('km');
  const flatListRef = useRef<FlatList<TutorMessage>>(null);
  const inputRef = useRef<TextInput>(null);

  const [lesson, setLesson] = useState<UnitLesson | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageMime, setSelectedImageMime] = useState<string | null>(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('learn.tutor.permissionDeniedTitle'), t('learn.tutor.libraryPermissionMsg'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setSelectedImageBase64(result.assets[0].base64 || null);
      const mimeType = result.assets[0].mimeType || 'image/jpeg';
      setSelectedImageMime(mimeType);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('learn.tutor.permissionDeniedTitle'), t('learn.tutor.cameraPermissionMsg'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setSelectedImageBase64(result.assets[0].base64 || null);
      const mimeType = result.assets[0].mimeType || 'image/jpeg';
      setSelectedImageMime(mimeType);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      t('learn.tutor.uploadExerciseTitle'),
      t('learn.tutor.uploadExerciseMsg'),
      [
        { text: t('learn.tutor.takePhoto'), onPress: handleTakePhoto },
        { text: t('learn.tutor.chooseFromGallery'), onPress: handlePickImage },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  useEffect(() => {
    if (!topicId) {
      setLesson(null);
      return;
    }
    learnPathService
      .getLesson(topicId)
      .then(setLesson)
      .catch(() => setLesson(null));
  }, [topicId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const question = inputText.trim();
    if (!question || sending) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText('');
    inputRef.current?.blur();

    const userMsg: TutorMessage = { 
      id: `u-${Date.now()}`, 
      role: 'user', 
      text: question,
      imageUri: selectedImage || undefined,
    };
    const pendingMsg: TutorMessage = { id: `t-${Date.now()}`, role: 'tutor', text: '', pending: true };

    const imgBase64 = selectedImageBase64;
    const imgMime = selectedImageMime;
    setSelectedImage(null);
    setSelectedImageBase64(null);
    setSelectedImageMime(null);

    setMessages((prev) => [...prev, userMsg, pendingMsg]);
    setSending(true);

    try {
      const isQuestionKh = isKh || /[\u1780-\u17FF]/.test(question);
      const response = await aiApi.askTutor({
        question,
        locale: isQuestionKh ? 'km' : 'en',
        grade,
        subjectName: isQuestionKh ? subjectNameKh || subjectName : subjectName,
        topicName: title || undefined,
        miniLesson: isQuestionKh ? lesson?.miniLessonKh || lesson?.miniLesson : lesson?.miniLesson || lesson?.miniLessonKh,
        formulaSheet: lesson?.formulaSheet,
        image: imgBase64,
        mimeType: imgMime,
      });

      const explanation = response?.data?.explanation;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMsg.id
            ? { ...m, pending: false, text: explanation || t('learn.tutor.errorGeneric') }
            : m,
        ),
      );
    } catch (error: any) {
      const message =
        error?.message && typeof error.message === 'string'
          ? error.message
          : t('learn.tutor.errorGeneric');
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingMsg.id ? { ...m, pending: false, error: true, text: message } : m)),
      );
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: TutorMessage }) => {
    if (item.role === 'user') {
      return (
        <View style={[styles.messageRow, styles.myMessageRow]}>
          <View style={[styles.messageBubble, styles.myBubble]}>
            {item.imageUri && (
              <Image source={{ uri: item.imageUri }} style={styles.userSentImage} />
            )}
            {!!item.text && (
              <Text style={[styles.messageText, styles.myMessageText]}>{item.text}</Text>
            )}
          </View>
        </View>
      );
    }

    // ChatGPT/Claude-style: the AI answer spans the full width, flush left,
    // no chat-bubble chrome — only the student's own messages get a bubble.
    return (
      <View style={styles.tutorRow}>
        <View style={[styles.tutorContent, item.error && styles.tutorErrorContent]}>
          {item.pending ? (
            <View style={styles.thinkingRow}>
              <ActivityIndicator size="small" color={isDark ? colors.textSecondary : '#94A3B8'} />
              <Text style={styles.thinkingText}>{t('learn.tutor.thinking')}</Text>
            </View>
          ) : item.error ? (
            <Text style={styles.messageText}>{item.text}</Text>
          ) : (
            <MarkdownMathView text={item.text} colors={colors} isDark={isDark} />
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('learn.tutor.title')}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubble-ellipses" size={28} color="#0EA5E9" />
            </View>
            <Text style={styles.emptyText}>
              {title ? t('learn.tutor.emptyPrompt', { topic: title }) : t('learn.tutor.emptyPromptGeneral')}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            extraData={messages.length}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
            <TouchableOpacity 
              onPress={() => {
                setSelectedImage(null);
                setSelectedImageBase64(null);
                setSelectedImageMime(null);
              }}
              style={styles.closePreviewButton}
            >
              <Ionicons name="close-circle" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={showImageOptions} style={styles.attachButton}>
            <Ionicons name="camera-outline" size={24} color="#0EA5E9" />
          </TouchableOpacity>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder={t('learn.tutor.inputPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={1000}
              editable={!sending}
            />
          </View>
          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.sendButton, 
              ((!inputText.trim() && !selectedImage) || sending) && styles.sendButtonDisabled
            ]}
            disabled={(!inputText.trim() && !selectedImage) || sending}
          >
            <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    keyboardAvoid: { flex: 1 },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      gap: 12,
    },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: isDark ? colors.surfaceVariant : '#E0F2FE',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    messagesList: { padding: 16, paddingBottom: 8 },
    messageRow: {
      flexDirection: 'row',
      marginBottom: 10,
      alignItems: 'flex-end',
    },
    myMessageRow: { justifyContent: 'flex-end' },
    messageBubble: {
      maxWidth: '80%',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 20,
    },
    myBubble: {
      backgroundColor: '#0EA5E9',
      borderBottomRightRadius: 4,
    },
    tutorRow: {
      marginBottom: 24,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      paddingBottom: 20,
    },
    tutorContent: { 
      width: '100%',
    },
    tutorErrorContent: {
      backgroundColor: isDark ? '#3F1D1D' : '#FEF2F2',
      borderRadius: 12,
      padding: 12,
    },
    thinkingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    thinkingText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    messageText: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
    },
    myMessageText: { color: '#FFFFFF' },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
    },
    inputWrapper: {
      flex: 1,
      backgroundColor: isDark ? colors.surfaceVariant : '#F1F5F9',
      borderRadius: 24,
      paddingHorizontal: 16,
      minHeight: 44,
      maxHeight: 120,
      justifyContent: 'center',
    },
    input: {
      fontSize: 15,
      color: colors.text,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      maxHeight: 100,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#0EA5E9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.4,
    },
    userSentImage: {
      width: 200,
      height: 150,
      borderRadius: 12,
      marginBottom: 8,
      resizeMode: 'cover',
    },
    imagePreviewContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      alignItems: 'center',
    },
    imagePreview: {
      width: 56,
      height: 56,
      borderRadius: 8,
    },
    closePreviewButton: {
      position: 'absolute',
      top: 2,
      left: 60,
      backgroundColor: '#FFFFFF',
      borderRadius: 11,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1,
      elevation: 2,
    },
    attachButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
    },
  });
