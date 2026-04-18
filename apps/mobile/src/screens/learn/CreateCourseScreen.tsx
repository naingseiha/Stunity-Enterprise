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
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { learnApi } from '@/api';
import type { CreateCoursePayload, CreateLessonPayload, LearnCourseLevel } from '@/api/learn';
import { LearnStackScreenProps } from '@/navigation/types';

type NavigationProp = LearnStackScreenProps<'CreateCourse'>['navigation'];
type SupportedLocaleKey = 'en' | 'km';
type DraftLessonType =
  | 'VIDEO'
  | 'ARTICLE'
  | 'PRACTICE'
  | 'DOCUMENT'
  | 'PDF'
  | 'FILE'
  | 'CASE_STUDY'
  | 'AUDIO'
  | 'QUIZ'
  | 'ASSIGNMENT'
  | 'EXERCISE';

const VIDEO_ITEM_TYPES = new Set<DraftLessonType>(['VIDEO', 'CASE_STUDY', 'AUDIO']);
const DOCUMENT_ITEM_TYPES = new Set<DraftLessonType>(['DOCUMENT', 'PDF', 'FILE']);
const TEXT_ITEM_TYPES = new Set<DraftLessonType>(['ARTICLE', 'PRACTICE']);
const QUIZ_ITEM_TYPES = new Set<DraftLessonType>(['QUIZ']);
const ASSIGNMENT_ITEM_TYPES = new Set<DraftLessonType>(['ASSIGNMENT']);
const EXERCISE_ITEM_TYPES = new Set<DraftLessonType>(['EXERCISE']);

interface DraftQuizQuestion {
  id: string;
  question: string;
  explanation: string;
  allowMultipleCorrect: boolean;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
}

interface DraftLessonResource {
  id: string;
  title: string;
  url: string;
  type: 'FILE' | 'LINK' | 'VIDEO';
  locale: SupportedLocaleKey;
  isDefault: boolean;
}

interface DraftLesson {
  id: string;
  type: DraftLessonType;
  title: string;
  description: string;
  duration: number;
  isFree: boolean;
  content: string;
  videoUrl: string;
  resources: DraftLessonResource[];
  subtitleEnUrl: string;
  subtitleKmUrl: string;
  transcriptEn: string;
  transcriptKm: string;
  quizPassingScore: number;
  quizQuestions: DraftQuizQuestion[];
  assignmentInstructions: string;
  assignmentInstructionsEn: string;
  assignmentInstructionsKm: string;
  assignmentRubric: string;
  assignmentMaxScore: number;
  assignmentPassingScore: number;
  exerciseLanguage: string;
  exerciseInitialCode: string;
  exerciseSolutionCode: string;
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
const LANGUAGE_OPTIONS: Array<{ key: SupportedLocaleKey; label: string }> = [
  { key: 'en', label: 'English' },
  { key: 'km', label: 'Khmer' },
];
const LESSON_TYPE_OPTIONS: Array<{ value: DraftLessonType; label: string; helper: string }> = [
  { value: 'VIDEO', label: 'Video', helper: 'Video lesson from URL' },
  { value: 'ARTICLE', label: 'Article', helper: 'Text-based reading lesson' },
  { value: 'QUIZ', label: 'Quiz', helper: 'Assessment with multiple-choice questions' },
  { value: 'ASSIGNMENT', label: 'Assignment', helper: 'Written task with rubric and score' },
  { value: 'EXERCISE', label: 'Exercise', helper: 'Code challenge with starter + solution' },
  { value: 'DOCUMENT', label: 'Document', helper: 'Attachment or downloadable file' },
  { value: 'PDF', label: 'PDF', helper: 'PDF resource lesson' },
  { value: 'FILE', label: 'File', helper: 'General file resource' },
  { value: 'PRACTICE', label: 'Practice', helper: 'Hands-on text tutorial' },
  { value: 'CASE_STUDY', label: 'Case Study', helper: 'Media-backed scenario lesson' },
  { value: 'AUDIO', label: 'Audio', helper: 'Podcast or narrated lesson' },
];

const createEmptyQuizOption = (questionIndex: number, optionIndex: number) => ({
  id: `quiz-opt-${Date.now()}-${questionIndex}-${optionIndex}`,
  text: '',
  isCorrect: optionIndex === 0,
});

const createEmptyQuizQuestion = (index: number): DraftQuizQuestion => ({
  id: `quiz-q-${Date.now()}-${index}`,
  question: '',
  explanation: '',
  allowMultipleCorrect: false,
  options: [createEmptyQuizOption(index, 0), createEmptyQuizOption(index, 1)],
});

const createEmptyLessonResource = (index: number, locale: SupportedLocaleKey): DraftLessonResource => ({
  id: `lesson-resource-${Date.now()}-${index}`,
  title: '',
  url: '',
  type: 'FILE',
  locale,
  isDefault: index === 0,
});

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
  md: 'text/markdown',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
};

const getFileNameFromUri = (uri: string, fallback = `resource-${Date.now()}`) => {
  const normalized = String(uri || '').split('?')[0];
  const parts = normalized.split('/');
  const candidate = parts[parts.length - 1];
  return candidate && candidate.trim().length > 0 ? candidate : fallback;
};

const inferMimeTypeFromFileName = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension && MIME_BY_EXTENSION[extension]) {
    return MIME_BY_EXTENSION[extension];
  }
  return 'application/octet-stream';
};

const deriveResourceTitleFromFileName = (fileName: string) => {
  const normalized = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return normalized || fileName;
};

const inferResourceTypeFromMimeType = (mimeType: string): DraftLessonResource['type'] => (
  mimeType.toLowerCase().startsWith('video/') ? 'VIDEO' : 'FILE'
);

const createEmptyLesson = (index: number): DraftLesson => ({
  id: `lesson-${Date.now()}-${index}`,
  type: 'VIDEO',
  title: '',
  description: '',
  duration: 10,
  isFree: index === 0,
  content: '',
  videoUrl: '',
  resources: [createEmptyLessonResource(0, 'en')],
  subtitleEnUrl: '',
  subtitleKmUrl: '',
  transcriptEn: '',
  transcriptKm: '',
  quizPassingScore: 80,
  quizQuestions: [createEmptyQuizQuestion(0)],
  assignmentInstructions: '',
  assignmentInstructionsEn: '',
  assignmentInstructionsKm: '',
  assignmentRubric: '',
  assignmentMaxScore: 100,
  assignmentPassingScore: 80,
  exerciseLanguage: 'javascript',
  exerciseInitialCode: '',
  exerciseSolutionCode: '',
});

export default function CreateCourseScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('');
  const [level, setLevel] = useState<LearnCourseLevel>('BEGINNER');
  const [sourceLocale, setSourceLocale] = useState<SupportedLocaleKey>('en');
  const [supportedLocales, setSupportedLocales] = useState<SupportedLocaleKey[]>(['en']);
  const [thumbnail, setThumbnail] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [lessons, setLessons] = useState<DraftLesson[]>([createEmptyLesson(0)]);
  const [uploadingResourceById, setUploadingResourceById] = useState<Record<string, boolean>>({});
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
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

  const hasValidQuizQuestion = (question: DraftQuizQuestion) => {
    const nonEmptyOptions = question.options.filter((option) => option.text.trim().length > 0);
    const correctNonEmptyOptions = nonEmptyOptions.filter((option) => option.isCorrect);
    return question.question.trim().length > 0 && nonEmptyOptions.length >= 2 && correctNonEmptyOptions.length >= 1;
  };

  const isLessonReadyForPublish = (lesson: DraftLesson) => {
    if (lesson.title.trim().length === 0 || lesson.duration <= 0) {
      return false;
    }

    if (QUIZ_ITEM_TYPES.has(lesson.type)) {
      return lesson.quizQuestions.some(hasValidQuizQuestion);
    }

    if (ASSIGNMENT_ITEM_TYPES.has(lesson.type)) {
      return (
        lesson.assignmentInstructions.trim().length > 0
        || lesson.assignmentInstructionsEn.trim().length > 0
        || lesson.assignmentInstructionsKm.trim().length > 0
      );
    }

    if (EXERCISE_ITEM_TYPES.has(lesson.type)) {
      return lesson.exerciseInitialCode.trim().length > 0 && lesson.exerciseSolutionCode.trim().length > 0;
    }

    if (VIDEO_ITEM_TYPES.has(lesson.type)) {
      return lesson.videoUrl.trim().length > 0;
    }

    if (DOCUMENT_ITEM_TYPES.has(lesson.type)) {
      const hasResource = lesson.resources.some((resource) => (
        resource.title.trim().length > 0 && resource.url.trim().length > 0
      ));
      return hasResource || lesson.content.trim().length > 0;
    }

    if (TEXT_ITEM_TYPES.has(lesson.type)) {
      return lesson.content.trim().length > 0;
    }

    return true;
  };

  const isCourseValid = title.trim().length >= 5 && description.trim().length >= 20 && Boolean(category);
  const isLessonValid = normalizedLessons.length > 0 && normalizedLessons.every(isLessonReadyForPublish);
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

  const moveLesson = (lessonId: string, direction: 'up' | 'down') => {
    setLessons((previous) => {
      const currentIndex = previous.findIndex((lesson) => lesson.id === lessonId);
      if (currentIndex < 0) return previous;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= previous.length) return previous;

      const next = [...previous];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const updateCourseSourceLocale = (localeKey: SupportedLocaleKey) => {
    setSourceLocale(localeKey);
    setSupportedLocales(prev => prev.includes(localeKey) ? prev : [localeKey, ...prev]);
  };

  const toggleCourseSupportedLocale = (localeKey: SupportedLocaleKey) => {
    if (localeKey === sourceLocale) return;

    setSupportedLocales(prev => (
      prev.includes(localeKey)
        ? prev.filter(item => item !== localeKey)
        : [...prev, localeKey]
    ));
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

  const updateLessonWithUpdater = (lessonId: string, updater: (lesson: DraftLesson) => DraftLesson) => {
    setLessons((previous) => previous.map((lesson) => (lesson.id === lessonId ? updater(lesson) : lesson)));
  };

  const addQuizQuestion = (lessonId: string) => {
    updateLessonWithUpdater(lessonId, (lesson) => ({
      ...lesson,
      quizQuestions: [...lesson.quizQuestions, createEmptyQuizQuestion(lesson.quizQuestions.length)],
    }));
  };

  const removeQuizQuestion = (lessonId: string, questionId: string) => {
    updateLessonWithUpdater(lessonId, (lesson) => {
      if (lesson.quizQuestions.length <= 1) {
        return lesson;
      }

      return {
        ...lesson,
        quizQuestions: lesson.quizQuestions.filter((question) => question.id !== questionId),
      };
    });
  };

  const moveQuizQuestion = (lessonId: string, questionId: string, direction: 'up' | 'down') => {
    updateLessonWithUpdater(lessonId, (lesson) => {
      const currentIndex = lesson.quizQuestions.findIndex((question) => question.id === questionId);
      if (currentIndex < 0) return lesson;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= lesson.quizQuestions.length) return lesson;

      const nextQuestions = [...lesson.quizQuestions];
      const [moved] = nextQuestions.splice(currentIndex, 1);
      nextQuestions.splice(targetIndex, 0, moved);
      return {
        ...lesson,
        quizQuestions: nextQuestions,
      };
    });
  };

  const updateQuizQuestionField = <K extends keyof Omit<DraftQuizQuestion, 'id'>>(
    lessonId: string,
    questionId: string,
    field: K,
    value: Omit<DraftQuizQuestion, 'id'>[K]
  ) => {
    updateLessonWithUpdater(lessonId, (lesson) => ({
      ...lesson,
      quizQuestions: lesson.quizQuestions.map((question) => (
        question.id === questionId ? { ...question, [field]: value } : question
      )),
    }));
  };

  const addQuizOption = (lessonId: string, questionId: string) => {
    updateLessonWithUpdater(lessonId, (lesson) => ({
      ...lesson,
      quizQuestions: lesson.quizQuestions.map((question, questionIndex) => (
        question.id === questionId
          ? { ...question, options: [...question.options, createEmptyQuizOption(questionIndex, question.options.length)] }
          : question
      )),
    }));
  };

  const removeQuizOption = (lessonId: string, questionId: string, optionId: string) => {
    updateLessonWithUpdater(lessonId, (lesson) => ({
      ...lesson,
      quizQuestions: lesson.quizQuestions.map((question) => {
        if (question.id !== questionId || question.options.length <= 2) {
          return question;
        }

        const nextOptions = question.options.filter((option) => option.id !== optionId);
        const hasCorrect = nextOptions.some((option) => option.isCorrect);
        const correctedOptions = hasCorrect
          ? nextOptions
          : nextOptions.map((option, index) => ({ ...option, isCorrect: index === 0 }));

        return { ...question, options: correctedOptions };
      }),
    }));
  };

  const updateQuizOptionText = (lessonId: string, questionId: string, optionId: string, text: string) => {
    updateLessonWithUpdater(lessonId, (lesson) => ({
      ...lesson,
      quizQuestions: lesson.quizQuestions.map((question) => (
        question.id === questionId
          ? {
              ...question,
              options: question.options.map((option) => (
                option.id === optionId ? { ...option, text } : option
              )),
            }
          : question
      )),
    }));
  };

  const toggleQuizOptionCorrect = (lessonId: string, questionId: string, optionId: string) => {
    updateLessonWithUpdater(lessonId, (lesson) => ({
      ...lesson,
      quizQuestions: lesson.quizQuestions.map((question) => {
        if (question.id !== questionId) return question;

        const optionToToggle = question.options.find((option) => option.id === optionId);
        if (!optionToToggle) return question;

        if (!question.allowMultipleCorrect) {
          return {
            ...question,
            options: question.options.map((option) => ({ ...option, isCorrect: option.id === optionId })),
          };
        }

        const nextOptions = question.options.map((option) => (
          option.id === optionId ? { ...option, isCorrect: !option.isCorrect } : option
        ));
        const hasAnyCorrect = nextOptions.some((option) => option.isCorrect);
        return {
          ...question,
          options: hasAnyCorrect ? nextOptions : nextOptions.map((option, index) => ({ ...option, isCorrect: index === 0 })),
        };
      }),
    }));
  };

  const setQuizQuestionMode = (lessonId: string, questionId: string, allowMultipleCorrect: boolean) => {
    updateLessonWithUpdater(lessonId, (lesson) => ({
      ...lesson,
      quizQuestions: lesson.quizQuestions.map((question) => {
        if (question.id !== questionId) return question;

        if (allowMultipleCorrect) {
          return { ...question, allowMultipleCorrect: true };
        }

        const firstCorrectIndex = question.options.findIndex((option) => option.isCorrect);
        const indexToKeep = firstCorrectIndex >= 0 ? firstCorrectIndex : 0;
        return {
          ...question,
          allowMultipleCorrect: false,
          options: question.options.map((option, index) => ({ ...option, isCorrect: index === indexToKeep })),
        };
      }),
    }));
  };

  const addDocumentResource = (lessonId: string) => {
    updateLessonWithUpdater(lessonId, (lesson) => ({
      ...lesson,
      resources: [...lesson.resources, createEmptyLessonResource(lesson.resources.length, sourceLocale)],
    }));
  };

  const moveDocumentResource = (lessonId: string, resourceId: string, direction: 'up' | 'down') => {
    updateLessonWithUpdater(lessonId, (lesson) => {
      const currentIndex = lesson.resources.findIndex((resource) => resource.id === resourceId);
      if (currentIndex < 0) return lesson;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= lesson.resources.length) return lesson;

      const nextResources = [...lesson.resources];
      const [moved] = nextResources.splice(currentIndex, 1);
      nextResources.splice(targetIndex, 0, moved);
      return { ...lesson, resources: nextResources };
    });
  };

  const removeDocumentResource = (lessonId: string, resourceId: string) => {
    updateLessonWithUpdater(lessonId, (lesson) => {
      if (lesson.resources.length <= 1) return lesson;

      const nextResources = lesson.resources.filter((resource) => resource.id !== resourceId);
      const hasDefault = nextResources.some((resource) => resource.isDefault);
      return {
        ...lesson,
        resources: nextResources.map((resource, index) => ({
          ...resource,
          isDefault: hasDefault ? resource.isDefault : index === 0,
        })),
      };
    });
  };

  const updateDocumentResourceField = <K extends keyof Omit<DraftLessonResource, 'id'>>(
    lessonId: string,
    resourceId: string,
    field: K,
    value: Omit<DraftLessonResource, 'id'>[K]
  ) => {
    updateLessonWithUpdater(lessonId, (lesson) => ({
      ...lesson,
      resources: lesson.resources.map((resource) => (
        resource.id === resourceId ? { ...resource, [field]: value } : resource
      )),
    }));
  };

  const setDocumentResourceDefault = (lessonId: string, resourceId: string) => {
    updateLessonWithUpdater(lessonId, (lesson) => ({
      ...lesson,
      resources: lesson.resources.map((resource) => ({
        ...resource,
        isDefault: resource.id === resourceId,
      })),
    }));
  };

  const setResourceUploadingState = (resourceId: string, isUploading: boolean) => {
    setUploadingResourceById((previous) => {
      if (isUploading) {
        return { ...previous, [resourceId]: true };
      }

      const nextState = { ...previous };
      delete nextState[resourceId];
      return nextState;
    });
  };

  const uploadDocumentResourceFile = async (lessonId: string, resourceId: string) => {
    try {
      const pickResult = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (pickResult.canceled || pickResult.assets.length === 0) {
        return;
      }

      const pickedAsset = pickResult.assets[0];
      const fileName = (pickedAsset.name || '').trim() || getFileNameFromUri(pickedAsset.uri);
      const mimeType = (pickedAsset.mimeType || '').trim() || inferMimeTypeFromFileName(fileName);

      setResourceUploadingState(resourceId, true);
      const uploaded = await learnApi.uploadCourseLessonResourceAttachment(pickedAsset.uri, fileName, mimeType);
      const inferredType = inferResourceTypeFromMimeType(mimeType);
      const inferredTitle = deriveResourceTitleFromFileName(fileName);

      updateLessonWithUpdater(lessonId, (lesson) => ({
        ...lesson,
        resources: lesson.resources.map((resource) => (
          resource.id === resourceId
            ? {
                ...resource,
                url: uploaded.fileUrl,
                type: inferredType,
                title: resource.title.trim().length > 0 ? resource.title : inferredTitle,
              }
            : resource
        )),
      }));
    } catch (error: any) {
      Alert.alert('Upload Failed', error?.message || 'Unable to upload the selected file.');
    } finally {
      setResourceUploadingState(resourceId, false);
    }
  };

  const uploadCourseThumbnailImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow photo library access to upload a thumbnail.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.9,
      });

      if (pickerResult.canceled || pickerResult.assets.length === 0) {
        return;
      }

      const pickedAsset = pickerResult.assets[0];
      const fileName = (pickedAsset.fileName || '').trim() || getFileNameFromUri(pickedAsset.uri, `course-thumbnail-${Date.now()}.jpg`);
      const mimeType = (pickedAsset.mimeType || '').trim() || inferMimeTypeFromFileName(fileName);

      setUploadingThumbnail(true);
      const uploaded = await learnApi.uploadCourseThumbnail(pickedAsset.uri, fileName, mimeType);
      setThumbnail(uploaded.fileUrl);
    } catch (error: any) {
      Alert.alert('Thumbnail Upload', error?.message || 'Unable to upload thumbnail right now.');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const buildCoursePayload = (): CreateCoursePayload => ({
    title: title.trim(),
    description: description.trim(),
    category,
    level,
    sourceLocale,
    supportedLocales,
    thumbnail: thumbnail.trim() || undefined,
    tags,
  });

  const buildLessonPayload = (lesson: DraftLesson, order: number): CreateLessonPayload => {
    const subtitleEn = lesson.subtitleEnUrl.trim();
    const subtitleKm = lesson.subtitleKmUrl.trim();
    const transcriptEn = lesson.transcriptEn.trim();
    const transcriptKm = lesson.transcriptKm.trim();

    const textTracks = VIDEO_ITEM_TYPES.has(lesson.type)
      ? (() => {
          const tracks: NonNullable<CreateLessonPayload['textTracks']> = [];
          if (subtitleEn) {
            tracks.push({
              kind: 'SUBTITLE',
              locale: 'en',
              label: 'English Subtitle',
              url: subtitleEn,
              isDefault: sourceLocale === 'en',
            });
          }
          if (subtitleKm) {
            tracks.push({
              kind: 'SUBTITLE',
              locale: 'km',
              label: 'Khmer Subtitle',
              url: subtitleKm,
              isDefault: sourceLocale === 'km',
            });
          }
          if (transcriptEn) {
            tracks.push({
              kind: 'TRANSCRIPT',
              locale: 'en',
              label: 'English Transcript',
              content: transcriptEn,
            });
          }
          if (transcriptKm) {
            tracks.push({
              kind: 'TRANSCRIPT',
              locale: 'km',
              label: 'Khmer Transcript',
              content: transcriptKm,
            });
          }
          return tracks;
        })()
      : undefined;

    const normalizedQuizQuestions = QUIZ_ITEM_TYPES.has(lesson.type)
      ? lesson.quizQuestions
          .map((question, questionIndex) => {
            const options = question.options
              .map((option) => ({
                id: option.id,
                text: option.text.trim(),
                isCorrect: option.isCorrect,
              }))
              .filter((option) => option.text.length > 0);

            if (question.question.trim().length === 0 || options.length < 2) {
              return null;
            }

            const correctInOptions = options.some((option) => option.isCorrect);
            const correctedOptions = options.map((option, optionIndex) => ({
              text: option.text,
              isCorrect: correctInOptions
                ? option.isCorrect
                : optionIndex === 0,
            }));

            return {
              question: question.question.trim(),
              explanation: question.explanation.trim() || undefined,
              order: questionIndex + 1,
              options: correctedOptions,
            };
          })
          .filter((question): question is NonNullable<typeof question> => Boolean(question))
      : undefined;

    const normalizedDocumentResources = DOCUMENT_ITEM_TYPES.has(lesson.type)
      ? lesson.resources
          .map((resource) => ({
            title: resource.title.trim(),
            url: resource.url.trim(),
            type: resource.type,
            locale: resource.locale,
            isDefault: resource.isDefault,
          }))
          .filter((resource) => resource.title.length > 0 && resource.url.length > 0)
      : [];

    const resolvedDocumentResources = normalizedDocumentResources.length > 0
      ? normalizedDocumentResources.map((resource, resourceIndex) => ({
          ...resource,
          isDefault: normalizedDocumentResources.some((candidate) => candidate.isDefault)
            ? resource.isDefault
            : resourceIndex === 0,
        }))
      : undefined;

    const assignmentInstructionsSource = sourceLocale === 'km'
      ? lesson.assignmentInstructionsKm.trim() || lesson.assignmentInstructions.trim() || lesson.assignmentInstructionsEn.trim()
      : lesson.assignmentInstructionsEn.trim() || lesson.assignmentInstructions.trim() || lesson.assignmentInstructionsKm.trim();

    const assignmentTranslations = {
      ...(lesson.assignmentInstructionsEn.trim() ? { en: lesson.assignmentInstructionsEn.trim() } : {}),
      ...(lesson.assignmentInstructionsKm.trim() ? { km: lesson.assignmentInstructionsKm.trim() } : {}),
    };

    return {
      type: lesson.type,
      title: lesson.title.trim(),
      description: lesson.description.trim() || undefined,
      duration: lesson.duration,
      isFree: lesson.isFree,
      content: DOCUMENT_ITEM_TYPES.has(lesson.type)
        ? lesson.content.trim() || resolvedDocumentResources?.[0]?.url || undefined
        : lesson.content.trim() || undefined,
      videoUrl: VIDEO_ITEM_TYPES.has(lesson.type) ? lesson.videoUrl.trim() || undefined : undefined,
      resources: resolvedDocumentResources,
      textTracks,
      quiz: QUIZ_ITEM_TYPES.has(lesson.type)
        ? {
            passingScore: lesson.quizPassingScore > 0 ? lesson.quizPassingScore : 80,
            questions: normalizedQuizQuestions || [],
          }
        : undefined,
      assignment: ASSIGNMENT_ITEM_TYPES.has(lesson.type)
        ? {
            maxScore: lesson.assignmentMaxScore > 0 ? lesson.assignmentMaxScore : 100,
            passingScore: lesson.assignmentPassingScore > 0 ? lesson.assignmentPassingScore : 80,
            instructions: assignmentInstructionsSource || '',
            instructionsTranslations: Object.keys(assignmentTranslations).length > 0 ? assignmentTranslations : undefined,
            instructionsEn: lesson.assignmentInstructionsEn.trim() || undefined,
            instructionsKm: lesson.assignmentInstructionsKm.trim() || undefined,
            rubric: lesson.assignmentRubric.trim() || undefined,
          }
        : undefined,
      exercise: EXERCISE_ITEM_TYPES.has(lesson.type)
        ? {
            language: lesson.exerciseLanguage.trim() || 'javascript',
            initialCode: lesson.exerciseInitialCode,
            solutionCode: lesson.exerciseSolutionCode,
          }
        : undefined,
      order,
    };
  };

  const submitCourse = async (publishNow: boolean) => {
    const canProceed = publishNow ? canPublish : canSaveDraft;
    if (!canProceed) {
      Alert.alert(
        'Course validation',
        publishNow
          ? 'Please complete course details and fill each lesson requirement (quiz, assignment, exercise, media, or document fields).'
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
          <View style={s.thumbnailActionsRow}>
            <TouchableOpacity
              style={[s.thumbnailUploadBtn, uploadingThumbnail && s.btnDisabled]}
              onPress={uploadCourseThumbnailImage}
              disabled={uploadingThumbnail}
              activeOpacity={0.85}
            >
              {uploadingThumbnail ? (
                <ActivityIndicator size="small" color="#0EA5E9" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={16} color="#0EA5E9" />
                  <Text style={s.thumbnailUploadBtnText}>Upload Image</Text>
                </>
              )}
            </TouchableOpacity>
            {thumbnail.trim().length > 0 && (
              <TouchableOpacity
                style={s.thumbnailClearBtn}
                onPress={() => setThumbnail('')}
                activeOpacity={0.85}
              >
                <Ionicons name="close-circle-outline" size={16} color="#64748B" />
                <Text style={s.thumbnailClearBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={s.helperText}>You can paste a URL or upload an image directly.</Text>

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

          <Text style={s.sectionLabel}>Languages</Text>
          <Text style={s.helperText}>Choose the source language and the learner-facing languages for this course.</Text>
          <View style={s.languageCard}>
            <Text style={s.fieldLabel}>Source Language</Text>
            <View style={s.languageOptionGrid}>
              {LANGUAGE_OPTIONS.map((item) => {
                const active = sourceLocale === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[s.languageOption, active && s.languageOptionActive]}
                    onPress={() => updateCourseSourceLocale(item.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.languageOptionText, active && s.languageOptionTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[s.fieldLabel, { marginTop: 14 }]}>Available Languages</Text>
            <View style={s.languageChipWrap}>
              {LANGUAGE_OPTIONS.map((item) => {
                const active = supportedLocales.includes(item.key);
                const isRequired = sourceLocale === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[s.languageChip, active && s.languageChipActive, isRequired && s.languageChipRequired]}
                    onPress={() => toggleCourseSupportedLocale(item.key)}
                    activeOpacity={isRequired ? 1 : 0.8}
                  >
                    <Text style={[s.languageChipText, active && s.languageChipTextActive]}>
                      {item.label}{isRequired ? ' • source' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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

          {lessons.map((lesson, index) => {
            const isVideoLesson = VIDEO_ITEM_TYPES.has(lesson.type);
            const isDocumentLesson = DOCUMENT_ITEM_TYPES.has(lesson.type);
            const isTextLesson = TEXT_ITEM_TYPES.has(lesson.type);
            const isQuizLesson = QUIZ_ITEM_TYPES.has(lesson.type);
            const isAssignmentLesson = ASSIGNMENT_ITEM_TYPES.has(lesson.type);
            const isExerciseLesson = EXERCISE_ITEM_TYPES.has(lesson.type);
            const lessonTypeHelp = LESSON_TYPE_OPTIONS.find((option) => option.value === lesson.type)?.helper || '';

            return (
              <View key={lesson.id} style={s.lessonCard}>
                {/* Lesson card header */}
                <View style={s.lessonCardHeader}>
                  <View style={s.lessonNumBadge}>
                    <Text style={s.lessonNumText}>{index + 1}</Text>
                  </View>
                  <Text style={s.lessonCardTitle}>Lesson {index + 1}</Text>
                  <View style={s.lessonHeaderActions}>
                    <TouchableOpacity
                      style={[s.lessonActionBtn, index === 0 && s.btnDisabled]}
                      onPress={() => moveLesson(lesson.id, 'up')}
                      disabled={index === 0}
                    >
                      <Ionicons name="arrow-up-outline" size={14} color="#64748B" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.lessonActionBtn, index === lessons.length - 1 && s.btnDisabled]}
                      onPress={() => moveLesson(lesson.id, 'down')}
                      disabled={index === lessons.length - 1}
                    >
                      <Ionicons name="arrow-down-outline" size={14} color="#64748B" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.deleteBtn}
                      onPress={() => removeLesson(lesson.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
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

                <Text style={s.fieldLabel}>Lesson Type *</Text>
                <View style={s.lessonTypeGrid}>
                  {LESSON_TYPE_OPTIONS.map((option) => {
                    const active = lesson.type === option.value;
                    return (
                      <TouchableOpacity
                        key={`${lesson.id}-${option.value}`}
                        style={[s.lessonTypeChip, active && s.lessonTypeChipActive]}
                        onPress={() => updateLesson(lesson.id, 'type', option.value)}
                        activeOpacity={0.8}
                      >
                        <Text style={[s.lessonTypeChipText, active && s.lessonTypeChipTextActive]}>{option.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={s.lessonTypeHelper}>{lessonTypeHelp}</Text>

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

                {isVideoLesson && (
                  <>
                    <Text style={s.fieldLabel}>{lesson.type === 'AUDIO' ? 'Audio URL *' : 'Video URL *'}</Text>
                    <View style={s.inputWrap}>
                      <Ionicons
                        name={lesson.type === 'AUDIO' ? 'musical-notes-outline' : 'play-circle-outline'}
                        size={18}
                        color="#9CA3AF"
                        style={{ marginRight: 10 }}
                      />
                      <TextInput
                        value={lesson.videoUrl}
                        onChangeText={(value) => updateLesson(lesson.id, 'videoUrl', value)}
                        placeholder="https://example.com/lesson-media"
                        placeholderTextColor="#9CA3AF"
                        style={s.inputFlex}
                        autoCapitalize="none"
                      />
                    </View>

                    <Text style={s.fieldLabel}>Captions & Transcript (optional)</Text>
                    <View style={s.inputWrap}>
                      <Ionicons name="chatbox-ellipses-outline" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                      <TextInput
                        value={lesson.subtitleEnUrl}
                        onChangeText={(value) => updateLesson(lesson.id, 'subtitleEnUrl', value)}
                        placeholder="English subtitle URL (.vtt/.srt)"
                        placeholderTextColor="#9CA3AF"
                        style={s.inputFlex}
                        autoCapitalize="none"
                      />
                    </View>
                    <View style={[s.inputWrap, { marginTop: 8 }]}>
                      <Ionicons name="chatbox-ellipses-outline" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                      <TextInput
                        value={lesson.subtitleKmUrl}
                        onChangeText={(value) => updateLesson(lesson.id, 'subtitleKmUrl', value)}
                        placeholder="Khmer subtitle URL (.vtt/.srt)"
                        placeholderTextColor="#9CA3AF"
                        style={s.inputFlex}
                        autoCapitalize="none"
                      />
                    </View>
                    <View style={[s.inputWrap, s.textAreaWrap, { marginTop: 8 }]}>
                      <TextInput
                        value={lesson.transcriptEn}
                        onChangeText={(value) => updateLesson(lesson.id, 'transcriptEn', value)}
                        placeholder="English transcript text (optional)"
                        placeholderTextColor="#9CA3AF"
                        style={[s.input, s.textAreaSmall]}
                        multiline
                        textAlignVertical="top"
                      />
                    </View>
                    <View style={[s.inputWrap, s.textAreaWrap, { marginTop: 8 }]}>
                      <TextInput
                        value={lesson.transcriptKm}
                        onChangeText={(value) => updateLesson(lesson.id, 'transcriptKm', value)}
                        placeholder="Khmer transcript text (optional)"
                        placeholderTextColor="#9CA3AF"
                        style={[s.input, s.textAreaSmall]}
                        multiline
                        textAlignVertical="top"
                      />
                    </View>
                  </>
                )}

                {isQuizLesson && (
                  <>
                    <Text style={s.fieldLabel}>Passing Score (%)</Text>
                    <View style={s.inputWrap}>
                      <Ionicons name="checkmark-done-outline" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                      <TextInput
                        value={String(lesson.quizPassingScore)}
                        onChangeText={(value) => {
                          const parsed = Number.parseInt(value, 10);
                          updateLesson(lesson.id, 'quizPassingScore', Number.isFinite(parsed) ? parsed : 80);
                        }}
                        placeholder="80"
                        placeholderTextColor="#9CA3AF"
                        style={s.inputFlex}
                        keyboardType="numeric"
                      />
                    </View>

                    {lesson.quizQuestions.map((question, questionIndex) => (
                      <View key={question.id} style={s.subEditorBlock}>
                        <View style={s.subEditorHeader}>
                          <Text style={s.subEditorTitle}>Question {questionIndex + 1}</Text>
                          <View style={s.subEditorHeaderActions}>
                            <TouchableOpacity
                              style={[s.resourceActionBtn, questionIndex === 0 && s.btnDisabled]}
                              onPress={() => moveQuizQuestion(lesson.id, question.id, 'up')}
                              disabled={questionIndex === 0}
                            >
                              <Ionicons name="arrow-up-outline" size={14} color="#64748B" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[s.resourceActionBtn, questionIndex === lesson.quizQuestions.length - 1 && s.btnDisabled]}
                              onPress={() => moveQuizQuestion(lesson.id, question.id, 'down')}
                              disabled={questionIndex === lesson.quizQuestions.length - 1}
                            >
                              <Ionicons name="arrow-down-outline" size={14} color="#64748B" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              disabled={lesson.quizQuestions.length <= 1}
                              onPress={() => removeQuizQuestion(lesson.id, question.id)}
                              style={[s.subEditorDeleteBtn, lesson.quizQuestions.length <= 1 && s.btnDisabled]}
                            >
                              <Ionicons name="trash-outline" size={14} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={s.quizModeRow}>
                          <TouchableOpacity
                            style={[s.quizModeChip, !question.allowMultipleCorrect && s.quizModeChipActive]}
                            onPress={() => setQuizQuestionMode(lesson.id, question.id, false)}
                          >
                            <Text style={[s.quizModeChipText, !question.allowMultipleCorrect && s.quizModeChipTextActive]}>Single Answer</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[s.quizModeChip, question.allowMultipleCorrect && s.quizModeChipActive]}
                            onPress={() => setQuizQuestionMode(lesson.id, question.id, true)}
                          >
                            <Text style={[s.quizModeChipText, question.allowMultipleCorrect && s.quizModeChipTextActive]}>Multi Answer</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={[s.inputWrap, s.textAreaWrap]}>
                          <TextInput
                            value={question.question}
                            onChangeText={(value) => updateQuizQuestionField(lesson.id, question.id, 'question', value)}
                            placeholder="Write the quiz question..."
                            placeholderTextColor="#9CA3AF"
                            style={[s.input, s.textAreaSmall]}
                            multiline
                            textAlignVertical="top"
                          />
                        </View>

                        <View style={[s.inputWrap, s.textAreaWrap, { marginTop: 8 }]}>
                          <TextInput
                            value={question.explanation}
                            onChangeText={(value) => updateQuizQuestionField(lesson.id, question.id, 'explanation', value)}
                            placeholder="Explanation (optional)"
                            placeholderTextColor="#9CA3AF"
                            style={[s.input, s.textAreaSmall]}
                            multiline
                            textAlignVertical="top"
                          />
                        </View>

                        {question.options.map((option, optionIndex) => {
                          const optionLabel = String.fromCharCode(65 + optionIndex);

                          return (
                            <View key={`${question.id}-${option.id}`} style={s.quizOptionRow}>
                              <TouchableOpacity
                                onPress={() => toggleQuizOptionCorrect(lesson.id, question.id, option.id)}
                                style={[s.quizCorrectToggle, option.isCorrect && s.quizCorrectToggleActive]}
                              >
                                <Text style={[s.quizCorrectToggleText, option.isCorrect && s.quizCorrectToggleTextActive]}>{optionLabel}</Text>
                              </TouchableOpacity>
                              <View style={[s.inputWrap, s.quizOptionInputWrap]}>
                                <TextInput
                                  value={option.text}
                                  onChangeText={(value) => updateQuizOptionText(lesson.id, question.id, option.id, value)}
                                  placeholder={`Option ${optionLabel}`}
                                  placeholderTextColor="#9CA3AF"
                                  style={s.inputFlex}
                                />
                              </View>
                              <TouchableOpacity
                                disabled={question.options.length <= 2}
                                onPress={() => removeQuizOption(lesson.id, question.id, option.id)}
                                style={[s.quizOptionRemoveBtn, question.options.length <= 2 && s.btnDisabled]}
                              >
                                <Ionicons name="remove-circle-outline" size={18} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          );
                        })}

                        <TouchableOpacity style={s.subEditorInlineAddBtn} onPress={() => addQuizOption(lesson.id, question.id)}>
                          <Ionicons name="add" size={14} color="#0EA5E9" />
                          <Text style={s.subEditorInlineAddText}>Add Option</Text>
                        </TouchableOpacity>
                      </View>
                    ))}

                    <TouchableOpacity style={s.subEditorAddBtn} onPress={() => addQuizQuestion(lesson.id)}>
                      <Ionicons name="add" size={16} color="#0EA5E9" />
                      <Text style={s.subEditorAddText}>Add Question</Text>
                    </TouchableOpacity>
                  </>
                )}

                {isAssignmentLesson && (
                  <>
                    <Text style={s.fieldLabel}>Source Instructions *</Text>
                    <View style={[s.inputWrap, s.textAreaWrap]}>
                      <TextInput
                        value={lesson.assignmentInstructions}
                        onChangeText={(value) => updateLesson(lesson.id, 'assignmentInstructions', value)}
                        placeholder={sourceLocale === 'km' ? 'សរសេរការណែនាំសំខាន់...' : 'Write the main assignment instructions...'}
                        placeholderTextColor="#9CA3AF"
                        style={[s.input, s.textArea]}
                        multiline
                        textAlignVertical="top"
                      />
                    </View>
                    <Text style={s.lessonTypeHelper}>Source locale: {sourceLocale === 'km' ? 'Khmer' : 'English'}</Text>

                    <Text style={s.fieldLabel}>English Instructions</Text>
                    <View style={[s.inputWrap, s.textAreaWrap]}>
                      <TextInput
                        value={lesson.assignmentInstructionsEn}
                        onChangeText={(value) => updateLesson(lesson.id, 'assignmentInstructionsEn', value)}
                        placeholder="English translation"
                        placeholderTextColor="#9CA3AF"
                        style={[s.input, s.textAreaSmall]}
                        multiline
                        textAlignVertical="top"
                      />
                    </View>

                    <Text style={s.fieldLabel}>Khmer Instructions</Text>
                    <View style={[s.inputWrap, s.textAreaWrap]}>
                      <TextInput
                        value={lesson.assignmentInstructionsKm}
                        onChangeText={(value) => updateLesson(lesson.id, 'assignmentInstructionsKm', value)}
                        placeholder="ការបកប្រែជាភាសាខ្មែរ"
                        placeholderTextColor="#9CA3AF"
                        style={[s.input, s.textAreaSmall]}
                        multiline
                        textAlignVertical="top"
                      />
                    </View>

                    <View style={s.scoreRow}>
                      <View style={s.durationWrap}>
                        <Text style={s.fieldLabel}>Max Score</Text>
                        <View style={s.inputWrap}>
                          <TextInput
                            value={String(lesson.assignmentMaxScore)}
                            onChangeText={(value) => {
                              const parsed = Number.parseInt(value, 10);
                              updateLesson(lesson.id, 'assignmentMaxScore', Number.isFinite(parsed) ? parsed : 100);
                            }}
                            placeholder="100"
                            placeholderTextColor="#9CA3AF"
                            style={s.inputFlex}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                      <View style={s.durationWrap}>
                        <Text style={s.fieldLabel}>Passing Score</Text>
                        <View style={s.inputWrap}>
                          <TextInput
                            value={String(lesson.assignmentPassingScore)}
                            onChangeText={(value) => {
                              const parsed = Number.parseInt(value, 10);
                              updateLesson(lesson.id, 'assignmentPassingScore', Number.isFinite(parsed) ? parsed : 80);
                            }}
                            placeholder="80"
                            placeholderTextColor="#9CA3AF"
                            style={s.inputFlex}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                    </View>

                    <Text style={s.fieldLabel}>Rubric (optional)</Text>
                    <View style={[s.inputWrap, s.textAreaWrap]}>
                      <TextInput
                        value={lesson.assignmentRubric}
                        onChangeText={(value) => updateLesson(lesson.id, 'assignmentRubric', value)}
                        placeholder="Scoring rubric or grading guideline..."
                        placeholderTextColor="#9CA3AF"
                        style={[s.input, s.textAreaSmall]}
                        multiline
                        textAlignVertical="top"
                      />
                    </View>
                  </>
                )}

                {isExerciseLesson && (
                  <>
                    <Text style={s.fieldLabel}>Exercise Language</Text>
                    <View style={s.exerciseLanguageRow}>
                      {['javascript', 'typescript', 'python', 'java'].map((languageOption) => {
                        const active = lesson.exerciseLanguage.toLowerCase() === languageOption;
                        return (
                          <TouchableOpacity
                            key={`${lesson.id}-${languageOption}`}
                            onPress={() => updateLesson(lesson.id, 'exerciseLanguage', languageOption)}
                            style={[s.exerciseLanguageChip, active && s.exerciseLanguageChipActive]}
                          >
                            <Text style={[s.exerciseLanguageChipText, active && s.exerciseLanguageChipTextActive]}>
                              {languageOption}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={s.fieldLabel}>Initial Code *</Text>
                    <View style={[s.inputWrap, s.textAreaWrap]}>
                      <TextInput
                        value={lesson.exerciseInitialCode}
                        onChangeText={(value) => updateLesson(lesson.id, 'exerciseInitialCode', value)}
                        placeholder="// Starter code"
                        placeholderTextColor="#9CA3AF"
                        style={[s.input, s.codeArea]}
                        multiline
                        textAlignVertical="top"
                        autoCapitalize="none"
                      />
                    </View>

                    <Text style={s.fieldLabel}>Solution Code *</Text>
                    <View style={[s.inputWrap, s.textAreaWrap]}>
                      <TextInput
                        value={lesson.exerciseSolutionCode}
                        onChangeText={(value) => updateLesson(lesson.id, 'exerciseSolutionCode', value)}
                        placeholder="// Reference solution"
                        placeholderTextColor="#9CA3AF"
                        style={[s.input, s.codeArea]}
                        multiline
                        textAlignVertical="top"
                        autoCapitalize="none"
                      />
                    </View>
                  </>
                )}

                {isDocumentLesson && (
                  <>
                    <Text style={s.fieldLabel}>Resources *</Text>
                    {lesson.resources.map((resource, resourceIndex) => (
                      <View key={resource.id} style={s.resourceBlock}>
                        <View style={s.resourceHeader}>
                          <Text style={s.resourceTitle}>Attachment {resourceIndex + 1}</Text>
                          <View style={s.resourceHeaderActions}>
                            <TouchableOpacity
                              onPress={() => moveDocumentResource(lesson.id, resource.id, 'up')}
                              disabled={resourceIndex === 0}
                              style={[s.resourceActionBtn, resourceIndex === 0 && s.btnDisabled]}
                            >
                              <Ionicons name="arrow-up-outline" size={14} color="#64748B" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => moveDocumentResource(lesson.id, resource.id, 'down')}
                              disabled={resourceIndex === lesson.resources.length - 1}
                              style={[s.resourceActionBtn, resourceIndex === lesson.resources.length - 1 && s.btnDisabled]}
                            >
                              <Ionicons name="arrow-down-outline" size={14} color="#64748B" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => uploadDocumentResourceFile(lesson.id, resource.id)}
                              style={s.resourceUploadBtn}
                              disabled={Boolean(uploadingResourceById[resource.id])}
                            >
                              {uploadingResourceById[resource.id] ? (
                                <ActivityIndicator size="small" color="#0EA5E9" />
                              ) : (
                                <>
                                  <Ionicons name="cloud-upload-outline" size={14} color="#0EA5E9" />
                                  <Text style={s.resourceUploadBtnText}>Upload</Text>
                                </>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity
                              disabled={lesson.resources.length <= 1}
                              onPress={() => removeDocumentResource(lesson.id, resource.id)}
                              style={[s.subEditorDeleteBtn, lesson.resources.length <= 1 && s.btnDisabled]}
                            >
                              <Ionicons name="trash-outline" size={14} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={s.inputWrap}>
                          <Ionicons name="document-attach-outline" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                          <TextInput
                            value={resource.title}
                            onChangeText={(value) => updateDocumentResourceField(lesson.id, resource.id, 'title', value)}
                            placeholder="Worksheet, chapter PDF, slides..."
                            placeholderTextColor="#9CA3AF"
                            style={s.inputFlex}
                          />
                        </View>

                        <View style={[s.inputWrap, { marginTop: 8 }]}>
                          <Ionicons name="link-outline" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                          <TextInput
                            value={resource.url}
                            onChangeText={(value) => updateDocumentResourceField(lesson.id, resource.id, 'url', value)}
                            placeholder="https://example.com/resource.pdf"
                            placeholderTextColor="#9CA3AF"
                            style={s.inputFlex}
                            autoCapitalize="none"
                          />
                        </View>

                        <View style={s.resourceMetaRow}>
                          <View style={s.resourceSelectGroup}>
                            <Text style={s.resourceMetaLabel}>Type</Text>
                            <View style={s.resourceChipRow}>
                              {(['FILE', 'LINK', 'VIDEO'] as const).map((resourceType) => {
                                const active = resource.type === resourceType;
                                return (
                                  <TouchableOpacity
                                    key={`${resource.id}-${resourceType}`}
                                    onPress={() => updateDocumentResourceField(lesson.id, resource.id, 'type', resourceType)}
                                    style={[s.resourceChip, active && s.resourceChipActive]}
                                  >
                                    <Text style={[s.resourceChipText, active && s.resourceChipTextActive]}>{resourceType}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>

                          <View style={s.resourceSelectGroup}>
                            <Text style={s.resourceMetaLabel}>Locale</Text>
                            <View style={s.resourceChipRow}>
                              {LANGUAGE_OPTIONS.map((language) => {
                                const active = resource.locale === language.key;
                                return (
                                  <TouchableOpacity
                                    key={`${resource.id}-${language.key}`}
                                    onPress={() => updateDocumentResourceField(lesson.id, resource.id, 'locale', language.key)}
                                    style={[s.resourceChip, active && s.resourceChipActive]}
                                  >
                                    <Text style={[s.resourceChipText, active && s.resourceChipTextActive]}>{language.label}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        </View>

                        <TouchableOpacity
                          onPress={() => setDocumentResourceDefault(lesson.id, resource.id)}
                          style={[s.defaultResourceBtn, resource.isDefault && s.defaultResourceBtnActive]}
                        >
                          <Ionicons
                            name={resource.isDefault ? 'checkmark-circle' : 'ellipse-outline'}
                            size={16}
                            color={resource.isDefault ? '#0369A1' : '#64748B'}
                          />
                          <Text style={[s.defaultResourceText, resource.isDefault && s.defaultResourceTextActive]}>
                            {resource.isDefault ? 'Default Resource' : 'Set as Default'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}

                    <TouchableOpacity style={s.subEditorAddBtn} onPress={() => addDocumentResource(lesson.id)}>
                      <Ionicons name="add" size={16} color="#0EA5E9" />
                      <Text style={s.subEditorAddText}>Add Resource</Text>
                    </TouchableOpacity>
                    <Text style={s.lessonTypeHelper}>Document lessons are publish-ready when one valid resource (or content fallback) exists.</Text>
                  </>
                )}

                {!isQuizLesson && !isAssignmentLesson && !isExerciseLesson && (
                  <>
                    <Text style={s.fieldLabel}>
                      {isTextLesson ? 'Reading Content *' : isDocumentLesson ? 'Lesson Notes (optional)' : 'Content (optional)'}
                    </Text>
                    <View style={[s.inputWrap, s.textAreaWrap]}>
                      <TextInput
                        value={lesson.content}
                        onChangeText={(value) => updateLesson(lesson.id, 'content', value)}
                        placeholder={
                          isTextLesson
                            ? 'Write the full lesson content here...'
                            : isDocumentLesson
                              ? 'Optional context shown with the document...'
                              : 'Lesson content notes...'
                        }
                        placeholderTextColor="#9CA3AF"
                        style={[s.input, s.textArea]}
                        multiline
                        textAlignVertical="top"
                      />
                    </View>
                  </>
                )}
              </View>
            );
          })}
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
  codeArea: {
    height: 140,
    paddingTop: 0,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  thumbnailActionsRow: {
    marginTop: 8,
    marginLeft: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thumbnailUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
  },
  thumbnailUploadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  thumbnailClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  thumbnailClearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
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

  // ── Languages ───────────────────────────────────────────────
  languageCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 14,
    marginTop: 8,
    marginBottom: 18,
  },
  languageOptionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  languageOption: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  languageOptionActive: {
    borderColor: '#0EA5E9',
    backgroundColor: '#E0F2FE',
  },
  languageOptionText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  languageOptionTextActive: {
    color: '#0369A1',
  },
  languageChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  languageChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  languageChipActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  languageChipRequired: {
    borderColor: '#0EA5E9',
    backgroundColor: '#E0F2FE',
  },
  languageChipText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  languageChipTextActive: {
    color: '#065F46',
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
  lessonHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lessonActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  lessonTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  lessonTypeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lessonTypeChipActive: {
    borderColor: '#0284C7',
    backgroundColor: '#E0F2FE',
  },
  lessonTypeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  lessonTypeChipTextActive: {
    color: '#075985',
  },
  lessonTypeHelper: {
    marginTop: 8,
    marginLeft: 4,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  subEditorBlock: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  subEditorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subEditorHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subEditorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  subEditorDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  subEditorAddBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7DD3FC',
    backgroundColor: '#F0F9FF',
  },
  subEditorAddText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  subEditorInlineAddBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#F8FAFC',
  },
  subEditorInlineAddText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  quizModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  quizModeChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quizModeChipActive: {
    borderColor: '#0284C7',
    backgroundColor: '#E0F2FE',
  },
  quizModeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  quizModeChipTextActive: {
    color: '#0369A1',
  },
  quizOptionRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quizCorrectToggle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizCorrectToggleActive: {
    borderColor: '#0284C7',
    backgroundColor: '#E0F2FE',
  },
  quizCorrectToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  quizCorrectToggleTextActive: {
    color: '#0369A1',
  },
  quizOptionInputWrap: {
    flex: 1,
  },
  quizOptionRemoveBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceBlock: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resourceHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resourceActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resourceUploadBtn: {
    minWidth: 78,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  resourceUploadBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  resourceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  resourceMetaRow: {
    marginTop: 10,
    gap: 8,
  },
  resourceSelectGroup: {
    gap: 6,
  },
  resourceMetaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  resourceChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  resourceChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resourceChipActive: {
    borderColor: '#0284C7',
    backgroundColor: '#E0F2FE',
  },
  resourceChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  resourceChipTextActive: {
    color: '#0369A1',
  },
  defaultResourceBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  defaultResourceBtnActive: {
    borderColor: '#0EA5E9',
    backgroundColor: '#E0F2FE',
  },
  defaultResourceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  defaultResourceTextActive: {
    color: '#0369A1',
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
  scoreRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  switchWrap: {
    alignItems: 'center',
    paddingTop: 14,
    gap: 10,
  },
  exerciseLanguageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exerciseLanguageChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exerciseLanguageChipActive: {
    borderColor: '#0EA5E9',
    backgroundColor: '#E0F2FE',
  },
  exerciseLanguageChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  exerciseLanguageChipTextActive: {
    color: '#0369A1',
  },

  // ── Disabled State ────────────────────────────────────────────
  btnDisabled: {
    opacity: 0.4,
  },
});
