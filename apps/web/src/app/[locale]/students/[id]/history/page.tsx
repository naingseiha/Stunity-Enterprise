'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useCallback, useEffect, useState, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import {
  ArrowLeft,
  User,
  Calendar,
  BookOpen,
  TrendingUp,
  GraduationCap,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  UserPlus,
  ArrowUpRight,
} from 'lucide-react';

interface Progression {
  id: string;
  fromYear: { id: string; name: string };
  toYear: { id: string; name: string };
  fromClass: { name: string; grade: string };
  toClass: { name: string; grade: string } | null;
  toGrade?: string | null;
  promotionType: string;
  promotionDate: string;
  notes: string | null;
}

interface ClassHistory {
  id: string;
  academicYear: { id: string; name: string; status: string };
  class: { id: string; name: string; grade: string; section: string | null };
  enrolledAt: string;
  startedAt?: string;
  endedAt?: string | null;
  entryReason?: string;
  exitReason?: string | null;
  status: string;
}

interface StudentHistory {
  student: {
    id: string;
    studentId: string;
    name: string;
    khmerName: string;
    gender: string;
    dateOfBirth: string;
    photoUrl: string | null;
    currentClass: { id: string; name: string; grade: string } | null;
    currentYear: { id: string; name: string } | null;
  };
  progressions: Progression[];
  classHistory: ClassHistory[];
  summary: {
    totalYears: number;
    totalProgressions: number;
    currentGrade: string | null;
    firstEnrolledYear: string | null;
  };
}

export default function StudentHistoryPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { id } = useParams();
  const [data, setData] = useState<StudentHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${params.locale}/auth/login`);
  };

  const loadStudentHistory = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError('');

      const token = TokenManager.getAccessToken();
      if (!token) {
        router.replace(`/${params.locale}/auth/login`);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003'}/students/${id}/progression`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal,
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Failed to load student history');
      }
      if (!result.data?.student || !Array.isArray(result.data?.progressions) || !Array.isArray(result.data?.classHistory) || !result.data?.summary) {
        throw new Error('Student history data is incomplete. Please try again.');
      }

      setData(result.data);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Error loading student history:', err);
      setError(err.message || 'Failed to load student history');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [id, params.locale, router]);

  useEffect(() => {
    const controller = new AbortController();
    void loadStudentHistory(controller.signal);
    return () => controller.abort();
  }, [loadStudentHistory]);

  const getPromotionTypeInfo = (type: string) => {
    const km = params.locale === 'km';
    switch (type) {
      case 'AUTOMATIC':
        return { label: km ? 'ឡើងថ្នាក់' : 'Promoted', color: 'bg-green-100 text-green-700', icon: TrendingUp };
      case 'MANUAL':
        return { label: km ? 'កែដោយដៃ' : 'Manual', color: 'bg-blue-100 text-blue-700', icon: UserPlus };
      case 'REPEAT':
        return { label: km ? 'រៀនត្រួតថ្នាក់' : 'Repeated', color: 'bg-orange-100 text-orange-700', icon: RefreshCw };
      case 'NEW_ADMISSION':
        return { label: km ? 'ចូលរៀនថ្មី' : 'New admission', color: 'bg-purple-100 text-purple-700', icon: UserPlus };
      case 'TRANSFER_IN':
        return { label: km ? 'ផ្ទេរចូល' : 'Transfer in', color: 'bg-cyan-100 text-cyan-700', icon: ArrowUpRight };
      case 'TRANSFER_OUT':
        return { label: km ? 'ផ្ទេរចេញ' : 'Transfer out', color: 'bg-red-100 text-red-700', icon: ArrowUpRight };
      default:
        return { label: type, color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200', icon: ChevronRight };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';

    if (params.locale === 'km') {
      const khmerMonths = [
        'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
        'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ',
      ];
      const toKhmerDigits = (value: number) => String(value).replace(/\d/g, (digit) => '០១២៣៤៥៦៧៨៩'[Number(digit)]);
      return `${toKhmerDigits(date.getDate())} ${khmerMonths[date.getMonth()]} ${toKhmerDigits(date.getFullYear())}`;
    }

    return date.toLocaleDateString(params.locale === 'km' ? 'km-KH' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="lg:ml-64 min-h-screen bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500 mb-4"></div>
            <p className="text-gray-600"><AutoI18nText i18nKey="auto.web.students_id_history_page.k_9b515eac" /></p>
          </div>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="lg:ml-64 min-h-screen bg-gray-50 dark:bg-gray-800/50 p-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-red-900 mb-2"><AutoI18nText i18nKey="auto.web.students_id_history_page.k_ced81dea" /></h3>
              <p className="text-red-700 mb-4">{error || 'Student not found'}</p>
              <button
                onClick={() => void loadStudentHistory()}
                className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700"
              >
                {params.locale === 'km' ? 'ព្យាយាមម្ដងទៀត' : 'Try again'}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const { student, progressions, classHistory, summary } = data;
  const isKhmer = params.locale === 'km';
  const studentPhotoSrc = student.photoUrl
    ? /^https?:\/\//.test(student.photoUrl)
      ? student.photoUrl
      : `${process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003'}${student.photoUrl}`
    : null;

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="lg:ml-64 min-h-screen bg-gray-50 dark:bg-none dark:bg-gray-800/50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/${params.locale}/students/${id}`)}
                className="p-2 hover:bg-white dark:bg-none dark:bg-gray-900/20 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                {studentPhotoSrc ? (
                  <Image
                    src={studentPhotoSrc}
                    alt={student.name}
                    width={64}
                    height={64}
                    priority
                    unoptimized
                    className="w-16 h-16 rounded-full object-cover border-2 border-white/50"
                  />
                ) : (
                  <div className="w-16 h-16 bg-white dark:bg-none dark:bg-gray-900/20 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold">{student.khmerName || student.name}</h1>
                  <p className="text-blue-100">
                    {student.studentId} • {isKhmer ? 'ប្រវត្តិសិក្សា' : 'Academic history'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-none dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalYears}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600">{isKhmer ? 'ឆ្នាំដែលបានសិក្សា' : 'Years enrolled'}</h3>
            </div>

            <div className="bg-white dark:bg-none dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalProgressions}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600">{isKhmer ? 'ការឡើងថ្នាក់' : 'Progressions'}</h3>
            </div>

            <div className="bg-white dark:bg-none dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{summary.currentGrade || '-'}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600">{isKhmer ? 'ថ្នាក់បច្ចុប្បន្ន' : 'Current grade'}</h3>
            </div>

            <div className="bg-white dark:bg-none dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{summary.firstEnrolledYear || '-'}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600">{isKhmer ? 'ចូលរៀនដំបូង' : 'First enrolled'}</h3>
            </div>
          </div>

          {/* Current Status */}
          {student.currentClass && student.currentYear && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                {isKhmer ? 'ការសិក្សាបច្ចុប្បន្ន' : 'Current enrollment'}
              </h2>
              <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="p-3 bg-green-500 rounded-lg">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{student.currentClass.name}</h3>
                  <p className="text-sm text-gray-600">
                    {isKhmer ? 'ថ្នាក់ទី' : 'Grade'} {student.currentClass.grade} • {student.currentYear.name}
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/${params.locale}/classes/${student.currentClass?.id}/roster`)}
                  className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  {isKhmer ? 'មើលបញ្ជីថ្នាក់' : 'View class'}
                </button>
              </div>
            </div>
          )}

          {/* Progression Timeline */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              {isKhmer ? 'ប្រវត្តិការឡើងថ្នាក់' : 'Progression history'}
            </h2>

            {progressions.length > 0 ? (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                <div className="space-y-6">
                  {progressions.map((p) => {
                    const typeInfo = getPromotionTypeInfo(p.promotionType);
                    const TypeIcon = typeInfo.icon;

                    return (
                      <div key={p.id} className="relative pl-16">
                        {/* Timeline dot */}
                        <div className={`absolute left-4 w-5 h-5 rounded-full border-4 border-white ${
                          p.promotionType === 'AUTOMATIC' ? 'bg-green-500' :
                          p.promotionType === 'REPEAT' ? 'bg-orange-500' :
                          'bg-blue-500'
                        }`}></div>

                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:border-gray-700 transition-colors">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                                  <TypeIcon className="w-3 h-3 inline mr-1" />
                                  {typeInfo.label}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {formatDate(p.promotionDate)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                <span className="font-medium">{p.fromClass.name}</span>
                                <span className="text-gray-400">({p.fromYear.name})</span>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                <span className="font-medium">{p.toClass?.name || `Grade ${p.toGrade || '—'} · section pending`}</span>
                                <span className="text-gray-400">({p.toYear.name})</span>
                              </div>
                              {p.notes && (
                                <p className="text-sm text-gray-600 mt-2">{p.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>{isKhmer ? 'មិនទាន់មានប្រវត្តិឡើងថ្នាក់' : 'No progression history available'}</p>
                <p className="text-sm">{isKhmer ? 'ប្រវត្តិនឹងបង្ហាញនៅទីនេះ នៅពេលសិស្សត្រូវបានឡើងថ្នាក់ ឬផ្ទេរថ្នាក់។' : 'Promotions and transfers will appear here.'}</p>
              </div>
            )}
          </div>

          {/* Class History */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-gray-600" />
              {isKhmer ? 'ប្រវត្តិការចុះឈ្មោះតាមថ្នាក់' : 'Class enrollment history'}
            </h2>

            {classHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">{isKhmer ? 'ឆ្នាំសិក្សា' : 'Academic year'}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">{isKhmer ? 'ថ្នាក់' : 'Class'}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">{isKhmer ? 'កម្រិតថ្នាក់' : 'Grade'}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">{isKhmer ? 'រយៈពេលសិក្សា' : 'Enrollment period'}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">{isKhmer ? 'ស្ថានភាព' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {classHistory.map((history) => (
                      <tr key={history.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">{history.academicYear.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{history.class.name}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{isKhmer ? 'ថ្នាក់ទី' : 'Grade'} {history.class.grade}</td>
                        <td className="px-4 py-3 text-gray-500 text-sm">
                          <div>{formatDate(history.startedAt || history.enrolledAt)}</div>
                          <div className="mt-0.5 text-xs text-gray-400">
                            {history.endedAt
                              ? `${isKhmer ? 'ដល់' : 'to'} ${formatDate(history.endedAt)}`
                              : (isKhmer ? 'ដល់បច្ចុប្បន្ន' : 'Current')}
                          </div>
                          {history.exitReason && (
                            <div className="mt-1 text-[11px] font-medium text-blue-600 dark:text-blue-300">
                              {history.exitReason.replaceAll('_', ' ')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            history.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                            history.status === 'INACTIVE' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {history.status === 'ACTIVE'
                              ? (params.locale === 'km' ? 'កំពុងសិក្សា' : 'Active')
                              : (params.locale === 'km' ? 'បានបញ្ចប់' : 'Completed')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p><AutoI18nText i18nKey="auto.web.students_id_history_page.k_bc24855c" /></p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
