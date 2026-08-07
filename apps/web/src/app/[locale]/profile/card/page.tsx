'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { ArrowLeft, Share2, CreditCard } from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';

export default function ProfileCardPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const isKm = locale === 'km';
  const [side, setSide] = useState<'front' | 'back'>('front');

  const user = useMemo(() => {
    try {
      return TokenManager.getUserData()?.user ?? null;
    } catch {
      return null;
    }
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <p className="text-slate-500">{isKm ? 'Please sign in' : 'Please sign in'}</p>
      </div>
    );
  }

  const fullName = [user.lastName, user.firstName].filter(Boolean).join(' ').trim();
  const schoolName = user.school?.name ?? 'Stunity';
  const studentId = user.student?.studentId ?? user.id;
  const role = (user.role || 'STUDENT').toUpperCase();
  const qrPayload = JSON.stringify({
    userId: user.id,
    role: user.role,
    schoolId: user.schoolId ?? user.school?.id ?? null,
    v: 1,
  });

  const handleShare = async () => {
    const url = `${window.location.origin}/${locale}/profile/${user.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: fullName, url, text: `${fullName} · ${schoolName}` });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-950 dark:to-slate-900">
      <UnifiedNavigation />
      <div
        className="px-4 md:max-w-md md:mx-auto"
        style={{
          paddingTop: 'calc(var(--top-bar-height) + env(safe-area-inset-top, 0px) + 8px)',
          paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 16px)',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-black text-slate-900 dark:text-white">
            {isKm ? 'Education Card' : 'Education Card'}
          </h1>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow flex items-center justify-center"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex justify-center gap-2 mb-4">
          {(['front', 'back'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                side === s
                  ? 'bg-sky-500 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {s === 'front' ? (isKm ? 'Front' : 'Front') : isKm ? 'Back' : 'Back'}
            </button>
          ))}
        </div>

        <div
          className="relative mx-auto w-full max-w-sm aspect-[1.586] rounded-3xl overflow-hidden shadow-2xl text-white"
          style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 45%, #0F766E 100%)' }}
        >
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/10" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />

          {side === 'front' ? (
            <div className="relative h-full p-5 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-[11px] font-black tracking-wide">STUNITY</span>
                </div>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                  {role}
                </span>
              </div>

              <div className="flex-1 flex items-center gap-4 mt-2">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/40 bg-white/20 shrink-0">
                  {user.profilePictureUrl ? (
                    <Image
                      src={user.profilePictureUrl}
                      alt=""
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-black">
                      {(user.firstName || 'S')[0]}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-black leading-tight truncate">{fullName}</p>
                  <p className="text-xs text-white/85 mt-1 truncate">{schoolName}</p>
                  <p className="text-[11px] font-mono text-white/75 mt-2">ID {studentId}</p>
                </div>
              </div>

              <p className="text-[10px] text-white/70 font-medium">
                {isKm ? 'Official education ID card' : 'Official education ID card'}
              </p>
            </div>
          ) : (
            <div className="relative h-full p-5 flex flex-col items-center justify-center">
              <div className="rounded-2xl bg-white p-3 shadow-lg">
                <QRCode value={qrPayload} size={140} />
              </div>
              <p className="text-xs text-white/85 mt-4 text-center font-medium">
                {isKm ? 'Scan to verify identity' : 'Scan to verify identity'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
