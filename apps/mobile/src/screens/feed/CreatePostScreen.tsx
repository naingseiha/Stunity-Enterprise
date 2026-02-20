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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, Layout, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ResizeMode } from 'expo-av';

import { Avatar } from '@/components/common';
import { useAuthStore, useFeedStore } from '@/stores';
import { PostType } from '@/types';
import { QuizForm } from './create-post/forms/QuizForm';
import { QuestionForm } from './create-post/forms/QuestionForm';
import { PollForm } from './create-post/forms/PollForm';
import { AnnouncementForm } from './create-post/forms/AnnouncementForm';
import { CourseForm } from './create-post/forms/CourseForm';
import { ProjectForm } from './create-post/forms/ProjectForm';
import { VideoPlayer } from '@/components/common/VideoPlayer';

// Post type options
const POST_TYPES: { type: PostType; icon: string; label: string; color: string; gradient: [string, string] }[] = [
  { type: 'ARTICLE', icon: 'document-text', label: 'Article', color: '#0EA5E9', gradient: ['#0EA5E9', '#38BDF8'] },
  { type: 'QUESTION', icon: 'help-circle', label: 'Question', color: '#3B82F6', gradient: ['#3B82F6', '#60A5FA'] },
  { type: 'ANNOUNCEMENT', icon: 'megaphone', label: 'Announce', color: '#EF4444', gradient: ['#EF4444', '#F87171'] },
  { type: 'POLL', icon: 'stats-chart', label: 'Poll', color: '#8B5CF6', gradient: ['#8B5CF6', '#A78BFA'] },
  { type: 'QUIZ', icon: 'school', label: 'Quiz', color: '#EC4899', gradient: ['#EC4899', '#F472B6'] },
  { type: 'COURSE', icon: 'book', label: 'Course', color: '#10B981', gradient: ['#10B981', '#34D399'] },
  { type: 'PROJECT', icon: 'folder', label: 'Project', color: '#F97316', gradient: ['#F97316', '#FB923C'] },
];

// Types that should show a title input
const TITLE_POST_TYPES: PostType[] = ['COURSE', 'PROJECT', 'ANNOUNCEMENT', 'QUIZ'];

// Types that should show difficulty selector
const EDUCATIONAL_POST_TYPES: PostType[] = ['ARTICLE', 'COURSE', 'QUIZ', 'PROJECT'];

// Types that support a deadline
const DEADLINE_POST_TYPES: PostType[] = ['COURSE', 'PROJECT', 'QUIZ'];

// Difficulty levels
const DIFFICULTY_LEVELS = [
  { value: 'BEGINNER', label: 'Beginner', icon: 'leaf', color: '#10B981', bg: '#ECFDF5' },
  { value: 'INTERMEDIATE', label: 'Intermediate', icon: 'trending-up', color: '#F59E0B', bg: '#FFFBEB' },
  { value: 'ADVANCED', label: 'Advanced', icon: 'flame', color: '#EF4444', bg: '#FEF2F2' },
];

// Deadline options
const DEADLINE_OPTIONS = [
  { label: 'None', value: null },
  { label: '1 day', value: 1 },
  { label: '3 days', value: 3 },
  { label: '1 week', value: 7 },
  { label: '2 weeks', value: 14 },
  { label: '1 month', value: 30 },
];

// Suggested topic tags
const SUGGESTED_TAGS = [
  'Math', 'Science', 'Physics', 'Chemistry', 'Biology',
  'Programming', 'English', 'History', 'Art', 'Music',
  'Geography', 'Literature', 'Economics', 'Psychology',
];

// Helper to check if URI is video
const isVideo = (uri: string) => {
  const ext = uri.split('.').pop()?.toLowerCase();
  return ext === 'mp4' || ext === 'mov' || ext === 'avi' || ext === 'mkv';
};

// Visibility options
const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public', icon: 'earth', desc: 'Anyone', color: '#10B981' },
  { value: 'SCHOOL', label: 'School', icon: 'school', desc: 'School members', color: '#3B82F6' },
  { value: 'CLASS', label: 'Class', icon: 'people', desc: 'Class members', color: '#8B5CF6' },
  { value: 'PRIVATE', label: 'Private', icon: 'lock-closed', desc: 'Only you', color: '#6B7280' },
];

export default function CreatePostScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { createPost } = useFeedStore();

  const [content, setContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postType, setPostType] = useState<PostType>('ARTICLE');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [mediaUris, setMediaUris] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);

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
        'Discard Post?',
        'You have unsaved changes. Are you sure you want to discard this post?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [content, mediaUris, navigation]);

  const handlePickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant access to your photos to add images.');
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
      setMediaUris(prev => [...prev, ...newUris].slice(0, 4));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [mediaUris]);

  const handlePickVideo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant access to your photos to add videos.');
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
      setMediaUris(prev => [...prev, ...newUris].slice(0, 4));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [mediaUris]);

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant access to your camera to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setMediaUris(prev => [...prev, result.assets[0].uri].slice(0, 4));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMediaUris(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handlePost = useCallback(async () => {
    if (!content.trim()) {
      Alert.alert('Empty Post', 'Please write something before posting.');
      return;
    }

    // Validate poll if it's a poll post
    if (postType === 'POLL') {
      const validOptions = pollOptions.filter(opt => opt.trim().length > 0);
      if (validOptions.length < 2) {
        Alert.alert('Invalid Poll', 'Please add at least 2 poll options.');
        return;
      }
    }

    // Validate quiz if it's a quiz post
    if (postType === 'QUIZ') {
      if (!quizData || !quizData.questions || quizData.questions.length === 0) {
        Alert.alert('Invalid Quiz', 'Please add at least one question to your quiz.');
        return;
      }
    }

    // Validate course if it's a course post
    if (postType === 'COURSE') {
      if (!courseData || !courseData.syllabusSections || courseData.syllabusSections.length === 0) {
        Alert.alert('Invalid Course', 'Please add at least one section to your syllabus.');
        return;
      }
    }

    // Validate project if it's a project post
    if (postType === 'PROJECT') {
      if (!projectData || !projectData.milestones || projectData.milestones.length === 0) {
        Alert.alert('Invalid Project', 'Please add at least one milestone to your project.');
        return;
      }
    }

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
        deadlineISO
      );

      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await new Promise(resolve => setTimeout(resolve, 100));
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to create post. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error: any) {
      console.error('Post creation error:', error);
      Alert.alert('Error', error.message || 'Failed to create post. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsPosting(false);
    }
  }, [content, postType, postTitle, mediaUris, pollOptions, quizData, courseData, projectData, navigation, createPost, visibility, topicTags, difficulty, deadlineDays]);

  const userName = user ? `${user.firstName} ${user.lastName}` : 'User';
  const canPost = content.trim().length > 0;
  const currentTypeConfig = POST_TYPES.find(t => t.type === postType) || POST_TYPES[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Create Post</Text>
          <View style={[styles.headerBadge, { backgroundColor: currentTypeConfig.color + '20' }]}>
            <Ionicons name={currentTypeConfig.icon as any} size={12} color={currentTypeConfig.color} />
            <Text style={[styles.headerBadgeText, { color: currentTypeConfig.color }]}>{currentTypeConfig.label}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handlePost}
          disabled={!canPost || isPosting}
          onPressIn={() => !(!canPost || isPosting) && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <LinearGradient
            colors={canPost && !isPosting ? ['#6366F1', '#8B5CF6'] : ['#E5E7EB', '#E5E7EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.postButton}
          >
            {isPosting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.postButtonText, !canPost && styles.postButtonTextDisabled]}>
                Post
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

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
              <View style={styles.postTypeBadge}>
                <Ionicons
                  name={POST_TYPES.find(t => t.type === postType)?.icon as any || 'document-text'}
                  size={12}
                  color={POST_TYPES.find(t => t.type === postType)?.color || '#0EA5E9'}
                />
                <Text style={[
                  styles.postTypeBadgeText,
                  { color: POST_TYPES.find(t => t.type === postType)?.color }
                ]}>
                  {POST_TYPES.find(t => t.type === postType)?.label || 'Article'}
                </Text>
                <Ionicons name="chevron-down" size={12} color="#9CA3AF" />
              </View>
            </View>
          </View>

          {/* Post Type Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.typeSelector}
            contentContainerStyle={styles.typeSelectorContent}
          >
            {POST_TYPES.map((type) => (
              <Animated.View
                key={type.type}
                entering={FadeIn.duration(200)}
                layout={Layout.springify()}
              >
                <TouchableOpacity
                  onPress={() => {
                    setPostType(type.type);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.typeOption,
                    postType === type.type && { backgroundColor: type.color + '15' },
                  ]}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={16}
                    color={postType === type.type ? type.color : '#6B7280'}
                  />
                  <Text style={[
                    styles.typeOptionText,
                    postType === type.type && { color: type.color, fontWeight: '600' },
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>

          {/* Title Input — for structured post types */}
          {TITLE_POST_TYPES.includes(postType) && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.titleSection}>
              <TextInput
                style={styles.titleInput}
                placeholder={`${currentTypeConfig.label} title...`}
                placeholderTextColor="#9CA3AF"
                value={postTitle}
                onChangeText={setPostTitle}
                maxLength={120}
              />
              <Text style={styles.titleCounter}>{postTitle.length}/120</Text>
            </Animated.View>
          )}

          {/* Content Input */}
          <TextInput
            style={styles.contentInput}
            placeholder="What's on your mind?"
            placeholderTextColor="#9CA3AF"
            multiline
            value={content}
            onChangeText={setContent}
            autoFocus
          />

          {/* Topic Tags */}
          <Animated.View entering={FadeIn.duration(200)} style={styles.tagsSection}>
            <View style={styles.tagsSectionHeader}>
              <View style={styles.tagsSectionTitle}>
                <Ionicons name="pricetags" size={16} color="#6366F1" />
                <Text style={styles.tagsSectionLabel}>Topic Tags</Text>
              </View>
              <Text style={styles.tagsCount}>{topicTags.length}/5</Text>
            </View>

            {/* Active Tags */}
            {topicTags.length > 0 && (
              <View style={styles.activeTagsRow}>
                {topicTags.map((tag) => (
                  <Animated.View
                    key={tag}
                    entering={ZoomIn.duration(200)}
                    exiting={ZoomOut.duration(200)}
                    layout={Layout.springify()}
                  >
                    <TouchableOpacity
                      style={styles.activeTag}
                      onPress={() => removeTag(tag)}
                    >
                      <Text style={styles.activeTagText}>#{tag}</Text>
                      <Ionicons name="close" size={14} color="#6366F1" />
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            )}

            {/* Tag Input */}
            {topicTags.length < 5 && (
              <View style={styles.tagInputRow}>
                <TextInput
                  style={styles.tagInput}
                  placeholder="Add a tag..."
                  placeholderTextColor="#9CA3AF"
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={() => addTag(tagInput)}
                  returnKeyType="done"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => addTag(tagInput)}
                  style={[styles.tagAddButton, !tagInput.trim() && styles.tagAddButtonDisabled]}
                  disabled={!tagInput.trim()}
                >
                  <Ionicons name="add" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}

            {/* Suggested Tags */}
            {topicTags.length < 5 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestedTagsScroll}
              >
                {SUGGESTED_TAGS.filter(t => !topicTags.includes(t.toLowerCase())).slice(0, 8).map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.suggestedTag}
                    onPress={() => addTag(tag)}
                  >
                    <Text style={styles.suggestedTagText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Animated.View>

          {/* Difficulty Level — for educational post types */}
          {EDUCATIONAL_POST_TYPES.includes(postType) && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.difficultySection}>
              <View style={styles.diffSectionHeader}>
                <Ionicons name="speedometer" size={16} color="#F59E0B" />
                <Text style={styles.diffSectionLabel}>Difficulty Level</Text>
              </View>
              <View style={styles.difficultyGrid}>
                {DIFFICULTY_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level.value}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDifficulty(difficulty === level.value ? null : level.value);
                    }}
                    style={[
                      styles.difficultyCard,
                      difficulty === level.value && {
                        backgroundColor: level.bg,
                      },
                    ]}
                  >
                    <Ionicons
                      name={level.icon as any}
                      size={18}
                      color={difficulty === level.value ? level.color : '#9CA3AF'}
                    />
                    <Text style={[
                      styles.difficultyLabel,
                      difficulty === level.value && { color: level.color, fontWeight: '700' },
                    ]}>
                      {level.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Deadline Picker — for time-bound post types */}
          {DEADLINE_POST_TYPES.includes(postType) && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.deadlineSection}>
              <View style={styles.deadlineSectionHeader}>
                <Ionicons name="calendar" size={16} color="#EF4444" />
                <Text style={styles.deadlineSectionLabel}>Deadline</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.deadlineScroll}
              >
                {DEADLINE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={String(opt.value)}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDeadlineDays(opt.value);
                    }}
                    style={[
                      styles.deadlineChip,
                      deadlineDays === opt.value && styles.deadlineChipSelected,
                    ]}
                  >
                    <Text style={[
                      styles.deadlineChipText,
                      deadlineDays === opt.value && styles.deadlineChipTextSelected,
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}

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
            <AnnouncementForm onDataChange={setAnnouncementData} />
          )}

          {/* Course Form (only for COURSE type) */}
          {postType === 'COURSE' && (
            <CourseForm onDataChange={setCourseData} />
          )}

          {/* Project Form (only for PROJECT type) */}
          {postType === 'PROJECT' && (
            <ProjectForm onDataChange={setProjectData} />
          )}

          {/* Visibility Selector */}
          <View style={styles.visibilitySection}>
            <Text style={styles.sectionLabel}>Visibility</Text>
            <View style={styles.visibilityGrid}>
              {VISIBILITY_OPTIONS.map((option) => {
                const isSelected = visibility === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      setVisibility(option.value);
                      Haptics.selectionAsync();
                    }}
                    disabled={isPosting}
                    style={[
                      styles.visibilityOption,
                      isSelected && { backgroundColor: option.color + '10' },
                    ]}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={isSelected ? option.color : '#6B7280'}
                    />
                    <Text style={[
                      styles.visibilityLabel,
                      isSelected && { color: option.color },
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.visibilityDesc}>{option.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Media Preview */}
          {mediaUris.length > 0 && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
              style={styles.mediaPreview}
            >
              {mediaUris.map((uri, index) => (
                <Animated.View
                  key={uri}
                  style={styles.mediaItem}
                  entering={ZoomIn.duration(300).delay(index * 50)}
                  exiting={ZoomOut.duration(200)}
                  layout={Layout.springify()}
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
                </Animated.View>
              ))}
            </Animated.View>
          )}
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <View style={styles.mediaActions}>
            <TouchableOpacity
              onPress={handlePickImage}
              style={styles.mediaButton}
              disabled={mediaUris.length >= 4}
            >
              <View style={[styles.mediaButtonIcon, { backgroundColor: '#10B98120' }]}>
                <Ionicons
                  name="image"
                  size={20}
                  color={mediaUris.length >= 4 ? '#9CA3AF' : '#10B981'}
                />
              </View>
              <Text style={[styles.mediaButtonText, mediaUris.length >= 4 && { color: '#9CA3AF' }]}>
                Photo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleTakePhoto}
              style={styles.mediaButton}
              disabled={mediaUris.length >= 4}
            >
              <View style={[styles.mediaButtonIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons
                  name="camera"
                  size={20}
                  color={mediaUris.length >= 4 ? '#9CA3AF' : '#3B82F6'}
                />
              </View>
              <Text style={[styles.mediaButtonText, mediaUris.length >= 4 && { color: '#9CA3AF' }]}>
                Camera
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePickVideo}
              style={styles.mediaButton}
              disabled={mediaUris.length >= 4}
            >
              <View style={[styles.mediaButtonIcon, { backgroundColor: '#8B5CF620' }]}>
                <Ionicons
                  name="videocam"
                  size={20}
                  color={mediaUris.length >= 4 ? '#9CA3AF' : '#8B5CF6'}
                />
              </View>
              <Text style={[styles.mediaButtonText, mediaUris.length >= 4 && { color: '#9CA3AF' }]}>
                Video
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mediaButton}>
              <View style={[styles.mediaButtonIcon, { backgroundColor: '#0EA5E920' }]}>
                <Ionicons name="document" size={20} color="#0EA5E9" />
              </View>
              <Text style={styles.mediaButtonText}>File</Text>
            </TouchableOpacity>
          </View>

          {mediaUris.length > 0 && (
            <Text style={styles.mediaCount}>
              {mediaUris.length}/4 items
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
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
    fontWeight: '600',
  },
  postButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  postButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  postButtonTextDisabled: {
    color: '#9CA3AF',
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
    backgroundColor: '#FFFFFF',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  postTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  postTypeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  typeSelector: {
    maxHeight: 50,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  typeSelectorContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },

  // Title
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  titleCounter: {
    fontSize: 11,
    color: '#D1D5DB',
    textAlign: 'right',
    marginTop: 4,
  },

  contentInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingHorizontal: 16,
    paddingTop: 12,
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: '#FFFFFF',
  },

  // Topic Tags
  tagsSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  tagsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tagsSectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagsSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  tagsCount: {
    fontSize: 12,
    color: '#9CA3AF',
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
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1F2937',
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
    backgroundColor: '#E5E7EB',
  },
  suggestedTagsScroll: {
    gap: 6,
  },
  suggestedTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
  },
  suggestedTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7C3AED',
  },

  // Difficulty
  difficultySection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
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
    color: '#1F2937',
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
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  difficultyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Deadline
  deadlineSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
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
    color: '#1F2937',
  },
  deadlineScroll: {
    gap: 8,
  },
  deadlineChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  deadlineChipSelected: {
    backgroundColor: '#FEF2F2',
  },
  deadlineChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  deadlineChipTextSelected: {
    color: '#EF4444',
  },

  mediaPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  mediaItem: {
    position: 'relative',
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  mediaActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  mediaButton: {
    alignItems: 'center',
    gap: 4,
  },
  mediaButtonIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  mediaCount: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  // Poll styles
  pollSection: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  pollLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
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
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
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
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  visibilityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    flex: 1,
  },
  visibilityDesc: {
    fontSize: 10,
    color: '#9CA3AF',
    position: 'absolute',
    bottom: 4,
    left: 44,
  },
});
