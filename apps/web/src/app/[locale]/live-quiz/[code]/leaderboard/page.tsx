'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { getLeaderboard, getCurrentQuestion } from '@/lib/api/live-quiz';
import { Loader2, Trophy, Medal } from 'lucide-react';

export default function LiveQuizLeaderboardPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const urlParams = useParams();
  const code = urlParams?.code as string;

  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const userData = TokenManager.getUserData();
    setUser(userData?.user);
    setSchool(userData?.school);
  }, []);

  const loadLeaderboard = async () => {
    const token = TokenManager.getAccessToken();
    if (!token || !code) return;

    try {
      const data = await getLeaderboard(code, token);
      setLeaderboard(data.leaderboard || []);
      setCurrentQuestion(data.currentQuestion ?? 0);
      setTotalQuestions(data.totalPoints ?? 0);

      // Check if quiz completed
      const current = await getCurrentQuestion(code, token);
      if (current.status === 'completed') {
        router.replace(`/${params.locale}/live-quiz/${code}/results`);
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!code) return;
    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 3000);
    return () => clearInterval(interval);
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
    if (rank === 1) return <Medal className="w-8 h-8 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-8 h-8 text-gray-300" />;
    if (rank === 3) return <Medal className="w-8 h-8 text-amber-600" />;
    return <span className="text-white font-bold text-lg">{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <main className="flex-1 flex flex-col p-6 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Trophy className="w-8 h-8 text-yellow-400" />
          <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        </div>

        {currentQuestion > 0 && (
          <p className="text-white/80 text-sm text-center mb-6">
            After Question {currentQuestion}/{totalQuestions}
          </p>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-500/30 rounded-xl text-red-100 text-sm">
            {error}
          </div>
        )}

        {loading && leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
            <p className="text-white/80">Loading leaderboard...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, i) => (
              <div
                key={entry.userId}
                className={`flex items-center gap-4 p-4 rounded-xl ${
                  i < 3 ? 'bg-white/25 border-2 border-white/40' : 'bg-white/15 border border-white/20'
                }`}
              >
                <div className="w-12 h-12 flex items-center justify-center">
                  {getRankIcon(entry.rank)}
                </div>
                <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center text-white font-bold">
                  {(entry.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{entry.username || 'User'}</p>
                  <p className="text-sm text-white/70">{entry.correctAnswers} correct</p>
                </div>
                <p className="text-xl font-bold text-white">{entry.score}</p>
              </div>
            ))}
          </div>
        )}

        <Link
          href={`/${params.locale}/live-quiz/${code}/play`}
          className="mt-8 w-full py-4 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl text-center transition-colors"
        >
          Back to Quiz
        </Link>
      </main>
    </div>
  );
}
