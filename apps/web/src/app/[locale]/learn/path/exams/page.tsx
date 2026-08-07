'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, RefreshCw, ChevronRight } from 'lucide-react';
import { browseQuizzes, type BrowseQuizItem } from '@/lib/api/quizzes';
import UnifiedNavigation from '@/components/UnifiedNavigation';

const BADGE_COLORS = ['#8B5CF6', '#0EA5E9', '#F59E0B', '#10B981', '#EC4899', '#6366F1'];

export default function ExamPapersPage() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const isKm = locale === 'km';

  const courseCode = search.get('courseCode') || '';
  const subjectName = search.get('subjectName') || '';
  const subjectNameKh = search.get('subjectNameKh') || '';
  const title = isKm ? subjectNameKh || subjectName : subjectName || subjectNameKh;

  const [papers, setPapers] = useState<BrowseQuizItem[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    setPapers(null);
    try {
      const items = await browseQuizzes({
        courseCode: courseCode || undefined,
        examOnly: true,
        limit: 50,
      });
      setPapers(items);
    } catch {
      setError(true);
      setPapers([]);
    }
  }, [courseCode]);

  useEffect(() => {
    void load();
  }, [load]);

  const subtitle = useMemo(
    () => (isKm ? 'ឯកសារប្រឡងផ្លូវការ' : 'Official exam papers'),
    [isKm],
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <UnifiedNavigation />
      <div
        className="md:hidden"
        style={{
          paddingTop: 'calc(var(--top-bar-height) + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 12px)',
        }}
      >
        <div
          className="px-4 pt-4 pb-6 text-white"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6, #A855F7)' }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-white/90 text-sm font-semibold mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            {isKm ? 'ត្រឡប់' : 'Back'}
          </button>
          <h1 className="text-2xl font-black leading-tight">{title || (isKm ? 'ឯកសារប្រឡង' : 'Exam Papers')}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full bg-white/20 text-[11px] font-bold">{subtitle}</span>
            {courseCode && (
              <span className="px-2.5 py-1 rounded-full bg-white/20 text-[11px] font-bold">{courseCode}</span>
            )}
          </div>
        </div>

        <div className="px-4 -mt-2 space-y-3">
          {papers === null && (
            <div className="py-16 flex justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-violet-500" />
            </div>
          )}

          {error && (
            <div className="py-10 text-center">
              <p className="text-slate-500 mb-3">{isKm ? 'មិនអាចផ្ទុកបានទេ' : 'Failed to load papers'}</p>
              <button type="button" onClick={() => void load()} className="text-violet-600 font-bold text-sm">
                {isKm ? 'ព្យាយាមម្តងទៀត' : 'Retry'}
              </button>
            </div>
          )}

          {papers && papers.length === 0 && !error && (
            <div className="py-14 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                {isKm ? 'មិនទាន់មានឯកសារប្រឡងសម្រាប់មុខវិជ្ជានេះ' : 'No exam papers for this subject yet'}
              </p>
            </div>
          )}

          {papers?.map((paper, idx) => {
            const badge = BADGE_COLORS[idx % BADGE_COLORS.length];
            const num = String(idx + 1).padStart(2, '0');
            return (
              <Link
                key={paper.id}
                href={
                  paper.postId
                    ? `/${locale}/feed/post/${paper.postId}`
                    : `/${locale}/feed`
                }
                className="flex gap-3 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm active:scale-[0.99] transition"
              >
                <div
                  className="w-11 rounded-2xl flex items-center justify-center text-white text-sm font-black shrink-0"
                  style={{ backgroundColor: badge }}
                >
                  {num}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{paper.title}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {paper.difficulty && (
                      <span className="px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/10 text-[10px] font-bold text-violet-600">
                        {paper.difficulty}
                      </span>
                    )}
                    {paper.questionCount != null && (
                      <span className="px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-500/10 text-[10px] font-bold text-sky-600">
                        {paper.questionCount} Q
                      </span>
                    )}
                    {paper.timeLimit != null && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-[10px] font-bold text-amber-600">
                        {paper.timeLimit}m
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 self-center shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Desktop fallback */}
      <div className="hidden md:block max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-black mb-2">{title || 'Exam Papers'}</h1>
        <p className="text-slate-500 mb-6">{subtitle}</p>
        {papers === null && <RefreshCw className="w-6 h-6 animate-spin text-violet-500" />}
        <div className="space-y-3">
          {papers?.map((paper) => (
            <Link
              key={paper.id}
              href={
                paper.postId
                  ? `/${locale}/feed/post/${paper.postId}`
                  : `/${locale}/feed`
              }
              className="block p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <p className="font-bold">{paper.title}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
