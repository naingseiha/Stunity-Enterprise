'use client';

import { useCallback, useMemo, useState } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  Edit3, 
  Video, 
  FileText, 
  HelpCircle, 
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileCode
} from 'lucide-react';
import { LEARN_SERVICE_URL } from '@/lib/api/config';
import { TokenManager } from '@/lib/api/auth';
import { getCoverageTone, summarizeLocaleCoverage } from '@/lib/course-translation-coverage';
import { getCourseLanguageLabel, isValidCourseLocale, normalizeCourseLocale } from '@/lib/course-locales';

type SupportedLocaleKey = string;
type LocalizedTextMap = Partial<Record<string, string>>;
type LessonResourceDraft = {
  title: string;
  url: string;
  type: 'FILE' | 'LINK' | 'VIDEO' | 'PDF' | 'AUDIO';
  locale: SupportedLocaleKey;
  isDefault: boolean;
};
type LessonTextTrackDraft = {
  kind: 'SUBTITLE' | 'CAPTION' | 'TRANSCRIPT';
  locale: SupportedLocaleKey;
  label?: string | null;
  url?: string | null;
  content?: string | null;
  isDefault: boolean;
};
type LessonAssignmentDraft = {
  instructions: string;
  instructionsTranslations?: LocalizedTextMap;
  rubric?: string | null;
  rubricTranslations?: LocalizedTextMap;
  maxScore: number;
  passingScore: number;
};
type LessonExerciseDraft = {
  language: string;
  initialCode: string;
  solutionCode: string;
  testCases?: string | null;
};
type LessonQuizOptionDraft = {
  text: string;
  isCorrect: boolean;
};
type LessonQuizQuestionDraft = {
  question: string;
  explanation?: string | null;
  order: number;
  options: LessonQuizOptionDraft[];
};
type LessonQuizDraft = {
  passingScore: number;
  questions: LessonQuizQuestionDraft[];
};

const LESSON_TYPE_OPTIONS = [
  { value: 'VIDEO', label: 'Video Lesson' },
  { value: 'ARTICLE', label: 'Article / Reading' },
  { value: 'DOCUMENT', label: 'Document Lesson' },
  { value: 'PDF', label: 'PDF Lesson' },
  { value: 'FILE', label: 'Downloadable Resource' },
  { value: 'AUDIO', label: 'Audio Lesson' },
  { value: 'IMAGE', label: 'Image Lesson' },
  { value: 'QUIZ', label: 'Quiz' },
  { value: 'ASSIGNMENT', label: 'Assignment' },
  { value: 'EXERCISE', label: 'Coding Exercise' },
  { value: 'PRACTICE', label: 'Practice Activity' },
  { value: 'CASE_STUDY', label: 'Case Study' },
] as const;

const EXERCISE_LANGUAGE_OPTIONS = ['javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'rust'] as const;

const createDefaultQuizQuestion = (order: number): LessonQuizQuestionDraft => ({
  question: '',
  explanation: '',
  order,
  options: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
});

const getTrimmedText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const normalizeTranslationMap = (translations?: unknown): LocalizedTextMap | undefined => {
  if (!translations || typeof translations !== 'object') return undefined;

  const map = translations as Record<string, unknown>;
  const normalized: LocalizedTextMap = {};

  for (const [localeKey, rawValue] of Object.entries(map)) {
    const normalizedLocaleKey = normalizeCourseLocale(localeKey);
    if (!isValidCourseLocale(normalizedLocaleKey)) continue;
    if (typeof rawValue === 'string' && rawValue.trim()) {
      normalized[normalizedLocaleKey] = rawValue.trim();
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const resolveLocalizedField = (
  baseValue: unknown,
  translations?: LocalizedTextMap | null
): { value: string; translations?: LocalizedTextMap } => {
  const base = getTrimmedText(baseValue);
  const normalizedTranslations = normalizeTranslationMap(translations);
  const fallback = base || normalizedTranslations?.en || normalizedTranslations?.km || Object.values(normalizedTranslations || {})[0] || '';

  if (!normalizedTranslations) {
    return { value: fallback };
  }

  return {
    value: fallback,
    translations: normalizedTranslations,
  };
};

const normalizeResourceLocale = (value: unknown): SupportedLocaleKey => {
  return normalizeCourseLocale(value, 'en');
};

const normalizeResourceDrafts = (resources: unknown): LessonResourceDraft[] => {
  if (!Array.isArray(resources)) return [];
  const drafts = resources.map((resource) => {
    const input = typeof resource === 'object' && resource ? resource as Record<string, unknown> : {};
    return {
      title: typeof input.title === 'string' ? input.title : '',
      url: typeof input.url === 'string' ? input.url : '',
      type: input.type === 'LINK' || input.type === 'VIDEO' || input.type === 'PDF' || input.type === 'AUDIO' ? input.type : 'FILE',
      locale: normalizeResourceLocale(input.locale),
      isDefault: Boolean(input.isDefault),
    } as LessonResourceDraft;
  });
  if (drafts.length > 0 && !drafts.some((resource) => resource.isDefault)) {
    drafts[0].isDefault = true;
  }
  return drafts;
};

const sanitizeResourceDrafts = (resources: LessonResourceDraft[]): LessonResourceDraft[] => {
  const cleaned = resources
    .map((resource) => ({
      ...resource,
      title: resource.title.trim(),
      url: resource.url.trim(),
    }))
    .filter((resource) => resource.title && resource.url);

  if (cleaned.length > 0 && !cleaned.some((resource) => resource.isDefault)) {
    cleaned[0].isDefault = true;
  }

  return cleaned;
};

const normalizeTrackDrafts = (tracks: unknown): LessonTextTrackDraft[] => {
  if (!Array.isArray(tracks)) return [];

  const normalized = tracks
    .map((track) => {
      const input = typeof track === 'object' && track ? track as Record<string, unknown> : {};
      const kind = input.kind === 'CAPTION' || input.kind === 'TRANSCRIPT' ? input.kind : 'SUBTITLE';
      const url = typeof input.url === 'string' ? input.url.trim() : '';
      const content = typeof input.content === 'string' ? input.content : '';
      if (!url && !content) return null;

      return {
        kind,
        locale: normalizeResourceLocale(input.locale),
        label: typeof input.label === 'string' && input.label.trim() ? input.label.trim() : null,
        url: url || null,
        content: content || null,
        isDefault: Boolean(input.isDefault),
      } as LessonTextTrackDraft;
    })
    .filter(Boolean) as LessonTextTrackDraft[];

  return normalized;
};

const sanitizeTrackDrafts = (tracks: LessonTextTrackDraft[]) => (
  tracks
    .map((track) => ({
      ...track,
      label: track.label?.trim() || null,
      url: track.url?.trim() || null,
      content: track.content || null,
    }))
    .filter((track) => Boolean(track.url) || Boolean(track.content))
);

const normalizeAssignmentDraft = (assignment: unknown): LessonAssignmentDraft | undefined => {
  if (!assignment || typeof assignment !== 'object') return undefined;
  const input = assignment as Record<string, unknown>;
  return {
    instructions: typeof input.instructions === 'string' ? input.instructions : '',
    instructionsTranslations: normalizeTranslationMap(input.instructionsTranslations) || {},
    rubric: typeof input.rubric === 'string' ? input.rubric : '',
    rubricTranslations: normalizeTranslationMap(input.rubricTranslations) || {},
    maxScore: Number.isFinite(Number(input.maxScore)) ? Number(input.maxScore) : 100,
    passingScore: Number.isFinite(Number(input.passingScore)) ? Number(input.passingScore) : 80,
  };
};

const normalizeExerciseDraft = (exercise: unknown): LessonExerciseDraft | undefined => {
  if (!exercise || typeof exercise !== 'object') return undefined;
  const input = exercise as Record<string, unknown>;
  return {
    language: typeof input.language === 'string' && input.language.trim() ? input.language : 'javascript',
    initialCode: typeof input.initialCode === 'string' ? input.initialCode : '',
    solutionCode: typeof input.solutionCode === 'string'
      ? input.solutionCode
      : (typeof input.solution === 'string' ? input.solution : ''),
    testCases: typeof input.testCases === 'string' ? input.testCases : '',
  };
};

const normalizeQuizDraft = (quiz: unknown): LessonQuizDraft | undefined => {
  if (!quiz || typeof quiz !== 'object') return undefined;
  const input = quiz as Record<string, unknown>;
  const questions = Array.isArray(input.questions)
    ? input.questions.map((question, questionIndex) => {
        const rawQuestion = typeof question === 'object' && question ? question as Record<string, unknown> : {};
        const options = Array.isArray(rawQuestion.options)
          ? rawQuestion.options.map((option) => {
              const rawOption = typeof option === 'object' && option ? option as Record<string, unknown> : {};
              return {
                text: typeof rawOption.text === 'string' ? rawOption.text : '',
                isCorrect: Boolean(rawOption.isCorrect),
              };
            })
          : [];

        return {
          question: typeof rawQuestion.question === 'string' ? rawQuestion.question : '',
          explanation: typeof rawQuestion.explanation === 'string' ? rawQuestion.explanation : '',
          order: Number.isFinite(Number(rawQuestion.order)) ? Number(rawQuestion.order) : questionIndex,
          options: options.length >= 2 ? options : createDefaultQuizQuestion(questionIndex).options,
        };
      })
    : [];

  return {
    passingScore: Number.isFinite(Number(input.passingScore)) ? Number(input.passingScore) : 80,
    questions,
  };
};

const sanitizeQuizDraft = (quiz?: LessonQuizDraft): LessonQuizDraft | undefined => {
  if (!quiz) return undefined;

  const questions = quiz.questions
    .map((question, questionIndex) => ({
      question: question.question.trim(),
      explanation: question.explanation?.trim() || '',
      order: questionIndex,
      options: question.options
        .map((option) => ({
          text: option.text.trim(),
          isCorrect: Boolean(option.isCorrect),
        }))
        .filter((option) => option.text),
    }))
    .filter((question) => question.question && question.options.length >= 2)
    .map((question) => {
      const hasCorrectAnswer = question.options.some((option) => option.isCorrect);
      return {
        ...question,
        options: hasCorrectAnswer
          ? question.options
          : question.options.map((option, optionIndex) => ({ ...option, isCorrect: optionIndex === 0 })),
      };
    });

  return {
    passingScore: Number.isFinite(Number(quiz.passingScore)) ? Number(quiz.passingScore) : 80,
    questions,
  };
};

interface Lesson {
  id: string;
  title: string;
  titleTranslations?: LocalizedTextMap;
  type: string;
  description?: string | null;
  descriptionTranslations?: LocalizedTextMap;
  content?: string | null;
  contentTranslations?: LocalizedTextMap;
  videoUrl?: string | null;
  duration?: number;
  isFree?: boolean;
  isPublished?: boolean;
  resources?: LessonResourceDraft[];
  textTracks?: LessonTextTrackDraft[];
  quiz?: LessonQuizDraft;
  assignment?: LessonAssignmentDraft;
  exercise?: LessonExerciseDraft;
  order: number;
}

interface Section {
  id: string;
  title: string;
  titleTranslations?: LocalizedTextMap;
  order: number;
  lessons: Lesson[];
}

interface CurriculumBuilderProps {
  courseId: string;
  initialSections: Section[];
  sourceLocale?: SupportedLocaleKey;
  supportedLocales?: SupportedLocaleKey[];
}

interface SectionEditDraft {
  id: string;
  title: string;
  titleTranslations: LocalizedTextMap;
}

interface LessonEditDraft {
  id: string;
  type: string;
  title: string;
  titleTranslations: LocalizedTextMap;
  description: string;
  descriptionTranslations: LocalizedTextMap;
  content: string;
  contentTranslations: LocalizedTextMap;
  videoUrl: string;
  duration: number;
  isFree: boolean;
  isPublished: boolean;
  resources: LessonResourceDraft[];
  textTracks: LessonTextTrackDraft[];
  quiz?: LessonQuizDraft;
  assignment?: LessonAssignmentDraft;
  exercise?: LessonExerciseDraft;
}

// ============================================
// SUB-COMPONENTS (Sortable Items)
// ============================================

function SortableLesson({
  lesson,
  sourceLocale,
  supportedLocales,
  onDelete,
  onEdit,
}: {
  lesson: Lesson;
  sourceLocale: SupportedLocaleKey;
  supportedLocales: SupportedLocaleKey[];
  onDelete: (id: string) => void;
  onEdit: (lesson: Lesson) => void;
}) {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition,
    isDragging 
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };
  const coverageByLocale = supportedLocales.map((localeKey) => ({
    locale: localeKey,
    ...summarizeLocaleCoverage([
      { baseValue: lesson.title, translations: lesson.titleTranslations },
      { baseValue: lesson.description, translations: lesson.descriptionTranslations, required: false },
    ], localeKey, sourceLocale),
  }));

  const getIcon = () => {
    switch (lesson.type) {
      case 'VIDEO': return <Video className="w-4 h-4 text-sky-400" />;
      case 'ARTICLE': return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'DOCUMENT':
      case 'PDF':
      case 'FILE':
      case 'IMAGE': return <FileText className="w-4 h-4 text-indigo-400" />;
      case 'QUIZ': return <HelpCircle className="w-4 h-4 text-purple-400" />;
      case 'AUDIO': return <Video className="w-4 h-4 text-cyan-400" />;
      case 'PRACTICE':
      case 'CASE_STUDY':
      default: return <CheckCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`group flex items-center gap-3 p-3 bg-slate-800/40 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all ${isDragging && 'shadow-2xl shadow-black/50 border-amber-500/50'}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-slate-600 hover:text-slate-400">
        <GripVertical className="w-4 h-4" />
      </div>
      
      <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-slate-200 truncate">{lesson.title}</h4>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {coverageByLocale.map((coverage) => {
            const tone = getCoverageTone(coverage.percent);
            return (
              <span key={coverage.locale} className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone.badge}`}>
                {getCourseLanguageLabel(coverage.locale)} {coverage.percent}%
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(lesson)}
          className="p-2 text-slate-500 hover:text-white transition-colors"
          title="Edit lesson"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onDelete(lesson.id)}
          className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SortableSection({ 
  section, 
  sourceLocale,
  supportedLocales,
  onDelete, 
  onAddLesson,
  onDeleteLesson,
  onEditSection,
  onEditLesson,
}: { 
  section: Section; 
  sourceLocale: SupportedLocaleKey;
  supportedLocales: SupportedLocaleKey[];
  onDelete: (id: string) => void;
  onAddLesson: (sectionId: string, type?: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  onEditSection: (section: Section) => void;
  onEditLesson: (lesson: Lesson) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition,
    isDragging 
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.3 : 1,
  };
  const coverageByLocale = supportedLocales.map((localeKey) => ({
    locale: localeKey,
    ...summarizeLocaleCoverage([
      { baseValue: section.title, translations: section.titleTranslations },
      ...section.lessons.flatMap((lesson) => [
        { baseValue: lesson.title, translations: lesson.titleTranslations },
        { baseValue: lesson.description, translations: lesson.descriptionTranslations, required: false },
      ]),
    ], localeKey, sourceLocale),
  }));

  return (
    <div ref={setNodeRef} style={style} className="mb-6 last:mb-0">
      <div className={`bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:border-slate-700 transition-all ${isDragging && 'shadow-2xl shadow-black/50 border-amber-500/50'}`}>
        {/* Section Header */}
        <div className="p-4 flex items-center justify-between group">
          <div className="flex items-center gap-4 flex-1">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1.5 text-slate-600 hover:text-slate-400">
              <GripVertical className="w-5 h-5" />
            </div>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
            </button>
            <h3 className="font-bold text-white text-lg">{section.title}</h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-800/50 px-2 py-0.5 rounded">
              {section.lessons.length} Items
            </span>
            <div className="hidden lg:flex flex-wrap gap-1.5">
              {coverageByLocale.map((coverage) => {
                const tone = getCoverageTone(coverage.percent);
                return (
                  <span key={coverage.locale} className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone.badge}`}>
                    {getCourseLanguageLabel(coverage.locale)} {coverage.percent}%
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditSection(section)}
              className="p-2 text-slate-500 hover:text-white transition-colors"
              title="Edit section"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onAddLesson(section.id)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
            <button
              onClick={() => onAddLesson(section.id, 'ARTICLE')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-xl transition-all"
            >
              Reading
            </button>
            <button
              onClick={() => onAddLesson(section.id, 'DOCUMENT')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-xl transition-all"
            >
              Document
            </button>
            <button
              onClick={() => onDelete(section.id)}
              className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
              title="Delete section"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lessons List */}
        {isExpanded && (
          <div className="px-6 pb-6 pt-2 space-y-3">
            <SortableContext 
              items={section.lessons.map(l => l.id)} 
              strategy={verticalListSortingStrategy}
            >
              {section.lessons.map(lesson => (
                <SortableLesson 
                  key={lesson.id} 
                  lesson={lesson} 
                  sourceLocale={sourceLocale}
                  supportedLocales={supportedLocales}
                  onDelete={onDeleteLesson}
                  onEdit={onEditLesson}
                />
              ))}
            </SortableContext>

            {section.lessons.length === 0 && (
              <div className="py-10 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2">
                <p className="text-xs text-slate-500">This section is empty</p>
                <button 
                  onClick={() => onAddLesson(section.id)}
                  className="text-amber-500 text-xs font-bold hover:underline"
                >
                  Create first item
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function CurriculumBuilder({
  courseId,
  initialSections,
  sourceLocale = 'en',
  supportedLocales = ['en'],
}: CurriculumBuilderProps) {
  const normalizedSourceLocale = normalizeCourseLocale(sourceLocale, 'en');
  const editorLocales = useMemo(() => {
    const locales = Array.from(new Set(
      [normalizedSourceLocale, ...supportedLocales.map((localeKey) => normalizeCourseLocale(localeKey, normalizedSourceLocale))]
        .filter((localeKey) => isValidCourseLocale(localeKey))
    ));
    return locales.length > 0 ? locales : [normalizedSourceLocale];
  }, [normalizedSourceLocale, supportedLocales]);
  const translationLocales = useMemo(
    () => editorLocales.filter((localeKey) => localeKey !== normalizedSourceLocale),
    [editorLocales, normalizedSourceLocale]
  );

  const [sections, setSections] = useState<Section[]>(() => (
    (initialSections || []).map((section) => ({
      ...section,
      titleTranslations: normalizeTranslationMap(section.titleTranslations) || {},
      lessons: (section.lessons || []).map((lesson) => ({
        ...lesson,
        description: lesson.description || '',
        content: lesson.content || '',
        videoUrl: lesson.videoUrl || '',
        duration: typeof lesson.duration === 'number' ? lesson.duration : 0,
        isFree: Boolean(lesson.isFree),
        isPublished: lesson.isPublished !== false,
        titleTranslations: normalizeTranslationMap(lesson.titleTranslations) || {},
        descriptionTranslations: normalizeTranslationMap(lesson.descriptionTranslations) || {},
        contentTranslations: normalizeTranslationMap(lesson.contentTranslations) || {},
        resources: normalizeResourceDrafts((lesson as any).resources),
        textTracks: normalizeTrackDrafts((lesson as any).textTracks),
        quiz: normalizeQuizDraft((lesson as any).quiz),
        assignment: normalizeAssignmentDraft((lesson as any).assignment),
        exercise: normalizeExerciseDraft((lesson as any).exercise),
      })),
    }))
  ));
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [isLoadingLessonEditor, setIsLoadingLessonEditor] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionEditDraft | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonEditDraft | null>(null);
  const courseCoverageByLocale = useMemo(() => (
    editorLocales.map((localeKey) => ({
      locale: localeKey,
      ...summarizeLocaleCoverage(
        sections.flatMap((section) => [
          { baseValue: section.title, translations: section.titleTranslations },
          ...section.lessons.flatMap((lesson) => [
            { baseValue: lesson.title, translations: lesson.titleTranslations },
            { baseValue: lesson.description, translations: lesson.descriptionTranslations, required: false },
            { baseValue: lesson.content, translations: lesson.contentTranslations, required: false },
            lesson.type === 'ASSIGNMENT' && lesson.assignment
              ? { baseValue: lesson.assignment.instructions, translations: lesson.assignment.instructionsTranslations, required: false }
              : null,
          ]),
        ].filter(Boolean) as any[]),
        localeKey,
        normalizedSourceLocale
      ),
    }))
  ), [editorLocales, normalizedSourceLocale, sections]);

  const openSectionEditor = useCallback((section: Section) => {
    setEditingSection({
      id: section.id,
      title: section.title || '',
      titleTranslations: normalizeTranslationMap(section.titleTranslations) || {},
    });
  }, []);

  const openLessonEditor = useCallback(async (lesson: Lesson) => {
    setIsLoadingLessonEditor(true);
    setEditingLesson({
      id: lesson.id,
      type: lesson.type || 'ARTICLE',
      title: lesson.title || '',
      titleTranslations: normalizeTranslationMap(lesson.titleTranslations) || {},
      description: lesson.description || '',
      descriptionTranslations: normalizeTranslationMap(lesson.descriptionTranslations) || {},
      content: lesson.content || '',
      contentTranslations: normalizeTranslationMap(lesson.contentTranslations) || {},
      videoUrl: lesson.videoUrl || '',
      duration: typeof lesson.duration === 'number' ? lesson.duration : 0,
      isFree: Boolean(lesson.isFree),
      isPublished: lesson.isPublished !== false,
      resources: normalizeResourceDrafts(lesson.resources),
      textTracks: normalizeTrackDrafts(lesson.textTracks),
      quiz: normalizeQuizDraft(lesson.quiz),
      assignment: normalizeAssignmentDraft(lesson.assignment),
      exercise: normalizeExerciseDraft(lesson.exercise),
    });

    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      const response = await fetch(`${LEARN_SERVICE_URL}/courses/${courseId}/lessons/${lesson.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load lesson details (${response.status})`);
      }

      const data = await response.json();
      const fullLesson = data.lesson || data;
      if (!fullLesson) return;

      setEditingLesson({
        id: fullLesson.id,
        type: fullLesson.type || lesson.type || 'ARTICLE',
        title: fullLesson.title || '',
        titleTranslations: normalizeTranslationMap(fullLesson.titleTranslations) || {},
        description: fullLesson.description || '',
        descriptionTranslations: normalizeTranslationMap(fullLesson.descriptionTranslations) || {},
        content: fullLesson.content || '',
        contentTranslations: normalizeTranslationMap(fullLesson.contentTranslations) || {},
        videoUrl: fullLesson.videoUrl || '',
        duration: typeof fullLesson.duration === 'number' ? fullLesson.duration : 0,
        isFree: Boolean(fullLesson.isFree),
        isPublished: fullLesson.isPublished !== false,
        resources: normalizeResourceDrafts(fullLesson.resources),
        textTracks: normalizeTrackDrafts(fullLesson.textTracks),
        quiz: normalizeQuizDraft(fullLesson.quiz),
        assignment: normalizeAssignmentDraft(fullLesson.assignment),
        exercise: normalizeExerciseDraft(fullLesson.exercise),
      });
    } catch (error) {
      console.error('Error loading full lesson details:', error);
    } finally {
      setIsLoadingLessonEditor(false);
    }
  }, [courseId]);

  const addEditingLessonResource = useCallback(() => {
    setEditingLesson((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        resources: [
          ...previous.resources,
          {
            title: '',
            url: '',
            type: 'FILE',
            locale: normalizedSourceLocale,
            isDefault: previous.resources.length === 0,
          },
        ],
      };
    });
  }, [normalizedSourceLocale]);

  const updateEditingLessonResource = useCallback((
    resourceIndex: number,
    field: keyof LessonResourceDraft,
    value: string | boolean
  ) => {
    setEditingLesson((previous) => {
      if (!previous) return previous;
      const nextResources = [...previous.resources];
      const nextResource = { ...nextResources[resourceIndex], [field]: value } as LessonResourceDraft;
      nextResources[resourceIndex] = nextResource;

      if (field === 'isDefault' && value === true) {
        return {
          ...previous,
          resources: nextResources.map((resource, index) => ({
            ...resource,
            isDefault: index === resourceIndex,
          })),
        };
      }

      return {
        ...previous,
        resources: nextResources,
      };
    });
  }, []);

  const removeEditingLessonResource = useCallback((resourceIndex: number) => {
    setEditingLesson((previous) => {
      if (!previous) return previous;
      const nextResources = previous.resources.filter((_, index) => index !== resourceIndex);
      if (nextResources.length > 0 && !nextResources.some((resource) => resource.isDefault)) {
        nextResources[0].isDefault = true;
      }
      return {
        ...previous,
        resources: nextResources,
      };
    });
  }, []);

  const updateEditingLessonTranslation = useCallback((
    field: 'titleTranslations' | 'descriptionTranslations' | 'contentTranslations',
    localeKey: SupportedLocaleKey,
    value: string
  ) => {
    setEditingLesson((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        [field]: {
          ...(previous[field] || {}),
          [localeKey]: value,
        },
      };
    });
  }, []);

  const updateEditingLessonTrack = useCallback((
    localeKey: SupportedLocaleKey,
    kind: LessonTextTrackDraft['kind'],
    field: 'url' | 'content',
    value: string
  ) => {
    setEditingLesson((previous) => {
      if (!previous) return previous;
      const nextTracks = [...previous.textTracks];
      const trackIndex = nextTracks.findIndex((track) => track.locale === localeKey && track.kind === kind);
      const nextTrack = {
        ...(trackIndex >= 0 ? nextTracks[trackIndex] : {
          locale: localeKey,
          kind,
          label: getCourseLanguageLabel(localeKey),
          isDefault: localeKey === normalizedSourceLocale,
        }),
        [field]: value,
      } as LessonTextTrackDraft;

      if (trackIndex >= 0) {
        nextTracks[trackIndex] = nextTrack;
      } else {
        nextTracks.push(nextTrack);
      }

      return {
        ...previous,
        textTracks: nextTracks.filter((track) => Boolean(track.url?.trim()) || Boolean(track.content?.trim())),
      };
    });
  }, [normalizedSourceLocale]);

  const updateEditingSectionTranslation = useCallback((localeKey: SupportedLocaleKey, value: string) => {
    setEditingSection((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        titleTranslations: {
          ...previous.titleTranslations,
          [localeKey]: value,
        },
      };
    });
  }, []);

  const updateEditingLessonAssignmentField = useCallback((
    field: keyof LessonAssignmentDraft,
    value: string | number | LocalizedTextMap | null
  ) => {
    setEditingLesson((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        assignment: {
          instructions: '',
          instructionsTranslations: {},
          rubric: '',
          rubricTranslations: {},
          maxScore: 100,
          passingScore: 80,
          ...(previous.assignment || {}),
          [field]: value,
        },
      };
    });
  }, []);

  const updateEditingLessonAssignmentTranslation = useCallback((
    field: 'instructionsTranslations' | 'rubricTranslations',
    localeKey: SupportedLocaleKey,
    value: string
  ) => {
    setEditingLesson((previous) => {
      if (!previous) return previous;
      const assignment = {
        instructions: '',
        instructionsTranslations: {},
        rubric: '',
        rubricTranslations: {},
        maxScore: 100,
        passingScore: 80,
        ...(previous.assignment || {}),
      };
      return {
        ...previous,
        assignment: {
          ...assignment,
          [field]: {
            ...(assignment[field] || {}),
            [localeKey]: value,
          },
        },
      };
    });
  }, []);

  const updateEditingLessonExerciseField = useCallback((
    field: keyof LessonExerciseDraft,
    value: string | null
  ) => {
    setEditingLesson((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        exercise: {
          language: 'javascript',
          initialCode: '',
          solutionCode: '',
          testCases: '',
          ...(previous.exercise || {}),
          [field]: value,
        },
      };
    });
  }, []);

  const updateEditingLessonQuiz = useCallback((updater: (quiz: LessonQuizDraft) => LessonQuizDraft) => {
    setEditingLesson((previous) => {
      if (!previous) return previous;
      const nextQuiz = updater(previous.quiz || { passingScore: 80, questions: [createDefaultQuizQuestion(0)] });
      return {
        ...previous,
        quiz: nextQuiz,
      };
    });
  }, []);

  const updateEditingLessonType = useCallback((nextType: string) => {
    setEditingLesson((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        type: nextType,
        quiz: nextType === 'QUIZ'
          ? (previous.quiz || { passingScore: 80, questions: [createDefaultQuizQuestion(0)] })
          : previous.quiz,
        assignment: nextType === 'ASSIGNMENT'
          ? (previous.assignment || {
              instructions: '',
              instructionsTranslations: {},
              rubric: '',
              rubricTranslations: {},
              maxScore: 100,
              passingScore: 80,
            })
          : previous.assignment,
        exercise: nextType === 'EXERCISE'
          ? (previous.exercise || {
              language: 'javascript',
              initialCode: '',
              solutionCode: '',
              testCases: '',
            })
          : previous.exercise,
      };
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    // Handle Section sorting
    const activeSection = sections.find(s => s.id === active.id);
    const overSection = sections.find(s => s.id === over.id);

    if (activeSection && overSection && active.id !== over.id) {
      const previousSections = sections;
      const oldIndex = sections.indexOf(activeSection);
      const newIndex = sections.indexOf(overSection);
      const newArray = arrayMove(sections, oldIndex, newIndex);
      setSections(newArray);
      void syncSectionsOrder(newArray, previousSections);
      return;
    }

    // Handle Lesson sorting within sections
    const activeLessonId = active.id;
    const overLessonId = over.id;

    let sourceSectionId: string | null = null;
    let targetSectionId: string | null = null;

    for (const section of sections) {
      if (section.lessons.some(l => l.id === activeLessonId)) sourceSectionId = section.id;
      if (section.lessons.some(l => l.id === overLessonId)) targetSectionId = section.id;
    }

    if (sourceSectionId && targetSectionId && sourceSectionId === targetSectionId && activeLessonId !== overLessonId) {
      const previousSections = sections;
      const nextSections = sections.map(section => {
        if (section.id !== sourceSectionId) return section;

        const oldIndex = section.lessons.findIndex(l => l.id === activeLessonId);
        const newIndex = section.lessons.findIndex(l => l.id === overLessonId);
        const newLessons = arrayMove(section.lessons, oldIndex, newIndex);
        return { ...section, lessons: newLessons };
      });

      setSections(nextSections);
      const reorderedSection = nextSections.find(section => section.id === sourceSectionId);
      if (reorderedSection) {
        void syncLessonsOrder(sourceSectionId, reorderedSection.lessons, previousSections);
      }
    }
  };

  const syncLessonsOrder = async (sectionId: string, newLessons: Lesson[], previousSections: Section[]) => {
    setIsSyncing(true);
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      const res = await fetch(`${LEARN_SERVICE_URL}/courses/${courseId}/items/reorder`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: newLessons.map((lesson, index) => ({
            id: lesson.id,
            sectionId,
            order: index,
          })),
        }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Failed to reorder items');
      }
    } catch (error) {
      console.error('Error syncing lesson order:', error);
      setSections(previousSections);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncSectionsOrder = async (newSections: Section[], previousSections: Section[]) => {
    setIsSyncing(true);
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      const res = await fetch(`${LEARN_SERVICE_URL}/courses/${courseId}/sections/reorder`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sections: newSections.map((section, index) => ({
            id: section.id,
            order: index,
          })),
        }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Failed to reorder sections');
      }
    } catch (error) {
      console.error('Error syncing section order:', error);
      setSections(previousSections);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSectionMeta = async () => {
    if (!editingSection) return;
    const token = TokenManager.getAccessToken();
    if (!token) return;

    setIsSavingMeta(true);
    try {
      const localizedTitle = resolveLocalizedField(editingSection.title, editingSection.titleTranslations);
      const res = await fetch(`${LEARN_SERVICE_URL}/courses/sections/${editingSection.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: localizedTitle.value,
          titleTranslations: localizedTitle.translations,
        }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Failed to update section');
      }

      setSections((previous) => previous.map((section) => (
        section.id === editingSection.id
          ? {
              ...section,
              title: localizedTitle.value || section.title,
              titleTranslations: localizedTitle.translations || section.titleTranslations,
            }
          : section
      )));
      setEditingSection(null);
    } catch (error) {
      console.error('Error updating section details:', error);
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleSaveLessonMeta = async () => {
    if (!editingLesson) return;
    const token = TokenManager.getAccessToken();
    if (!token) return;

    setIsSavingMeta(true);
    try {
      const localizedTitle = resolveLocalizedField(editingLesson.title, editingLesson.titleTranslations);
      const localizedDescription = resolveLocalizedField(editingLesson.description, editingLesson.descriptionTranslations);
      const localizedContent = resolveLocalizedField(editingLesson.content, editingLesson.contentTranslations);
      const normalizedResources = sanitizeResourceDrafts(editingLesson.resources);
      const normalizedTracks = sanitizeTrackDrafts(editingLesson.textTracks);
      const normalizedQuiz = editingLesson.type === 'QUIZ'
        ? sanitizeQuizDraft(editingLesson.quiz)
        : undefined;
      const assignmentInstructions = editingLesson.assignment
        ? resolveLocalizedField(editingLesson.assignment.instructions, editingLesson.assignment.instructionsTranslations)
        : undefined;
      const assignmentRubric = editingLesson.assignment
        ? resolveLocalizedField(editingLesson.assignment.rubric, editingLesson.assignment.rubricTranslations)
        : undefined;
      const normalizedAssignment = editingLesson.type === 'ASSIGNMENT' && editingLesson.assignment
        ? {
            maxScore: Number.isFinite(Number(editingLesson.assignment.maxScore)) ? Number(editingLesson.assignment.maxScore) : 100,
            passingScore: Number.isFinite(Number(editingLesson.assignment.passingScore)) ? Number(editingLesson.assignment.passingScore) : 80,
            instructions: assignmentInstructions?.value || '',
            instructionsTranslations: assignmentInstructions?.translations,
            rubric: assignmentRubric?.value || '',
            rubricTranslations: assignmentRubric?.translations,
          }
        : undefined;
      const normalizedExercise = editingLesson.type === 'EXERCISE' && editingLesson.exercise
        ? {
            language: editingLesson.exercise.language || 'javascript',
            initialCode: editingLesson.exercise.initialCode || '',
            solutionCode: editingLesson.exercise.solutionCode || '',
            testCases: editingLesson.exercise.testCases || '',
          }
        : undefined;
      const nextDuration = Number.isFinite(Number(editingLesson.duration)) ? Math.max(0, Number(editingLesson.duration)) : 0;
      const nextVideoUrl = editingLesson.videoUrl.trim();

      const res = await fetch(`${LEARN_SERVICE_URL}/courses/items/${editingLesson.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: editingLesson.type,
          title: localizedTitle.value,
          titleTranslations: localizedTitle.translations,
          description: localizedDescription.value,
          descriptionTranslations: localizedDescription.translations,
          content: localizedContent.value,
          contentTranslations: localizedContent.translations,
          videoUrl: nextVideoUrl || null,
          duration: nextDuration,
          isFree: editingLesson.isFree,
          isPublished: editingLesson.isPublished,
          resources: normalizedResources,
          textTracks: normalizedTracks,
          quiz: normalizedQuiz,
          assignment: normalizedAssignment,
          exercise: normalizedExercise,
        }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Failed to update lesson');
      }

      setSections((previous) => previous.map((section) => ({
        ...section,
        lessons: section.lessons.map((lesson) => (
          lesson.id === editingLesson.id
            ? {
                ...lesson,
                type: editingLesson.type,
                title: localizedTitle.value || lesson.title,
                titleTranslations: localizedTitle.translations || lesson.titleTranslations,
                description: localizedDescription.value || lesson.description,
                descriptionTranslations: localizedDescription.translations || lesson.descriptionTranslations,
                content: localizedContent.value || '',
                contentTranslations: localizedContent.translations || {},
                videoUrl: nextVideoUrl,
                duration: nextDuration,
                isFree: editingLesson.isFree,
                isPublished: editingLesson.isPublished,
                resources: normalizedResources,
                textTracks: normalizedTracks,
                quiz: normalizedQuiz,
                assignment: normalizedAssignment,
                exercise: normalizedExercise,
              }
            : lesson
        )),
      })));
      setEditingLesson(null);
    } catch (error) {
      console.error('Error updating lesson details:', error);
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleCreateSection = async () => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${LEARN_SERVICE_URL}/courses/${courseId}/sections`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          title: 'New Section',
          titleTranslations: { [normalizedSourceLocale]: 'New Section' },
          order: sections.length
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSections([
          ...sections,
          {
            ...data.section,
            titleTranslations: normalizeTranslationMap(data.section?.titleTranslations) || { [normalizedSourceLocale]: data.section?.title || 'New Section' },
            lessons: [],
          },
        ]);
      }
    } catch (error) {
      console.error('Error creating section:', error);
    }
  };

  const handleCreateLesson = async (sectionId: string, type = 'VIDEO') => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${LEARN_SERVICE_URL}/courses/sections/${sectionId}/items`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          title: type === 'DOCUMENT' ? 'New Document' : type === 'ARTICLE' ? 'New Reading' : 'New Lesson',
          titleTranslations: { [normalizedSourceLocale]: type === 'DOCUMENT' ? 'New Document' : type === 'ARTICLE' ? 'New Reading' : 'New Lesson' },
          type,
          order: sections.find(s => s.id === sectionId)?.lessons.length || 0
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSections(sections.map(s => 
          s.id === sectionId 
            ? {
                ...s,
                lessons: [
                  ...s.lessons,
                  {
                    ...data.item,
                    description: data.item?.description || '',
                    content: data.item?.content || '',
                    videoUrl: data.item?.videoUrl || '',
                    duration: typeof data.item?.duration === 'number' ? data.item.duration : 0,
                    isFree: Boolean(data.item?.isFree),
                    isPublished: data.item?.isPublished !== false,
                    titleTranslations: normalizeTranslationMap(data.item?.titleTranslations) || { [normalizedSourceLocale]: data.item?.title || 'New Lesson' },
                    descriptionTranslations: normalizeTranslationMap(data.item?.descriptionTranslations) || {},
                    contentTranslations: normalizeTranslationMap(data.item?.contentTranslations) || {},
                    resources: normalizeResourceDrafts(data.item?.resources),
                    textTracks: normalizeTrackDrafts(data.item?.textTracks),
                    quiz: normalizeQuizDraft(data.item?.quiz),
                    assignment: normalizeAssignmentDraft(data.item?.assignment),
                    exercise: normalizeExerciseDraft(data.item?.exercise),
                  },
                ],
              } 
            : s
        ));
      }
    } catch (error) {
      console.error('Error creating lesson:', error);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    const previousSections = sections;
    const nextSections = sections.map((section) => ({
      ...section,
      lessons: section.lessons.filter((lesson) => lesson.id !== lessonId),
    }));

    setSections(nextSections);

    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        setSections(previousSections);
        return;
      }

      const res = await fetch(`${LEARN_SERVICE_URL}/courses/items/${lessonId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || `Failed to delete item ${lessonId}`);
      }
    } catch (error) {
      console.error('Error deleting lesson:', error);
      setSections(previousSections);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    const previousSections = sections;
    const nextSections = sections.filter((section) => section.id !== sectionId);
    setSections(nextSections);

    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        setSections(previousSections);
        return;
      }

      const res = await fetch(`${LEARN_SERVICE_URL}/courses/sections/${sectionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || `Failed to delete section ${sectionId}`);
      }
    } catch (error) {
      console.error('Error deleting section:', error);
      setSections(previousSections);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/35 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Translation Coverage</p>
          {courseCoverageByLocale.map((coverage) => {
            const tone = getCoverageTone(coverage.percent);
            return (
              <span key={coverage.locale} className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${tone.badge}`}>
                {getCourseLanguageLabel(coverage.locale)} {coverage.percent}%
              </span>
            );
          })}
        </div>
      </div>
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={sections.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map(section => (
            <SortableSection 
              key={section.id} 
              section={section} 
              sourceLocale={normalizedSourceLocale}
              supportedLocales={editorLocales}
              onDelete={handleDeleteSection}
              onAddLesson={handleCreateLesson}
              onDeleteLesson={handleDeleteLesson}
              onEditSection={openSectionEditor}
              onEditLesson={openLessonEditor}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button 
        onClick={handleCreateSection}
        className="w-full py-8 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-3 text-slate-500 hover:border-amber-500/50 hover:bg-amber-500/5 hover:text-slate-300 transition-all group"
      >
        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center group-hover:bg-amber-500/20 group-hover:text-amber-500 transition-all">
          <Plus className="w-6 h-6" />
        </div>
        <span className="font-bold">Add New Section</span>
      </button>

      {editingSection && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Edit Section</h3>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                Default Title ({getCourseLanguageLabel(normalizedSourceLocale)})
              </label>
              <input
                type="text"
                value={editingSection.title}
                onChange={(event) => setEditingSection((previous) => (
                  previous ? { ...previous, title: event.target.value } : previous
                ))}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            {translationLocales.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {translationLocales.map((localeKey) => (
                  <div key={`section-${editingSection.id}-${localeKey}`} className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                      {getCourseLanguageLabel(localeKey)}
                    </label>
                    <input
                      type="text"
                      value={editingSection.titleTranslations[localeKey] || ''}
                      onChange={(event) => updateEditingSectionTranslation(localeKey, event.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-sky-700/40 bg-sky-900/10 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingSection(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                disabled={isSavingMeta}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSectionMeta}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-400 transition-colors disabled:opacity-60"
                disabled={isSavingMeta}
              >
                {isSavingMeta ? 'Saving...' : 'Save Section'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingLesson && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Edit Lesson</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Tune the lesson format, localizations, and delivery payload from one editor.
                </p>
              </div>
              {isLoadingLessonEditor && (
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading full lesson data
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Lesson Type</label>
                <select
                  value={editingLesson.type}
                  onChange={(event) => updateEditingLessonType(event.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {LESSON_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Playback / Study Time (Minutes)</label>
                <input
                  type="number"
                  min={0}
                  value={editingLesson.duration}
                  onChange={(event) => setEditingLesson((previous) => (
                    previous ? { ...previous, duration: Number(event.target.value) || 0 } : previous
                  ))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-slate-700 bg-slate-800/30 px-4 py-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={editingLesson.isFree}
                  onChange={(event) => setEditingLesson((previous) => (
                    previous ? { ...previous, isFree: event.target.checked } : previous
                  ))}
                  className="h-4 w-4 rounded border-slate-500 text-amber-500 focus:ring-amber-500"
                />
                Free preview lesson
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={editingLesson.isPublished}
                  onChange={(event) => setEditingLesson((previous) => (
                    previous ? { ...previous, isPublished: event.target.checked } : previous
                  ))}
                  className="h-4 w-4 rounded border-slate-500 text-amber-500 focus:ring-amber-500"
                />
                Published and visible to learners
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                Default Title ({getCourseLanguageLabel(normalizedSourceLocale)})
              </label>
              <input
                type="text"
                value={editingLesson.title}
                onChange={(event) => setEditingLesson((previous) => (
                  previous ? { ...previous, title: event.target.value } : previous
                ))}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            {translationLocales.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {translationLocales.map((localeKey) => (
                  <div key={`lesson-title-${editingLesson.id}-${localeKey}`} className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                      {getCourseLanguageLabel(localeKey)} Title
                    </label>
                    <input
                      type="text"
                      value={editingLesson.titleTranslations[localeKey] || ''}
                      onChange={(event) => updateEditingLessonTranslation('titleTranslations', localeKey, event.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-sky-700/40 bg-sky-900/10 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                Default Description ({getCourseLanguageLabel(normalizedSourceLocale)})
              </label>
              <textarea
                value={editingLesson.description}
                onChange={(event) => setEditingLesson((previous) => (
                  previous ? { ...previous, description: event.target.value } : previous
                ))}
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
              />
            </div>
            {translationLocales.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {translationLocales.map((localeKey) => (
                  <div key={`lesson-description-${editingLesson.id}-${localeKey}`} className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                      {getCourseLanguageLabel(localeKey)} Description
                    </label>
                    <textarea
                      value={editingLesson.descriptionTranslations[localeKey] || ''}
                      onChange={(event) => updateEditingLessonTranslation('descriptionTranslations', localeKey, event.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl border border-sky-700/40 bg-sky-900/10 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-800/40 p-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Lesson Body</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Use this for article-style learning, document summaries, guided notes, or mixed-format lesson text.
                </p>
              </div>
              <textarea
                value={editingLesson.content}
                onChange={(event) => setEditingLesson((previous) => (
                  previous ? { ...previous, content: event.target.value } : previous
                ))}
                rows={7}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
              />
              {translationLocales.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {translationLocales.map((localeKey) => (
                    <div key={`lesson-content-${editingLesson.id}-${localeKey}`} className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                        {getCourseLanguageLabel(localeKey)} Body
                      </label>
                      <textarea
                        value={editingLesson.contentTranslations[localeKey] || ''}
                        onChange={(event) => updateEditingLessonTranslation('contentTranslations', localeKey, event.target.value)}
                        rows={5}
                        className="w-full px-3 py-2 rounded-xl border border-violet-700/40 bg-violet-900/10 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(editingLesson.type === 'VIDEO' || editingLesson.type === 'AUDIO') && (
              <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-800/40 p-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                    {editingLesson.type === 'AUDIO' ? 'Audio Stream' : 'Video Stream'}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Point this lesson at a hosted media URL or signed asset URL.
                  </p>
                </div>
                <input
                  type="url"
                  value={editingLesson.videoUrl}
                  onChange={(event) => setEditingLesson((previous) => (
                    previous ? { ...previous, videoUrl: event.target.value } : previous
                  ))}
                  placeholder="https://cdn.example.com/lesson.m3u8"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}

            {(editingLesson.type === 'VIDEO' || editingLesson.type === 'AUDIO' || editingLesson.type === 'ARTICLE' || editingLesson.type === 'DOCUMENT') && (
              <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-800/40 p-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Text Tracks And Transcripts</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Add subtitle files, captions, or fully inlined transcripts for each supported language.
                  </p>
                </div>
                <div className="space-y-4">
                  {editorLocales.map((localeKey) => (
                    <div key={`tracks-${editingLesson.id}-${localeKey}`} className="rounded-xl border border-slate-700 bg-slate-900/50 p-3 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">
                        {getCourseLanguageLabel(localeKey)}
                      </p>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold text-slate-400">Subtitle / Caption URL</label>
                        <input
                          type="url"
                          value={
                            editingLesson.textTracks.find((track) => track.locale === localeKey && (track.kind === 'SUBTITLE' || track.kind === 'CAPTION'))?.url || ''
                          }
                          onChange={(event) => updateEditingLessonTrack(localeKey, 'SUBTITLE', 'url', event.target.value)}
                          placeholder="https://cdn.example.com/subtitles.vtt"
                          className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold text-slate-400">Transcript Text</label>
                        <textarea
                          value={editingLesson.textTracks.find((track) => track.locale === localeKey && track.kind === 'TRANSCRIPT')?.content || ''}
                          onChange={(event) => updateEditingLessonTrack(localeKey, 'TRANSCRIPT', 'content', event.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-800/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Localized Resources</p>
                  <p className="mt-1 text-[11px] text-slate-500">Add lesson files/links for each supported language and mark one default fallback.</p>
                </div>
                <button
                  type="button"
                  onClick={addEditingLessonResource}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-[11px] font-semibold text-slate-100 hover:bg-slate-600 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Resource
                </button>
              </div>

              {editingLesson.resources.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-600 bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
                  No localized resources yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {editingLesson.resources.map((resource, resourceIndex) => (
                    <div key={`${editingLesson.id}-resource-${resourceIndex}`} className="rounded-xl border border-slate-700 bg-slate-900/50 p-3 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={resource.title}
                          onChange={(event) => updateEditingLessonResource(resourceIndex, 'title', event.target.value)}
                          placeholder="Resource title"
                          className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="url"
                          value={resource.url}
                          onChange={(event) => updateEditingLessonResource(resourceIndex, 'url', event.target.value)}
                          placeholder="https://..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={resource.type}
                          onChange={(event) => updateEditingLessonResource(resourceIndex, 'type', event.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="FILE">File</option>
                          <option value="LINK">Link</option>
                          <option value="VIDEO">Video</option>
                          <option value="PDF">PDF</option>
                          <option value="AUDIO">Audio</option>
                        </select>
                        <select
                          value={resource.locale}
                          onChange={(event) => updateEditingLessonResource(resourceIndex, 'locale', normalizeResourceLocale(event.target.value))}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          {editorLocales.map((localeKey) => (
                            <option key={localeKey} value={localeKey}>{getCourseLanguageLabel(localeKey)}</option>
                          ))}
                        </select>
                        <label className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={resource.isDefault}
                            onChange={(event) => updateEditingLessonResource(resourceIndex, 'isDefault', event.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-500 text-amber-500 focus:ring-amber-500"
                          />
                          Default fallback
                        </label>
                        <button
                          type="button"
                          onClick={() => removeEditingLessonResource(resourceIndex)}
                          className="ml-auto rounded-lg border border-rose-500/40 px-2 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/10 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {editingLesson.type === 'QUIZ' && (
              <div className="space-y-3 rounded-2xl border border-blue-700/40 bg-blue-950/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-blue-200 font-semibold">Quiz Builder</p>
                    <p className="mt-1 text-[11px] text-blue-100/70">Create assessment questions directly inside the curriculum editor.</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-100">
                    <label className="text-xs uppercase tracking-widest font-semibold">Passing Score</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={editingLesson.quiz?.passingScore ?? 80}
                      onChange={(event) => updateEditingLessonQuiz((quiz) => ({
                        ...quiz,
                        passingScore: Number(event.target.value) || 80,
                      }))}
                      className="w-20 rounded-xl border border-blue-600/40 bg-slate-900/60 px-3 py-2 text-right text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {(editingLesson.quiz?.questions || []).map((question, questionIndex) => (
                    <div key={`quiz-question-${questionIndex}`} className="rounded-xl border border-blue-700/30 bg-slate-950/40 p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-blue-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-100">
                          Question {questionIndex + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateEditingLessonQuiz((quiz) => ({
                            ...quiz,
                            questions: quiz.questions.filter((_, index) => index !== questionIndex).map((item, index) => ({
                              ...item,
                              order: index,
                            })),
                          }))}
                          className="ml-auto rounded-lg border border-rose-500/40 px-2 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/10 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        type="text"
                        value={question.question}
                        onChange={(event) => updateEditingLessonQuiz((quiz) => ({
                          ...quiz,
                          questions: quiz.questions.map((item, index) => (
                            index === questionIndex ? { ...item, question: event.target.value } : item
                          )),
                        }))}
                        placeholder="Type the question prompt"
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <textarea
                        value={question.explanation || ''}
                        onChange={(event) => updateEditingLessonQuiz((quiz) => ({
                          ...quiz,
                          questions: quiz.questions.map((item, index) => (
                            index === questionIndex ? { ...item, explanation: event.target.value } : item
                          )),
                        }))}
                        rows={2}
                        placeholder="Optional explanation learners see after answering"
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
                      />
                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <div key={`quiz-option-${questionIndex}-${optionIndex}`} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
                            <input
                              type="radio"
                              name={`quiz-correct-${questionIndex}`}
                              checked={option.isCorrect}
                              onChange={() => updateEditingLessonQuiz((quiz) => ({
                                ...quiz,
                                questions: quiz.questions.map((item, index) => (
                                  index === questionIndex
                                    ? {
                                        ...item,
                                        options: item.options.map((candidate, candidateIndex) => ({
                                          ...candidate,
                                          isCorrect: candidateIndex === optionIndex,
                                        })),
                                      }
                                    : item
                                )),
                              }))}
                              className="h-4 w-4 border-slate-500 text-blue-500 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              value={option.text}
                              onChange={(event) => updateEditingLessonQuiz((quiz) => ({
                                ...quiz,
                                questions: quiz.questions.map((item, index) => (
                                  index === questionIndex
                                    ? {
                                        ...item,
                                        options: item.options.map((candidate, candidateIndex) => (
                                          candidateIndex === optionIndex ? { ...candidate, text: event.target.value } : candidate
                                        )),
                                      }
                                    : item
                                )),
                              }))}
                              placeholder={`Answer option ${optionIndex + 1}`}
                              className="flex-1 rounded-lg border border-transparent bg-transparent px-1 py-1 text-sm text-slate-100 focus:border-slate-600 focus:outline-none"
                            />
                            {question.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => updateEditingLessonQuiz((quiz) => ({
                                  ...quiz,
                                  questions: quiz.questions.map((item, index) => (
                                    index === questionIndex
                                      ? {
                                          ...item,
                                          options: item.options.filter((_, candidateIndex) => candidateIndex !== optionIndex),
                                        }
                                      : item
                                  )),
                                }))}
                                className="rounded-lg p-1 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {question.options.length < 5 && (
                        <button
                          type="button"
                          onClick={() => updateEditingLessonQuiz((quiz) => ({
                            ...quiz,
                            questions: quiz.questions.map((item, index) => (
                              index === questionIndex
                                ? {
                                    ...item,
                                    options: [...item.options, { text: '', isCorrect: false }],
                                  }
                                : item
                            )),
                          }))}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-500/30 px-3 py-1.5 text-xs font-semibold text-blue-100 hover:bg-blue-500/10 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add option
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => updateEditingLessonQuiz((quiz) => ({
                    ...quiz,
                    questions: [...quiz.questions, createDefaultQuizQuestion(quiz.questions.length)],
                  }))}
                  className="inline-flex items-center gap-2 rounded-xl border border-dashed border-blue-500/40 px-4 py-2 text-sm font-semibold text-blue-100 hover:bg-blue-500/10 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add question
                </button>
              </div>
            )}

            {editingLesson.type === 'ASSIGNMENT' && (
              <div className="space-y-3 rounded-2xl border border-indigo-700/40 bg-indigo-950/20 p-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-indigo-200 font-semibold">Assignment Brief</p>
                  <p className="mt-1 text-[11px] text-indigo-100/70">Set scoring, instructions, and optional rubric text for project-style lessons.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Max Score</label>
                    <input
                      type="number"
                      min={1}
                      value={editingLesson.assignment?.maxScore ?? 100}
                      onChange={(event) => updateEditingLessonAssignmentField('maxScore', Number(event.target.value) || 100)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Passing Score</label>
                    <input
                      type="number"
                      min={1}
                      value={editingLesson.assignment?.passingScore ?? 80}
                      onChange={(event) => updateEditingLessonAssignmentField('passingScore', Number(event.target.value) || 80)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                    Default Instructions ({getCourseLanguageLabel(normalizedSourceLocale)})
                  </label>
                  <textarea
                    value={editingLesson.assignment?.instructions || ''}
                    onChange={(event) => updateEditingLessonAssignmentField('instructions', event.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                  />
                </div>
                {translationLocales.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {translationLocales.map((localeKey) => (
                      <div key={`assignment-instructions-${localeKey}`} className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                          {getCourseLanguageLabel(localeKey)} Instructions
                        </label>
                        <textarea
                          value={editingLesson.assignment?.instructionsTranslations?.[localeKey] || ''}
                          onChange={(event) => updateEditingLessonAssignmentTranslation('instructionsTranslations', localeKey, event.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 rounded-xl border border-indigo-700/30 bg-indigo-900/10 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                    Rubric / Evaluation Notes ({getCourseLanguageLabel(normalizedSourceLocale)})
                  </label>
                  <textarea
                    value={editingLesson.assignment?.rubric || ''}
                    onChange={(event) => updateEditingLessonAssignmentField('rubric', event.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                  />
                </div>
                {translationLocales.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {translationLocales.map((localeKey) => (
                      <div key={`assignment-rubric-${localeKey}`} className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                          {getCourseLanguageLabel(localeKey)} Rubric
                        </label>
                        <textarea
                          value={editingLesson.assignment?.rubricTranslations?.[localeKey] || ''}
                          onChange={(event) => updateEditingLessonAssignmentTranslation('rubricTranslations', localeKey, event.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 rounded-xl border border-indigo-700/30 bg-indigo-900/10 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {editingLesson.type === 'EXERCISE' && (
              <div className="space-y-3 rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-4">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-emerald-300" />
                  <div>
                    <p className="text-xs uppercase tracking-widest text-emerald-200 font-semibold">Coding Exercise</p>
                    <p className="mt-1 text-[11px] text-emerald-100/70">Configure starter code, reference solution, and simple test expectations.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Language</label>
                  <select
                    value={editingLesson.exercise?.language || 'javascript'}
                    onChange={(event) => updateEditingLessonExerciseField('language', event.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {EXERCISE_LANGUAGE_OPTIONS.map((language) => (
                      <option key={language} value={language}>{language}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Starter Code</label>
                  <textarea
                    value={editingLesson.exercise?.initialCode || ''}
                    onChange={(event) => updateEditingLessonExerciseField('initialCode', event.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/60 font-mono text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Reference Solution</label>
                  <textarea
                    value={editingLesson.exercise?.solutionCode || ''}
                    onChange={(event) => updateEditingLessonExerciseField('solutionCode', event.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/60 font-mono text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Test Cases / Runner Notes</label>
                  <textarea
                    value={editingLesson.exercise?.testCases || ''}
                    onChange={(event) => updateEditingLessonExerciseField('testCases', event.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/60 font-mono text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingLesson(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                disabled={isSavingMeta}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLessonMeta}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-400 transition-colors disabled:opacity-60"
                disabled={isSavingMeta}
              >
                {isSavingMeta ? 'Saving...' : 'Save Lesson'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Status Overlay */}
      {(isSyncing || isSavingMeta) && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-full flex items-center gap-3 shadow-2xl z-50">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-bold text-white tracking-widest uppercase">Saving changes...</span>
        </div>
      )}
    </div>
  );
}
