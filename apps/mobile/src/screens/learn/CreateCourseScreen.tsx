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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
  const insets = useSafeAreaInsets();

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
      const lessonsPayload = normalizedLessons.map((lesson, index) => buildLessonPayload(lesson, index + 1));

      const { id: courseId } = await learnApi.bulkCreateCourse({
        ...coursePayload,
        lessons: lessonsPayload,
        publish: publishNow,
      });

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
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.headerBackBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>

        <Text style={s.headerTitle}>Create Course</Text>

        <View style={s.headerActions}>
          <TouchableOpacity
            style={[s.draftBtn, (!canSaveDraft || savingDraft || publishing) && s.btnDisabled]}
            onPress={() => submitCourse(false)}
            disabled={savingDraft || publishing || !canSaveDraft}
          >
            {savingDraft ? (
              <ActivityIndicator size="small" color="#475569" />
            ) : (
              <Text style={s.draftBtnText}>Draft</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.publishBtn, (!canPublish || savingDraft || publishing) && s.btnDisabled]}
            onPress={() => submitCourse(true)}
            disabled={savingDraft || publishing || !canPublish}
          >
            {publishing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <LinearGradient
                colors={['#0EA5E9', '#0284C7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.publishBtnGrad}
              >
                <Text style={s.publishBtnText}>Publish</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Form ───────────────────────────────────────────────── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Basic Info ──────────────────────────────────── */}
          <Text style={s.sectionLabel}>Basic Info</Text>

          <Text style={s.fieldLabel}>Course Title *</Text>
          <View style={s.inputWrap}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="E.g. Complete Python Masterclass"
              placeholderTextColor="#9CA3AF"
              style={s.input}
              maxLength={100}
            />
          </View>
          <Text style={s.helperText}>{title.length}/100 characters</Text>

          <Text style={s.fieldLabel}>Description *</Text>
          <View style={[s.inputWrap, s.textAreaWrap]}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the journey..."
              placeholderTextColor="#9CA3AF"
              style={[s.input, s.textArea]}
              multiline
              textAlignVertical="top"
              maxLength={2000}
            />
          </View>
          <Text style={s.helperText}>{description.length}/2000 characters (min 20)</Text>

          <Text style={s.fieldLabel}>Thumbnail URL</Text>
          <View style={s.inputWrap}>
            <Ionicons name="image-outline" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
            <TextInput
              value={thumbnail}
              onChangeText={setThumbnail}
              placeholder="https://example.com/cover.jpg"
              placeholderTextColor="#9CA3AF"
              style={s.inputFlex}
              autoCapitalize="none"
            />
          </View>

          {/* ── Category ────────────────────────────────────── */}
          <Text style={s.sectionLabel}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
            {CATEGORIES.map(item => {
              const active = category === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => setCategory(item)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Level ───────────────────────────────────────── */}
          <Text style={s.sectionLabel}>Level</Text>
          <View style={s.levelGrid}>
            {LEVELS.map(item => {
              const active = level === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[s.levelOption, active && s.levelOptionActive]}
                  onPress={() => setLevel(item.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.levelOptionText, active && s.levelOptionTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Tags ────────────────────────────────────────── */}
          <Text style={s.sectionLabel}>Tags</Text>
          <View style={s.tagInputRow}>
            <View style={[s.inputWrap, { flex: 1, marginBottom: 0 }]}>
              <Ionicons name="pricetag-outline" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="Add a tag..."
                placeholderTextColor="#9CA3AF"
                style={s.inputFlex}
                onSubmitEditing={addTag}
              />
            </View>
            <TouchableOpacity
              style={[s.addTagBtn, !tagInput.trim() && s.btnDisabled]}
              onPress={addTag}
              disabled={!tagInput.trim()}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={s.tagsWrap}>
            {tags.map(tag => (
              <View key={tag} style={s.tagBadge}>
                <Text style={s.tagBadgeText}>{tag}</Text>
                <TouchableOpacity onPress={() => removeTag(tag)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Ionicons name="close-circle" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            ))}
            {tags.length === 0 && <Text style={s.helperText}>No tags added yet</Text>}
          </View>

          {/* ── Lessons ─────────────────────────────────────── */}
          <View style={s.lessonHeader}>
            <View>
              <Text style={s.sectionLabel}>Lessons *</Text>
              <Text style={s.helperText}>
                {normalizedLessons.length} lesson{normalizedLessons.length !== 1 ? 's' : ''} · {totalDuration}m total
              </Text>
            </View>
            <TouchableOpacity style={s.addLessonBtn} onPress={addLesson}>
              <Ionicons name="add" size={16} color="#0EA5E9" />
              <Text style={s.addLessonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {lessons.map((lesson, index) => (
            <View key={lesson.id} style={s.lessonCard}>
              {/* Lesson card header */}
              <View style={s.lessonCardHeader}>
                <View style={s.lessonNumBadge}>
                  <Text style={s.lessonNumText}>{index + 1}</Text>
                </View>
                <Text style={s.lessonCardTitle}>Lesson {index + 1}</Text>
                <TouchableOpacity
                  style={s.deleteBtn}
                  onPress={() => removeLesson(lesson.id)}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <Text style={s.fieldLabel}>Title *</Text>
              <View style={s.inputWrap}>
                <TextInput
                  value={lesson.title}
                  onChangeText={(value) => updateLesson(lesson.id, 'title', value)}
                  placeholder="Lesson title"
                  placeholderTextColor="#9CA3AF"
                  style={s.input}
                />
              </View>

              <Text style={s.fieldLabel}>Description</Text>
              <View style={[s.inputWrap, s.textAreaWrap]}>
                <TextInput
                  value={lesson.description}
                  onChangeText={(value) => updateLesson(lesson.id, 'description', value)}
                  placeholder="Lesson description"
                  placeholderTextColor="#9CA3AF"
                  style={[s.input, s.textAreaSmall]}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <View style={s.lessonMeta}>
                <View style={s.durationWrap}>
                  <Text style={s.fieldLabel}>Duration (min)</Text>
                  <View style={s.inputWrap}>
                    <Ionicons name="time-outline" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                    <TextInput
                      value={String(lesson.duration)}
                      onChangeText={(value) => {
                        const parsed = Number.parseInt(value, 10);
                        updateLesson(lesson.id, 'duration', Number.isFinite(parsed) ? parsed : 0);
                      }}
                      placeholder="10"
                      placeholderTextColor="#9CA3AF"
                      style={s.inputFlex}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={s.switchWrap}>
                  <Text style={s.fieldLabel}>Preview free</Text>
                  <Switch
                    value={lesson.isFree}
                    onValueChange={(value) => updateLesson(lesson.id, 'isFree', value)}
                    trackColor={{ false: '#E2E8F0', true: '#0EA5E9' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              <Text style={s.fieldLabel}>Content (optional)</Text>
              <View style={[s.inputWrap, s.textAreaWrap]}>
                <TextInput
                  value={lesson.content}
                  onChangeText={(value) => updateLesson(lesson.id, 'content', value)}
                  placeholder="Lesson content notes..."
                  placeholderTextColor="#9CA3AF"
                  style={[s.input, s.textArea]}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles: Profile-Edit Flat Design ─────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },

  // ── Header ────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF2',
    gap: 8,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  draftBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  publishBtn: {
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  publishBtnGrad: {
    height: 36,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  publishBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Scroll ────────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 2,
  },

  // ── Section Labels ────────────────────────────────────────────
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 28,
    marginBottom: 12,
    marginLeft: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    marginTop: 14,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 4,
    marginBottom: 4,
  },

  // ── Inputs: Fully Rounded Flat Style ──────────────────────────
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E8EDF2',
  },
  textAreaWrap: {
    height: 'auto',
    borderRadius: 20,
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    height: '100%',
  },
  inputFlex: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    height: '100%',
  },
  textArea: {
    height: 110,
    paddingTop: 0,
  },
  textAreaSmall: {
    height: 80,
    paddingTop: 0,
  },

  // ── Category Chips ────────────────────────────────────────────
  chipRow: {
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EDF2',
  },
  chipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  chipText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ── Level Grid ────────────────────────────────────────────────
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  levelOption: {
    width: '48%',
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EDF2',
    alignItems: 'center',
  },
  levelOptionActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  levelOptionText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  levelOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ── Tags ──────────────────────────────────────────────────────
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addTagBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tagBadgeText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },

  // ── Lessons ───────────────────────────────────────────────────
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 4,
  },
  addLessonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
  },
  addLessonText: {
    color: '#0EA5E9',
    fontSize: 14,
    fontWeight: '700',
  },
  lessonCard: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8EDF2',
  },
  lessonCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 10,
  },
  lessonNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonNumText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  lessonCardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginTop: 4,
  },
  durationWrap: {
    flex: 1,
  },
  switchWrap: {
    alignItems: 'center',
    paddingTop: 14,
    gap: 10,
  },

  // ── Disabled State ────────────────────────────────────────────
  btnDisabled: {
    opacity: 0.4,
  },
});
