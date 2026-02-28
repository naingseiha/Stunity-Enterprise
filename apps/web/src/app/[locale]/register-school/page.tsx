'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { School, Loader2, CheckCircle2, ArrowLeft, Building2, User } from 'lucide-react';

const SCHOOL_SERVICE_URL = process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002';

const inputClass =
  'w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 text-sm transition-colors';

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
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200">
          <div className="container mx-auto px-4 h-14 flex items-center max-w-2xl">
            <Link
              href={`/${locale}`}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="inline-flex p-4 rounded-full bg-emerald-100 mb-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Registration submitted</h1>
            <p className="text-slate-600 text-sm leading-relaxed mb-8">
              Your school registration has been submitted for review. A platform administrator will review your application and approve it shortly. You will receive an email when your school is approved.
            </p>
            <Link
              href={`/${locale}/auth/login`}
              className="inline-flex items-center justify-center px-6 py-3 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Go to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-2xl">
          <Link href={`/${locale}`} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <img src="/Stunity.png" alt="Stunity" className="h-8 w-auto" />
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10 md:py-14">
        <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 pt-8 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600">
                <School className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Register your school</h1>
                <p className="text-slate-500 text-sm mt-0.5">Apply for a platform account</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
                {error}
              </div>
            )}

            <section className="space-y-5 mb-8">
              <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
                <Building2 className="w-4 h-4 text-slate-500" />
                School information
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">School name *</label>
                <input
                  required
                  value={form.schoolName}
                  onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g. Acme High School"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">School email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={inputClass}
                  placeholder="admin@school.edu"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className={inputClass}
                    placeholder="+855 12 345 678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">School type</label>
                  <select
                    value={form.schoolType}
                    onChange={(e) => setForm((f) => ({ ...f, schoolType: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="HIGH_SCHOOL">High School</option>
                    <option value="MIDDLE_SCHOOL">Middle School</option>
                    <option value="PRIMARY_SCHOOL">Primary School</option>
                    <option value="COMPLETE_SCHOOL">Complete School (K-12)</option>
                    <option value="INTERNATIONAL">International</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className={inputClass}
                  placeholder="Street, city, country"
                />
              </div>
            </section>

            <section className="space-y-5 mb-8 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
                <User className="w-4 h-4 text-slate-500" />
                Administrator account
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">First name *</label>
                  <input
                    required
                    value={form.adminFirstName}
                    onChange={(e) => setForm((f) => ({ ...f, adminFirstName: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Last name *</label>
                  <input
                    required
                    value={form.adminLastName}
                    onChange={(e) => setForm((f) => ({ ...f, adminLastName: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Admin email *</label>
                <input
                  type="email"
                  required
                  value={form.adminEmail}
                  onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                  className={inputClass}
                  placeholder="admin@school.edu"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.adminPassword}
                  onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
                  className={inputClass}
                  placeholder="Minimum 8 characters"
                />
              </div>
            </section>

            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Trial period</label>
              <select
                value={form.trialMonths}
                onChange={(e) => setForm((f) => ({ ...f, trialMonths: parseInt(e.target.value) }))}
                className={inputClass}
              >
                <option value={1}>1 month</option>
                <option value={3}>3 months</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Submit registration
            </button>
          </form>

          <p className="px-8 pb-8 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href={`/${locale}/auth/login`} className="text-stunity-primary-600 hover:text-stunity-primary-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
