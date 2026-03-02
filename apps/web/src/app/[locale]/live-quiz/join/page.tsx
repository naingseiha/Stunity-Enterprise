'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { joinSession } from '@/lib/api/live-quiz';
import { LogIn, Loader2 } from 'lucide-react';

export default function LiveQuizJoinPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
    setCode(cleaned);
    setError('');
  };

  const handleJoin = async () => {
    if (code.length !== 6) {
      setError('Please enter a 6-digit session code');
      return;
    }

    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${params.locale}/auth/login`);
      return;
    }

    setIsJoining(true);
    setError('');
    try {
      await joinSession(code, token);
      router.push(`/${params.locale}/live-quiz/${code}/lobby`);
    } catch (err: any) {
      setError(err.message || 'Failed to join session. Check the code and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLogout = async () => {
    await TokenManager.logout();
    router.replace(`/${params.locale}/auth/login`);
  };

  // Load user for nav
  useEffect(() => {
    const userData = TokenManager.getUserData();
    setUser(userData?.user);
    setSchool(userData?.school);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-white/20">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <LogIn className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white text-center mb-2">Join Live Quiz</h1>
            <p className="text-white/90 text-center text-sm mb-6">
              Enter the 6-digit code shared by your instructor
            </p>

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={handleCodeChange}
              placeholder="000000"
              maxLength={6}
              className="w-full text-center text-3xl font-bold tracking-[0.5em] bg-white/15 border-2 border-white/30 rounded-xl py-4 text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/30"
              disabled={isJoining}
            />
            <p className="text-white/70 text-sm text-center mt-2">{code.length}/6 digits</p>

            {error && (
              <p className="mt-4 text-red-200 text-sm text-center bg-red-500/20 rounded-lg py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleJoin}
              disabled={code.length !== 6 || isJoining}
              className="w-full mt-6 py-4 bg-white text-indigo-600 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isJoining ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Join Session
                </>
              )}
            </button>

            <div className="mt-4 flex justify-center gap-4 text-sm">
              <Link href={`/${params.locale}/live-quiz/host`} className="text-white/80 hover:text-white">
                Host a quiz
              </Link>
              <span className="text-white/50">|</span>
              <Link href={`/${params.locale}/feed`} className="text-white/80 hover:text-white">
                Back to Feed
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
