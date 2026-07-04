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
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import MarkdownIt from 'markdown-it';
// @ts-ignore — no published types for this plugin
import texmath from 'markdown-it-texmath';
import katex from 'katex';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useThemeContext } from '@/contexts';
import { Haptics } from '@/services/haptics';
import { learnPathService, UnitLesson } from '@/services/learnPath.service';
import { aiApi } from '@/api/ai';
import { LearnStackScreenProps } from '@/navigation/types';

type Props = LearnStackScreenProps<'TutorChat'>;

// Full HTML rendering (markdown-it -> HTML string, KaTeX -> real math markup)
// instead of mapping markdown nodes to native RN components. This is how
// ChatGPT/Claude/Gemini's own apps render chat answers — a WebView running
// the same browser rendering engine used on the web, so math flows inline
// with text exactly like it does on desktop, instead of fighting React
// Native's inability to embed a WebView inline inside a line of Text.
const tutorMarkdownIt = MarkdownIt({ typographer: true }).use(texmath, {
  delimiters: 'dollars',
  engine: katex,
  katexOptions: { throwOnError: false },
});

const KATEX_CSS_CDN = 'https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/katex.min.css';

function buildAnswerHtml(bodyHtml: string, colors: any, isDark: boolean): string {
  const accentColor = '#0EA5E9';
  const headingColor = isDark ? '#38BDF8' : '#0369A1';
  const blockquoteBg = isDark 
    ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(14, 165, 233, 0.04))' 
    : 'linear-gradient(135deg, #F0F9FF, #E0F2FE)';
  const blockquoteBorder = isDark ? 'rgba(14, 165, 233, 0.3)' : '#BEE3F8';
  const formulaBg = isDark ? 'rgba(14, 165, 233, 0.06)' : '#F0F9FF';
  const formulaBorder = isDark ? 'rgba(14, 165, 233, 0.25)' : '#BEE3F8';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Battambang:wght@400;700&family=Kantumruy+Pro:wght@400;700&family=Koulen&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${KATEX_CSS_CDN}">
<style>
  * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: transparent;
    color: ${colors.text};
    font-family: 'Kantumruy Pro', 'Battambang', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Android Emoji', 'EmojiSymbols', 'Times New Roman', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 15px;
    line-height: 1.65;
    -webkit-text-size-adjust: 100%;
  }
  body { padding: 1px 2px; overflow-x: hidden; }
  h1, h2, h3 { 
    font-family: 'Koulen', 'Kantumruy Pro', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Android Emoji', 'EmojiSymbols', 'Times New Roman', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: ${headingColor};
    font-weight: 400; 
    margin: 22px 0 12px; 
    line-height: 1.45;
    letter-spacing: 0.5px;
  }
  h1 { font-size: 19px; border-bottom: 2px solid ${isDark ? 'rgba(56, 189, 248, 0.2)' : '#E0F2FE'}; padding-bottom: 6px; } 
  h2 { font-size: 17px; } 
  h3 { font-size: 16px; }
  strong { 
    font-weight: 700; 
    color: ${isDark ? '#F1F5F9' : '#0F172A'}; 
  }
  ul, ol { padding-left: 20px; margin: 8px 0; }
  li { margin-bottom: 6px; }
  p { margin: 0 0 12px; }
  p:last-child { margin-bottom: 0; }
  a { color: ${accentColor}; text-decoration: none; font-weight: 600; }
  blockquote {
    background: ${blockquoteBg};
    border-left: 4px solid ${accentColor};
    border-top: 1px solid ${blockquoteBorder};
    border-right: 1px solid ${blockquoteBorder};
    border-bottom: 1px solid ${blockquoteBorder};
    border-radius: 12px;
    padding: 14px 16px;
    margin: 14px 0;
  }
  blockquote p { 
    margin: 0; 
    font-weight: 500;
    color: ${isDark ? '#E2E8F0' : '#1E293B'};
  }
  code {
    background: ${colors.surfaceVariant};
    color: ${accentColor};
    border-radius: 6px;
    padding: 2px 6px;
    font-size: 13.5px;
    font-family: Menlo, Monaco, Consolas, monospace;
  }
  pre {
    background: ${colors.surfaceVariant};
    border-radius: 10px;
    padding: 12px;
    overflow-x: auto;
    border: 1px solid ${colors.border};
  }
  hr { border: none; border-top: 1px solid ${colors.border}; margin: 14px 0; }
  .katex { font-size: 1.05em; }
  .katex-display { 
    margin: 16px 0; 
    padding: 16px;
    background: ${formulaBg};
    border: 1.5px solid ${formulaBorder};
    border-radius: 12px;
    overflow-x: auto; 
    overflow-y: hidden; 
  }
  .katex .text, .katex .mord.text {
    font-family: 'Kantumruy Pro', 'Battambang', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Android Emoji', 'EmojiSymbols', 'Times New Roman', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
  }
</style>
</head>
<body>
${bodyHtml}
<script>
  function report() {
    var h = document.body.scrollHeight;
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(String(h));
  }
  window.addEventListener('load', report);
  if (window.ResizeObserver) {
    new ResizeObserver(report).observe(document.body);
  } else {
    setTimeout(report, 300);
    setTimeout(report, 900);
  }
</script>
</body>
</html>`;
}

// ─── Unicode Math Symbol → LaTeX Pre-processor ────────────────────────
// Kantumruy Pro's cmap table claims to cover certain Unicode math code
// points but ships empty outlines for them, so the browser never falls
// through to a system font — it renders a .notdef [?] box instead.
// We fix this by converting raw Unicode math operators in plain text
// (i.e. NOT already inside $…$ or $$…$$) into inline LaTeX before
// markdown-it processes the string.
const MATH_SYMBOL_MAP: Record<string, string> = {
  '→': '\\rightarrow', '←': '\\leftarrow', '↔': '\\leftrightarrow',
  '⇒': '\\Rightarrow', '⇐': '\\Leftarrow', '⇔': '\\Leftrightarrow',
  '∪': '\\cup', '∩': '\\cap', '∈': '\\in', '∉': '\\notin',
  '⊂': '\\subset', '⊃': '\\supset', '⊆': '\\subseteq', '⊇': '\\supseteq',
  '≤': '\\le', '≥': '\\ge', '≠': '\\ne', '≈': '\\approx',
  '×': '\\times', '÷': '\\div', '±': '\\pm', '∓': '\\mp',
  '∞': '\\infty', '√': '\\surd', '∴': '\\therefore', '∵': '\\because',
  '∀': '\\forall', '∃': '\\exists', '∅': '\\emptyset',
  '⊕': '\\oplus', '⊗': '\\otimes',
  '∑': '\\sum', '∏': '\\prod', '∫': '\\int',
};
const MATH_SYMBOL_REGEX = new RegExp(
  `[${Object.keys(MATH_SYMBOL_MAP).join('')}]`,
  'g',
);
function sanitizeMathSymbols(md: string): string {
  // Split the text around existing LaTeX delimiters ($…$ and $$…$$)
  // so we only touch plain-text segments and leave real LaTeX alone.
  const parts = md.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g);
  for (let i = 0; i < parts.length; i++) {
    // Odd indices are the captured LaTeX groups — skip them.
    if (i % 2 === 1) continue;
    parts[i] = parts[i].replace(MATH_SYMBOL_REGEX, (ch) => {
      const cmd = MATH_SYMBOL_MAP[ch];
      return cmd ? `$${cmd}$` : ch;
    });
  }
  return parts.join('');
}

// WebViews don't auto-size to their content, so each answer is measured via
// a postMessage from the page once it (and any web fonts) finish loading.
function TutorAnswerView({ text, colors, isDark }: { text: string; colors: any; isDark: boolean }) {
  const [height, setHeight] = useState(60);
  const html = useMemo(() => buildAnswerHtml(tutorMarkdownIt.render(sanitizeMathSymbols(text)), colors, isDark), [text, colors, isDark]);
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html, baseUrl: '' }}
      style={{ height, backgroundColor: 'transparent' }}
      scrollEnabled={false}
      onMessage={(e) => {
        const h = parseInt(e.nativeEvent.data, 10);
        if (!isNaN(h) && h > 0 && Math.abs(h - height) > 4) setHeight(h);
      }}
    />
  );
}

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
      Alert.alert('Permission Denied', 'Please grant library permissions to upload images.');
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
      Alert.alert('Permission Denied', 'Please grant camera permissions to capture photos.');
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
      'Upload Exercise',
      'Choose an option to share your exercise image with the tutor:',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Gallery', onPress: handlePickImage },
        { text: 'Cancel', style: 'cancel' },
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
            <TutorAnswerView text={item.text} colors={colors} isDark={isDark} />
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
