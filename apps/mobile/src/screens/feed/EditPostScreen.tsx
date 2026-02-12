/**
 * Edit Post Screen - Modern Redesign
 * 
 * Features:
 * - Gradient blue header
 * - Card-based layout
 * - Beautiful visibility selector
 * - Modern media management
 * - Character count warnings
 * - Smooth animations
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
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import { useFeedStore } from '@/stores';
import { Colors, Shadows } from '@/config';
import { Post } from '@/types';
import { feedApi } from '@/api/client';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 64) / 3;

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

// Visibility options with modern design
const VISIBILITY_OPTIONS = [
  { 
    value: 'PUBLIC', 
    label: 'Public', 
    icon: 'earth', 
    desc: 'Anyone can see',
    color: '#10B981',
    gradient: ['#10B981', '#059669']
  },
  { 
    value: 'SCHOOL', 
    label: 'School', 
    icon: 'school', 
    desc: 'School members',
    color: '#3B82F6',
    gradient: ['#3B82F6', '#2563EB']
  },
  { 
    value: 'CLASS', 
    label: 'Class', 
    icon: 'people', 
    desc: 'Class members',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#7C3AED']
  },
  { 
    value: 'PRIVATE', 
    label: 'Private', 
    icon: 'lock-closed', 
    desc: 'Only you',
    color: '#6B7280',
    gradient: ['#6B7280', '#4B5563']
  },
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
  const [newMediaUrls, setNewMediaUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Helpers
  const isLocalUri = (uri: string) => uri.startsWith('file://');
  const getLocalUris = () => mediaUrls.filter(isLocalUri);
  
  // Character count with warnings
  const charCount = content.length;
  const charWarningColor = charCount >= 5000 ? '#EF4444' : charCount >= 4500 ? '#F59E0B' : '#9CA3AF';
  
  // Check for changes
  useEffect(() => {
    const contentChanged = content.trim() !== post.content.trim();
    const visibilityChanged = visibility !== (post.visibility || 'PUBLIC');
    const mediaChanged = JSON.stringify(mediaUrls) !== JSON.stringify(post.mediaUrls || []);
    
    setHasChanges(contentChanged || visibilityChanged || mediaChanged);
  }, [content, visibility, mediaUrls, post]);
  
  // Image picker
  const pickImage = async () => {
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
        setNewMediaUrls(prev => [...prev, ...newUrls]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };
  
  // Delete image
  const deleteImage = (index: number) => {
    Alert.alert(
      'Delete Image',
      'Remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const deletedUrl = mediaUrls[index];
            setMediaUrls(prev => prev.filter((_, i) => i !== index));
            setNewMediaUrls(prev => prev.filter(url => url !== deletedUrl));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };
  
  // Reorder images
  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= mediaUrls.length) return;
    
    const newUrls = [...mediaUrls];
    [newUrls[index], newUrls[newIndex]] = [newUrls[newIndex], newUrls[index]];
    setMediaUrls(newUrls);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  // Save
  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Empty Post', 'Please add some content.');
      return;
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
        setIsUploading(true);
        
        try {
          const uploadedUrls = await uploadImages(localUris);
          
          finalMediaUrls = mediaUrls.map(url => {
            if (isLocalUri(url)) {
              const localIndex = localUris.indexOf(url);
              return uploadedUrls[localIndex] || url;
            }
            return url;
          });
          
          setIsUploading(false);
        } catch (uploadError) {
          setIsUploading(false);
          setIsSubmitting(false);
          Alert.alert('Upload Failed', 'Failed to upload images. Please try again.');
          return;
        }
      }
      
      // Update post
      const success = await updatePost(post.id, {
        content: content.trim(),
        visibility,
        mediaUrls: finalMediaUrls,
        mediaDisplayMode: post.mediaDisplayMode || 'AUTO',
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
  
  // Cancel
  const handleCancel = () => {
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
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#0066FF', '#0052CC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Edit Post</Text>
          {hasChanges && <View style={styles.unsavedDot} />}
        </View>
        
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSubmitting || isUploading || !hasChanges}
          style={[
            styles.saveButton,
            (!hasChanges || isSubmitting || isUploading) && styles.saveButtonDisabled,
          ]}
        >
          {isSubmitting || isUploading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="checkmark" size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </LinearGradient>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Content Card */}
        <View style={[styles.card, Shadows.md]}>
          <View style={styles.cardHeader}>
            <Ionicons name="create-outline" size={20} color="#0066FF" />
            <Text style={styles.cardTitle}>Content</Text>
          </View>
          <TextInput
            style={styles.textInput}
            value={content}
            onChangeText={setContent}
            placeholder="What's on your mind?"
            placeholderTextColor="#A3A3A3"
            multiline
            maxLength={5000}
            editable={!isSubmitting}
            textAlignVertical="top"
          />
          <View style={styles.charCountRow}>
            <Text style={[styles.charCount, { color: charWarningColor }]}>
              {charCount}/5000
            </Text>
            {charCount >= 4500 && (
              <Text style={[styles.charWarning, { color: charWarningColor }]}>
                {charCount >= 5000 ? 'Maximum reached' : 'Almost at limit'}
              </Text>
            )}
          </View>
        </View>
        
        {/* Media Card */}
        <View style={[styles.card, Shadows.md]}>
          <View style={styles.cardHeader}>
            <Ionicons name="images-outline" size={20} color="#0066FF" />
            <Text style={styles.cardTitle}>Images</Text>
            <View style={styles.mediaCount}>
              <Text style={styles.mediaCountText}>{mediaUrls.length}/10</Text>
            </View>
            <TouchableOpacity
              onPress={pickImage}
              disabled={isSubmitting || mediaUrls.length >= 10}
              style={[styles.addImageButton, mediaUrls.length >= 10 && styles.addImageButtonDisabled]}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          {mediaUrls.length > 0 ? (
            <View style={styles.mediaGrid}>
              {mediaUrls.map((url, index) => {
                const isNew = newMediaUrls.includes(url);
                const isLocal = isLocalUri(url);
                return (
                  <View key={`${url}-${index}`} style={styles.mediaItem}>
                    <Image
                      source={{ uri: url }}
                      style={styles.mediaImage}
                      contentFit="cover"
                    />
                    
                    {/* Order badge */}
                    <View style={styles.orderBadge}>
                      <Text style={styles.orderText}>{index + 1}</Text>
                    </View>
                    
                    {/* NEW badge */}
                    {isNew && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                      </View>
                    )}
                    
                    {/* Local badge */}
                    {isLocal && (
                      <View style={styles.localBadge}>
                        <Ionicons name="cloud-upload-outline" size={10} color="#FFFFFF" />
                      </View>
                    )}
                    
                    {/* Delete button */}
                    <TouchableOpacity
                      onPress={() => deleteImage(index)}
                      disabled={isSubmitting}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                    
                    {/* Reorder buttons */}
                    {mediaUrls.length > 1 && (
                      <View style={styles.reorderButtons}>
                        {index > 0 && (
                          <TouchableOpacity
                            onPress={() => moveImage(index, 'up')}
                            disabled={isSubmitting}
                            style={styles.reorderButton}
                          >
                            <Ionicons name="chevron-back" size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                        )}
                        {index < mediaUrls.length - 1 && (
                          <TouchableOpacity
                            onPress={() => moveImage(index, 'down')}
                            disabled={isSubmitting}
                            style={styles.reorderButton}
                          >
                            <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyMedia}>
              <Ionicons name="images-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyMediaText}>No images</Text>
              <Text style={styles.emptyMediaHint}>Tap + to add images</Text>
            </View>
          )}
        </View>
        
        {/* Visibility Card */}
        <View style={[styles.card, Shadows.md]}>
          <View style={styles.cardHeader}>
            <Ionicons name="eye-outline" size={20} color="#0066FF" />
            <Text style={styles.cardTitle}>Visibility</Text>
          </View>
          <View style={styles.visibilityGrid}>
            {VISIBILITY_OPTIONS.map((option) => {
              const isSelected = visibility === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    setVisibility(option.value);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  disabled={isSubmitting}
                  style={[
                    styles.visibilityCard,
                    isSelected && styles.visibilityCardSelected,
                  ]}
                >
                  {isSelected && (
                    <LinearGradient
                      colors={option.gradient}
                      style={styles.visibilityGradient}
                    />
                  )}
                  <View style={[
                    styles.visibilityIconContainer,
                    { backgroundColor: option.color + '15' }
                  ]}>
                    <Ionicons
                      name={option.icon as any}
                      size={24}
                      color={isSelected ? '#FFFFFF' : option.color}
                    />
                  </View>
                  <Text style={[
                    styles.visibilityLabel,
                    isSelected && styles.visibilityLabelSelected
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={[
                    styles.visibilityDesc,
                    isSelected && styles.visibilityDescSelected
                  ]}>
                    {option.desc}
                  </Text>
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        
        {/* Upload Status */}
        {(isUploading || getLocalUris().length > 0) && (
          <View style={[styles.card, styles.uploadCard, Shadows.md]}>
            <View style={styles.uploadRow}>
              <Ionicons
                name={isUploading ? "cloud-upload" : "information-circle"}
                size={20}
                color={isUploading ? "#0066FF" : "#F59E0B"}
              />
              <Text style={styles.uploadText}>
                {isUploading
                  ? `Uploading ${getLocalUris().length} image${getLocalUris().length > 1 ? 's' : ''}...`
                  : `${getLocalUris().length} image${getLocalUris().length > 1 ? 's' : ''} will be uploaded`
                }
              </Text>
            </View>
            {isUploading && (
              <ActivityIndicator size="small" color="#0066FF" style={{ marginLeft: 28 }} />
            )}
          </View>
        )}
        
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  unsavedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FCD34D',
  },
  saveButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  
  // Content
  content: {
    flex: 1,
  },
  
  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  
  // Text Input
  textInput: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  charCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  charWarning: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Media
  mediaCount: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mediaCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  addImageButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0066FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  orderBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  orderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  localBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderButtons: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  reorderButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMedia: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyMediaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptyMediaHint: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  
  // Visibility
  visibilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  visibilityCard: {
    width: (width - 72) / 2,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
  },
  visibilityCardSelected: {
    borderColor: 'transparent',
  },
  visibilityGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  visibilityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  visibilityLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  visibilityLabelSelected: {
    color: '#FFFFFF',
  },
  visibilityDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
  visibilityDescSelected: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  
  // Upload Card
  uploadCard: {
    backgroundColor: '#F0F7FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
});
