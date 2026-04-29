'use client';

import { useTranslations } from 'next-intl';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import {
  getAcademicYears,
  createAcademicYear,
  setCurrentAcademicYear,
  getCopyPreview,
  copySettings,
  deleteAcademicYear,
  type AcademicYear,
} from '@/lib/api/academic-years';

export default function AcademicYearsPage({ params }: { params: { locale: string } }) {
    const autoT = useTranslations();
  const router = useRouter();
  const { locale } = params;
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [selectedSourceYear, setSelectedSourceYear] = useState<AcademicYear | null>(null);
  const [copyPreview, setCopyPreview] = useState<any>(null);

  // Form states
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [setAsCurrent, setSetAsCurrent] = useState(false);
  const [copyFromYear, setCopyFromYear] = useState('');
  const [copySubjects, setCopySubjects] = useState(true);
  const [copyTeachers, setCopyTeachers] = useState(true);
  const [copyClasses, setCopyClasses] = useState(true);

  useEffect(() => {
    loadAcademicYears();
  }, []);

  const loadAcademicYears = async () => {
    try {
      setLoading(true);
      const token = TokenManager.getAccessToken();
      const schoolId = TokenManager.getUserData().user.schoolId;

      if (!token || !schoolId) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      const data = await getAcademicYears(schoolId, token);
      setYears(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = TokenManager.getAccessToken();
      const schoolId = TokenManager.getUserData().user.schoolId;

      await createAcademicYear(
        schoolId,
        { name, startDate, endDate, setAsCurrent },
        token!
      );

      setShowCreateModal(false);
      setName('');
      setStartDate('');
      setEndDate('');
      setSetAsCurrent(false);
      loadAcademicYears();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSetCurrent = async (yearId: string) => {
    try {
      const token = TokenManager.getAccessToken();
      const schoolId = TokenManager.getUserData().user.schoolId;

      await setCurrentAcademicYear(schoolId, yearId, token!);
      loadAcademicYears();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleShowCopyPreview = async (year: AcademicYear) => {
    try {
      const token = TokenManager.getAccessToken();
      const schoolId = TokenManager.getUserData().user.schoolId;

      const preview = await getCopyPreview(schoolId, year.id, token!);
      setSelectedSourceYear(year);
      setCopyPreview(preview);
      setShowCopyModal(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCopySettings = async () => {
    if (!copyFromYear || !selectedSourceYear) return;

    try {
      const token = TokenManager.getAccessToken();
      const schoolId = TokenManager.getUserData().user.schoolId;

      await copySettings(
        schoolId,
        selectedSourceYear.id,
        {
          toAcademicYearId: copyFromYear,
          copySettings: {
            subjects: copySubjects,
            teachers: copyTeachers,
            classes: copyClasses,
          },
        },
        token!
      );

      setShowCopyModal(false);
      setCopyFromYear('');
      setSelectedSourceYear(null);
      setCopyPreview(null);
      alert('Settings copied successfully!');
      loadAcademicYears();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (yearId: string) => {
    if (!confirm('Are you sure you want to delete this academic year?')) return;

    try {
      const token = TokenManager.getAccessToken();
      const schoolId = TokenManager.getUserData().user.schoolId;

      await deleteAcademicYear(schoolId, yearId, token!);
      loadAcademicYears();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      PLANNING: 'bg-blue-100 text-blue-800',
      ACTIVE: 'bg-green-100 text-green-800',
      ENDED: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100',
      ARCHIVED: 'bg-purple-100 text-purple-800',
    };
    return colors[status as keyof typeof colors] || colors.PLANNING;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.academic_years_page_old.k_a8fa9e4f" /></h1>
          <p className="text-gray-600 mt-2"><AutoI18nText i18nKey="auto.web.academic_years_page_old.k_2f5870dd" /></p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <AutoI18nText i18nKey="auto.web.academic_years_page_old.k_85cae282" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Academic Years List */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                <AutoI18nText i18nKey="auto.web.academic_years_page_old.k_c194357c" />
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                <AutoI18nText i18nKey="auto.web.academic_years_page_old.k_8e50e638" />
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                <AutoI18nText i18nKey="auto.web.academic_years_page_old.k_181243fb" />
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                <AutoI18nText i18nKey="auto.web.academic_years_page_old.k_621301ba" />
              </th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">
                <AutoI18nText i18nKey="auto.web.academic_years_page_old.k_8d4c2d48" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {years.map((year) => (
              <tr key={year.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900 dark:text-white">{year.name}</div>
                  {year.copiedFromYearId && (
                    <div className="text-xs text-gray-500 mt-1">
                      <AutoI18nText i18nKey="auto.web.academic_years_page_old.k_a4ada55e" />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(year.startDate).toLocaleDateString()} -{' '}
                  {new Date(year.endDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                      year.status
                    )}`}
                  >
                    {year.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {year.isCurrent ? (
                    <span className="text-green-600 font-medium"><AutoI18nText i18nKey="auto.web.academic_years_page_old.k_af746ebb" /></span>
                  ) : (
                    <button
                      onClick={() => handleSetCurrent(year.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <AutoI18nText i18nKey="auto.web.academic_years_page_old.k_d184707e" />
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => handleShowCopyPreview(year)}
                    className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                  >
                    <AutoI18nText i18nKey="auto.web.academic_years_page_old.k_f4b98c37" />
                  </button>
                  {!year.isCurrent && (
                    <button
                      onClick={() => handleDelete(year.id)}
                      className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                    >
                      <AutoI18nText i18nKey="auto.web.academic_years_page_old.k_cf395e59" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {years.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2"><AutoI18nText i18nKey="auto.web.academic_years_page_old.k_c7530edd" /></p>
            <p className="text-sm"><AutoI18nText i18nKey="auto.web.academic_years_page_old.k_4019cd31" /></p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6"><AutoI18nText i18nKey="auto.web.academic_years_page_old.k_3a36c306" /></h2>
            <form onSubmit={handleCreateYear} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  <AutoI18nText i18nKey="auto.web.academic_years_page_old.k_77cef4f2" />
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  <AutoI18nText i18nKey="auto.web.academic_years_page_old.k_eacb5612" />
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  <AutoI18nText i18nKey="auto.web.academic_years_page_old.k_d0bd6aa1" />
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={setAsCurrent}
                  onChange={(e) => setSetAsCurrent(e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700 dark:text-gray-200"><AutoI18nText i18nKey="auto.web.academic_years_page_old.k_1aa70e7c" /></label>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50"
                >
                  <AutoI18nText i18nKey="auto.web.academic_years_page_old.k_a7ca5131" />
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <AutoI18nText i18nKey="auto.web.academic_years_page_old.k_2d203577" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Copy Settings Modal */}
      {showCopyModal && selectedSourceYear && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              <AutoI18nText i18nKey="auto.web.academic_years_page_old.k_8604584c" /> {selectedSourceYear.name}
            </h2>

            {/* Preview */}
            {copyPreview && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-3"><AutoI18nText i18nKey="auto.web.academic_years_page_old.k_69d774a4" /></h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span><AutoI18nText i18nKey="auto.web.academic_years_page_old.k_0de05ebe" /></span>
                    <span className="font-medium">{copyPreview.preview.subjects.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span><AutoI18nText i18nKey="auto.web.academic_years_page_old.k_2138b769" /></span>
                    <span className="font-medium">{copyPreview.preview.teachers.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span><AutoI18nText i18nKey="auto.web.academic_years_page_old.k_e8630f6b" /></span>
                    <span className="font-medium">{copyPreview.preview.classes.total}</span>
                  </div>
                </div>
                {copyPreview.warnings && copyPreview.warnings.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <p className="font-semibold text-yellow-700 mb-2"><AutoI18nText i18nKey="auto.web.academic_years_page_old.k_8caf17f3" /></p>
                    <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                      {copyPreview.warnings.map((warning: string, idx: number) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Target Year Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                <AutoI18nText i18nKey="auto.web.academic_years_page_old.k_2ca124fe" />
              </label>
              <select
                value={copyFromYear}
                onChange={(e) => setCopyFromYear(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">{autoT("auto.web.academic_years_page_old.k_abf2e632")}</option>
                {years
                  .filter((y) => y.id !== selectedSourceYear.id)
                  .map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Copy Options */}
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                <AutoI18nText i18nKey="auto.web.academic_years_page_old.k_83434833" />
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={copySubjects}
                  onChange={(e) => setCopySubjects(e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700 dark:text-gray-200"><AutoI18nText i18nKey="auto.web.academic_years_page_old.k_6d207d2e" /></label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={copyTeachers}
                  onChange={(e) => setCopyTeachers(e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700 dark:text-gray-200"><AutoI18nText i18nKey="auto.web.academic_years_page_old.k_a36a8094" /></label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={copyClasses}
                  onChange={(e) => setCopyClasses(e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700 dark:text-gray-200"><AutoI18nText i18nKey="auto.web.academic_years_page_old.k_032416ef" /></label>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCopyModal(false);
                  setSelectedSourceYear(null);
                  setCopyPreview(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50"
              >
                <AutoI18nText i18nKey="auto.web.academic_years_page_old.k_a7ca5131" />
              </button>
              <button
                onClick={handleCopySettings}
                disabled={!copyFromYear}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <AutoI18nText i18nKey="auto.web.academic_years_page_old.k_f4b98c37" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
