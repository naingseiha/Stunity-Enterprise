'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { seedOwnProfileFromAuthUser, writeProfileCache, readProfileCache } from '@/lib/profile-cache';

/**
 * /profile → /profile/me without a spinner flash.
 * Seeds cache from auth user so the destination paints instantly.
 */
export default function ProfileRedirect() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  useEffect(() => {
    if (!readProfileCache('me')?.profile) {
      const seed = seedOwnProfileFromAuthUser();
      if (seed?.profile) writeProfileCache('me', seed);
    }
    router.replace(`/${locale}/profile/me`);
  }, [router, locale]);

  return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-gray-950" aria-hidden />
  );
}
