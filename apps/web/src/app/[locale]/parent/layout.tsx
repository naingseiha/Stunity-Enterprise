'use client';

import { useTranslations } from 'next-intl';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import Link from 'next/link';
import NotificationDropdown from '@/components/parent/NotificationDropdown';
import {
  Users,
  LogOut,
  Bell,
  ChevronRight,
  GraduationCap,
  Calendar,
  FileText,
  TrendingUp,
  AlertCircle,
  BookOpen,
  Clock,
  MessageCircle,
} from 'lucide-react';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  khmerName: string;
  studentId: string;
  relationship: string;
  isPrimary: boolean;
}

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  children: Child[];
}

export default function ParentLayout(
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
  const [user, setUser] = useState<UserData | null>(null);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/parent/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    
    // Verify this is a parent account
    if (userData.user?.role !== 'PARENT') {
      router.replace(`/${locale}/dashboard`);
      return;
    }

    setUser(userData.user);
    setSchool(userData.school);
    setLoading(false);
  }, [locale, router]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.replace(`/${locale}/auth/parent/login`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600"><AutoI18nText i18nKey="auto.web.app_locale_parent_layout.k_03a06a87" /></p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <Link href={`/${locale}/parent`} className="flex items-center gap-3">
              <img src="/Stunity.png" alt={autoT("auto.web.app_locale_parent_layout.k_4689edb3")} className="h-10 w-auto" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.app_locale_parent_layout.k_4503f9a3" /></h1>
                <p className="text-xs text-gray-500">{school?.name}</p>
              </div>
            </Link>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <Link
                href={`/${locale}/parent/messages`}
                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                title={autoT("auto.web.app_locale_parent_layout.k_4496cf1f")}
              >
                <MessageCircle className="w-5 h-5" />
              </Link>
              
              <NotificationDropdown locale={locale} />
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-semibold">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-gray-500"><AutoI18nText i18nKey="auto.web.app_locale_parent_layout.k_58282e33" /></p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                title={autoT("auto.web.app_locale_parent_layout.k_4f14f20b")}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}
