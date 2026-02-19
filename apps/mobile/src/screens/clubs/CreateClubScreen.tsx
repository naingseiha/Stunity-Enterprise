/**
 * Create Club Screen
 * 
 * Beautiful form to create a new study club
 */

import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

import { Colors } from '@/config';
import { clubsApi } from '@/api';

const CLUB_TYPES = [
  {
    id: 'CASUAL_STUDY_GROUP',
    name: 'Study Group',
    icon: 'people',
    color: '#2563EB',
    description: 'Casual learning with peers'
  },
  {
    id: 'STRUCTURED_CLASS',
    name: 'Class',
    icon: 'school',
    color: '#059669',
    description: 'Formal structured course'
  },
  {
    id: 'PROJECT_GROUP',
    name: 'Project',
    icon: 'rocket',
    color: '#DC2626',
    description: 'Collaborative project team'
  },
  {
    id: 'EXAM_PREP',
    name: 'Exam Prep',
    icon: 'book',
    color: '#7C3AED',
    description: 'Test preparation group'
  },
];

const CLUB_MODES = [
  { id: 'PUBLIC', name: 'Public', icon: 'globe-outline', description: 'Anyone can join' },
  { id: 'INVITE_ONLY', name: 'Invite Only', icon: 'lock-closed', description: 'Join by invitation' },
  { id: 'APPROVAL_REQUIRED', name: 'Approval Required', icon: 'checkmark-circle', description: 'Join after approval' },
];

export default function CreateClubScreen() {
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<string>('CASUAL_STUDY_GROUP');
  const [selectedMode, setSelectedMode] = useState<string>('PUBLIC');
  const [tags, setTags] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter a club name.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Description Required', 'Please enter a club description.');
      return;
    }

    try {
      setCreating(true);

      const tagArray = tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      await clubsApi.createClub({
        name: name.trim(),
        description: description.trim(),
        type: selectedType as any,
        mode: selectedMode as any,
        tags: tagArray.length > 0 ? tagArray : undefined,
      });

      Alert.alert(
        'Success!',
        'Your club has been created successfully!',
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
      console.error('Failed to create club:', err);
      Alert.alert('Error', err.message || 'Failed to create club. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const typeConfig = CLUB_TYPES.find(t => t.id === selectedType) || CLUB_TYPES[0];

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
          <Text style={styles.headerTitle}>Create Club</Text>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={creating}
            style={styles.createHeaderButton}
          >
            {creating ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.createHeaderButtonText}>Create</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Club Name */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
            <Text style={styles.sectionLabel}>Club Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Advanced Mathematics Study Group"
              placeholderTextColor={Colors.gray[400]}
              value={name}
              onChangeText={setName}
              autoFocus
              maxLength={100}
            />
            <Text style={styles.charCount}>{name.length}/100</Text>
          </Animated.View>

          {/* Description */}
          <Animated.View entering={FadeInDown.delay(150)} style={styles.section}>
            <Text style={styles.sectionLabel}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell others about your club, what you'll learn, and who should join..."
              placeholderTextColor={Colors.gray[400]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </Animated.View>

          {/* Club Type */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
            <Text style={styles.sectionLabel}>Club Type *</Text>
            <View style={styles.optionsGrid}>
              {CLUB_TYPES.map((type, index) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeOption,
                    selectedType === type.id && {
                      borderColor: type.color,
                      borderWidth: 2,
                      backgroundColor: type.color + '08'
                    }
                  ]}
                  onPress={() => setSelectedType(type.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.typeIconContainer, { backgroundColor: type.color + '15' }]}>
                    <Ionicons name={type.icon as any} size={24} color={type.color} />
                  </View>
                  <Text style={styles.typeName}>{type.name}</Text>
                  <Text style={styles.typeDescription}>{type.description}</Text>
                  {selectedType === type.id && (
                    <View style={[styles.selectedBadge, { backgroundColor: type.color }]}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Privacy Mode */}
          <Animated.View entering={FadeInDown.delay(250)} style={styles.section}>
            <Text style={styles.sectionLabel}>Privacy *</Text>
            <View style={styles.modeOptions}>
              {CLUB_MODES.map((mode) => (
                <TouchableOpacity
                  key={mode.id}
                  style={[
                    styles.modeOption,
                    selectedMode === mode.id && styles.modeOptionSelected
                  ]}
                  onPress={() => setSelectedMode(mode.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={mode.icon as any}
                    size={20}
                    color={selectedMode === mode.id ? Colors.primary : '#6B7280'}
                  />
                  <View style={styles.modeInfo}>
                    <Text style={[
                      styles.modeName,
                      selectedMode === mode.id && styles.modeNameSelected
                    ]}>
                      {mode.name}
                    </Text>
                    <Text style={styles.modeDescription}>{mode.description}</Text>
                  </View>
                  {selectedMode === mode.id && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Tags */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
            <Text style={styles.sectionLabel}>Tags (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Math, Calculus, Problem Solving"
              placeholderTextColor={Colors.gray[400]}
              value={tags}
              onChangeText={setTags}
            />
            <Text style={styles.hint}>Separate tags with commas. Max 5 tags.</Text>
          </Animated.View>

          {/* Preview Card */}
          <Animated.View entering={FadeInDown.delay(350)} style={styles.previewSection}>
            <Text style={styles.previewLabel}>Preview</Text>
            <View style={styles.previewCard}>
              <LinearGradient
                colors={[typeConfig.color, typeConfig.color + 'CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.previewCover}
              >
                <Ionicons name={typeConfig.icon as any} size={40} color="rgba(255,255,255,0.95)" />
              </LinearGradient>
              <View style={styles.previewContent}>
                <Text style={styles.previewName} numberOfLines={1}>
                  {name || 'Your Club Name'}
                </Text>
                <Text style={styles.previewDescription} numberOfLines={2}>
                  {description || 'Your club description will appear here...'}
                </Text>
                {tags && (
                  <View style={styles.previewTags}>
                    {tags.split(',').slice(0, 3).map((tag, i) => (
                      <View key={i} style={[styles.previewTag, { backgroundColor: typeConfig.color + '15' }]}>
                        <Text style={[styles.previewTagText, { color: typeConfig.color }]}>
                          #{tag.trim()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </Animated.View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Bottom Create Button */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.createButton, creating && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={creating}
          >
            <LinearGradient
              colors={['#7DD3FC', '#0EA5E9', '#0284C7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createButtonGradient}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="white" />
                  <Text style={styles.createButtonText}>Create Club</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  createHeaderButton: {
    width: 60,
    alignItems: 'flex-end',
  },
  createHeaderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    height: 120,
    paddingTop: 16,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 6,
  },
  hint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeOptions: {
    gap: 12,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modeOptionSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.primary + '05',
  },
  modeInfo: {
    flex: 1,
  },
  modeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  modeNameSelected: {
    color: Colors.primary,
  },
  modeDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  previewSection: {
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewCover: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContent: {
    padding: 16,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  previewDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  previewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  previewTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  previewTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bottomActions: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  createButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
