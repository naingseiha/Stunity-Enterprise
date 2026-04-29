'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { School, Loader2, CheckCircle2, ArrowLeft, Building2, User, Globe } from 'lucide-react';

import { useTranslations } from 'next-intl';
const SCHOOL_SERVICE_URL = process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL;

const inputClass =
  'w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 text-sm transition-colors';

export default function RegisterSchoolPage() {
    const autoT = useTranslations();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const t = useTranslations('registerSchool');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    schoolName: '',
    email: '',
    phone: '',
    address: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    schoolType: 'HIGH_SCHOOL',
    trialMonths: 3,
    educationModel: 'KHM_MOEYS',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${SCHOOL_SERVICE_URL}/schools/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName: form.schoolName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          adminFirstName: form.adminFirstName.trim(),
          adminLastName: form.adminLastName.trim(),
          adminEmail: form.adminEmail.trim(),
          adminPassword: form.adminPassword,
          schoolType: form.schoolType,
          trialMonths: form.trialMonths,
          educationModel: form.educationModel,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || t('registrationFailed'));
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || t('registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-800/50 flex flex-col">
        <header className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800">
          <div className="container mx-auto px-4 h-14 flex items-center max-w-2xl">
            <Link
              href={`/${locale}`}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-white text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('backToHome')}
            </Link>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm p-8 text-center">
            <div className="inline-flex p-4 rounded-full bg-emerald-100 mb-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('submittedTitle')}</h1>
            <p className="text-slate-600 text-sm leading-relaxed mb-8">
              {t('submittedBody')}
            </p>
            <Link
              href={`/${locale}/auth/login`}
              className="inline-flex items-center justify-center px-6 py-3 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              {t('goToLogin')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-800/50 flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-2xl">
          <Link href={`/${locale}`} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-white text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            {t('back')}
          </Link>
          <img src="/Stunity.png" alt={autoT("auto.web.locale_register_school_page.k_a6e71e13")} className="h-8 w-auto" />
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10 md:py-14">
        <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-8 pt-8 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-600">
                <School className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('title')}</h1>
                <p className="text-slate-500 text-sm mt-0.5">{t('subtitle')}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
                {error}
              </div>
            )}

            <section className="space-y-5 mb-8">
              <div className="flex items-center gap-2 text-slate-700 dark:text-gray-200 font-medium text-sm">
                <Building2 className="w-4 h-4 text-slate-500" />
                {t('schoolInformation')}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">{t('schoolName')} *</label>
                <input
                  required
                  value={form.schoolName}
                  onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
                  className={inputClass}
                  placeholder={t('schoolNamePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">{t('schoolEmail')} *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={inputClass}
                  placeholder={t('adminEmailPlaceholder')}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">{t('phone')}</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className={inputClass}
                    placeholder="+855 12 345 678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">{t('schoolType')}</label>
                  <select
                    value={form.schoolType}
                    onChange={(e) => setForm((f) => ({ ...f, schoolType: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="HIGH_SCHOOL">{t('highSchool')}</option>
                    <option value="MIDDLE_SCHOOL">{t('middleSchool')}</option>
                    <option value="PRIMARY_SCHOOL">{t('primarySchool')}</option>
                    <option value="COMPLETE_SCHOOL">{t('completeSchool')}</option>
                    <option value="INTERNATIONAL">{t('international')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">{t('address')}</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className={inputClass}
                  placeholder={t('addressPlaceholder')}
                />
              </div>
            </section>

            <section className="space-y-5 mb-8 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-700 dark:text-gray-200 font-medium text-sm">
                <Globe className="w-4 h-4 text-slate-500" />
                {t('educationSystem')}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">{t('systemModel')}</label>
                <select
                  value={form.educationModel}
                  onChange={(e) => setForm((f) => ({ ...f, educationModel: e.target.value }))}
                  className={inputClass}
                >
                  <option value="KHM_MOEYS">{t('khmMoeys')}</option>
                  <option value="EU_STANDARD">{t('euStandard')}</option>
                  <option value="INT_BACC">{t('internationalBaccalaureate')}</option>
                  <option value="CUSTOM">{t('customModel')}</option>
                </select>
                <p className="mt-2 text-xs text-slate-500 bg-slate-50 dark:bg-gray-800/50 p-3 rounded-md border border-slate-100">
                  {form.educationModel === 'KHM_MOEYS' && t('khmMoeysHelp')}
                  {form.educationModel === 'EU_STANDARD' && t('euStandardHelp')}
                  {form.educationModel === 'INT_BACC' && t('internationalBaccalaureateHelp')}
                  {form.educationModel === 'CUSTOM' && t('customModelHelp')}
                </p>
              </div>
            </section>

            <section className="space-y-5 mb-8 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-700 dark:text-gray-200 font-medium text-sm">
                <User className="w-4 h-4 text-slate-500" />
                {t('administratorAccount')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">{t('firstName')} *</label>
                  <input
                    required
                    value={form.adminFirstName}
                    onChange={(e) => setForm((f) => ({ ...f, adminFirstName: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">{t('lastName')} *</label>
                  <input
                    required
                    value={form.adminLastName}
                    onChange={(e) => setForm((f) => ({ ...f, adminLastName: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">{t('adminEmail')} *</label>
                <input
                  type="email"
                  required
                  value={form.adminEmail}
                  onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                  className={inputClass}
                  placeholder={t('adminEmailPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">{t('password')} *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.adminPassword}
                  onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
                  className={inputClass}
                  placeholder={t('passwordPlaceholder')}
                />
              </div>
            </section>

            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">{t('trialPeriod')}</label>
              <select
                value={form.trialMonths}
                onChange={(e) => setForm((f) => ({ ...f, trialMonths: parseInt(e.target.value) }))}
                className={inputClass}
              >
                <option value={1}>{t('oneMonth')}</option>
                <option value={3}>{t('threeMonths')}</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {t('submitRegistration')}
            </button>
          </form>

          <p className="px-8 pb-8 text-center text-sm text-slate-500">
            {t('alreadyHaveAccount')}{' '}
            <Link href={`/${locale}/auth/login`} className="text-stunity-primary-600 hover:text-stunity-primary-700 font-medium">
              {t('signIn')}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
