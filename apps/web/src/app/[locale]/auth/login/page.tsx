'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LogIn, AlertCircle, Mail, Phone, Users } from 'lucide-react';
import { login, TokenManager } from '@/lib/api/auth';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';

export default function LoginPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('login');
  const tc = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const ssoExchanged = useRef(false);

  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Role-based redirect helper (super admins go to super-admin dashboard)
  const getRedirectPath = (user: { role?: string; isSuperAdmin?: boolean }) => {
    if (user?.isSuperAdmin) return `/${locale}/super-admin`;
    switch (user?.role) {
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

  // Check if already logged in on component mount
  useEffect(() => {
    const checkAuth = () => {
      const token = TokenManager.getAccessToken();
      const userData = TokenManager.getUserData();
      
      if (token && userData.user) {
        const redirectPath = getRedirectPath(userData.user);
        router.replace(redirectPath);
      }
    };
    
    checkAuth();
  }, [locale, router]);

  // SSO code exchange: ?code=...&sso=success -> POST /auth/sso/exchange, store tokens, redirect (no tokens in URL)
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
          const redirectPath = getRedirectPath(data.data.user);
          window.location.href = redirectPath;
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
      let response;
      
      if (loginMethod === 'phone') {
        // Phone login (for parents and users with phone auth)
        const res = await fetch(`${AUTH_SERVICE_URL}/auth/parent/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password }),
        });
        response = await res.json();
        
        if (response.success && response.data) {
          // Store tokens
          TokenManager.setTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
          TokenManager.setUserData(response.data.user, response.data.school);
          
          await new Promise(resolve => setTimeout(resolve, 200));
          const redirectPath = getRedirectPath(response.data.user);
          window.location.href = redirectPath;
          return;
        } else {
          setError(response.error || response.message || 'Login failed');
          setLoading(false);
        }
      } else {
        // Email login (traditional)
        response = await login({ email, password });

        if (response.success && response.tokens && response.user) {
          TokenManager.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
          TokenManager.setUserData(response.user, response.school);

          await new Promise(resolve => setTimeout(resolve, 200));
          const redirectPath = getRedirectPath(response.user);
          window.location.href = redirectPath;
          return;
        } else {
          setError(response.message || t('error'));
          setLoading(false);
        }
      }
    } catch (err: any) {
      setError(err.message || t('error'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stunity-primary-50 via-white to-stunity-primary-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src="/Stunity.png" 
              alt="Stunity Enterprise" 
              className="h-20 w-auto"
            />
          </div>
          <p className="text-gray-600 mt-2">{t('subtitle')}</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('title')}</h2>
          <p className="text-gray-500 text-sm mb-6">Teachers, Students, Parents, Staff - All login here</p>

          {/* Login Method Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => setLoginMethod('email')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                loginMethod === 'email'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('phone')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                loginMethod === 'phone'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Phone className="w-4 h-4" />
              Phone
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {loginMethod === 'email' ? (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('email')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 transition-colors"
                  placeholder="you@school.edu"
                  disabled={loading}
                />
              </div>
            ) : (
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 transition-colors"
                  placeholder="012345678"
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 transition-colors"
                placeholder="••••••••"
                disabled={loading}
              />
              <div className="mt-1 text-right">
                <Link href={`/${locale}/auth/forgot-password`} className="text-xs text-[#0EA5E9] hover:text-[#0284C7] font-medium">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-stunity-primary-600 text-white rounded-lg font-semibold hover:bg-stunity-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('submitting')}
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  {t('submit')}
                </>
              )}
            </button>
          </form>

          {/* Social Login Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400 uppercase tracking-wide">or continue with</span>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="flex justify-center gap-4">
            <button
              type="button"
              className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Sign in with Google"
              onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001'}/auth/social/google`}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0 1 12 5.48c1.67 0 3.2.57 4.4 1.7l3.27-3.27A11.97 11.97 0 0 0 12 .96 12 12 0 0 0 1.24 6.65l4.03 3.11Z" />
                <path fill="#34A853" d="M16.04 18.01A7.4 7.4 0 0 1 12 19.48a7.08 7.08 0 0 1-6.73-4.28l-4.03 3.11A12 12 0 0 0 12 24c3.04 0 5.8-1.08 7.93-2.95l-3.89-3.04Z" />
                <path fill="#4A90D9" d="M19.93 21.05C22.08 19.12 23.5 16.2 23.5 12c0-.72-.07-1.41-.2-2.07H12v4.55h6.44c-.32 1.53-1.16 2.72-2.4 3.53l3.89 3.04Z" />
                <path fill="#FBBC05" d="M5.27 15.2a7.2 7.2 0 0 1 0-6.44L1.24 5.65A12.05 12.05 0 0 0 0 12c0 2.3.64 4.45 1.24 5.35l4.03-2.15Z" />
              </svg>
            </button>
            <button
              type="button"
              className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Sign in with Apple"
              onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001'}/auth/social/apple`}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-2.12 4.53-3.74 4.25Z" />
              </svg>
            </button>
            <button
              type="button"
              className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Sign in with Facebook"
              onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001'}/auth/social/facebook`}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </button>
            <button
              type="button"
              className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Sign in with LinkedIn"
              onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001'}/auth/social/linkedin`}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0A66C2">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
            <Link
              href={`/${locale}/auth/parent/register`}
              className="flex items-center justify-center gap-2 w-full py-3 border-2 border-green-500 text-green-600 rounded-lg font-medium hover:bg-green-50 transition-colors"
            >
              <Users className="w-5 h-5" />
              Parent? Register here
            </Link>
            <Link
              href={`/${locale}/register-school`}
              className="flex items-center justify-center gap-2 w-full py-3 border-2 border-stunity-primary-500 text-stunity-primary-600 rounded-lg font-medium hover:bg-stunity-primary-50 transition-colors"
            >
              Register your school
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link
              href={`/${locale}`}
              className="text-stunity-primary-600 hover:text-stunity-primary-700 text-sm font-medium"
            >
              {t('backToHome')}
            </Link>
          </div>
        </div>

        {/* Test Credentials */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-600">
          <p className="font-semibold mb-2 text-center">Test Accounts:</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="font-medium">👨‍💼 Admin (Email)</p>
              <p>john.doe@testhighschool.edu</p>
              <p>SecurePass123!</p>
            </div>
            <div>
              <p className="font-medium">👨‍👩‍👧 Parent (Phone)</p>
              <p>012345678</p>
              <p>TestParent123!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
