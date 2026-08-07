'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { ArrowLeft, Share2 } from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';

function roleStyle(role?: string) {
  switch ((role || '').toUpperCase()) {
    case 'TEACHER':
      return { label: 'Teacher', labelKm: 'គ្រូ', from: '#0EA5E9', to: '#6366F1' };
    case 'ADMIN':
    case 'SCHOOL_ADMIN':
    case 'SUPER_ADMIN':
      return { label: 'Admin', labelKm: 'អ្នកគ្រប់គ្រង', from: '#F59E0B', to: '#EF4444' };
    case 'PARENT':
      return { label: 'Parent', labelKm: 'មាតាបិតា', from: '#10B981', to: '#0EA5E9' };
    default:
      return { label: 'Student', labelKm: 'សិស្ស', from: '#09CFF7', to: '#6366F1' };
  }
}

export default function ProfileQrPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const isKm = locale === 'km';

  const user = useMemo(() => {
    try {
      return TokenManager.getUserData()?.user ?? null;
    } catch {
      return null;
    }
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <p>{isKm ? 'សូមចូលគណនីជាមុន' : 'Please sign in first'}</p>
      </div>
    );
  }

  const style = roleStyle(user.role);
  const studentId = user.student?.studentId ?? null;
  const displayId = studentId || user.id;
  const schoolName = user.school?.name ?? 'Stunity';
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();

  const qrPayload = JSON.stringify({
    userId: user.id,
    role: user.role,
    schoolId: user.schoolId ?? user.school?.id ?? null,
    v: 1,
    ...(studentId ? { studentId } : {}),
    ...(user.teacher?.id ? { teacherId: user.teacher.id } : {}),
    school: user.schoolId ?? user.school?.id ?? null,
  });

  const handleShare = async () => {
    const text = `My Stunity ID: ${fullName} (${isKm ? style.labelKm : style.label})\nID: ${displayId}\nSchool: ${schoolName}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${fullName} – Stunity ID`, text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <UnifiedNavigation />
      <div
        className="px-4 md:max-w-md md:mx-auto"
        style={{
          paddingTop: 'calc(var(--top-bar-height) + env(safe-area-inset-top, 0px) + 8px)',
          paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 16px)',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-black">{isKm ? 'QR របស់ខ្ញុំ' : 'My QR'}</h1>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        <div
          className="rounded-[28px] p-5 shadow-2xl overflow-hidden relative"
          style={{ background: `linear-gradient(145deg, ${style.from}, ${style.to})` }}
        >
          <div className="absolute -top-10 -right-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/80 mb-1">
              {isKm ? style.labelKm : style.label}
            </p>
            <h2 className="text-xl font-black leading-tight">{fullName || 'Stunity User'}</h2>
            <p className="text-xs text-white/85 mt-1">{schoolName}</p>
            <p className="text-[11px] font-mono text-white/75 mt-2">ID · {displayId}</p>

            <div className="mt-5 mx-auto w-fit rounded-3xl bg-white p-4 shadow-lg">
              <QRCode value={qrPayload} size={180} />
            </div>
            <p className="text-center text-[11px] text-white/80 mt-4 font-medium">
              {isKm
                ? 'បង្ហាញ QR នេះដើម្បីអោយគ្រូ/admin ស្គាល់អ្នក'
                : 'Show this QR so teachers/admins can identify you'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
