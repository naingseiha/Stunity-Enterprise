'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getSuperAdminDashboardStats,
  approveSuperAdminSchool,
  rejectSuperAdminSchool,
  SuperAdminStats,
} from '@/lib/api/super-admin';
import AnimatedContent from '@/components/AnimatedContent';
import {
  School,
  Users,
  GraduationCap,
  CheckCircle2,
  ChevronRight,
  Home,
  LayoutDashboard,
  ExternalLink,
  TrendingUp,
  UserCheck,
  AlertCircle,
  Calendar,
  BookOpen,
  UserPlus,
  Loader2,
  XCircle,
  CheckCircle,
  CreditCard,
} from 'lucide-react';

const TIER_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  FREE_TRIAL_1M: { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-400' },
  FREE_TRIAL_3M: { bg: 'bg-orange-100', text: 'text-orange-700', bar: 'bg-orange-400' },
  BASIC: { bg: 'bg-slate-100', text: 'text-slate-700', bar: 'bg-slate-400' },
  STANDARD: { bg: 'bg-blue-100', text: 'text-blue-700', bar: 'bg-blue-400' },
  PREMIUM: { bg: 'bg-indigo-100', text: 'text-indigo-700', bar: 'bg-indigo-500' },
  ENTERPRISE: { bg: 'bg-violet-100', text: 'text-violet-700', bar: 'bg-violet-500' },
};

const TIER_LABELS: Record<string, string> = {
  FREE_TRIAL_1M: '1M Trial',
  FREE_TRIAL_3M: '3M Trial',
  BASIC: 'Basic',
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
  ENTERPRISE: 'Enterprise',
};

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  badge,
  badgeColor,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  badge?: string | number;
  badgeColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        {badge !== undefined && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor ?? 'bg-gray-100 text-gray-600'}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-700 mt-0.5">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

export default function SuperAdminDashboardPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchStats = () =>
    getSuperAdminDashboardStats()
      .then((res) => { setStats(res.data); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => { fetchStats(); }, []);

  const handleApprove = async (schoolId: string) => {
    setApprovingId(schoolId);
    try {
      await approveSuperAdminSchool(schoolId);
      await fetchStats();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (schoolId: string, schoolName: string) => {
    if (!confirm(`Reject registration for "${schoolName}"?`)) return;
    setApprovingId(schoolId);
    try {
      await rejectSuperAdminSchool(schoolId);
      await fetchStats();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setApprovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-stunity-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700">
        <p className="font-medium">Failed to load dashboard</p>
        <p className="mt-1 text-sm opacity-90">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const totalSchools = stats.totalSchools || 0;
  const tierBreakdown = stats.schoolsByTier ?? [];
  const maxTierCount = Math.max(1, ...tierBreakdown.map((t) => t.count));

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <AnimatedContent animation="fade" delay={0}>
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Home className="h-4 w-4" />
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">Dashboard</span>
        </nav>
      </AnimatedContent>

      {/* Header */}
      <AnimatedContent animation="slide-up" delay={50}>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-stunity-primary-100 rounded-xl">
            <LayoutDashboard className="h-6 w-6 text-stunity-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Platform Dashboard</h1>
            <p className="text-gray-500 mt-0.5 text-sm">Enterprise management overview</p>
          </div>
        </div>
      </AnimatedContent>

      {/* Pending approvals banner */}
      {stats.pendingApprovals > 0 && (
        <AnimatedContent animation="slide-up" delay={80}>
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm font-medium text-amber-800 flex-1">
              {stats.pendingApprovals} school registration{stats.pendingApprovals > 1 ? 's' : ''} awaiting approval
            </p>
            <Link
              href={`/${locale}/super-admin/schools?status=pending`}
              className="text-sm font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1"
            >
              Review <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </AnimatedContent>
      )}

      {/* KPI Grid – Row 1: Core scale */}
      <AnimatedContent animation="slide-up" delay={100}>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard
            title="Total Schools"
            value={stats.totalSchools}
            subtitle={`${stats.activeSchools} active`}
            icon={School}
            color="bg-blue-100 text-blue-600"
            badge={stats.newSchoolsThisWeek > 0 ? `+${stats.newSchoolsThisWeek} this week` : undefined}
            badgeColor="bg-emerald-100 text-emerald-700"
          />
          <KpiCard
            title="Active Schools"
            value={stats.activeSchools}
            subtitle={`${totalSchools > 0 ? Math.round((stats.activeSchools / totalSchools) * 100) : 0}% of total`}
            icon={CheckCircle2}
            color="bg-emerald-100 text-emerald-600"
          />
          <KpiCard
            title="Pending Approval"
            value={stats.pendingApprovals}
            subtitle="Awaiting review"
            icon={AlertCircle}
            color={stats.pendingApprovals > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}
          />
          <KpiCard
            title="Total Users"
            value={stats.totalUsers}
            subtitle={`+${stats.newUsersThisWeek ?? 0} this week`}
            icon={Users}
            color="bg-purple-100 text-purple-600"
          />
          <KpiCard
            title="Students"
            value={stats.totalStudents ?? 0}
            subtitle="Platform-wide"
            icon={GraduationCap}
            color="bg-cyan-100 text-cyan-600"
          />
          <KpiCard
            title="Teachers"
            value={stats.totalTeachers ?? 0}
            subtitle="Platform-wide"
            icon={UserCheck}
            color="bg-rose-100 text-rose-600"
          />
        </div>
      </AnimatedContent>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Subscription Tier Breakdown */}
          {tierBreakdown.length > 0 && (
            <AnimatedContent animation="slide-up" delay={200}>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-900">Schools by Plan</h2>
                </div>
                <div className="p-5 space-y-3">
                  {tierBreakdown.map((t) => {
                    const cfg = TIER_COLORS[t.tier] ?? { bg: 'bg-gray-100', text: 'text-gray-700', bar: 'bg-gray-400' };
                    const pct = Math.round((t.count / maxTierCount) * 100);
                    return (
                      <div key={t.tier}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
                            {TIER_LABELS[t.tier] ?? t.tier.replace(/_/g, ' ')}
                          </span>
                          <span className="text-sm font-bold text-gray-900">{t.count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </AnimatedContent>
          )}

          {/* Quick Actions */}
          <AnimatedContent animation="slide-up" delay={250}>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Quick Actions</h2>
              </div>
              <div className="p-3 space-y-1">
                {[
                  { href: `/${locale}/super-admin/schools`, label: 'Manage Schools', icon: School, color: 'text-blue-600' },
                  { href: `/${locale}/super-admin/users`, label: 'Platform Users', icon: Users, color: 'text-purple-600' },
                  { href: `/${locale}/super-admin/analytics`, label: 'Analytics & Reports', icon: TrendingUp, color: 'text-cyan-600' },
                  { href: `/${locale}/super-admin/settings`, label: 'Platform Settings', icon: BookOpen, color: 'text-gray-600' },
                ].map(({ href, label, icon: Icon, color }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex-1">{label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                  </Link>
                ))}
              </div>
            </div>
          </AnimatedContent>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Approvals */}
          {(stats.pendingSchools ?? []).length > 0 && (
            <AnimatedContent animation="slide-up" delay={300}>
              <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between bg-amber-50">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <h2 className="text-sm font-semibold text-amber-900">Pending Registrations</h2>
                  </div>
                  <Link
                    href={`/${locale}/super-admin/schools?status=pending`}
                    className="text-xs font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1"
                  >
                    View all <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <div className="divide-y divide-gray-100">
                  {(stats.pendingSchools ?? []).map((school) => (
                    <div key={school.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{school.name}</p>
                        <p className="text-xs text-gray-500 truncate">{school.email}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Registered {new Date(school.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          {school.schoolType && ` · ${school.schoolType.replace(/_/g, ' ')}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleApprove(school.id)}
                          disabled={approvingId === school.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          {approvingId === school.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(school.id, school.name)}
                          disabled={approvingId === school.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          <XCircle className="w-3 h-3" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedContent>
          )}

          {/* Recent Schools */}
          <AnimatedContent animation="slide-up" delay={350}>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-900">Recently Registered Schools</h2>
                </div>
                <Link
                  href={`/${locale}/super-admin/schools`}
                  className="text-xs font-medium text-stunity-primary-600 hover:text-stunity-primary-700 flex items-center gap-1"
                >
                  View all <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              {stats.recentSchools.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <School className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No schools yet</p>
                  <p className="text-sm text-gray-400 mt-1">Schools will appear here once registered</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {stats.recentSchools.map((school) => {
                    const tier = (school as any).subscriptionTier;
                    const tierCfg = tier ? (TIER_COLORS[tier] ?? null) : null;
                    const isPending = (school as any).registrationStatus === 'PENDING';
                    return (
                      <Link
                        key={school.id}
                        href={`/${locale}/super-admin/schools/${school.id}`}
                        className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-stunity-primary-50 text-stunity-primary-600 group-hover:bg-stunity-primary-100 transition-colors flex-shrink-0">
                            <School className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 group-hover:text-stunity-primary-700 truncate text-sm">
                              {school.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(school.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              {(school as any).currentStudents !== undefined && ` · ${(school as any).currentStudents} students`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {tierCfg && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${tierCfg.bg} ${tierCfg.text}`}>
                              {TIER_LABELS[tier] ?? tier}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${isPending
                              ? 'bg-amber-100 text-amber-700'
                              : school.isActive
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                            {isPending ? 'Pending' : school.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </AnimatedContent>

          {/* Weekly velocity summary */}
          {((stats.newSchoolsThisWeek ?? 0) > 0 || (stats.newUsersThisWeek ?? 0) > 0) && (
            <AnimatedContent animation="slide-up" delay={400}>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-stunity-primary-50 rounded-xl border border-stunity-primary-100 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-stunity-primary-600" />
                    <p className="text-xs font-semibold text-stunity-primary-700 uppercase tracking-wide">New Schools</p>
                  </div>
                  <p className="text-3xl font-bold text-stunity-primary-700">{stats.newSchoolsThisWeek ?? 0}</p>
                  <p className="text-xs text-stunity-primary-500 mt-0.5">in the last 7 days</p>
                </div>
                <div className="bg-purple-50 rounded-xl border border-purple-100 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <UserPlus className="w-4 h-4 text-purple-600" />
                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">New Users</p>
                  </div>
                  <p className="text-3xl font-bold text-purple-700">{stats.newUsersThisWeek ?? 0}</p>
                  <p className="text-xs text-purple-500 mt-0.5">in the last 7 days</p>
                </div>
              </div>
            </AnimatedContent>
          )}
        </div>
      </div>
    </div>
  );
}
