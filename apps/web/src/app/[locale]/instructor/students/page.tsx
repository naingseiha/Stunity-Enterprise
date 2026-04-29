'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowUpRight,
  BookOpen,
  ClipboardCheck,
  ExternalLink,
  GraduationCap,
  Search,
  Star,
  Users,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { LEARN_SERVICE_URL } from '@/lib/api/config';
import { FeedInlineLoader } from '@/components/feed/FeedZoomLoader';

import { useTranslations } from 'next-intl';
interface InstructorCourse {
  id: string;
  title: string;
  category: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  enrolledCount: number;
  lessonsCount: number;
  rating: number;
  createdAt: string;
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: any;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-800/40 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-400">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{helper}</p>
    </div>
  );
}

function statusClasses(status?: string) {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'ARCHIVED':
      return 'bg-slate-50 dark:bg-gray-800/95 text-slate-400 border-slate-500/20';
    default:
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  }
}

export default function InstructorStudentsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const t = useTranslations('common');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courses, setCourses] = useState<InstructorCourse[]>([]);

  const fetchCourses = useCallback(async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      const response = await fetch(`${LEARN_SERVICE_URL}/courses/my-created`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return;
      const data = await response.json();
      setCourses(Array.isArray(data?.myCreated) ? data.myCreated : []);
    } catch (error) {
      console.error('Error loading instructor student summary:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return courses;
    return courses.filter((course) =>
      course.title.toLowerCase().includes(query) ||
      course.category.toLowerCase().includes(query)
    );
  }, [courses, search]);

  const metrics = useMemo(() => {
    const totalStudents = courses.reduce((sum, course) => sum + Number(course.enrolledCount || 0), 0);
    const activeCourses = courses.filter((course) => Number(course.enrolledCount || 0) > 0).length;
    const avgStudentsPerCourse = courses.length > 0 ? totalStudents / courses.length : 0;
    const publishedCourses = courses.filter((course) => course.status === 'PUBLISHED').length;

    return {
      totalStudents,
      activeCourses,
      avgStudentsPerCourse,
      publishedCourses,
    };
  }, [courses]);

  const rankedCourses = useMemo(() => {
    return [...filteredCourses].sort((a, b) => {
      const byStudents = Number(b.enrolledCount || 0) - Number(a.enrolledCount || 0);
      if (byStudents !== 0) return byStudents;
      return Number(b.rating || 0) - Number(a.rating || 0);
    });
  }, [filteredCourses]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">Instructor Hub</p>
          <h1 className="mt-3 text-3xl font-black text-white">Students</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Track how many learners each course is serving and jump straight into curriculum or grading workflows.
          </p>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/0 text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search courses or categories..."
            className="w-full rounded-2xl border border-slate-700 bg-slate-800/60 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 lg:w-80"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <FeedInlineLoader size="lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total Learners"
              value={metrics.totalStudents.toLocaleString()}
              helper="Combined enrollments across your courses"
              icon={Users}
            />
            <MetricCard
              label="Active Courses"
              value={metrics.activeCourses.toLocaleString()}
              helper="Courses currently serving at least one learner"
              icon={GraduationCap}
            />
            <MetricCard
              label="Avg Learners"
              value={metrics.avgStudentsPerCourse.toFixed(1)}
              helper="Average learners per created course"
              icon={ArrowUpRight}
            />
            <MetricCard
              label="Published"
              value={metrics.publishedCourses.toLocaleString()}
              helper="Courses currently visible to learners"
              icon={BookOpen}
            />
          </div>

          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Course Learner Overview</h2>
                <p className="text-sm text-slate-400">Use these shortcuts to move from learner counts into grading and course maintenance.</p>
              </div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                {rankedCourses.length} course{rankedCourses.length === 1 ? '' : 's'}
              </div>
            </div>

            {rankedCourses.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-800/20 px-6 py-16 text-center">
                <Users className="mx-auto h-10 w-10 text-slate-600" />
                <h3 className="mt-4 text-xl font-bold text-white">No learner data yet</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                  Once you publish courses and learners enroll, this view will help you monitor where students are concentrated.
                </p>
                <Link
                  href={`/${locale}/learn/create`}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-400"
                >
                  Create Course
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {rankedCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-800/30 p-5 xl:flex-row xl:items-center xl:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-bold text-white">{course.title}</h3>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.18em] ${statusClasses(course.status)}`}>
                          {course.status || 'DRAFT'}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                        <span className="inline-flex items-center gap-2">
                          <Users className="h-4 w-4 text-slate-500" />
                          {Number(course.enrolledCount || 0).toLocaleString()} learners
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-slate-500" />
                          {Number(course.lessonsCount || 0).toLocaleString()} lessons
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <Star className="h-4 w-4 text-amber-500" />
                          {Number(course.rating || 0).toFixed(1)} rating
                        </span>
                        <span>{course.category}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/${locale}/learn/course/${course.id}`}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open Course
                      </Link>
                      <Link
                        href={`/${locale}/instructor/course/${course.id}/curriculum`}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white"
                      >
                        <BookOpen className="h-4 w-4" />
                        Curriculum
                      </Link>
                      <Link
                        href={`/${locale}/learn/course/${course.id}/submissions`}
                        className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-400"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        Grade Work
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
