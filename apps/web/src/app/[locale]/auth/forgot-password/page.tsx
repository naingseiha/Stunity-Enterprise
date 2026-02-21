'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { forgotPassword } from '@/lib/api/auth';

export default function ForgotPasswordPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
          <p className="text-gray-500 mb-8">
            If an account exists for <span className="font-medium text-gray-700">{email}</span>, we&apos;ve sent password reset instructions.
          </p>
          <Link
            href={`/${locale}/auth/login`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0EA5E9] text-white rounded-xl font-medium hover:bg-[#0284C7] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <Link
          href={`/${locale}/auth/login`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>

        <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-[#0EA5E9]" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Forgot Password?</h1>
        <p className="text-gray-500 text-center mb-8">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent text-sm"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-3 bg-[#0EA5E9] text-white rounded-xl font-medium hover:bg-[#0284C7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      </div>
    </div>
  );
}
