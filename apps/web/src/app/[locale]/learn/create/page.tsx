'use client';

import { useTranslations } from 'next-intl';
import { useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  ArrowLeft,
  ArrowRight,
  Check,
  Image as ImageIcon,
  Video,
  Plus,
  Trash2,
  GripVertical,
  Save,
  X,
  Clock,
  Sparkles,
  UploadCloud,
  File,
  FileText,
  Languages,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { LEARN_SERVICE_URL } from '@/lib/api/config';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import {
  getCoverageTone,
  summarizeLocaleCoverage,
  type SupportedLocaleKey as CoverageLocaleKey,
  type LocalizedTextMap as CoverageLocalizedTextMap,
  type TranslationCoverageField,
} from '@/lib/course-translation-coverage';
import {
  COMMON_COURSE_LANGUAGE_OPTIONS,
  getCourseLanguageLabel,
  isValidCourseLocale,
  normalizeCourseLocale,
  normalizeCourseLocaleList,
} from '@/lib/course-locales';

// ============================================
// INTERFACES
// ============================================

interface Lesson {
  id: string;
  type: string;
  title: string;
  titleTranslations?: LocalizedTextMap;
  description: string;
  descriptionTranslations?: LocalizedTextMap;
  duration: number;
  isFree: boolean;
  content: string;
  contentTranslations?: LocalizedTextMap;
  videoUrl: string;
  resources?: {
    title: string;
    url: string;
    type: 'FILE' | 'LINK' | 'VIDEO';
    locale: SupportedLocaleKey;
    isDefault?: boolean;
  }[];
  textTracks?: {
    locale: SupportedLocaleKey;
    kind: 'SUBTITLE' | 'CAPTION' | 'TRANSCRIPT';
    label?: string;
    url?: string;
    content?: string;
    isDefault?: boolean;
  }[];
  
  // Polymorphic Payloads
  quiz?: {
    passingScore: number;
    questions: { question: string; explanation?: string; order: number; options: { text: string; isCorrect: boolean }[] }[];
  };
  assignment?: {
    maxScore: number;
    passingScore: number;
    instructions: string;
    instructionsTranslations?: LocalizedTextMap;
  };
  exercise?: {
    language: string;
    initialCode: string;
    solutionCode: string;
  };
}

interface Section {
  id: string;
  title: string;
  titleTranslations?: LocalizedTextMap;
  order: number;
  items: Lesson[];
}

interface CourseMutationResponse {
  message?: string;
  course?: {
    id?: string | number;
  };
  lesson?: {
    id?: string | number;
  };
}

type SupportedLocaleKey = CoverageLocaleKey;
type LocalizedTextMap = CoverageLocalizedTextMap;
interface LessonPublishIssue {
  sectionLabel: string;
  lessonLabel: string;
  reason: string;
}

const getTrimmedText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const normalizeTranslationMap = (translations?: LocalizedTextMap | null): LocalizedTextMap | undefined => {
  if (!translations) return undefined;

  const normalized = Object.entries(translations).reduce<LocalizedTextMap>((acc, [localeKey, rawValue]) => {
    const normalizedLocaleKey = normalizeCourseLocale(localeKey);
    if (!isValidCourseLocale(normalizedLocaleKey)) return acc;
    const value = getTrimmedText(rawValue);
    if (value) {
      acc[normalizedLocaleKey] = value;
    }
    return acc;
  }, {});

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const resolveLocalizedField = (
  baseValue: unknown,
  translations?: LocalizedTextMap | null
): { value: string; translations?: LocalizedTextMap } => {
  const normalizedTranslations = normalizeTranslationMap(translations);
  const base = getTrimmedText(baseValue);
  const fallback = base || normalizedTranslations?.en || normalizedTranslations?.km || Object.values(normalizedTranslations || {})[0] || '';

  if (!fallback) {
    return { value: '', translations: normalizedTranslations };
  }

  if (!normalizedTranslations) {
    return { value: fallback };
  }

  return { value: fallback, translations: normalizedTranslations };
};

// ============================================
// CONSTANTS
// ============================================

const FEED_SERVICE = LEARN_SERVICE_URL;
const READING_ITEM_TYPES = new Set(['ARTICLE', 'CASE_STUDY', 'PRACTICE']);
const FILE_ITEM_TYPES = new Set(['DOCUMENT', 'PDF', 'FILE']);
const MEDIA_ITEM_TYPES = new Set(['VIDEO', 'AUDIO']);
const LANGUAGE_OPTIONS: Array<{ key: SupportedLocaleKey; label: string; help?: string }> = COMMON_COURSE_LANGUAGE_OPTIONS;

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

const LEVELS = [
  { value: 'BEGINNER', label: 'Beginner', description: 'No prior knowledge needed' },
  { value: 'INTERMEDIATE', label: 'Intermediate', description: 'Some experience required' },
  { value: 'ADVANCED', label: 'Advanced', description: 'For experienced learners' },
  { value: 'ALL_LEVELS', label: 'All Levels', description: 'Suitable for everyone' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function CreateCoursePage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('common');
  const locale = (params?.locale as string) || 'en';

  // Wizard state
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Course data
  const [courseData, setCourseData] = useState({
    title: '',
    titleTranslations: {} as LocalizedTextMap,
    description: '',
    descriptionTranslations: {} as LocalizedTextMap,
    sourceLocale: 'en' as SupportedLocaleKey,
    supportedLocales: ['en'] as SupportedLocaleKey[],
    category: '',
    level: 'BEGINNER',
    thumbnail: '',
    tags: [] as string[],
  });

  // Sections & Lessons
  const [sections, setSections] = useState<Section[]>([
    { id: `sec-${Date.now()}`, title: 'Chapter 1: Introduction', titleTranslations: {}, order: 0, items: [] }
  ]);
  const [newTag, setNewTag] = useState('');
  const [customCourseLocale, setCustomCourseLocale] = useState('');

  const getAuthToken = useCallback(() => TokenManager.getAccessToken(), []);
  const updateCourseTranslation = useCallback((
    field: 'titleTranslations' | 'descriptionTranslations',
    translationLocale: SupportedLocaleKey,
    value: string
  ) => {
    setCourseData((previous) => ({
      ...previous,
      ...(translationLocale === previous.sourceLocale
        ? {
            [field === 'titleTranslations' ? 'title' : 'description']: value,
          }
        : {}),
      [field]: {
        ...(previous[field] || {}),
        [translationLocale]: value,
      },
    }));
  }, []);
  const toggleSupportedCourseLocale = useCallback((localeKey: SupportedLocaleKey) => {
    setCourseData((previous) => {
      const exists = previous.supportedLocales.includes(localeKey);
      const nextLocales = exists
        ? previous.supportedLocales.filter((currentLocale) => currentLocale !== localeKey)
        : [...previous.supportedLocales, localeKey];

      const ensuredLocales = nextLocales.includes(previous.sourceLocale)
        ? nextLocales
        : [previous.sourceLocale, ...nextLocales];

      return {
        ...previous,
        supportedLocales: normalizeCourseLocaleList(ensuredLocales, previous.sourceLocale),
      };
    });
  }, []);
  const updateSourceLocale = useCallback((nextSourceLocale: SupportedLocaleKey) => {
    setCourseData((previous) => {
      const nextSupportedLocales = previous.supportedLocales.includes(nextSourceLocale)
        ? previous.supportedLocales
        : [nextSourceLocale, ...previous.supportedLocales];

      const nextTitle = getTrimmedText(previous.titleTranslations?.[nextSourceLocale]) || previous.title;
      const nextDescription = getTrimmedText(previous.descriptionTranslations?.[nextSourceLocale]) || previous.description;

      return {
        ...previous,
        sourceLocale: nextSourceLocale,
        supportedLocales: normalizeCourseLocaleList(nextSupportedLocales, nextSourceLocale),
        title: nextTitle,
        description: nextDescription,
        titleTranslations: {
          ...(previous.titleTranslations || {}),
          [nextSourceLocale]: nextTitle,
        },
        descriptionTranslations: {
          ...(previous.descriptionTranslations || {}),
          [nextSourceLocale]: nextDescription,
        },
      };
    });
  }, []);
  const updateSourceField = useCallback((field: 'title' | 'description', value: string) => {
    setCourseData((previous) => ({
      ...previous,
      [field]: value,
      [field === 'title' ? 'titleTranslations' : 'descriptionTranslations']: {
        ...(previous[field === 'title' ? 'titleTranslations' : 'descriptionTranslations'] || {}),
        [previous.sourceLocale]: value,
      },
    }));
  }, []);
  const addCustomSupportedCourseLocale = useCallback(() => {
    const normalizedLocale = normalizeCourseLocale(customCourseLocale);
    if (!isValidCourseLocale(normalizedLocale)) return;

    setCourseData((previous) => ({
      ...previous,
      supportedLocales: normalizeCourseLocaleList(
        [...previous.supportedLocales, normalizedLocale],
        previous.sourceLocale
      ),
    }));
    setCustomCourseLocale('');
  }, [customCourseLocale]);

  // Validation
  const normalizedCourseTitle = resolveLocalizedField(courseData.title, courseData.titleTranslations).value;
  const normalizedCourseDescription = resolveLocalizedField(courseData.description, courseData.descriptionTranslations).value;

  const isStep1Valid = normalizedCourseTitle.length >= 5
    && normalizedCourseDescription.length >= 20
    && Boolean(courseData.category.trim());

  const sectionsForSubmission = sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => resolveLocalizedField(item.title, item.titleTranslations).value.length > 0),
  }));
  const hasCurriculumItems = sections.some((section) => section.items.length > 0);
  const lessonPublishIssues = useMemo<LessonPublishIssue[]>(() => (
    sections.flatMap((section, sectionIndex) => (
      section.items.flatMap((lesson, lessonIndex) => {
        const sectionLabel = resolveLocalizedField(section.title, section.titleTranslations).value || `Section ${sectionIndex + 1}`;
        const lessonLabel = resolveLocalizedField(lesson.title, lesson.titleTranslations).value || `Lesson ${lessonIndex + 1}`;
        const issues: LessonPublishIssue[] = [];

        if (!resolveLocalizedField(lesson.title, lesson.titleTranslations).value) {
          issues.push({
            sectionLabel,
            lessonLabel,
            reason: 'Lesson title is required.',
          });
        }

        if (!Number.isFinite(lesson.duration) || lesson.duration <= 0) {
          issues.push({
            sectionLabel,
            lessonLabel,
            reason: 'Duration must be greater than 0 minutes.',
          });
        }

        if (MEDIA_ITEM_TYPES.has(lesson.type) && getTrimmedText(lesson.videoUrl).length === 0) {
          issues.push({
            sectionLabel,
            lessonLabel,
            reason: `${lesson.type === 'AUDIO' ? 'Audio' : 'Video'} URL is required.`,
          });
        }

        if (READING_ITEM_TYPES.has(lesson.type)) {
          const localizedContent = resolveLocalizedField(lesson.content, lesson.contentTranslations).value;
          if (!localizedContent) {
            issues.push({
              sectionLabel,
              lessonLabel,
              reason: 'Text content is required for reading lessons.',
            });
          }
        }

        if (FILE_ITEM_TYPES.has(lesson.type) || lesson.type === 'IMAGE') {
          const normalizedResources = (lesson.resources || [])
            .map((resource) => ({
              ...resource,
              title: resource.title.trim(),
              url: resource.url.trim(),
            }))
            .filter((resource) => resource.title && resource.url);
          const hasDefaultResource = normalizedResources.some((resource) => Boolean(resource.isDefault));
          const hasLegacyLessonFile = getTrimmedText(lesson.content).length > 0;

          if (!hasDefaultResource && !hasLegacyLessonFile) {
            issues.push({
              sectionLabel,
              lessonLabel,
              reason: 'Document/file lessons need one default localized resource or a lesson file URL.',
            });
          }
        }

        if (lesson.type === 'QUIZ') {
          const hasValidQuestion = (lesson.quiz?.questions || []).some((question) => {
            const questionText = getTrimmedText(question.question);
            const normalizedOptions = question.options
              .map((option) => ({
                ...option,
                text: getTrimmedText(option.text),
              }))
              .filter((option) => option.text.length > 0);
            const hasCorrectOption = normalizedOptions.some((option) => option.isCorrect);

            return questionText.length > 0 && normalizedOptions.length >= 2 && hasCorrectOption;
          });

          if (!hasValidQuestion) {
            issues.push({
              sectionLabel,
              lessonLabel,
              reason: 'Quiz needs at least one question with 2+ options and a correct answer.',
            });
          }
        }

        if (lesson.type === 'ASSIGNMENT') {
          const instructions = resolveLocalizedField(
            lesson.assignment?.instructions,
            lesson.assignment?.instructionsTranslations
          ).value;
          if (!instructions) {
            issues.push({
              sectionLabel,
              lessonLabel,
              reason: 'Assignment instructions are required.',
            });
          }
        }

        if (lesson.type === 'EXERCISE') {
          const initialCode = getTrimmedText(lesson.exercise?.initialCode);
          const solutionCode = getTrimmedText(lesson.exercise?.solutionCode);
          if (!initialCode || !solutionCode) {
            issues.push({
              sectionLabel,
              lessonLabel,
              reason: 'Coding exercise requires both starter code and solution code.',
            });
          }
        }

        return issues;
      })
    ))
  ), [sections]);
  const isStep3Valid = hasCurriculumItems && lessonPublishIssues.length === 0;
  const translationCoverageByLocale = useMemo(() => {
    const buildLessonFields = (lesson: Lesson): TranslationCoverageField[] => ([
      { baseValue: lesson.title, translations: lesson.titleTranslations },
      { baseValue: lesson.description, translations: lesson.descriptionTranslations, required: false },
      { baseValue: lesson.content, translations: lesson.contentTranslations, required: false },
      lesson.assignment
        ? { baseValue: lesson.assignment.instructions, translations: lesson.assignment.instructionsTranslations }
        : null,
    ].filter(Boolean) as TranslationCoverageField[]);

    const courseFields: TranslationCoverageField[] = [
      { baseValue: courseData.title, translations: courseData.titleTranslations },
      { baseValue: courseData.description, translations: courseData.descriptionTranslations },
      ...sections.flatMap((section) => [
        { baseValue: section.title, translations: section.titleTranslations },
        ...section.items.flatMap((lesson) => buildLessonFields(lesson)),
      ]),
    ];

    return courseData.supportedLocales.map((localeKey) => ({
      locale: localeKey,
      label: getCourseLanguageLabel(localeKey),
      ...summarizeLocaleCoverage(courseFields, localeKey, courseData.sourceLocale),
    }));
  }, [courseData.description, courseData.descriptionTranslations, courseData.sourceLocale, courseData.supportedLocales, courseData.title, courseData.titleTranslations, sections]);
  const incompleteLocaleCoverage = translationCoverageByLocale.filter((coverage) => coverage.percent < 100);
  const availableCourseLanguageOptions = useMemo(() => {
    const seen = new Set<string>();
    return [
      ...LANGUAGE_OPTIONS,
      ...courseData.supportedLocales.map((localeKey) => ({
        key: localeKey,
        label: getCourseLanguageLabel(localeKey),
        help: 'Custom course language',
      })),
    ].filter((option) => {
      const normalizedKey = normalizeCourseLocale(option.key);
      if (seen.has(normalizedKey)) return false;
      seen.add(normalizedKey);
      return true;
    });
  }, [courseData.supportedLocales]);
  const additionalSupportedLocales = useMemo(
    () => courseData.supportedLocales.filter((localeKey) => localeKey !== 'en' && localeKey !== 'km'),
    [courseData.supportedLocales]
  );
  const lessonResourceLocales = useMemo(
    () => availableCourseLanguageOptions.filter((option) => courseData.supportedLocales.includes(option.key)),
    [availableCourseLanguageOptions, courseData.supportedLocales]
  );
  const sourceLanguageLabel = useMemo(
    () => getCourseLanguageLabel(courseData.sourceLocale),
    [courseData.sourceLocale]
  );

  const addSection = () => {
    setSections([
      ...sections,
      { id: `sec-${Date.now()}`, title: `Chapter ${sections.length + 1}`, titleTranslations: {}, order: sections.length, items: [] }
    ]);
  };

  const updateSectionTitle = (sIdx: number, title: string) => {
    const updated = [...sections];
    updated[sIdx].title = title;
    setSections(updated);
  };

  const updateSectionTranslation = (
    sIdx: number,
    translationLocale: SupportedLocaleKey,
    value: string
  ) => {
    const updated = [...sections];
    updated[sIdx].titleTranslations = {
      ...(updated[sIdx].titleTranslations || {}),
      [translationLocale]: value,
    };
    setSections(updated);
  };

  const removeSection = (sIdx: number) => {
    setSections(sections.filter((_, i) => i !== sIdx));
  };

  const addLesson = (sIdx: number, type: string = 'VIDEO') => {
    const updated = [...sections];
    updated[sIdx].items.push({
      id: `temp-${Date.now()}`,
      type,
      title: '',
      titleTranslations: {},
      description: '',
      descriptionTranslations: {},
      duration: 10,
      isFree: updated[sIdx].items.length === 0 && sIdx === 0,
      content: '',
      contentTranslations: {},
      videoUrl: '',
      resources: [],
      textTracks: [],
      ...(type === 'QUIZ' ? { quiz: { passingScore: 80, questions: [] } } : {}),
      ...(type === 'ASSIGNMENT' ? { assignment: { maxScore: 100, passingScore: 80, instructions: '', instructionsTranslations: {} } } : {}),
      ...(type === 'EXERCISE' ? { exercise: { language: 'java', initialCode: '// Write code here', solutionCode: '' } } : {}),
      ...(type === 'IMAGE' || FILE_ITEM_TYPES.has(type) ? { content: '' } : {}),
    });
    setSections(updated);
  };

  const updateLesson = (sIdx: number, lIdx: number, field: keyof Lesson, value: any) => {
    const updated = [...sections];
    updated[sIdx].items[lIdx] = { ...updated[sIdx].items[lIdx], [field]: value };
    setSections(updated);
  };

  const updateLessonTranslation = (
    sIdx: number,
    lIdx: number,
    field: 'titleTranslations' | 'descriptionTranslations' | 'contentTranslations',
    translationLocale: SupportedLocaleKey,
    value: string
  ) => {
    const updated = [...sections];
    updated[sIdx].items[lIdx] = {
      ...updated[sIdx].items[lIdx],
      [field]: {
        ...(updated[sIdx].items[lIdx][field] || {}),
        [translationLocale]: value,
      },
    };
    setSections(updated);
  };

  const updateAssignmentTranslation = (
    sIdx: number,
    lIdx: number,
    translationLocale: SupportedLocaleKey,
    value: string
  ) => {
    const updated = [...sections];
    const currentAssignment = updated[sIdx].items[lIdx].assignment;
    if (!currentAssignment) return;

    updated[sIdx].items[lIdx].assignment = {
      ...currentAssignment,
      instructionsTranslations: {
        ...(currentAssignment.instructionsTranslations || {}),
        [translationLocale]: value,
      },
    };
    setSections(updated);
  };

  const updateLessonTextTrack = (
    sIdx: number,
    lIdx: number,
    localeKey: SupportedLocaleKey,
    kind: 'SUBTITLE' | 'CAPTION' | 'TRANSCRIPT',
    field: 'url' | 'content',
    value: string
  ) => {
    const updated = [...sections];
    const lesson = updated[sIdx].items[lIdx];
    const tracks = [...(lesson.textTracks || [])];
    const trackIndex = tracks.findIndex((track) => track.locale === localeKey && track.kind === kind);
    const label = getCourseLanguageLabel(localeKey);
    const nextTrack = {
      ...(trackIndex >= 0 ? tracks[trackIndex] : { locale: localeKey, kind, label, isDefault: localeKey === 'en' }),
      [field]: value,
    };

    if (trackIndex >= 0) {
      tracks[trackIndex] = nextTrack;
    } else {
      tracks.push(nextTrack);
    }

    lesson.textTracks = tracks.filter((track) => (track.url || '').trim() || (track.content || '').trim());
    setSections(updated);
  };

  const addLessonResource = (sIdx: number, lIdx: number) => {
    const updated = [...sections];
    const lesson = updated[sIdx].items[lIdx];
    lesson.resources = [
      ...(lesson.resources || []),
      {
        title: '',
        url: '',
        type: 'FILE',
        locale: courseData.sourceLocale,
        isDefault: (lesson.resources?.length || 0) === 0,
      },
    ];
    setSections(updated);
  };

  const updateLessonResource = (
    sIdx: number,
    lIdx: number,
    resourceIdx: number,
    field: 'title' | 'url' | 'type' | 'locale' | 'isDefault',
    value: string | boolean
  ) => {
    const updated = [...sections];
    const lesson = updated[sIdx].items[lIdx];
    const resources = [...(lesson.resources || [])];
    resources[resourceIdx] = {
      ...resources[resourceIdx],
      [field]: value,
    } as NonNullable<Lesson['resources']>[number];

    if (field === 'isDefault' && value === true) {
      lesson.resources = resources.map((resource, index) => ({
        ...resource,
        isDefault: index === resourceIdx,
      }));
    } else {
      lesson.resources = resources;
    }

    setSections(updated);
  };

  const removeLessonResource = (sIdx: number, lIdx: number, resourceIdx: number) => {
    const updated = [...sections];
    const lesson = updated[sIdx].items[lIdx];
    const nextResources = (lesson.resources || []).filter((_, index) => index !== resourceIdx);
    if (nextResources.length > 0 && !nextResources.some((resource) => resource.isDefault)) {
      nextResources[0].isDefault = true;
    }
    lesson.resources = nextResources;
    setSections(updated);
  };

  const removeLesson = (sIdx: number, lIdx: number) => {
    const updated = [...sections];
    updated[sIdx].items = updated[sIdx].items.filter((_, i) => i !== lIdx);
    setSections(updated);
  };

  // Add tag
  const addTag = () => {
    if (newTag.trim() && !courseData.tags.includes(newTag.trim())) {
      setCourseData({
        ...courseData,
        tags: [...courseData.tags, newTag.trim()],
      });
      setNewTag('');
    }
  };

  // Remove tag
  const removeTag = (tag: string) => {
    setCourseData({
      ...courseData,
      tags: courseData.tags.filter(t => t !== tag),
    });
  };

  // NEW: Handle R2 File Upload
  const handleFileUpload = async (sIdx: number, lIdx: number, file: File, field: 'videoUrl' | 'content') => {
    const token = getAuthToken();
    if (!token) return;

    try {
      // 1. Get presigned URL
      const response = await fetch(`${LEARN_SERVICE_URL.replace('/courses', '')}/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          folder: 'curriculum'
        })
      });

      const { data, success } = await response.json();
      if (!success) throw new Error('Failed to get upload URL');

      // 2. Upload to R2 directly
      await fetch(data.presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type
        },
        body: file
      });

      // 3. Update lesson state with public URL
      updateLesson(sIdx, lIdx, field, data.publicUrl);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('File upload failed. Please check your connection.');
    }
  };

  const readResponseBody = useCallback(async (response: Response) => {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  }, []);

  const createCourseWithLessons = useCallback(async (publishNow: boolean): Promise<string | null> => {
    const token = getAuthToken();
    if (!token) {
      router.push(`/${locale}/login`);
      return null;
    }

    const normalizedCourseTitleInput = resolveLocalizedField(courseData.title, courseData.titleTranslations);
    const normalizedCourseDescriptionInput = resolveLocalizedField(courseData.description, courseData.descriptionTranslations);

    const normalizedCourseData = {
      ...courseData,
      title: normalizedCourseTitleInput.value,
      description: normalizedCourseDescriptionInput.value,
      titleTranslations: normalizedCourseTitleInput.translations,
      descriptionTranslations: normalizedCourseDescriptionInput.translations,
      sourceLocale: courseData.sourceLocale,
      supportedLocales: normalizeCourseLocaleList(courseData.supportedLocales, courseData.sourceLocale),
      category: courseData.category.trim(),
      thumbnail: courseData.thumbnail.trim(),
      tags: courseData.tags.map(tag => tag.trim()).filter(Boolean),
    };

    const createCourseResponse = await fetch(`${FEED_SERVICE}/courses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(normalizedCourseData),
    });

    const createCourseData = (await readResponseBody(createCourseResponse)) as CourseMutationResponse;
    const courseId = String(createCourseData.course?.id ?? '');
    if (!createCourseResponse.ok || !courseId) {
      const message = createCourseData.message || 'Failed to create course';
      throw new Error(message);
    }

    for (let s = 0; s < sectionsForSubmission.length; s += 1) {
      const section = sectionsForSubmission[s];
      
      const createSectionResponse = await fetch(`${FEED_SERVICE}/courses/${courseId}/sections`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: resolveLocalizedField(section.title, section.titleTranslations).value || `Chapter ${s + 1}`,
          titleTranslations: resolveLocalizedField(section.title, section.titleTranslations).translations,
          order: s,
        }),
      });
      
      const sectionData = await readResponseBody(createSectionResponse);
      const sectionId = sectionData.section?.id;

      if (!sectionId) {
         throw new Error(`Failed to create section ${s + 1}`);
      }

      for (let i = 0; i < section.items.length; i += 1) {
        const lesson = section.items[i];
        const lessonTitleInput = resolveLocalizedField(lesson.title, lesson.titleTranslations);
        const lessonDescriptionInput = resolveLocalizedField(lesson.description, lesson.descriptionTranslations);
        const lessonContentInput = resolveLocalizedField(lesson.content, lesson.contentTranslations);
        const assignmentInstructionsInput = lesson.assignment
          ? resolveLocalizedField(lesson.assignment.instructions, lesson.assignment.instructionsTranslations)
          : null;

        const createLessonResponse = await fetch(`${FEED_SERVICE}/courses/sections/${sectionId}/items`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: lessonTitleInput.value,
            titleTranslations: lessonTitleInput.translations,
            type: lesson.type,
            description: lessonDescriptionInput.value,
            descriptionTranslations: lessonDescriptionInput.translations,
            duration: lesson.duration,
            isFree: lesson.isFree,
            content: lessonContentInput.value,
            contentTranslations: lessonContentInput.translations,
            videoUrl: lesson.videoUrl.trim(),
            resources: (lesson.resources || [])
              .map((resource) => ({
                ...resource,
                title: resource.title.trim(),
                url: resource.url.trim(),
              }))
              .filter((resource) => resource.title && resource.url),
            textTracks: lesson.textTracks,
            order: i + 1,
            quiz: lesson.quiz,
            assignment: lesson.assignment
              ? {
                  ...lesson.assignment,
                  instructions: assignmentInstructionsInput?.value || '',
                  instructionsTranslations: assignmentInstructionsInput?.translations,
                }
              : undefined,
            exercise: lesson.exercise,
          }),
        });

        const createLessonData = (await readResponseBody(createLessonResponse)) as CourseMutationResponse;
        if (!createLessonResponse.ok) {
          const message = createLessonData.message || `Failed to create item ${i + 1}`;
          throw new Error(message);
        }
      }
    }

    if (publishNow) {
      if (!hasCurriculumItems) {
        throw new Error('Add at least one lesson before publishing');
      }
      if (lessonPublishIssues.length > 0) {
        throw new Error('Complete all lesson requirements before publishing');
      }

      const publishResponse = await fetch(`${FEED_SERVICE}/courses/${courseId}/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const publishData = (await readResponseBody(publishResponse)) as CourseMutationResponse;
      if (!publishResponse.ok) {
        const message = publishData.message || 'Failed to publish course';
        throw new Error(message);
      }
    }

    return courseId;
  }, [courseData, getAuthToken, hasCurriculumItems, lessonPublishIssues.length, locale, readResponseBody, router, sectionsForSubmission]);

  // Save as draft
  const saveDraft = async () => {
    try {
      setSaving(true);
      const courseId = await createCourseWithLessons(false);
      if (!courseId) return;
      alert('Course saved as draft!');
      router.push(`/${locale}/learn/course/${courseId}`);
    } catch (err: any) {
      console.error('Error saving course:', err);
      alert(err?.message || 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  // Publish course
  const publishCourse = async () => {
    try {
      if (lessonPublishIssues.length > 0 && typeof window !== 'undefined') {
        const message = [
          'Please complete these lesson requirements before publishing:',
          ...lessonPublishIssues.slice(0, 8).map((issue) => `- ${issue.sectionLabel} -> ${issue.lessonLabel}: ${issue.reason}`),
        ].join('\n');
        window.alert(message);
        return;
      }

      if (incompleteLocaleCoverage.length > 0 && typeof window !== 'undefined') {
        const message = [
          'Some supported languages are still incomplete:',
          ...incompleteLocaleCoverage.map((coverage) => `- ${coverage.label}: ${coverage.percent}% complete`),
          '',
          'Publish anyway? Learners in those languages may see fallback text.',
        ].join('\n');

        if (!window.confirm(message)) {
          return;
        }
      }

      setPublishing(true);
      const courseId = await createCourseWithLessons(true);
      if (!courseId) return;
      alert('Course published successfully!');
      router.push(`/${locale}/learn/course/${courseId}`);
    } catch (err: any) {
      console.error('Error publishing course:', err);
      alert(err?.message || 'Failed to publish course');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
      <UnifiedNavigation />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/learn`}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create a Course</h1>
              <p className="text-sm text-gray-500">Share your knowledge with the world</p>
            </div>
          </div>

          <button
            onClick={saveDraft}
            disabled={saving || !isStep1Valid}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[
            { num: 1, label: 'Basic Info' },
            { num: 2, label: 'Media & Tags' },
            { num: 3, label: 'Lessons' },
            { num: 4, label: 'Review' },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <button
                onClick={() => setStep(s.num)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  step === s.num
                    ? 'bg-amber-500 text-white'
                    : step > s.num
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                }`}
              >
                {step > s.num ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="w-5 h-5 flex items-center justify-center text-sm font-medium">{s.num}</span>
                )}
                <span className="hidden sm:inline text-sm font-medium">{s.label}</span>
              </button>
              {i < 3 && <div className="w-8 sm:w-16 h-0.5 bg-gray-200 mx-2" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Source Title *
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  This is the main fallback title used for your selected source language. English/Khmer fields below store localized versions.
                </p>
                <input
                  type="text"
                  value={courseData.title}
                  onChange={(e) => updateSourceField('title', e.target.value)}
                  placeholder={`Write the main title in ${sourceLanguageLabel}`}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  maxLength={100}
                />
                <p className="text-xs text-gray-400 mt-1">{courseData.title.length}/100 characters</p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                      English Title {courseData.sourceLocale === 'en' ? '(Source)' : ''}
                    </label>
                    <input
                      type="text"
                      value={courseData.titleTranslations.en || ''}
                      onChange={(event) => updateCourseTranslation('titleTranslations', 'en', event.target.value)}
                      placeholder="English translation"
                      className="w-full px-3 py-2 border border-blue-200 bg-blue-50/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                      Khmer Title {courseData.sourceLocale === 'km' ? '(Source)' : ''}
                    </label>
                    <input
                      type="text"
                      value={courseData.titleTranslations.km || ''}
                      onChange={(event) => updateCourseTranslation('titleTranslations', 'km', event.target.value)}
                      placeholder="ចំណងជើងជាភាសាខ្មែរ"
                      className="w-full px-3 py-2 border border-emerald-200 bg-emerald-50/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      maxLength={100}
                    />
                  </div>
                </div>
                {additionalSupportedLocales.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {additionalSupportedLocales.map((localeKey) => (
                      <div key={`course-title-${localeKey}`}>
                        <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                          {getCourseLanguageLabel(localeKey)} Title {courseData.sourceLocale === localeKey ? '(Source)' : ''}
                        </label>
                        <input
                          type="text"
                          value={courseData.titleTranslations[localeKey] || ''}
                          onChange={(event) => updateCourseTranslation('titleTranslations', localeKey, event.target.value)}
                          placeholder={`${getCourseLanguageLabel(localeKey)} translation`}
                          className="w-full px-3 py-2 border border-violet-200 bg-violet-50/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                          maxLength={100}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Source Description *
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Write the original description once, then add translations below for multilingual learners.
                </p>
                <textarea
                  value={courseData.description}
                  onChange={(e) => updateSourceField('description', e.target.value)}
                  placeholder={`Write the main description in ${sourceLanguageLabel}`}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  maxLength={2000}
                />
                <p className="text-xs text-gray-400 mt-1">{courseData.description.length}/2000 characters (minimum 20)</p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                      English Description {courseData.sourceLocale === 'en' ? '(Source)' : ''}
                    </label>
                    <textarea
                      value={courseData.descriptionTranslations.en || ''}
                      onChange={(event) => updateCourseTranslation('descriptionTranslations', 'en', event.target.value)}
                      placeholder="English description"
                      rows={3}
                      className="w-full px-3 py-2 border border-blue-200 bg-blue-50/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                      Khmer Description {courseData.sourceLocale === 'km' ? '(Source)' : ''}
                    </label>
                    <textarea
                      value={courseData.descriptionTranslations.km || ''}
                      onChange={(event) => updateCourseTranslation('descriptionTranslations', 'km', event.target.value)}
                      placeholder="សេចក្ដីពិពណ៌នាជាភាសាខ្មែរ"
                      rows={3}
                      className="w-full px-3 py-2 border border-emerald-200 bg-emerald-50/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y text-sm"
                    />
                  </div>
                </div>
                {additionalSupportedLocales.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {additionalSupportedLocales.map((localeKey) => (
                      <div key={`course-description-${localeKey}`}>
                        <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                          {getCourseLanguageLabel(localeKey)} Description {courseData.sourceLocale === localeKey ? '(Source)' : ''}
                        </label>
                        <textarea
                          value={courseData.descriptionTranslations[localeKey] || ''}
                          onChange={(event) => updateCourseTranslation('descriptionTranslations', localeKey, event.target.value)}
                          placeholder={`${getCourseLanguageLabel(localeKey)} description`}
                          rows={3}
                          className="w-full px-3 py-2 border border-violet-200 bg-violet-50/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Category *
                  </label>
                  <select
                    value={courseData.category}
                    onChange={(e) => setCourseData({ ...courseData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Level
                  </label>
                  <select
                    value={courseData.level}
                    onChange={(e) => setCourseData({ ...courseData, level: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    {LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Source Language
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      This is the original authoring language of the course. The Source Title and Source Description fields are synced with this language.
                    </p>
                  </div>
                  <Languages className="w-5 h-5 text-sky-500 flex-shrink-0" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableCourseLanguageOptions.map((languageOption) => (
                    <button
                      key={languageOption.key}
                      type="button"
                      onClick={() => updateSourceLocale(languageOption.key)}
                      className={`rounded-lg border px-4 py-3 text-left transition ${
                        courseData.sourceLocale === languageOption.key
                          ? 'border-sky-500 bg-white dark:bg-gray-900 shadow-sm'
                          : 'border-sky-100 bg-white dark:bg-gray-900/80 hover:border-sky-300'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{languageOption.label}</p>
                      <p className="mt-1 text-xs text-gray-500">{languageOption.help}</p>
                    </button>
                  ))}
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Available Course Languages
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    For text-based courses, each checked language should eventually have translated titles, descriptions, section names, and lesson content.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableCourseLanguageOptions.map((languageOption) => {
                      const isActive = courseData.supportedLocales.includes(languageOption.key);
                      const isRequired = courseData.sourceLocale === languageOption.key;
                      return (
                        <button
                          key={languageOption.key}
                          type="button"
                          onClick={() => {
                            if (!isRequired) {
                              toggleSupportedCourseLocale(languageOption.key);
                            }
                          }}
                          className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                            isActive
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 hover:border-gray-300 dark:border-gray-700'
                          } ${isRequired ? 'cursor-default' : ''}`}
                        >
                          {languageOption.label}{isRequired ? ' • source' : ''}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={customCourseLocale}
                      onChange={(event) => setCustomCourseLocale(event.target.value)}
                      placeholder="Add another locale, e.g. es, fr, pt-BR"
                      className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={addCustomSupportedCourseLocale}
                      className="rounded-lg border border-sky-200 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50"
                    >
                      Add Locale
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Translation Coverage
                    </label>
                    <p className="text-xs text-gray-500">
                      This tells you how complete each learner-facing language is across the current course draft.
                    </p>
                  </div>
                  <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0" />
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {translationCoverageByLocale.map((coverage) => {
                    const tone = getCoverageTone(coverage.percent);
                    return (
                      <div key={coverage.locale} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{coverage.label}</p>
                            <p className="text-xs text-gray-500">
                              {coverage.completed}/{coverage.total} localized fields ready
                            </p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${tone.badge}`}>
                            {coverage.percent}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Media & Tags */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Course Thumbnail
                </label>
                <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center hover:border-amber-300 transition-colors">
                  {courseData.thumbnail ? (
                    <div className="relative inline-block">
                      <img 
                        src={courseData.thumbnail} 
                        alt="Thumbnail" 
                        className="max-w-xs rounded-lg"
                      />
                      <button
                        onClick={() => setCourseData({ ...courseData, thumbnail: '' })}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" aria-hidden="true" />
                      <p className="text-gray-500 mb-2">Enter thumbnail URL or upload</p>
                      <input
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        onChange={(e) => setCourseData({ ...courseData, thumbnail: e.target.value })}
                        className="w-full max-w-md mx-auto px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Tags (helps students find your course)
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {courseData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm flex items-center gap-1"
                    >
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-amber-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag..."
                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    onClick={addTag}
                    disabled={!newTag.trim()}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Lessons */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Course Curriculum</h3>
                  <p className="text-sm text-gray-500">
                    {sections.length} section{sections.length !== 1 ? 's' : ''} • {sections.reduce((acc, s) => acc + s.items.length, 0)} items
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {translationCoverageByLocale.map((coverage) => {
                      const tone = getCoverageTone(coverage.percent);
                      return (
                        <span key={coverage.locale} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}>
                          {coverage.label}: {coverage.percent}%
                        </span>
                      );
                    })}
                  </div>
                </div>
                <button onClick={addSection} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                  <Plus className="w-4 h-4" /> Add Section
                </button>
              </div>

              {sections.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                  <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 mb-4">Your curriculum is empty. Start by adding a section!</p>
                  <button onClick={addSection} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                    Add First Section
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {sections.map((section, sIdx) => (
                    <div key={section.id} className="bg-white dark:bg-gray-900 border-2 border-gray-100 rounded-xl shadow-sm overflow-hidden">
                      {/* Section Header */}
                      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-b border-gray-100 flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                            <h4 className="font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">Section {sIdx + 1}:</h4>
                            <input
                              type="text"
                              value={section.title}
                              onChange={(e) => updateSectionTitle(sIdx, e.target.value)}
                              placeholder="e.g., Introduction"
                              className="flex-1 max-w-sm px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium bg-white dark:bg-gray-900"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8">
                            <input
                              type="text"
                              value={section.titleTranslations?.en || ''}
                              onChange={(event) => updateSectionTranslation(sIdx, 'en', event.target.value)}
                              placeholder="Section title (English)"
                              className="px-2.5 py-1.5 border border-blue-200 bg-blue-50/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                            />
                            <input
                              type="text"
                              value={section.titleTranslations?.km || ''}
                              onChange={(event) => updateSectionTranslation(sIdx, 'km', event.target.value)}
                              placeholder="ចំណងជើងផ្នែក (Khmer)"
                              className="px-2.5 py-1.5 border border-emerald-200 bg-emerald-50/30 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                            />
                          </div>
                          {additionalSupportedLocales.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8">
                              {additionalSupportedLocales.map((localeKey) => (
                                <input
                                  key={`${section.id}-title-${localeKey}`}
                                  type="text"
                                  value={section.titleTranslations?.[localeKey] || ''}
                                  onChange={(event) => updateSectionTranslation(sIdx, localeKey, event.target.value)}
                                  placeholder={`Section title (${getCourseLanguageLabel(localeKey)})`}
                                  className="px-2.5 py-1.5 border border-violet-200 bg-violet-50/30 rounded focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <button onClick={() => removeSection(sIdx)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>

                      {/* Section Items */}
                      <div className="p-4 space-y-4">
                        {section.items.map((lesson, index) => (
                          <div key={lesson.id} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-white dark:bg-gray-900 relative hover:border-amber-200 transition-colors">
                            <div className="flex items-start gap-4">
                              <div className="flex flex-col items-center gap-2 text-gray-400 mt-2">
                                <GripVertical className="w-4 h-4 cursor-move" />
                                <span className="text-xs font-bold text-gray-300">{index + 1}</span>
                              </div>

                              <div className="flex-1 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className={`px-2 py-1 text-[10px] font-bold rounded-full tracking-wider uppercase ${
                                    lesson.type === 'VIDEO' ? 'bg-amber-100 text-amber-700' :
                                    lesson.type === 'AUDIO' ? 'bg-cyan-100 text-cyan-700' :
                                    lesson.type === 'ARTICLE' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' :
                                    lesson.type === 'CASE_STUDY' ? 'bg-orange-100 text-orange-700' :
                                    lesson.type === 'PRACTICE' ? 'bg-emerald-100 text-emerald-700' :
                                    FILE_ITEM_TYPES.has(lesson.type) ? 'bg-indigo-100 text-indigo-700' :
                                    lesson.type === 'IMAGE' ? 'bg-pink-100 text-pink-700' :
                                    lesson.type === 'QUIZ' ? 'bg-blue-100 text-blue-700' :
                                    lesson.type === 'ASSIGNMENT' ? 'bg-indigo-100 text-indigo-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>{lesson.type}</span>
                                  
                                  <button onClick={() => removeLesson(sIdx, index)} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>

                                <input
                                  type="text"
                                  value={lesson.title}
                                  onChange={(e) => updateLesson(sIdx, index, 'title', e.target.value)}
                                  placeholder="Item Title"
                                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={lesson.titleTranslations?.en || ''}
                                    onChange={(event) => updateLessonTranslation(sIdx, index, 'titleTranslations', 'en', event.target.value)}
                                    placeholder="Item title (English)"
                                    className="px-3 py-2 border border-blue-200 bg-blue-50/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                                  />
                                  <input
                                    type="text"
                                    value={lesson.titleTranslations?.km || ''}
                                    onChange={(event) => updateLessonTranslation(sIdx, index, 'titleTranslations', 'km', event.target.value)}
                                    placeholder="ចំណងជើងមេរៀន (Khmer)"
                                    className="px-3 py-2 border border-emerald-200 bg-emerald-50/30 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                                  />
                                </div>
                                {additionalSupportedLocales.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {additionalSupportedLocales.map((localeKey) => (
                                      <input
                                        key={`${lesson.id}-title-${localeKey}`}
                                        type="text"
                                        value={lesson.titleTranslations?.[localeKey] || ''}
                                        onChange={(event) => updateLessonTranslation(sIdx, index, 'titleTranslations', localeKey, event.target.value)}
                                        placeholder={`Item title (${getCourseLanguageLabel(localeKey)})`}
                                        className="px-3 py-2 border border-violet-200 bg-violet-50/30 rounded focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs"
                                      />
                                    ))}
                                  </div>
                                )}

                                {READING_ITEM_TYPES.has(lesson.type) ? (
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500">
                                      {lesson.type === 'CASE_STUDY' ? 'Case Study Content' : lesson.type === 'PRACTICE' ? 'Practice Instructions' : 'Article Content'} (Rich Text Editor Disabled - Using Plaintext)
                                    </label>
                                    <textarea
                                      value={lesson.content}
                                      onChange={(e) => updateLesson(sIdx, index, 'content', e.target.value)}
                                      placeholder={lesson.type === 'CASE_STUDY' ? 'Write the scenario, context, and discussion prompts...' : lesson.type === 'PRACTICE' ? 'Write the steps learners should practice...' : 'Write your article here...'}
                                      rows={5}
                                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y text-sm font-sans"
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <textarea
                                        value={lesson.contentTranslations?.en || ''}
                                        onChange={(event) => updateLessonTranslation(sIdx, index, 'contentTranslations', 'en', event.target.value)}
                                        placeholder={`${lesson.type === 'CASE_STUDY' ? 'Case study' : lesson.type === 'PRACTICE' ? 'Practice' : 'Article'} content (English)`}
                                        rows={3}
                                        className="px-3 py-2 border border-blue-200 bg-blue-50/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y text-xs"
                                      />
                                      <textarea
                                        value={lesson.contentTranslations?.km || ''}
                                        onChange={(event) => updateLessonTranslation(sIdx, index, 'contentTranslations', 'km', event.target.value)}
                                        placeholder="មាតិកាជាភាសាខ្មែរ"
                                        rows={3}
                                        className="px-3 py-2 border border-emerald-200 bg-emerald-50/30 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y text-xs"
                                      />
                                    </div>
                                    {additionalSupportedLocales.length > 0 && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {additionalSupportedLocales.map((localeKey) => (
                                          <textarea
                                            key={`${lesson.id}-content-${localeKey}`}
                                            value={lesson.contentTranslations?.[localeKey] || ''}
                                            onChange={(event) => updateLessonTranslation(sIdx, index, 'contentTranslations', localeKey, event.target.value)}
                                            placeholder={`${getCourseLanguageLabel(localeKey)} content`}
                                            rows={3}
                                            className="px-3 py-2 border border-violet-200 bg-violet-50/30 rounded focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y text-xs"
                                          />
                                        ))}
                                      </div>
                                    )}
                                    <p className="text-[10px] text-amber-600">Note: Run `npm install react-quill` in your terminal to enable the WYSIWYG editor here.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <textarea
                                      value={lesson.description}
                                      onChange={(e) => updateLesson(sIdx, index, 'description', e.target.value)}
                                      placeholder="Short description (optional)"
                                      rows={2}
                                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none text-sm"
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <textarea
                                        value={lesson.descriptionTranslations?.en || ''}
                                        onChange={(event) => updateLessonTranslation(sIdx, index, 'descriptionTranslations', 'en', event.target.value)}
                                        placeholder="Description (English)"
                                        rows={2}
                                        className="px-3 py-2 border border-blue-200 bg-blue-50/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-xs"
                                      />
                                      <textarea
                                        value={lesson.descriptionTranslations?.km || ''}
                                        onChange={(event) => updateLessonTranslation(sIdx, index, 'descriptionTranslations', 'km', event.target.value)}
                                        placeholder="សេចក្ដីពិពណ៌នា (Khmer)"
                                        rows={2}
                                        className="px-3 py-2 border border-emerald-200 bg-emerald-50/30 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-xs"
                                      />
                                    </div>
                                    {additionalSupportedLocales.length > 0 && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {additionalSupportedLocales.map((localeKey) => (
                                          <textarea
                                            key={`${lesson.id}-description-${localeKey}`}
                                            value={lesson.descriptionTranslations?.[localeKey] || ''}
                                            onChange={(event) => updateLessonTranslation(sIdx, index, 'descriptionTranslations', localeKey, event.target.value)}
                                            placeholder={`Description (${getCourseLanguageLabel(localeKey)})`}
                                            rows={2}
                                            className="px-3 py-2 border border-violet-200 bg-violet-50/30 rounded focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none text-xs"
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {(lesson.type === 'VIDEO' || lesson.type === 'AUDIO') && (
                                  <div className="space-y-2">
                                    <div className="flex gap-2">
                                      <input
                                        type="url"
                                        value={lesson.videoUrl || ''}
                                        onChange={(e) => updateLesson(sIdx, index, 'videoUrl', e.target.value)}
                                        placeholder={lesson.type === 'AUDIO' ? 'Audio URL (MP3, podcast, or hosted audio)' : 'Video URL (e.g., https://youtube.com/...)'}
                                        className="flex-1 px-3 py-2 border border-blue-200 bg-blue-50/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                      />
                                      <label className="cursor-pointer flex items-center justify-center p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors" title={lesson.type === 'AUDIO' ? 'Upload Audio' : 'Upload Video'}>
                                        <UploadCloud className="w-5 h-5" />
                                        <input type="file" className="hidden" accept={lesson.type === 'AUDIO' ? 'audio/*' : 'video/*'} onChange={(e) => e.target.files?.[0] && handleFileUpload(sIdx, index, e.target.files[0], 'videoUrl')} />
                                      </label>
                                    </div>
                                    {lesson.videoUrl && (
                                      <p className="text-[10px] text-gray-500 truncate">Current: {lesson.videoUrl}</p>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <input
                                        type="url"
                                        value={lesson.textTracks?.find((track) => track.locale === 'en' && track.kind === 'SUBTITLE')?.url || ''}
                                        onChange={(event) => updateLessonTextTrack(sIdx, index, 'en', 'SUBTITLE', 'url', event.target.value)}
                                        placeholder="English captions URL (.vtt)"
                                        className="px-3 py-2 border border-blue-200 bg-blue-50/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                                      />
                                      <input
                                        type="url"
                                        value={lesson.textTracks?.find((track) => track.locale === 'km' && track.kind === 'SUBTITLE')?.url || ''}
                                        onChange={(event) => updateLessonTextTrack(sIdx, index, 'km', 'SUBTITLE', 'url', event.target.value)}
                                        placeholder="Khmer captions URL (.vtt)"
                                        className="px-3 py-2 border border-emerald-200 bg-emerald-50/30 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                                      />
                                    </div>
                                    {additionalSupportedLocales.length > 0 && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {additionalSupportedLocales.map((localeKey) => (
                                          <input
                                            key={`${lesson.id}-subtitle-${localeKey}`}
                                            type="url"
                                            value={lesson.textTracks?.find((track) => track.locale === localeKey && track.kind === 'SUBTITLE')?.url || ''}
                                            onChange={(event) => updateLessonTextTrack(sIdx, index, localeKey, 'SUBTITLE', 'url', event.target.value)}
                                            placeholder={`${getCourseLanguageLabel(localeKey)} captions URL (.vtt)`}
                                            className="px-3 py-2 border border-violet-200 bg-violet-50/30 rounded focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs"
                                          />
                                        ))}
                                      </div>
                                    )}
                                    <textarea
                                      value={lesson.textTracks?.find((track) => track.locale === 'en' && track.kind === 'TRANSCRIPT')?.content || ''}
                                      onChange={(event) => updateLessonTextTrack(sIdx, index, 'en', 'TRANSCRIPT', 'content', event.target.value)}
                                      placeholder="Optional English transcript for accessibility and learners who prefer reading"
                                      rows={3}
                                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y text-xs"
                                    />
                                    {additionalSupportedLocales.length > 0 && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {additionalSupportedLocales.map((localeKey) => (
                                          <textarea
                                            key={`${lesson.id}-transcript-${localeKey}`}
                                            value={lesson.textTracks?.find((track) => track.locale === localeKey && track.kind === 'TRANSCRIPT')?.content || ''}
                                            onChange={(event) => updateLessonTextTrack(sIdx, index, localeKey, 'TRANSCRIPT', 'content', event.target.value)}
                                            placeholder={`${getCourseLanguageLabel(localeKey)} transcript`}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-violet-200 bg-violet-50/30 rounded focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y text-xs"
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {(lesson.type === 'IMAGE' || FILE_ITEM_TYPES.has(lesson.type)) && (
                                  <div className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center text-center space-y-3">
                                    {lesson.content ? (
                                      <div className="w-full">
                                        {lesson.type === 'IMAGE' ? (
                                          <div className="relative group mx-auto w-32 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center border">
                                            <img src={lesson.content} alt="" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                              <ImageIcon className="w-6 h-6 text-white" />
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-3 px-3 py-2 bg-white dark:bg-gray-900 border border-indigo-100 rounded-lg">
                                            <File className="w-5 h-5 text-indigo-500" />
                                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate max-w-[200px]">{lesson.content.split('/').pop()}</span>
                                          </div>
                                        )}
                                        <button 
                                          onClick={() => updateLesson(sIdx, index, 'content', '')}
                                          className="mt-2 text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors"
                                        >
                                          Replace File
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center shadow-sm">
                                          {lesson.type === 'IMAGE' ? <ImageIcon className="w-5 h-5 text-pink-500" /> : <File className="w-5 h-5 text-indigo-500" />}
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Upload {lesson.type === 'IMAGE' ? 'Image' : lesson.type === 'PDF' ? 'PDF' : 'Document or Resource File'}</p>
                                          <p className="text-[10px] text-gray-400 mt-1">Directly up to Cloudflare R2</p>
                                        </div>
                                        <label className="px-4 py-1.5 bg-gray-900 text-white text-[11px] font-bold rounded-lg cursor-pointer hover:bg-gray-800 transition-all active:scale-95 shadow-md">
                                          Choose File
                                          <input
                                            type="file"
                                            className="hidden"
                                            accept={lesson.type === 'IMAGE' ? 'image/*' : lesson.type === 'PDF' ? 'application/pdf' : '*/*'}
                                            onChange={(e) => e.target.files?.[0] && handleFileUpload(sIdx, index, e.target.files[0], 'content')}
                                          />
                                        </label>
                                      </>
                                    )}
                                  </div>
                                )}

                                <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 p-3 space-y-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-xs font-semibold text-slate-700 dark:text-gray-200">Localized Lesson Resources</p>
                                      <p className="text-[11px] text-slate-500">Add downloadable files/links per language with one default fallback.</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => addLessonResource(sIdx, index)}
                                      className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 transition-colors"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      Add Resource
                                    </button>
                                  </div>

                                  {(lesson.resources || []).length === 0 ? (
                                    <p className="rounded-lg border border-dashed border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-[11px] text-slate-500">
                                      No extra resources yet. Add one if this lesson needs attachments or language-specific documents.
                                    </p>
                                  ) : (
                                    <div className="space-y-2">
                                      {(lesson.resources || []).map((resource, resourceIdx) => (
                                        <div key={`${lesson.id}-resource-${resourceIdx}`} className="rounded-lg border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2.5 space-y-2">
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <input
                                              type="text"
                                              value={resource.title}
                                              onChange={(event) => updateLessonResource(sIdx, index, resourceIdx, 'title', event.target.value)}
                                              placeholder="Resource title"
                                              className="px-2.5 py-1.5 border border-slate-200 dark:border-gray-800 rounded text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
                                            />
                                            <input
                                              type="url"
                                              value={resource.url}
                                              onChange={(event) => updateLessonResource(sIdx, index, resourceIdx, 'url', event.target.value)}
                                              placeholder="https://..."
                                              className="px-2.5 py-1.5 border border-slate-200 dark:border-gray-800 rounded text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
                                            />
                                          </div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <select
                                              value={resource.type}
                                              onChange={(event) => updateLessonResource(sIdx, index, resourceIdx, 'type', event.target.value)}
                                              className="min-w-[110px] px-2 py-1.5 border border-slate-200 dark:border-gray-800 rounded text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
                                            >
                                              <option value="FILE">File</option>
                                              <option value="LINK">Link</option>
                                              <option value="VIDEO">Video</option>
                                            </select>
                                            <select
                                              value={resource.locale}
                                              onChange={(event) => updateLessonResource(sIdx, index, resourceIdx, 'locale', event.target.value)}
                                              className="min-w-[130px] px-2 py-1.5 border border-slate-200 dark:border-gray-800 rounded text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
                                            >
                                              {lessonResourceLocales.map((localeOption) => (
                                                <option key={localeOption.key} value={localeOption.key}>
                                                  {localeOption.label}
                                                </option>
                                              ))}
                                            </select>
                                            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                                              <input
                                                type="checkbox"
                                                checked={Boolean(resource.isDefault)}
                                                onChange={(event) => updateLessonResource(sIdx, index, resourceIdx, 'isDefault', event.target.checked)}
                                                className="h-3.5 w-3.5 rounded border-slate-300 dark:border-gray-700 text-slate-700 dark:text-gray-200 focus:ring-slate-500"
                                              />
                                              Default fallback
                                            </label>
                                            <button
                                              type="button"
                                              onClick={() => removeLessonResource(sIdx, index, resourceIdx)}
                                              className="ml-auto rounded-md border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                              Remove
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {lesson.type === 'QUIZ' && lesson.quiz && (
                                  <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl space-y-4">
                                    {/* Settings Row */}
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-2">
                                        <label className="text-xs font-bold text-blue-900">Passing Score:</label>
                                        <input
                                          type="number"
                                          min={1} max={100}
                                          value={lesson.quiz.passingScore}
                                          onChange={(e) => updateLesson(sIdx, index, 'quiz', { ...lesson.quiz, passingScore: parseInt(e.target.value) || 80 })}
                                          className="w-16 px-2 py-1 border border-blue-200 rounded-lg text-sm text-center font-bold bg-white dark:bg-gray-900"
                                        />
                                        <span className="text-xs font-bold text-blue-700">%</span>
                                      </div>
                                      <div className="text-xs text-blue-600 font-medium">
                                        {lesson.quiz.questions.length} question{lesson.quiz.questions.length !== 1 ? 's' : ''} total
                                      </div>
                                    </div>

                                    {/* Questions List */}
                                    <div className="space-y-4">
                                      {lesson.quiz.questions.map((q, qIdx) => (
                                        <div key={qIdx} className="bg-white dark:bg-gray-900 rounded-xl border border-blue-100 p-4 shadow-sm space-y-3">
                                          {/* Question header */}
                                          <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-extrabold rounded-full">Q{qIdx + 1}</span>
                                            <input
                                              type="text"
                                              value={q.question}
                                              onChange={(e) => {
                                                const updated = [...lesson.quiz!.questions];
                                                updated[qIdx] = { ...updated[qIdx], question: e.target.value };
                                                updateLesson(sIdx, index, 'quiz', { ...lesson.quiz, questions: updated });
                                              }}
                                              placeholder="Type your question here..."
                                              className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <button
                                              onClick={() => {
                                                const updated = lesson.quiz!.questions.filter((_, i) => i !== qIdx);
                                                updateLesson(sIdx, index, 'quiz', { ...lesson.quiz, questions: updated });
                                              }}
                                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                              title="Remove question"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                          </div>

                                          {/* Answer Options */}
                                          <div className="space-y-2 pl-2">
                                            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Answer Options</p>
                                            {q.options.map((opt, oIdx) => (
                                              <div key={oIdx} className={`flex items-center gap-2 p-2.5 rounded-lg border ${opt.isCorrect ? 'border-green-300 bg-green-50' : 'border-gray-100 bg-gray-50 dark:bg-gray-800/50'}`}>
                                                {/* Correct toggle */}
                                                <button
                                                  onClick={() => {
                                                    const updatedQs = [...lesson.quiz!.questions];
                                                    const updatedOpts = updatedQs[qIdx].options.map((o, i) => ({
                                                      ...o,
                                                      isCorrect: i === oIdx // Only one correct answer
                                                    }));
                                                    updatedQs[qIdx] = { ...updatedQs[qIdx], options: updatedOpts };
                                                    updateLesson(sIdx, index, 'quiz', { ...lesson.quiz, questions: updatedQs });
                                                  }}
                                                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${opt.isCorrect ? 'border-green-500 bg-green-500' : 'border-gray-300 dark:border-gray-700 hover:border-green-400'}`}
                                                  title="Mark as correct answer"
                                                >
                                                  {opt.isCorrect && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
                                                </button>
                                                <span className="text-[10px] font-extrabold text-gray-400 w-4">
                                                  {['A','B','C','D','E'][oIdx]}
                                                </span>
                                                <input
                                                  type="text"
                                                  value={opt.text}
                                                  onChange={(e) => {
                                                    const updatedQs = [...lesson.quiz!.questions];
                                                    const updatedOpts = [...updatedQs[qIdx].options];
                                                    updatedOpts[oIdx] = { ...updatedOpts[oIdx], text: e.target.value };
                                                    updatedQs[qIdx] = { ...updatedQs[qIdx], options: updatedOpts };
                                                    updateLesson(sIdx, index, 'quiz', { ...lesson.quiz, questions: updatedQs });
                                                  }}
                                                  placeholder={`Option ${['A','B','C','D','E'][oIdx]}`}
                                                  className="flex-1 text-sm bg-transparent border-none outline-none font-medium text-gray-700 dark:text-gray-200 placeholder-gray-300"
                                                />
                                                {q.options.length > 2 && (
                                                  <button
                                                    onClick={() => {
                                                      const updatedQs = [...lesson.quiz!.questions];
                                                      updatedQs[qIdx].options = updatedQs[qIdx].options.filter((_, i) => i !== oIdx);
                                                      updateLesson(sIdx, index, 'quiz', { ...lesson.quiz, questions: updatedQs });
                                                    }}
                                                    className="p-0.5 text-gray-300 hover:text-red-400 transition-colors"
                                                  >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                  </button>
                                                )}
                                              </div>
                                            ))}

                                            {/* Add option */}
                                            {q.options.length < 5 && (
                                              <button
                                                onClick={() => {
                                                  const updatedQs = [...lesson.quiz!.questions];
                                                  updatedQs[qIdx].options.push({ text: '', isCorrect: false });
                                                  updateLesson(sIdx, index, 'quiz', { ...lesson.quiz, questions: updatedQs });
                                                }}
                                                className="flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-700 pl-2 py-1 transition-colors"
                                              >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                Add option
                                              </button>
                                            )}
                                          </div>

                                          {/* Explanation */}
                                          <div>
                                            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wide">Explanation (shown after answer)</label>
                                            <input
                                              type="text"
                                              value={q.explanation || ''}
                                              onChange={(e) => {
                                                const updated = [...lesson.quiz!.questions];
                                                updated[qIdx] = { ...updated[qIdx], explanation: e.target.value };
                                                updateLesson(sIdx, index, 'quiz', { ...lesson.quiz, questions: updated });
                                              }}
                                              placeholder="Why is this the correct answer? (optional)"
                                              className="w-full mt-1 px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs italic text-gray-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50 dark:bg-gray-800/50"
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Add question button */}
                                    <button
                                      onClick={() => {
                                        const newQuestion = {
                                          question: '',
                                          explanation: '',
                                          order: lesson.quiz!.questions.length,
                                          options: [
                                            { text: '', isCorrect: true },
                                            { text: '', isCorrect: false },
                                            { text: '', isCorrect: false },
                                          ]
                                        };
                                        updateLesson(sIdx, index, 'quiz', {
                                          ...lesson.quiz,
                                          questions: [...lesson.quiz!.questions, newQuestion]
                                        });
                                      }}
                                      className="w-full py-2.5 border-2 border-dashed border-blue-300 text-blue-600 font-bold text-sm rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                      Add Question
                                    </button>
                                  </div>
                                )}

                                {lesson.type === 'ASSIGNMENT' && lesson.assignment && (
                                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded space-y-3">
                                    <div className="flex gap-6">
                                      <div className="flex flex-col">
                                        <label className="text-xs font-bold text-indigo-900 mb-1">Max Score</label>
                                        <input type="number" value={lesson.assignment.maxScore} onChange={(e) => updateLesson(sIdx, index, 'assignment', { ...lesson.assignment, maxScore: parseInt(e.target.value) || 100 })} className="w-20 px-2 py-1 border rounded" />
                                      </div>
                                      <div className="flex flex-col">
                                        <label className="text-xs font-bold text-indigo-900 mb-1">Passing Goal (%)</label>
                                        <input type="number" value={lesson.assignment.passingScore} onChange={(e) => updateLesson(sIdx, index, 'assignment', { ...lesson.assignment, passingScore: parseInt(e.target.value) || 80 })} className="w-20 px-2 py-1 border rounded" />
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs font-bold text-indigo-900">Assignment Rubric Details</label>
                                      <textarea placeholder="Describe how the student should complete the assignment..." value={lesson.assignment.instructions} onChange={(e) => updateLesson(sIdx, index, 'assignment', { ...lesson.assignment, instructions: e.target.value })} className="w-full px-2 py-2 border rounded resize-y text-sm" rows={3} />
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <textarea
                                          placeholder="Assignment instructions (English)"
                                          value={lesson.assignment.instructionsTranslations?.en || ''}
                                          onChange={(event) => updateAssignmentTranslation(sIdx, index, 'en', event.target.value)}
                                          className="w-full px-2 py-2 border border-blue-200 bg-blue-50/30 rounded resize-y text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          rows={2}
                                        />
                                        <textarea
                                          placeholder="ការណែនាំការងារ (Khmer)"
                                          value={lesson.assignment.instructionsTranslations?.km || ''}
                                          onChange={(event) => updateAssignmentTranslation(sIdx, index, 'km', event.target.value)}
                                          className="w-full px-2 py-2 border border-emerald-200 bg-emerald-50/30 rounded resize-y text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                          rows={2}
                                        />
                                      </div>
                                      {additionalSupportedLocales.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {additionalSupportedLocales.map((localeKey) => (
                                            <textarea
                                              key={`${lesson.id}-assignment-${localeKey}`}
                                              placeholder={`Assignment instructions (${getCourseLanguageLabel(localeKey)})`}
                                              value={lesson.assignment?.instructionsTranslations?.[localeKey] || ''}
                                              onChange={(event) => updateAssignmentTranslation(sIdx, index, localeKey, event.target.value)}
                                              className="w-full px-2 py-2 border border-violet-200 bg-violet-50/30 rounded resize-y text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                                              rows={2}
                                            />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {lesson.type === 'EXERCISE' && lesson.exercise && (
                                  <div className="p-3 bg-green-50/50 border border-green-100 rounded space-y-3">
                                    <div className="flex items-center gap-2">
                                      <label className="text-sm font-bold text-green-900">Coding Language:</label>
                                      <select value={lesson.exercise.language} onChange={(e) => updateLesson(sIdx, index, 'exercise', { ...lesson.exercise, language: e.target.value })} className="px-2 py-1 border rounded text-sm font-medium">
                                        <option value="java">Java</option>
                                        <option value="python">Python</option>
                                        <option value="javascript">JavaScript</option>
                                        <option value="cpp">C++</option>
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs font-bold text-green-900">Starting Code Template</label>
                                      <textarea placeholder="public class Main { public static void main(String[] args) {} }" value={lesson.exercise.initialCode} onChange={(e) => updateLesson(sIdx, index, 'exercise', { ...lesson.exercise, initialCode: e.target.value })} className="w-full px-3 py-2 border border-green-200 rounded resize-y text-sm font-mono bg-white dark:bg-gray-900" rows={4} />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs font-bold text-green-900">Reference Solution Code</label>
                                      <textarea
                                        placeholder="// Add the expected solution output here"
                                        value={lesson.exercise.solutionCode}
                                        onChange={(e) => updateLesson(sIdx, index, 'exercise', { ...lesson.exercise, solutionCode: e.target.value })}
                                        className="w-full px-3 py-2 border border-green-200 rounded resize-y text-sm font-mono bg-white dark:bg-gray-900"
                                        rows={4}
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center gap-4 pt-2 mt-2 border-t border-gray-100">
                                  <div className="flex items-center gap-2 text-gray-500 hover:text-amber-600 transition-colors">
                                    <Clock className="w-4 h-4" />
                                    <input
                                      type="number"
                                      value={lesson.duration}
                                      onChange={(e) => updateLesson(sIdx, index, 'duration', parseInt(e.target.value) || 0)}
                                      className="w-16 px-1 py-0.5 bg-transparent border-b border-dashed border-gray-300 dark:border-gray-700 focus:border-amber-500 focus:outline-none text-center text-sm font-medium"
                                      min="1"
                                    />
                                    <span className="text-xs font-medium uppercase tracking-wide">min</span>
                                  </div>

                                  <div className="w-px h-4 bg-gray-200"></div>

                                  <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                      type="checkbox"
                                      checked={lesson.isFree}
                                      onChange={(e) => updateLesson(sIdx, index, 'isFree', e.target.checked)}
                                      className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                                    />
                                    <span className="text-xs font-semibold text-gray-500 group-hover:text-amber-700 transition-colors uppercase tracking-wide">Free preview</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Add Content Toolbar */}
                        <div className="pt-2">
                          <p className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wide">Add Item to {section.title || `Section ${sIdx + 1}`}</p>
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => addLesson(sIdx, 'VIDEO')} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 text-xs font-bold rounded-lg transition-colors"><Video className="w-3.5 h-3.5" /> Video</button>
                            <button onClick={() => addLesson(sIdx, 'AUDIO')} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100 text-xs font-bold rounded-lg transition-colors"><UploadCloud className="w-3.5 h-3.5" /> Audio</button>
                            <button onClick={() => addLesson(sIdx, 'ARTICLE')} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800 text-xs font-bold rounded-lg transition-colors"><BookOpen className="w-3.5 h-3.5" /> Article</button>
                            <button onClick={() => addLesson(sIdx, 'CASE_STUDY')} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 text-xs font-bold rounded-lg transition-colors"><BookOpen className="w-3.5 h-3.5" /> Case Study</button>
                            <button onClick={() => addLesson(sIdx, 'PRACTICE')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold rounded-lg transition-colors"><Check className="w-3.5 h-3.5" /> Practice</button>
                            <button onClick={() => addLesson(sIdx, 'IMAGE')} className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100 text-xs font-bold rounded-lg transition-colors"><Plus className="w-3.5 h-3.5" /> Image</button>
                            <button onClick={() => addLesson(sIdx, 'DOCUMENT')} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 text-xs font-bold rounded-lg transition-colors"><File className="w-3.5 h-3.5" /> Document</button>
                            <button onClick={() => addLesson(sIdx, 'PDF')} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-xs font-bold rounded-lg transition-colors"><FileText className="w-3.5 h-3.5" /> PDF</button>
                            <button onClick={() => addLesson(sIdx, 'QUIZ')} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-bold rounded-lg transition-colors"><Check className="w-3.5 h-3.5" /> Quiz</button>
                            <button onClick={() => addLesson(sIdx, 'ASSIGNMENT')} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 text-xs font-bold rounded-lg transition-colors"><BookOpen className="w-3.5 h-3.5" /> Assignment</button>
                            <button onClick={() => addLesson(sIdx, 'EXERCISE')} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 text-xs font-bold rounded-lg transition-colors"><Plus className="w-3.5 h-3.5" /> Code Exercise</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Sparkles className="w-12 h-12 mx-auto text-amber-500 mb-3" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Ready to publish?</h3>
                <p className="text-gray-500">Review your course before making it live</p>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 space-y-4">
                <div className="flex items-start gap-4">
                  {courseData.thumbnail ? (
                    <img src={courseData.thumbnail} alt="" className="w-32 h-20 object-cover rounded-lg" />
                  ) : (
                    <div className="w-32 h-20 bg-amber-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-amber-400" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{normalizedCourseTitle || 'Untitled Course'}</h4>
                    <p className="text-sm text-gray-500">{courseData.category} • {courseData.level.replace('_', ' ')}</p>
                  </div>
                </div>

                <p className="text-gray-600 text-sm">{normalizedCourseDescription}</p>

                {courseData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {courseData.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-gray-200 text-gray-700 dark:text-gray-200 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    {sections.length} Section{sections.length !== 1 ? 's' : ''}
                  </p>
                  <div className="space-y-4">
                    {sections.slice(0, 3).map((section, sIdx) => (
                      <div key={section.id} className="space-y-2">
                        <p className="text-xs font-bold text-gray-500 uppercase">Section {sIdx + 1}: {resolveLocalizedField(section.title, section.titleTranslations).value || section.title}</p>
                        {section.items.slice(0, 3).map((lesson, i) => (
                          <div key={lesson.id} className="flex items-center gap-2 text-sm ml-4">
                            <span className="w-4 h-4 flex items-center justify-center bg-gray-200 rounded-full text-[10px] font-bold text-gray-600">{i + 1}</span>
                            <span className="text-gray-700 dark:text-gray-200 font-medium truncate max-w-xs">{resolveLocalizedField(lesson.title, lesson.titleTranslations).value || 'Untitled'}</span>
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 text-[10px] font-bold rounded uppercase">{lesson.type}</span>
                            {lesson.isFree && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">Free</span>}
                          </div>
                        ))}
                        {section.items.length > 3 && (
                          <p className="text-xs text-gray-400 ml-4 font-medium italic">+ {section.items.length - 3} more items...</p>
                        )}
                      </div>
                    ))}
                    {sections.length > 3 && (
                      <p className="text-sm text-gray-500 font-medium italic pt-2">+ {sections.length - 3} more sections...</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Validation */}
              <div className="space-y-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 text-sm">Publish Requirements</h4>
                {!isStep1Valid && (
                  <p className="text-sm text-red-500 flex items-center gap-2.5">
                    <X className="w-4 h-4" />
                    Complete basic info (title, description, category)
                  </p>
                )}
                {!hasCurriculumItems && (
                  <p className="text-sm text-red-500 flex items-center gap-2.5">
                    <X className="w-4 h-4" />
                    Add at least one lesson to your curriculum
                  </p>
                )}
                {hasCurriculumItems && lessonPublishIssues.length > 0 && (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Lesson Requirements</p>
                    <p className="mt-2 text-xs leading-5 text-rose-700">
                      {lessonPublishIssues.length} issue{lessonPublishIssues.length === 1 ? '' : 's'} must be fixed before publishing.
                    </p>
                    <div className="mt-2 space-y-1">
                      {lessonPublishIssues.slice(0, 4).map((issue, issueIndex) => (
                        <p key={`${issue.sectionLabel}-${issue.lessonLabel}-${issueIndex}`} className="text-xs text-rose-700">
                          {issue.sectionLabel}{' -> '}{issue.lessonLabel}: {issue.reason}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {isStep1Valid && hasCurriculumItems && lessonPublishIssues.length === 0 && (
                  <p className="text-sm text-green-600 flex items-center gap-2.5 font-medium">
                    <Check className="w-5 h-5" />
                    All requirements met. Your course is ready to publish!
                  </p>
                )}
                {incompleteLocaleCoverage.length > 0 && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Translation Readiness</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {incompleteLocaleCoverage.map((coverage) => {
                        const tone = getCoverageTone(coverage.percent);
                        return (
                          <span key={coverage.locale} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}>
                            {coverage.label}: {coverage.percent}%
                          </span>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-amber-700">
                      Publishing is allowed, but learners in these languages may still see source-language fallback content.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 dark:bg-none dark:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>

            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !isStep1Valid}
                className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={publishCourse}
                disabled={publishing || !isStep1Valid || !isStep3Valid}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors disabled:opacity-50"
              >
                {publishing ? 'Publishing...' : 'Publish Course'}
                <Sparkles className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
