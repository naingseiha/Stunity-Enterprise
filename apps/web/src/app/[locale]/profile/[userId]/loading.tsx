'use client';

import { useParams } from 'next/navigation';
import { readProfileCache, seedOwnProfileFromAuthUser } from '@/lib/profile-cache';
import ProfileSkeleton from '@/components/profile/ProfileSkeleton';

/**
 * Route loading UI — paint cached profile hero instantly (no full-page skeleton flash)
 * when memory/localStorage already has data. Falls back to skeleton only on cold start.
 */
export default function ProfileLoading() {
  const params = useParams();
  const userId = (params?.userId as string) || 'me';

  let cached =
    typeof window !== 'undefined' ? readProfileCache(userId) : null;
  if (!cached?.profile && userId === 'me' && typeof window !== 'undefined') {
    cached = seedOwnProfileFromAuthUser();
  }

  const profile = cached?.profile;
  if (!profile) {
    return <ProfileSkeleton />;
  }

  const name = `${profile.lastName || ''} ${profile.firstName || ''}`.trim();
  const initials = `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`;

  return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-gray-950">
      <div className="h-16 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800" />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="relative w-full aspect-[16/9] sm:aspect-[2.5/1] md:aspect-[2.7/1] max-h-[340px] bg-gradient-to-br from-[#F0F9FF] via-[#E0F2FE] to-[#BAE6FD] dark:from-gray-800 dark:to-gray-900">
            {profile.coverPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.coverPhotoUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            ) : null}
          </div>
          <div className="px-5 md:px-6 pb-5">
            <div className="relative -mt-14 sm:-mt-16 md:-mt-[72px] mb-3">
              <div className="w-[120px] h-[120px] sm:w-[132px] sm:h-[132px] md:w-40 md:h-40 rounded-full border-[5px] border-white dark:border-gray-800 overflow-hidden bg-gradient-to-br from-sky-200 to-cyan-200 shadow-md">
                {profile.profilePictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.profilePictureUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#0284C7] text-4xl font-bold">
                    {initials}
                  </div>
                )}
              </div>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {name || '…'}
            </h1>
            {(profile.headline || profile.professionalTitle) && (
              <p className="text-[15px] text-gray-600 dark:text-gray-300 mt-1">
                {profile.headline || profile.professionalTitle}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <div className="h-10 w-32 rounded-full bg-gradient-to-r from-[#09CFF7]/30 to-[#00B8DB]/30 animate-pulse" />
              <div className="h-10 w-28 rounded-full bg-slate-100 dark:bg-gray-700 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="mt-3 h-12 rounded-2xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 animate-pulse" />
      </div>
    </div>
  );
}
