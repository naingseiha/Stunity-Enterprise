/**
 * CreatePost Screen — Enhanced
 * 
 * Premium create post with:
 * - Title field for structured post types
 * - Topic tags with suggestion chips
 * - Difficulty level for educational posts
 * - Deadline picker for time-bound content
 * - Gradient header and polished UI
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  LayoutAnimation,
  Modal,
  Animated,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Haptics } from '@/services/haptics';

import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { Avatar } from '@/components/common';
import { useThemeContext } from '@/contexts';
import { useAuthStore, useFeedStore } from '@/stores';
import { MediaMetadata, PostType } from '@/types';
import { QuizForm } from './create-post/forms/QuizForm';
import { QuestionForm } from './create-post/forms/QuestionForm';
import { PollForm } from './create-post/forms/PollForm';
import { AnnouncementForm } from './create-post/forms/AnnouncementForm';
import { CourseForm } from './create-post/forms/CourseForm';
import { ProjectForm } from './create-post/forms/ProjectForm';
import { VideoPlayer, ResizeMode } from '@/components/common/VideoPlayer';
import { AILoadingOverlay, AIResultPreview } from '@/components/ai';
import { aiService } from '@/services/ai.service';
import { useTranslation } from 'react-i18next';
import { metadataFromPickerAsset } from '@/utils/mediaMetadata';

// Post type options
const POST_TYPES: { type: PostType; icon: string; labelKey: string; titleKey: string; color: string; gradient: [string, string] }[] = [
  { type: 'ARTICLE', icon: 'document-text', labelKey: 'feed.postTypes.article', titleKey: 'feed.createPost.postTypeTitles.article', color: '#0EA5E9', gradient: ['#0EA5E9', '#38BDF8'] },
  { type: 'QUESTION', icon: 'help-circle', labelKey: 'feed.postTypes.question', titleKey: 'feed.createPost.postTypeTitles.question', color: '#3B82F6', gradient: ['#3B82F6', '#60A5FA'] },
  { type: 'ANNOUNCEMENT', icon: 'megaphone', labelKey: 'feed.postTypes.announcement', titleKey: 'feed.createPost.postTypeTitles.announcement', color: '#EF4444', gradient: ['#EF4444', '#F87171'] },
  { type: 'POLL', icon: 'stats-chart', labelKey: 'feed.postTypes.poll', titleKey: 'feed.createPost.postTypeTitles.poll', color: '#8B5CF6', gradient: ['#8B5CF6', '#A78BFA'] },
  { type: 'QUIZ', icon: 'school', labelKey: 'feed.postTypes.quiz', titleKey: 'feed.createPost.postTypeTitles.quiz', color: '#EC4899', gradient: ['#EC4899', '#F472B6'] },
  { type: 'COURSE', icon: 'book', labelKey: 'feed.postTypes.course', titleKey: 'feed.createPost.postTypeTitles.course', color: '#10B981', gradient: ['#10B981', '#34D399'] },
  { type: 'PROJECT', icon: 'folder', labelKey: 'feed.postTypes.project', titleKey: 'feed.createPost.postTypeTitles.project', color: '#F97316', gradient: ['#F97316', '#FB923C'] },
  { type: 'RESOURCE', icon: 'folder-open', labelKey: 'feed.postTypes.resource', titleKey: 'feed.createPost.postTypeTitles.resource', color: '#6366F1', gradient: ['#6366F1', '#818CF8'] },
  { type: 'EXAM', icon: 'clipboard', labelKey: 'feed.postTypes.exam', titleKey: 'feed.createPost.postTypeTitles.exam', color: '#DC2626', gradient: ['#DC2626', '#F87171'] },
  { type: 'ASSIGNMENT', icon: 'book-outline', labelKey: 'feed.postTypes.assignment', titleKey: 'feed.createPost.postTypeTitles.assignment', color: '#2563EB', gradient: ['#2563EB', '#60A5FA'] },
  { type: 'TUTORIAL', icon: 'play-circle', labelKey: 'feed.postTypes.tutorial', titleKey: 'feed.createPost.postTypeTitles.tutorial', color: '#0891B2', gradient: ['#0891B2', '#22D3EE'] },
  { type: 'RESEARCH', icon: 'flask', labelKey: 'feed.postTypes.research', titleKey: 'feed.createPost.postTypeTitles.research', color: '#7C3AED', gradient: ['#7C3AED', '#A78BFA'] },
  { type: 'ACHIEVEMENT', icon: 'trophy', labelKey: 'feed.postTypes.achievement', titleKey: 'feed.createPost.postTypeTitles.achievement', color: '#0284C7', gradient: ['#0284C7', '#38BDF8'] },
  { type: 'REFLECTION', icon: 'bulb', labelKey: 'feed.postTypes.reflection', titleKey: 'feed.createPost.postTypeTitles.reflection', color: '#65A30D', gradient: ['#65A30D', '#A3E635'] },
  { type: 'COLLABORATION', icon: 'people', labelKey: 'feed.postTypes.collaboration', titleKey: 'feed.createPost.postTypeTitles.collaboration', color: '#DB2777', gradient: ['#DB2777', '#F472B6'] },
  { type: 'CLUB_CREATED', icon: 'people-circle', labelKey: 'feed.postTypes.clubCreated', titleKey: 'feed.createPost.postTypeTitles.clubCreated', color: '#4F46E5', gradient: ['#4F46E5', '#818CF8'] },
  { type: 'EVENT_CREATED', icon: 'calendar', labelKey: 'feed.postTypes.eventCreated', titleKey: 'feed.createPost.postTypeTitles.eventCreated', color: '#BE185D', gradient: ['#BE185D', '#F472B6'] },
];

// Types that should show a title input
const TITLE_POST_TYPES: PostType[] = [
  'COURSE',
  'PROJECT',
  'ANNOUNCEMENT',
  'QUIZ',
  'RESOURCE',
  'EXAM',
  'ASSIGNMENT',
  'TUTORIAL',
  'RESEARCH',
  'ACHIEVEMENT',
  'COLLABORATION',
  'CLUB_CREATED',
  'EVENT_CREATED',
];

// Types that should show difficulty selector
const EDUCATIONAL_POST_TYPES: PostType[] = [
  'ARTICLE',
  'COURSE',
  'QUIZ',
  'PROJECT',
  'RESOURCE',
  'EXAM',
  'ASSIGNMENT',
  'TUTORIAL',
  'RESEARCH',
];

// Types that support a deadline
const DEADLINE_POST_TYPES: PostType[] = ['COURSE', 'PROJECT', 'QUIZ', 'EXAM', 'ASSIGNMENT', 'EVENT_CREATED'];

// Difficulty levels
const DIFFICULTY_LEVELS = [
  { value: 'BEGINNER', labelKey: 'feed.difficulty.beginner', icon: 'leaf', color: '#10B981', bg: '#ECFDF5' },
  { value: 'INTERMEDIATE', labelKey: 'feed.difficulty.intermediate', icon: 'trending-up', color: '#F59E0B', bg: '#FFFBEB' },
  { value: 'ADVANCED', labelKey: 'feed.difficulty.advanced', icon: 'flame', color: '#EF4444', bg: '#FEF2F2' },
];

// Deadline options
const DEADLINE_OPTIONS = [
  { labelKey: 'feed.createPost.deadlines.none', value: null },
  { labelKey: 'feed.createPost.deadlines.oneDay', value: 1 },
  { labelKey: 'feed.createPost.deadlines.threeDays', value: 3 },
  { labelKey: 'feed.createPost.deadlines.oneWeek', value: 7 },
  { labelKey: 'feed.createPost.deadlines.twoWeeks', value: 14 },
  { labelKey: 'feed.createPost.deadlines.oneMonth', value: 30 },
];

// Suggested topic tags
const SUGGESTED_TAGS = [
  'Math', 'Science', 'Physics', 'Chemistry', 'Biology',
  'Programming', 'English', 'History', 'Art', 'Music',
  'Geography', 'Literature', 'Economics', 'Psychology',
];

// Helper to check if URI is video
const isVideo = (uri: string) => {
  if (!uri) return false;
  // Check extension
  const ext = uri.split('.').pop()?.toLowerCase();
  const hasVideoExt = ext === 'mp4' || ext === 'mov' || ext === 'avi' || ext === 'mkv' || ext === 'webm';
  if (hasVideoExt) return true;

  // Check Android content URI pattern
  return uri.includes('video');
};

// Visibility options
const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', labelKey: 'feed.createPost.visibility.public', icon: 'earth', descKey: 'feed.createPost.visibilityDesc.public', color: '#10B981' },
  { value: 'SCHOOL', labelKey: 'feed.createPost.visibility.school', icon: 'school', descKey: 'feed.createPost.visibilityDesc.school', color: '#3B82F6' },
  { value: 'CLASS', labelKey: 'feed.createPost.visibility.class', icon: 'people', descKey: 'feed.createPost.visibilityDesc.class', color: '#8B5CF6' },
  { value: 'PRIVATE', labelKey: 'feed.createPost.visibility.private', icon: 'lock-closed', descKey: 'feed.createPost.visibilityDesc.private', color: '#6B7280' },
];

export default function CreatePostScreen() {
    const { t: autoT } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { user } = useAuthStore();
  const { createPost } = useFeedStore();

  const [content, setContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postType, setPostType] = useState<PostType>(route.params?.initialPostType || route.params?.postType || 'ARTICLE');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [mediaUris, setMediaUris] = useState<string[]>([]);
  const [mediaMetadata, setMediaMetadata] = useState<MediaMetadata[]>([]);
  const [isPosting, setIsPosting] = useState(false);

  // Advanced Options Modals
  const [isTagModalVisible, setIsTagModalVisible] = useState(false);
  const [isDifficultyModalVisible, setIsDifficultyModalVisible] = useState(false);
  const [isDeadlineModalVisible, setIsDeadlineModalVisible] = useState(false);
  const [isVisibilityModalVisible, setIsVisibilityModalVisible] = useState(false);

  // Topic tags
  const [topicTags, setTopicTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Difficulty level
  const [difficulty, setDifficulty] = useState<string | null>(null);

  // Deadline
  const [deadlineDays, setDeadlineDays] = useState<number | null>(null);

  // Poll state
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollData, setPollData] = useState<any>(null);

  // Quiz state
  const [quizData, setQuizData] = useState<any>(null);

  // Question state
  const [questionData, setQuestionData] = useState<any>(null);

  // Announcement state
  const [announcementData, setAnnouncementData] = useState<any>(null);

  // Course state
  const [courseData, setCourseData] = useState<any>(null);

  // Project state
  const [projectData, setProjectData] = useState<any>(null);

  // AI State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiPreviewData, setAiPreviewData] = useState<{ enhanced: string; changes: string } | null>(null);

  const handleEnhanceContent = async () => {
    if (!content.trim()) {
      Alert.alert(t('feed.createPost.emptyContent'), t('feed.createPost.emptyContentAiMessage'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsAiLoading(true);
    try {
      const result = await aiService.enhanceContent(content, 'educational', postType.toLowerCase());
      setAiPreviewData(result || null);
    } catch (error: any) {
      Alert.alert(t('feed.createPost.aiError'), error.message || t('feed.createPost.failedEnhance'));
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAcceptEnhancedInfo = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (aiPreviewData?.enhanced) {
      setContent(aiPreviewData.enhanced);
    }
    setAiPreviewData(null);
  };

  const handleSuggestTags = async () => {
    if (!content.trim()) {
      Alert.alert(t('feed.createPost.emptyContent'), t('feed.createPost.emptyContentTagsMessage'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsAiLoading(true);
    try {
      const result = await aiService.suggestTags(content, topicTags);
      if (result?.tags && result.tags.length > 0) {
        setTopicTags(prev => [...new Set([...prev, ...result.tags])].slice(0, 5));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      Alert.alert(t('feed.createPost.aiError'), error.message || t('feed.createPost.failedSuggestTags'));
    } finally {
      setIsAiLoading(false);
    }
  };

  // Tag helpers
  const addTag = useCallback((tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && topicTags.length < 5 && !topicTags.includes(trimmed)) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTopicTags(prev => [...prev, trimmed]);
      setTagInput('');
    }
  }, [topicTags]);

  const removeTag = useCallback((tag: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTopicTags(prev => prev.filter(t => t !== tag));
  }, []);

  // Add poll option with animation
  const addPollOption = () => {
    if (pollOptions.length < 6) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setPollOptions([...pollOptions, '']);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Remove poll option with animation
  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setPollOptions(pollOptions.filter((_, i) => i !== index));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  // Update poll option
  const updatePollOption = (index: number, value: string) => {
    const updated = [...pollOptions];
    updated[index] = value;
    setPollOptions(updated);
  };

  const handleClose = useCallback(() => {
    if (content.trim() || mediaUris.length > 0) {
      Alert.alert(
        t('feed.createPost.discardPost'),
        t('feed.createPost.discardPostMessage'),
        [
          { text: t('feed.createPost.keepEditing'), style: 'cancel' },
          { text: t('feed.createPost.discard'), style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [content, mediaUris, navigation, t]);

  const handlePickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('feed.createPost.permissionRequired'), t('feed.createPost.photoPermissionMessage'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 4 - mediaUris.length,
    });

    if (!result.canceled && result.assets) {
      const newUris = result.assets.map(asset => asset.uri);
      const newMetadata = result.assets.map(metadataFromPickerAsset);
      setMediaUris(prev => [...prev, ...newUris].slice(0, 4));
      setMediaMetadata(prev => [...prev, ...newMetadata].slice(0, 4));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [mediaUris, t]);

  const handlePickVideo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('feed.createPost.permissionRequired'), t('feed.createPost.videoPermissionMessage'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 4 - mediaUris.length,
    });

    if (!result.canceled && result.assets) {
      const newUris = result.assets.map(asset => asset.uri);
      const newMetadata = result.assets.map(metadataFromPickerAsset);
      setMediaUris(prev => [...prev, ...newUris].slice(0, 4));
      setMediaMetadata(prev => [...prev, ...newMetadata].slice(0, 4));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [mediaUris, t]);

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('feed.createPost.permissionRequired'), t('feed.createPost.cameraPermissionMessage'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setMediaUris(prev => [...prev, result.assets[0].uri].slice(0, 4));
      setMediaMetadata(prev => [...prev, metadataFromPickerAsset(result.assets[0])].slice(0, 4));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [t]);

  const handleRemoveImage = useCallback((index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMediaUris(prev => prev.filter((_, i) => i !== index));
    setMediaMetadata(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handlePost = useCallback(async () => {
    if (!content.trim()) {
      Alert.alert(t('feed.createPost.emptyPost'), t('feed.createPost.emptyPostMessage'));
      return;
    }

    // Validate poll if it's a poll post
    if (postType === 'POLL') {
      const validOptions = pollOptions.filter(opt => opt.trim().length > 0);
      if (validOptions.length < 2) {
        Alert.alert(t('feed.createPost.invalidPoll'), t('feed.createPost.invalidPollMessage'));
        return;
      }
    }

    // Validate quiz if it's a quiz post
    if (postType === 'QUIZ') {
      if (!quizData || !quizData.questions || quizData.questions.length === 0) {
        Alert.alert(t('feed.createPost.invalidQuiz'), t('feed.createPost.invalidQuizMessage'));
        return;
      }
    }

    // Validate course if it's a course post
    if (postType === 'COURSE') {
      if (!courseData || !courseData.syllabusSections || courseData.syllabusSections.length === 0) {
        Alert.alert(t('feed.createPost.invalidCourse'), t('feed.createPost.invalidCourseMessage'));
        return;
      }
    }

    // Validate project if it's a project post
    if (postType === 'PROJECT') {
      if (!projectData || !projectData.milestones || projectData.milestones.length === 0) {
        Alert.alert(t('feed.createPost.invalidProject'), t('feed.createPost.invalidProjectMessage'));
        return;
      }
    }

    // Dismiss keyboard immediately to prevent react-native-screens crash on goBack
    Keyboard.dismiss();

    setIsPosting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Prepare poll options if it's a poll
      const validPollOptions = postType === 'POLL'
        ? pollOptions.filter(opt => opt.trim().length > 0)
        : [];

      // Prepare quiz data if it's a quiz
      const quizPayload = postType === 'QUIZ' && quizData ? quizData : undefined;

      // Resolve title: use form title for structured types, quiz title for quiz
      const resolvedTitle = TITLE_POST_TYPES.includes(postType) && postTitle.trim()
        ? postTitle.trim()
        : (postType === 'QUIZ' && quizData?.title ? quizData.title : undefined);

      // Build deadline ISO string
      let deadlineISO: string | undefined;
      if (deadlineDays && DEADLINE_POST_TYPES.includes(postType)) {
        const d = new Date();
        d.setDate(d.getDate() + deadlineDays);
        deadlineISO = d.toISOString();
      }

      // Build final topic tags (include difficulty as a tag if set)
      const finalTags = [...topicTags];
      if (difficulty && EDUCATIONAL_POST_TYPES.includes(postType)) {
        finalTags.push(difficulty.toLowerCase());
      }

      // Resolve question bounty if it's a question post
      const questionBounty = postType === 'QUESTION' && questionData ? questionData.bounty : 0;

      // Upload images and create post
      const success = await createPost(
        content,
        mediaUris,
        postType,
        validPollOptions,
        quizPayload,
        resolvedTitle,
        visibility,
        postType === 'POLL' ? pollData : undefined,
        courseData,
        projectData,
        finalTags,
        deadlineISO,
        questionBounty,
        mediaMetadata
      );

      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await new Promise(resolve => setTimeout(resolve, 100));
        navigation.goBack();
      } else {
        Alert.alert(t('common.error'), t('feed.createPost.failedCreatePost'));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error: any) {
      console.error('Post creation error:', error);
      Alert.alert(t('common.error'), error.message || t('feed.createPost.failedCreatePost'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsPosting(false);
    }
  }, [content, postType, postTitle, mediaUris, mediaMetadata, pollOptions, quizData, courseData, projectData, questionData, navigation, createPost, visibility, topicTags, difficulty, deadlineDays, t]);

  const userName = user ? `${user.lastName} ${user.firstName}` : 'User';
  const canPost = content.trim().length > 0;
  const currentTypeConfig = POST_TYPES.find(t => t.type === postType) || POST_TYPES[0];
  const currentPostTypeLabel = t(currentTypeConfig.labelKey);
  const selectedVisibility = VISIBILITY_OPTIONS.find(o => o.value === visibility) || VISIBILITY_OPTIONS[0];
  const selectedDifficulty = DIFFICULTY_LEVELS.find(l => l.value === difficulty);
  const selectedDeadline = DEADLINE_OPTIONS.find(o => o.value === deadlineDays);
  const getSuggestedTagLabel = useCallback((tag: string) => {
    const key = tag.toLowerCase().replace(/\s+/g, '');
    return t(`feed.subjects.${key}`, tag);
  }, [t]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Premium Header */}
      <BlurView style={styles.headerBlur} intensity={80} tint={isDark ? 'dark' : 'light'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t('feed.createPost.title')}</Text>
            <View style={[styles.headerBadge, { backgroundColor: currentTypeConfig.color + '20' }]}>
              <Ionicons name={currentTypeConfig.icon as any} size={12} color={currentTypeConfig.color} />
              <Text style={[styles.headerBadgeText, { color: currentTypeConfig.color }]}>{currentPostTypeLabel}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handlePost}
            disabled={!canPost || isPosting}
            onPressIn={() => !(!canPost || isPosting) && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <LinearGradient
              colors={canPost && !isPosting ? ['#1D9BF0', '#60A5FA'] : [colors.surfaceVariant, colors.surfaceVariant]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.postButton}
            >
              {isPosting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.postButtonText, !canPost && styles.postButtonTextDisabled]}>
                  {t('feed.createPost.post')}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BlurView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Author Info */}
          <View style={styles.authorSection}>
            <Avatar
              uri={user?.profilePictureUrl}
              name={userName}
              size="md"
              variant="post"
            />
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{userName}</Text>
              <Text style={styles.authorSubtitleText}>{t('feed.createPost.creatingNewPost')}</Text>
            </View>
          </View>

          {/* Post Type Selector (Horizontal List) */}
          <View style={styles.postTypeContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.postTypeScrollContent}
            >
              {POST_TYPES.map((typeObj) => {
                const isActive = postType === typeObj.type;
                return (
                  <TouchableOpacity
                    key={typeObj.type}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPostType(typeObj.type);
                    }}
                    activeOpacity={0.75}
                    style={[styles.postTypeItem, isActive && styles.postTypeItemActive]}
                  >
                    <View style={[styles.postTypeIconBox, isActive ? { backgroundColor: typeObj.color + '15' } : null]}>
                      <Ionicons
                        name={typeObj.icon as any}
                        size={20}
                        color={isActive ? typeObj.color : colors.textTertiary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.postTypeLabel,
                        isActive && { color: typeObj.color, fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {t(typeObj.labelKey)}
                    </Text>
                    {!!isActive && <View style={[styles.postTypeActiveIndicator, { backgroundColor: typeObj.color }]} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Title Input — for structured post types */}
          {TITLE_POST_TYPES.includes(postType) && (
            <View style={styles.titleSection}>
              <TextInput
                style={styles.titleInput}
                placeholder={t('feed.createPost.titlePlaceholder', { type: t(currentTypeConfig.titleKey) })}
                placeholderTextColor={colors.textTertiary}
                value={postTitle}
                onChangeText={setPostTitle}
                maxLength={120}
              />
              <Text style={styles.titleCounter}>{postTitle.length}/120</Text>
            </View>
          )}

          {/* Content Input */}
          <TextInput
            style={styles.contentInput}
            placeholder={t('feed.createPost.contentPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            multiline
            value={content}
            onChangeText={setContent}
            autoFocus
          />

          {/* ─── Advanced Settings Card ─── */}
          <View style={styles.settingsSection}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionTitleIcon, { backgroundColor: colors.surfaceVariant }]}>
                <Ionicons name="options" size={14} color={colors.textSecondary} />
              </View>
              <Text style={styles.sectionTitle}>{t('feed.createPost.advancedOptions')}</Text>
            </View>

            <View style={styles.settingsCard}>
              {/* 1. Topic Tags */}
              <TouchableOpacity
                style={styles.settingRow}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsTagModalVisible(true);
                }}
              >
                <View style={[styles.settingIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="pricetag-outline" size={18} color="#6366F1" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingLabel}>{t('feed.createPost.topicTags')}</Text>
                  <Text style={styles.settingSublabel} numberOfLines={1}>
                    {topicTags.length > 0 ? topicTags.map(t => `#${t}`).join(', ') : t('feed.createPost.topicTagsHelp')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>

              <View style={styles.settingsDivider} />

              {/* 2. Visibility */}
              <TouchableOpacity
                style={styles.settingRow}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsVisibilityModalVisible(true);
                }}
              >
                <View style={[styles.settingIcon, { backgroundColor: '#ECFEFF' }]}>
                  <Ionicons name="eye-outline" size={18} color="#06B6D4" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingLabel}>{t('feed.createPost.visibilityLabel')}</Text>
                  <Text style={styles.settingSublabel} numberOfLines={1}>
                    {t(selectedVisibility.labelKey)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>

              {/* 3. Difficulty (Educational Only) */}
              {EDUCATIONAL_POST_TYPES.includes(postType) && (
                <>
                  <View style={styles.settingsDivider} />
                  <TouchableOpacity
                    style={styles.settingRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIsDifficultyModalVisible(true);
                    }}
                  >
                    <View style={[styles.settingIcon, { backgroundColor: '#FFFBEB' }]}>
                      <Ionicons name="school-outline" size={18} color="#F59E0B" />
                    </View>
                    <View style={styles.settingContent}>
                      <Text style={styles.settingLabel}>{t('feed.createPost.difficultyLimit')}</Text>
                      <Text style={styles.settingSublabel} numberOfLines={1}>
                        {selectedDifficulty ? t(selectedDifficulty.labelKey) : t('feed.createPost.difficultyHelp')}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                </>
              )}

              {/* 4. Deadline (Time-bound Only) */}
              {DEADLINE_POST_TYPES.includes(postType) && (
                <>
                  <View style={styles.settingsDivider} />
                  <TouchableOpacity
                    style={styles.settingRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIsDeadlineModalVisible(true);
                    }}
                  >
                    <View style={[styles.settingIcon, { backgroundColor: '#FEF2F2' }]}>
                      <Ionicons name="calendar-outline" size={18} color="#EF4444" />
                    </View>
                    <View style={styles.settingContent}>
                      <Text style={styles.settingLabel}>{t('feed.createPost.deadline')}</Text>
                      <Text style={styles.settingSublabel} numberOfLines={1}>
                        {selectedDeadline ? t(selectedDeadline.labelKey) : t('feed.createPost.noDeadlineSet')}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Advanced Forms Container */}
          <View style={styles.advancedFormsContainer}>
            {/* Question Form (only for QUESTION type) */}
            {postType === 'QUESTION' && (
              <QuestionForm onDataChange={setQuestionData} />
            )}

            {/* Poll Form (only for POLL type) */}
            {postType === 'POLL' && (
              <PollForm
                options={pollOptions}
                onOptionsChange={setPollOptions}
                onDataChange={setPollData}
              />
            )}

            {/* Quiz Form (only for QUIZ type) */}
            {postType === 'QUIZ' && (
              <QuizForm onDataChange={setQuizData} />
            )}

            {/* Announcement Form (only for ANNOUNCEMENT type) */}
            {postType === 'ANNOUNCEMENT' && (
              <AnnouncementForm
                onDataChange={setAnnouncementData}
                onGenerated={(title, body) => {
                  setPostTitle(title);
                  setContent(body);
                }}
              />
            )}

            {/* Course Form (only for COURSE type) */}
            {postType === 'COURSE' && (
              <CourseForm onDataChange={setCourseData} />
            )}

            {/* Project Form (only for PROJECT type) */}
            {postType === 'PROJECT' && (
              <ProjectForm onDataChange={setProjectData} />
            )}
          </View>

          {/* Media Preview */}
          {mediaUris.length > 0 && (
            <View
              style={styles.mediaPreview}
            >
              {mediaUris.map((uri, index) => (
                <View
                  key={uri}
                  style={styles.mediaItem}
                >
                  {isVideo(uri) ? (
                    <VideoPlayer
                      uri={uri}
                      style={styles.mediaImage}
                      resizeMode={ResizeMode.COVER}
                      shouldPlay={false}
                    />
                  ) : (
                    <Image source={{ uri }} style={styles.mediaImage} contentFit="cover" />
                  )}
                  <TouchableOpacity
                    onPress={() => handleRemoveImage(index)}
                    style={styles.removeMediaButton}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                  {isVideo(uri) && (
                    <View style={styles.videoIndicator}>
                      <Ionicons name="videocam" size={12} color="#fff" />
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions Toolbar */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.bottomActions}>
            <View style={styles.mediaActions}>
              <TouchableOpacity
                onPress={handlePickImage}
                style={styles.mediaIconButton}
                disabled={mediaUris.length >= 4}
              >
                <Ionicons
                  name="image"
                  size={24}
                  color={mediaUris.length >= 4 ? colors.textTertiary : '#10B981'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleTakePhoto}
                style={styles.mediaIconButton}
                disabled={mediaUris.length >= 4}
              >
                <Ionicons
                  name="camera"
                  size={24}
                  color={mediaUris.length >= 4 ? colors.textTertiary : '#3B82F6'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePickVideo}
                style={styles.mediaIconButton}
                disabled={mediaUris.length >= 4}
              >
                <Ionicons
                  name="videocam"
                  size={24}
                  color={mediaUris.length >= 4 ? colors.textTertiary : '#8B5CF6'}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.mediaIconButton}>
                <Ionicons name="document" size={24} color="#0EA5E9" />
              </TouchableOpacity>

              <View style={{ width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: 4 }} />

              <TouchableOpacity
                onPress={handleEnhanceContent}
                style={styles.mediaIconButton}
              >
                <Ionicons name="sparkles" size={24} color="#F59E0B" />
              </TouchableOpacity>
            </View>

            {!!(mediaUris.length > 0) ? (
              <View style={styles.mediaIndicatorBadge}>
                <Text style={styles.mediaIndicatorText}>{mediaUris.length}/4</Text>
              </View>
            ) : (
              <View style={styles.mediaIndicatorEmpty} />
            )}
          </View>
        </KeyboardAvoidingView>
      </KeyboardAvoidingView>


      {/* ─── Modals ─── */}
      <Modal visible={isTagModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsTagModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsTagModalVisible(false)}>
          <View style={styles.modalBackdrop} />
          <TouchableOpacity activeOpacity={1} style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('feed.createPost.topicTags')}</Text>
              <TouchableOpacity onPress={() => setIsTagModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.tagInputRow}>
                <TextInput
                  style={styles.tagInput}
                  placeholder={t('feed.createPost.addTagPlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={() => addTag(tagInput)}
                  returnKeyType="done"
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => addTag(tagInput)} style={[styles.tagAddButton, !tagInput.trim() && styles.tagAddButtonDisabled]} disabled={!tagInput.trim()}>
                  <Ionicons name="add" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>

              {!!(topicTags.length > 0) && (
                <View style={styles.activeTagsRow}>
                  {topicTags.map((tag) => (
                    <TouchableOpacity key={tag} style={styles.activeTag} onPress={() => removeTag(tag)}>
                      <Text style={styles.activeTagText}>#{tag}</Text>
                      <Ionicons name="close" size={14} color="#6366F1" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {!!(topicTags.length >= 5) && <Text style={styles.tagsCountLimitText}>{t('feed.createPost.maxTags')}</Text>}

              <View style={{ marginTop: 24 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={styles.suggestedTagsTitle}>{t('feed.createPost.suggestedTags')}</Text>
                  <TouchableOpacity
                    onPress={handleSuggestTags}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}
                  >
                    <Ionicons name="sparkles" size={14} color="#D97706" />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#D97706' }}>{t('feed.createPost.aiSuggest')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.suggestedTagsGrid}>
                  {SUGGESTED_TAGS.filter(t => !topicTags.includes(t.toLowerCase())).slice(0, 10).map((tag) => (
                    <TouchableOpacity key={tag} style={styles.suggestedTag} onPress={() => addTag(tag)} disabled={topicTags.length >= 5}>
                      <Text style={styles.suggestedTagText}>{getSuggestedTagLabel(tag)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isVisibilityModalVisible} animationType="fade" transparent={true} onRequestClose={() => setIsVisibilityModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsVisibilityModalVisible(false)}>
          <View style={styles.modalBackdrop} />
          <TouchableOpacity activeOpacity={1} style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('feed.createPost.visibilityLabel')}</Text>
              <TouchableOpacity onPress={() => setIsVisibilityModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {VISIBILITY_OPTIONS.map((option) => {
                const isSelected = visibility === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.modalOptionRow, isSelected && styles.modalOptionRowSelected]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setVisibility(option.value);
                      setTimeout(() => setIsVisibilityModalVisible(false), 200);
                    }}
                  >
                    <View style={[styles.modalOptionIconWrapper, { backgroundColor: option.color + '15' }]}>
                      <Ionicons name={option.icon as any} size={20} color={option.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalOptionText, isSelected && { color: colors.primary, fontWeight: '600' }]}>{t(option.labelKey)}</Text>
                      <Text style={styles.modalOptionDescText}>{t(option.descKey)}</Text>
                    </View>
                    {!!isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isDifficultyModalVisible} animationType="fade" transparent={true} onRequestClose={() => setIsDifficultyModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsDifficultyModalVisible(false)}>
          <View style={styles.modalBackdrop} />
          <TouchableOpacity activeOpacity={1} style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('feed.createPost.difficultyLimit')}</Text>
              <TouchableOpacity onPress={() => setIsDifficultyModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {DIFFICULTY_LEVELS.map((level) => {
                const isSelected = difficulty === level.value;
                return (
                  <TouchableOpacity
                    key={level.value}
                    style={[styles.modalOptionRow, isSelected && styles.modalOptionRowSelected]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDifficulty(isSelected ? null : level.value);
                      setTimeout(() => setIsDifficultyModalVisible(false), 200);
                    }}
                  >
                    <View style={[styles.modalOptionIconWrapper, { backgroundColor: level.bg }]}>
                      <Ionicons name={level.icon as any} size={20} color={level.color} />
                    </View>
                    <Text style={[styles.modalOptionText, isSelected && { color: colors.primary, fontWeight: '600' }]}>{t(level.labelKey)}</Text>
                    {!!isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isDeadlineModalVisible} animationType="fade" transparent={true} onRequestClose={() => setIsDeadlineModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsDeadlineModalVisible(false)}>
          <View style={styles.modalBackdrop} />
          <TouchableOpacity activeOpacity={1} style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('feed.createPost.deadline')}</Text>
              <TouchableOpacity onPress={() => setIsDeadlineModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {DEADLINE_OPTIONS.map((opt) => {
                const isSelected = deadlineDays === opt.value;
                return (
                  <TouchableOpacity
                    key={String(opt.value)}
                    style={[styles.modalOptionRow, isSelected && styles.modalOptionRowSelected]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDeadlineDays(opt.value);
                      setTimeout(() => setIsDeadlineModalVisible(false), 200);
                    }}
                  >
                    <View style={[styles.modalOptionIconWrapper, { backgroundColor: colors.surfaceVariant }]}>
                      <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                    </View>
                    <Text style={[styles.modalOptionText, isSelected && { color: colors.primary, fontWeight: '600' }]}>{t(opt.labelKey)}</Text>
                    {!!isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <AIResultPreview
        visible={!!aiPreviewData}
        content={aiPreviewData?.enhanced ? `Enhanced Version:\n\n${aiPreviewData.enhanced}\n\nKey changes:\n${aiPreviewData.changes || 'N/A'}` : ''}
        title={t('feed.createPost.aiEnhancementResult')}
        onAccept={handleAcceptEnhancedInfo}
        onRegenerate={handleEnhanceContent}
        onDiscard={() => setAiPreviewData(null)}
        isRegenerating={isAiLoading}
      />

      <AILoadingOverlay
        isVisible={!!(isAiLoading && !aiPreviewData)}
        message={autoT("auto.mobile.screens_feed_CreatePostScreen.k_310b987f")}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBlur: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    zIndex: 10,
    backgroundColor: isDark ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  postButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  postButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  postButtonTextDisabled: {
    color: colors.textTertiary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    backgroundColor: colors.background,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  authorSubtitleText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  postTypeBadgeTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    gap: 6,
  },
  postTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Title
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    backgroundColor: colors.background,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: 8,
    paddingVertical: 4,
    letterSpacing: -0.5,
  },
  titleCounter: {
    fontSize: 12,
    color: colors.textTertiary,
    marginLeft: 8,
    marginTop: 4,
    fontWeight: '500',
  },
  contentInput: {
    flex: 1,
    fontSize: 17,
    color: colors.text,
    paddingHorizontal: 24,
    paddingTop: 16,
    minHeight: 140,
    textAlignVertical: 'top',
    letterSpacing: 0.2,
    lineHeight: 26,
  },

  /* ─── Post Type Selector (Horizontal) ─── */
  postTypeContainer: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  postTypeScrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  postTypeItem: {
    alignItems: 'center',
    width: 72,
    gap: 8,
    opacity: 0.6,
  },
  postTypeItemActive: {
    opacity: 1,
  },
  postTypeIconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  postTypeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  postTypeActiveIndicator: {
    position: 'absolute',
    bottom: -16,
    width: 16,
    height: 3,
    borderRadius: 2,
  },

  /* ─── Advanced Settings Card (Settings Page Replica) ─── */
  settingsSection: {
    marginTop: 12,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionTitleIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  settingsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
    gap: 4,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.2,
  },
  settingSublabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  settingsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 68,
  },

  // Topic Tags & Advanced Settings
  settingsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  settingsToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  tagsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tagsSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  tagsCount: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  activeTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
  },
  activeTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tagInput: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
  },
  tagAddButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagAddButtonDisabled: {
    backgroundColor: colors.border,
  },
  suggestedTagsScroll: {
    gap: 6,
  },
  suggestedTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: isDark ? '#251A3D' : '#F5F3FF',
    borderRadius: 16,
  },
  suggestedTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7C3AED',
  },

  // Difficulty
  difficultySection: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surfaceVariant,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  diffSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  diffSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  difficultyGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  difficultyCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    gap: 6,
  },
  difficultyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Deadline
  deadlineSection: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surfaceVariant,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  deadlineSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  deadlineSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  deadlineScroll: {
    gap: 8,
  },
  deadlineChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
  },
  deadlineChipSelected: {
    backgroundColor: isDark ? '#3A1717' : '#FEF2F2',
  },
  deadlineChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  deadlineChipTextSelected: {
    color: '#EF4444',
  },

  mediaPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 20,
    gap: 12,
    backgroundColor: colors.background,
    paddingBottom: 40,
  },
  mediaItem: {
    position: 'relative',
    width: '48%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surfaceVariant,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  videoDurationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  advancedFormsContainer: {
    paddingHorizontal: 0,
    paddingBottom: 10,
    gap: 12,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.card,
  },
  mediaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  mediaIconButton: {
    padding: 4,
  },
  mediaIndicatorBadge: {
    backgroundColor: isDark ? '#1D2B45' : '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaIndicatorText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  mediaIndicatorEmpty: {
    width: 20,
  },
  // Poll styles
  pollSection: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pollLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  pollOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  pollInput: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  removePollButton: {
    padding: 4,
  },
  addPollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  addPollText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
  },
  // Visibility styles
  visibilitySection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceVariant,
  },
  visibilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  visibilityOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    gap: 8,
  },
  visibilityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  visibilityDesc: {
    fontSize: 10,
    color: colors.textTertiary,
    position: 'absolute',
    bottom: 4,
    left: 44,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '40%',
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
    paddingBottom: 32,
  },
  modalScroll: {
    padding: 16,
  },
  modalOptionRecord: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  modalOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },

  /* ─── Modal Interiors ─── */
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: colors.surfaceVariant,
    gap: 12,
  },
  modalOptionRowSelected: {
    backgroundColor: isDark ? '#1D2B45' : '#EEF2FF',
    borderColor: isDark ? colors.primary : '#C7D2FE',
    borderWidth: 1,
  },
  modalOptionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionDescText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Specific tag modal styles
  tagsCountLimitText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 10,
  },
  suggestedTagsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  suggestedTagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

});
