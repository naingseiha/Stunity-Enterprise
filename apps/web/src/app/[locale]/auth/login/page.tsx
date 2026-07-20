'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useState, useEffect, useRef, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LogIn, AlertCircle, School, UserPlus } from 'lucide-react';
import { login, TokenManager } from '@/lib/api/auth';
import PasswordlessAuthCard from '@/components/auth/PasswordlessAuthCard';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || process.env.NEXT_PUBLIC_AUTH_SERVICE_URL;

export default function LoginPage(props: { params: Promise<{ locale: string }> }) {
    const autoT = useTranslations();
  const params = use(props.params);
  const locale = params.locale;
  const t = useTranslations('login');
  const router = useRouter();
  const searchParams = useSearchParams();
  const ssoExchanged = useRef(false);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getRedirectPath = (
    user: { role?: string; isSuperAdmin?: boolean },
    school?: { id?: string; registrationStatus?: string | null } | null
  ) => {
    if (user?.isSuperAdmin || user?.role === 'SUPER_ADMIN') return `/${locale}/super-admin`;
    const isPendingSchoolAdmin =
      school?.registrationStatus === 'PENDING' &&
      (user?.role === 'ADMIN' || user?.role === 'STAFF');
    if (isPendingSchoolAdmin) {
      return `/${locale}/onboarding${school?.id ? `?schoolId=${school.id}` : ''}`;
    }
    switch (user?.role) {
      case 'SUPER_ADMIN':
        return `/${locale}/super-admin`;
      case 'PARENT':
        return `/${locale}/parent`;
      case 'STUDENT':
        return `/${locale}/student`;
      case 'TEACHER':
      case 'ADMIN':
      case 'STAFF':
      default:
        return `/${locale}/feed`;
    }
  };

  useEffect(() => {
    const checkAuth = () => {
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      if (token && userData.user) {
        router.replace(getRedirectPath(userData.user, userData.school));
      }
    };
    checkAuth();
  }, [locale, router]);

  useEffect(() => {
    const code = searchParams?.get('code');
    const sso = searchParams?.get('sso');
    if (!code || sso !== 'success' || ssoExchanged.current) return;
    ssoExchanged.current = true;
    setLoading(true);
    setError('');
    fetch(`${AUTH_SERVICE_URL}/auth/sso/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.tokens && data.data?.user) {
          TokenManager.setTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
          TokenManager.setUserData(data.data.user, data.data.school);
          window.location.href = getRedirectPath(data.data.user, data.data.school);
        } else {
          setError(data.error || 'SSO login failed');
          setLoading(false);
          router.replace(`/${locale}/auth/login`);
        }
      })
      .catch((err) => {
        setError(err.message || 'SSO login failed');
        setLoading(false);
        router.replace(`/${locale}/auth/login`);
      });
  }, [locale, router, searchParams]);

  if (
    process.env.NEXT_PUBLIC_PASSWORDLESS_AUTH_ENABLED === 'true' &&
    searchParams?.get('method') !== 'password'
  ) {
    return <PasswordlessAuthCard locale={locale} redirectForUser={getRedirectPath} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const id = identifier.trim();
      if (!id || !password) {
        setError('Please enter your email or phone and password');
        setLoading(false);
        return;
      }
      const isEmail = id.includes('@');
      const credentials = isEmail ? { email: id, password } : { phone: id, password };
      const response = await login(credentials);
      if (response.success && response.tokens && response.user) {
        TokenManager.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
        TokenManager.setUserData(response.user, response.school);
        await new Promise((resolve) => setTimeout(resolve, 200));
        window.location.href = getRedirectPath(response.user, response.school as any);
        return;
      }
      setError(response.message || t('error'));
    } catch (err: any) {
      setError(err?.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex items-center justify-center p-6 bg-slate-50 dark:bg-gray-950 selection:bg-stunity-primary-100 dark:selection:bg-stunity-primary-900/30 selection:text-stunity-primary-900 dark:selection:text-stunity-primary-100 font-sans transition-colors duration-500">
      <div className="w-full max-w-[420px] animate-fade-in relative z-10">

        {/* Floating Card: Shadow + Professional Border Radius */}
        <div className="bg-white dark:bg-gray-900/80 p-8 sm:p-10 border border-slate-100 dark:border-gray-800 rounded-3xl shadow-2xl shadow-slate-200/80 dark:shadow-none backdrop-blur-xl transition-all duration-500">

          {/* Prominent Internal Logo */}
          <div className="flex justify-center mb-6">
            <img src="/Stunity.png" alt={autoT("auto.web.locale_auth_login_page.k_2be2efce")} className="h-12 w-auto animate-zoom-in" />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">{t('title')}</h1>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-full text-[12px] font-semibold text-center border border-red-100 dark:border-red-500/20 shadow-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              {/* Floating Pill Inputs */}
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="w-full px-6 py-3.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-full text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 text-sm shadow-sm focus:shadow-md dark:focus:shadow-stunity-primary-500/10 focus:border-stunity-primary-400 dark:focus:border-stunity-primary-500 focus:bg-white dark:bg-gray-900 dark:focus:bg-gray-800 transition-all outline-none"
                placeholder={autoT("auto.web.locale_auth_login_page.k_a9fc74b1")}
                disabled={loading}
              />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-6 py-3.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-full text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 text-sm shadow-sm focus:shadow-md dark:focus:shadow-stunity-primary-500/10 focus:border-stunity-primary-400 dark:focus:border-stunity-primary-500 focus:bg-white dark:bg-gray-900 dark:focus:bg-gray-800 transition-all outline-none"
                placeholder={autoT("auto.web.locale_auth_login_page.k_2ce350cf")}
                disabled={loading}
              />
            </div>

            <div className="flex justify-center mt-2">
              <Link href={`/${locale}/auth/forgot-password`} className="text-[10px] font-bold text-slate-300 dark:text-gray-500 hover:text-stunity-primary-600 dark:hover:text-stunity-primary-400 uppercase tracking-widest transition-colors">{t('password')}</Link>
            </div>

            {/* Stacked Primary Action Buttons - Brand Aligned Orange */}
            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-stunity-primary-600 text-white rounded-full font-bold shadow-md hover:shadow-lg hover:bg-stunity-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm active:scale-[0.98] border border-stunity-primary-500"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? t('submitting') : t('submit')}</span>
              </button>

              <Link
                href={`/${locale}/auth/choose-role`}
                className="w-full py-4 bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 rounded-full font-bold shadow-sm hover:shadow-md hover:bg-slate-200 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.98] border border-slate-200 dark:border-gray-700"
              >
                <UserPlus className="w-4 h-4 text-stunity-primary-600 dark:text-stunity-primary-400" />
                <span><AutoI18nText i18nKey="auto.web.locale_auth_login_page.k_7404d1f9" /></span>
              </Link>
            </div>
          </form>

          {/* Secondary Action Buttons */}
          <div className="grid grid-cols-1 gap-4">
            <Link
              href={`/${locale}/register-school`}
              className="py-4 bg-slate-50 dark:bg-gray-800/50 text-slate-500 dark:text-gray-400 border border-slate-100 dark:border-gray-800 rounded-full font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100 dark:bg-gray-800 dark:hover:bg-gray-800 transition-all"
            >
              <School className="w-4 h-4 text-stunity-primary-500 opacity-80" />
              <AutoI18nText i18nKey="auto.web.locale_auth_login_page.k_8f50875b" />
            </Link>
          </div>
        </div>

        {/* Home Link */}
        <div className="mt-8 text-center px-4">
          <Link href={`/${locale}`} className="text-[10px] font-bold text-slate-300 dark:text-gray-600 hover:text-slate-900 dark:text-white dark:hover:text-gray-100 uppercase tracking-[0.4em] transition-colors">{t('backToHome')}</Link>
        </div>
      </div>
    </div>
  );
}
