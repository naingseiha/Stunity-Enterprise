'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getSuperAdminDashboardHealth } from '@/lib/api/super-admin';
import AnimatedContent from '@/components/AnimatedContent';
import { Activity, Home, ChevronRight, CheckCircle2, Database, Loader2 } from 'lucide-react';

export default function SuperAdminHealthPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [health, setHealth] = useState<Awaited<ReturnType<typeof getSuperAdminDashboardHealth>>['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = () => {
    setLoading(true);
    setError(null);
    getSuperAdminDashboardHealth()
      .then((res) => { setHealth(res.data); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchHealth(); }, []);

  if (loading && !health) {
    return (
      <div className="flex justify-center min-h-[400px] items-center">
        <Loader2 className="w-12 h-12 text-stunity-primary-500 animate-spin" />
      </div>
    );
  }

  if (error && !health) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href={`/${locale}/super-admin`} className="hover:text-stunity-primary-600 flex items-center gap-1">
            <Home className="h-4 w-4" /> Dashboard
          </Link>
          <ChevronRight className="h-4 h-4" />
          <span className="text-gray-900 font-medium">Platform Health</span>
        </nav>
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700">{error}</div>
      </div>
    );
  }

  const data = health;
  const isHealthy = data?.status === 'healthy';

  return (
    <div className="space-y-6">
      <AnimatedContent animation="fade" delay={0}>
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href={`/${locale}/super-admin`} className="hover:text-stunity-primary-600 flex items-center gap-1">
            <Home className="h-4 w-4" /> Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">Platform Health</span>
        </nav>
      </AnimatedContent>

      <AnimatedContent animation="slide-up" delay={50}>
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-xl ${isHealthy ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            <Activity className={`h-8 w-8 ${isHealthy ? 'text-emerald-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Platform Health</h1>
            <p className="text-gray-600 mt-1">System status and database connectivity</p>
          </div>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="ml-auto px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Refresh
          </button>
        </div>
      </AnimatedContent>

      <AnimatedContent animation="slide-up" delay={100}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-lg ${isHealthy ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                <CheckCircle2 className={`h-5 w-5 ${isHealthy ? 'text-emerald-600' : 'text-amber-600'}`} />
              </div>
              <h3 className="font-semibold text-gray-900">Overall Status</h3>
            </div>
            <p className={`text-xl font-bold ${isHealthy ? 'text-emerald-600' : 'text-amber-600'}`}>
              {data?.status === 'healthy' ? 'Healthy' : 'Degraded'}
            </p>
            <p className="text-sm text-gray-500 mt-1">Last checked: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : '—'}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-blue-100">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Database</h3>
            </div>
            <p className="text-lg font-bold text-gray-900">{data?.database?.status ?? '—'}</p>
            <p className="text-sm text-gray-500 mt-1">Latency: {data?.database?.latencyMs ?? '—'} ms</p>
            <p className="text-sm text-gray-500">Schools: {data?.database?.schools ?? '—'} · Users: {data?.database?.users ?? '—'}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-gray-100">
                <Activity className="h-5 w-5 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Service</h3>
            </div>
            <p className="text-lg font-bold text-gray-900">{data?.service ?? 'school-service'}</p>
            <p className="text-sm text-gray-500 mt-1">Version: {data?.version ?? '—'}</p>
          </div>
        </div>
      </AnimatedContent>
    </div>
  );
}
