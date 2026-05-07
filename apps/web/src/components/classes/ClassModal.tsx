'use client';

import { useTranslations } from 'next-intl';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, GraduationCap, School, Sparkles, UserCheck, Users, X } from 'lucide-react';
import { createClass, updateClass, type Class, type CreateClassInput } from '@/lib/api/classes';
import { getTeachers, type Teacher } from '@/lib/api/teachers';

interface ClassModalProps {
  classItem: Class | null;
  defaultAcademicYearId?: string | null;
  academicYearLabel?: string | null;
  onClose: (refresh?: boolean) => void;
}

const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function getInitialFormData(defaultAcademicYearId?: string | null): CreateClassInput {
  return {
    name: '',
    grade: 7,
    section: '',
    track: '',
    academicYearId: defaultAcademicYearId || '',
    capacity: undefined,
    room: '',
    homeroomTeacherId: null,
  };
}

function formatTeacherName(teacher?: Teacher | Class['homeroomTeacher'] | null) {
  if (!teacher) return 'Not assigned';

  const nativeName = [teacher.lastName, teacher.firstName].filter(Boolean).join(' ').trim();
  const englishName = [teacher.englishFirstName, teacher.englishLastName].filter(Boolean).join(' ').trim();
  const latinName = [
    'firstNameLatin' in teacher ? teacher.firstNameLatin : '',
    'lastNameLatin' in teacher ? teacher.lastNameLatin : '',
  ].filter(Boolean).join(' ').trim();

  return nativeName || englishName || latinName || 'Unnamed teacher';
}

export default function ClassModal({
  classItem,
  defaultAcademicYearId,
  academicYearLabel,
  onClose,
}: ClassModalProps) {
    const autoT = useTranslations();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<CreateClassInput>(getInitialFormData(defaultAcademicYearId));
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teachersError, setTeachersError] = useState('');

  useEffect(() => {
    if (classItem) {
      setFormData({
        name: classItem.name,
        grade: classItem.grade,
        section: classItem.section || '',
        track: classItem.track || '',
        academicYearId: classItem.academicYearId || defaultAcademicYearId || '',
        capacity: classItem.capacity || undefined,
        room: classItem.room || '',
        homeroomTeacherId: classItem.homeroomTeacherId || classItem.homeroomTeacher?.id || null,
      });
      return;
    }

    setFormData(getInitialFormData(defaultAcademicYearId));
  }, [classItem, defaultAcademicYearId]);

  useEffect(() => {
    if (!defaultAcademicYearId) return;

    setFormData((previous) => {
      if (previous.academicYearId) return previous;
      return {
        ...previous,
        academicYearId: defaultAcademicYearId,
      };
    });
  }, [defaultAcademicYearId]);

  useEffect(() => {
    let mounted = true;

    const loadTeachers = async () => {
      setTeachersLoading(true);
      setTeachersError('');

      try {
        const response = await getTeachers({ limit: 500 });
        if (!mounted) return;
        setTeachers(response.data.teachers);
      } catch (loadError: any) {
        if (!mounted) return;
        setTeachersError(loadError.message || 'Unable to load teachers');
      } finally {
        if (mounted) setTeachersLoading(false);
      }
    };

    void loadTeachers();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedTeacher = useMemo(
    () => {
      if (!formData.homeroomTeacherId) return null;
      return (
        teachers.find((teacher) => teacher.id === formData.homeroomTeacherId) ||
        (classItem?.homeroomTeacher?.id === formData.homeroomTeacherId ? classItem.homeroomTeacher : null)
      );
    },
    [classItem?.homeroomTeacher, formData.homeroomTeacherId, teachers]
  );

  const summaryItems = useMemo(
    () => [
      { label: 'Academic year', value: academicYearLabel || 'Not selected', icon: School },
      { label: 'Grade', value: `Grade ${formData.grade}`, icon: GraduationCap },
      { label: 'Capacity', value: formData.capacity ? `${formData.capacity} seats` : 'Open', icon: Users },
      { label: 'Class teacher', value: formatTeacherName(selectedTeacher), icon: UserCheck },
    ],
    [academicYearLabel, formData.capacity, formData.grade, selectedTeacher]
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        name === 'grade' || name === 'capacity'
          ? value
            ? parseInt(value, 10)
            : undefined
          : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!formData.academicYearId) {
      setError('Select an academic year before creating a class.');
      return;
    }

    setLoading(true);

    try {
      const payload: CreateClassInput = {
        ...formData,
        homeroomTeacherId: formData.homeroomTeacherId || null,
      };

      if (classItem) {
        await updateClass(classItem.id, payload);
      } else {
        await createClass(payload);
      }

      onClose(true);
    } catch (submitError: any) {
      setError(submitError.message || 'Unable to save class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-sm animate-in fade-in duration-200 sm:p-4">
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[1.4rem] border border-white/70 bg-white/95 shadow-[0_35px_90px_-35px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/80 animate-in slide-in-from-bottom-4 duration-200 dark:border-gray-800/70 dark:bg-gray-900/95 dark:ring-gray-800/70 sm:max-h-[calc(100dvh-2rem)]">
        <div className="shrink-0 border-b border-slate-200/70 px-6 py-5 dark:border-gray-800/70 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                <Sparkles className="h-3.5 w-3.5" />
                <AutoI18nText i18nKey="auto.web.components_classes_ClassModal.k_d8100ee7" />
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {classItem ? 'Edit Class' : 'Create Class'}
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                {classItem
                  ? 'Update the class setup, room details, and seating capacity.'
                  : 'Create a class inside the current academic year and keep the roster organized.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onClose()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-slate-200/70 bg-white text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-7">
            <div className="space-y-6 pb-4">
            {error ? (
              <div className="rounded-[1rem] border border-rose-100 bg-rose-50/85 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryItems.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-[1rem] border border-slate-200/70 bg-slate-50/85 p-4 dark:border-gray-800/70 dark:bg-gray-950/70"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-[0.85rem] bg-emerald-100 p-2.5 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">{label}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-[1.15rem] border border-slate-200/70 bg-white p-5 dark:border-gray-800/70 dark:bg-gray-950/50">
              <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500"><AutoI18nText i18nKey="auto.web.components_classes_ClassModal.k_3f2de8f9" /></h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-gray-300"><AutoI18nText i18nKey="auto.web.components_classes_ClassModal.k_e4044e0c" /></span>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="7A"
                    className="w-full rounded-[0.95rem] border border-slate-200/80 bg-slate-50/85 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-gray-300"><AutoI18nText i18nKey="auto.web.components_classes_ClassModal.k_a35c1f63" /></span>
                  <select
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    required
                    className="w-full rounded-[0.95rem] border border-slate-200/80 bg-slate-50/85 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white"
                  >
                    {GRADE_OPTIONS.map((grade) => (
                      <option key={grade} value={grade}>
                        {autoT("auto.web.shared.dynamic.gradePrefix")} {grade}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-gray-300"><AutoI18nText i18nKey="auto.web.components_classes_ClassModal.k_8f3c8675" /></span>
                  <input
                    type="text"
                    name="section"
                    value={formData.section}
                    onChange={handleChange}
                    placeholder="A"
                    className="w-full rounded-[0.95rem] border border-slate-200/80 bg-slate-50/85 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-gray-300"><AutoI18nText i18nKey="auto.web.components_classes_ClassModal.k_31586722" /></span>
                  <select
                    name="track"
                    value={formData.track}
                    onChange={handleChange}
                    className="w-full rounded-[0.95rem] border border-slate-200/80 bg-slate-50/85 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white"
                  >
                    <option value="">{autoT("auto.web.components_classes_ClassModal.k_ab467ce8")}</option>
                    <option value="SCIENCE">{autoT("auto.web.components_classes_ClassModal.k_a7e78013")}</option>
                    <option value="SOCIAL">{autoT("auto.web.components_classes_ClassModal.k_e81aa70a")}</option>
                    <option value="GENERAL">{autoT("auto.web.components_classes_ClassModal.k_ab467ce8")}</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="rounded-[1.15rem] border border-slate-200/70 bg-white p-5 dark:border-gray-800/70 dark:bg-gray-950/50">
              <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Homeroom Teacher</h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-gray-300">
                    គ្រូប្រចាំថ្នាក់ • Class teacher
                  </span>
                  <select
                    name="homeroomTeacherId"
                    value={formData.homeroomTeacherId || ''}
                    onChange={handleChange}
                    disabled={teachersLoading}
                    className="w-full rounded-[0.95rem] border border-slate-200/80 bg-slate-50/85 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white"
                  >
                    <option value="">
                      {teachersLoading ? 'Loading teachers...' : 'Not assigned'}
                    </option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {formatTeacherName(teacher)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {teachersError ? (
                <div className="mt-3 rounded-[0.9rem] border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                  {teachersError}
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.15rem] border border-slate-200/70 bg-white p-5 dark:border-gray-800/70 dark:bg-gray-950/50">
              <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500"><AutoI18nText i18nKey="auto.web.components_classes_ClassModal.k_e5affdcf" /></h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-gray-300"><AutoI18nText i18nKey="auto.web.components_classes_ClassModal.k_a219b578" /></span>
                  <input
                    type="text"
                    name="room"
                    value={formData.room}
                    onChange={handleChange}
                    placeholder="101"
                    className="w-full rounded-[0.95rem] border border-slate-200/80 bg-slate-50/85 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-gray-300"><AutoI18nText i18nKey="auto.web.components_classes_ClassModal.k_47eb3d5f" /></span>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity || ''}
                    onChange={handleChange}
                    min="1"
                    placeholder="40"
                    className="w-full rounded-[0.95rem] border border-slate-200/80 bg-slate-50/85 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-[1rem] border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm font-medium text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
              <AutoI18nText i18nKey="auto.web.components_classes_ClassModal.k_a38444aa" />
            </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200/70 bg-white/95 px-6 py-4 dark:border-gray-800/70 dark:bg-gray-900/95 sm:px-7">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => onClose()}
              className="inline-flex items-center justify-center rounded-[0.95rem] border border-slate-200/70 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
            >
              <AutoI18nText i18nKey="auto.web.components_classes_ClassModal.k_4c3bddc8" />
            </button>
            <button
              type="submit"
              disabled={loading || !formData.academicYearId}
              className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" /> : null}
              {classItem ? 'Update Class' : 'Create Class'}
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
