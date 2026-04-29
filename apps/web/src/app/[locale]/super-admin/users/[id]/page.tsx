'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  getSuperAdminUserDetail,
  updateSuperAdminUser,
  SuperAdminUserDetail,
} from '@/lib/api/super-admin';
import AnimatedContent from '@/components/AnimatedContent';
import {
  User,
  ChevronRight,
  Home,
  School,
  Mail,
  Phone,
  Calendar,
  Power,
  PowerOff,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  PARENT: 'Parent',
  STAFF: 'Staff',
};

export default function SuperAdminUserDetailPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const id = params?.id as string;
  const [user, setUser] = useState<SuperAdminUserDetail | null>(null);
  const t = useTranslations('common');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadUser = () => {
    if (!id) return;
    setLoading(true);
    getSuperAdminUserDetail(id)
      .then((res) => {
        setUser(res.data);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (id) loadUser();
    else {
      setError('Invalid user ID');
      setLoading(false);
    }
  }, [id]);

  const handleToggleActive = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await updateSuperAdminUser(id, { isActive: !user.isActive });
      setUser({ ...user, isActive: res.data.isActive });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-stunity-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href={`/${locale}/super-admin`} className="hover:text-stunity-primary-600 flex items-center gap-1">
            <Home className="h-4 w-4" /> <AutoI18nText i18nKey="auto.web.admin_users_id_page.k_97e3333c" />
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/${locale}/super-admin/users`} className="hover:text-stunity-primary-600"><AutoI18nText i18nKey="auto.web.admin_users_id_page.k_292ec89e" /></Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.admin_users_id_page.k_a0b69aff" /></span>
        </nav>
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700">
          <p className="font-medium">{error || 'User not found'}</p>
          <Link href={`/${locale}/super-admin/users`} className="inline-block mt-3 text-stunity-primary-600 hover:underline">
            <AutoI18nText i18nKey="auto.web.admin_users_id_page.k_c2cc9a9e" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatedContent animation="fade" delay={0}>
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href={`/${locale}/super-admin`} className="hover:text-stunity-primary-600 flex items-center gap-1">
            <Home className="h-4 w-4" /> <AutoI18nText i18nKey="auto.web.admin_users_id_page.k_97e3333c" />
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/${locale}/super-admin/users`} className="hover:text-stunity-primary-600"><AutoI18nText i18nKey="auto.web.admin_users_id_page.k_292ec89e" /></Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 dark:text-white font-medium">{user.firstName} {user.lastName}</span>
        </nav>
      </AnimatedContent>

      <AnimatedContent animation="slide-up" delay={50}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-stunity-primary-100 rounded-xl">
              <User className="h-8 w-8 text-stunity-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-gray-600 mt-1">{user.email || '–'}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'}`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                  {ROLE_LABELS[user.role] || user.role}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleToggleActive}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              user.isActive ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : user.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
            {saving ? 'Updating…' : user.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </AnimatedContent>

      <AnimatedContent animation="slide-up" delay={100}>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3"><AutoI18nText i18nKey="auto.web.admin_users_id_page.k_3cc51548" /></h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{user.email || '–'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{user.phone || '–'}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3"><AutoI18nText i18nKey="auto.web.admin_users_id_page.k_05c284d7" /></h3>
                {user.school ? (
                  <Link
                    href={`/${locale}/super-admin/schools/${user.school.id}`}
                    className="flex items-center gap-2 text-stunity-primary-600 hover:underline"
                  >
                    <School className="w-4 h-4" />
                    <span>{user.school.name}</span>
                    <span className="text-xs text-gray-500">({user.school.slug})</span>
                  </Link>
                ) : (
                  <span className="text-gray-400"><AutoI18nText i18nKey="auto.web.admin_users_id_page.k_cff2e1e1" /></span>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3"><AutoI18nText i18nKey="auto.web.admin_users_id_page.k_6fbe3100" /></h3>
                <div className="flex items-center gap-2">
                  {user.isActive ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                  <span className={user.isActive ? 'text-emerald-700' : 'text-gray-600'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3"><AutoI18nText i18nKey="auto.web.admin_users_id_page.k_3e7d2836" /></h3>
                <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span><AutoI18nText i18nKey="auto.web.admin_users_id_page.k_b000d0aa" /> {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</span>
                </div>
                {user.createdAt && (
                  <p className="text-sm text-gray-500 mt-1"><AutoI18nText i18nKey="auto.web.admin_users_id_page.k_e79b5796" /> {new Date(user.createdAt).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </AnimatedContent>
    </div>
  );
}
