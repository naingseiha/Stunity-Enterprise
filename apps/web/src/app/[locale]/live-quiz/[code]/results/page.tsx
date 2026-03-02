'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { getResults } from '@/lib/api/live-quiz';
import { Trophy, Medal, Home } from 'lucide-react';

export default function LiveQuizResultsPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const urlParams = useParams();
  const code = urlParams?.code as string;

  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const userData = TokenManager.getUserData();
    setUser(userData?.user);
    setSchool(userData?.school);
  }, []);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token || !code) return;

    getResults(code, token)
      .then(setResults)
      .catch((err) => setError(err.message || 'Failed to load results'))
      .finally(() => setLoading(false));
  }, [code]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.replace(`/${params.locale}/auth/login`);
  };

  if (!TokenManager.getAccessToken()) {
    router.replace(`/${params.locale}/auth/login`);
    return null;
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Medal className="w-10 h-10 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-10 h-10 text-gray-300" />;
    if (rank === 3) return <Medal className="w-10 h-10 text-amber-600" />;
    return <span className="text-white font-bold text-xl">{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <main className="flex-1 flex flex-col p-6 max-w-2xl mx-auto w-full">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-4">
            <Trophy className="w-10 h-10 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Quiz Complete!</h1>
          <p className="text-white/80 text-sm mt-1">{results?.quizTitle || 'Live Quiz'}</p>
        </div>

        {results?.stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white/15 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{results.stats.totalParticipants}</p>
              <p className="text-white/70 text-sm">Players</p>
            </div>
            <div className="bg-white/15 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{results.stats.correctAnswers}</p>
              <p className="text-white/70 text-sm">Correct</p>
            </div>
            <div className="bg-white/15 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{results.stats.averageAccuracy ?? 0}%</p>
              <p className="text-white/70 text-sm">Avg Accuracy</p>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-white/80 text-center">Loading results...</p>
        ) : error ? (
          <div className="p-4 bg-red-500/30 rounded-xl text-red-100 text-sm">{error}</div>
        ) : (
          <div className="space-y-3 mb-8">
            {(results?.leaderboard || []).map((entry: any, i: number) => (
              <div
                key={entry.userId}
                className={`flex items-center gap-4 p-4 rounded-xl ${
                  i < 3 ? 'bg-white/25 border-2 border-white/40' : 'bg-white/15 border border-white/20'
                }`}
              >
                <div className="w-14 h-14 flex items-center justify-center">
                  {getRankIcon(entry.rank)}
                </div>
                <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center text-white font-bold text-lg">
                  {(entry.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{entry.username || 'User'}</p>
                  <p className="text-sm text-white/70">
                    {entry.correctAnswers}/{entry.totalAnswers} correct
                    {entry.accuracy != null && ` • ${entry.accuracy}%`}
                  </p>
                </div>
                <p className="text-2xl font-bold text-white">{entry.score}</p>
              </div>
            ))}
          </div>
        )}

        <Link
          href={`/${params.locale}/feed`}
          className="w-full py-4 bg-white text-indigo-600 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
        >
          <Home className="w-5 h-5" />
          Back to Feed
        </Link>
      </main>
    </div>
  );
}
