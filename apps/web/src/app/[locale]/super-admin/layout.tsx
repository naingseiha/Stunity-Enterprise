'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { TokenManager } from '@/lib/api/auth';
import {
  LayoutDashboard,
  School,
  Users,
  Settings,
  LogOut,
  Shield,
  Menu,
  X,
  ChevronRight,
  User,
  FileText,
  TrendingUp,
} from 'lucide-react';

export default function SuperAdminLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ firstName?: string; lastName?: string; email?: string; profilePictureUrl?: string | null } | null>(null);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    if (!userData.user?.isSuperAdmin) {
      router.replace(`/${locale}/feed`);
      return;
    }

    setUser(userData.user);
    setLoading(false);
  }, [locale, router]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.replace(`/${locale}/auth/login`);
  };

  const navItems = [
    { section: 'Overview', items: [{ href: `/${locale}/super-admin`, label: 'Dashboard', icon: LayoutDashboard }] },
    { section: 'Platform', items: [
      { href: `/${locale}/super-admin/schools`, label: 'Schools', icon: School },
      { href: `/${locale}/super-admin/users`, label: 'Users', icon: Users },
      { href: `/${locale}/super-admin/analytics`, label: 'Analytics', icon: TrendingUp },
      { href: `/${locale}/super-admin/audit-logs`, label: 'Audit Logs', icon: FileText },
    ]},
    { section: 'Settings', items: [{ href: `/${locale}/super-admin/settings`, label: 'Platform Settings', icon: Settings }] },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-stunity-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading platform...</p>
        </div>
      </div>
    );
  }

  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Super Admin';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar - matches main app w-64, full viewport height */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 lg:static lg:min-h-screen flex flex-col shadow-sm ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 flex-shrink-0">
          <Link href={`/${locale}/super-admin`} className="flex items-center gap-2">
            <img src="/Stunity.png" alt="Stunity" className="h-8 w-auto object-contain" />
            <span className="text-xs font-medium text-gray-500 bg-stunity-primary-50 text-stunity-primary-700 px-2 py-0.5 rounded">Admin</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-6 flex-1 overflow-y-auto">
          {navItems.map((group) => (
            <div key={group.section}>
              <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">{group.section}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const navItem = item as { href: string; label: string; icon: React.ElementType; disabled?: boolean };
                  const isActive = pathname === navItem.href || (navItem.href !== `/${locale}/super-admin` && pathname.startsWith(navItem.href));
                  const content = (
                    <span className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      navItem.disabled
                        ? 'opacity-50 cursor-not-allowed text-gray-400'
                        : isActive
                        ? 'bg-stunity-primary-50 text-stunity-primary-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}>
                      <navItem.icon className="w-5 h-5 flex-shrink-0" />
                      <span>{navItem.label}</span>
                      {!navItem.disabled && <ChevronRight className={`w-4 h-4 ml-auto ${isActive ? 'text-stunity-primary-500' : 'text-gray-400'}`} />}
                      {navItem.disabled && <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded">Soon</span>}
                    </span>
                  );
                  return navItem.disabled ? (
                    <div key={navItem.href}>{content}</div>
                  ) : (
                    <Link key={navItem.href} href={navItem.href} onClick={() => setSidebarOpen(false)}>
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User & Logout */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
            {user?.profilePictureUrl ? (
              <img src={user.profilePictureUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-stunity-primary-100 flex items-center justify-center">
                <User className="w-4 h-4 text-stunity-primary-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium"
          >
            <LogOut className="w-5 h-5" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main content - matches main app structure */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <header className="sticky top-0 z-30 flex items-center h-14 px-4 sm:px-6 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors mr-2"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-stunity-primary-500" />
            <span className="font-semibold text-gray-900">Platform Admin</span>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
