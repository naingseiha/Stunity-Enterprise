'use client';

import { use, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Sparkles,
  ChevronRight,
  Info,
  Edit3
} from 'lucide-react';
import CurriculumBuilder from '@/components/instructor/CurriculumBuilder';
import { TokenManager } from '@/lib/api/auth';
import { LEARN_SERVICE_URL } from '@/lib/api/config';
import { buildRouteDataCacheKey, readRouteDataCache, writeRouteDataCache } from '@/lib/route-data-cache';
import { FeedInlineLoader } from '@/components/feed/FeedZoomLoader';
import { getCoverageTone, summarizeLocaleCoverage } from '@/lib/course-translation-coverage';

interface CachedCourseDetailPayload {
  course: any;
  enrollment: any;
  isEnrolled: boolean;
}

type LocaleCoverageSummary = {
  locale: 'en' | 'km';
  completed: number;
  total: number;
  percent: number;
  isComplete: boolean;
};

const COURSE_DETAIL_CACHE_TTL_MS = 60 * 1000;

export default function CourseCurriculumPage(props: { params: Promise<{ id: string, locale: string }> }) {
  const params = use(props.params);
  const { id: courseId, locale } = params;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const getCurrentUserId = useCallback(() => {
    if (typeof window === 'undefined') return 'guest';
    try {
      const rawUser = localStorage.getItem('user');
      if (!rawUser) return 'guest';
      const user = JSON.parse(rawUser);
      return user?.id || 'guest';
    } catch {
      return 'guest';
    }
  }, []);
  const courseCacheKey = buildRouteDataCacheKey('learn', 'course-detail', courseId, getCurrentUserId());

  const fetchCourse = useCallback(async () => {
    try {
      const cachedPayload = readRouteDataCache<CachedCourseDetailPayload>(courseCacheKey, COURSE_DETAIL_CACHE_TTL_MS);
      if (cachedPayload?.course) {
        setCourse(cachedPayload.course);
        setLoading(false);
      }

      const token = TokenManager.getAccessToken();
      if (!token) return;

      const res = await fetch(`${LEARN_SERVICE_URL}/courses/${courseId}?locale=${locale}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setCourse(data.course);
        writeRouteDataCache<CachedCourseDetailPayload>(courseCacheKey, {
          course: data.course,
          enrollment: data.enrollment ?? null,
          isEnrolled: Boolean(data.isEnrolled),
        });
      } else {
        router.push(`/${locale}/instructor/courses`);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  }, [courseCacheKey, courseId, locale, router]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  const curriculumCoverageByLocale = useMemo(() => {
    if (!course) return [];

    const sourceLocale = course.sourceLocale === 'km' ? 'km' : 'en';
    const supportedLocales = Array.isArray(course.supportedLocales) && course.supportedLocales.length > 0
      ? course.supportedLocales.filter((localeValue: unknown): localeValue is 'en' | 'km' => localeValue === 'en' || localeValue === 'km')
      : [sourceLocale];

    return supportedLocales.map((localeKey: 'en' | 'km'): LocaleCoverageSummary => ({
      locale: localeKey,
      ...summarizeLocaleCoverage(
        (course.sections || []).flatMap((section: any) => [
          { baseValue: section.title, translations: section.titleTranslations },
          ...(section.lessons || []).flatMap((lesson: any) => [
            { baseValue: lesson.title, translations: lesson.titleTranslations },
            { baseValue: lesson.description, translations: lesson.descriptionTranslations, required: false },
          ]),
        ]),
        localeKey,
        sourceLocale
      ),
    }));
  }, [course]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <FeedInlineLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Builder Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-800/20 border border-slate-800 rounded-3xl backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Link 
            href={`/${locale}/instructor/courses`}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Curriculum Builder</span>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-[10px] font-bold text-slate-500">{course.category}</span>
            </div>
            <h1 className="text-xl font-bold text-white truncate max-w-md">{course.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/instructor/course/${courseId}/edit`}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl font-bold transition-all"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Details</span>
          </Link>
          <Link 
            href={`/${locale}/learn/course/${courseId}`}
            target="_blank"
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl font-bold transition-all"
          >
            <Eye className="w-4 h-4" />
            <span>Preview</span>
          </Link>
          <button className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all">
            <Save className="w-4 h-4" />
            <span>Publish Changes</span>
          </button>
        </div>
      </div>

      {/* Main Builder Area */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Left: Builder */}
        <div className="xl:col-span-3">
          <CurriculumBuilder
            courseId={courseId}
            initialSections={course.sections || []}
            sourceLocale={course.sourceLocale || 'en'}
            supportedLocales={Array.isArray(course.supportedLocales) && course.supportedLocales.length > 0 ? course.supportedLocales : [course.sourceLocale || 'en']}
          />
        </div>

        {/* Right: Sidebar Helper */}
        <div className="hidden xl:block space-y-6">
          <div className="bg-slate-800/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
                <Info className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-white">Structure Tips</h3>
            </div>
            <ul className="space-y-4 text-xs font-medium text-slate-400">
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 flex-shrink-0" />
                <p>Divide your course into logical sections (Modules) for better digestibility.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 flex-shrink-0" />
                <p>Mix Article and Quiz items between videos to increase student engagement.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                <p>Drag sections and lessons to reorder them instantly.</p>
              </li>
            </ul>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Save className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-white">Publish Readiness</h3>
            </div>
            <div className="space-y-3">
              {curriculumCoverageByLocale.map((coverage: LocaleCoverageSummary) => {
                const tone = getCoverageTone(coverage.percent);
                return (
                  <div key={coverage.locale} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white uppercase">{coverage.locale}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {coverage.completed}/{coverage.total} curriculum fields ready
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${tone.badge}`}>
                        {coverage.percent}%
                      </span>
                    </div>
                  </div>
                );
              })}
              {curriculumCoverageByLocale.some((coverage: LocaleCoverageSummary) => coverage.percent < 100) && (
                <p className="text-xs leading-6 text-amber-200">
                  You can still publish, but incomplete supported languages will fall back to the source language.
                </p>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-white">AI Curriculum</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Generate a structured syllabus based on your course title and description using Stunity AI.
            </p>
            <button className="w-full py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-xl text-xs font-bold transition-all border border-indigo-500/30">
              Generate Outline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
