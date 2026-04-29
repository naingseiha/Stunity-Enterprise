'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit3, 
  BookOpen, 
  Users, 
  Star,
  ChevronRight,
  Filter
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { LEARN_SERVICE_URL } from '@/lib/api/config';
import { buildRouteDataCacheKey, readRouteDataCache, writeRouteDataCache } from '@/lib/route-data-cache';
import { FeedInlineLoader } from '@/components/feed/FeedZoomLoader';

import { useTranslations } from 'next-intl';
interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  enrolledCount: number;
  rating: number;
  category: string;
  createdAt: string;
}

interface CachedCourseDetailPayload {
  course: any;
  enrollment: any;
  isEnrolled: boolean;
}

const COURSE_DETAIL_CACHE_TTL_MS = 60 * 1000;

export default function InstructorCoursesPage() {
    const autoT = useTranslations();
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('common');
  const locale = (params?.locale as string) || 'en';
  
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');

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

  const prefetchCourseDetailData = useCallback(async (courseId: string) => {
    const token = TokenManager.getAccessToken();
    if (!token) return;

    const cacheKey = buildRouteDataCacheKey('learn', 'course-detail', locale, courseId, getCurrentUserId());
    const cached = readRouteDataCache<CachedCourseDetailPayload>(cacheKey, COURSE_DETAIL_CACHE_TTL_MS);
    if (cached) return;

    try {
      const response = await fetch(`${LEARN_SERVICE_URL}/courses/${courseId}?locale=${locale}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return;
      const data = await response.json();
      writeRouteDataCache<CachedCourseDetailPayload>(cacheKey, {
        course: data?.course,
        enrollment: data?.enrollment ?? null,
        isEnrolled: Boolean(data?.isEnrolled),
      });
    } catch {
      // Ignore prefetch failures and fall back to normal navigation fetch.
    }
  }, [getCurrentUserId, locale]);

  const prefetchLearnCourseRoute = useCallback((courseId: string) => {
    router.prefetch(`/${locale}/learn/course/${courseId}`);
    void prefetchCourseDetailData(courseId);
  }, [locale, prefetchCourseDetailData, router]);

  const prefetchCurriculumRoute = useCallback((courseId: string) => {
    router.prefetch(`/${locale}/instructor/course/${courseId}/curriculum`);
    void prefetchCourseDetailData(courseId);
  }, [locale, prefetchCourseDetailData, router]);

  const prefetchCourseEditRoute = useCallback((courseId: string) => {
    router.prefetch(`/${locale}/instructor/course/${courseId}/edit`);
    void prefetchCourseDetailData(courseId);
  }, [locale, prefetchCourseDetailData, router]);

  const fetchCourses = useCallback(async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      const res = await fetch(`${LEARN_SERVICE_URL}/courses/my-created`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setCourses(data.myCreated || []);
      }
    } catch (error) {
      console.error('Error fetching instructor courses:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'DRAFT': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'ARCHIVED': return 'bg-slate-50 dark:bg-gray-800/95 text-slate-400 border-slate-500/20';
      default: return 'bg-slate-50 dark:bg-gray-800/95 text-slate-400';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white"><AutoI18nText i18nKey="auto.web.locale_instructor_courses_page.k_69e74286" /></h1>
          <p className="text-slate-400 mt-1 text-sm font-medium"><AutoI18nText i18nKey="auto.web.locale_instructor_courses_page.k_3092674a" /></p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/0 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
            <input 
              type="text"
              placeholder={autoT("auto.web.locale_instructor_courses_page.k_90fcacba")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all w-64"
            />
          </div>
          <button className="p-2.5 bg-slate-800/50 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors">
            <Filter className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <FeedInlineLoader size="lg" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-slate-800/30 border border-slate-800/50 rounded-3xl p-20 text-center flex flex-col items-center gap-6 backdrop-blur-sm">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <BookOpen className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white"><AutoI18nText i18nKey="auto.web.locale_instructor_courses_page.k_c8e5669a" /></h3>
            <p className="text-slate-400 mt-2 max-w-sm mx-auto">
              <AutoI18nText i18nKey="auto.web.locale_instructor_courses_page.k_2433bf49" />
            </p>
          </div>
          <Link 
            href={`/${locale}/learn/create`}
            className="px-8 py-3 bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            <AutoI18nText i18nKey="auto.web.locale_instructor_courses_page.k_95b49640" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div 
              key={course.id}
              className="bg-[#1E293B]/60 backdrop-blur-md border border-slate-800 rounded-3xl overflow-hidden group hover:border-slate-700 hover:shadow-2xl hover:shadow-black/20 transition-all duration-500"
            >
              {/* Thumbnail Area */}
              <div className="h-48 relative overflow-hidden">
                {course.thumbnail ? (
                  <img src={course.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-slate-700 dark:text-gray-200" />
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest border border-solid ${getStatusColor(course.status)}`}>
                    {course.status}
                  </span>
                </div>

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                  <Link 
                    href={`/${locale}/learn/course/${course.id}`}
                    target="_blank"
                    onMouseEnter={() => prefetchLearnCourseRoute(course.id)}
                    onFocus={() => prefetchLearnCourseRoute(course.id)}
                    className="p-3 bg-white dark:bg-gray-900/20 hover:bg-white dark:bg-gray-900/30 backdrop-blur-md text-white rounded-2xl transition-all"
                  >
                    <Eye className="w-5 h-5" />
                  </Link>
                  <Link 
                    href={`/${locale}/instructor/course/${course.id}/edit`}
                    onMouseEnter={() => prefetchCourseEditRoute(course.id)}
                    onFocus={() => prefetchCourseEditRoute(course.id)}
                    className="p-3 bg-amber-500 hover:bg-amber-400 text-white rounded-2xl transition-all shadow-xl shadow-amber-500/20"
                  >
                    <Edit3 className="w-5 h-5" />
                  </Link>
                  <Link 
                    href={`/${locale}/instructor/course/${course.id}/curriculum`}
                    onMouseEnter={() => prefetchCurriculumRoute(course.id)}
                    onFocus={() => prefetchCurriculumRoute(course.id)}
                    className="p-3 bg-slate-800/90 hover:bg-slate-700 text-white rounded-2xl transition-all shadow-xl"
                  >
                    <BookOpen className="w-5 h-5" />
                  </Link>
                </div>
              </div>

              {/* Content Area */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 bg-slate-800 text-slate-400 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                    {course.category}
                  </span>
                  <span className="text-slate-600 font-bold">•</span>
                  <span className="text-slate-500 text-xs">{new Date(course.createdAt).toLocaleDateString()}</span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                  {course.title}
                </h3>
                
                <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-bold">{course.enrolledCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold">{course.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Link 
                      href={`/${locale}/instructor/course/${course.id}/edit`}
                      onMouseEnter={() => prefetchCourseEditRoute(course.id)}
                      onFocus={() => prefetchCourseEditRoute(course.id)}
                      className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-xs font-bold transition-colors"
                    >
                      <AutoI18nText i18nKey="auto.web.locale_instructor_courses_page.k_cd67c260" />
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                    <Link 
                      href={`/${locale}/instructor/course/${course.id}/curriculum`}
                      onMouseEnter={() => prefetchCurriculumRoute(course.id)}
                      onFocus={() => prefetchCurriculumRoute(course.id)}
                      className="flex items-center gap-1.5 text-slate-500 hover:text-white text-xs font-bold transition-colors"
                    >
                      <AutoI18nText i18nKey="auto.web.locale_instructor_courses_page.k_3f1ca5b6" />
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* New Course Card */}
          <Link 
            href={`/${locale}/learn/create`}
            className="border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-4 py-20 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-800 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center text-slate-500 transition-all">
              <Plus className="w-8 h-8" />
            </div>
            <span className="text-sm font-bold text-slate-500 group-hover:text-slate-300 transition-colors"><AutoI18nText i18nKey="auto.web.locale_instructor_courses_page.k_2248c819" /></span>
          </Link>
        </div>
      )}
    </div>
  );
}
