'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { useTranslations } from 'next-intl';
export default function ProfileRedirect() {
  const router = useRouter();
  const t = useTranslations('common');
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  useEffect(() => {
    // Redirect to own profile (me)
    router.replace(`/${locale}/profile/me`);
  }, [router, locale]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400"><AutoI18nText i18nKey="auto.web.app_locale_profile_page.k_ce2b6840" /></p>
      </div>
    </div>
  );
}
