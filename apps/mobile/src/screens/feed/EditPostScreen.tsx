/**
 * Edit Post Screen - Phase 1: Basic Functionality Test
 * 
 * Testing features:
 * - Content editing
 * - Visibility control
 * - Save/Cancel
 * - Validation
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
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import { useFeedStore } from '@/stores';
import { Colors, Shadows } from '@/config';
import { Post } from '@/types';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 64) / 3; // 3 columns with padding

type EditPostScreenRouteProp = RouteProp<{ EditPost: { post: Post } }, 'EditPost'>;

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public', icon: 'earth' as const, desc: 'Anyone can see' },
  { value: 'SCHOOL', label: 'School', icon: 'school' as const, desc: 'School members only' },
  { value: 'CLASS', label: 'Class', icon: 'people' as const, desc: 'Class members only' },
  { value: 'PRIVATE', label: 'Private', icon: 'lock-closed' as const, desc: 'Only you' },
];

export default function EditPostScreen() {
  const navigation = useNavigation();
  const route = useRoute<EditPostScreenRouteProp>();
  const { post } = route.params;
  
  // DEBUG: Log the entire post object when screen opens
  useEffect(() => {
    console.log('🧪 [EditPost] ========== SCREEN OPENED ==========');
    console.log('🧪 [EditPost] Full post object:', JSON.stringify(post, null, 2));
    console.log('🧪 [EditPost] post.visibility value:', post.visibility);
    console.log('🧪 [EditPost] post.visibility type:', typeof post.visibility);
    console.log('🧪 [EditPost] Will initialize with:', post.visibility || 'PUBLIC');
  }, []);
  
  const { updatePost } = useFeedStore();
  
  const [content, setContent] = useState(post.content);
  const [visibility, setVisibility] = useState(post.visibility || 'PUBLIC');
  const [mediaUrls, setMediaUrls] = useState<string[]>(post.mediaUrls || []);
  const [newMediaUrls, setNewMediaUrls] = useState<string[]>([]); // Track new images
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Check if content or media changed
  useEffect(() => {
    const contentChanged = content.trim() !== post.content.trim();
    const visibilityChanged = visibility !== (post.visibility || 'PUBLIC');
    const mediaChanged = JSON.stringify(mediaUrls) !== JSON.stringify(post.mediaUrls || []);
    
    setHasChanges(contentChanged || visibilityChanged || mediaChanged);
  }, [content, visibility, mediaUrls, post]);
  
  // Image Picker
  const pickImage = async () => {
    if (mediaUrls.length >= 10) {
      Alert.alert('Limit Reached', 'You can only add up to 10 images per post.');
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
        console.log('🖼️ [EditPost] Added images:', newUrls.length);
        
        setMediaUrls(prev => [...prev, ...newUrls]);
        setNewMediaUrls(prev => [...prev, ...newUrls]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };
  
  // Delete Image
  const deleteImage = (index: number) => {
    Alert.alert(
      'Delete Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log('🗑️ [EditPost] Deleting image at index:', index);
            const deletedUrl = mediaUrls[index];
            
            setMediaUrls(prev => prev.filter((_, i) => i !== index));
            setNewMediaUrls(prev => prev.filter(url => url !== deletedUrl));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };
  
  // Move Image Up
  const moveImageUp = (index: number) => {
    if (index === 0) return;
    
    console.log('⬆️ [EditPost] Moving image up from index:', index);
    const newUrls = [...mediaUrls];
    [newUrls[index - 1], newUrls[index]] = [newUrls[index], newUrls[index - 1]];
    setMediaUrls(newUrls);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  // Move Image Down
  const moveImageDown = (index: number) => {
    if (index === mediaUrls.length - 1) return;
    
    console.log('⬇️ [EditPost] Moving image down from index:', index);
    const newUrls = [...mediaUrls];
    [newUrls[index], newUrls[index + 1]] = [newUrls[index + 1], newUrls[index]];
    setMediaUrls(newUrls);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  const handleSave = async () => {
    console.log('🧪 [EditPost] ========== SAVE STARTED ==========');
    console.log('🧪 [EditPost] Post ID:', post.id);
    console.log('🧪 [EditPost] Original content:', post.content.substring(0, 50) + '...');
    console.log('🧪 [EditPost] New content:', content.substring(0, 50) + '...');
    console.log('🧪 [EditPost] Original visibility:', post.visibility || 'PUBLIC');
    console.log('🧪 [EditPost] New visibility:', visibility);
    console.log('🧪 [EditPost] Original media count:', post.mediaUrls?.length || 0);
    console.log('🧪 [EditPost] New media count:', mediaUrls.length);
    console.log('🧪 [EditPost] New images added:', newMediaUrls.length);
    console.log('🧪 [EditPost] Has changes:', hasChanges);
    console.log('🧪 [EditPost] Data being sent:', JSON.stringify({
      content: content.trim(),
      visibility,
      mediaUrls,
      mediaDisplayMode: post.mediaDisplayMode || 'AUTO',
    }, null, 2));
    
    if (!content.trim()) {
      Alert.alert('Empty Post', 'Please add some content to your post.');
      return;
    }
    
    if (!hasChanges) {
      console.log('🧪 [EditPost] No changes detected, going back');
      navigation.goBack();
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);
    
    try {
      console.log('🧪 [EditPost] Calling updatePost API...');
      const success = await updatePost(post.id, {
        content: content.trim(),
        visibility,
        mediaUrls,
        mediaDisplayMode: post.mediaDisplayMode || 'AUTO',
      });
      
      console.log('🧪 [EditPost] Update result:', success);
      
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log('✅ [EditPost] Post updated successfully!');
        Alert.alert('Success', 'Post updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        console.error('❌ [EditPost] Update failed');
        Alert.alert('Error', 'Failed to update post. Please try again.');
      }
    } catch (error) {
      console.error('❌ [EditPost] Exception:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCancel = () => {
    console.log('🧪 [EditPost] Cancel pressed, hasChanges:', hasChanges);
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };
  
  console.log('🧪 [EditPost] Rendering with:', { 
    postId: post.id, 
    contentLength: content.length,
    visibility,
    hasChanges,
    isSubmitting 
  });
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Simple Header for Testing */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <Ionicons name="close" size={24} color="#262626" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Edit Post (Testing)</Text>
        
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSubmitting || !hasChanges}
          style={[
            styles.headerButton,
            styles.saveButton,
            (!hasChanges || isSubmitting) && styles.saveButtonDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#0066FF" />
          ) : (
            <Text
              style={[
                styles.saveButtonText,
                (!hasChanges || isSubmitting) && styles.saveButtonTextDisabled,
              ]}
            >
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Debug Info */}
        <View style={styles.debugBox}>
          <Text style={styles.debugTitle}>🧪 Debug Info:</Text>
          <Text style={styles.debugText}>Post ID: {post.id}</Text>
          <Text style={styles.debugText}>Post Type: {post.postType}</Text>
          <Text style={styles.debugText}>Original Visibility: {post.visibility || 'PUBLIC'}</Text>
          <Text style={styles.debugText}>Current Visibility: {visibility}</Text>
          <Text style={styles.debugText}>Has Changes: {hasChanges ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Is Submitting: {isSubmitting ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Character Count: {content.length}</Text>
          <Text style={styles.debugText}>Media Count: {mediaUrls.length}</Text>
          <Text style={styles.debugText}>New Images: {newMediaUrls.length}</Text>
        </View>
        
        {/* Content Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Content</Text>
          <View style={[styles.inputContainer, Shadows.sm]}>
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={(text) => {
                console.log('🧪 [EditPost] Content changed:', text.length, 'chars');
                setContent(text);
              }}
              placeholder="What's on your mind?"
              placeholderTextColor="#A3A3A3"
              multiline
              maxLength={5000}
              editable={!isSubmitting}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>
              {content.length}/5000
            </Text>
          </View>
        </View>
        
        {/* Media Management */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Images ({mediaUrls.length}/10)</Text>
            <TouchableOpacity
              onPress={pickImage}
              disabled={isSubmitting || mediaUrls.length >= 10}
              style={[
                styles.addButton,
                (isSubmitting || mediaUrls.length >= 10) && styles.addButtonDisabled,
              ]}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          
          {mediaUrls.length > 0 ? (
            <View style={styles.mediaGrid}>
              {mediaUrls.map((url, index) => {
                const isNew = newMediaUrls.includes(url);
                return (
                  <View key={`${url}-${index}`} style={styles.mediaItemContainer}>
                    <Image
                      source={{ uri: url }}
                      style={styles.mediaImage}
                      resizeMode="cover"
                    />
                    
                    {/* Order Number */}
                    <View style={styles.mediaOrderBadge}>
                      <Text style={styles.mediaOrderText}>{index + 1}</Text>
                    </View>
                    
                    {/* NEW Badge */}
                    {isNew && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                      </View>
                    )}
                    
                    {/* Delete Button */}
                    <TouchableOpacity
                      onPress={() => deleteImage(index)}
                      disabled={isSubmitting}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                    
                    {/* Reorder Buttons */}
                    {mediaUrls.length > 1 && (
                      <View style={styles.reorderButtons}>
                        {index > 0 && (
                          <TouchableOpacity
                            onPress={() => moveImageUp(index)}
                            disabled={isSubmitting}
                            style={styles.reorderButton}
                          >
                            <Ionicons name="chevron-back" size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                        )}
                        {index < mediaUrls.length - 1 && (
                          <TouchableOpacity
                            onPress={() => moveImageDown(index)}
                            disabled={isSubmitting}
                            style={styles.reorderButton}
                          >
                            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
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
              <Text style={styles.emptyMediaHint}>Tap "Add" to include images</Text>
            </View>
          )}
        </View>
        
        {/* Visibility Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Visibility</Text>
          <View style={styles.optionsContainer}>
            {VISIBILITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  console.log('🧪 [EditPost] Visibility changed to:', option.value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setVisibility(option.value);
                }}
                disabled={isSubmitting}
                style={[
                  styles.optionCard,
                  visibility === option.value && styles.optionCardSelected,
                  Shadows.sm,
                ]}
              >
                <View style={styles.optionIcon}>
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={visibility === option.value ? '#0066FF' : '#666'}
                  />
                </View>
                <View style={styles.optionText}>
                  <Text
                    style={[
                      styles.optionLabel,
                      visibility === option.value && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.optionDesc}>{option.desc}</Text>
                </View>
                {visibility === option.value && (
                  <Ionicons name="checkmark-circle" size={22} color="#0066FF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Poll Notice */}
        {post.postType === 'POLL' && post.pollOptions && (
          <View style={styles.section}>
            <View style={[styles.noticeCard, Shadows.sm]}>
              <View style={styles.noticeIcon}>
                <Ionicons name="information-circle" size={24} color="#0066FF" />
              </View>
              <View style={styles.noticeText}>
                <Text style={styles.noticeTitle}>Poll Options</Text>
                <Text style={styles.noticeDesc}>
                  {post.pollOptions.map((opt) => opt.text).join(', ')}
                </Text>
                <Text style={[styles.noticeDesc, { marginTop: 4 }]}>
                  Poll options cannot be edited after creation.
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    ...Shadows.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  saveButton: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 16,
    width: 'auto',
  },
  saveButtonDisabled: {
    backgroundColor: '#E8E8E8',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButtonTextDisabled: {
    color: '#A3A3A3',
  },
  
  // Content
  content: {
    flex: 1,
  },
  
  // Debug Box
  debugBox: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE066',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B8860B',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#8B7500',
    marginBottom: 4,
  },
  
  section: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 12,
  },
  
  // Content Input
  inputContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 12,
  },
  contentInput: {
    fontSize: 16,
    color: '#262626',
    minHeight: 120,
    maxHeight: 300,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 8,
  },
  
  // Visibility Options
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    padding: 14,
    gap: 12,
  },
  optionCardSelected: {
    backgroundColor: '#F0F7FF',
    borderColor: '#0066FF',
  },
  optionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
  },
  optionLabelSelected: {
    color: '#0066FF',
  },
  optionDesc: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  
  // Notice Card
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    padding: 14,
    gap: 12,
  },
  noticeIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeText: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 4,
  },
  noticeDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  
  // Media Display
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0066FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaItemContainer: {
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
  mediaOrderBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mediaOrderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#10B981',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
    backgroundColor: '#F9FAFB',
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
});
