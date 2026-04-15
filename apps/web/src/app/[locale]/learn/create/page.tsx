'use client';

import { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { LEARN_SERVICE_URL } from '@/lib/api/config';
import UnifiedNavigation from '@/components/UnifiedNavigation';

// ============================================
// INTERFACES
// ============================================

interface Lesson {
  id: string;
  type: string; // 'VIDEO' | 'QUIZ' | 'ASSIGNMENT' | 'EXERCISE'
  title: string;
  description: string;
  duration: number;
  isFree: boolean;
  content: string;
  videoUrl: string;
  
  // Polymorphic Payloads
  quiz?: {
    passingScore: number;
    questions: { question: string; explanation?: string; order: number; options: { text: string; isCorrect: boolean }[] }[];
  };
  assignment?: {
    maxScore: number;
    passingScore: number;
    instructions: string;
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

// ============================================
// CONSTANTS
// ============================================

const FEED_SERVICE = LEARN_SERVICE_URL;

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
  const locale = (params?.locale as string) || 'en';

  // Wizard state
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Course data
  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    category: '',
    level: 'BEGINNER',
    thumbnail: '',
    tags: [] as string[],
  });

  // Sections & Lessons
  const [sections, setSections] = useState<Section[]>([
    { id: `sec-${Date.now()}`, title: 'Chapter 1: Introduction', order: 0, items: [] }
  ]);
  const [newTag, setNewTag] = useState('');

  const getAuthToken = useCallback(() => TokenManager.getAccessToken(), []);

  // Validation
  const isStep1Valid = courseData.title.trim().length >= 5
    && courseData.description.trim().length >= 20
    && Boolean(courseData.category.trim());
    
  const validSections = sections.map(s => ({
    ...s,
    items: s.items.filter(item => item.title.trim().length > 0)
  }));
  const isStep3Valid = validSections.some(s => s.items.length > 0);

  const addSection = () => {
    setSections([
      ...sections,
      { id: `sec-${Date.now()}`, title: `Chapter ${sections.length + 1}`, order: sections.length, items: [] }
    ]);
  };

  const updateSectionTitle = (sIdx: number, title: string) => {
    const updated = [...sections];
    updated[sIdx].title = title;
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
      description: '',
      duration: 10,
      isFree: updated[sIdx].items.length === 0 && sIdx === 0,
      content: '',
      videoUrl: '',
      ...(type === 'QUIZ' ? { quiz: { passingScore: 80, questions: [] } } : {}),
      ...(type === 'ASSIGNMENT' ? { assignment: { maxScore: 100, passingScore: 80, instructions: '' } } : {}),
      ...(type === 'EXERCISE' ? { exercise: { language: 'java', initialCode: '// Write code here', solutionCode: '' } } : {}),
      ...(type === 'IMAGE' || type === 'FILE' ? { content: '' } : {}),
    });
    setSections(updated);
  };

  const updateLesson = (sIdx: number, lIdx: number, field: keyof Lesson, value: any) => {
    const updated = [...sections];
    updated[sIdx].items[lIdx] = { ...updated[sIdx].items[lIdx], [field]: value };
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

    const normalizedCourseData = {
      ...courseData,
      title: courseData.title.trim(),
      description: courseData.description.trim(),
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

    for (let s = 0; s < validSections.length; s += 1) {
      const section = validSections[s];
      
      const createSectionResponse = await fetch(`${FEED_SERVICE}/courses/${courseId}/sections`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: section.title.trim() || `Chapter ${s + 1}`,
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
        const createLessonResponse = await fetch(`${FEED_SERVICE}/sections/${sectionId}/items`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: lesson.title.trim(),
            type: lesson.type,
            description: lesson.description.trim(),
            duration: lesson.duration,
            isFree: lesson.isFree,
            content: lesson.content.trim(),
            videoUrl: lesson.videoUrl.trim(),
            order: i + 1,
            quiz: lesson.quiz,
            assignment: lesson.assignment,
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
      if (!isStep3Valid) {
        throw new Error('Add at least one lesson before publishing');
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
  }, [courseData, getAuthToken, isStep3Valid, locale, readResponseBody, router, validSections]);

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

  // Calculate total duration
  const totalDuration = sections.reduce((acc, s) => acc + s.items.reduce((sum, l) => sum + (l.duration || 0), 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedNavigation />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/learn`}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create a Course</h1>
              <p className="text-sm text-gray-500">Share your knowledge with the world</p>
            </div>
          </div>

          <button
            onClick={saveDraft}
            disabled={saving || !isStep1Valid}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
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
                      : 'bg-gray-100 text-gray-500'
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
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Title *
                </label>
                <input
                  type="text"
                  value={courseData.title}
                  onChange={(e) => setCourseData({ ...courseData, title: e.target.value })}
                  placeholder="e.g., Complete Python Programming Masterclass"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  maxLength={100}
                />
                <p className="text-xs text-gray-400 mt-1">{courseData.title.length}/100 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={courseData.description}
                  onChange={(e) => setCourseData({ ...courseData, description: e.target.value })}
                  placeholder="Describe what students will learn in this course..."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  maxLength={2000}
                />
                <p className="text-xs text-gray-400 mt-1">{courseData.description.length}/2000 characters (minimum 20)</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={courseData.category}
                    onChange={(e) => setCourseData({ ...courseData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Level
                  </label>
                  <select
                    value={courseData.level}
                    onChange={(e) => setCourseData({ ...courseData, level: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    {LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Media & Tags */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Thumbnail
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-amber-300 transition-colors">
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
                        className="w-full max-w-md mx-auto px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  <h3 className="font-semibold text-gray-900">Course Curriculum</h3>
                  <p className="text-sm text-gray-500">
                    {sections.length} section{sections.length !== 1 ? 's' : ''} • {sections.reduce((acc, s) => acc + s.items.length, 0)} items
                  </p>
                </div>
                <button onClick={addSection} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                  <Plus className="w-4 h-4" /> Add Section
                </button>
              </div>

              {sections.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                  <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 mb-4">Your curriculum is empty. Start by adding a section!</p>
                  <button onClick={addSection} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                    Add First Section
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {sections.map((section, sIdx) => (
                    <div key={section.id} className="bg-white border-2 border-gray-100 rounded-xl shadow-sm overflow-hidden">
                      {/* Section Header */}
                      <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                          <h4 className="font-semibold text-gray-700 whitespace-nowrap">Section {sIdx + 1}:</h4>
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) => updateSectionTitle(sIdx, e.target.value)}
                            placeholder="e.g., Introduction"
                            className="flex-1 max-w-sm px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium bg-white"
                          />
                        </div>
                        <button onClick={() => removeSection(sIdx)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>

                      {/* Section Items */}
                      <div className="p-4 space-y-4">
                        {section.items.map((lesson, index) => (
                          <div key={lesson.id} className="border border-gray-200 rounded-lg p-4 bg-white relative hover:border-amber-200 transition-colors">
                            <div className="flex items-start gap-4">
                              <div className="flex flex-col items-center gap-2 text-gray-400 mt-2">
                                <GripVertical className="w-4 h-4 cursor-move" />
                                <span className="text-xs font-bold text-gray-300">{index + 1}</span>
                              </div>

                              <div className="flex-1 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className={`px-2 py-1 text-[10px] font-bold rounded-full tracking-wider uppercase ${
                                    lesson.type === 'VIDEO' ? 'bg-amber-100 text-amber-700' :
                                    lesson.type === 'ARTICLE' ? 'bg-gray-100 text-gray-700' :
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
                                  className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                                />

                                {lesson.type === 'ARTICLE' ? (
                                  <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500">Article Content (Rich Text Editor Disabled - Using Plaintext)</label>
                                    <textarea
                                      value={lesson.content}
                                      onChange={(e) => updateLesson(sIdx, index, 'content', e.target.value)}
                                      placeholder="Write your article here..."
                                      rows={5}
                                      className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y text-sm font-sans"
                                    />
                                    <p className="text-[10px] text-amber-600">Note: Run `npm install react-quill` in your terminal to enable the WYSIWYG editor here.</p>
                                  </div>
                                ) : (
                                  <textarea
                                    value={lesson.description}
                                    onChange={(e) => updateLesson(sIdx, index, 'description', e.target.value)}
                                    placeholder="Short description (optional)"
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none text-sm"
                                  />
                                )}

                                {lesson.type === 'VIDEO' && (
                                  <div className="space-y-2">
                                    <div className="flex gap-2">
                                      <input
                                        type="url"
                                        value={lesson.videoUrl || ''}
                                        onChange={(e) => updateLesson(sIdx, index, 'videoUrl', e.target.value)}
                                        placeholder="Video URL (e.g., https://youtube.com/...)"
                                        className="flex-1 px-3 py-2 border border-blue-200 bg-blue-50/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                      />
                                      <label className="cursor-pointer flex items-center justify-center p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors" title="Upload Video">
                                        <UploadCloud className="w-5 h-5" />
                                        <input type="file" className="hidden" accept="video/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(sIdx, index, e.target.files[0], 'videoUrl')} />
                                      </label>
                                    </div>
                                    {lesson.videoUrl && (
                                      <p className="text-[10px] text-gray-500 truncate">Current: {lesson.videoUrl}</p>
                                    )}
                                  </div>
                                )}

                                {(lesson.type === 'IMAGE' || lesson.type === 'FILE') && (
                                  <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center text-center space-y-3">
                                    {lesson.content ? (
                                      <div className="w-full">
                                        {lesson.type === 'IMAGE' ? (
                                          <div className="relative group mx-auto w-32 h-20 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border">
                                            <img src={lesson.content} alt="" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                              <ImageIcon className="w-6 h-6 text-white" />
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-3 px-3 py-2 bg-white border border-indigo-100 rounded-lg">
                                            <File className="w-5 h-5 text-indigo-500" />
                                            <span className="text-xs font-semibold text-gray-700 truncate max-w-[200px]">{lesson.content.split('/').pop()}</span>
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
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                                          {lesson.type === 'IMAGE' ? <ImageIcon className="w-5 h-5 text-pink-500" /> : <File className="w-5 h-5 text-indigo-500" />}
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-gray-700">Upload {lesson.type === 'IMAGE' ? 'Image' : 'Resource File'}</p>
                                          <p className="text-[10px] text-gray-400 mt-1">Directly up to Cloudflare R2</p>
                                        </div>
                                        <label className="px-4 py-1.5 bg-gray-900 text-white text-[11px] font-bold rounded-lg cursor-pointer hover:bg-gray-800 transition-all active:scale-95 shadow-md">
                                          Choose File
                                          <input type="file" className="hidden" accept={lesson.type === 'IMAGE' ? "image/*" : "*/*"} onChange={(e) => e.target.files?.[0] && handleFileUpload(sIdx, index, e.target.files[0], 'content')} />
                                        </label>
                                      </>
                                    )}
                                  </div>
                                )}

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
                                          className="w-16 px-2 py-1 border border-blue-200 rounded-lg text-sm text-center font-bold bg-white"
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
                                        <div key={qIdx} className="bg-white rounded-xl border border-blue-100 p-4 shadow-sm space-y-3">
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
                                              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                                              <div key={oIdx} className={`flex items-center gap-2 p-2.5 rounded-lg border ${opt.isCorrect ? 'border-green-300 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
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
                                                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${opt.isCorrect ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-green-400'}`}
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
                                                  className="flex-1 text-sm bg-transparent border-none outline-none font-medium text-gray-700 placeholder-gray-300"
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
                                              className="w-full mt-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs italic text-gray-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
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
                                      <textarea placeholder="public class Main { public static void main(String[] args) {} }" value={lesson.exercise.initialCode} onChange={(e) => updateLesson(sIdx, index, 'exercise', { ...lesson.exercise, initialCode: e.target.value })} className="w-full px-3 py-2 border border-green-200 rounded resize-y text-sm font-mono bg-white" rows={4} />
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
                                      className="w-16 px-1 py-0.5 bg-transparent border-b border-dashed border-gray-300 focus:border-amber-500 focus:outline-none text-center text-sm font-medium"
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
                            <button onClick={() => addLesson(sIdx, 'ARTICLE')} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 text-xs font-bold rounded-lg transition-colors"><BookOpen className="w-3.5 h-3.5" /> Article</button>
                            <button onClick={() => addLesson(sIdx, 'IMAGE')} className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100 text-xs font-bold rounded-lg transition-colors"><Plus className="w-3.5 h-3.5" /> Image</button>
                            <button onClick={() => addLesson(sIdx, 'FILE')} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 text-xs font-bold rounded-lg transition-colors"><Plus className="w-3.5 h-3.5" /> File</button>
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
                <h3 className="text-xl font-semibold text-gray-900">Ready to publish?</h3>
                <p className="text-gray-500">Review your course before making it live</p>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <div className="flex items-start gap-4">
                  {courseData.thumbnail ? (
                    <img src={courseData.thumbnail} alt="" className="w-32 h-20 object-cover rounded-lg" />
                  ) : (
                    <div className="w-32 h-20 bg-amber-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-amber-400" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-gray-900">{courseData.title || 'Untitled Course'}</h4>
                    <p className="text-sm text-gray-500">{courseData.category} • {courseData.level.replace('_', ' ')}</p>
                  </div>
                </div>

                <p className="text-gray-600 text-sm">{courseData.description}</p>

                {courseData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {courseData.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {sections.length} Section{sections.length !== 1 ? 's' : ''}
                  </p>
                  <div className="space-y-4">
                    {sections.slice(0, 3).map((section, sIdx) => (
                      <div key={section.id} className="space-y-2">
                        <p className="text-xs font-bold text-gray-500 uppercase">Section {sIdx + 1}: {section.title}</p>
                        {section.items.slice(0, 3).map((lesson, i) => (
                          <div key={lesson.id} className="flex items-center gap-2 text-sm ml-4">
                            <span className="w-4 h-4 flex items-center justify-center bg-gray-200 rounded-full text-[10px] font-bold text-gray-600">{i + 1}</span>
                            <span className="text-gray-700 font-medium truncate max-w-xs">{lesson.title || 'Untitled'}</span>
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded uppercase">{lesson.type}</span>
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
              <div className="space-y-2 bg-white border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-3 text-sm">Publish Requirements</h4>
                {!isStep1Valid && (
                  <p className="text-sm text-red-500 flex items-center gap-2.5">
                    <X className="w-4 h-4" />
                    Complete basic info (title, description, category)
                  </p>
                )}
                {!isStep3Valid && (
                  <p className="text-sm text-red-500 flex items-center gap-2.5">
                    <X className="w-4 h-4" />
                    Your curriculum must have at least one valid item
                  </p>
                )}
                {isStep1Valid && isStep3Valid && (
                  <p className="text-sm text-green-600 flex items-center gap-2.5 font-medium">
                    <Check className="w-5 h-5" />
                    All requirements met. Your course is ready to publish!
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
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
