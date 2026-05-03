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
  Platform, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Haptics } from '@/services/haptics';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';

import { useFeedStore } from '@/stores';
import { useThemeContext } from '@/contexts';
import { MediaMetadata, Post } from '@/types';
import { feedApi } from '@/api/client';
import { QuizForm, QuizData } from './create-post/forms/QuizForm';
import { PollForm, PollData } from './create-post/forms/PollForm';
import { metadataFromPickerAsset, metadataForUris, primaryMediaAspectRatio } from '@/utils/mediaMetadata';


// Upload helper
const uploadImages = async (localUris: string[]): Promise<string[]> => {
  if (localUris.length === 0) return [];

  try {
    console.log('📤 [EditPost] Uploading', localUris.length, 'images...');

    const { Config } = await import('@/config/env');
    const { tokenService } = await import('@/services/token');
    // Use legacy expo-file-system api for native Android multipart support
    const FileSystem = await import('expo-file-system');
    const token = await tokenService.getAccessToken();

    const localFiles = localUris;
    const mappedRequests = localFiles.map(uri => {
      const filename = uri.split('/').pop() || `file-${Date.now()}`;
      const ext = /\.(\w+)$/.exec(filename)?.[1]?.toLowerCase() || 'jpg';
      let type = 'image/jpeg';
      if (['png', 'webp', 'gif'].includes(ext)) type = `image/${ext}`;
      else if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) type = ext === 'mov' ? 'video/quicktime' : `video/${ext}`;
      return { originalName: filename, mimeType: type, uri };
    });

    // 1. Ask backend for direct R2 Presigned upload tickets
    console.log(`🎟️ [EditPost] Requesting ${mappedRequests.length} Presigned URLs...`);
    const ticketRes = await fetch(`${Config.feedUrl}/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ requests: mappedRequests })
    });

    if (!ticketRes.ok) {
      throw new Error(`Failed to get presigned URLs: ${ticketRes.status}`);
    }
    const ticketData = await ticketRes.json();
    if (!ticketData.success || !ticketData.data) throw new Error('Invalid presigned ticket response');

    // 2. Upload directly to Cloudflare R2 bypassing Google Cloud Run limits
    const tickets = ticketData.data; // [{ presignedUrl, key, publicUrl }]
    const uploadedUrls: string[] = [];

    for (let i = 0; i < localUris.length; i++) {
      const uri = localUris[i];
      const reqMeta = mappedRequests.find(r => r.uri === uri);
      const ticket = tickets[mappedRequests.indexOf(reqMeta!)];

      console.log(`📤 [EditPost] Direct PUT to Cloudflare R2: ${reqMeta?.originalName}`);

      try {
        const response = await FileSystem.uploadAsync(
          ticket.presignedUrl,
          uri,
          {
            httpMethod: 'PUT',
            uploadType: 0, // FileSystemUploadType.BINARY_CONTENT
            headers: {
              'Content-Type': reqMeta!.mimeType
            }
          }
        );

        if (response.status !== 200) {
          throw new Error(`Direct R2 PUT failed (${response.status}): ${response.body}`);
        }

        uploadedUrls.push(ticket.publicUrl);
      } catch (err: any) {
        console.error('❌ [EditPost] Direct R2 Upload failed:', err);
        throw new Error(`Direct upload failed: ${err.message}`);
      }
    }

    console.log('✅ [EditPost] Upload successful:', uploadedUrls.length, 'images');
    return uploadedUrls;
  } catch (error) {
    console.error('❌ [EditPost] Upload failed:', error);
    throw error;
  }
};

// Visibility options
const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', labelKey: 'feed.createPost.visibility.public', icon: 'earth', descKey: 'feed.createPost.visibilityDesc.public', color: '#10B981' },
  { value: 'SCHOOL', labelKey: 'feed.createPost.visibility.school', icon: 'school', descKey: 'feed.createPost.visibilityDesc.school', color: '#3B82F6' },
  { value: 'CLASS', labelKey: 'feed.createPost.visibility.class', icon: 'people', descKey: 'feed.createPost.visibilityDesc.class', color: '#8B5CF6' },
  { value: 'PRIVATE', labelKey: 'feed.createPost.visibility.private', icon: 'lock-closed', descKey: 'feed.createPost.visibilityDesc.private', color: '#6B7280' },
];

type EditPostScreenRouteProp = RouteProp<{ EditPost: { post: Post } }, 'EditPost'>;

export default function EditPostScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<EditPostScreenRouteProp>();
  const { post } = route.params;
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const { updatePost } = useFeedStore();

  const [content, setContent] = useState(post.content);
  const [visibility, setVisibility] = useState(post.visibility || 'PUBLIC');
  const [mediaUrls, setMediaUrls] = useState<string[]>(post.mediaUrls || []);
  const [mediaMetadata, setMediaMetadata] = useState<MediaMetadata[]>(() => metadataForUris(post.mediaUrls || [], post.mediaMetadata || []));
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
  const isLocalUri = (uri: string) => uri && !uri.startsWith('http') && !uri.startsWith('https') && !uri.startsWith('data:');
  const getLocalUris = () => mediaUrls.filter(isLocalUri);
  const hasChanges =
    content.trim() !== post.content.trim() ||
    visibility !== (post.visibility || 'PUBLIC') ||
    JSON.stringify(mediaUrls) !== JSON.stringify(post.mediaUrls || []) ||
    JSON.stringify(mediaMetadata) !== JSON.stringify(metadataForUris(post.mediaUrls || [], post.mediaMetadata || [])) ||
    (post.postType === 'QUIZ' && JSON.stringify(quizData) !== JSON.stringify(post.quizData));

  // Handle close
  const handleClose = () => {
    if (hasChanges) {
      Alert.alert(
        t('feed.editPost.discardChanges'),
        t('feed.editPost.unsavedChanges'),
        [
          { text: t('feed.createPost.keepEditing'), style: 'cancel' },
          { text: t('feed.createPost.discard'), style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  // Pick images
  const handlePickImage = async () => {
    if (mediaUrls.length >= 10) {
      Alert.alert(t('feed.editPost.limitReached'), t('feed.editPost.maxImages'));
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
        const newMetadata = result.assets.map(metadataFromPickerAsset);
        setMediaUrls(prev => [...prev, ...newUrls]);
        setMediaMetadata(prev => [...prev, ...newMetadata]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('feed.editPost.failedPickImage'));
    }
  };

  // Take photo
  const handleTakePhoto = async () => {
    if (mediaUrls.length >= 10) {
      Alert.alert(t('feed.editPost.limitReached'), t('feed.editPost.maxImages'));
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        setMediaUrls(prev => [...prev, result.assets[0].uri]);
        setMediaMetadata(prev => [...prev, metadataFromPickerAsset(result.assets[0])]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('feed.editPost.failedOpenCamera'));
    }
  };

  // Remove image
  const handleRemoveImage = (index: number) => {
    Haptics.selectionAsync();
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
    setMediaMetadata(prev => prev.filter((_, i) => i !== index));
  };

  // Save
  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert(t('feed.createPost.emptyPost'), t('feed.editPost.addContent'));
      return;
    }

    // Validate quiz if it's a quiz post
    if (post.postType === 'QUIZ') {
      if (!quizData || !quizData.questions || quizData.questions.length === 0) {
        Alert.alert(t('feed.createPost.invalidQuiz'), t('feed.editPost.keepOneQuestion'));
        return;
      }
    }

    // Validate poll
    if (post.postType === 'POLL' && pollData) {
      const validOptions = pollData.options.filter(opt => opt.trim().length > 0);
      if (validOptions.length < 2) {
        Alert.alert(t('feed.createPost.invalidPoll'), t('feed.createPost.invalidPollMessage'));
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
      let finalMediaMetadata = metadataForUris(finalMediaUrls, mediaMetadata);
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
          finalMediaMetadata = metadataForUris(finalMediaUrls, finalMediaMetadata);
        } catch (uploadError) {
          setIsSubmitting(false);
          Alert.alert(t('feed.editPost.uploadFailed'), t('feed.editPost.uploadFailedMessage'));
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
        mediaMetadata: finalMediaMetadata,
        mediaAspectRatio: primaryMediaAspectRatio(finalMediaMetadata),
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
        Alert.alert(t('common.error'), t('feed.editPost.failedUpdate'));
      }
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert(t('common.error'), t('feed.editPost.genericError'));
    }
  };

  const canSave = hasChanges && content.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header - matching CreatePost */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('feed.editPost.title')}</Text>
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
              {t('common.save')}
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
            placeholder={t('feed.createPost.contentPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            multiline
            value={content}
            onChangeText={setContent}
            autoFocus
            maxLength={5000}
            editable={!isSubmitting}
          />

          {/* Quiz Form */}
          {post.postType === 'QUIZ' && (
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
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
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
              <PollForm
                options={pollData.options}
                onOptionsChange={(opts) => setPollData(prev => prev ? { ...prev, options: opts } : null)}
                onDataChange={setPollData}
              />
            </View>
          )}

          {/* Visibility Selector */}
          <View style={styles.visibilitySection}>
            <Text style={styles.sectionLabel}>{t('feed.createPost.visibilityLabel')}</Text>
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
                      color={isSelected ? option.color : colors.textSecondary}
                    />
                    <Text style={[
                      styles.visibilityLabel,
                      isSelected && { color: option.color },
                    ]}>
                      {t(option.labelKey)}
                    </Text>
                    <Text style={styles.visibilityDesc}>{t(option.descKey)}</Text>
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
                  color={mediaUrls.length >= 10 ? colors.textTertiary : '#10B981'}
                />
              </View>
              <Text style={[styles.mediaButtonText, mediaUrls.length >= 10 && { color: colors.textTertiary }]}>
                {t('feed.editPost.photo')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleTakePhoto}
              style={styles.mediaButton}
              disabled={mediaUrls.length >= 10 || isSubmitting}
            >
              <View style={[styles.mediaButtonIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons
                  name="camera"
                  size={20}
                  color={mediaUrls.length >= 10 ? colors.textTertiary : '#3B82F6'}
                />
              </View>
              <Text style={[styles.mediaButtonText, mediaUrls.length >= 10 && { color: colors.textTertiary }]}>
                {t('feed.editPost.camera')}
              </Text>
            </TouchableOpacity>
          </View>

          {mediaUrls.length > 0 && (
            <Text style={styles.mediaCount}>
              {t('feed.editPost.imageCount', { count: mediaUrls.length })}
              {getLocalUris().length > 0 && t('feed.editPost.toUploadSuffix', { count: getLocalUris().length })}
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
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
    backgroundColor: colors.surfaceVariant,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  saveButtonTextDisabled: {
    color: colors.textTertiary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentInput: {
    fontSize: 16,
    color: colors.text,
    paddingHorizontal: 16,
    paddingTop: 16,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  visibilitySection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
    borderTopColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
  },
  mediaActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
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
    color: colors.textSecondary,
  },
  mediaCount: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 8,
  },
});
