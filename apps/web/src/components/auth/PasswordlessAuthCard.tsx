'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronLeft, Smartphone } from 'lucide-react';
import { enrollPasswordless, startPhoneOtp, TokenManager, verifyPhoneOtp } from '@/lib/api/auth';

type Step = 'PHONE' | 'OTP' | 'PROFILE';

export default function PasswordlessAuthCard({ locale, redirectForUser }: {
  locale: string;
  redirectForUser: (user: any, school?: any) => string;
}) {
  const [step, setStep] = useState<Step>('PHONE');
  const [phone, setPhone] = useState('');
  const [challenge, setChallenge] = useState<any>(null);
  const [code, setCode] = useState('');
  const [enrollmentToken, setEnrollmentToken] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (step !== 'OTP') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  const resendSeconds = challenge?.resendAt
    ? Math.max(0, Math.ceil((new Date(challenge.resendAt).getTime() - now) / 1000))
    : 0;

  const start = async (preferredChannel: 'AUTO' | 'SMS' = 'AUTO') => {
    setLoading(true);
    setError('');
    try {
      const data = await startPhoneOtp(phone.trim(), preferredChannel);
      setChallenge(data);
      setCode('');
      setNow(Date.now());
      setStep('OTP');
    } catch (err: any) {
      setError(err.message || 'Unable to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await verifyPhoneOtp(challenge.challengeId, code);
      if (data.status === 'AUTHENTICATED') {
        TokenManager.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
        TokenManager.setUserData(data.user, data.school || null);
        window.location.href = redirectForUser(data.user, data.school);
        return;
      }
      setEnrollmentToken(data.enrollmentToken);
      setStep('PROFILE');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  const enroll = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await enrollPasswordless({
        enrollmentToken,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        acceptedTermsVersion: process.env.NEXT_PUBLIC_TERMS_VERSION || '2026-07',
      });
      TokenManager.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      TokenManager.setUserData(data.user, null);
      window.location.href = redirectForUser(data.user, null);
    } catch (err: any) {
      setError(err.message || 'Unable to finish account setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-cyan-50 via-sky-50 to-white px-5 py-10 text-slate-950">
      <section className="mx-auto w-full max-w-md rounded-[2rem] border border-white bg-white/90 p-7 shadow-2xl shadow-sky-100 backdrop-blur sm:p-9">
        {step !== 'PHONE' && <button onClick={() => setStep(step === 'PROFILE' ? 'OTP' : 'PHONE')} className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700"><ChevronLeft className="h-5 w-5" /></button>}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-sky-700"><Smartphone className="h-7 w-7" /></div>
        <h1 className="mt-6 text-center text-2xl font-black tracking-tight">{step === 'PHONE' ? 'Continue to Stunity' : step === 'OTP' ? 'Enter verification code' : 'Tell us your name'}</h1>
        <p className="mt-3 text-center text-sm font-medium leading-6 text-slate-500">{step === 'PHONE' ? 'Use your phone—no password needed.' : step === 'OTP' ? `Code sent to ${challenge?.maskedDestination || ''}` : 'Your phone is verified. Complete your General Account.'}</p>
        {error && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-center text-sm font-semibold text-rose-700">{error}</div>}

        {step === 'PHONE' && <div className="mt-7">
          <label className="text-sm font-bold text-slate-700">Phone number</label>
          <div className="mt-2 flex overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-sky-400">
            <span className="flex items-center border-r border-slate-200 bg-slate-50 px-4 text-sm font-bold">🇰🇭 +855</span>
            <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="012 345 678" className="min-w-0 flex-1 px-4 py-4 text-base outline-none" />
          </div>
          <PrimaryButton label="Continue" loading={loading} disabled={phone.trim().length < 8} onClick={() => void start()} />
          <Link href={`/${locale}/auth/login?method=password`} className="mt-5 block text-center text-sm font-bold text-slate-500 hover:text-sky-700">Use email or password instead</Link>
        </div>}

        {step === 'OTP' && <div className="mt-7">
          <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="w-full rounded-2xl border border-sky-200 px-4 py-5 text-center text-3xl font-black tracking-[0.5em] outline-none focus:border-sky-500" />
          <PrimaryButton label="Verify and continue" loading={loading} disabled={code.length !== 6} onClick={() => void verify()} />
          <div className="mt-5 flex justify-between text-sm font-bold text-sky-700"><button disabled={resendSeconds > 0 || loading} onClick={() => void start()} className="disabled:text-slate-400">{resendSeconds ? `Resend in ${resendSeconds}s` : 'I did not receive a code'}</button>{challenge?.smsFallbackAvailable && !resendSeconds && <button onClick={() => void start('SMS')}>Use SMS</button>}</div>
        </div>}

        {step === 'PROFILE' && <div className="mt-7 space-y-4">
          <input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="First name" className="w-full rounded-2xl border border-slate-200 px-5 py-4 outline-none focus:border-sky-400" />
          <input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Last name" className="w-full rounded-2xl border border-slate-200 px-5 py-4 outline-none focus:border-sky-400" />
          <button onClick={() => setAccepted(!accepted)} className="flex items-start gap-3 text-left text-sm leading-6 text-slate-600"><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${accepted ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300'}`}>{accepted && <Check className="h-4 w-4" />}</span><span>I agree to the <b>Terms of Service</b> and <b>Privacy Policy</b>.</span></button>
          <PrimaryButton label="Create account" loading={loading} disabled={!firstName.trim() || !lastName.trim() || !accepted} onClick={() => void enroll()} />
        </div>}
      </section>
    </main>
  );
}

function PrimaryButton({ label, loading, disabled, onClick }: { label: string; loading: boolean; disabled?: boolean; onClick: () => void }) {
  return <button disabled={loading || disabled} onClick={onClick} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Please wait…' : <>{label}<ArrowRight className="h-4 w-4" /></>}</button>;
}
