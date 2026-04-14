'use client';

import { useState, useCallback } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects
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
  MoreHorizontal
} from 'lucide-react';
import { LEARN_SERVICE_URL } from '@/lib/api/config';
import { TokenManager } from '@/lib/api/auth';

interface Lesson {
  id: string;
  title: string;
  type: string;
  order: number;
}

interface Section {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface CurriculumBuilderProps {
  courseId: string;
  initialSections: Section[];
}

// ============================================
// SUB-COMPONENTS (Sortable Items)
// ============================================

function SortableLesson({ lesson, onDelete }: { lesson: Lesson; onDelete: (id: string) => void }) {
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

  const getIcon = () => {
    switch (lesson.type) {
      case 'VIDEO': return <Video className="w-4 h-4 text-sky-400" />;
      case 'ARTICLE': return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'QUIZ': return <HelpCircle className="w-4 h-4 text-purple-400" />;
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
      </div>

      <div className="flex items-center gap-w opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-2 text-slate-500 hover:text-white transition-colors">
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
  onDelete, 
  onAddLesson 
}: { 
  section: Section; 
  onDelete: (id: string) => void;
  onAddLesson: (sectionId: string) => void;
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
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => onAddLesson(section.id)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
            <button className="p-2 text-slate-500 hover:text-white transition-colors">
              <MoreHorizontal className="w-5 h-5" />
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
                  onDelete={() => {}} 
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

export default function CurriculumBuilder({ courseId, initialSections }: CurriculumBuilderProps) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [isSyncing, setIsSyncing] = useState(false);

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
      const oldIndex = sections.indexOf(activeSection);
      const newIndex = sections.indexOf(overSection);
      const newArray = arrayMove(sections, oldIndex, newIndex);
      setSections(newArray);
      syncSectionsOrder(newArray);
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
      setSections(prev => prev.map(section => {
        if (section.id === sourceSectionId) {
          const oldIndex = section.lessons.findIndex(l => l.id === activeLessonId);
          const newIndex = section.lessons.findIndex(l => l.id === overLessonId);
          const newLessons = arrayMove(section.lessons, oldIndex, newIndex);
          syncLessonsOrder(section.id, newLessons);
          return { ...section, lessons: newLessons };
        }
        return section;
      }));
    }
  };

  const syncLessonsOrder = async (sectionId: string, newLessons: Lesson[]) => {
    setIsSyncing(true);
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      // In a real app, we'd send the new order to the backend
      console.log(`Syncing lessons for section ${sectionId}:`, newLessons.map(l => l.id));
    } finally {
      setIsSyncing(false);
    }
  };

  const syncSectionsOrder = async (newSections: Section[]) => {
    setIsSyncing(true);
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      // Batch update logic would go here
      // For now, we'll just mock the success
      console.log('Syncing new order:', newSections.map(s => s.id));
    } finally {
      setIsSyncing(false);
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
          order: sections.length
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSections([...sections, { ...data.section, lessons: [] }]);
      }
    } catch (error) {
      console.error('Error creating section:', error);
    }
  };

  const handleCreateLesson = async (sectionId: string) => {
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
          title: 'New Lesson',
          type: 'VIDEO',
          order: sections.find(s => s.id === sectionId)?.lessons.length || 0
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSections(sections.map(s => 
          s.id === sectionId 
            ? { ...s, lessons: [...s.lessons, data.item] } 
            : s
        ));
      }
    } catch (error) {
      console.error('Error creating lesson:', error);
    }
  };

  return (
    <div className="space-y-6">
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
              onDelete={() => {}}
              onAddLesson={handleCreateLesson}
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

      {/* Sync Status Overlay */}
      {isSyncing && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-full flex items-center gap-3 shadow-2xl z-50">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-bold text-white tracking-widest uppercase">Saving changes...</span>
        </div>
      )}
    </div>
  );
}
