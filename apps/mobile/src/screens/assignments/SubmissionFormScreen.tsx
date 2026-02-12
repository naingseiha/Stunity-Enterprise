/**
 * Submission Form Screen
 * 
 * Submit assignment work with text content and file attachments
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { Colors } from '@/config';
import { assignmentsApi } from '@/api';
import type { ClubsStackScreenProps } from '@/navigation/types';

export default function SubmissionFormScreen() {
  const navigation = useNavigation();
  const route = useRoute<ClubsStackScreenProps<'SubmissionForm'>['route']>();
  const { assignmentId, clubId } = route.params;

  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Array<{
    url: string;
    name: string;
    type: string;
    size: number;
    uri?: string; // Local URI before upload
  }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const handleSubmit = useCallback(async () => {
    if (!content.trim() && attachments.length === 0) {
      Alert.alert('Empty Submission', 'Please add some content or attach a file before submitting.');
      return;
    }

    Alert.alert(
      'Submit Assignment',
      'Are you sure you want to submit this assignment? You may be able to resubmit later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'default',
          onPress: async () => {
            try {
              setSubmitting(true);
              await assignmentsApi.submitAssignment(assignmentId, {
                content: content.trim() || undefined,
                attachments: attachments.length > 0 ? attachments : undefined,
              });
              
              Alert.alert(
                'Success',
                'Your assignment has been submitted successfully!',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      navigation.goBack();
                    },
                  },
                ]
              );
            } catch (err: any) {
              console.error('Failed to submit assignment:', err);
              Alert.alert('Error', err.message || 'Failed to submit assignment. Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }, [content, attachments, assignmentId, navigation]);

  const handleAddFile = useCallback(async () => {
    // Show action sheet on iOS, alert on Android
    const pickFile = async (type: 'image' | 'document') => {
      try {
        setUploading(true);

        if (type === 'image') {
          // Request permission
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant camera roll permission to upload images.');
            return;
          }

          // Pick image
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsMultipleSelection: true,
            quality: 0.8,
            allowsEditing: false,
          });

          if (!result.canceled && result.assets.length > 0) {
            const newAttachments = result.assets.map((asset, index) => ({
              uri: asset.uri,
              name: asset.fileName || `image-${Date.now()}-${index}.jpg`,
              type: asset.type || 'image/jpeg',
              size: asset.fileSize || 0,
              url: asset.uri, // Temporary, will be replaced after upload
            }));
            setAttachments(prev => [...prev, ...newAttachments]);
          }
        } else {
          // Pick document
          const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
            copyToCacheDirectory: true,
            multiple: true,
          });

          if (!result.canceled && result.assets.length > 0) {
            const newAttachments = result.assets.map(asset => ({
              uri: asset.uri,
              name: asset.name,
              type: asset.mimeType || 'application/octet-stream',
              size: asset.size || 0,
              url: asset.uri, // Temporary
            }));
            setAttachments(prev => [...prev, ...newAttachments]);
          }
        }
      } catch (err: any) {
        console.error('File picker error:', err);
        Alert.alert('Error', 'Failed to pick file. Please try again.');
      } finally {
        setUploading(false);
      }
    };

    // Show options
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Choose Image', 'Choose Document'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickFile('image');
          if (buttonIndex === 2) pickFile('document');
        }
      );
    } else {
      Alert.alert(
        'Add File',
        'Choose file type',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Image', onPress: () => pickFile('image') },
          { text: 'Document', onPress: () => pickFile('document') },
        ]
      );
    }
  }, []);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Get icon based on file type
  const getFileIcon = (type: string): string => {
    if (type.startsWith('image/')) return 'image';
    if (type.includes('pdf')) return 'document-text';
    if (type.includes('word') || type.includes('document')) return 'document';
    if (type.includes('text')) return 'document-outline';
    return 'attach';
  };

  // Get icon color based on file type
  const getFileIconColor = (type: string): string => {
    if (type.startsWith('image/')) return '#10B981';
    if (type.includes('pdf')) return '#EF4444';
    if (type.includes('word') || type.includes('document')) return '#3B82F6';
    if (type.includes('text')) return '#6B7280';
    return Colors.primary;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Submit Assignment</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={styles.submitHeaderButton}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.submitHeaderButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Instructions */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.instructionCard}>
            <Ionicons name="information-circle" size={20} color={Colors.primary} />
            <Text style={styles.instructionText}>
              Write your answer below or attach files. You can do both.
            </Text>
          </Animated.View>

          {/* Text Content */}
          <Animated.View entering={FadeInDown.delay(150)} style={styles.contentSection}>
            <Text style={styles.sectionLabel}>Your Answer</Text>
            <TextInput
              style={styles.contentInput}
              placeholder="Type your answer here..."
              placeholderTextColor={Colors.gray[400]}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              autoFocus
            />
            <Text style={styles.charCount}>{content.length} characters</Text>
          </Animated.View>

          {/* Attachments */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.attachmentsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Attachments</Text>
              <TouchableOpacity
                onPress={handleAddFile}
                style={styles.addFileButton}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color={Colors.primary} />
                    <Text style={styles.addFileButtonText}>Add File</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {attachments.length === 0 ? (
              <View style={styles.emptyAttachments}>
                <Ionicons name="cloud-upload-outline" size={48} color={Colors.gray[300]} />
                <Text style={styles.emptyAttachmentsText}>No files attached</Text>
                <Text style={styles.emptyAttachmentsHint}>Tap "Add File" to attach files</Text>
              </View>
            ) : (
              <View style={styles.attachmentsList}>
                {attachments.map((attachment, index) => {
                  const icon = getFileIcon(attachment.type);
                  const iconColor = getFileIconColor(attachment.type);
                  
                  return (
                    <View key={index} style={styles.attachmentItem}>
                      <View style={[styles.fileIconContainer, { backgroundColor: iconColor + '15' }]}>
                        <Ionicons name={icon as any} size={24} color={iconColor} />
                      </View>
                      <View style={styles.attachmentInfo}>
                        <Text style={styles.attachmentName} numberOfLines={1}>
                          {attachment.name}
                        </Text>
                        <Text style={styles.attachmentSize}>
                          {formatFileSize(attachment.size)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveAttachment(index)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="close-circle" size={24} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </Animated.View>

          {/* Guidelines */}
          <Animated.View entering={FadeInDown.delay(250)} style={styles.guidelinesCard}>
            <Text style={styles.guidelinesTitle}>Submission Guidelines</Text>
            <View style={styles.guidelineItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.guidelineText}>
                Make sure your answer is complete and well-formatted
              </Text>
            </View>
            <View style={styles.guidelineItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.guidelineText}>
                Supported files: Images (JPG, PNG), PDFs, Word documents
              </Text>
            </View>
            <View style={styles.guidelineItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.guidelineText}>
                You may be able to resubmit after instructor review
              </Text>
            </View>
          </Animated.View>

          {/* Bottom spacing for keyboard */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Bottom Submit Button */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="white" />
                <Text style={styles.submitButtonText}>Submit Assignment</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  submitHeaderButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  submitHeaderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  contentSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  contentInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#111827',
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  charCount: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'right',
  },
  attachmentsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addFileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  emptyAttachments: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
  },
  emptyAttachmentsText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptyAttachmentsHint: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  attachmentsList: {
    gap: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  attachmentSize: {
    fontSize: 13,
    color: '#6B7280',
  },
  removeButton: {
    padding: 4,
  },
  guidelinesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  guidelinesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  guidelineText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  bottomActions: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
