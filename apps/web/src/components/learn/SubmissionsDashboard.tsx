'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, ClipboardList, RefreshCw, CheckCircle2, Clock3, Award, ExternalLink } from 'lucide-react';
import { LEARN_SERVICE_URL } from '@/lib/api/config';
import { TokenManager } from '@/lib/api/auth';
import GradeSubmissionModal, { AssignmentSubmission } from '@/components/learn/GradeSubmissionModal';

interface AssignmentLesson {
  id: string;
  title: string;
  sectionTitle: string | null;
  maxScore: number;
  passingScore: number;
}

interface SubmissionsDashboardProps {
  courseId: string;
  locale: string;
}

function formatName(submission: AssignmentSubmission) {
  if (!submission.user) return submission.userId;
  const full = `${submission.user.firstName} ${submission.user.lastName}`.trim();
  return full || submission.user.email || submission.user.id;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function statusPillClass(status: AssignmentSubmission['status']) {
  switch (status) {
    case 'GRADED':
      return 'bg-emerald-100 text-emerald-700';
    case 'SUBMITTED':
      return 'bg-blue-100 text-blue-700';
    case 'LATE':
      return 'bg-amber-100 text-amber-700';
    case 'RESUBMISSION_REQUIRED':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function SubmissionsDashboard({ courseId, locale }: SubmissionsDashboardProps) {
  const router = useRouter();
  const [loadingCourse, setLoadingCourse] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [courseTitle, setCourseTitle] = useState('Course');
  const [assignmentLessons, setAssignmentLessons] = useState<AssignmentLesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [gradeModalSubmission, setGradeModalSubmission] = useState<AssignmentSubmission | null>(null);

  const selectedAssignment = useMemo(() => {
    return assignmentLessons.find((lesson) => lesson.id === selectedLessonId) || null;
  }, [assignmentLessons, selectedLessonId]);

  const loadCourseAssignments = useCallback(async () => {
    setLoadingCourse(true);
    setError(null);

    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      const res = await fetch(`${LEARN_SERVICE_URL}/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.course) {
        setError(data?.message || 'Failed to load course details.');
        return;
      }

      const course = data.course;
      setCourseTitle(course.title || 'Course');

      const seen = new Set<string>();
      const allLessons = [
        ...(Array.isArray(course.lessons) ? course.lessons.map((lesson: any) => ({ ...lesson, sectionTitle: null })) : []),
        ...(Array.isArray(course.sections)
          ? course.sections.flatMap((section: any) =>
              (Array.isArray(section.lessons) ? section.lessons : []).map((lesson: any) => ({
                ...lesson,
                sectionTitle: section.title || null,
              }))
            )
          : []),
      ];

      const assignmentItems: AssignmentLesson[] = allLessons
        .filter((lesson: any) => lesson?.type === 'ASSIGNMENT' && lesson?.assignment && !seen.has(lesson.id))
        .map((lesson: any) => {
          seen.add(lesson.id);
          return {
            id: String(lesson.id),
            title: String(lesson.title || 'Untitled Assignment'),
            sectionTitle: lesson.sectionTitle || null,
            maxScore: Number(lesson.assignment?.maxScore ?? 100),
            passingScore: Number(lesson.assignment?.passingScore ?? 80),
          };
        });

      setAssignmentLessons(assignmentItems);
      setSelectedLessonId((prev) => {
        if (prev && assignmentItems.some((item) => item.id === prev)) return prev;
        return assignmentItems[0]?.id || '';
      });
    } catch {
      setError('Network error while loading the course.');
    } finally {
      setLoadingCourse(false);
    }
  }, [courseId, locale, router]);

  const loadSubmissions = useCallback(async () => {
    if (!selectedLessonId) {
      setSubmissions([]);
      return;
    }

    setLoadingSubmissions(true);
    setError(null);

    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      const res = await fetch(`${LEARN_SERVICE_URL}/courses/${courseId}/lessons/${selectedLessonId}/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message || 'Failed to load submissions.');
        return;
      }

      setSubmissions(Array.isArray(data?.submissions) ? data.submissions : []);
    } catch {
      setError('Network error while loading submissions.');
    } finally {
      setLoadingSubmissions(false);
    }
  }, [courseId, locale, router, selectedLessonId]);

  useEffect(() => {
    loadCourseAssignments();
  }, [loadCourseAssignments]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const stats = useMemo(() => {
    const total = submissions.length;
    const graded = submissions.filter((item) => item.status === 'GRADED').length;
    const pending = submissions.filter((item) => item.status !== 'GRADED').length;
    const passed = submissions.filter((item) => {
      if (item.status !== 'GRADED') return false;
      if (item.score === null) return false;
      const passLine = selectedAssignment?.passingScore ?? 80;
      return item.score >= passLine;
    }).length;

    return { total, graded, pending, passed };
  }, [selectedAssignment?.passingScore, submissions]);

  const handleSubmissionSaved = (updated: AssignmentSubmission) => {
    setSubmissions((prev) => prev.map((submission) => {
      if (submission.id !== updated.id) return submission;
      return { ...submission, ...updated };
    }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">Assignment Submissions</p>
            <h1 className="text-2xl font-black text-gray-900">{courseTitle}</h1>
            <p className="text-sm text-gray-600 mt-1">Grade learner submissions and track completion quality.</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/${locale}/learn`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200"
            >
              <BookOpen className="w-4 h-4" />
              Learn Hub
            </Link>
            <button
              onClick={() => {
                loadCourseAssignments();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Assignment Lesson</label>
        <select
          value={selectedLessonId}
          onChange={(event) => setSelectedLessonId(event.target.value)}
          disabled={loadingCourse || assignmentLessons.length === 0}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {assignmentLessons.length === 0 && <option value="">No assignment lessons in this course</option>}
          {assignmentLessons.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {lesson.sectionTitle ? `${lesson.sectionTitle} · ` : ''}{lesson.title}
            </option>
          ))}
        </select>
      </div>

      {selectedAssignment && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase">Total</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase">Pending</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase">Graded</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{stats.graded}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase">Passed</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{stats.passed}</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700">
            <ClipboardList className="w-5 h-5 text-indigo-500" />
            <span className="font-bold">Learner Submissions</span>
          </div>
          {selectedAssignment && (
            <div className="text-xs text-gray-500">
              Max: <span className="font-semibold text-gray-700">{selectedAssignment.maxScore}</span> · Passing:{' '}
              <span className="font-semibold text-gray-700">{selectedAssignment.passingScore}</span>
            </div>
          )}
        </div>

        {loadingSubmissions ? (
          <div className="px-5 py-10 text-center text-gray-500">Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-500">
            <Clock3 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-700">No submissions yet</p>
            <p className="text-sm">Learner work will appear here once submitted.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {submissions.map((submission) => {
              const passed = submission.status === 'GRADED' && submission.score !== null && submission.score >= (selectedAssignment?.passingScore ?? 80);
              return (
                <div key={submission.id} className="px-5 py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{formatName(submission)}</p>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusPillClass(submission.status)}`}>
                        {submission.status.replace(/_/g, ' ')}
                      </span>
                      {passed && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                          <Award className="w-3 h-3" />
                          Passed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Submitted: {formatDate(submission.submittedAt)} · Graded: {formatDate(submission.gradedAt)}
                    </p>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2 break-all">
                      {submission.submissionUrl || submission.fileUrl || submission.submissionText || 'No submission content'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm font-semibold text-gray-700">
                      Score: {submission.score ?? '—'}
                    </div>
                    {(submission.submissionUrl || submission.fileUrl) && (
                      <a
                        href={submission.submissionUrl || submission.fileUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Open
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => setGradeModalSubmission(submission)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Grade
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <GradeSubmissionModal
        open={!!gradeModalSubmission}
        submission={gradeModalSubmission}
        maxScore={selectedAssignment?.maxScore ?? 100}
        passingScore={selectedAssignment?.passingScore ?? 80}
        onClose={() => setGradeModalSubmission(null)}
        onSaved={handleSubmissionSaved}
      />
    </div>
  );
}
