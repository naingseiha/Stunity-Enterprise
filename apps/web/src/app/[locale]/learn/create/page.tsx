'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  ArrowLeft,
  ArrowRight,
  Check,
  Image,
  FileText,
  Video,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Eye,
  Upload,
  X,
  Clock,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';

// ============================================
// INTERFACES
// ============================================

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: number;
  isFree: boolean;
  content: string;
  videoUrl: string;
}

// ============================================
// CONSTANTS
// ============================================

const FEED_SERVICE = process.env.NEXT_PUBLIC_FEED_SERVICE_URL || 'http://localhost:3010';

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

  // Lessons
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [newTag, setNewTag] = useState('');

  const getAuthToken = useCallback(() => TokenManager.getAccessToken(), []);

  // Validation
  const isStep1Valid = courseData.title.length >= 5 && courseData.description.length >= 20 && courseData.category;
  const isStep2Valid = true; // Thumbnail and tags are optional
  const isStep3Valid = lessons.length >= 1;

  // Add lesson
  const addLesson = () => {
    setLessons([
      ...lessons,
      {
        id: `temp-${Date.now()}`,
        title: '',
        description: '',
        duration: 10,
        isFree: lessons.length === 0, // First lesson is free by default
        content: '',
        videoUrl: '',
      },
    ]);
  };

  // Update lesson
  const updateLesson = (index: number, field: keyof Lesson, value: any) => {
    const updated = [...lessons];
    updated[index] = { ...updated[index], [field]: value };
    setLessons(updated);
  };

  // Remove lesson
  const removeLesson = (index: number) => {
    setLessons(lessons.filter((_, i) => i !== index));
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

  // Save as draft
  const saveDraft = async () => {
    try {
      setSaving(true);
      const token = getAuthToken();
      if (!token) {
        router.push(`/${locale}/login`);
        return;
      }

      // Create course
      const response = await fetch(`${FEED_SERVICE}/courses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...courseData,
          isPublished: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add lessons
        for (let i = 0; i < lessons.length; i++) {
          const lesson = lessons[i];
          if (lesson.title) {
            await fetch(`${FEED_SERVICE}/courses/${data.course.id}/lessons`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: lesson.title,
                description: lesson.description,
                duration: lesson.duration,
                isFree: lesson.isFree,
                content: lesson.content,
                videoUrl: lesson.videoUrl,
                order: i + 1,
              }),
            });
          }
        }

        alert('Course saved as draft!');
        router.push(`/${locale}/learn/course/${data.course.id}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (err) {
      console.error('Error saving course:', err);
      alert('Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  // Publish course
  const publishCourse = async () => {
    try {
      setPublishing(true);
      const token = getAuthToken();
      if (!token) {
        router.push(`/${locale}/login`);
        return;
      }

      // Create course
      const response = await fetch(`${FEED_SERVICE}/courses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(courseData),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add lessons
        for (let i = 0; i < lessons.length; i++) {
          const lesson = lessons[i];
          if (lesson.title) {
            await fetch(`${FEED_SERVICE}/courses/${data.course.id}/lessons`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: lesson.title,
                description: lesson.description,
                duration: lesson.duration,
                isFree: lesson.isFree,
                content: lesson.content,
                videoUrl: lesson.videoUrl,
                order: i + 1,
              }),
            });
          }
        }

        // Publish
        await fetch(`${FEED_SERVICE}/courses/${data.course.id}/publish`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });

        alert('Course published successfully!');
        router.push(`/${locale}/learn/course/${data.course.id}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (err) {
      console.error('Error publishing course:', err);
      alert('Failed to publish course');
    } finally {
      setPublishing(false);
    }
  };

  // Calculate total duration
  const totalDuration = lessons.reduce((acc, l) => acc + (l.duration || 0), 0);

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
                      <Image className="w-12 h-12 mx-auto text-gray-300 mb-3" />
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
                  <h3 className="font-semibold text-gray-900">Course Lessons</h3>
                  <p className="text-sm text-gray-500">
                    {lessons.length} lesson{lessons.length !== 1 ? 's' : ''} • {totalDuration} min total
                  </p>
                </div>
                <button
                  onClick={addLesson}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                >
                  <Plus className="w-4 h-4" />
                  Add Lesson
                </button>
              </div>

              {lessons.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                  <Video className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 mb-4">No lessons yet. Add your first lesson!</p>
                  <button
                    onClick={addLesson}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                  >
                    Add First Lesson
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {lessons.map((lesson, index) => (
                    <div
                      key={lesson.id}
                      className="border border-gray-200 rounded-xl p-4 hover:border-amber-200 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-2 text-gray-400">
                          <GripVertical className="w-5 h-5 cursor-move" />
                          <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-sm font-medium">
                            {index + 1}
                          </span>
                        </div>

                        <div className="flex-1 space-y-3">
                          <input
                            type="text"
                            value={lesson.title}
                            onChange={(e) => updateLesson(index, 'title', e.target.value)}
                            placeholder="Lesson title"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />

                          <textarea
                            value={lesson.description}
                            onChange={(e) => updateLesson(index, 'description', e.target.value)}
                            placeholder="Lesson description (optional)"
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none text-sm"
                          />

                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <input
                                type="number"
                                value={lesson.duration}
                                onChange={(e) => updateLesson(index, 'duration', parseInt(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                                min="1"
                              />
                              <span className="text-sm text-gray-500">min</span>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={lesson.isFree}
                                onChange={(e) => updateLesson(index, 'isFree', e.target.checked)}
                                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                              />
                              <span className="text-sm text-gray-600">Free preview</span>
                            </label>
                          </div>
                        </div>

                        <button
                          onClick={() => removeLesson(index)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
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
                    {lessons.length} Lesson{lessons.length !== 1 ? 's' : ''} • {totalDuration} min total
                  </p>
                  <div className="space-y-2">
                    {lessons.slice(0, 5).map((lesson, i) => (
                      <div key={lesson.id} className="flex items-center gap-2 text-sm">
                        <span className="w-5 h-5 flex items-center justify-center bg-gray-200 rounded text-xs">{i + 1}</span>
                        <span className="text-gray-700">{lesson.title || 'Untitled'}</span>
                        {lesson.isFree && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">Free</span>}
                      </div>
                    ))}
                    {lessons.length > 5 && (
                      <p className="text-sm text-gray-500">+ {lessons.length - 5} more lessons</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Validation */}
              <div className="space-y-2">
                {!isStep1Valid && (
                  <p className="text-sm text-red-500 flex items-center gap-2">
                    <X className="w-4 h-4" />
                    Please complete basic info (title, description, category)
                  </p>
                )}
                {!isStep3Valid && (
                  <p className="text-sm text-red-500 flex items-center gap-2">
                    <X className="w-4 h-4" />
                    Add at least one lesson
                  </p>
                )}
                {isStep1Valid && isStep3Valid && (
                  <p className="text-sm text-green-600 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Your course is ready to publish!
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
