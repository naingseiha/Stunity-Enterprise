'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { School, Loader2, CheckCircle2 } from 'lucide-react';

const SCHOOL_SERVICE_URL = process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002';

export default function RegisterSchoolPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
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
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Registration failed');
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stunity-primary-50 via-white to-stunity-primary-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex p-4 rounded-full bg-emerald-100 mb-6">
            <CheckCircle2 className="w-16 h-16 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Registration Submitted</h1>
          <p className="text-gray-600 mb-6">
            Your school registration has been submitted for review. A platform administrator will review your application and approve it shortly. You will receive an email when your school is approved.
          </p>
          <Link
            href={`/${locale}/auth/login`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-stunity-primary-600 text-white font-medium rounded-lg hover:bg-stunity-primary-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stunity-primary-50 via-white to-stunity-primary-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-stunity-primary-100 rounded-xl">
            <School className="w-8 h-8 text-stunity-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Register Your School</h1>
            <p className="text-gray-500 text-sm">Apply for a platform account</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">School name *</label>
            <input
              required
              value={form.schoolName}
              onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500"
              placeholder="Acme High School"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">School email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500"
              placeholder="admin@school.edu"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500"
              placeholder="+855 12 345 678"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500"
              placeholder="Street, City, Country"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">School type</label>
            <select
              value={form.schoolType}
              onChange={(e) => setForm((f) => ({ ...f, schoolType: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500"
            >
              <option value="HIGH_SCHOOL">High School</option>
              <option value="MIDDLE_SCHOOL">Middle School</option>
              <option value="PRIMARY_SCHOOL">Primary School</option>
              <option value="COMPLETE_SCHOOL">Complete School (K-12)</option>
              <option value="INTERNATIONAL">International</option>
            </select>
          </div>
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">Administrator account</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">First name *</label>
                <input
                  required
                  value={form.adminFirstName}
                  onChange={(e) => setForm((f) => ({ ...f, adminFirstName: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Last name *</label>
                <input
                  required
                  value={form.adminLastName}
                  onChange={(e) => setForm((f) => ({ ...f, adminLastName: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm text-gray-600 mb-1">Admin email *</label>
              <input
                type="email"
                required
                value={form.adminEmail}
                onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500"
                placeholder="admin@school.edu"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm text-gray-600 mb-1">Password *</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.adminPassword}
                onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500"
                placeholder="Min 8 characters"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trial period</label>
            <select
              value={form.trialMonths}
              onChange={(e) => setForm((f) => ({ ...f, trialMonths: parseInt(e.target.value) }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500"
            >
              <option value={1}>1 month</option>
              <option value={3}>3 months</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-stunity-primary-600 text-white font-medium rounded-lg hover:bg-stunity-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Submit Registration
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href={`/${locale}/auth/login`} className="text-stunity-primary-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
