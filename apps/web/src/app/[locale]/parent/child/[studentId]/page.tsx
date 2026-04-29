'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useTranslations } from 'next-intl';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  FileText,
  Download,
  BookOpen,
  Clock,
  Award,
  TrendingUp,
  AlertCircle,
  User,
  GraduationCap,
  MessageCircle,
} from 'lucide-react';

const STUDENT_SERVICE_URL = process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003';

interface StudentDetails {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  khmerName: string;
  englishName?: string;
  gender: string;
  dateOfBirth: string;
  email?: string;
  phoneNumber?: string;
  photoUrl?: string;
  class?: {
    id: string;
    name: string;
    grade: string;
    section?: string;
  };
  school?: {
    id: string;
    name: string;
  };
}

export default function ChildDetailPage(
  props: { 
    params: Promise<{ locale: string; studentId: string }> 
  }
) {
  const params = use(props.params);

  const {
    locale,
    studentId
  } = params;

  const router = useRouter();
  const t = useTranslations('common');
  const [user, setUser] = useState<any>(null);
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/parent/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    if (userData.user?.role !== 'PARENT') {
      router.replace(`/${locale}/dashboard`);
      return;
    }

    // Verify this student is linked to this parent
    const children = userData.user?.children || [];
    const hasAccess = children.some((c: any) => c.id === studentId);
    
    if (!hasAccess) {
      setError('You do not have access to this student');
      setLoading(false);
      return;
    }

    setUser(userData.user);
    fetchStudentDetails(token);
  }, [locale, router, studentId]);

  const fetchStudentDetails = async (token: string) => {
    try {
      const response = await fetch(`${STUDENT_SERVICE_URL}/students/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success || data.data) {
        setStudent(data.data || data);
      } else {
        setError('Failed to load student details');
      }
    } catch (err) {
      setError('Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2"><AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_cd22bd51" /></h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href={`/${locale}/parent`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_29e8e993" />
          </Link>
        </div>
      </div>
    );
  }

  if (!student) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link
        href={`/${locale}/parent`}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_29e8e993" />
      </Link>

      {/* Student Header */}
      <div className="bg-white dark:bg-none dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={student.khmerName}
                className="w-24 h-24 rounded-full object-cover border-4 border-green-100"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-3xl font-bold">
                {student.firstName[0]}{student.lastName[0]}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1" style={{ fontFamily: 'Battambang, sans-serif' }}>
              {student.khmerName}
            </h1>
            <p className="text-lg text-gray-600">{student.firstName} {student.lastName}</p>
            
            <div className="flex flex-wrap items-center gap-3 mt-3">
              {student.studentId && (
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full text-sm">
                  <AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_30ecbee5" /> {student.studentId}
                </span>
              )}
              {student.class && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  {student.class.name} <AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_d0cb86d5" /> {student.class.grade}
                </span>
              )}
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                {student.gender === 'MALE' ? '👨 Male' : '👩 Female'}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4 md:gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">--</p>
              <p className="text-xs text-gray-500"><AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_e8bcde34" /></p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">--</p>
              <p className="text-xs text-gray-500"><AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_8b9617ac" /></p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">--</p>
              <p className="text-xs text-gray-500"><AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_62de56e7" /></p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href={`/${locale}/parent/child/${studentId}/grades`}
          className="bg-white dark:bg-none dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 hover:border-green-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center text-white">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-green-600 transition-colors">
                <AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_5c43d905" />
              </h3>
              <p className="text-sm text-gray-500"><AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_ef2b799a" /></p>
            </div>
          </div>
        </Link>

        <Link
          href={`/${locale}/parent/messages`}
          className="bg-white dark:bg-none dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 hover:border-amber-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">
              <MessageCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-amber-600 transition-colors">
                <AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_81c25356" />
              </h3>
              <p className="text-sm text-gray-500"><AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_1e7be266" /></p>
            </div>
          </div>
        </Link>

        <Link
          href={`/${locale}/parent/child/${studentId}/attendance`}
          className="bg-white dark:bg-none dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                <AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_8b9617ac" />
              </h3>
              <p className="text-sm text-gray-500"><AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_dd56dab0" /></p>
            </div>
          </div>
        </Link>

        <Link
          href={`/${locale}/parent/child/${studentId}/report-card`}
          className="bg-white dark:bg-none dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 hover:border-purple-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center text-white">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">
                <AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_2992f76b" />
              </h3>
              <p className="text-sm text-gray-500"><AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_0bcc40d3" /></p>
            </div>
          </div>
        </Link>
      </div>

      {/* Student Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white dark:bg-none dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-green-600" />
              <AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_17869a62" />
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1"><AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_41729f5a" /></p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{student.dateOfBirth || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1"><AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_9a6e1951" /></p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{student.gender === 'MALE' ? 'Male' : 'Female'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1"><AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_c82fe7a3" /></p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{student.phoneNumber || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1"><AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_785adf3f" /></p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{student.email || 'Not specified'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Class Information */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_3ae771f6" />
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {student.class ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1"><AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_9737c452" /></p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{student.class.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1"><AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_d44fac10" /></p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_6d338289" /> {student.class.grade}</p>
                </div>
                {student.class.section && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1"><AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_f084a134" /></p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{student.class.section}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1"><AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_a2e3fc64" /></p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{student.school?.name || 'Unknown'}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4"><AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_d258808d" /></p>
            )}
          </div>
        </div>

        {/* Recent Grades */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_edb375e4" />
            </h3>
            <Link
              href={`/${locale}/parent/child/${studentId}/grades`}
              className="text-sm text-green-600 hover:text-green-700"
            >
              <AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_85a9df16" />
            </Link>
          </div>
          <div className="p-6 text-center text-gray-500">
            <Award className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm"><AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_aa0fad37" /></p>
          </div>
        </div>

        {/* Recent Attendance */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_408feeef" />
            </h3>
            <Link
              href={`/${locale}/parent/child/${studentId}/attendance`}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              <AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_85a9df16" />
            </Link>
          </div>
          <div className="p-6 text-center text-gray-500">
            <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm"><AutoI18nText i18nKey="auto.web.parent_child_studentId_page.k_749236e0" /></p>
          </div>
        </div>
      </div>
    </div>
  );
}
