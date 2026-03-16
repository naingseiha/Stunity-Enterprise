'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LogIn, AlertCircle, Users, School, UserPlus } from 'lucide-react';
import { login, TokenManager } from '@/lib/api/auth';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || process.env.NEXT_PUBLIC_AUTH_SERVICE_URL;

export default function LoginPage(props: { params: Promise<{ locale: string }> }) {
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

  const getRedirectPath = (user: { role?: string; isSuperAdmin?: boolean }) => {
    if (user?.isSuperAdmin || user?.role === 'SUPER_ADMIN') return `/${locale}/super-admin`;
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
        router.replace(getRedirectPath(userData.user));
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
          window.location.href = getRedirectPath(data.data.user);
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
        window.location.href = getRedirectPath(response.user);
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
            <img src="/Stunity.png" alt="Stunity" className="h-12 w-auto animate-zoom-in" />
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
                className="w-full px-6 py-3.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-full text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 text-sm shadow-sm focus:shadow-md dark:focus:shadow-stunity-primary-500/10 focus:border-stunity-primary-400 dark:focus:border-stunity-primary-500 focus:bg-white dark:focus:bg-gray-800 transition-all outline-none"
                placeholder="Email or Phone Number"
                disabled={loading}
              />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-6 py-3.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-full text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 text-sm shadow-sm focus:shadow-md dark:focus:shadow-stunity-primary-500/10 focus:border-stunity-primary-400 dark:focus:border-stunity-primary-500 focus:bg-white dark:focus:bg-gray-800 transition-all outline-none"
                placeholder="Password"
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
                <span>Create Account</span>
              </Link>
            </div>
          </form>

          {/* Social Auth Gateway */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100 dark:border-gray-800" />
            </div>
            <div className="relative flex justify-center uppercase">
              <span className="bg-white dark:bg-gray-900/0 px-3 text-[10px] font-bold text-slate-300 dark:text-gray-600 tracking-[0.2em] transition-colors">Authentication Gateway</span>
            </div>
          </div>

          <div className="flex justify-center gap-4 mb-8">
            {[
              { name: 'Google', href: '/auth/social/google', icon: <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0 1 12 5.48c1.67 0 3.2.57 4.4 1.7l3.27-3.27A11.97 11.97 0 0 0 12 .96 12 12 0 0 0 1.24 6.65l4.03 3.11Z" /><path fill="#34A853" d="M16.04 18.01A7.4 7.4 0 0 1 12 19.48a7.08 7.08 0 0 1-6.73-4.28l-4.03 3.11A12 12 0 0 0 12 24c3.04 0 5.8-1.08 7.93-2.95l-3.89-3.04Z" /><path fill="#4A90D9" d="M19.93 21.05C22.08 19.12 23.5 16.2 23.5 12c0-.72-.07-1.41-.2-2.07H12v4.55h6.44c-.32 1.53-1.16 2.72-2.4 3.53l3.89 3.04Z" /><path fill="#FBBC05" d="M5.27 15.2a7.2 7.2 0 0 1 0-6.44L1.24 5.65A12.05 12.05 0 0 0 0 12c0 2.3.64 4.45 1.24 5.35l4.03-2.15Z" /></svg> },
              { name: 'Apple', href: '/auth/social/apple', icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-2.12 4.53-3.74 4.25Z" /></svg> },
              { name: 'Facebook', href: '/auth/social/facebook', icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg> },
              { name: 'LinkedIn', href: '/auth/social/linkedin', icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg> },
            ].map(({ name, href, icon }) => (
              <button
                key={name}
                type="button"
                className="w-11 h-11 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 shadow-sm hover:shadow hover:border-slate-200 dark:hover:border-gray-600 transition-all active:scale-95"
                title={`Continue with ${name}`}
                onClick={() => { window.location.href = `${AUTH_SERVICE_URL}${href}`; }}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Secondary Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Link
              href={`/${locale}/auth/parent/register`}
              className="py-4 bg-slate-50 dark:bg-gray-800/50 text-slate-500 dark:text-gray-400 border border-slate-100 dark:border-gray-800 rounded-full font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-gray-800 transition-all"
            >
              <Users className="w-4 h-4 text-stunity-primary-500 opacity-80" />
              Parent
            </Link>

            <Link
              href={`/${locale}/register-school`}
              className="py-4 bg-slate-50 dark:bg-gray-800/50 text-slate-500 dark:text-gray-400 border border-slate-100 dark:border-gray-800 rounded-full font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-gray-800 transition-all"
            >
              <School className="w-4 h-4 text-stunity-primary-500 opacity-80" />
              School
            </Link>
          </div>
        </div>

        {/* Home Link */}
        <div className="mt-8 text-center px-4">
          <Link href={`/${locale}`} className="text-[10px] font-bold text-slate-300 dark:text-gray-600 hover:text-slate-900 dark:hover:text-gray-100 uppercase tracking-[0.4em] transition-colors">{t('backToHome')}</Link>
        </div>
      </div>
    </div>
  );
}
