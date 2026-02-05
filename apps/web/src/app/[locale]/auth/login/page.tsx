'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LogIn, AlertCircle, Mail, Phone, Users } from 'lucide-react';
import { login, TokenManager } from '@/lib/api/auth';

export default function LoginPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('login');
  const tc = useTranslations('common');
  const router = useRouter();

  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Role-based redirect helper
  const getRedirectPath = (role: string) => {
    switch (role) {
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
        // Already logged in, redirect based on role
        const redirectPath = getRedirectPath(userData.user.role);
        router.replace(redirectPath);
      }
    };
    
    checkAuth();
  }, [locale, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      
      if (loginMethod === 'phone') {
        // Phone login (for parents and users with phone auth)
        const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';
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
          const redirectPath = getRedirectPath(response.data.user.role);
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
          const redirectPath = getRedirectPath(response.user.role);
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
              src="/logo.png" 
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-transparent transition-all"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-transparent transition-all"
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

          <div className="mt-6 pt-6 border-t border-gray-100">
            <Link
              href={`/${locale}/auth/parent/register`}
              className="flex items-center justify-center gap-2 w-full py-3 border-2 border-green-500 text-green-600 rounded-lg font-medium hover:bg-green-50 transition-colors"
            >
              <Users className="w-5 h-5" />
              Parent? Register here
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
