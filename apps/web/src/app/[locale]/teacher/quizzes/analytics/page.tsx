'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Brain,
  RefreshCw,
  TrendingUp,
  Users,
  ClipboardList,
  Target,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Download,
} from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import AnimatedContent from '@/components/AnimatedContent';
import BlurLoader from '@/components/BlurLoader';
import { TokenManager } from '@/lib/api/auth';
import {
  teacherQuizAPI,
  type TeacherQuizAnalyticsData,
  type TeacherQuizAnalyticsPeriod,
  type TeacherQuizSummary,
  type TeacherClassOption,
} from '@/lib/api/teacherQuizzes';
import { downloadTeacherQuizAnalyticsCsv } from '@/lib/teacherQuizAnalyticsExport';

const PERIODS: TeacherQuizAnalyticsPeriod[] = ['7d', '30d', '90d', 'all'];
const ALLOWED_ROLES = new Set(['TEACHER', 'ADMIN', 'STAFF', 'SUPER_ADMIN', 'SCHOOL_ADMIN']);

type TFn = ReturnType<typeof useTranslations<'teacherQuizAnalytics'>>;

export default function TeacherQuizAnalyticsPage() {
  const t = useTranslations('teacherQuizAnalytics');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const initialQuizId = searchParams.get('quizId');

  const [period, setPeriod] = useState<TeacherQuizAnalyticsPeriod>('30d');
  const [classId, setClassId] = useState<string | null>(null);
  const [data, setData] = useState<TeacherQuizAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<TeacherQuizSummary | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<
    Awaited<ReturnType<typeof teacherQuizAPI.getQuizAttempts>> | null
  >(null);
  const [quizAttemptsLoading, setQuizAttemptsLoading] = useState(false);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    const user = TokenManager.getUserData()?.user;
    if (user?.role && !ALLOWED_ROLES.has(user.role)) {
      router.push(`/${locale}/feed`);
    }
  }, [locale, router]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const next = await teacherQuizAPI.getAnalytics(period, classId);
      setData(next);
      setSelectedQuiz((prev) => {
        if (!prev) return null;
        return next.quizzes.find((q) => q.id === prev.id) ?? null;
      });
    } catch {
      setError(t('loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [period, classId, t]);

  const loadQuizAttempts = useCallback(async (quiz: TeacherQuizSummary) => {
    setSelectedQuiz(quiz);
    setQuizAttemptsLoading(true);
    try {
      const detail = await teacherQuizAPI.getQuizAttempts(quiz.id);
      setQuizAttempts(detail);
    } catch {
      setQuizAttempts(null);
    } finally {
      setQuizAttemptsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data || !initialQuizId || selectedQuiz) return;
    const quiz = data.quizzes.find((item) => item.id === initialQuizId);
    if (quiz) {
      void loadQuizAttempts(quiz);
    }
  }, [data, initialQuizId, selectedQuiz, loadQuizAttempts]);

  const periodLabel = useMemo(() => {
    switch (period) {
      case '7d':
        return t('period7d');
      case '90d':
        return t('period90d');
      case 'all':
        return t('periodAll');
      default:
        return t('period30d');
    }
  }, [period, t]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <UnifiedNavigation />
      <main className="lg:ml-64 p-4 sm:p-6 lg:p-8">
        <AnimatedContent>
          <AnalyticsPageContent
            t={t}
            tCommon={tCommon}
            locale={locale}
            period={period}
            setPeriod={setPeriod}
            classId={classId}
            setClassId={setClassId}
            periodLabel={periodLabel}
            loading={loading}
            error={error}
            data={data}
            selectedQuiz={selectedQuiz}
            quizAttempts={quizAttempts}
            quizAttemptsLoading={quizAttemptsLoading}
            onRefresh={load}
            onSelectQuiz={loadQuizAttempts}
            onCloseQuiz={() => {
              setSelectedQuiz(null);
              setQuizAttempts(null);
            }}
          />
        </AnimatedContent>
      </main>
    </div>
  );
}

function AnalyticsPageContent(props: {
  t: TFn;
  tCommon: ReturnType<typeof useTranslations<'common'>>;
  locale: string;
  period: TeacherQuizAnalyticsPeriod;
  setPeriod: (p: TeacherQuizAnalyticsPeriod) => void;
  classId: string | null;
  setClassId: (id: string | null) => void;
  periodLabel: string;
  loading: boolean;
  error: string | null;
  data: TeacherQuizAnalyticsData | null;
  selectedQuiz: TeacherQuizSummary | null;
  quizAttempts: Awaited<ReturnType<typeof teacherQuizAPI.getQuizAttempts>> | null;
  quizAttemptsLoading: boolean;
  onRefresh: () => void;
  onSelectQuiz: (quiz: TeacherQuizSummary) => void;
  onCloseQuiz: () => void;
}) {
  const {
    t,
    tCommon,
    locale,
    period,
    setPeriod,
    classId,
    setClassId,
    periodLabel,
    loading,
    error,
    data,
    selectedQuiz,
    quizAttempts,
    quizAttemptsLoading,
    onRefresh,
    onSelectQuiz,
    onCloseQuiz,
  } = props;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <CompactHeroCard
        eyebrow="Insights"
        title={t('title')}
        description={t('subtitle')}
        icon={Brain}
        backgroundClassName="bg-[linear-gradient(135deg,rgba(124,58,237,0.12),rgba(255,255,255,0.98))] dark:bg-[linear-gradient(135deg,rgba(76,29,149,0.35),rgba(15,23,42,0.98))]"
        glowClassName="bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.2),transparent_58%)]"
        eyebrowClassName="text-violet-600/80"
        iconShellClassName="bg-violet-600 text-white"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {data && data.overview.totalQuizzes > 0 ? (
              <button
                type="button"
                onClick={() => downloadTeacherQuizAnalyticsCsv(data)}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200"
              >
                <Download className="h-4 w-4" />
                {t('exportCsv')}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void onRefresh()}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-900/50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {periodLabel}
            </button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PeriodFilters period={period} setPeriod={setPeriod} t={t} />
        {data && data.classes.length > 0 ? (
          <ClassFilter classId={classId} setClassId={setClassId} classes={data.classes} t={t} />
        ) : null}
      </div>

      <BlurLoader isLoading={loading} showSpinner={false}>
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : !data ? null : data.overview.totalQuizzes === 0 ? (
          <EmptyState locale={locale} t={t} />
        ) : (
          <Dashboard
            data={data}
            selectedQuiz={selectedQuiz}
            quizAttempts={quizAttempts}
            quizAttemptsLoading={quizAttemptsLoading}
            loadingLabel={tCommon('loading')}
            onSelectQuiz={onSelectQuiz}
            onCloseQuiz={onCloseQuiz}
            t={t}
          />
        )}
      </BlurLoader>
    </div>
  );
}

function ClassFilter({
  classId,
  setClassId,
  classes,
  t,
}: {
  classId: string | null;
  setClassId: (id: string | null) => void;
  classes: TeacherClassOption[];
  t: TFn;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <span className="font-semibold">{t('classFilter')}</span>
      <select
        value={classId ?? ''}
        onChange={(event) => setClassId(event.target.value || null)}
        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      >
        <option value="">{t('allClasses')}</option>
        {classes.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function PeriodFilters({
  period,
  setPeriod,
  t,
}: {
  period: TeacherQuizAnalyticsPeriod;
  setPeriod: (p: TeacherQuizAnalyticsPeriod) => void;
  t: TFn;
}) {
  const labels: Record<TeacherQuizAnalyticsPeriod, string> = {
    '7d': t('period7d'),
    '30d': t('period30d'),
    '90d': t('period90d'),
    all: t('periodAll'),
  };

  return (
    <div className="flex flex-wrap gap-2">
      {PERIODS.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setPeriod(item)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            period === item
              ? 'bg-violet-600 text-white shadow-md'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-violet-300 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700'
          }`}
        >
          {labels[item]}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ locale, t }: { locale: string; t: TFn }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
      <Brain className="mx-auto h-12 w-12 text-violet-500 mb-4" />
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('noQuizzes')}</h3>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('noQuizzesHint')}</p>
      <a
        href={`/${locale}/feed`}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
      >
        {t('goToFeed')}
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}

function Dashboard({
  data,
  selectedQuiz,
  quizAttempts,
  quizAttemptsLoading,
  loadingLabel,
  onSelectQuiz,
  onCloseQuiz,
  t,
}: {
  data: TeacherQuizAnalyticsData;
  selectedQuiz: TeacherQuizSummary | null;
  quizAttempts: Awaited<ReturnType<typeof teacherQuizAPI.getQuizAttempts>> | null;
  quizAttemptsLoading: boolean;
  loadingLabel: string;
  onSelectQuiz: (quiz: TeacherQuizSummary) => void;
  onCloseQuiz: () => void;
  t: TFn;
}) {
  const overviewCards = [
    { label: t('totalQuizzes'), value: data.overview.totalQuizzes, icon: ClipboardList, color: 'text-violet-600' },
    { label: t('totalAttempts'), value: data.overview.totalAttempts, icon: TrendingUp, color: 'text-sky-600' },
    { label: t('uniqueStudents'), value: data.overview.uniqueStudents, icon: Users, color: 'text-emerald-600' },
    {
      label: t('passRate'),
      value: `${data.overview.passRate}%`,
      icon: Target,
      color: 'text-amber-600',
      sub: `${t('avgScore')}: ${data.overview.averageScore}%`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              {card.sub ? <p className="mt-1 text-xs text-gray-500">{card.sub}</p> : null}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('attemptsTrend')}</h3>
          <p className="text-sm text-gray-500 mb-4">{t('attemptsTrendSub')}</p>
          {data.attemptsOverTime.length === 0 ? (
            <p className="text-sm text-gray-500 py-12 text-center">{t('noAttempts')}</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.attemptsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="attempts" stroke="#7c3aed" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="passed" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('hardestQuestions')}</h3>
          <p className="text-sm text-gray-500 mb-4">{t('hardestQuestionsSub')}</p>
          {data.questionInsights.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">{t('noQuestions')}</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {data.questionInsights.map((item) => (
                <QuestionInsightCard key={`${item.quizId}-${item.questionId}`} item={item} t={t} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('quizPerformance')}</h3>
            <p className="text-sm text-gray-500">{t('quizPerformanceSub')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-950/50 text-left text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Quiz</th>
                  <th className="px-5 py-3 font-semibold">{t('attempts')}</th>
                  <th className="px-5 py-3 font-semibold">{t('learners')}</th>
                  <th className="px-5 py-3 font-semibold">{t('avg')}</th>
                  <th className="px-5 py-3 font-semibold">{t('passRate')}</th>
                </tr>
              </thead>
              <tbody>
                {data.quizzes.map((quiz) => (
                  <tr
                    key={quiz.id}
                    onClick={() => onSelectQuiz(quiz)}
                    className={`border-t border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-950/20 ${
                      selectedQuiz?.id === quiz.id ? 'bg-violet-50 dark:bg-violet-950/30' : ''
                    }`}
                  >
                    <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">{quiz.title}</td>
                    <td className="px-5 py-4">{quiz.attemptCount}</td>
                    <td className="px-5 py-4">{quiz.uniqueStudents}</td>
                    <td className="px-5 py-4">{quiz.averageScore}%</td>
                    <td className="px-5 py-4">{quiz.passRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {selectedQuiz ? t('selectedQuiz') : t('recentAttempts')}
              </h3>
              <p className="text-sm text-gray-500">
                {selectedQuiz ? selectedQuiz.title : t('recentAttemptsSub')}
              </p>
            </div>
            {selectedQuiz ? (
              <button
                type="button"
                onClick={onCloseQuiz}
                className="text-sm font-semibold text-violet-600 hover:text-violet-700"
              >
                {t('closeDetails')}
              </button>
            ) : null}
          </div>

          {selectedQuiz && quizAttemptsLoading ? (
            <p className="text-sm text-gray-500 py-8 text-center">{loadingLabel}</p>
          ) : selectedQuiz && quizAttempts ? (
            <QuizDetailPanel quizAttempts={quizAttempts} t={t} />
          ) : (
            <RecentAttemptsList attempts={data.recentAttempts} t={t} />
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionInsightCard({
  item,
  t,
}: {
  item: TeacherQuizAnalyticsData['questionInsights'][number];
  t: TFn;
}) {
  return (
    <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
      <p className="text-xs font-semibold text-violet-600">{item.quizTitle}</p>
      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{item.questionText}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>
          {t('wrongRate')}: {item.wrongRate}%
        </span>
        <span>
          {item.total} {t('responses')}
        </span>
      </div>
    </div>
  );
}

function RecentAttemptsList({
  attempts,
  t,
}: {
  attempts: TeacherQuizAnalyticsData['recentAttempts'];
  t: TFn;
}) {
  if (attempts.length === 0) {
    return <p className="text-sm text-gray-500 py-8 text-center">{t('noAttempts')}</p>;
  }

  return (
    <div className="space-y-2 max-h-[420px] overflow-y-auto">
      {attempts.map((attempt) => (
        <div
          key={attempt.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {attempt.userName || 'Learner'}
            </p>
            <p className="text-xs text-gray-500 truncate">{attempt.quizTitle}</p>
          </div>
          <AttemptScore passed={attempt.passed} score={attempt.score} t={t} />
        </div>
      ))}
    </div>
  );
}

function AttemptScore({
  passed,
  score,
  t,
}: {
  passed: boolean;
  score: number;
  t: TFn;
}) {
  return (
    <div className="text-right shrink-0">
      <p className="text-sm font-bold text-gray-900 dark:text-white">{score}%</p>
      {passed ? (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
          <CheckCircle2 className="h-3 w-3" />
          {t('passed')}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs text-red-500">
          <XCircle className="h-3 w-3" />
          {t('failed')}
        </span>
      )}
    </div>
  );
}

function QuizDetailPanel({
  quizAttempts,
  t,
}: {
  quizAttempts: NonNullable<Awaited<ReturnType<typeof teacherQuizAPI.getQuizAttempts>>>;
  t: TFn;
}) {
  const chartData = [
    { name: t('passed'), value: quizAttempts.statistics.passedAttempts },
    { name: t('failed'), value: quizAttempts.statistics.failedAttempts },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StatPill label={t('attempts')} value={quizAttempts.statistics.totalAttempts} />
        <StatPill label={t('passRate')} value={`${quizAttempts.statistics.passRate}%`} />
        <StatPill label={t('avg')} value={`${quizAttempts.statistics.averageScore}%`} />
      </div>
      <div className="h-40 rounded-xl bg-gray-50 dark:bg-gray-950/40 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-2">
        {quizAttempts.attempts.slice(0, 12).map((attempt) => (
          <div
            key={attempt.id}
            className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800"
          >
            <span className="text-sm text-gray-800 dark:text-gray-200">
              {attempt.user.firstName} {attempt.user.lastName}
            </span>
            <span className="text-sm font-semibold">{attempt.score}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-violet-700/80 dark:text-violet-300/80">{label}</p>
      <p className="text-lg font-bold text-violet-700 dark:text-violet-200">{value}</p>
    </div>
  );
}
