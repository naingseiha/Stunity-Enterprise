/**
 * Edit Post Screen
 * 
 * Edit existing post - matching CreatePost clean design
 */

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import { useFeedStore } from '@/stores';
import { Post } from '@/types';
import { feedApi } from '@/api/client';
import { QuizForm, QuizData } from './create-post/forms/QuizForm';
import { PollForm, PollData } from './create-post/forms/PollForm';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

// Upload helper
const uploadImages = async (localUris: string[]): Promise<string[]> => {
  if (localUris.length === 0) return [];

  try {
    console.log('📤 [EditPost] Uploading', localUris.length, 'images...');

    const formData = new FormData();

    for (const uri of localUris) {
      const filename = uri.split('/').pop() || 'image.jpg';

      formData.append('files', {
        uri,
        type: 'image/jpeg',
        name: filename,
      } as any);
    }

    const response = await feedApi.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });

    if (response.data.success && response.data.data) {
      const uploadedUrls = response.data.data.map((file: any) => file.url);
      console.log('✅ [EditPost] Upload successful:', uploadedUrls.length, 'images');
      return uploadedUrls;
    }

    throw new Error('Upload response invalid');
  } catch (error) {
    console.error('❌ [EditPost] Upload failed:', error);
    throw error;
  }
};

// Visibility options
const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public', icon: 'earth', desc: 'Anyone', color: '#10B981' },
  { value: 'SCHOOL', label: 'School', icon: 'school', desc: 'School members', color: '#3B82F6' },
  { value: 'CLASS', label: 'Class', icon: 'people', desc: 'Class members', color: '#8B5CF6' },
  { value: 'PRIVATE', label: 'Private', icon: 'lock-closed', desc: 'Only you', color: '#6B7280' },
];

type EditPostScreenRouteProp = RouteProp<{ EditPost: { post: Post } }, 'EditPost'>;

export default function EditPostScreen() {
  const navigation = useNavigation();
  const route = useRoute<EditPostScreenRouteProp>();
  const { post } = route.params;

  const { updatePost } = useFeedStore();

  const [content, setContent] = useState(post.content);
  const [visibility, setVisibility] = useState(post.visibility || 'PUBLIC');
  const [mediaUrls, setMediaUrls] = useState<string[]>(post.mediaUrls || []);
  const [quizData, setQuizData] = useState<QuizData | undefined>(post.quizData as QuizData | undefined);

  // Initialize poll data
  const [pollData, setPollData] = useState<PollData | null>(() => {
    if (post.postType === 'POLL') {
      let duration = null;
      if (post.learningMeta?.deadline) {
        const diff = new Date(post.learningMeta.deadline).getTime() - new Date().getTime();
        // If deadline is in future, calculate remaining hours. 
        // Note: For editing, we might want to show original duration or remaining. 
        // Let's show remaining rounded to nearest standard option or just raw hours.
        if (diff > 0) {
          duration = Math.ceil(diff / (1000 * 60 * 60));
        }
      }

      return {
        options: post.pollOptions?.map(o => o.text) || ['', ''],
        duration,
        resultsVisibility: 'AFTER_VOTING', // Default, ideally fetch from backend if available in Post type
        allowMultipleSelections: false,
        anonymousVoting: false,
      };
    }
    return null;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helpers
  const isLocalUri = (uri: string) => uri.startsWith('file://');
  const getLocalUris = () => mediaUrls.filter(isLocalUri);
  const hasChanges =
    content.trim() !== post.content.trim() ||
    visibility !== (post.visibility || 'PUBLIC') ||
    JSON.stringify(mediaUrls) !== JSON.stringify(post.mediaUrls || []) ||
    (post.postType === 'QUIZ' && JSON.stringify(quizData) !== JSON.stringify(post.quizData));

  // Handle close
  const handleClose = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  // Pick images
  const handlePickImage = async () => {
    if (mediaUrls.length >= 10) {
      Alert.alert('Limit Reached', 'Maximum 10 images per post.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10 - mediaUrls.length,
      });

      if (!result.canceled && result.assets) {
        const newUrls = result.assets.map(asset => asset.uri);
        setMediaUrls(prev => [...prev, ...newUrls]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Remove image
  const handleRemoveImage = (index: number) => {
    Haptics.selectionAsync();
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Save
  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Empty Post', 'Please add some content.');
      return;
    }

    // Validate quiz if it's a quiz post
    if (post.postType === 'QUIZ') {
      if (!quizData || !quizData.questions || quizData.questions.length === 0) {
        Alert.alert('Invalid Quiz', 'Please keep at least one question in your quiz.');
        return;
      }
    }

    // Validate poll
    if (post.postType === 'POLL' && pollData) {
      const validOptions = pollData.options.filter(opt => opt.trim().length > 0);
      if (validOptions.length < 2) {
        Alert.alert('Invalid Poll', 'Please add at least 2 poll options.');
        return;
      }
    }

    if (!hasChanges) {
      navigation.goBack();
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    try {
      // Upload local URIs
      let finalMediaUrls = [...mediaUrls];
      const localUris = getLocalUris();

      if (localUris.length > 0) {
        try {
          const uploadedUrls = await uploadImages(localUris);

          finalMediaUrls = mediaUrls.map(url => {
            if (isLocalUri(url)) {
              const localIndex = localUris.indexOf(url);
              return uploadedUrls[localIndex] || url;
            }
            return url;
          });
        } catch (uploadError) {
          setIsSubmitting(false);
          Alert.alert('Upload Failed', 'Failed to upload images. Please try again.');
          return;
        }
      }

      // Calculate poll deadline if duration provided
      let deadline = undefined;
      if (post.postType === 'POLL' && pollData?.duration) {
        const now = new Date();
        now.setHours(now.getHours() + pollData.duration);
        deadline = now.toISOString();
      }

      // Update post
      const success = await updatePost(post.id, {
        content: content.trim(),
        visibility,
        mediaUrls: finalMediaUrls,
        mediaDisplayMode: post.mediaDisplayMode || 'AUTO',
        quizData: post.postType === 'QUIZ' ? quizData : undefined,
        pollOptions: post.postType === 'POLL' && pollData ? pollData.options.filter(o => o.trim()) : undefined,
        pollSettings: post.postType === 'POLL' ? pollData : undefined,
        deadline,
      });

      setIsSubmitting(false);

      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to update post. Please try again.');
      }
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Error', 'An error occurred. Please try again.');
    }
  };

  const canSave = hasChanges && content.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header - matching CreatePost */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Post</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave || isSubmitting}
          style={[
            styles.saveButton,
            (!canSave || isSubmitting) && styles.saveButtonDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.saveButtonText, !canSave && styles.saveButtonTextDisabled]}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Content Input */}
          <TextInput
            style={styles.contentInput}
            placeholder="What's on your mind?"
            placeholderTextColor="#9CA3AF"
            multiline
            value={content}
            onChangeText={setContent}
            autoFocus
            maxLength={5000}
            editable={!isSubmitting}
          />

          {/* Quiz Form */}
          {post.postType === 'QUIZ' && (
            <View style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
              <QuizForm
                initialData={post.quizData as QuizData | undefined}
                onDataChange={(data) => {
                  setQuizData(data);
                }}
              />
            </View>
          )}

          {/* Poll Form */}
          {post.postType === 'POLL' && pollData && (
            <View style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
              <PollForm
                options={pollData.options}
                onOptionsChange={(opts) => setPollData(prev => prev ? { ...prev, options: opts } : null)}
                onDataChange={setPollData}
              />
            </View>
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
                      setVisibility(option.value as any);
                      Haptics.selectionAsync();
                    }}
                    disabled={isSubmitting}
                    style={[
                      styles.visibilityOption,
                      isSelected && { backgroundColor: option.color + '15', borderColor: option.color },
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
          {mediaUrls.length > 0 && (
            <View style={styles.mediaPreview}>
              {mediaUrls.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.mediaItem}>
                  <Image source={{ uri }} style={styles.mediaImage} contentFit="cover" />
                  <TouchableOpacity
                    onPress={() => handleRemoveImage(index)}
                    style={styles.removeMediaButton}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                  {isLocalUri(uri) && (
                    <View style={styles.uploadBadge}>
                      <Ionicons name="cloud-upload" size={12} color="#fff" />
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions - matching CreatePost */}
        <View style={styles.bottomActions}>
          <View style={styles.mediaActions}>
            <TouchableOpacity
              onPress={handlePickImage}
              style={styles.mediaButton}
              disabled={mediaUrls.length >= 10 || isSubmitting}
            >
              <View style={[styles.mediaButtonIcon, { backgroundColor: '#10B98120' }]}>
                <Ionicons
                  name="image"
                  size={20}
                  color={mediaUrls.length >= 10 ? '#9CA3AF' : '#10B981'}
                />
              </View>
              <Text style={[styles.mediaButtonText, mediaUrls.length >= 10 && { color: '#9CA3AF' }]}>
                Photo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mediaButton}>
              <View style={[styles.mediaButtonIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="camera" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.mediaButtonText}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mediaButton}>
              <View style={[styles.mediaButtonIcon, { backgroundColor: '#8B5CF620' }]}>
                <Ionicons name="videocam" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.mediaButtonText}>Video</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mediaButton}>
              <View style={[styles.mediaButtonIcon, { backgroundColor: '#0EA5E920' }]}>
                <Ionicons name="document" size={20} color="#0EA5E9" />
              </View>
              <Text style={styles.mediaButtonText}>File</Text>
            </TouchableOpacity>
          </View>

          {mediaUrls.length > 0 && (
            <Text style={styles.mediaCount}>
              {mediaUrls.length}/10 images
              {getLocalUris().length > 0 && ` • ${getLocalUris().length} to upload`}
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
    backgroundColor: '#F0F4F8',
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
  saveButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 14,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  saveButtonTextDisabled: {
    color: '#9CA3AF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentInput: {
    fontSize: 16,
    color: '#1F2937',
    paddingHorizontal: 16,
    paddingTop: 16,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  visibilitySection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
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
  },
  uploadBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#0EA5E9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
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
});
