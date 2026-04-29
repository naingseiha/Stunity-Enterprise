'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useTranslations } from 'next-intl';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Download,
  AlertCircle,
  Award,
  Calendar,
  BookOpen,
  Printer,
} from 'lucide-react';

const STUDENT_SERVICE_URL = process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003';
const GRADE_SERVICE_URL = process.env.NEXT_PUBLIC_GRADE_SERVICE_URL || 'http://localhost:3007';

interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  khmerName: string;
  studentId: string;
  class?: {
    id: string;
    name: string;
    grade: string;
  };
  school?: {
    name: string;
  };
}

interface GradeSummary {
  subjectId: string;
  subjectName: string;
  subjectNameKh: string;
  category: string;
  grades: {
    month: string;
    score: number;
    maxScore: number;
    percentage: number;
  }[];
  average: number;
}

export default function ChildReportCardPage(
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
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [gradeSummary, setGradeSummary] = useState<GradeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

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

    // Verify access
    const children = userData.user?.children || [];
    if (!children.some((c: any) => c.id === studentId)) {
      setError('You do not have access to this student');
      setLoading(false);
      return;
    }

    fetchData(token);
  }, [locale, router, studentId]);

  const fetchData = async (token: string) => {
    try {
      // Fetch student details
      const studentRes = await fetch(`${STUDENT_SERVICE_URL}/students/${studentId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const studentData = await studentRes.json();
      if (studentData.success || studentData.data) {
        setStudent(studentData.data || studentData);
      }

      // Fetch grades summary
      const gradesRes = await fetch(`${GRADE_SERVICE_URL}/grades/student/${studentId}/summary`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const gradesData = await gradesRes.json();
      if (gradesData.success || gradesData.data) {
        setGradeSummary(gradesData.data || gradesData || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate overall average
  const overallAverage = gradeSummary.length > 0
    ? (gradeSummary.reduce((sum, s) => sum + (s.average || 0), 0) / gradeSummary.length).toFixed(1)
    : 'N/A';

  // Get grade letter
  const getGradeLetter = (percentage: number) => {
    if (percentage >= 90) return { letter: 'A', color: 'bg-green-100 text-green-700' };
    if (percentage >= 80) return { letter: 'B', color: 'bg-blue-100 text-blue-700' };
    if (percentage >= 70) return { letter: 'C', color: 'bg-yellow-100 text-yellow-700' };
    if (percentage >= 60) return { letter: 'D', color: 'bg-orange-100 text-orange-700' };
    if (percentage >= 50) return { letter: 'E', color: 'bg-red-100 text-red-600' };
    return { letter: 'F', color: 'bg-red-200 text-red-800' };
  };

  // Download report card as PDF
  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Dynamic import of jsPDF
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();

      // Header
      doc.setFontSize(20);
      doc.setTextColor(34, 197, 94); // Green
      doc.text('STUDENT REPORT CARD', 105, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(student?.school?.name || 'School Name', 105, 30, { align: 'center' });

      // Student Info
      doc.setFontSize(11);
      doc.text(`Student: ${student?.firstName} ${student?.lastName}`, 20, 45);
      doc.text(`Khmer Name: ${student?.khmerName}`, 20, 52);
      doc.text(`Student ID: ${student?.studentId || 'N/A'}`, 120, 45);
      doc.text(`Class: ${student?.class?.name || 'N/A'}`, 120, 52);

      // Grades Table
      const tableData = gradeSummary.map(subject => [
        subject.subjectNameKh || subject.subjectName,
        subject.average?.toFixed(1) || 'N/A',
        getGradeLetter(subject.average || 0).letter,
        subject.average >= 50 ? 'Pass' : 'Fail',
      ]);

      autoTable(doc, {
        startY: 65,
        head: [['Subject', 'Average (%)', 'Grade', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
      });

      // Overall Average
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setTextColor(34, 197, 94);
      doc.text(`Overall Average: ${overallAverage}%`, 20, finalY);

      // Footer
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 280);
      doc.text('Powered by Stunity Enterprise', 105, 280, { align: 'center' });

      // Save
      doc.save(`report-card-${student?.firstName}-${student?.lastName}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
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
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href={`/${locale}/parent/child/${studentId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_26f7a203" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link
        href={`/${locale}/parent/child/${studentId}`}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_8108541d" /> {student?.khmerName || 'Student'}
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FileText className="w-7 h-7 text-purple-600" />
            <AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_b183fe29" />
          </h1>
          <p className="text-gray-600 mt-1">
            {student?.khmerName} • {student?.class?.name || 'No class'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-none dark:bg-gray-800/50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_1c43bacc" />
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading || gradeSummary.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_b5f3cf5c" />
          </button>
        </div>
      </div>

      {/* Report Card */}
      <div className="bg-white dark:bg-none dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden print:shadow-none print:border-0">
        {/* Report Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 print:bg-green-600">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-1"><AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_d5aa0580" /></h2>
            <p className="text-green-100">{student?.school?.name || 'School Name'}</p>
          </div>
        </div>

        {/* Student Info */}
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide"><AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_3a92776c" /></p>
              <p className="font-semibold text-gray-900 dark:text-white">{student?.firstName} {student?.lastName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide"><AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_25621590" /></p>
              <p className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Battambang, sans-serif' }}>
                {student?.khmerName}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide"><AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_a6913846" /></p>
              <p className="font-semibold text-gray-900 dark:text-white">{student?.studentId || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide"><AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_b110ed06" /></p>
              <p className="font-semibold text-gray-900 dark:text-white">{student?.class?.name || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-800 border-b border-gray-200 dark:border-gray-800">
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600">{overallAverage}%</div>
            <div className="text-sm text-gray-500 mt-1"><AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_77b92223" /></div>
          </div>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{gradeSummary.length}</div>
            <div className="text-sm text-gray-500 mt-1"><AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_f8a63a97" /></div>
          </div>
          <div className="p-6 text-center">
            <div className={`text-3xl font-bold ${Number(overallAverage) >= 50 ? 'text-green-600' : 'text-red-600'}`}>
              {Number(overallAverage) >= 50 ? 'PASS' : 'FAIL'}
            </div>
            <div className="text-sm text-gray-500 mt-1"><AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_f1d1e5d3" /></div>
          </div>
        </div>

        {/* Grades Table */}
        {gradeSummary.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2"><AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_4e39b9aa" /></h3>
            <p className="text-gray-600">
              <AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_10928af7" />
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_dbef3dfc" />
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_00313794" />
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_2848c6a3" />
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_f1d1e5d3" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {gradeSummary.map((subject, index) => {
                  const grade = getGradeLetter(subject.average || 0);
                  const isPassing = (subject.average || 0) >= 50;
                  
                  return (
                    <tr key={subject.subjectId || index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white" style={{ fontFamily: 'Battambang, sans-serif' }}>
                          {subject.subjectNameKh || subject.subjectName}
                        </div>
                        {subject.category && (
                          <div className="text-sm text-gray-500">{subject.category}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">
                          {subject.average?.toFixed(1) || 'N/A'}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${grade.color}`}>
                          {grade.letter}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                          isPassing ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {isPassing ? (
                            <>
                              <Award className="w-4 h-4" />
                              <AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_1d41ee1f" />
                            </>
                          ) : (
                            'Fail'
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span><AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_f1a90785" /> {new Date().toLocaleDateString()}</span>
            <span><AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_28cd3958" /></span>
          </div>
        </div>
      </div>

      {/* Grading Scale */}
      <div className="mt-6 bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 print:hidden">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3"><AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_6451573a" /></h4>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"><AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_fbf3d72f" /></span>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"><AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_3ba14b6b" /></span>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm"><AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_132e7a2b" /></span>
          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"><AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_6e396fa5" /></span>
          <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-sm"><AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_22e783ac" /></span>
          <span className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm"><AutoI18nText i18nKey="auto.web.studentId_report_card_page.k_037210c3" /></span>
        </div>
      </div>
    </div>
  );
}
