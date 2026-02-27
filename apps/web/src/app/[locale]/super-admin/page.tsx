'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSuperAdminDashboardStats, SuperAdminStats } from '@/lib/api/super-admin';
import StatCard from '@/components/dashboard/StatCard';
import ActionCard from '@/components/dashboard/ActionCard';
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
} from 'lucide-react';

export default function SuperAdminDashboardPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSuperAdminDashboardStats()
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-stunity-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700">
        <p className="font-medium">Failed to load dashboard</p>
        <p className="mt-1 text-sm opacity-90">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { title: 'Total Schools', value: String(stats.totalSchools), change: `${stats.activeSchools} active`, changeType: 'neutral' as const, subtitle: 'Registered on platform', icon: School, iconColor: 'blue' },
    { title: 'Active Schools', value: String(stats.activeSchools), change: `${Math.round((stats.activeSchools / Math.max(stats.totalSchools, 1)) * 100)}%`, changeType: 'positive' as const, subtitle: 'With active subscription', icon: CheckCircle2, iconColor: 'green' },
    { title: 'Total Users', value: String(stats.totalUsers), change: 'Platform-wide', changeType: 'neutral' as const, subtitle: 'Across all schools', icon: Users, iconColor: 'purple' },
    { title: 'Total Classes', value: String(stats.totalClasses), change: 'All schools', changeType: 'neutral' as const, subtitle: 'Active classes', icon: GraduationCap, iconColor: 'amber' },
  ];

  const quickActions = [
    { title: 'Manage Schools', description: 'View and manage all platform schools', icon: School, iconColor: 'blue', href: `/${locale}/super-admin/schools` },
    { title: 'Platform Users', description: 'View users across all schools', icon: Users, iconColor: 'purple', href: `/${locale}/super-admin/users` },
    { title: 'Platform Analytics', description: 'Platform-wide analytics and reports', icon: TrendingUp, iconColor: 'cyan', href: '#', disabled: true },
  ];

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <AnimatedContent animation="fade" delay={0}>
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Home className="h-4 w-4" />
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">Dashboard</span>
        </nav>
      </AnimatedContent>

      {/* Header - matches main dashboard */}
      <AnimatedContent animation="slide-up" delay={50}>
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-stunity-primary-100 rounded-xl">
              <LayoutDashboard className="h-6 w-6 text-stunity-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Platform Dashboard</h1>
              <p className="text-gray-600 mt-1">Monitor schools, users, and platform health</p>
            </div>
          </div>
        </div>
      </AnimatedContent>

      {/* Stats Grid - uses StatCard from main app */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <AnimatedContent key={stat.title} animation="slide-up" delay={100 + index * 50}>
            <StatCard {...stat} />
          </AnimatedContent>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schools by tier & Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          {stats.schoolsByTier && stats.schoolsByTier.length > 0 && (
            <AnimatedContent animation="slide-up" delay={300}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Schools by Tier</h2>
              <div className="bg-white rounded-lg border border-gray-200 divide-y">
                {stats.schoolsByTier.map((t) => (
                  <div key={t.tier} className="px-4 py-3 flex justify-between items-center">
                    <span className="text-gray-700 font-medium">{t.tier.replace(/_/g, ' ')}</span>
                    <span className="text-gray-900 font-semibold">{t.count}</span>
                  </div>
                ))}
              </div>
            </AnimatedContent>
          )}
          <AnimatedContent animation="slide-up" delay={300}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-4">
              {quickActions.map((action) => (
                (action as any).disabled ? (
                  <div
                    key={action.title}
                    className="w-full bg-gray-50 rounded-lg border border-gray-200 p-4 opacity-75 cursor-not-allowed"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-gray-200 text-gray-400">
                        <action.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-600">{action.title}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{action.description}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-gray-200 text-gray-500 rounded font-medium">Soon</span>
                    </div>
                  </div>
                ) : (
                  <ActionCard key={action.title} title={action.title} description={action.description} icon={action.icon} iconColor={action.iconColor} href={action.href} />
                )
              ))}
            </div>
          </AnimatedContent>
        </div>

        {/* Recent Schools */}
        <AnimatedContent animation="slide-up" delay={350}>
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Schools</h2>
              <Link
                href={`/${locale}/super-admin/schools`}
                className="text-sm font-medium text-stunity-primary-600 hover:text-stunity-primary-700 flex items-center gap-1"
              >
                View all <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 divide-y">
              {stats.recentSchools.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <School className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No schools yet</p>
                  <p className="text-sm text-gray-500 mt-1">Schools will appear here once registered</p>
                </div>
              ) : (
                stats.recentSchools.map((school) => (
                  <Link
                    key={school.id}
                    href={`/${locale}/super-admin/schools/${school.id}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-stunity-primary-50 text-stunity-primary-600">
                        <School className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{school.name}</p>
                        <p className="text-sm text-gray-500">{school.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          school.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {school.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </AnimatedContent>
      </div>
    </div>
  );
}
