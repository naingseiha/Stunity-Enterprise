import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { learnApi } from '@/api';
import type { CreateCoursePayload, CreateLessonPayload, LearnCourseLevel } from '@/api/learn';
import { LearnStackScreenProps } from '@/navigation/types';

type NavigationProp = LearnStackScreenProps<'CreateCourse'>['navigation'];

interface DraftLesson {
  id: string;
  title: string;
  description: string;
  duration: number;
  isFree: boolean;
  content: string;
  videoUrl: string;
}

const CATEGORIES = [
  'Programming',
  'Data Science',
  'Machine Learning',
  'Mobile Development',
  'Web Development',
  'Design',
  'Business',
  'Marketing',
  'Photography',
  'Music',
  'Languages',
  'Personal Development',
  'Health & Fitness',
  'Other',
];

const LEVELS: { value: LearnCourseLevel; label: string }[] = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'ALL_LEVELS', label: 'All Levels' },
];

const createEmptyLesson = (index: number): DraftLesson => ({
  id: `lesson-${Date.now()}-${index}`,
  title: '',
  description: '',
  duration: 10,
  isFree: index === 0,
  content: '',
  videoUrl: '',
});

export default function CreateCourseScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('');
  const [level, setLevel] = useState<LearnCourseLevel>('BEGINNER');
  const [thumbnail, setThumbnail] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [lessons, setLessons] = useState<DraftLesson[]>([createEmptyLesson(0)]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const normalizedLessons = useMemo(
    () => lessons
      .map((lesson, index) => ({
        ...lesson,
        duration: Number.isFinite(lesson.duration) && lesson.duration > 0 ? lesson.duration : 0,
        index,
      }))
      .filter(lesson => lesson.title.trim().length > 0),
    [lessons]
  );

  const isCourseValid = title.trim().length >= 5 && description.trim().length >= 20 && Boolean(category);
  const isLessonValid = normalizedLessons.length > 0 && normalizedLessons.every(lesson => lesson.duration > 0);
  const canSaveDraft = isCourseValid;
  const canPublish = isCourseValid && isLessonValid;

  const addTag = () => {
    const normalized = tagInput.trim();
    if (!normalized) return;
    if (tags.includes(normalized)) {
      setTagInput('');
      return;
    }
    setTags(prev => [...prev, normalized]);
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(item => item !== tag));
  };

  const addLesson = () => {
    setLessons(prev => [...prev, createEmptyLesson(prev.length)]);
  };

  const removeLesson = (lessonId: string) => {
    if (lessons.length <= 1) {
      Alert.alert('Lessons', 'A course needs at least one lesson.');
      return;
    }
    setLessons(prev => prev.filter(lesson => lesson.id !== lessonId));
  };

  const updateLesson = <K extends keyof DraftLesson>(lessonId: string, field: K, value: DraftLesson[K]) => {
    setLessons(prev => prev.map(lesson => lesson.id === lessonId ? { ...lesson, [field]: value } : lesson));
  };

  const buildCoursePayload = (): CreateCoursePayload => ({
    title: title.trim(),
    description: description.trim(),
    category,
    level,
    thumbnail: thumbnail.trim() || undefined,
    tags,
  });

  const buildLessonPayload = (lesson: DraftLesson, order: number): CreateLessonPayload => ({
    title: lesson.title.trim(),
    description: lesson.description.trim() || undefined,
    duration: lesson.duration,
    isFree: lesson.isFree,
    content: lesson.content.trim() || undefined,
    videoUrl: lesson.videoUrl.trim() || undefined,
    order,
  });

  const submitCourse = async (publishNow: boolean) => {
    const canProceed = publishNow ? canPublish : canSaveDraft;
    if (!canProceed) {
      Alert.alert(
        'Course validation',
        publishNow
          ? 'Please complete course details and add at least one valid lesson.'
          : 'Please complete course details before saving your draft.'
      );
      return;
    }

    if (publishNow) {
      setPublishing(true);
    } else {
      setSavingDraft(true);
    }

    try {
      const coursePayload = buildCoursePayload();
      const { id: courseId } = await learnApi.createCourse(coursePayload);

      for (let i = 0; i < normalizedLessons.length; i += 1) {
        const lesson = normalizedLessons[i];
        const lessonPayload = buildLessonPayload(lesson, i + 1);
        await learnApi.addLessonToCourse(courseId, lessonPayload);
      }

      if (publishNow) {
        await learnApi.publishCourse(courseId);
      }

      Alert.alert(
        publishNow ? 'Course published' : 'Draft saved',
        publishNow
          ? 'Your course is live and visible to learners.'
          : 'Your course draft is saved. You can publish it later.',
        [
          {
            text: 'Open Course',
            onPress: () => navigation.navigate('CourseDetail', { courseId }),
          },
          {
            text: 'Back to Learn',
            onPress: () => navigation.navigate('LearnHub'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Create course', error?.message || 'Unable to create course. Please try again.');
    } finally {
      setSavingDraft(false);
      setPublishing(false);
    }
  };

  const totalDuration = normalizedLessons.reduce((total, lesson) => total + lesson.duration, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Create Course</Text>
            <Text style={styles.headerSubtitle}>Build course, lessons, then save or publish</Text>
          </View>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Basic Info</Text>

            <Text style={styles.label}>Course title *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Complete Python Programming Masterclass"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              maxLength={100}
            />
            <Text style={styles.helperText}>{title.length}/100 characters</Text>

            <Text style={styles.label}>Description *</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what students will learn..."
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.textArea]}
              multiline
              textAlignVertical="top"
              maxLength={2000}
            />
            <Text style={styles.helperText}>{description.length}/2000 characters (minimum 20)</Text>

            <Text style={styles.label}>Thumbnail URL</Text>
            <TextInput
              value={thumbnail}
              onChangeText={setThumbnail}
              placeholder="https://example.com/course-image.jpg"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {CATEGORIES.map(item => {
                const active = category === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setCategory(item)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>Level</Text>
            <View style={styles.levelGrid}>
              {LEVELS.map(item => {
                const active = level === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[styles.levelOption, active && styles.levelOptionActive]}
                    onPress={() => setLevel(item.value)}
                  >
                    <Text style={[styles.levelOptionText, active && styles.levelOptionTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagInputRow}>
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="Add a tag"
                placeholderTextColor="#9CA3AF"
                style={[styles.input, styles.tagInput]}
                onSubmitEditing={addTag}
              />
              <TouchableOpacity style={styles.addTagButton} onPress={addTag} disabled={!tagInput.trim()}>
                <Text style={styles.addTagText}>Add</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tagsWrap}>
              {tags.map(tag => (
                <View key={tag} style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>{tag}</Text>
                  <TouchableOpacity onPress={() => removeTag(tag)}>
                    <Ionicons name="close" size={14} color="#B45309" />
                  </TouchableOpacity>
                </View>
              ))}
              {tags.length === 0 && <Text style={styles.helperText}>No tags added yet</Text>}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.lessonHeader}>
              <View>
                <Text style={styles.sectionTitle}>Lessons *</Text>
                <Text style={styles.lessonSummary}>
                  {normalizedLessons.length} lesson{normalizedLessons.length !== 1 ? 's' : ''} • {totalDuration} min total
                </Text>
              </View>
              <TouchableOpacity style={styles.addLessonButton} onPress={addLesson}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.addLessonText}>Lesson</Text>
              </TouchableOpacity>
            </View>

            {lessons.map((lesson, index) => (
              <View key={lesson.id} style={styles.lessonCard}>
                <View style={styles.lessonCardHeader}>
                  <Text style={styles.lessonCardTitle}>Lesson {index + 1}</Text>
                  <TouchableOpacity onPress={() => removeLesson(lesson.id)} style={styles.deleteLessonButton}>
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  value={lesson.title}
                  onChangeText={(value) => updateLesson(lesson.id, 'title', value)}
                  placeholder="Lesson title *"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />

                <TextInput
                  value={lesson.description}
                  onChangeText={(value) => updateLesson(lesson.id, 'description', value)}
                  placeholder="Lesson description"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, styles.smallTextArea]}
                  multiline
                  textAlignVertical="top"
                />

                <View style={styles.lessonRow}>
                  <View style={styles.durationWrap}>
                    <Text style={styles.labelInline}>Duration (min)</Text>
                    <TextInput
                      value={String(lesson.duration)}
                      onChangeText={(value) => {
                        const parsed = Number.parseInt(value, 10);
                        updateLesson(lesson.id, 'duration', Number.isFinite(parsed) ? parsed : 0);
                      }}
                      placeholder="10"
                      placeholderTextColor="#9CA3AF"
                      style={styles.durationInput}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.freeSwitchWrap}>
                    <Text style={styles.labelInline}>Free preview</Text>
                    <Switch
                      value={lesson.isFree}
                      onValueChange={(value) => updateLesson(lesson.id, 'isFree', value)}
                    />
                  </View>
                </View>

                <TextInput
                  value={lesson.videoUrl}
                  onChangeText={(value) => updateLesson(lesson.id, 'videoUrl', value)}
                  placeholder="Video URL (optional)"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  autoCapitalize="none"
                />

                <TextInput
                  value={lesson.content}
                  onChangeText={(value) => updateLesson(lesson.id, 'content', value)}
                  placeholder="Lesson content (optional)"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, styles.textArea]}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.secondaryButton, (savingDraft || publishing || !canSaveDraft) && styles.disabledButton]}
            onPress={() => submitCourse(false)}
            disabled={savingDraft || publishing || !canSaveDraft}
          >
            {savingDraft ? (
              <ActivityIndicator size="small" color="#111827" />
            ) : (
              <>
                <Ionicons name="save-outline" size={16} color="#111827" />
                <Text style={styles.secondaryButtonText}>Save Draft</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, (savingDraft || publishing || !canPublish) && styles.disabledButton]}
            onPress={() => submitCourse(true)}
            disabled={savingDraft || publishing || !canPublish}
          >
            {publishing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="rocket-outline" size={16} color="#fff" />
                <Text style={styles.primaryButtonText}>Publish</Text>
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
    backgroundColor: '#F8FAFC',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 14,
    gap: 12,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    paddingTop: 10,
  },
  smallTextArea: {
    height: 76,
    paddingTop: 10,
  },
  helperText: {
    marginTop: 4,
    fontSize: 11,
    color: '#6B7280',
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  chipText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#1D4ED8',
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  levelOption: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  levelOptionActive: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  levelOptionText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '700',
  },
  levelOptionTextActive: {
    color: '#1D4ED8',
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagInput: {
    flex: 1,
  },
  addTagButton: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#1A73E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
  },
  tagBadgeText: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '700',
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  lessonSummary: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  addLessonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#1A73E8',
    paddingHorizontal: 10,
  },
  addLessonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  lessonCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  lessonCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lessonCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  deleteLessonButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  durationWrap: {
    flex: 1,
  },
  durationInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
  },
  freeSwitchWrap: {
    width: 130,
    alignItems: 'flex-start',
  },
  labelInline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 4,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1A73E8',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
