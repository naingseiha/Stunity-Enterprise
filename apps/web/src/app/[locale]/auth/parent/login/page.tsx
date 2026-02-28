'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { 
  LogIn, 
  AlertCircle, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff,
  Users,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';

export default function ParentLoginPage({ params: { locale } }: { params: { locale: string } }) {
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Check if already logged in on component mount
  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (token) {
      const userData = TokenManager.getUserData();
      if (userData.user?.role === 'PARENT') {
        router.replace(`/${locale}/parent`);
      } else {
        router.replace(`/${locale}/dashboard`);
      }
    }
  }, [locale, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${AUTH_SERVICE_URL}/auth/parent/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });

      const result = await response.json();

      if (result.success && result.data?.tokens) {
        // Store tokens and user data
        TokenManager.setTokens(result.data.tokens.accessToken, result.data.tokens.refreshToken);
        TokenManager.setUserData(result.data.user, result.data.school);

        // Force a small delay to ensure localStorage is written before redirect
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Redirect to parent dashboard
        window.location.href = `/${locale}/parent`;
        return;
      } else {
        setError(result.error || 'Login failed. Please check your credentials.');
        setLoading(false);
      }
    } catch (err: any) {
      setError('Failed to login. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4">
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
          <div className="flex items-center justify-center gap-2 mb-2">
            <Users className="w-6 h-6 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">Parent Portal</h1>
          </div>
          <p className="text-gray-600 mt-2">Track your child's academic progress</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Parent Login</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="012345678"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Login
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <Link
              href={`/${locale}/auth/parent/register`}
              className="block text-green-600 hover:text-green-700 text-sm font-medium"
            >
              Don't have an account? Register
            </Link>
            <Link
              href={`/${locale}/auth/login`}
              className="block text-gray-500 hover:text-gray-600 text-sm"
            >
              ← Back to main login
            </Link>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs text-green-700 text-center">
            <strong>For Parents:</strong> Login with the phone number you registered during your child's enrollment.
            <br />
            <span className="text-gray-600">Need help? Contact your school administrator.</span>
          </p>
        </div>

        {/* Feature Preview */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-white/50 p-3 rounded-lg text-center">
            <div className="text-2xl mb-1">📊</div>
            <p className="text-xs text-gray-600">View Grades</p>
          </div>
          <div className="bg-white/50 p-3 rounded-lg text-center">
            <div className="text-2xl mb-1">📅</div>
            <p className="text-xs text-gray-600">Attendance</p>
          </div>
          <div className="bg-white/50 p-3 rounded-lg text-center">
            <div className="text-2xl mb-1">📝</div>
            <p className="text-xs text-gray-600">Report Cards</p>
          </div>
        </div>
      </div>
    </div>
  );
}
