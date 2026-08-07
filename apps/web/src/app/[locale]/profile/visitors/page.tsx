'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Eye, RefreshCw } from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { FEED_SERVICE_URL } from '@/lib/api/config';
import UnifiedNavigation from '@/components/UnifiedNavigation';

interface Visitor {
  id: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string | null;
  headline?: string;
  viewedAt?: string;
  views30d?: number;
}

export default function ProfileVisitorsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const isKm = locale === 'km';
  const [visitors, setVisitors] = useState<Visitor[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    setVisitors(null);
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        router.replace(`/${locale}/auth/login`);
        return;
      }
      const res = await fetch(`${FEED_SERVICE_URL}/users/me/profile/visitors?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('fail');
      const data = await res.json();
      setVisitors(data?.visitors || data?.data?.visitors || data?.data || []);
    } catch {
      setError(true);
      setVisitors([]);
    }
  }, [locale, router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <UnifiedNavigation />
      <div
        className="md:max-w-lg md:mx-auto"
        style={{
          paddingTop: 'calc(var(--top-bar-height) + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 16px)',
        }}
      >
        <header className="px-4 py-3 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur sticky top-[var(--top-bar-height)] z-10">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-black text-slate-900 dark:text-white">
              {isKm ? 'អ្នកមើលប្រវត្តិរូប' : 'Profile visitors'}
            </h1>
            <p className="text-[11px] text-slate-500">
              {isKm ? 'អ្នកដែលបានមើលគណនីអ្នក' : 'People who viewed your profile'}
            </p>
          </div>
        </header>

        <div className="px-4 pt-4 space-y-2">
          {visitors === null && (
            <div className="py-16 flex justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
            </div>
          )}

          {error && (
            <div className="py-10 text-center">
              <p className="text-slate-500 mb-3">{isKm ? 'មិនអាចផ្ទុកបានទេ' : 'Failed to load visitors'}</p>
              <button type="button" onClick={() => void load()} className="text-sky-600 font-bold text-sm">
                {isKm ? 'ព្យាយាមម្តងទៀត' : 'Retry'}
              </button>
            </div>
          )}

          {visitors && visitors.length === 0 && !error && (
            <div className="py-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <Eye className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                {isKm ? 'មិនទាន់មានអ្នកមើល' : 'No visitors yet'}
              </p>
            </div>
          )}

          {visitors?.map((v) => {
            const name = [v.lastName, v.firstName].filter(Boolean).join(' ') || 'User';
            return (
              <Link
                key={`${v.id}-${v.viewedAt || ''}`}
                href={`/${locale}/profile/${v.id}`}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              >
                <div className="w-11 h-11 rounded-full overflow-hidden bg-sky-100 shrink-0">
                  {v.profilePictureUrl ? (
                    <Image src={v.profilePictureUrl} alt="" width={44} height={44} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-sky-700">
                      {(v.firstName?.[0] || '') + (v.lastName?.[0] || '')}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{name}</p>
                  <p className="text-xs text-slate-500 truncate">{v.headline || ''}</p>
                </div>
                {v.views30d != null && (
                  <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                    {v.views30d}x
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
