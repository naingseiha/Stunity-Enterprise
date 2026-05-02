'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Upload, Camera, User, Phone, Briefcase, GraduationCap, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  createTeacher, updateTeacher, uploadTeacherPhoto, extractTeacherCustomFields,
  type Teacher, type CreateTeacherInput,
} from '@/lib/api/teachers';
import { useEducationSystem } from '@/hooks/useEducationSystem';
import type { FieldConfig, FieldSection } from '@/lib/fieldConfigs';

interface TeacherModalProps {
  teacher: Teacher | null;
  onClose: (refresh?: boolean) => void;
}

const TEACHER_SERVICE_URL = process.env.NEXT_PUBLIC_TEACHER_SERVICE_URL || 'http://localhost:3004';

const TAB_ICONS: Record<string, React.ReactNode> = {
  personal: <User className="w-4 h-4" />,
  contact: <Phone className="w-4 h-4" />,
  employment: <Briefcase className="w-4 h-4" />,
  qualifications: <GraduationCap className="w-4 h-4" />,
};

function buildEmpty(sections: FieldSection[]): Record<string, string> {
  const d: Record<string, string> = {
    firstName: '', lastName: '', englishFirstName: '', englishLastName: '',
    gender: 'MALE', dateOfBirth: '',
    phoneNumber: '', email: '', address: '',
    hireDate: new Date().toISOString().split('T')[0],
  };
  for (const sec of sections) for (const f of sec.fields) if (!(f.key in d)) d[f.key] = '';
  return d;
}

function buildFromTeacher(teacher: Teacher, sections: FieldSection[]): Record<string, string> {
  const d = buildEmpty(sections);
  d.firstName = teacher.firstName || '';
  d.lastName = teacher.lastName || '';
  d.englishFirstName = teacher.englishFirstName || '';
  d.englishLastName = teacher.englishLastName || '';
  d.gender = teacher.gender || 'MALE';
  d.dateOfBirth = teacher.dateOfBirth ? teacher.dateOfBirth.split('T')[0] : '';
  d.phoneNumber = teacher.phone || teacher.phoneNumber || '';
  d.email = teacher.email || '';
  d.address = teacher.address || '';
  d.hireDate = teacher.hireDate ? teacher.hireDate.split('T')[0] : new Date().toISOString().split('T')[0];
  const custom = extractTeacherCustomFields(teacher);
  for (const [k, v] of Object.entries(custom)) d[k] = (v as string) || '';
  return d;
}

export default function TeacherModal({ teacher, onClose }: TeacherModalProps) {
  const { fieldConfig } = useEducationSystem();
  const tDynamic = useTranslations('dynamicFields');
  const sections = fieldConfig.teacher.sections;
  const [activeTab, setActiveTab] = useState(sections[0]?.id ?? 'personal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Record<string, string>>(() => buildEmpty(sections));

  useEffect(() => {
    if (teacher) {
      setFormData(buildFromTeacher(teacher, sections));
      if (teacher.photoUrl) setPhotoPreview(`${TEACHER_SERVICE_URL}${teacher.photoUrl}`);
      else setPhotoPreview(null);
    } else {
      setFormData(buildEmpty(sections));
      setPhotoPreview(null);
    }
    setActiveTab(sections[0]?.id ?? 'personal');
    setError('');
  }, [teacher]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const input: CreateTeacherInput = {
        firstName: formData.firstName || '',
        lastName: formData.lastName || '',
        englishFirstName: formData.englishFirstName || undefined,
        englishLastName: formData.englishLastName || undefined,
        gender: (formData.gender as 'MALE' | 'FEMALE') || 'MALE',
        dateOfBirth: formData.dateOfBirth || '',
        phoneNumber: formData.phoneNumber || undefined,
        email: formData.email || undefined,
        address: formData.address || undefined,
        hireDate: formData.hireDate || new Date().toISOString().split('T')[0],
        position: formData.position || undefined,
        degree: formData.degree || undefined,
        major1: formData.major1 || undefined,
        major2: formData.major2 || undefined,
        idCard: formData.idCard || undefined,
        passport: formData.passport || undefined,
        nationality: formData.nationality || undefined,
        workingLevel: formData.workingLevel || undefined,
        salaryRange: formData.salaryRange || undefined,
        emergencyContact: formData.emergencyContact || undefined,
        emergencyPhone: formData.emergencyPhone || undefined,
      };

      let savedId: string;
      if (teacher) {
        const r = await updateTeacher(teacher.id, input);
        savedId = r.data.teacher.id;
      } else {
        const r = await createTeacher(input);
        savedId = r.data.teacher.id;
      }
      if (photoFile && savedId) await uploadTeacherPhoto(savedId, photoFile);
      onClose(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: FieldConfig) => {
    const cls = 'w-full rounded-[0.85rem] border border-slate-200 dark:border-gray-800/80 bg-white dark:bg-gray-900 py-2.5 px-3 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10 dark:placeholder:text-gray-500';
    if (field.type === 'select') {
      return (
        <select name={field.key} value={formData[field.key] ?? ''} onChange={handleChange} required={field.required} className={cls}>
          {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    if (field.type === 'textarea') {
      return <textarea name={field.key} value={formData[field.key] ?? ''} onChange={handleChange} required={field.required} placeholder={field.placeholder} rows={3} className={`${cls} resize-none`} />;
    }
    return <input type={field.type} name={field.key} value={formData[field.key] ?? ''} onChange={handleChange} required={field.required} placeholder={field.placeholder} className={cls} />;
  };

  const activeSection = sections.find(s => s.id === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-200 dark:bg-black/60">
      <div className="flex w-full max-w-3xl max-h-[92vh] flex-col overflow-hidden rounded-[1.35rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,252,0.98)_100%)] shadow-[0_40px_110px_-40px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/80 animate-in slide-in-from-bottom-4 duration-200 dark:border-gray-800/70 dark:bg-none dark:bg-gray-900/95 dark:ring-gray-800/70">

        {/* Header */}
        <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-gray-800/70">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              {teacher ? 'Update Entry' : 'New Entry'}
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{teacher ? 'Edit Teacher' : 'Add New Teacher'}</h2>
          </div>
          <button type="button" onClick={() => onClose()} className="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Photo Strip */}
        <div className="flex flex-shrink-0 items-center gap-4 border-b border-slate-200 bg-slate-50/50 px-6 py-4 dark:border-gray-800/70 dark:bg-gray-900/30">
          <div className="group relative flex-shrink-0">
            {photoPreview ? (
              <>
                <img src={photoPreview} alt="Teacher" className="h-16 w-16 rounded-[1rem] border border-slate-200 object-cover shadow-sm dark:border-gray-700" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center rounded-[1rem] bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-5 w-5 text-white" />
                </button>
              </>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-[1rem] border border-slate-200 bg-slate-100 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <Camera className="h-6 w-6 text-slate-400 dark:text-gray-500" />
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          <div>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 rounded-[0.7rem] border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-gray-800/70 dark:bg-gray-900 dark:text-gray-200">
              <Upload className="h-3.5 w-3.5" />
              {photoPreview ? 'Change Photo' : 'Upload Photo'}
            </button>
            <p className="mt-1.5 text-xs font-medium tracking-wide text-slate-400">PNG, JPG up to 5MB</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-shrink-0 overflow-x-auto border-b border-slate-200 bg-white/50 px-2 backdrop-blur-sm dark:border-gray-800/70 dark:bg-gray-900/50">
          {sections.map(s => (
            <button key={s.id} type="button" onClick={() => setActiveTab(s.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === s.id ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}>
              {TAB_ICONS[s.id] ?? null}
              {s.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-slate-50/30 px-6 py-6 dark:bg-transparent">
            {error && (
              <div className="mb-5 flex items-center gap-3 rounded-[1rem] border border-rose-100 bg-rose-50/80 px-4 py-3 text-sm font-medium text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </div>
            )}
            {activeSection && (
              <div className="grid grid-cols-2 gap-5">
                {activeSection.fields.map(field => (
                  <div key={field.key} className={field.span === 1 ? 'col-span-2' : 'col-span-2 md:col-span-1'}>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-gray-400">
                      {tDynamic(field.key as any)}{field.required && <span className="ml-1 text-rose-500">*</span>}
                    </label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-200 bg-white px-6 py-4 dark:border-gray-800/70 dark:bg-gray-900/80">
            <div className="flex gap-1.5">
              {sections.map(s => (
                <button key={s.id} type="button" onClick={() => setActiveTab(s.id)}
                  className={`h-2 w-2 rounded-full transition-colors ${activeTab === s.id ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-gray-700'}`} />
              ))}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => onClose()} className="inline-flex h-10 items-center justify-center rounded-[0.85rem] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-gray-800/70 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800/50">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 text-sm font-black uppercase tracking-[0.12em] text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {teacher ? 'Save Changes' : 'Create Teacher'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
