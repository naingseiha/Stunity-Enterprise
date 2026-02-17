/**
 * CreatePost Screen
 * 
 * Create new post with content and media
 * Matching v1 app clean design style
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
import { ResizeMode } from 'expo-av';

import { Avatar } from '@/components/common';
import { useAuthStore, useFeedStore } from '@/stores';
import { PostType } from '@/types';
import { QuizForm } from './create-post/forms/QuizForm';
import { QuestionForm } from './create-post/forms/QuestionForm';
import { PollForm } from './create-post/forms/PollForm';
import { AnnouncementForm } from './create-post/forms/AnnouncementForm';
import { VideoPlayer } from '@/components/common/VideoPlayer';

// Post type options
const POST_TYPES: { type: PostType; icon: string; label: string; color: string }[] = [
  { type: 'ARTICLE', icon: 'document-text', label: 'Article', color: '#F59E0B' },
  { type: 'QUESTION', icon: 'help-circle', label: 'Question', color: '#3B82F6' },
  { type: 'ANNOUNCEMENT', icon: 'megaphone', label: 'Announce', color: '#EF4444' },
  { type: 'POLL', icon: 'stats-chart', label: 'Poll', color: '#8B5CF6' },
  { type: 'QUIZ', icon: 'school', label: 'Quiz', color: '#EC4899' },
  { type: 'COURSE', icon: 'book', label: 'Course', color: '#10B981' },
  { type: 'PROJECT', icon: 'folder', label: 'Project', color: '#F97316' },
];

// Helper to check if URI is video
const isVideo = (uri: string) => {
  const ext = uri.split('.').pop()?.toLowerCase();
  return ext === 'mp4' || ext === 'mov' || ext === 'avi' || ext === 'mkv';
};

export default function CreatePostScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { createPost } = useFeedStore();

  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('ARTICLE');
  const [mediaUris, setMediaUris] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);

  // Poll state
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollData, setPollData] = useState<any>(null);

  // Quiz state
  const [quizData, setQuizData] = useState<any>(null);

  // Question state
  const [questionData, setQuestionData] = useState<any>(null);

  // Announcement state
  const [announcementData, setAnnouncementData] = useState<any>(null);

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

    setIsPosting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Prepare poll options if it's a poll
      const validPollOptions = postType === 'POLL'
        ? pollOptions.filter(opt => opt.trim().length > 0)
        : [];

      // Prepare quiz data if it's a quiz
      const quizPayload = postType === 'QUIZ' && quizData ? quizData : undefined;

      // Extract title from quiz data for QUIZ posts
      const postTitle = postType === 'QUIZ' && quizData?.title ? quizData.title : undefined;

      // Upload images and create post
      // The createPost function will handle uploading local file:// URIs to R2
      const success = await createPost(content, mediaUris, postType, validPollOptions, quizPayload, postTitle);

      if (success) {
        // Success animation sequence
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Small delay for haptic feedback to register
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
  }, [content, postType, mediaUris, pollOptions, quizData, navigation, createPost]);

  const userName = user ? `${user.firstName} ${user.lastName}` : 'User';
  const canPost = content.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <TouchableOpacity
          onPress={handlePost}
          disabled={!canPost || isPosting}
          style={[styles.postButton, (!canPost || isPosting) && styles.postButtonDisabled]}
          onPressIn={() => !(!canPost || isPosting) && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          {isPosting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.postButtonText, !canPost && styles.postButtonTextDisabled]}>
              Post
            </Text>
          )}
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
                  color={POST_TYPES.find(t => t.type === postType)?.color || '#F59E0B'}
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
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setPostType(type.type);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.typeOption,
                    postType === type.type && { backgroundColor: type.color + '15', borderColor: type.color },
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

          {/* Question Form (only for QUESTION type) */}
          {postType === 'QUESTION' && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
            >
              <QuestionForm onDataChange={setQuestionData} />
            </Animated.View>
          )}

          {/* Poll Form (only for POLL type) */}
          {postType === 'POLL' && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
            >
              <PollForm
                options={pollOptions}
                onOptionsChange={setPollOptions}
                onDataChange={setPollData}
              />
            </Animated.View>
          )}

          {/* Quiz Form (only for QUIZ type) */}
          {postType === 'QUIZ' && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
            >
              <QuizForm onDataChange={setQuizData} />
            </Animated.View>
          )}

          {/* Announcement Form (only for ANNOUNCEMENT type) */}
          {postType === 'ANNOUNCEMENT' && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
            >
              <AnnouncementForm onDataChange={setAnnouncementData} />
            </Animated.View>
          )}

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
              <View style={[styles.mediaButtonIcon, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="document" size={20} color="#F59E0B" />
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  postButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  postButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 8,
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingHorizontal: 16,
    paddingTop: 8,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  mediaPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
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
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
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
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
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
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
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
});
