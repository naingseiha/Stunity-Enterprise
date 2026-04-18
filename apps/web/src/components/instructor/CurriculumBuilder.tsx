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
  ChevronUp
} from 'lucide-react';
import { LEARN_SERVICE_URL } from '@/lib/api/config';
import { TokenManager } from '@/lib/api/auth';
import { getCoverageTone, summarizeLocaleCoverage } from '@/lib/course-translation-coverage';

type SupportedLocaleKey = 'en' | 'km';
type LocalizedTextMap = Partial<Record<SupportedLocaleKey, string>>;
type LessonResourceDraft = {
  title: string;
  url: string;
  type: 'FILE' | 'LINK' | 'VIDEO';
  locale: SupportedLocaleKey;
  isDefault: boolean;
};

const getTrimmedText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const normalizeTranslationMap = (translations?: unknown): LocalizedTextMap | undefined => {
  if (!translations || typeof translations !== 'object') return undefined;

  const map = translations as Record<string, unknown>;
  const normalized: LocalizedTextMap = {};

  if (typeof map.en === 'string' && map.en.trim()) normalized.en = map.en.trim();
  if (typeof map.km === 'string' && map.km.trim()) normalized.km = map.km.trim();

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const resolveLocalizedField = (
  baseValue: unknown,
  translations?: LocalizedTextMap | null
): { value: string; translations?: LocalizedTextMap } => {
  const base = getTrimmedText(baseValue);
  const normalizedTranslations = normalizeTranslationMap(translations);
  const fallback = base || normalizedTranslations?.en || normalizedTranslations?.km || '';

  if (!normalizedTranslations) {
    return { value: fallback };
  }

  return {
    value: fallback,
    translations: normalizedTranslations,
  };
};

const normalizeResourceLocale = (value: unknown): SupportedLocaleKey => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : 'en';
  if (normalized.startsWith('km') || normalized === 'kh') return 'km';
  return 'en';
};

const normalizeResourceDrafts = (resources: unknown): LessonResourceDraft[] => {
  if (!Array.isArray(resources)) return [];
  const drafts = resources.map((resource) => {
    const input = typeof resource === 'object' && resource ? resource as Record<string, unknown> : {};
    return {
      title: typeof input.title === 'string' ? input.title : '',
      url: typeof input.url === 'string' ? input.url : '',
      type: input.type === 'LINK' || input.type === 'VIDEO' ? input.type : 'FILE',
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

interface Lesson {
  id: string;
  title: string;
  titleTranslations?: LocalizedTextMap;
  type: string;
  description?: string | null;
  descriptionTranslations?: LocalizedTextMap;
  resources?: LessonResourceDraft[];
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
  title: string;
  titleTranslations: LocalizedTextMap;
  description: string;
  descriptionTranslations: LocalizedTextMap;
  resources: LessonResourceDraft[];
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
                {coverage.locale} {coverage.percent}%
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
                    {coverage.locale} {coverage.percent}%
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
  const [sections, setSections] = useState<Section[]>(() => (
    (initialSections || []).map((section) => ({
      ...section,
      titleTranslations: normalizeTranslationMap(section.titleTranslations) || {},
      lessons: (section.lessons || []).map((lesson) => ({
        ...lesson,
        description: lesson.description || '',
        titleTranslations: normalizeTranslationMap(lesson.titleTranslations) || {},
        descriptionTranslations: normalizeTranslationMap(lesson.descriptionTranslations) || {},
        resources: normalizeResourceDrafts((lesson as any).resources),
      })),
    }))
  ));
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionEditDraft | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonEditDraft | null>(null);
  const courseCoverageByLocale = useMemo(() => (
    supportedLocales.map((localeKey) => ({
      locale: localeKey,
      ...summarizeLocaleCoverage(
        sections.flatMap((section) => [
          { baseValue: section.title, translations: section.titleTranslations },
          ...section.lessons.flatMap((lesson) => [
            { baseValue: lesson.title, translations: lesson.titleTranslations },
            { baseValue: lesson.description, translations: lesson.descriptionTranslations, required: false },
          ]),
        ]),
        localeKey,
        sourceLocale
      ),
    }))
  ), [sections, sourceLocale, supportedLocales]);

  const openSectionEditor = useCallback((section: Section) => {
    setEditingSection({
      id: section.id,
      title: section.title || '',
      titleTranslations: normalizeTranslationMap(section.titleTranslations) || {},
    });
  }, []);

  const openLessonEditor = useCallback((lesson: Lesson) => {
    setEditingLesson({
      id: lesson.id,
      title: lesson.title || '',
      titleTranslations: normalizeTranslationMap(lesson.titleTranslations) || {},
      description: lesson.description || '',
      descriptionTranslations: normalizeTranslationMap(lesson.descriptionTranslations) || {},
      resources: normalizeResourceDrafts(lesson.resources),
    });
  }, []);

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
            locale: sourceLocale,
            isDefault: previous.resources.length === 0,
          },
        ],
      };
    });
  }, [sourceLocale]);

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
      const normalizedResources = sanitizeResourceDrafts(editingLesson.resources);

      const res = await fetch(`${LEARN_SERVICE_URL}/courses/items/${editingLesson.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: localizedTitle.value,
          titleTranslations: localizedTitle.translations,
          description: localizedDescription.value,
          descriptionTranslations: localizedDescription.translations,
          resources: normalizedResources,
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
                title: localizedTitle.value || lesson.title,
                titleTranslations: localizedTitle.translations || lesson.titleTranslations,
                description: localizedDescription.value || lesson.description,
                descriptionTranslations: localizedDescription.translations || lesson.descriptionTranslations,
                resources: normalizedResources,
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
          titleTranslations: { en: 'New Section' },
          order: sections.length
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSections([
          ...sections,
          {
            ...data.section,
            titleTranslations: normalizeTranslationMap(data.section?.titleTranslations) || { en: data.section?.title || 'New Section' },
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
          titleTranslations: { en: type === 'DOCUMENT' ? 'New Document' : type === 'ARTICLE' ? 'New Reading' : 'New Lesson' },
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
                    titleTranslations: normalizeTranslationMap(data.item?.titleTranslations) || { en: data.item?.title || 'New Lesson' },
                    descriptionTranslations: normalizeTranslationMap(data.item?.descriptionTranslations) || {},
                    resources: normalizeResourceDrafts(data.item?.resources),
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
                {coverage.locale} {coverage.percent}%
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
              sourceLocale={sourceLocale}
              supportedLocales={supportedLocales}
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
              <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Default Title</label>
              <input
                type="text"
                value={editingSection.title}
                onChange={(event) => setEditingSection((previous) => (
                  previous ? { ...previous, title: event.target.value } : previous
                ))}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">English</label>
                <input
                  type="text"
                  value={editingSection.titleTranslations.en || ''}
                  onChange={(event) => setEditingSection((previous) => (
                    previous
                      ? {
                          ...previous,
                          titleTranslations: { ...previous.titleTranslations, en: event.target.value },
                        }
                      : previous
                  ))}
                  className="w-full px-3 py-2 rounded-xl border border-sky-700/60 bg-sky-900/10 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Khmer</label>
                <input
                  type="text"
                  value={editingSection.titleTranslations.km || ''}
                  onChange={(event) => setEditingSection((previous) => (
                    previous
                      ? {
                          ...previous,
                          titleTranslations: { ...previous.titleTranslations, km: event.target.value },
                        }
                      : previous
                  ))}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-700/60 bg-emerald-900/10 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
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
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Edit Lesson</h3>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Default Title</label>
              <input
                type="text"
                value={editingLesson.title}
                onChange={(event) => setEditingLesson((previous) => (
                  previous ? { ...previous, title: event.target.value } : previous
                ))}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">English Title</label>
                <input
                  type="text"
                  value={editingLesson.titleTranslations.en || ''}
                  onChange={(event) => setEditingLesson((previous) => (
                    previous
                      ? {
                          ...previous,
                          titleTranslations: { ...previous.titleTranslations, en: event.target.value },
                        }
                      : previous
                  ))}
                  className="w-full px-3 py-2 rounded-xl border border-sky-700/60 bg-sky-900/10 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Khmer Title</label>
                <input
                  type="text"
                  value={editingLesson.titleTranslations.km || ''}
                  onChange={(event) => setEditingLesson((previous) => (
                    previous
                      ? {
                          ...previous,
                          titleTranslations: { ...previous.titleTranslations, km: event.target.value },
                        }
                      : previous
                  ))}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-700/60 bg-emerald-900/10 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Default Description</label>
              <textarea
                value={editingLesson.description}
                onChange={(event) => setEditingLesson((previous) => (
                  previous ? { ...previous, description: event.target.value } : previous
                ))}
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">English Description</label>
                <textarea
                  value={editingLesson.descriptionTranslations.en || ''}
                  onChange={(event) => setEditingLesson((previous) => (
                    previous
                      ? {
                          ...previous,
                          descriptionTranslations: { ...previous.descriptionTranslations, en: event.target.value },
                        }
                      : previous
                  ))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-sky-700/60 bg-sky-900/10 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Khmer Description</label>
                <textarea
                  value={editingLesson.descriptionTranslations.km || ''}
                  onChange={(event) => setEditingLesson((previous) => (
                    previous
                      ? {
                          ...previous,
                          descriptionTranslations: { ...previous.descriptionTranslations, km: event.target.value },
                        }
                      : previous
                  ))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-700/60 bg-emerald-900/10 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                />
              </div>
            </div>
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
                        </select>
                        <select
                          value={resource.locale}
                          onChange={(event) => updateEditingLessonResource(resourceIndex, 'locale', normalizeResourceLocale(event.target.value))}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          {supportedLocales.map((localeKey) => (
                            <option key={localeKey} value={localeKey}>{localeKey.toUpperCase()}</option>
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
