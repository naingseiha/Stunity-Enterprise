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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useFeedStore } from '@/stores';
import { Colors, Shadows } from '@/config';
import { Post } from '@/types';

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
  
  const { updatePost } = useFeedStore();
  
  const [content, setContent] = useState(post.content);
  const [visibility, setVisibility] = useState(post.visibility || 'PUBLIC');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Check if content changed
  useEffect(() => {
    setHasChanges(
      content.trim() !== post.content.trim() ||
      visibility !== (post.visibility || 'PUBLIC')
    );
  }, [content, visibility, post]);
  
  const handleSave = async () => {
    console.log('🧪 [EditPost] Save button pressed');
    console.log('🧪 [EditPost] Post ID:', post.id);
    console.log('🧪 [EditPost] Content:', content.substring(0, 50) + '...');
    console.log('🧪 [EditPost] Visibility:', visibility);
    console.log('🧪 [EditPost] Has changes:', hasChanges);
    
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
      console.log('🧪 [EditPost] Calling updatePost...');
      const success = await updatePost(post.id, {
        content: content.trim(),
        visibility,
        mediaUrls: post.mediaUrls || [],
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
          <Text style={styles.debugText}>Has Changes: {hasChanges ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Is Submitting: {isSubmitting ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Character Count: {content.length}</Text>
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
});
