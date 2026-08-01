import { STUDENT_SERVICE_URL } from '@/lib/api/config';
import { BadgeCheck, Calendar, FileCheck2, Hash, ShieldOff } from 'lucide-react';

export const metadata = {
  title: 'Transcript Verification | Stunity',
  description: 'Verify the authenticity of a Stunity academic transcript.',
};

interface TranscriptVerification {
  status: 'OFFICIAL' | 'REVOKED' | 'DRAFT';
  isValid: boolean;
  documentNumber: string;
  verificationCode: string;
  issuedAt: string;
  approvedAt?: string | null;
  revokedAt?: string | null;
  formulaVersion: string;
  snapshotChecksum: string;
  schoolName?: string | null;
  academicYear?: string | null;
  student?: {
    studentId?: string | null;
    name: string;
  } | null;
}

async function getTranscriptVerification(code: string): Promise<TranscriptVerification | null> {
  try {
    const res = await fetch(`${STUDENT_SERVICE_URL}/transcripts/verify/${encodeURIComponent(code)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

export default async function VerifyTranscriptPage({
  params,
}: {
  params: Promise<{ code: string; locale: string }>;
}) {
  const { code, locale } = await params;
  const isKhmer = locale === 'km';
  const verification = await getTranscriptVerification(code);
  const isValid = verification?.isValid === true;
  const isRevoked = verification?.status === 'REVOKED';
  const issuedDate = verification?.issuedAt
    ? new Date(verification.issuedAt).toLocaleDateString(isKhmer ? 'km-KH' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '-';

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-3xl">
        <div className={`rounded-2xl border bg-white shadow-sm dark:bg-slate-900 ${
          isValid
            ? 'border-emerald-200 dark:border-emerald-900'
            : isRevoked
              ? 'border-red-200 dark:border-red-900'
              : 'border-amber-200 dark:border-amber-900'
        }`}>
          <div className={`px-6 py-8 text-center ${
            isValid
              ? 'bg-emerald-600 text-white'
              : isRevoked
                ? 'bg-red-600 text-white'
                : 'bg-amber-500 text-white'
          }`}>
            {isValid ? (
              <BadgeCheck className="mx-auto mb-4 h-14 w-14" aria-hidden="true" />
            ) : (
              <ShieldOff className="mx-auto mb-4 h-14 w-14" aria-hidden="true" />
            )}
            <h1 className="text-2xl font-bold">
              {isValid
                ? (isKhmer ? 'ព្រឹត្តិបត្រពិន្ទុផ្លូវការត្រឹមត្រូវ' : 'Official Transcript Verified')
                : isRevoked
                  ? (isKhmer ? 'ឯកសារនេះត្រូវបានដកហូត' : 'This Transcript Was Revoked')
                  : (isKhmer ? 'រកមិនឃើញឯកសារ' : 'Transcript Not Found')}
            </h1>
            <p className="mt-2 text-sm text-white/90">
              {isValid
                ? (isKhmer ? 'លេខផ្ទៀងផ្ទាត់នេះត្រូវគ្នានឹងកំណត់ត្រាផ្លូវការនៅក្នុង Stunity។' : 'This verification code matches an official Stunity record.')
                : isRevoked
                  ? (isKhmer ? 'សូមទាក់ទងសាលា ប្រសិនបើត្រូវការឯកសារជំនួស។' : 'Contact the school if a replacement document is needed.')
                  : (isKhmer ? 'សូមពិនិត្យលេខកូដ ឬទាក់ទងសាលាដែលចេញឯកសារ។' : 'Check the code or contact the issuing school.')}
            </p>
          </div>

          <div className="p-6">
            {verification ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Detail icon={<FileCheck2 className="h-4 w-4" />} label={isKhmer ? 'លេខឯកសារ' : 'Document number'} value={verification.documentNumber} />
                <Detail icon={<Hash className="h-4 w-4" />} label={isKhmer ? 'លេខផ្ទៀងផ្ទាត់' : 'Verification code'} value={verification.verificationCode} mono />
                <Detail icon={<Calendar className="h-4 w-4" />} label={isKhmer ? 'កាលបរិច្ឆេទចេញ' : 'Issued date'} value={issuedDate} />
                <Detail icon={<BadgeCheck className="h-4 w-4" />} label={isKhmer ? 'ស្ថានភាព' : 'Status'} value={verification.status} />
                <Detail icon={<FileCheck2 className="h-4 w-4" />} label={isKhmer ? 'សាលា' : 'School'} value={verification.schoolName || '-'} />
                <Detail icon={<Calendar className="h-4 w-4" />} label={isKhmer ? 'ឆ្នាំសិក្សា' : 'Academic year'} value={verification.academicYear || '-'} />
                <Detail icon={<Hash className="h-4 w-4" />} label={isKhmer ? 'អត្តលេខសិស្ស' : 'Student ID'} value={verification.student?.studentId || '-'} />
                <Detail icon={<FileCheck2 className="h-4 w-4" />} label={isKhmer ? 'ឈ្មោះសិស្ស' : 'Student name'} value={verification.student?.name || '-'} />
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                {isKhmer
                  ? `មិនមានកំណត់ត្រាសម្រាប់លេខកូដ ${code} ទេ។`
                  : `No transcript record was found for code ${code}.`}
              </div>
            )}

            {verification?.snapshotChecksum && (
              <div className="mt-6 rounded-lg bg-slate-50 p-4 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <p className="font-semibold text-slate-700 dark:text-slate-200">
                  {isKhmer ? 'Checksum សម្រាប់ audit' : 'Audit checksum'}
                </p>
                <p className="mt-1 break-all font-mono">{verification.snapshotChecksum}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Detail({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-sm font-semibold text-slate-900 dark:text-white ${mono ? 'font-mono' : ''}`}>
        {value}
      </p>
    </div>
  );
}
