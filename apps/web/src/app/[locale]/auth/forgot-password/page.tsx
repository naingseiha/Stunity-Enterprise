'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { forgotPassword } from '@/lib/api/auth';

import { useTranslations } from 'next-intl';
export default function ForgotPasswordPage() {
    const autoT = useTranslations();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const t = useTranslations('passwordReset');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
    } catch {
      // Always show success to prevent email enumeration
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-none dark:bg-gray-950 px-4 transition-colors duration-500">
        <div className="max-w-md w-full bg-white dark:bg-none dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('checkEmailTitle')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            {t('checkEmailBody', { email })}
          </p>
          <Link
            href={`/${locale}/auth/login`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0EA5E9] text-white rounded-xl font-medium hover:bg-[#0284C7] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-none dark:bg-gray-950 px-4 transition-colors duration-500">
      <div className="max-w-md w-full bg-white dark:bg-none dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
        <Link
          href={`/${locale}/auth/login`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200 dark:hover:text-gray-200 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToLogin')}
        </Link>

        <div className="w-16 h-16 bg-sky-100 dark:bg-sky-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-[#0EA5E9] dark:text-sky-400" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">{t('forgotTitle')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
          {t('forgotSubtitle')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('emailAddress')}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={autoT("auto.web.auth_forgot_password_page.k_5ac5dec7")}
              className="w-full px-4 py-3 bg-white dark:bg-none dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] dark:focus:ring-sky-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm transition-all"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-3 bg-[#0EA5E9] text-white rounded-xl font-medium hover:bg-[#0284C7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? t('sending') : t('sendResetLink')}
          </button>
        </form>
      </div>
    </div>
  );
}
