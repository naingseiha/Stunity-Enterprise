'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { createSession } from '@/lib/api/live-quiz';
import { Loader2, Video } from 'lucide-react';

export default function LiveQuizHostPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizIdFromUrl = searchParams?.get('quizId') || '';

  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [quizId, setQuizId] = useState(quizIdFromUrl);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setQuizId(quizIdFromUrl || quizId);
  }, [quizIdFromUrl]);

  useEffect(() => {
    const userData = TokenManager.getUserData();
    setUser(userData?.user);
    setSchool(userData?.school);
  }, []);

  const handleCreate = async () => {
    if (!quizId.trim()) {
      setError('Please enter a quiz ID');
      return;
    }

    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${params.locale}/auth/login`);
      return;
    }

    setIsCreating(true);
    setError('');
    try {
      const session = await createSession(quizId.trim(), token);
      router.push(`/${params.locale}/live-quiz/${session.sessionCode}/lobby`);
    } catch (err: any) {
      setError(err.message || 'Failed to create session. Ensure the quiz ID is valid.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = async () => {
    await TokenManager.logout();
    router.replace(`/${params.locale}/auth/login`);
  };

  if (!TokenManager.getAccessToken()) {
    router.replace(`/${params.locale}/auth/login`);
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-white/20">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <Video className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white text-center mb-2">Host Live Quiz</h1>
            <p className="text-white/90 text-center text-sm mb-6">
              Enter the quiz ID from a quiz post to start a live session
            </p>

            <input
              type="text"
              value={quizId}
              onChange={(e) => {
                setQuizId(e.target.value);
                setError('');
              }}
              placeholder="Quiz ID (e.g. from quiz post)"
              className="w-full px-4 py-3 bg-white/15 border-2 border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-white/60"
              disabled={isCreating}
            />

            {error && (
              <p className="mt-4 text-red-200 text-sm text-center bg-red-500/20 rounded-lg py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleCreate}
              disabled={!quizId.trim() || isCreating}
              className="w-full mt-6 py-4 bg-white text-indigo-600 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isCreating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Video className="w-5 h-5" />
                  Create Session
                </>
              )}
            </button>

            <Link
              href={`/${params.locale}/live-quiz/join`}
              className="block mt-4 text-center text-white/80 text-sm hover:text-white"
            >
              Join a session instead
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
