'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LogIn, AlertCircle, GraduationCap } from 'lucide-react';
import { login, TokenManager } from '@/lib/api/auth';

export default function LoginPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('login');
  const tc = useTranslations('common');
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if already logged in on component mount
  useEffect(() => {
    const checkAuth = () => {
      const token = TokenManager.getAccessToken();
      const user = TokenManager.getUserData();
      
      if (token && user.user) {
        // Already logged in, redirect to dashboard
        router.replace(`/${locale}/dashboard`);
      }
    };
    
    checkAuth();
  }, [locale, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login({ email, password });

      if (response.success && response.tokens) {
        // Store tokens and user data
        TokenManager.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
        TokenManager.setUserData(response.user, response.school);

        // Use router.push instead of window.location to let middleware handle it
        router.push(`/${locale}/dashboard`);
        // Force a small delay to ensure localStorage is written
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        setError(response.message || t('error'));
      }
    } catch (err: any) {
      setError(err.message || t('error'));
    } finally {
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
              src="/logo.png" 
              alt="Stunity Enterprise" 
              className="h-20 w-auto"
            />
          </div>
          <p className="text-gray-600 mt-2">{t('subtitle')}</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('title')}</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-transparent transition-all"
                placeholder="admin@school.edu"
                disabled={loading}
              />
            </div>

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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                disabled={loading}
              />
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

          <div className="mt-6 text-center">
            <Link
              href={`/${locale}`}
              className="text-stunity-primary-600 hover:text-stunity-primary-700 text-sm font-medium"
            >
              {t('backToHome')}
            </Link>
          </div>
        </div>

        {/* Test Credentials */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            <strong>Test School 1:</strong> john.doe@testhighschool.edu / SecurePass123!
            <br />
            <strong>Test School 2:</strong> jane.smith@riversideacademy.edu / SuperSecure456!
          </p>
        </div>
      </div>
    </div>
  );
}
