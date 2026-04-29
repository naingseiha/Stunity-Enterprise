'use client';

import { useTranslations } from 'next-intl';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useState, useEffect, use } from 'react';
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
  Activity,
  MessageSquare,
  Globe,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function SuperAdminLayout(
  props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }
) {
  const autoT = useTranslations();
  const params = use(props.params);

  const {
    locale
  } = params;

  const {
    children
  } = props;

  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, toggleTheme } = useTheme();
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
    if (!userData.user?.isSuperAdmin && userData.user?.role !== 'SUPER_ADMIN') {
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
    {
      section: 'Platform', items: [
        { href: `/${locale}/super-admin/schools`, label: 'Schools', icon: School },
        { href: `/${locale}/super-admin/users`, label: 'Users', icon: Users },
        { href: `/${locale}/super-admin/content`, label: 'Content Moderation', icon: MessageSquare },
        { href: `/${locale}/super-admin/analytics`, label: 'Analytics', icon: TrendingUp },
        { href: `/${locale}/super-admin/audit-logs`, label: 'Audit Logs', icon: FileText },
        { href: `/${locale}/super-admin/health`, label: 'Platform Health', icon: Activity },
      ]
    },
    {
      section: 'Settings', items: [
        { href: `/${locale}/super-admin/settings`, label: 'Platform Settings', icon: Settings },
        { href: `/${locale}/super-admin/language`, label: 'Language Management', icon: Globe },
      ]
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-stunity-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium"><AutoI18nText i18nKey="auto.web.locale_super_admin_layout.k_7fb331fd" /></p>
        </div>
      </div>
    );
  }

  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Super Admin';
  const activeNavItem = navItems
    .flatMap((group) => group.items)
    .find((item) => pathname === item.href || (item.href !== `/${locale}/super-admin` && pathname.startsWith(item.href)));
  const activeTitle = activeNavItem?.label || 'Platform Admin';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50 flex">
      {/* Mobile sidebar backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar - matches main app w-64, full viewport height */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 transform transition-transform lg:translate-x-0 lg:static lg:min-h-screen flex flex-col shadow-sm ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-between h-20 px-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <Link href={`/${locale}/super-admin`} className="flex min-w-0 items-center gap-3">
            <img src="/Stunity.png" alt={autoT("auto.web.locale_super_admin_layout.k_99a38e84")} className="h-10 w-auto object-contain" />
            <span className="rounded-full border border-stunity-primary-200 bg-stunity-primary-50 px-2.5 py-1 text-xs font-semibold text-stunity-primary-700 dark:border-stunity-primary-800 dark:bg-stunity-primary-900/30 dark:text-stunity-primary-200">
              <AutoI18nText i18nKey="auto.web.locale_super_admin_layout.k_e33f62e1" />
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
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
                    <span className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${navItem.disabled
                        ? 'opacity-50 cursor-not-allowed text-gray-400'
                        : isActive
                          ? 'bg-stunity-primary-50 text-stunity-primary-700 shadow-sm ring-1 ring-stunity-primary-100 dark:bg-stunity-primary-900/25 dark:text-stunity-primary-100 dark:ring-stunity-primary-800/60'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                      }`}>
                      <navItem.icon className="w-5 h-5 flex-shrink-0" />
                      <span>{navItem.label}</span>
                      {!navItem.disabled && <ChevronRight className={`w-4 h-4 ml-auto ${isActive ? 'text-stunity-primary-500' : 'text-gray-400'}`} />}
                      {navItem.disabled && <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded"><AutoI18nText i18nKey="auto.web.locale_super_admin_layout.k_115fa6b3" /></span>}
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
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900">
            {user?.profilePictureUrl ? (
              <img src={user.profilePictureUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-stunity-primary-100 flex items-center justify-center">
                <User className="w-4 h-4 text-stunity-primary-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{userName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium dark:text-gray-300 dark:hover:bg-red-950/30 dark:hover:text-red-300"
          >
            <LogOut className="w-5 h-5" />
            <AutoI18nText i18nKey="auto.web.locale_super_admin_layout.k_0e68df27" />
          </button>
        </div>
      </aside>

      {/* Main content - matches main app structure */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 px-4 shadow-sm backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/90 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden -ml-2 rounded-xl p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-stunity-primary-100 bg-stunity-primary-50 text-stunity-primary-600 dark:border-stunity-primary-800 dark:bg-stunity-primary-900/30 dark:text-stunity-primary-200">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{activeTitle}</p>
                <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                  <AutoI18nText i18nKey="auto.web.locale_super_admin_layout.k_60bd82d1" />
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                onClick={toggleTheme}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
              <div className="hidden items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:flex">
                {user?.profilePictureUrl ? (
                  <img src={user.profilePictureUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-stunity-primary-100 dark:bg-stunity-primary-900/40">
                    <User className="h-3.5 w-3.5 text-stunity-primary-600 dark:text-stunity-primary-200" />
                  </div>
                )}
                <span className="max-w-[160px] truncate text-sm font-semibold text-gray-700 dark:text-gray-200">{userName}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
