'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { KeyRound, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { resetPassword } from '@/lib/api/auth';

export default function ResetPasswordPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'en';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const passwordChecks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', pass: /[a-z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
    { label: 'Special character', pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const allValid = passwordChecks.every((c) => c.pass) && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) return;
    setError('');
    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-500 mb-8">This password reset link is invalid or has expired.</p>
          <Link
            href={`/${locale}/auth/forgot-password`}
            className="inline-flex px-6 py-3 bg-[#0EA5E9] text-white rounded-xl font-medium hover:bg-[#0284C7] transition-colors"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Reset!</h1>
          <p className="text-gray-500 mb-8">Your password has been updated. You can now log in.</p>
          <Link
            href={`/${locale}/auth/login`}
            className="inline-flex px-6 py-3 bg-[#0EA5E9] text-white rounded-xl font-medium hover:bg-[#0284C7] transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <KeyRound className="w-8 h-8 text-[#0EA5E9]" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">New Password</h1>
        <p className="text-gray-500 text-center mb-6">Create a strong password for your account.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent text-sm pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent text-sm"
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
            )}
          </div>

          {/* Password strength indicators */}
          {password && (
            <div className="grid grid-cols-2 gap-1">
              {passwordChecks.map((check) => (
                <div key={check.label} className="flex items-center gap-1.5 text-xs">
                  <div className={`w-3 h-3 rounded-full ${check.pass ? 'bg-green-500' : 'bg-gray-200'}`} />
                  <span className={check.pass ? 'text-green-700' : 'text-gray-400'}>{check.label}</span>
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !allValid}
            className="w-full py-3 bg-[#0EA5E9] text-white rounded-xl font-medium hover:bg-[#0284C7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
